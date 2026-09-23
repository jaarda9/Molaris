import fs from 'fs';
import path from 'path';
import { getDb } from '../db/connection.js';
import { getJsonSetting, setJsonSetting } from '../db/settings.js';

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
}

const SETTINGS_KEY = 'doctor.memory';
const LEGACY_JSON_FILE = path.join(process.cwd(), 'clinical-memory.json');

const DEFAULT_MEMORY: ClinicalMemoryState = {
  preferences: {
    doctorName: 'Dr. Praticien',
    clinicName: 'Cabinet Dentaire',
    numberingSystem: 'fdi',
    bondingSystem: 'Adhésif universel (mordançage sélectif)',
    compositeSystem: 'Composite nano-hybride',
    rotarySystem: 'Instrumentation rotative NiTi',
    implantSystem: 'Implants bone level',
    preferredAnesthetic: 'Articaïne 4% 1/100 000 (infiltration) / Lidocaïne 2% 1/100 000 (tronculaire)',
    voiceFeedbackEnabled: true,
    notes: 'Privilégier les protocoles a minima et l\'isolation sous digue.'
  }
};

function migrateLegacyJson(): ClinicalMemoryState | undefined {
  if (!fs.existsSync(LEGACY_JSON_FILE)) return undefined;
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON_FILE, 'utf-8'));
    const memory: ClinicalMemoryState = {
      preferences: { ...DEFAULT_MEMORY.preferences, ...(legacy.preferences || {}) }
    };
    setJsonSetting(getDb(), SETTINGS_KEY, memory);
    fs.renameSync(LEGACY_JSON_FILE, `${LEGACY_JSON_FILE}.migrated`);
    return memory;
  } catch (err) {
    console.warn('[Preferences] Could not migrate clinical-memory.json, using defaults:', err);
    return undefined;
  }
}

export function loadMemory(): ClinicalMemoryState {
  const stored = getJsonSetting<ClinicalMemoryState>(getDb(), SETTINGS_KEY) ?? migrateLegacyJson();
  if (!stored) return structuredClone(DEFAULT_MEMORY);
  return { preferences: { ...DEFAULT_MEMORY.preferences, ...stored.preferences } };
}

export function saveMemory(memory: ClinicalMemoryState): void {
  setJsonSetting(getDb(), SETTINGS_KEY, { preferences: memory.preferences });
}
