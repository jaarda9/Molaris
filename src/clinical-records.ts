import { ToothInfo, DEFAULT_TEETH } from './dental-data.js';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedFor?: string;
  active: boolean;
  addedAt: string;
}

export interface PerioSite {
  pocketDepth: number; // mm
  recession: number; // mm
  bleeding: boolean;
  suppuration: boolean;
}

function defaultSite(): PerioSite {
  return { pocketDepth: 2, recession: 0, bleeding: false, suppuration: false };
}

export interface ToothPerioEntry {
  toothId: number; // Universal 1-32
  mobility: 0 | 1 | 2 | 3;
  furcation: 0 | 1 | 2 | 3 | null; // only meaningful for molars
  sites: {
    mesiobuccal: PerioSite;
    buccal: PerioSite;
    distobuccal: PerioSite;
    distolingual: PerioSite;
    lingual: PerioSite;
    mesiolingual: PerioSite;
  };
}

export interface PerioChartSnapshot {
  id: string;
  date: string;
  teeth: ToothPerioEntry[];
  notes?: string;
}

export function createDefaultPerioTeeth(): ToothPerioEntry[] {
  return DEFAULT_TEETH.map((t: ToothInfo) => ({
    toothId: t.id,
    mobility: 0 as const,
    furcation: t.type === 'molar' ? (0 as const) : null,
    sites: {
      mesiobuccal: defaultSite(),
      buccal: defaultSite(),
      distobuccal: defaultSite(),
      distolingual: defaultSite(),
      lingual: defaultSite(),
      mesiolingual: defaultSite()
    }
  }));
}

export type TreatmentPriority = 'urgent' | 'high' | 'routine' | 'elective';
export type TreatmentStatus = 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'declined';

export interface TreatmentPlanItem {
  id: string;
  toothId?: number;
  procedure: string;
  cdtCode?: string;
  priority: TreatmentPriority;
  estimatedCost?: number;
  status: TreatmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  procedure: string;
  consentText: string;
  signatureDataUrl?: string;
  signedAt: string;
}

export interface ClinicalImageRecord {
  id: string;
  filename: string;
  mimeType: string;
  toothId?: number;
  query?: string;
  analysis?: string;
  modelUsed?: string;
  uploadedAt: string;
}

export type LabCaseStatus = 'planned' | 'sent' | 'in_lab' | 'returned' | 'seated' | 'remake';

export interface LabCase {
  id: string;
  toothId?: number;
  caseType: string;
  material?: string;
  shade?: string;
  marginDesign?: string;
  occlusalNotes?: string;
  labName?: string;
  sentDate?: string;
  dueDate?: string;
  returnedDate?: string;
  seatedDate?: string;
  status: LabCaseStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecallInfo {
  intervalMonths: number;
  lastVisitDate?: string;
  nextDueDate?: string;
}

export function createDefaultRecall(): RecallInfo {
  return { intervalMonths: 6 };
}

export interface SoapAddendum {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}
