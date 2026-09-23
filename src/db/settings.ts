import type { DB } from './connection.js';

export function getSetting(db: DB, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(db: DB, key: string, value: string): void {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function getJsonSetting<T>(db: DB, key: string): T | undefined {
  const raw = getSetting(db, key);
  return raw === undefined ? undefined : (JSON.parse(raw) as T);
}

export function setJsonSetting(db: DB, key: string, value: unknown): void {
  setSetting(db, key, JSON.stringify(value));
}

/** Letterhead identity printed on quotes, receipts and prescriptions. */
export interface ClinicIdentity {
  clinicName: string;
  doctorName: string;
  specialty: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  fiscalId: string;        // matricule fiscal
  orderNumber: string;     // n° d'inscription au Conseil de l'Ordre
  cnamCode: string;        // code conventionnel CNAM, if conventionné
}

const CLINIC_IDENTITY_KEY = 'clinic.identity';

export const EMPTY_CLINIC_IDENTITY: ClinicIdentity = {
  clinicName: '',
  doctorName: '',
  specialty: 'Médecin Dentiste',
  address: '',
  city: '',
  phone: '',
  email: '',
  fiscalId: '',
  orderNumber: '',
  cnamCode: ''
};

export function getClinicIdentity(db: DB): ClinicIdentity {
  return { ...EMPTY_CLINIC_IDENTITY, ...(getJsonSetting<Partial<ClinicIdentity>>(db, CLINIC_IDENTITY_KEY) || {}) };
}

export function setClinicIdentity(db: DB, updates: Partial<ClinicIdentity>): ClinicIdentity {
  const next = { ...getClinicIdentity(db) };
  for (const key of Object.keys(EMPTY_CLINIC_IDENTITY) as Array<keyof ClinicIdentity>) {
    if (typeof updates[key] === 'string') next[key] = updates[key]!.trim();
  }
  setJsonSetting(db, CLINIC_IDENTITY_KEY, next);
  return next;
}
