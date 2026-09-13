export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SafetyAlert {
  severity: AlertSeverity;
  message: string;
}

interface MedicationLike {
  name: string;
  active: boolean;
}

const ANTICOAGULANTS = [
  'warfarin', 'coumadin', 'apixaban', 'eliquis', 'rivaroxaban', 'xarelto',
  'dabigatran', 'pradaxa', 'edoxaban', 'savaysa', 'clopidogrel', 'plavix', 'aspirin'
];
const NSAIDS = ['ibuprofen', 'advil', 'motrin', 'naproxen', 'aleve', 'diclofenac', 'ketorolac', 'toradol'];
const BISPHOSPHONATES = [
  'alendronate', 'fosamax', 'zoledronic', 'zometa', 'reclast',
  'risedronate', 'actonel', 'ibandronate', 'boniva', 'denosumab', 'prolia', 'xgeva'
];
const MAOIS = ['phenelzine', 'nardil', 'tranylcypromine', 'parnate', 'isocarboxazid', 'marplan', 'selegiline', 'emsam'];
const VASOCONSTRICTOR_TERMS = ['epinephrine', 'epi ', 'levonordefrin', 'adrenaline'];
const PENICILLIN_CLASS = ['penicillin', 'amoxicillin', 'amoxil', 'ampicillin', 'augmentin'];

const PROPHYLAXIS_KEYWORDS = [
  'prosthetic heart valve', 'artificial heart valve', 'mechanical valve',
  'history of infective endocarditis', 'prior endocarditis', 'previous endocarditis',
  'unrepaired congenital heart disease', 'congenital heart disease',
  'cardiac transplant', 'heart transplant'
];

function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some(n => lower.includes(n));
}

/**
 * Rule-based screen for a small set of well-established, high-stakes dental
 * drug interactions. This is a chairside safety net, not a substitute for a
 * pharmacist/prescriber review of the patient's full medication list.
 */
export function checkDrugInteractions(
  medications: MedicationLike[],
  plannedDrugs: string[] = [],
  language: 'en' | 'fr' = 'en'
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const activeMedText = medications.filter(m => m.active).map(m => m.name.toLowerCase()).join(' | ');
  const plannedText = plannedDrugs.map(d => d.toLowerCase()).join(' | ');
  const combinedText = `${activeMedText} | ${plannedText}`;
  const isFr = language === 'fr';

  if (containsAny(activeMedText, ANTICOAGULANTS) && containsAny(combinedText, NSAIDS)) {
    alerts.push({
      severity: 'critical',
      message: isFr
        ? 'Le patient est sous anticoagulant/antiagrégant et une exposition aux AINS (actuelle ou prévue) augmente le risque hémorragique. Privilégier le paracétamol pour l\'analgésie et confirmer avec le prescripteur avant tout acte invasif.'
        : 'Patient is on an anticoagulant/antiplatelet and NSAID use (current or planned) increases bleeding risk. Consider acetaminophen for analgesia and confirm with the prescriber before invasive procedures.'
    });
  }

  if (containsAny(activeMedText, BISPHOSPHONATES)) {
    alerts.push({
      severity: 'critical',
      message: isFr
        ? 'Le patient a des antécédents de traitement antirésorptif (bisphosphonate/dénosumab). Risque élevé d\'ostéonécrose (MRONJ) lors d\'extractions, d\'implants ou de chirurgie osseuse — discuter d\'une fenêtre thérapeutique avec le prescripteur et privilégier une prise en charge conservatrice si possible.'
        : 'Patient has a history of antiresorptive therapy (bisphosphonate/denosumab). Elevated MRONJ risk with extractions, implants, or bone surgery — discuss drug holiday with the prescriber and favor conservative management where possible.'
    });
  }

  if (containsAny(activeMedText, MAOIS) && containsAny(plannedText, VASOCONSTRICTOR_TERMS)) {
    alerts.push({
      severity: 'warning',
      message: isFr
        ? 'Le patient est sous IMAO. Les anesthésiques contenant un vasoconstricteur comportent un risque théorique de crise hypertensive — utiliser la dose minimale efficace d\'épinéphrine et surveiller les constantes.'
        : 'Patient is on an MAOI. Vasoconstrictor-containing anesthetics carry a theoretical hypertensive crisis risk — use the minimum effective epinephrine dose and monitor vitals.'
    });
  }

  return alerts;
}

/**
 * Checks a single planned drug against the patient's recorded allergies.
 * Currently covers the penicillin-class cross-reactivity case, the most
 * common real-world prescribing error in dental practice.
 */
export function checkAllergyConflict(allergies: string, drugName: string, language: 'en' | 'fr' = 'en'): SafetyAlert | null {
  const allergyText = (allergies || '').toLowerCase();
  const drug = (drugName || '').toLowerCase();
  if (PENICILLIN_CLASS.some(p => drug.includes(p)) && allergyText.includes('penicillin')) {
    return {
      severity: 'critical',
      message: language === 'fr'
        ? `Le patient a une allergie documentée à la pénicilline — ${drugName} est contre-indiqué. Envisager la clindamycine ou l'azithromycine à la place.`
        : `Patient has a documented penicillin allergy — ${drugName} is contraindicated. Consider clindamycin or azithromycin instead.`
    };
  }
  return null;
}

/**
 * Flags medical-history phrases associated with AHA antibiotic prophylaxis
 * guidance. This is a prompt for the clinician to review, not an automatic
 * determination — prophylaxis decisions require professional judgment.
 */
export function suggestProphylaxisReview(medicalAlerts: string): string[] {
  const text = (medicalAlerts || '').toLowerCase();
  return PROPHYLAXIS_KEYWORDS.filter(k => text.includes(k));
}

/**
 * Adds a number of months to an ISO date string, clamping the day-of-month
 * so e.g. Jan 31 + 1 month lands on Feb 28/29 instead of overflowing into March.
 */
export function addMonthsToDate(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  const targetMonth = date.getMonth() + months;
  const result = new Date(date.getFullYear(), targetMonth, 1);
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), daysInTargetMonth));
  result.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  return result.toISOString();
}
