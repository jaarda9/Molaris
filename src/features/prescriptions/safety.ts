import { checkAllergyConflict, checkDrugInteractions, type AlertSeverity } from '../../domain/clinical-safety.js';
import type { PatientRecord } from '../../repositories/patients.js';

/** A clinical-safety alert raised while writing a prescription. */
export interface PrescriptionSafetyAlert {
  severity: AlertSeverity;
  message: string;
  /** 'patient' = a standing alert about the patient that this prescription does not cause. */
  source: 'allergy' | 'interaction' | 'patient';
  /** The prescription line that triggered it (allergy alerts only). */
  drugLabel?: string;
}

export type SafetyPatient = Pick<PatientRecord, 'allergies' | 'medications'>;

export interface SafetyLine {
  drugLabel: string;
  brand?: string | null;
  strength?: string | null;
}

/** Text screened for a line: DCI + brand + strength, so "Amoxicilline 1 g" and brand names both match. */
function screenedName(line: SafetyLine): string {
  return [line.drugLabel, line.brand, line.strength].filter(Boolean).join(' ').trim();
}

/**
 * Runs the shared clinical-safety rules (src/domain/clinical-safety.ts) over a
 * planned prescription: allergy conflicts line by line, then interactions between
 * the patient's active medications and every planned drug.
 *
 * checkDrugInteractions also reports patient-level alerts that exist whatever is
 * prescribed (e.g. antiresorptive therapy / MRONJ, which matters for surgery, not for
 * a paracetamol prescription). Those are shown as warnings with source 'patient' and
 * never block: only alerts this prescription causes can require the override, so the
 * confirmation stays meaningful instead of becoming a reflex click.
 */
export function checkPrescriptionSafety(
  patient: SafetyPatient,
  lines: SafetyLine[],
  language: 'en' | 'fr' = 'fr'
): { alerts: PrescriptionSafetyAlert[]; hasCritical: boolean } {
  const alerts: PrescriptionSafetyAlert[] = [];
  const planned = lines.map(screenedName).filter(Boolean);

  for (const name of planned) {
    const alert = checkAllergyConflict(patient.allergies || '', name, language);
    if (alert) alerts.push({ ...alert, source: 'allergy', drugLabel: name });
  }
  const standing = new Set(checkDrugInteractions(patient.medications || [], [], language).map(a => a.message));
  for (const alert of checkDrugInteractions(patient.medications || [], planned, language)) {
    if (standing.has(alert.message)) {
      alerts.push({ ...alert, severity: alert.severity === 'critical' ? 'warning' : alert.severity, source: 'patient' });
    } else {
      alerts.push({ ...alert, source: 'interaction' });
    }
  }

  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return { alerts, hasCritical: alerts.some(a => a.severity === 'critical') };
}
