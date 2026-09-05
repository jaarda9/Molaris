import fs from 'fs';
import path from 'path';

export interface DoctorPreferences {
  doctorName: string;
  clinicName: string;
  numberingSystem: 'universal' | 'fdi';
  bondingSystem: string;
  compositeSystem: string;
  rotarySystem: string;
  implantSystem: string;
  preferredAnesthetic: string;
  voiceFeedbackEnabled: boolean;
  notes: string;
}

export interface ClinicalMemoryState {
  preferences: DoctorPreferences;
  activePatient: {
    chartId: string;
    chiefComplaint: string;
    medicalAlerts: string;
    asaStatus: string;
    weightKg: number;
    cardiacRisk: boolean;
  };
  caseHistory: Array<{
    timestamp: string;
    toothNumber?: number;
    procedure: string;
    notes: string;
  }>;
}

const MEMORY_FILE = path.join(process.cwd(), 'clinical-memory.json');

const DEFAULT_MEMORY: ClinicalMemoryState = {
  preferences: {
    doctorName: 'Dr. Practitioner',
    clinicName: 'Advanced Dental & Oral Surgery Clinic',
    numberingSystem: 'universal',
    bondingSystem: 'Universal Adhesive (Selective-Etch protocol)',
    compositeSystem: 'Nano-hybrid composite (Filtek Supreme / Harmonize)',
    rotarySystem: 'WaveOne Gold & ProTaper Ultimate',
    implantSystem: 'Straumann BLX & Nobel Parallel CC',
    preferredAnesthetic: 'Articaine 4% 1:100k (Infiltration) / Lidocaine 2% 1:100k (Blocks)',
    voiceFeedbackEnabled: true,
    notes: 'Prioritize minimally invasive biomimetic protocols and strict rubber dam isolation.'
  },
  activePatient: {
    chartId: 'PT-2026-084',
    chiefComplaint: 'Throbbing ache lower right molar on cold and biting for 3 days',
    medicalAlerts: 'Controlled hypertension; No known drug allergies (NKDA)',
    asaStatus: 'ASA II',
    weightKg: 72,
    cardiacRisk: false
  },
  caseHistory: [
    {
      timestamp: new Date().toISOString(),
      toothNumber: 30,
      procedure: 'Emergency Diagnostic Triage',
      notes: 'Cold test lingering >20s, percussion positive (+), periapical radiolucency widening.'
    }
  ]
};

export function loadMemory(): ClinicalMemoryState {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Could not read clinical memory file, using defaults', err);
  }
  return DEFAULT_MEMORY;
}

export function saveMemory(memory: ClinicalMemoryState): void {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write clinical memory file', err);
  }
}
