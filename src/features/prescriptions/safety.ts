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
  source: 'allergy' | 'interaction' | 'patient' | 'duplicate' | 'stewardship';
  /** The prescription line that triggered it (allergy alerts only). */
  drugLabel?: string;
}

export type SafetyPatient = Pick<PatientRecord, 'allergies' | 'medications'> & Partial<Pick<PatientRecord, 'age' | 'weightKg'>>;

// --- Antibiotic stewardship -------------------------------------------------------------
// Main reference (Tunisia follows the French guidance; no Tunisian dental guideline exists):
// HAS, « Prescription des antibiotiques en pratique bucco-dentaire », juillet 2026 (tableaux 14
// et 15). Complement: WHO AWaRe antibiotic book 2022 for the « Watch » classification.
// See docs/medical/references-cliniques-logiciel.md.
const plainName = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const ANTIBIOTIC_TERMS = ['amoxicill', 'penicill', 'phenoxymethyl', 'clavulan', 'clindamycin', 'metronidazol', 'azithromycin',
  'clarithromycin', 'erythromycin', 'spiramycin', 'doxycyclin', 'tetracyclin', 'cefalexin', 'cefuroxim', 'cefadroxil',
  'cefixim', 'cefpodoxim', 'ciprofloxacin', 'levofloxacin', 'ofloxacin', 'pristinamycin', 'lincomycin'];
/** Antibiotics the WHO classes « Watch »; HAS keeps them for penicillin allergy. */
const WATCH_TERMS = ['azithromycin', 'clarithromycin'];
export const isAntibiotic = (name: string) => ANTIBIOTIC_TERMS.some(t => plainName(name).includes(t));

/** HAS 2026 (tableau 15): amoxicillin 50 mg/kg/day in 3 doses, not over 3 g/day — per-dose amount. */
function hasChildAmoxicillinDose(weightKg: number): number | null {
  if (!(weightKg > 0)) return null;
  return Math.round(Math.min(weightKg * 50, 3000) / 3);
}

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
        ? `Enfant de ${patient.age} ans${weight} : la liste des médicaments contient des dosages adultes. Écrire chaque dose selon le poids, avec une forme pédiatrique.`
        : `Child aged ${patient.age}${weight}: the drug list holds adult strengths. Write each dose for the weight, with a paediatric form.`
    });
  }

  // HAS 2026: an antibiotic only complements a local procedure, in defined situations.
  const fr = language === 'fr';
  const antibiotics = planned.filter(isAntibiotic);
  if (antibiotics.length) {
    alerts.push({
      severity: 'info',
      source: 'stewardship',
      message: fr
        ? 'Antibiotique (HAS 2026) : toujours en complément d’un geste local (drainage, traitement de la cause) ; les douleurs dentaires, majoritairement inflammatoires, se traitent par le geste et des antalgiques. Indiqué si patient à haut risque d’endocardite infectieuse ou à risque infectieux augmenté, signes d’extension locale (suppuration), régionale (tuméfaction, trismus) ou générale (adénopathie, fièvre), ou si le geste ne peut pas être réalisé. Adulte, 1re intention : amoxicilline 1 g 3 fois par jour pendant 3 jours (prolonger de 2 jours si les symptômes persistent). Réévaluer à 3 jours (consultation ou téléphone).'
        : 'Antibiotic (HAS 2026): always alongside a local procedure (drainage, treating the cause); dental pain, mostly inflammatory, is treated by the procedure and analgesics. Indicated for patients at high risk of infective endocarditis or at increased infectious risk, signs of local (suppuration), regional (swelling, trismus) or systemic (lymphadenopathy, fever) spread, or if the procedure cannot be done. Adult first line: amoxicillin 1 g three times a day for 3 days (2 more days if symptoms persist). Reassess at 3 days (visit or phone).'
    });
  }
  const watch = antibiotics.filter(name => WATCH_TERMS.some(t => plainName(name).includes(t)));
  if (watch.length) {
    alerts.push({
      severity: 'warning',
      source: 'stewardship',
      message: fr
        ? `${watch.join(', ')} : alternative réservée à l’allergie avérée aux pénicillines, à une contre-indication ou à une rupture de stock (HAS 2026) ; antibiotique du groupe « Watch » de l’OMS (risque plus élevé de résistances). Sinon, l’amoxicilline reste le premier choix.`
        : `${watch.join(', ')}: an alternative for proven penicillin allergy, contraindication or stock-out (HAS 2026); WHO « Watch » group antibiotic (higher resistance risk). Otherwise amoxicillin remains the first choice.`
    });
  }
  const child = typeof patient.age === 'number' && patient.age < PEDIATRIC_AGE_LIMIT;
  if (child && patient.weightKg && antibiotics.some(name => plainName(name).includes('amoxicill') && !plainName(name).includes('clavulan'))) {
    const dose = hasChildAmoxicillinDose(patient.weightKg);
    if (dose) {
      const kg = fr ? String(patient.weightKg).replace('.', ',') : String(patient.weightKg);
      alerts.push({
        severity: 'info',
        source: 'stewardship',
        message: fr
          ? `Repère HAS 2026 pour l’amoxicilline chez l’enfant : 50 mg/kg/jour en 3 prises, sans dépasser 3 g/jour, pendant 3 jours — pour ${kg} kg : ${dose} mg 3 fois par jour.`
          : `HAS 2026 reference for amoxicillin in children: 50 mg/kg/day in 3 doses, not over 3 g/day, for 3 days — for ${kg} kg: ${dose} mg three times a day.`
      });
    }
  }
  if (child && (patient.age as number) < 6 && antibiotics.length) {
    alerts.push({
      severity: 'warning',
      source: 'stewardship',
      message: fr
        ? 'Enfant de moins de 6 ans : pas de comprimés ni de gélules à avaler (HAS 2026) ; prescrire une forme buvable.'
        : 'Child under 6: no tablets or capsules to swallow (HAS 2026); prescribe an oral liquid form.'
    });
  }

  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return { alerts, hasCritical: alerts.some(a => a.severity === 'critical') };
}
