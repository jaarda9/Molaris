import { checkAllergyConflict, checkDrugInteractions, isNsaid, isParacetamol, type AlertSeverity } from '../../domain/clinical-safety.js';
import type { PatientRecord } from '../../repositories/patients.js';

/** A clinical-safety alert raised while writing a prescription. */
export interface PrescriptionSafetyAlert {
  severity: AlertSeverity;
  message: string;
  /**
   * 'patient' = a standing alert about the patient that this prescription does not cause;
   * 'duplicate' = two lines of the same class (two NSAIDs, paracetamol twice).
   */
  source: 'allergy' | 'interaction' | 'patient' | 'duplicate';
  /** The prescription line that triggered it (allergy alerts only). */
  drugLabel?: string;
}

export type SafetyPatient = Pick<PatientRecord, 'allergies' | 'medications'> & Partial<Pick<PatientRecord, 'age' | 'weightKg'>>;

/** Under this age the catalog's default (adult) doses must be adapted to the child's weight. */
export const PEDIATRIC_AGE_LIMIT = 15;

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

  // The same drug on two lines doubles the dose (often a line added twice by mistake).
  const byDrug = new Map<string, string>();
  for (const line of lines) {
    const key = line.drugLabel.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key) continue;
    if (byDrug.has(key)) {
      alerts.push({
        severity: 'critical',
        source: 'duplicate',
        message: language === 'fr'
          ? `${byDrug.get(key)} figure deux fois sur l'ordonnance : la dose serait doublée. Supprimez la ligne en double.`
          : `${byDrug.get(key)} appears twice on the prescription: the dose would be doubled. Remove the duplicate line.`
      });
      break;
    }
    byDrug.set(key, line.drugLabel);
  }

  const nsaids = planned.filter(isNsaid);
  if (nsaids.length >= 2) {
    alerts.push({
      severity: 'critical',
      source: 'duplicate',
      message: language === 'fr'
        ? `Deux AINS sur la même ordonnance (${nsaids.join(', ')}) : association déconseillée (toxicité digestive et rénale, sans gain antalgique). N'en garder qu'un.`
        : `Two NSAIDs on the same prescription (${nsaids.join(', ')}): combination not recommended (GI and renal toxicity, no added analgesia). Keep only one.`
    });
  }
  const paracetamol = planned.filter(isParacetamol);
  if (paracetamol.length >= 2) {
    alerts.push({
      severity: 'warning',
      source: 'duplicate',
      message: language === 'fr'
        ? `Paracétamol présent sur plusieurs lignes (${paracetamol.join(', ')}) : les doses s'additionnent, vérifier que le total journalier reste sous la dose maximale.`
        : `Paracetamol on several lines (${paracetamol.join(', ')}): doses add up, check the daily total stays under the maximum dose.`
    });
  }

  if (typeof patient.age === 'number' && patient.age < PEDIATRIC_AGE_LIMIT && planned.length > 0) {
    const weight = patient.weightKg ? ` (${patient.weightKg} kg)` : '';
    alerts.push({
      severity: 'warning',
      source: 'patient',
      message: language === 'fr'
        ? `Enfant de ${patient.age} ans${weight} : les posologies proposées par défaut sont des posologies adultes. Adapter chaque dose au poids et à la forme pédiatrique.`
        : `Child aged ${patient.age}${weight}: the default doses are adult doses. Adapt each dose to the weight and use a paediatric form.`
    });
  }

  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return { alerts, hasCritical: alerts.some(a => a.severity === 'critical') };
}
