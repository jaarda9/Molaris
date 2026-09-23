import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { patientDb } from '../repositories/patients.js';
import { loadMemory } from '../repositories/preferences.js';
import { callGeminiWithResilience } from '../ai/gemini.js';
import { MOLARIS_SYSTEM_PROMPT } from '../ai/system-prompt.js';
import { executeMolarisAction } from '../ai/voice-actions.js';
import { computePatientSafetyAlerts } from '../domain/patient-safety.js';
import { DATA_DIR } from '../db/connection.js';
import { languageOf } from './http.js';

export const aiRouter = Router();

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
  try {
    const { message, toothId, conversationHistory = [], language = 'en' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const actionResult = executeMolarisAction(message, language);

    const memory = loadMemory();
    const activePatient = patientDb.getActivePatient();
    const tooth = toothId ? activePatient.teeth.find(t => t.id === Number(toothId)) : null;

    let contextPrompt = `### CURRENT CLINICAL OPERATORY CONTEXT\n`;
    contextPrompt += `- Doctor: ${memory.preferences.doctorName} (${memory.preferences.clinicName})\n`;
    contextPrompt += `- Numbering System: ${memory.preferences.numberingSystem}\n`;
    contextPrompt += `- Preferred Bonding System: ${memory.preferences.bondingSystem}\n`;
    contextPrompt += `- Preferred Composite System: ${memory.preferences.compositeSystem}\n`;
    contextPrompt += `- Preferred Rotary Endodontic System: ${memory.preferences.rotarySystem}\n`;
    contextPrompt += `- Preferred Implant System: ${memory.preferences.implantSystem}\n`;
    contextPrompt += `- ACTIVE PATIENT (anonymized) | Age: ${activePatient.age}${activePatient.gender ? ` (${activePatient.gender})` : ''} | Weight: ${activePatient.weightKg}kg | ASA Status: ${activePatient.asaStatus} | Cardiac Risk: ${activePatient.cardiacRisk ? 'YES (Strict 0.04mg Epi Max)' : 'NO'}\n`;
    contextPrompt += `- Chief Complaint: "${activePatient.chiefComplaint}"\n`;
    contextPrompt += `- Medical Alerts: ${activePatient.medicalAlerts}\n`;
    contextPrompt += `- Allergies: ${activePatient.allergies}\n`;
    contextPrompt += `- Local Anesthesia Delivered Today: ${activePatient.deliveredCarpules} carpules\n`;

    if (tooth) {
      contextPrompt += `- Targeted Tooth: Universal #${tooth.id} (FDI ${tooth.fdi}) - ${tooth.name} [Status: ${tooth.status.toUpperCase()}]`;
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

    if (language === 'fr') {
      contextPrompt += `\n### DIRECTIVE DE LANGUE OBLIGATOIRE (FRANÇAIS):\n` +
        `- Vous DEVEZ répondre ENTIÈREMENT en français médical et odontologique professionnel, précis et chaleureux.\n` +
        `- Adressez-vous au praticien avec "Docteur" ou "Cher confrère".\n` +
        `- Utilisez la terminologie dentaire francophone de référence : anesthésie tronculaire à l'épine de Spix (ou Spix), bloc de Gow-Gates, coiffage pulpaire direct/indirect au MTA ou Biodentine, digue dentaire, surélévation de marge cervicale (DME), alvéolite sèche, dépassement d'hypochlorite de sodium, pulpite aiguë irréversible, tenon fibré, etc.\n` +
        `- Si une action a été exécutée, confirmez-la clairement en français.\n` +
        `- Signalez tout risque ou mise en garde avec ⚠️ **ALERTE CLINIQUE**.\n`;
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    conversationHistory.slice(-8).forEach((entry: { role: string; content: string }) => {
      contents.push({ role: entry.role === 'user' ? 'user' : 'model', parts: [{ text: entry.content }] });
    });
    contents.push({ role: 'user', parts: [{ text: `${contextPrompt}\nDoctor asks: ${message}` }] });

    const result = await callGeminiWithResilience({
      preferredModel: 'gemini-3.8-flash',
      contents,
      config: { systemInstruction: MOLARIS_SYSTEM_PROMPT, temperature: 0.35, maxOutputTokens: 1500 }
    });

    let replyText = result.text || (language === 'fr' ? 'J\'ai examiné le cas, Docteur. Pourriez-vous préciser la présentation clinique ?' : 'I reviewed the case, Doctor. Could you clarify the clinical presentation?');
    if (actionResult.executed && !replyText.includes(actionResult.summary || '')) {
      replyText = language === 'fr'
        ? `⚡ **Action exécutée :** ${actionResult.summary}\n\n${replyText}`
        : `⚡ **Action executed:** ${actionResult.summary}\n\n${replyText}`;
    }

    res.json({
      reply: replyText,
      action: actionResult,
      activePatient: patientDb.getActivePatient(),
      safetyAlerts,
      toothTargeted: tooth ? tooth.id : null,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ error: err.message || 'Failed to obtain clinical response from M.O.L.A.R.I.S' });
  }
});

// --- Radiograph / intraoral photo second opinion -----------------------------------

aiRouter.post('/api/analyze-image', aiLimiter, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const clinicalQuery = req.body.query || 'Perform a comprehensive clinical diagnostic evaluation of this dental image (periapical, bitewing, panoramic, or intraoral clinical photograph).';
    const toothNumber = req.body.toothId;
    const language = req.body.language || 'en';
    const mimeType = req.file.mimetype || 'image/jpeg';
    const activePatient = patientDb.getActivePatient();

    let visionPrompt = `
You are M.O.L.A.R.I.S, senior board-certified dental diagnostic specialist and chairside advisor.
Analyze this dental clinical radiograph or intraoral image thoroughly.

CLINICAL QUERY: ${clinicalQuery}
${toothNumber ? `FOCUS AREA: Tooth #${toothNumber}` : ''}
PATIENT (anonymized): ${activePatient.age}y ${activePatient.gender} | ASA: ${activePatient.asaStatus} | Chief Complaint: "${activePatient.chiefComplaint}" | Medical Alerts: ${activePatient.medicalAlerts}

Please provide a structured clinical assessment:
1. **Image Type & Quality**: (Bitewing, Periapical, Panoramic, Intraoral photo; angulation, contrast, crown/apex coverage).
2. **Key Radiographic/Clinical Findings**:
   - Caries evaluation (enamel, dentin involvement, pulpal proximity, recurrent caries under existing margins).
   - Periodontal bone architecture (alveolar crest height, horizontal/vertical bone loss, furcation involvement, lamina dura integrity, PDL space widening).
   - Periapical status (normal, periapical radiolucency / apical periodontitis, condensing osteitis, hypercementosis).
   - Existing restorations or endodontic treatments (margins, overhangs, obturation density/length).
3. **Differential Diagnoses & Risk Assessment**: (e.g. Asymptomatic Irreversible Pulpitis, Symptomatic Apical Periodontitis, Failed restoration, Subgingival margin).
4. **Senior Treatment Recommendations & Procedural Steps**: Evidence-based recommendation for the attending doctor.
5. **⚠️ Red Flags & Chairside Precautions**: (Anatomical risks: Mental foramen, Inferior Alveolar Canal, Maxillary Sinus floor, root fractures).
`;

    if (language === 'fr') {
      visionPrompt += `\n[DIRECTIVE DE LANGUE OBLIGATOIRE] : Rédigez l'ensemble de votre rapport diagnostique radiologique et vos recommandations thérapeutiques exclusivement en français médical/odontologique professionnel, rigoureux et bienveillant.\n`;
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
    res.status(500).json({ error: err.message || 'Radiographic analysis failed' });
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
    const tooth = toothId ? activePatient.teeth.find(t => t.id === Number(toothId)) : null;

    let soapPrompt = '';
    if (language === 'fr') {
      soapPrompt = `
Générez un compte-rendu d'évolution clinique dentaire formel au format SOAP (médico-légalement rigoureux et conforme aux recommandations professionnelles) et assignez les codes d'actes correspondants.

ACTE RÉALISÉ : ${procedure || 'Soin conservateur / Traitement endodontique / Chirurgie'}
DENT CONCERNÉE : ${tooth ? `Dent Universelle #${tooth.id} (Notation FDI ${tooth.fdi}) - ${tooth.name}` : 'Général / Non spécifié'}
DÉTAILS CLINIQUES : ${details || 'Acte réalisé avec succès sans complication'}
ANESTHÉSIE LOCALE : ${anesthesiaUsed || `${activePatient.deliveredCarpules} carpules administrées`}
MATÉRIAUX UTILISÉS : ${materialsUsed || 'Digue dentaire, mordançage sélectif, composite'}
PATIENT (anonymisé) : ${activePatient.age} ans | Statut ASA: ${activePatient.asaStatus} | Poids: ${activePatient.weightKg}kg | Alertes: ${activePatient.medicalAlerts}

Rédigez STRICTEMENT en français professionnel selon la structure suivante :
- **Date** (n'inventez aucun nom ni identifiant : l'identité du patient est ajoutée par le logiciel)
- **S (Subjectif)** : Motif de consultation, anamnèse médicale vérifiée, évaluation de la douleur (EVA 0-10), recueil du consentement éclairé du patient.
- **O (Objectif)** : Examen clinique visuel, tests de vitalité pulpaire (froid, test électrique, percussion axiale/latérale, palpation vestibulaire, sondage parodontal), constatations radiologiques pré-opératoires.
- **A (Analyse & Diagnostic)** : Diagnostic pulpaire et péri-apical formel et argumenté.
- **P (Plan de traitement & Déroulement de l'Acte)** :
  - Anesthésie locale (molécule, %, vasoconstricteur, volume/carpules, technique, test d'aspiration négatif).
  - Champ opératoire (pose de la digue dentaire, étanchéité).
  - Étapes opératoires détaillées.
  - Matériaux d'obturation / collage mis en œuvre (adhésif, système de matrice, teinte de composite, temps d'insolation).
  - Contrôle occlusal statique et dynamique.
  - Consignes post-opératoires et protocole antalgique non opioïde.
  - Prochain rendez-vous / suivi programmé.
- **Codes Actes / CDT** : Codification standard des actes réalisés avec libellé clair.
`;
    } else {
      soapPrompt = `
Generate a formal, medicolegally bulletproof, board-standard dental SOAP clinical progress note and assign the exact CDT procedural codes.

PROCEDURE: ${procedure || 'Operative Restoration / Endodontic / Surgical treatment'}
TOOTH: ${tooth ? `Universal #${tooth.id} (FDI ${tooth.fdi}) - ${tooth.name}` : 'General / Not specified'}
CLINICAL DETAILS: ${details || 'Procedure completed successfully without complications'}
LOCAL ANESTHESIA: ${anesthesiaUsed || `${activePatient.deliveredCarpules} carpules administered via infiltration/block`}
MATERIALS: ${materialsUsed || 'Rubber dam isolation, selective etch, composite'}
PATIENT (anonymized): ${activePatient.age}y | ASA: ${activePatient.asaStatus} | Weight: ${activePatient.weightKg}kg | Alerts: ${activePatient.medicalAlerts}

Format strictly as:
- **Date** (do not invent any name or ID: patient identity is attached by the software)
- **S (Subjective)**: Chief complaint, medical history reviewed, pain score, informed consent obtained.
- **O (Objective)**: Clinical examination, vitality tests (cold, EPT, percussion, palpation, periodontal probing depths), pre-op radiograph findings.
- **A (Assessment)**: Definite diagnosis (ICD-10 if applicable, pulpal & periapical status).
- **P (Plan & Procedure Performed)**:
  - Exact local anesthesia (drug, %, epinephrine ratio, volume/carpules, injection technique, aspiration negative).
  - Isolation technique (rubber dam clamp, seal).
  - Preparation/procedure breakdown.
  - Materials placed (bonding agent, matrix system, shade, cure times).
  - Occlusion check & post-op bite verification.
  - Post-operative instructions & pain management protocol.
  - Next appointment / recall interval.
- **CDT Procedure Codes**: List all applicable ADA CDT codes (e.g. D0140, D0220, D2392, D3330, etc.) with description and tooth surface.
`;
    }

    const result = await callGeminiWithResilience({
      preferredModel: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: soapPrompt }] }],
      config: { systemInstruction: MOLARIS_SYSTEM_PROMPT, temperature: 0.2 }
    });

    const noteText = result.text || 'Clinical SOAP note generated.';
    const cdtCodes = Array.from(new Set(noteText.match(/D\d{4}[^\n]*/gi) || [])).slice(0, 5);

    const savedNote = patientDb.addSoapNoteForActivePatient({
      procedure: procedure || 'Dental Treatment',
      toothId: tooth ? tooth.id : undefined,
      anesthesiaUsed: anesthesiaUsed || 'Standard local anesthesia',
      materialsUsed,
      content: noteText,
      cdtCodes,
      author: memory.preferences.doctorName || 'Attending Doctor'
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
    res.status(500).json({ error: err.message || 'Failed to generate SOAP note' });
  }
});
