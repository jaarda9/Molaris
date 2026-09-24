import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { patientDb, findPatientTooth } from '../repositories/patients.js';
import { loadMemory } from '../repositories/preferences.js';
import { callGeminiWithResilience, aiErrorMessage, AiUnavailableError } from '../ai/gemini.js';
import { MOLARIS_SYSTEM_PROMPT } from '../ai/system-prompt.js';
import { executeMolarisAction } from '../ai/voice-actions.js';
import { ASSISTANT_TOOLS, detokenize, runAssistantTools, tokenizePatients, toolInstructions, type Proposal } from '../ai/assistant-tools.js';
import { computePatientSafetyAlerts } from '../domain/patient-safety.js';
import { dosesLoggedOn } from '../domain/anesthesia-calc.js';
import { DATA_DIR, getDb } from '../db/connection.js';
import { languageOf } from './http.js';

export const aiRouter = Router();

// 503 with a readable, translated message when the AI is out of quota or overloaded.
function sendAiError(res: Response, err: unknown, req: Request): void {
  res.status(err instanceof AiUnavailableError ? 503 : 500).json({ error: aiErrorMessage(err, languageOf(req.body?.language)) });
}

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down and try again shortly.' }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const IMAGES_DIR = path.join(DATA_DIR, 'images');

// A stored record's id + mimeType is enough to locate its file under data/images/.
function mimeTypeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };
  return map[mimeType] || 'bin';
}

// --- Senior advisor chat + voice-command action engine ---------------------------

aiRouter.post('/api/chat', aiLimiter, async (req: Request, res: Response) => {
  // Declared outside the try: a command that already ran must be reported even if the AI fails.
  let actionResult: ReturnType<typeof executeMolarisAction> | null = null;
  // The conversation is saved in the chart of the patient open when the question was asked.
  const patientId = patientDb.getActivePatient().id;
  try {
    const { message, toothId, language = 'en' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    actionResult = executeMolarisAction(message, language);

    // A timer needs no AI answer: reply at once (no quota used, works offline).
    if (actionResult.executed && actionResult.actionType === 'START_TIMER') {
      const reply = actionOnlyReply(actionResult);
      rememberExchange(patientId, message, reply.reply);
      return res.json(reply);
    }

    const memory = loadMemory();
    const activePatient = patientDb.getActivePatient();
    const tooth = toothId ? findPatientTooth(activePatient, Number(toothId)) : null;
    const lang = languageOf(language);
    // Patient names in the message become codes (P1…) before anything is sent to the model.
    const patients = patientDb.getAllPatients();
    const { text: safeMessage, refs } = tokenizePatients(message, patients, activePatient.id);
    const offerTools = !actionResult.executed;

    // No doctor or clinic name either: the model has no use for any identity.
    let contextPrompt = `### CURRENT CLINICAL OPERATORY CONTEXT\n`;
    contextPrompt += `- Practice setting: dental office in Tunisia | Tooth numbering: FDI\n`;
    contextPrompt += `- Preferred Bonding System: ${memory.preferences.bondingSystem}\n`;
    contextPrompt += `- Preferred Composite System: ${memory.preferences.compositeSystem}\n`;
    contextPrompt += `- Preferred Rotary Endodontic System: ${memory.preferences.rotarySystem}\n`;
    contextPrompt += `- Preferred Implant System: ${memory.preferences.implantSystem}\n`;
    contextPrompt += `- ACTIVE PATIENT (anonymized) | Age: ${activePatient.age}${activePatient.gender ? ` (${activePatient.gender})` : ''} | Weight: ${activePatient.weightKg}kg | ASA Status: ${activePatient.asaStatus} | Cardiac Risk: ${activePatient.cardiacRisk ? 'YES (Strict 0.04mg Epi Max)' : 'NO'}\n`;
    contextPrompt += `- Chief Complaint: "${activePatient.chiefComplaint}"\n`;
    contextPrompt += `- Medical Alerts: ${activePatient.medicalAlerts}\n`;
    contextPrompt += `- Allergies: ${activePatient.allergies}\n`;
    const activeMeds = activePatient.medications.filter(m => m.active).map(m => [m.name, m.dosage, m.frequency].filter(Boolean).join(' '));
    contextPrompt += `- Current Medications: ${activeMeds.length ? activeMeds.join('; ') : 'none recorded'}\n`;
    const anesthesiaToday = dosesLoggedOn(activePatient.anesthesiaLog).map(d => `${d.carpules} x ${d.drug.name}`).join(', ');
    contextPrompt += `- Local Anesthesia Delivered Today: ${anesthesiaToday || 'none'}\n`;

    if (tooth) {
      contextPrompt += `- Targeted Tooth: ${tooth.fdi} (FDI) - ${tooth.name} [Status: ${tooth.status.toUpperCase()}]`;
      if (tooth.notes) contextPrompt += ` | Chart Notes: "${tooth.notes}"`;
      contextPrompt += `\n`;
    }

    if (actionResult.executed) {
      contextPrompt += `\n[ACTION JUST EXECUTED IN THE PATIENT RECORD]: ${actionResult.summary}\n`;
    }

    const safetyAlerts = computePatientSafetyAlerts(activePatient, [], languageOf(language));
    if (safetyAlerts.length > 0) {
      contextPrompt += `\n[STANDING SAFETY ALERTS FOR THIS PATIENT — already surfaced to the doctor, acknowledge briefly rather than re-deriving]:\n`;
      safetyAlerts.forEach(a => {
        contextPrompt += `- (${a.severity.toUpperCase()}) ${a.message}\n`;
      });
    }

    if (offerTools) contextPrompt += toolInstructions(lang);

    if (language === 'fr') {
      contextPrompt += `\n### DIRECTIVE DE LANGUE OBLIGATOIRE (FRANÇAIS):\n` +
        `- Vous DEVEZ répondre ENTIÈREMENT en français médical et odontologique professionnel, précis et chaleureux.\n` +
        `- Adressez-vous au praticien avec "Docteur" ou "Cher confrère".\n` +
        `- Utilisez la terminologie dentaire francophone de référence : anesthésie tronculaire à l'épine de Spix (ou Spix), bloc de Gow-Gates, coiffage pulpaire direct/indirect (MTA, silicate tricalcique), digue dentaire, remontée de marge cervicale (DME), alvéolite, extrusion d'hypochlorite de sodium, pulpite irréversible, tenon fibré, etc.\n` +
        `- Médicaments en DCI, dents en numérotation FDI (ex. « dent 46 »).\n` +
        `- Si une action a été exécutée, confirmez-la clairement en français.\n` +
        `- Signalez tout risque ou mise en garde avec ⚠️ **ALERTE CLINIQUE**.\n`;
    } else {
      contextPrompt += `\n### LANGUAGE DIRECTIVE: answer entirely in English (drugs by INN/generic name, FDI tooth numbering).\n`;
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    // Context: the last exchanges of this patient's saved conversation (names are redacted on the way out).
    activePatient.consultHistory.slice(-8).forEach(entry => {
      contents.push({ role: entry.role === 'user' ? 'user' : 'model', parts: [{ text: entry.content }] });
    });
    contents.push({ role: 'user', parts: [{ text: `${contextPrompt}\nDoctor asks: ${safeMessage}` }] });

    const result = await callGeminiWithResilience({
      preferredModel: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: MOLARIS_SYSTEM_PROMPT, temperature: 0.35, maxOutputTokens: 1500,
        ...(offerTools ? { tools: [{ functionDeclarations: ASSISTANT_TOOLS }] } : {})
      }
    });

    // Tool calls: reads are answered from the local data, writes come back as a proposal to confirm.
    let proposal: Proposal | undefined;
    if (result.functionCalls.length) {
      const outcome = runAssistantTools(result.functionCalls, { db: getDb(), patients, activeId: activePatient.id, refs, lang });
      proposal = outcome.proposal;
      result.text = outcome.reply;
    } else {
      result.text = detokenize(result.text, refs, patients);
    }

    let replyText = result.text || (language === 'fr' ? 'J\'ai examiné le cas, Docteur. Pourriez-vous préciser la présentation clinique ?' : 'I reviewed the case, Doctor. Could you clarify the clinical presentation?');
    if (actionResult.executed && !replyText.includes(actionResult.summary || '')) {
      replyText = language === 'fr'
        ? `⚡ **Action exécutée :** ${actionResult.summary}\n\n${replyText}`
        : `⚡ **Action executed:** ${actionResult.summary}\n\n${replyText}`;
    }

    rememberExchange(patientId, message, replyText);
    res.json({
      reply: replyText,
      action: actionResult,
      proposal,
      activePatient: patientDb.getActivePatient(),
      safetyAlerts,
      toothTargeted: tooth ? tooth.id : null,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    if (actionResult?.executed) {
      // The command (tooth update, patient switch…) is done: confirm it, and say the AI is unavailable.
      const reply = actionOnlyReply(actionResult);
      const text = `${reply.reply}\n\n${aiErrorMessage(err, languageOf(req.body?.language))}`;
      rememberExchange(patientId, req.body.message, text);
      return res.json({ ...reply, reply: text });
    }
    sendAiError(res, err, req);
  }
});

/** Saves a question and its answer in the patient's conversation; never breaks the reply. */
function rememberExchange(patientId: string, question: string, answer: string): void {
  try {
    patientDb.appendConsultMessages(patientId, [{ role: 'user', content: question }, { role: 'model', content: answer }]);
  } catch (err) {
    console.warn('[Chat] Could not save the conversation:', err);
  }
}

// The advisor conversation of the open chart: shown again after a reload or a patient switch.
aiRouter.get('/api/chat/history', (req: Request, res: Response) => {
  const patient = patientDb.getActivePatient();
  res.json({ patientId: patient.id, messages: patient.consultHistory });
});

// A line added by the app itself (outcome of a confirmed or cancelled assistant action).
aiRouter.post('/api/chat/history', (req: Request, res: Response) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content) return res.status(400).json({ error: 'content is required' });
  const patient = patientDb.getActivePatient();
  patientDb.appendConsultMessages(patient.id, [{ role: 'model', content: content.slice(0, 2000) }]);
  res.json({ success: true });
});

aiRouter.delete('/api/chat/history', (req: Request, res: Response) => {
  patientDb.clearConsultHistory(patientDb.getActivePatient().id);
  res.json({ success: true });
});

function actionOnlyReply(action: ReturnType<typeof executeMolarisAction>) {
  return {
    reply: `⚡ ${action.summary}`,
    action,
    activePatient: patientDb.getActivePatient(),
    safetyAlerts: [],
    toothTargeted: null,
    modelUsed: null,
    timestamp: new Date().toISOString()
  };
}

// --- Radiograph / intraoral photo second opinion -----------------------------------

aiRouter.post('/api/analyze-image', aiLimiter, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const language = req.body.language || 'en';
    const clinicalQuery = req.body.query || (language === 'fr'
      ? 'Évaluation clinique complète de cette image dentaire (rétro-alvéolaire, bitewing, panoramique ou photo intra-orale).'
      : 'Comprehensive clinical evaluation of this dental image (periapical, bitewing, panoramic, or intraoral photograph).');
    const toothNumber = req.body.toothId;
    const mimeType = req.file.mimetype || 'image/jpeg';
    const activePatient = patientDb.getActivePatient();
    // toothId is the internal (Universal) id; the model is only given the FDI number.
    const focusTooth = toothNumber ? findPatientTooth(activePatient, Number(toothNumber)) : null;

    let visionPrompt = `
Read this dental radiograph or intraoral image as a decision-support aid for the treating dentist (Tunisia).
Everything you report is a finding to be confirmed by the dentist, not a diagnosis.

CLINICAL QUERY: ${clinicalQuery}
${focusTooth ? `FOCUS AREA: tooth ${focusTooth.fdi} (FDI) - ${focusTooth.name}` : ''}
PATIENT (anonymized): ${activePatient.age}y ${activePatient.gender} | ASA: ${activePatient.asaStatus} | Chief Complaint: "${activePatient.chiefComplaint}" | Medical Alerts: ${activePatient.medicalAlerts}

Structure the assessment as follows (FDI tooth numbers, no procedure codes):
1. **Image type & quality**: (bitewing, periapical, panoramic, intraoral photo; angulation, contrast, crown/apex coverage).
2. **Radiographic / clinical findings**:
   - Caries (enamel, dentin involvement, pulpal proximity, recurrent caries under existing margins).
   - Periodontal bone (alveolar crest height, horizontal/vertical bone loss, furcation involvement, lamina dura, PDL space widening).
   - Periapical status (normal, periapical radiolucency / apical periodontitis, condensing osteitis, hypercementosis).
   - Existing restorations or endodontic treatments (margins, overhangs, obturation density/length).
3. **Diagnostic hypotheses to confirm**: with the clinical tests that would confirm or rule them out.
4. **Treatment options to discuss**: options for the dentist to weigh, not a prescription.
5. **⚠️ Red flags & chairside precautions**: (anatomical risks: mental foramen, inferior alveolar canal, maxillary sinus floor, root fractures).
State the limits of reading a single image.
`;

    if (language === 'fr') {
      visionPrompt += `\n[DIRECTIVE DE LANGUE OBLIGATOIRE] : Rédigez l'ensemble du rapport exclusivement en français odontologique professionnel (numérotation FDI, médicaments en DCI).\n`;
    } else {
      visionPrompt += `\n[LANGUAGE DIRECTIVE]: write the whole report in English.\n`;
    }

    const result = await callGeminiWithResilience({
      preferredModel: 'gemini-3.8-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: visionPrompt },
          { inlineData: { data: req.file.buffer.toString('base64'), mimeType } }
        ]
      }],
      config: { systemInstruction: MOLARIS_SYSTEM_PROMPT, temperature: 0.2 }
    });

    // Keep the image and its AI read on the patient's chart for later review.
    const imageId = `img_${Date.now()}`;
    const ext = mimeTypeToExtension(mimeType);
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    fs.writeFileSync(path.join(IMAGES_DIR, `${imageId}.${ext}`), req.file.buffer);

    const imageRecord = patientDb.addImageRecordForActivePatient({
      id: imageId,
      filename: req.file.originalname || `${imageId}.${ext}`,
      mimeType,
      toothId: toothNumber ? Number(toothNumber) : undefined,
      query: clinicalQuery,
      analysis: result.text,
      modelUsed: result.modelUsed
    });

    res.json({ analysis: result.text, modelUsed: result.modelUsed, image: imageRecord, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('Vision analysis error:', err);
    sendAiError(res, err, req);
  }
});

aiRouter.get('/api/images/:id', (req: Request, res: Response) => {
  const found = patientDb.findImageRecord(String(req.params.id));
  if (!found) {
    return res.status(404).json({ error: 'Image record not found' });
  }
  const filePath = path.join(IMAGES_DIR, `${found.image.id}.${mimeTypeToExtension(found.image.mimeType)}`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file is missing from disk' });
  }
  res.setHeader('Content-Type', found.image.mimeType);
  res.sendFile(filePath);
});

// --- SOAP progress notes ------------------------------------------------------------

aiRouter.get('/api/soap/history', (req: Request, res: Response) => {
  const activePatient = patientDb.getActivePatient();
  res.json({
    patientId: activePatient.id,
    chartId: activePatient.chartId,
    patientName: activePatient.name,
    soapNotes: activePatient.soapNotes
  });
});

aiRouter.post('/api/generate-soap', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { procedure, toothId, details, anesthesiaUsed, materialsUsed, language = 'en' } = req.body;
    const memory = loadMemory();
    const activePatient = patientDb.getActivePatient();
    const tooth = toothId ? findPatientTooth(activePatient, Number(toothId)) : null;

    let soapPrompt = '';
    if (language === 'fr') {
      soapPrompt = `
Rédigez un projet de compte-rendu clinique dentaire au format SOAP, rigoureux sur le plan médico-légal, que le praticien relira et validera.

ACTE RÉALISÉ : ${procedure || 'Soin conservateur / Traitement endodontique / Chirurgie'}
DENT CONCERNÉE : ${tooth ? `Dent ${tooth.fdi} (FDI) - ${tooth.name}` : 'Général / Non spécifié'}
DÉTAILS CLINIQUES : ${details || 'Acte réalisé avec succès sans complication'}
ANESTHÉSIE LOCALE : ${anesthesiaUsed || `${activePatient.deliveredCarpules} carpules administrées`}
MATÉRIAUX UTILISÉS : ${materialsUsed || 'Digue dentaire, mordançage sélectif, composite'}
PATIENT (anonymisé) : ${activePatient.age} ans | Statut ASA: ${activePatient.asaStatus} | Poids: ${activePatient.weightKg}kg | Alertes: ${activePatient.medicalAlerts}

Rédigez STRICTEMENT en français professionnel (dents en numérotation FDI, médicaments en DCI) selon la structure suivante.
N'inventez aucune constatation, mesure ou valeur qui ne figure pas ci-dessus : écrivez « [à compléter] » à la place.
- **Date** (n'inventez aucun nom ni identifiant : l'identité du patient est ajoutée par le logiciel)
- **S (Subjectif)** : Motif de consultation, anamnèse médicale vérifiée, évaluation de la douleur (EVA 0-10), recueil du consentement éclairé du patient.
- **O (Objectif)** : Examen clinique visuel, tests de vitalité pulpaire (froid, test électrique, percussion axiale/latérale, palpation vestibulaire, sondage parodontal), constatations radiologiques pré-opératoires.
- **A (Analyse)** : Diagnostic pulpaire et péri-apical retenu par le praticien, argumenté.
- **P (Plan de traitement & Déroulement de l'Acte)** :
  - Anesthésie locale (molécule, %, vasoconstricteur, volume/carpules, technique, test d'aspiration négatif).
  - Champ opératoire (pose de la digue dentaire, étanchéité).
  - Étapes opératoires détaillées.
  - Matériaux d'obturation / collage mis en œuvre (adhésif, système de matrice, teinte de composite, temps d'insolation).
  - Contrôle occlusal statique et dynamique.
  - Consignes post-opératoires et protocole antalgique non opioïde.
  - Prochain rendez-vous / suivi programmé.
- **Actes réalisés** : liste des actes effectués en toutes lettres (libellé français, dent FDI, faces). N'indiquez AUCUN code d'acte (ni CDT, ni nomenclature CNAM) : la cotation est faite par le praticien dans la nomenclature officielle.
`;
    } else {
      soapPrompt = `
Draft a dental SOAP clinical progress note, medicolegally rigorous, for the dentist to review and sign off.

PROCEDURE: ${procedure || 'Operative Restoration / Endodontic / Surgical treatment'}
TOOTH: ${tooth ? `${tooth.fdi} (FDI) - ${tooth.name}` : 'General / Not specified'}
CLINICAL DETAILS: ${details || 'Procedure completed successfully without complications'}
LOCAL ANESTHESIA: ${anesthesiaUsed || `${activePatient.deliveredCarpules} carpules administered via infiltration/block`}
MATERIALS: ${materialsUsed || 'Rubber dam isolation, selective etch, composite'}
PATIENT (anonymized): ${activePatient.age}y | ASA: ${activePatient.asaStatus} | Weight: ${activePatient.weightKg}kg | Alerts: ${activePatient.medicalAlerts}

Write in English (FDI tooth numbers, drugs by INN/generic name), formatted strictly as below.
Do not invent any finding, measurement or value that is not given above: write "[to be completed]" instead.
- **Date** (do not invent any name or ID: patient identity is attached by the software)
- **S (Subjective)**: Chief complaint, medical history reviewed, pain score, informed consent obtained.
- **O (Objective)**: Clinical examination, vitality tests (cold, EPT, percussion, palpation, periodontal probing depths), pre-op radiograph findings.
- **A (Assessment)**: Pulpal & periapical diagnosis retained by the dentist, with its rationale.
- **P (Plan & Procedure Performed)**:
  - Local anesthesia (drug, %, epinephrine ratio, volume/cartridges, injection technique, aspiration negative).
  - Isolation technique (rubber dam clamp, seal).
  - Preparation/procedure breakdown.
  - Materials placed (bonding agent, matrix system, shade, cure times).
  - Occlusion check & post-op bite verification.
  - Post-operative instructions & pain management protocol.
  - Next appointment / recall interval.
- **Procedures performed**: list each procedure in plain words (FDI tooth, surfaces). Do NOT give any procedure code (neither CDT nor CNAM nomenclature): coding is done by the dentist from the official nomenclature.
`;
    }

    const result = await callGeminiWithResilience({
      preferredModel: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: soapPrompt }] }],
      config: { systemInstruction: MOLARIS_SYSTEM_PROMPT, temperature: 0.2 }
    });

    const isFr = language === 'fr';
    const noteText = result.text || (isFr ? 'Compte-rendu SOAP généré.' : 'Clinical SOAP note generated.');

    const savedNote = patientDb.addSoapNoteForActivePatient({
      procedure: procedure || (isFr ? 'Soin dentaire' : 'Dental treatment'),
      toothId: tooth ? tooth.id : undefined,
      anesthesiaUsed: anesthesiaUsed || (isFr ? 'Anesthésie locale' : 'Local anesthesia'),
      materialsUsed,
      content: noteText,
      // Procedure codes come from the official CNAM nomenclature, never from the AI;
      // the field stays for notes saved before this change.
      cdtCodes: [],
      author: memory.preferences.doctorName || (isFr ? 'Praticien traitant' : 'Treating dentist')
    });

    res.json({
      soapNote: noteText,
      savedRecord: savedNote,
      modelUsed: result.modelUsed,
      patient: patientDb.getActivePatient(),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('SOAP generator error:', err);
    sendAiError(res, err, req);
  }
});
