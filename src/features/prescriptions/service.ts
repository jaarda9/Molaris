import type { DB } from '../../db/connection.js';
import type { PatientRecord } from '../../repositories/patients.js';
import {
  DrugRepository,
  PrescriptionRepository,
  type Prescription,
  type PrescriptionItemInput,
  type PrescriptionLanguage
} from './repository.js';
import { checkPrescriptionSafety, type PrescriptionSafetyAlert } from './safety.js';

export type PrescribingPatient = Pick<PatientRecord, 'id' | 'name' | 'age' | 'allergies' | 'medications'>;

export interface IssueRequest {
  language?: PrescriptionLanguage;
  notes?: string | null;
  items: PrescriptionItemInput[];
  /** The dentist ticked "Je confirme la prescription malgré l'alerte". */
  acknowledgeCriticalAlerts?: boolean;
  renewedFromId?: string | null;
  /** Language of the alert messages. */
  uiLanguage?: 'en' | 'fr';
}

export type IssueResult =
  | { status: 'blocked'; alerts: PrescriptionSafetyAlert[] }
  | { status: 'issued'; prescription: Prescription; alerts: PrescriptionSafetyAlert[] };

export class PrescriptionInputError extends Error {}

/**
 * Issues a prescription after the server-side safety check. A critical alert
 * blocks issuing unless the request explicitly acknowledges it; the override and
 * the alerts shown are recorded on the (immutable) prescription.
 */
export function issuePrescription(db: DB, patient: PrescribingPatient, request: IssueRequest): IssueResult {
  if (request.items.length === 0) throw new PrescriptionInputError('A prescription needs at least one line');

  const drugs = new DrugRepository(db);
  for (const item of request.items) {
    if (item.drugId && !drugs.get(item.drugId)) throw new PrescriptionInputError(`Unknown drug '${item.drugId}'`);
  }
  const prescriptions = new PrescriptionRepository(db);
  if (request.renewedFromId) {
    const original = prescriptions.get(request.renewedFromId);
    if (!original || original.patientId !== patient.id) {
      throw new PrescriptionInputError('The renewed prescription does not belong to this patient');
    }
  }

  const { alerts, hasCritical } = checkPrescriptionSafety(patient, request.items, request.uiLanguage ?? 'fr');
  if (hasCritical && request.acknowledgeCriticalAlerts !== true) return { status: 'blocked', alerts };

  const prescription = prescriptions.create({
    patientId: patient.id,
    patientName: patient.name,
    patientAge: Number.isFinite(patient.age) ? patient.age : null,
    language: request.language ?? 'fr',
    notes: request.notes,
    renewedFromId: request.renewedFromId ?? null,
    criticalAlertsOverridden: hasCritical,
    safetyAlerts: alerts,
    items: request.items
  });
  return { status: 'issued', prescription, alerts };
}

/** The lines of an existing prescription, ready to be issued again ("Renouveler"). */
export function renewalItems(original: Prescription): PrescriptionItemInput[] {
  return original.items.map(item => ({
    drugId: item.drugId,
    drugLabel: item.drugLabel,
    brand: item.brand,
    form: item.form,
    strength: item.strength,
    dosage: item.dosage,
    duration: item.duration,
    quantity: item.quantity,
    instructionsAr: item.instructionsAr
  }));
}
