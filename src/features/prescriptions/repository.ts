import type { DB } from '../../db/connection.js';
import { nextDocumentNumber } from '../../db/counters.js';
import { newId, nowIso } from '../../db/ids.js';
import type { PrescriptionSafetyAlert } from './safety.js';

export const DRUG_CATEGORIES = ['antibiotique', 'antalgique', 'AINS', 'antiseptique', 'antifongique', 'corticoïde', 'autre'] as const;
export type DrugCategory = typeof DRUG_CATEGORIES[number];

export const PRESCRIPTION_LANGUAGES = ['fr', 'ar', 'fr_ar'] as const;
export type PrescriptionLanguage = typeof PRESCRIPTION_LANGUAGES[number];

// ---------------------------------------------------------------------------
// Drug catalog
// ---------------------------------------------------------------------------

export interface Drug {
  id: string;
  dci: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  defaultDosage: string | null;
  defaultDuration: string | null;
  defaultInstructionsAr: string | null;
  category: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DrugInput {
  dci: string;
  brand?: string | null;
  form?: string | null;
  strength?: string | null;
  defaultDosage?: string | null;
  defaultDuration?: string | null;
  defaultInstructionsAr?: string | null;
  category?: DrugCategory | null;
  active?: boolean;
}

interface DrugRow {
  id: string;
  dci: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  default_dosage: string | null;
  default_duration: string | null;
  default_instructions_ar: string | null;
  category: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

function toDrug(row: DrugRow): Drug {
  return {
    id: row.id,
    dci: row.dci,
    brand: row.brand,
    form: row.form,
    strength: row.strength,
    defaultDosage: row.default_dosage,
    defaultDuration: row.default_duration,
    defaultInstructionsAr: row.default_instructions_ar,
    category: row.category,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const emptyToNull = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
};

export class DrugRepository {
  constructor(private db: DB) {}

  list(options: { includeInactive?: boolean } = {}): Drug[] {
    const rows = this.db.prepare(`
      SELECT * FROM drugs
      ${options.includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY category, dci
    `).all() as DrugRow[];
    return rows.map(toDrug);
  }

  get(id: string): Drug | null {
    const row = this.db.prepare('SELECT * FROM drugs WHERE id = ?').get(id) as DrugRow | undefined;
    return row ? toDrug(row) : null;
  }

  create(input: DrugInput, id: string = newId('drug')): Drug {
    const now = nowIso();
    this.db.prepare(`
      INSERT INTO drugs (id, dci, brand, form, strength, default_dosage, default_duration,
                         default_instructions_ar, category, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, input.dci.trim(), emptyToNull(input.brand), emptyToNull(input.form), emptyToNull(input.strength),
      emptyToNull(input.defaultDosage), emptyToNull(input.defaultDuration), emptyToNull(input.defaultInstructionsAr),
      input.category ?? 'autre', input.active === false ? 0 : 1, now, now
    );
    return this.get(id)!;
  }

  /** Partial update; `active: false` deactivates (drugs are never deleted: past prescriptions reference them). */
  update(id: string, input: Partial<DrugInput>): Drug | null {
    const existing = this.get(id);
    if (!existing) return null;
    const pick = (key: 'brand' | 'form' | 'strength' | 'defaultDosage' | 'defaultDuration' | 'defaultInstructionsAr') =>
      key in input ? emptyToNull(input[key]) : existing[key];
    this.db.prepare(`
      UPDATE drugs SET dci = ?, brand = ?, form = ?, strength = ?, default_dosage = ?, default_duration = ?,
                       default_instructions_ar = ?, category = ?, active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.dci !== undefined ? input.dci.trim() : existing.dci,
      pick('brand'),
      pick('form'),
      pick('strength'),
      pick('defaultDosage'),
      pick('defaultDuration'),
      pick('defaultInstructionsAr'),
      input.category !== undefined ? (input.category ?? 'autre') : existing.category,
      input.active !== undefined ? (input.active ? 1 : 0) : (existing.active ? 1 : 0),
      nowIso(),
      id
    );
    return this.get(id);
  }
}

// ---------------------------------------------------------------------------
// Prescriptions — immutable once issued: there is deliberately no update or
// delete method, and triggers (migration 5) reject UPDATE/DELETE in SQL.
// ---------------------------------------------------------------------------

export interface PrescriptionItemInput {
  drugId?: string | null;
  drugLabel: string;        // DCI (or free text)
  brand?: string | null;
  form?: string | null;
  strength?: string | null;
  dosage: string;           // posology, in French
  duration?: string | null;
  quantity?: string | null;
  instructionsAr?: string | null;
}

export interface PrescriptionItem {
  id: string;
  drugId: string | null;
  drugLabel: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  dosage: string;
  duration: string | null;
  quantity: string | null;
  instructionsAr: string | null;
  position: number;
}

export interface Prescription {
  id: string;
  number: string;
  patientId: string;
  patientName: string | null;
  patientAge: number | null;
  patientCnamId: string | null;
  patientCnamQuality: string | null;
  issuedAt: string;
  language: PrescriptionLanguage;
  notes: string | null;
  renewedFromId: string | null;
  criticalAlertsOverridden: boolean;
  safetyAlerts: PrescriptionSafetyAlert[];
  createdAt: string;
  items: PrescriptionItem[];
}

export interface NewPrescription {
  patientId: string;
  patientName: string;
  patientAge: number | null;
  patientCnamId?: string | null;
  patientCnamQuality?: string | null;
  language: PrescriptionLanguage;
  notes?: string | null;
  renewedFromId?: string | null;
  criticalAlertsOverridden: boolean;
  safetyAlerts: PrescriptionSafetyAlert[];
  items: PrescriptionItemInput[];
}

interface PrescriptionRow {
  id: string;
  number: string;
  patient_id: string;
  patient_name: string | null;
  patient_age: number | null;
  patient_cnam_id: string | null;
  patient_cnam_quality: string | null;
  issued_at: string;
  language: PrescriptionLanguage;
  notes: string | null;
  renewed_from_id: string | null;
  critical_alerts_overridden: number;
  safety_alerts: string | null;
  created_at: string;
}

interface PrescriptionItemRow {
  id: string;
  prescription_id: string;
  drug_id: string | null;
  drug_label: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  dosage: string;
  duration: string | null;
  quantity: string | null;
  instructions_ar: string | null;
  position: number;
}

function toItem(row: PrescriptionItemRow): PrescriptionItem {
  return {
    id: row.id,
    drugId: row.drug_id,
    drugLabel: row.drug_label,
    brand: row.brand,
    form: row.form,
    strength: row.strength,
    dosage: row.dosage,
    duration: row.duration,
    quantity: row.quantity,
    instructionsAr: row.instructions_ar,
    position: row.position
  };
}

function parseAlerts(json: string | null): PrescriptionSafetyAlert[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class PrescriptionRepository {
  constructor(private db: DB) {}

  /** Inserts the prescription and its lines; the ORD number is allocated in the same transaction. */
  create(input: NewPrescription, issuedAt: Date = new Date()): Prescription {
    const id = newId('rx');
    this.db.transaction(() => {
      const now = issuedAt.toISOString();
      const number = nextDocumentNumber(this.db, 'ORD', issuedAt);
      this.db.prepare(`
        INSERT INTO prescriptions (id, number, patient_id, patient_name, patient_age, patient_cnam_id, patient_cnam_quality,
                                   issued_at, language, notes, renewed_from_id, critical_alerts_overridden,
                                   safety_alerts, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, number, input.patientId, input.patientName, input.patientAge,
        emptyToNull(input.patientCnamId), emptyToNull(input.patientCnamQuality), now, input.language,
        emptyToNull(input.notes), input.renewedFromId ?? null, input.criticalAlertsOverridden ? 1 : 0,
        JSON.stringify(input.safetyAlerts), nowIso()
      );
      const insertItem = this.db.prepare(`
        INSERT INTO prescription_items (id, prescription_id, drug_id, drug_label, brand, form, strength,
                                        dosage, duration, quantity, instructions_ar, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      input.items.forEach((item, position) => {
        insertItem.run(
          newId('rxi'), id, item.drugId ?? null, item.drugLabel.trim(), emptyToNull(item.brand),
          emptyToNull(item.form), emptyToNull(item.strength), item.dosage.trim(), emptyToNull(item.duration),
          emptyToNull(item.quantity), emptyToNull(item.instructionsAr), position
        );
      });
    })();
    return this.get(id)!;
  }

  get(id: string): Prescription | null {
    const row = this.db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id) as PrescriptionRow | undefined;
    return row ? this.hydrate([row])[0] : null;
  }

  /** A patient's prescriptions, newest first. */
  listForPatient(patientId: string): Prescription[] {
    const rows = this.db.prepare(`
      SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY issued_at DESC, number DESC
    `).all(patientId) as PrescriptionRow[];
    return this.hydrate(rows);
  }

  private hydrate(rows: PrescriptionRow[]): Prescription[] {
    const itemsStmt = this.db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ? ORDER BY position');
    return rows.map(row => ({
      id: row.id,
      number: row.number,
      patientId: row.patient_id,
      patientName: row.patient_name,
      patientAge: row.patient_age,
      patientCnamId: row.patient_cnam_id,
      patientCnamQuality: row.patient_cnam_quality,
      issuedAt: row.issued_at,
      language: row.language,
      notes: row.notes,
      renewedFromId: row.renewed_from_id,
      criticalAlertsOverridden: row.critical_alerts_overridden === 1,
      safetyAlerts: parseAlerts(row.safety_alerts),
      createdAt: row.created_at,
      items: (itemsStmt.all(row.id) as PrescriptionItemRow[]).map(toItem)
    }));
  }
}
