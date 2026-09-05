import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { MOLARIS_SYSTEM_PROMPT } from './src/molaris-protocol.js';
import { DEFAULT_TEETH, ToothInfo, ANESTHETICS, QUICK_PROTOCOLS } from './src/dental-data.js';
import { loadMemory, saveMemory, ClinicalMemoryState } from './src/clinical-memory.js';

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

// In-memory Odontogram (persisted to file if desired)
const ODONTOGRAM_FILE = path.join(process.cwd(), 'odontogram-state.json');
function loadOdontogram(): ToothInfo[] {
  try {
    if (fs.existsSync(ODONTOGRAM_FILE)) {
      return JSON.parse(fs.readFileSync(ODONTOGRAM_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Using default odontogram state', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_TEETH));
}

function saveOdontogram(teeth: ToothInfo[]): void {
  try {
    fs.writeFileSync(ODONTOGRAM_FILE, JSON.stringify(teeth, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save odontogram', err);
  }
}

let odontogramState: ToothInfo[] = loadOdontogram();

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
  res.json({
    status: 'online',
    systemName: 'M.O.L.A.R.I.S',
    version: '4.2.0-CLINICAL',
    role: 'Senior Dental Advisor & Chairside Clinical Assistant',
    hasApiKey: hasKey,
    doctorName: memory.preferences.doctorName,
    clinicName: memory.preferences.clinicName,
    numberingSystem: memory.preferences.numberingSystem,
    activePatient: memory.activePatient,
    teethCount: odontogramState.length
  });
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
    if (req.body.activePatient) {
      memory.activePatient = { ...memory.activePatient, ...req.body.activePatient };
    }
    if (req.body.newCase) {
      memory.caseHistory.unshift({
        timestamp: new Date().toISOString(),
        ...req.body.newCase
      });
      // Cap history at 50 entries
      if (memory.caseHistory.length > 50) memory.caseHistory.pop();
    }
    saveMemory(memory);
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Odontogram Endpoints
app.get('/api/odontogram', (req: Request, res: Response) => {
  res.json(odontogramState);
});

app.post('/api/odontogram', (req: Request, res: Response) => {
  try {
    const { toothId, status, notes, surfaces } = req.body;
    const tooth = odontogramState.find(t => t.id === Number(toothId));
    if (!tooth) {
      return res.status(404).json({ error: `Tooth #${toothId} not found` });
    }
    if (status !== undefined) tooth.status = status;
    if (notes !== undefined) tooth.notes = notes;
    if (surfaces !== undefined) tooth.surfaces = surfaces;

    saveOdontogram(odontogramState);
    res.json({ success: true, tooth });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/odontogram/reset', (req: Request, res: Response) => {
  odontogramState = JSON.parse(JSON.stringify(DEFAULT_TEETH));
  saveOdontogram(odontogramState);
  res.json({ success: true, odontogram: odontogramState });
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
    const { drugId, weightKg, isCardiacRisk, carpulesGiven = 0 } = req.body;
    const drug = ANESTHETICS.find(a => a.id === drugId) || ANESTHETICS[0];

    const weight = Number(weightKg) || 70;
    const carpules = Number(carpulesGiven) || 0;

    // Weight based max mg
    const weightMaxMg = weight * drug.maxDoseMgKg;
    const allowedMaxMg = Math.min(weightMaxMg, drug.absoluteMaxMg);

    // Maximum safe carpules based on anesthetic agent
    const maxCarpulesByAgent = Math.floor((allowedMaxMg / drug.mgPerCartridge) * 10) / 10;

    // Epinephrine limitations:
    // Normal healthy: 0.2 mg max epi
    // Cardiac / ASA III-IV: 0.04 mg max epi
    let maxCarpulesByEpi = 999;
    let epiPerCartridge = 0;
    if (drug.epiRatio === '1:100,000') {
      epiPerCartridge = drug.cartridgeVolume * 0.01; // ~0.017-0.018 mg
      const epiLimit = isCardiacRisk ? 0.04 : 0.2;
      maxCarpulesByEpi = Math.floor((epiLimit / epiPerCartridge) * 10) / 10;
    } else if (drug.epiRatio === '1:200,000') {
      epiPerCartridge = drug.cartridgeVolume * 0.005; // ~0.009 mg
      const epiLimit = isCardiacRisk ? 0.04 : 0.2;
      maxCarpulesByEpi = Math.floor((epiLimit / epiPerCartridge) * 10) / 10;
    }

    const safeMaxCarpules = Math.min(maxCarpulesByAgent, maxCarpulesByEpi);
    const mgDelivered = carpules * drug.mgPerCartridge;
    const epiDelivered = carpules * epiPerCartridge;
    const remainingCarpules = Math.max(0, Math.round((safeMaxCarpules - carpules) * 10) / 10);
    const isExceeded = carpules > safeMaxCarpules;

    res.json({
      drugName: drug.name,
      patientWeightKg: weight,
      isCardiacRisk: !!isCardiacRisk,
      allowedMaxMg: Math.round(allowedMaxMg),
      safeMaxCarpules,
      limitingFactor: safeMaxCarpules === maxCarpulesByEpi ? 'Epinephrine (Cardiac threshold)' : 'Anesthetic agent toxicity (Mg/kg limit)',
      carpulesDelivered: carpules,
      mgDelivered: Math.round(mgDelivered),
      epiDeliveredMg: Math.round(epiDelivered * 1000) / 1000,
      remainingCarpules,
      isExceeded,
      warning: isExceeded
        ? 'DANGER: Maximum recommended dose exceeded. Monitor patient for Local Anesthetic Systemic Toxicity (LAST) and tachycardia.'
        : isCardiacRisk && safeMaxCarpules <= 2.2
        ? 'NOTE: Patient has cardiac alerts. Epinephrine restricted to 0.04mg (~2 cartridges of 1:100k).'
        : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Senior Dental Advisor AI Chat
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, toothId, conversationHistory = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const memory = loadMemory();
    const tooth = toothId ? odontogramState.find(t => t.id === Number(toothId)) : null;

    // Context enrichments
    let contextPrompt = `### CURRENT CLINICAL CONTEXT\n`;
    contextPrompt += `- Doctor: ${memory.preferences.doctorName} (${memory.preferences.clinicName})\n`;
    contextPrompt += `- Preferred Bonding System: ${memory.preferences.bondingSystem}\n`;
    contextPrompt += `- Preferred Composite System: ${memory.preferences.compositeSystem}\n`;
    contextPrompt += `- Preferred Rotary Endodontic System: ${memory.preferences.rotarySystem}\n`;
    contextPrompt += `- Preferred Implant System: ${memory.preferences.implantSystem}\n`;
    contextPrompt += `- Active Patient: ${memory.activePatient.chartId} | ASA: ${memory.activePatient.asaStatus} | Weight: ${memory.activePatient.weightKg}kg | Cardiac Risk: ${memory.activePatient.cardiacRisk ? 'YES (0.04mg Epi Max)' : 'NO'}\n`;
    contextPrompt += `- Chief Complaint: "${memory.activePatient.chiefComplaint}"\n`;
    contextPrompt += `- Medical Alerts: ${memory.activePatient.medicalAlerts}\n`;

    if (tooth) {
      contextPrompt += `- Targeted Tooth: Universal #${tooth.id} (FDI ${tooth.fdi}) - ${tooth.name} [Status: ${tooth.status.toUpperCase()}]`;
      if (tooth.notes) contextPrompt += ` | Chart Notes: "${tooth.notes}"`;
      contextPrompt += `\n`;
    }

    // Build chat history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // System context in the first user turn or systemInstruction
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

    const replyText = result.text || 'I reviewed the case, Doctor. Could you clarify the clinical presentation?';

    res.json({
      reply: replyText,
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

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    const memory = loadMemory();

    const visionPrompt = `
You are M.O.L.A.R.I.S, senior board-certified dental diagnostic specialist and chairside advisor.
Analyze this dental clinical radiograph or intraoral image thoroughly.

CLINICAL QUERY: ${clinicalQuery}
${toothNumber ? `FOCUS AREA: Tooth #${toothNumber}` : ''}
PATIENT MEDICAL CONTEXT: ${memory.activePatient.chiefComplaint} | Alerts: ${memory.activePatient.medicalAlerts}

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

// SOAP Note and CDT Coding Generator
app.post('/api/generate-soap', async (req: Request, res: Response) => {
  try {
    const { procedure, toothId, details, anesthesiaUsed, materialsUsed } = req.body;
    const memory = loadMemory();
    const tooth = toothId ? odontogramState.find(t => t.id === Number(toothId)) : null;

    const soapPrompt = `
Generate a formal, medicolegally bulletproof, board-standard dental SOAP clinical progress note and assign the exact CDT procedural codes.

PROCEDURE: ${procedure || 'Operative Restoration / Endodontic / Surgical treatment'}
TOOTH: ${tooth ? `Universal #${tooth.id} (FDI ${tooth.fdi})` : 'General / Not specified'}
CLINICAL DETAILS: ${details || 'Procedure completed successfully without complications'}
LOCAL ANESTHESIA: ${anesthesiaUsed || '1 cartridge 2% Lidocaine 1:100k epi via infiltration'}
MATERIALS: ${materialsUsed || 'Rubber dam isolation, selective etch, composite'}
PATIENT: ${memory.activePatient.chartId} | ASA: ${memory.activePatient.asaStatus}

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

    const result = await callGeminiWithResilience({
      preferredModel: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: soapPrompt }] }],
      config: {
        systemInstruction: MOLARIS_SYSTEM_PROMPT,
        temperature: 0.2
      }
    });

    res.json({
      soapNote: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('SOAP generator error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate SOAP note' });
  }
});

// Fallback to SPA index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[M.O.L.A.R.I.S] Senior Dental Advisor online at http://0.0.0.0:${PORT}`);
});
