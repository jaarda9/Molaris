import fs from 'fs';
import path from 'path';
import { ToothInfo, DEFAULT_TEETH } from './dental-data.js';

export interface PatientRecord {
  id: string;
  chartId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  weightKg: number;
  asaStatus: 'ASA I' | 'ASA II' | 'ASA III' | 'ASA IV';
  cardiacRisk: boolean;
  medicalAlerts: string;
  allergies: string;
  chiefComplaint: string;
  deliveredCarpules: number;
  selectedDrugId: string;
  teeth: ToothInfo[];
  anesthesiaLog: Array<{
    id: string;
    timestamp: string;
    drugId: string;
    drugName: string;
    carpules: number;
    mg: number;
    epiMg: number;
    site: string;
    notes?: string;
  }>;
  soapNotes: Array<{
    id: string;
    timestamp: string;
    procedure: string;
    toothId?: number | string;
    anesthesiaUsed: string;
    materialsUsed?: string;
    content: string;
    cdtCodes: string[];
    author: string;
  }>;
  consultHistory: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DentalDatabase {
  activePatientId: string;
  patients: PatientRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'patients-db.json');

// Helper to create a fresh default tooth set with custom modifications
function createPatientTeeth(modifications?: Array<{ id: number; status: ToothInfo['status']; notes?: string }>): ToothInfo[] {
  const teeth: ToothInfo[] = JSON.parse(JSON.stringify(DEFAULT_TEETH));
  if (modifications) {
    modifications.forEach(mod => {
      const tooth = teeth.find(t => t.id === mod.id);
      if (tooth) {
        tooth.status = mod.status;
        if (mod.notes) tooth.notes = mod.notes;
      }
    });
  }
  return teeth;
}

// Initial default seed database (linked to distinct patients, never hardcoded in logic)
const SEED_DATABASE: DentalDatabase = {
  activePatientId: 'pt_1',
  patients: [
    {
      id: 'pt_1',
      chartId: 'PT-2026-084',
      name: 'Marcus Vance',
      age: 48,
      gender: 'Male',
      weightKg: 72,
      asaStatus: 'ASA II',
      cardiacRisk: false,
      medicalAlerts: 'Controlled hypertension (Lisinopril 10mg); No known drug allergies',
      allergies: 'No known drug allergies (NKDA)',
      chiefComplaint: 'Severe throbbing ache in lower right molar on cold and biting for 3 days',
      deliveredCarpules: 1.0,
      selectedDrugId: 'arti_100k',
      teeth: createPatientTeeth([
        { id: 30, status: 'caries', notes: 'Deep distal-occlusal caries extending to inner third of dentin. Lingering cold response >20s.' },
        { id: 19, status: 'restoration', notes: 'Existing MOD composite restoration, intact margins.' },
        { id: 3, status: 'crown', notes: 'Zirconia full contour crown placed 2022.' }
      ]),
      anesthesiaLog: [
        {
          id: 'anes_1',
          timestamp: new Date().toISOString(),
          drugId: 'arti_100k',
          drugName: 'Articaine 4% with 1:100k Epinephrine',
          carpules: 1.0,
          mg: 68,
          epiMg: 0.017,
          site: 'Buccal infiltration adjacent to #30'
        }
      ],
      soapNotes: [
        {
          id: 'soap_1',
          timestamp: new Date().toISOString(),
          procedure: 'Emergency Endodontic Triage & Evaluation',
          toothId: 30,
          anesthesiaUsed: '1.0 carpule Septocaine 4% 1:100k buccal infiltration',
          content: 'S: Patient reports constant throbbing pain exacerbated by cold liquids and mastication on right side.\nO: Tooth #30 cold test lingers 25s, percussion (+), palpation (-). Deep distal radiolucency approaching pulp.\nA: Symptomatic irreversible pulpitis with symptomatic apical periodontitis #30.\nP: Pulpal anesthesia obtained with Articaine 4% 1:100k. Caries excavation initiated under rubber dam isolation.',
          cdtCodes: ['D0140 - Limited Oral Evaluation', 'D0220 - Intraoral Periapical Radiograph'],
          author: 'Attending Doctor'
        }
      ],
      consultHistory: [],
      createdAt: '2026-08-10T09:00:00.000Z',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pt_2',
      chartId: 'PT-2026-091',
      name: 'Eleanor Davis',
      age: 67,
      gender: 'Female',
      weightKg: 58,
      asaStatus: 'ASA III',
      cardiacRisk: true,
      medicalAlerts: 'History of Myocardial Infarction (Stent 14 mos ago); Daily baby aspirin (81mg); High sensitivity to vasoconstrictors',
      allergies: 'Penicillin (Hives & Urticaria)',
      chiefComplaint: 'Fractured palatal cusp of upper left premolar while chewing almonds',
      deliveredCarpules: 0.0,
      selectedDrugId: 'mepi_plain',
      teeth: createPatientTeeth([
        { id: 12, status: 'caries', notes: 'Fractured lingual cusp, recurrent subgingival caries at mesial margin.' },
        { id: 14, status: 'implant', notes: 'Straumann bone level implant placed 2021.' },
        { id: 18, status: 'missing', notes: 'Extracted due to severe periodontitis.' },
        { id: 31, status: 'missing', notes: 'Extracted 2018.' }
      ]),
      anesthesiaLog: [],
      soapNotes: [],
      consultHistory: [],
      createdAt: '2026-08-22T14:30:00.000Z',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'pt_3',
      chartId: 'PT-2026-105',
      name: 'Lucas Chen',
      age: 24,
      gender: 'Male',
      weightKg: 81,
      asaStatus: 'ASA I',
      cardiacRisk: false,
      medicalAlerts: 'Healthy collegiate athlete; No systemic conditions',
      allergies: 'NKDA',
      chiefComplaint: 'Wisdom teeth pressure and lower left retromolar swelling and redness',
      deliveredCarpules: 0.0,
      selectedDrugId: 'lido_100k',
      teeth: createPatientTeeth([
        { id: 17, status: 'caries', notes: 'Partial soft tissue impaction with active pericoronitis.' },
        { id: 32, status: 'caries', notes: 'Mesioangular impaction wedged into distal of #31.' },
        { id: 1, status: 'sound', notes: 'Erupted, hygiene compromise.' },
        { id: 16, status: 'sound', notes: 'Erupted, hygiene compromise.' }
      ]),
      anesthesiaLog: [],
      soapNotes: [],
      consultHistory: [],
      createdAt: '2026-09-01T11:15:00.000Z',
      updatedAt: new Date().toISOString()
    }
  ]
};

// Database Management Class
class PatientDatabaseManager {
  private db: DentalDatabase;

  constructor() {
    this.db = this.init();
  }

  private init(): DentalDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.patients && Array.isArray(parsed.patients) && parsed.patients.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[Patient DB] Failed to read existing database file, seeding defaults:', err);
    }

    // Save initial seed database
    this.persist(SEED_DATABASE);
    return JSON.parse(JSON.stringify(SEED_DATABASE));
  }

  private persist(data: DentalDatabase): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Patient DB] Failed to persist database file:', err);
    }
  }

  public getAllPatients(): PatientRecord[] {
    return this.db.patients;
  }

  public getActivePatient(): PatientRecord {
    const found = this.db.patients.find(p => p.id === this.db.activePatientId);
    if (found) return found;
    // Fallback to first
    this.db.activePatientId = this.db.patients[0]?.id || 'pt_1';
    this.persist(this.db);
    return this.db.patients[0];
  }

  public getPatientById(id: string): PatientRecord | undefined {
    return this.db.patients.find(p => p.id === id || p.chartId.toLowerCase() === id.toLowerCase());
  }

  public getPatientByNameOrQuery(query: string): PatientRecord | undefined {
    const q = query.toLowerCase().trim();
    return this.db.patients.find(p => 
      p.name.toLowerCase().includes(q) || 
      p.chartId.toLowerCase().includes(q) ||
      p.id.toLowerCase() === q
    );
  }

  public setActivePatient(id: string): PatientRecord {
    const patient = this.getPatientById(id);
    if (!patient) {
      throw new Error(`Patient with ID or Chart '${id}' not found`);
    }
    this.db.activePatientId = patient.id;
    this.persist(this.db);
    return patient;
  }

  public createPatient(data: Partial<PatientRecord>): PatientRecord {
    const newId = `pt_${Date.now()}`;
    const nextChartNum = this.db.patients.length + 85;
    const chartId = data.chartId || `PT-2026-${String(nextChartNum).padStart(3, '0')}`;
    
    const newPatient: PatientRecord = {
      id: newId,
      chartId,
      name: data.name || 'New Patient',
      age: Number(data.age) || 35,
      gender: data.gender || 'Other',
      weightKg: Number(data.weightKg) || 70,
      asaStatus: data.asaStatus || 'ASA I',
      cardiacRisk: !!data.cardiacRisk,
      medicalAlerts: data.medicalAlerts || 'None recorded',
      allergies: data.allergies || 'NKDA',
      chiefComplaint: data.chiefComplaint || 'Routine evaluation and consultation',
      deliveredCarpules: 0,
      selectedDrugId: data.selectedDrugId || 'lido_100k',
      teeth: createPatientTeeth(),
      anesthesiaLog: [],
      soapNotes: [],
      consultHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.db.patients.push(newPatient);
    this.db.activePatientId = newPatient.id;
    this.persist(this.db);
    return newPatient;
  }

  public updatePatient(id: string, updates: Partial<PatientRecord>): PatientRecord {
    const index = this.db.patients.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Patient '${id}' not found`);
    }

    const current = this.db.patients[index];
    const updated: PatientRecord = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.db.patients[index] = updated;
    this.persist(this.db);
    return updated;
  }

  public deletePatient(id: string): boolean {
    if (this.db.patients.length <= 1) {
      throw new Error('Cannot delete the only remaining patient record in the database.');
    }
    const filtered = this.db.patients.filter(p => p.id !== id);
    if (filtered.length === this.db.patients.length) return false;

    this.db.patients = filtered;
    if (this.db.activePatientId === id) {
      this.db.activePatientId = this.db.patients[0].id;
    }
    this.persist(this.db);
    return true;
  }

  public updateToothForActivePatient(toothId: number, updates: Partial<ToothInfo>): ToothInfo {
    const patient = this.getActivePatient();
    const tooth = patient.teeth.find(t => t.id === Number(toothId));
    if (!tooth) {
      throw new Error(`Tooth #${toothId} not found for patient ${patient.name}`);
    }

    if (updates.status !== undefined) tooth.status = updates.status;
    if (updates.notes !== undefined) tooth.notes = updates.notes;
    if (updates.surfaces !== undefined) tooth.surfaces = updates.surfaces;

    patient.updatedAt = new Date().toISOString();
    this.persist(this.db);
    return tooth;
  }

  public resetOdontogramForActivePatient(): ToothInfo[] {
    const patient = this.getActivePatient();
    patient.teeth = createPatientTeeth();
    patient.updatedAt = new Date().toISOString();
    this.persist(this.db);
    return patient.teeth;
  }

  public logAnesthesiaForActivePatient(logEntry: {
    drugId: string;
    drugName: string;
    carpules: number;
    mg: number;
    epiMg: number;
    site: string;
    notes?: string;
  }) {
    const patient = this.getActivePatient();
    const id = `anes_${Date.now()}`;
    const entry = {
      id,
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    patient.anesthesiaLog.push(entry);
    patient.deliveredCarpules = Math.round((patient.deliveredCarpules + logEntry.carpules) * 10) / 10;
    patient.selectedDrugId = logEntry.drugId;
    patient.updatedAt = new Date().toISOString();
    this.persist(this.db);
    return { patient, entry };
  }

  public addSoapNoteForActivePatient(note: {
    procedure: string;
    toothId?: number | string;
    anesthesiaUsed: string;
    materialsUsed?: string;
    content: string;
    cdtCodes: string[];
    author?: string;
  }) {
    const patient = this.getActivePatient();
    const id = `soap_${Date.now()}`;
    const newNote = {
      id,
      timestamp: new Date().toISOString(),
      procedure: note.procedure,
      toothId: note.toothId,
      anesthesiaUsed: note.anesthesiaUsed,
      materialsUsed: note.materialsUsed,
      content: note.content,
      cdtCodes: note.cdtCodes || [],
      author: note.author || 'Attending Doctor'
    };
    patient.soapNotes.unshift(newNote);
    patient.updatedAt = new Date().toISOString();
    this.persist(this.db);
    return newNote;
  }

  public getDatabaseRaw(): DentalDatabase {
    return this.db;
  }

  public importDatabase(raw: DentalDatabase): void {
    if (!raw.patients || !Array.isArray(raw.patients) || raw.patients.length === 0) {
      throw new Error('Invalid database format. Must contain a patients array.');
    }
    this.db = raw;
    this.persist(this.db);
  }
}

export const patientDb = new PatientDatabaseManager();
