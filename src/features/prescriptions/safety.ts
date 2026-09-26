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

// --- Antibiotic stewardship: WHO AWaRe antibiotic book (2022), « Oral and dental infections » ---
const plainName = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const ANTIBIOTIC_TERMS = ['amoxicill', 'penicill', 'phenoxymethyl', 'clavulan', 'clindamycin', 'metronidazol', 'azithromycin',
  'clarithromycin', 'erythromycin', 'spiramycin', 'doxycyclin', 'tetracyclin', 'cefalexin', 'cefuroxim', 'cefadroxil',
  'cefixim', 'cefpodoxim', 'ciprofloxacin', 'levofloxacin', 'ofloxacin', 'pristinamycin', 'lincomycin'];
/** Antibiotics the WHO classes « Watch » (higher resistance risk) that dentists commonly prescribe. */
const WATCH_TERMS = ['azithromycin', 'clarithromycin'];
export const isAntibiotic = (name: string) => ANTIBIOTIC_TERMS.some(t => plainName(name).includes(t));

/** WHO AWaRe amoxicillin weight bands for children (80–90 mg/kg/day). */
function whoChildAmoxicillin(weightKg: number, fr: boolean): string | null {
  if (!(weightKg >= 3)) return null;
  const bands: Array<[number, string, string]> = [
    [6, '250 mg toutes les 12 h', '250 mg every 12 h'], [10, '375 mg toutes les 12 h', '375 mg every 12 h'],
    [15, '500 mg toutes les 12 h', '500 mg every 12 h'], [20, '750 mg toutes les 12 h', '750 mg every 12 h'],
    [Infinity, '500 mg toutes les 8 h ou 1 g toutes les 12 h', '500 mg every 8 h or 1 g every 12 h']
  ];
  const band = bands.find(([max]) => weightKg < max)!;
  return fr ? band[1] : band[2];
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

  // WHO AWaRe: most dental infections are treated by the dental procedure, not antibiotics.
  const fr = language === 'fr';
  const antibiotics = planned.filter(isAntibiotic);
  if (antibiotics.length) {
    alerts.push({
      severity: 'info',
      source: 'stewardship',
      message: fr
        ? 'Antibiotique (OMS, guide AWaRe 2022) : non indiqué pour la douleur, la pulpite ni avant un acte courant ; le traitement est le geste dentaire (drainage, extraction). À réserver aux infections qui s’étendent avec signes généraux (tuméfaction faciale, trismus, fièvre ≥ 38 °C), à l’immunodépression sévère ou au diabète non équilibré. Durée : 3 jours si la cause est traitée, sinon 5 jours ; premier choix amoxicilline ou phénoxyméthylpénicilline.'
        : 'Antibiotic (WHO AWaRe book 2022): not indicated for pain, pulpitis or before routine procedures; the treatment is the dental procedure (drainage, extraction). Keep for spreading infections with systemic signs (facial swelling, trismus, fever ≥ 38 °C), severe immunosuppression or uncontrolled diabetes. Duration: 3 days if the source is treated, otherwise 5 days; first choice amoxicillin or phenoxymethylpenicillin.'
    });
  }
  const watch = antibiotics.filter(name => WATCH_TERMS.some(t => plainName(name).includes(t)));
  if (watch.length) {
    alerts.push({
      severity: 'warning',
      source: 'stewardship',
      message: fr
        ? `${watch.join(', ')} : antibiotique du groupe « Watch » de l’OMS (risque plus élevé de résistances). Pour une infection dentaire, les antibiotiques du groupe « Access » (amoxicilline, phénoxyméthylpénicilline) sont le premier choix.`
        : `${watch.join(', ')}: WHO « Watch » group antibiotic (higher resistance risk). For dental infections, « Access » antibiotics (amoxicillin, phenoxymethylpenicillin) are the first choice.`
    });
  }
  if (typeof patient.age === 'number' && patient.age < PEDIATRIC_AGE_LIMIT && patient.weightKg
    && antibiotics.some(name => plainName(name).includes('amoxicill') && !plainName(name).includes('clavulan'))) {
    const band = whoChildAmoxicillin(patient.weightKg, fr);
    if (band) {
      alerts.push({
        severity: 'info',
        source: 'stewardship',
        message: fr
          ? `Repère OMS (AWaRe 2022) pour l’amoxicilline chez l’enfant : 80–90 mg/kg/jour, soit pour ${String(patient.weightKg).replace('.', ',')} kg : ${band}.`
          : `WHO reference (AWaRe 2022) for amoxicillin in children: 80–90 mg/kg/day, i.e. for ${patient.weightKg} kg: ${band}.`
      });
    }
  }

  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return { alerts, hasCritical: alerts.some(a => a.severity === 'critical') };
}
