import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { MOLARIS_SYSTEM_PROMPT } from './src/molaris-protocol.js';
import { ToothInfo, ANESTHETICS, QUICK_PROTOCOLS } from './src/dental-data.js';
import { loadMemory, saveMemory, ClinicalMemoryState } from './src/clinical-memory.js';
import { patientDb, PatientRecord } from './src/patient-db.js';
import { executeMolarisAction } from './src/molaris-actions.js';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

// Serve static assets from public/
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// Resilient model cascade: if primary model has a temporary 503 capacity surge or rate limit,
// cascade seamlessly to verified fast approved models so chairside clinical queries never fail.
const MODEL_CANDIDATES = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

interface GenerateResilientOptions {
  contents: any;
  config?: any;
  preferredModel?: string;
}

async function callGeminiWithResilience(options: GenerateResilientOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGemini();
  const models = options.preferredModel
    ? [options.preferredModel, ...MODEL_CANDIDATES.filter(m => m !== options.preferredModel)]
    : MODEL_CANDIDATES;

  let lastError: any = null;

  for (const model of models) {
    // Attempt up to 2 times for each model if transient network/server error
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config
        });
        const text = response.text || '';
        return { text, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isTransient =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('429') ||
          msg.includes('ResourceExhausted') ||
          msg.includes('overloaded');

        console.warn(`[M.O.L.A.R.I.S AI Resilience] Model ${model} (attempt ${attempt + 1}/2) failed: ${msg.slice(0, 160)}`);

        if (isTransient && attempt === 0) {
          // brief backoff before retrying
          await new Promise(r => setTimeout(r, 600));
          continue;
        }

        // If it's a capacity/transient error, break immediately to try the next model candidate
        if (isTransient) {
          break;
        }

        // If it's not a transient server capacity error, rethrow
        throw err;
      }
    }
  }

  throw lastError || new Error('All clinical models are temporarily experiencing high demand. Please retry in a few moments.');
}

// System Status Endpoint
app.get('/api/status', (req: Request, res: Response) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  const memory = loadMemory();
  const activePatient = patientDb.getActivePatient();
  const patients = patientDb.getAllPatients();

  res.json({
    status: 'online',
    systemName: 'M.O.L.A.R.I.S',
    version: '4.3.0-JARVIS-AUTONOMOUS',
    role: 'Senior Dental Advisor & Chairside Autonomous Copilot',
    hasApiKey: hasKey,
    doctorName: memory.preferences.doctorName,
    clinicName: memory.preferences.clinicName,
    numberingSystem: memory.preferences.numberingSystem,
    activePatient,
    patientsCount: patients.length,
    teethCount: activePatient.teeth.length
  });
});

// Patient Database Endpoints
app.get('/api/patients', (req: Request, res: Response) => {
  res.json({
    activePatientId: patientDb.getActivePatient().id,
    patients: patientDb.getAllPatients()
  });
});

app.get('/api/patients/active', (req: Request, res: Response) => {
  res.json(patientDb.getActivePatient());
});

app.post('/api/patients/select', (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Patient ID is required' });
    const patient = patientDb.setActivePatient(id);
    res.json({ success: true, activePatient: patient });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/patients', (req: Request, res: Response) => {
  try {
    const newPatient = patientDb.createPatient(req.body);
    res.status(201).json({ success: true, patient: newPatient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/patients/:id', (req: Request, res: Response) => {
  try {
    const updated = patientDb.updatePatient(String(req.params.id), req.body);
    res.json({ success: true, patient: updated });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/patients/:id', (req: Request, res: Response) => {
  try {
    const success = patientDb.deletePatient(String(req.params.id));
    res.json({ success, activePatient: patientDb.getActivePatient() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Database Export & Import
app.get('/api/database/export', (req: Request, res: Response) => {
  res.setHeader('Content-Disposition', 'attachment; filename="molaris-dental-database.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(patientDb.getDatabaseRaw(), null, 2));
});

app.post('/api/database/import', (req: Request, res: Response) => {
  try {
    patientDb.importDatabase(req.body);
    res.json({ success: true, activePatient: patientDb.getActivePatient() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Doctor Preferences & Clinical Memory
app.get('/api/memory', (req: Request, res: Response) => {
  res.json(loadMemory());
});

app.post('/api/memory', (req: Request, res: Response) => {
  try {
    const memory = loadMemory();
    if (req.body.preferences) {
      memory.preferences = { ...memory.preferences, ...req.body.preferences };
    }
    saveMemory(memory);
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Odontogram Endpoints (Bound to Active Patient in Local File Database)
app.get('/api/odontogram', (req: Request, res: Response) => {
  const patient = patientDb.getActivePatient();
  res.json(patient.teeth);
});

app.post('/api/odontogram', (req: Request, res: Response) => {
  try {
    const { toothId, status, notes, surfaces } = req.body;
    const tooth = patientDb.updateToothForActivePatient(Number(toothId), { status, notes, surfaces });
    res.json({ success: true, tooth, activePatientId: patientDb.getActivePatient().id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/odontogram/reset', (req: Request, res: Response) => {
  const teeth = patientDb.resetOdontogramForActivePatient();
  res.json({ success: true, odontogram: teeth });
});

// Anesthetics List & Data
app.get('/api/anesthetics', (req: Request, res: Response) => {
  res.json({
    anesthetics: ANESTHETICS,
    protocols: QUICK_PROTOCOLS
  });
});

// Local Anesthetic Dosage Calculator
app.post('/api/calc-la', (req: Request, res: Response) => {
  try {
    const activePatient = patientDb.getActivePatient();
    const { drugId, weightKg, isCardiacRisk, carpulesGiven, language = 'en' } = req.body;
    const drug = ANESTHETICS.find(a => a.id === drugId) || ANESTHETICS[0];

    const weight = weightKg !== undefined ? Number(weightKg) : activePatient.weightKg;
    const cardiac = isCardiacRisk !== undefined ? !!isCardiacRisk : activePatient.cardiacRisk;
    const carpules = carpulesGiven !== undefined ? Number(carpulesGiven) : activePatient.deliveredCarpules;

    // Weight based max mg
    const weightMaxMg = weight * drug.maxDoseMgKg;
    const allowedMaxMg = Math.min(weightMaxMg, drug.absoluteMaxMg);

    // Maximum safe carpules based on anesthetic agent
    const maxCarpulesByAgent = Math.floor((allowedMaxMg / drug.mgPerCartridge) * 10) / 10;

    // Epinephrine limitations
    let maxCarpulesByEpi = 999;
    let epiPerCartridge = 0;
    if (drug.epiRatio === '1:100,000') {
      epiPerCartridge = drug.cartridgeVolume * 0.01; // ~0.017-0.018 mg
      const epiLimit = cardiac ? 0.04 : 0.2;
      maxCarpulesByEpi = Math.floor((epiLimit / epiPerCartridge) * 10) / 10;
    } else if (drug.epiRatio === '1:200,000') {
      epiPerCartridge = drug.cartridgeVolume * 0.005; // ~0.009 mg
      const epiLimit = cardiac ? 0.04 : 0.2;
      maxCarpulesByEpi = Math.floor((epiLimit / epiPerCartridge) * 10) / 10;
    }

    const safeMaxCarpules = Math.min(maxCarpulesByAgent, maxCarpulesByEpi);
    const mgDelivered = carpules * drug.mgPerCartridge;
    const epiDelivered = carpules * epiPerCartridge;
    const remainingCarpules = Math.max(0, Math.round((safeMaxCarpules - carpules) * 10) / 10);
    const isExceeded = carpules > safeMaxCarpules;

    const limitingFactor = safeMaxCarpules === maxCarpulesByEpi
      ? (language === 'fr' ? 'Épinéphrine (Plafond cardiovasculaire max 0,04 mg)' : 'Epinephrine (Cardiac threshold)')
      : (language === 'fr' ? 'Toxicité du principe actif (Limite mg/kg)' : 'Anesthetic agent toxicity (Mg/kg limit)');

    const warningMessage = isExceeded
      ? (language === 'fr' ? 'DANGER : Dose maximale recommandée dépassée. Surveillez le patient pour tout signe de toxicité systémique (LAST) et tachycardie.' : 'DANGER: Maximum recommended dose exceeded. Monitor patient for Local Anesthetic Systemic Toxicity (LAST) and tachycardia.')
      : cardiac && safeMaxCarpules <= 2.2
      ? (language === 'fr' ? 'NOTE : Alerte cardiaque active. Épinéphrine plafonnée à 0,04 mg (~2 cartouches dosées à 1:100 000).' : 'NOTE: Patient has cardiac alerts. Epinephrine restricted to 0.04mg (~2 cartridges of 1:100k).')
      : null;

    res.json({
      drugName: drug.name,
      patientWeightKg: weight,
      isCardiacRisk: cardiac,
      allowedMaxMg: Math.round(allowedMaxMg),
      safeMaxCarpules,
      limitingFactor,
      carpulesDelivered: carpules,
      mgDelivered: Math.round(mgDelivered),
      epiDeliveredMg: Math.round(epiDelivered * 1000) / 1000,
      remainingCarpules,
      isExceeded,
      warning: warningMessage
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Anesthesia Logging Endpoint
app.post('/api/anesthesia/log', (req: Request, res: Response) => {
  try {
    const { drugId, carpules, site, notes } = req.body;
    const drug = ANESTHETICS.find(a => a.id === drugId) || ANESTHETICS[0];
    const carp = Number(carpules) || 1.0;

    let epiPerCartridge = 0;
    if (drug.epiRatio === '1:100,000') epiPerCartridge = drug.cartridgeVolume * 0.01;
    else if (drug.epiRatio === '1:200,000') epiPerCartridge = drug.cartridgeVolume * 0.005;

    const result = patientDb.logAnesthesiaForActivePatient({
      drugId: drug.id,
      drugName: drug.name,
      carpules: carp,
      mg: Math.round(carp * drug.mgPerCartridge),
      epiMg: Math.round(carp * epiPerCartridge * 1000) / 1000,
      site: site || 'Buccal Infiltration / Block',
      notes
    });

    res.json({ success: true, patient: result.patient, entry: result.entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Senior Dental Advisor & Autonomous JARVIS Action Engine
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, toothId, conversationHistory = [], language = 'en' } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Step 1: Check for Autonomous Chairside / System Actions
    const actionResult = executeMolarisAction(message, language);

    // Refresh active patient and preferences after potential action
    const memory = loadMemory();
    const activePatient = patientDb.getActivePatient();
    const tooth = toothId ? activePatient.teeth.find(t => t.id === Number(toothId)) : null;

    // Context enrichments with real patient data
    let contextPrompt = `### CURRENT CLINICAL OPERATORY CONTEXT\n`;
    contextPrompt += `- Doctor: ${memory.preferences.doctorName} (${memory.preferences.clinicName})\n`;
    contextPrompt += `- Numbering System: ${memory.preferences.numberingSystem}\n`;
    contextPrompt += `- Preferred Bonding System: ${memory.preferences.bondingSystem}\n`;
    contextPrompt += `- Preferred Composite System: ${memory.preferences.compositeSystem}\n`;
    contextPrompt += `- Preferred Rotary Endodontic System: ${memory.preferences.rotarySystem}\n`;
    contextPrompt += `- Preferred Implant System: ${memory.preferences.implantSystem}\n`;
    contextPrompt += `- ACTIVE PATIENT: ${activePatient.name} | Chart: ${activePatient.chartId} | Age: ${activePatient.age}${activePatient.gender ? ` (${activePatient.gender})` : ''} | Weight: ${activePatient.weightKg}kg | ASA Status: ${activePatient.asaStatus} | Cardiac Risk: ${activePatient.cardiacRisk ? 'YES (Strict 0.04mg Epi Max)' : 'NO'}\n`;
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
      contextPrompt += `\n[M.O.L.A.R.I.S JARVIS ACTION JUST EXECUTED IN DATABASE]: ${actionResult.summary}\n`;
    }

    if (language === 'fr') {
      contextPrompt += `\n### DIRECTIVE DE LANGUE OBLIGATOIRE (FRANÇAIS):\n` +
        `- Vous DEVEZ répondre ENTIÈREMENT en français médical et odontologique professionnel, précis et chaleureux.\n` +
        `- Adressez-vous au praticien avec "Docteur" ou "Cher confrère".\n` +
        `- Utilisez la terminologie dentaire francophone de référence : anesthésie tronculaire à l'épine de Spix (ou Spix), bloc de Gow-Gates, coiffage pulpaire direct/indirect au MTA ou Biodentine, digue dentaire, surélévation de marge cervicale (DME), alvéolite sèche, dépassement d'hypochlorite de sodium, pulpite aiguë irréversible, tenon fibré, etc.\n` +
        `- Si une action a été exécutée, confirmez-la clairement en français.\n` +
        `- Signalez tout risque ou mise en garde avec ⚠️ **ALERTE CLINIQUE**.\n`;
    }

    // Build chat contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    conversationHistory.slice(-8).forEach((entry: { role: string; content: string }) => {
      contents.push({
        role: entry.role === 'user' ? 'user' : 'model',
        parts: [{ text: entry.content }]
      });
    });

    const userTurnText = `${contextPrompt}\nDoctor asks: ${message}`;
    contents.push({
      role: 'user',
      parts: [{ text: userTurnText }]
    });

    const result = await callGeminiWithResilience({
      preferredModel: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: MOLARIS_SYSTEM_PROMPT,
        temperature: 0.35,
        maxOutputTokens: 1500
      }
    });

    let replyText = result.text || (language === 'fr' ? 'J\'ai examiné le cas, Docteur. Pourriez-vous préciser la présentation clinique ?' : 'I reviewed the case, Doctor. Could you clarify the clinical presentation?');
    if (actionResult.executed && !replyText.includes(actionResult.summary || '')) {
      replyText = language === 'fr'
        ? `⚡ **Action Opératoire Autonome Exécutée :** ${actionResult.summary}\n\n${replyText}`
        : `⚡ **Operatory Action Executed:** ${actionResult.summary}\n\n${replyText}`;
    }

    res.json({
      reply: replyText,
      action: actionResult,
      activePatient: patientDb.getActivePatient(),
      toothTargeted: tooth ? tooth.id : null,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    res.status(500).json({
      error: err.message || 'Failed to obtain clinical response from M.O.L.A.R.I.S'
    });
  }
});

// Dental Vision / Radiograph & Photo Diagnostics
app.post('/api/analyze-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const clinicalQuery = req.body.query || 'Perform a comprehensive clinical diagnostic evaluation of this dental image (periapical, bitewing, panoramic, or intraoral clinical photograph).';
    const toothNumber = req.body.toothId;
    const language = req.body.language || 'en';

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const memory = loadMemory();
    const activePatient = patientDb.getActivePatient();

    let visionPrompt = `
You are M.O.L.A.R.I.S, senior board-certified dental diagnostic specialist and chairside advisor.
Analyze this dental clinical radiograph or intraoral image thoroughly.

CLINICAL QUERY: ${clinicalQuery}
${toothNumber ? `FOCUS AREA: Tooth #${toothNumber}` : ''}
PATIENT: ${activePatient.name} (${activePatient.chartId}) | ASA: ${activePatient.asaStatus} | Chief Complaint: "${activePatient.chiefComplaint}" | Medical Alerts: ${activePatient.medicalAlerts}

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
      contents: [
        {
          role: 'user',
          parts: [
            { text: visionPrompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: MOLARIS_SYSTEM_PROMPT,
        temperature: 0.2
      }
    });

    res.json({
      analysis: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Vision analysis error:', err);
    res.status(500).json({ error: err.message || 'Radiographic analysis failed' });
  }
});

// SOAP Note and CDT Coding Generator & Historical Registry
app.get('/api/soap/history', (req: Request, res: Response) => {
  const activePatient = patientDb.getActivePatient();
  res.json({
    patientId: activePatient.id,
    chartId: activePatient.chartId,
    patientName: activePatient.name,
    soapNotes: activePatient.soapNotes
  });
});

app.post('/api/generate-soap', async (req: Request, res: Response) => {
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
PATIENT : ${activePatient.name} | Dossier: ${activePatient.chartId} | Statut ASA: ${activePatient.asaStatus} | Poids: ${activePatient.weightKg}kg | Alertes: ${activePatient.medicalAlerts}

Rédigez STRICTEMENT en français professionnel selon la structure suivante :
- **Date & Identifiant du Patient**
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
PATIENT: ${activePatient.name} | Chart: ${activePatient.chartId} | ASA: ${activePatient.asaStatus} | Weight: ${activePatient.weightKg}kg | Alerts: ${activePatient.medicalAlerts}

Format strictly as:
- **Date & Patient ID**
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
      config: {
        systemInstruction: MOLARIS_SYSTEM_PROMPT,
        temperature: 0.2
      }
    });

    const noteText = result.text || 'Clinical SOAP note generated.';

    // Extract CDT codes automatically if present
    const cdtMatches = noteText.match(/D\d{4}[^\n]*/gi) || [];
    const cdtCodes = Array.from(new Set(cdtMatches)).slice(0, 5);

    // Save note to active patient record in local database file
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

// System & Hardware Telemetry Hub
app.get('/api/system/telemetry', (req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());
  const patients = patientDb.getAllPatients();
  const activePatient = patientDb.getActivePatient();

  res.json({
    status: 'online',
    uptimeSeconds: uptimeSec,
    uptimeHuman: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`,
    processMemory: {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
      rssMb: Math.round(mem.rss / 1024 / 1024 * 10) / 10
    },
    systemMemory: {
      totalRamMb: Math.round(os.totalmem() / 1024 / 1024),
      freeRamMb: Math.round(os.freemem() / 1024 / 1024)
    },
    platform: `${os.platform()} (${os.arch()})`,
    nodeVersion: process.version,
    database: {
      file: 'data/patients-db.json',
      patientCount: patients.length,
      activePatientId: activePatient.id,
      activePatientName: activePatient.name,
      activePatientChartId: activePatient.chartId
    },
    models: MODEL_CANDIDATES
  });
});

// Fallback to SPA index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[M.O.L.A.R.I.S] Senior Dental Advisor online at http://0.0.0.0:${PORT}`);
});
