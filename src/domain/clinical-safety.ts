export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SafetyAlert {
  severity: AlertSeverity;
  message: string;
}

interface MedicationLike {
  name: string;
  active: boolean;
}

// All terms are lowercase and accent-free; input text is normalized the same way
// (see normalize), so French spellings match: "Ibuprofène" -> "ibuprofene" ⊃ "ibuprofen".
// Stems ("alendron", "zoledron", "cillin") also catch French forms such as
// "acide alendronique". Brand names cover the Tunisian/French market.
const ANTICOAGULANTS = [
  'warfarin', 'coumadin', 'acenocoumarol', 'sintrom', 'fluindione', 'previscan',
  'apixaban', 'eliquis', 'rivaroxaban', 'xarelto', 'dabigatran', 'pradaxa', 'edoxaban', 'savaysa', 'lixiana',
  'heparin', 'enoxaparin', 'lovenox', 'tinzaparin', 'innohep',
  'clopidogrel', 'plavix', 'ticagrelor', 'brilique', 'brilinta', 'prasugrel', 'efient',
  'aspirin', 'acetylsalicyl', 'aspegic', 'kardegic'
];
const NSAIDS = [
  'ibuprofen', 'brufen', 'advil', 'nurofen', 'motrin', 'naproxen', 'aleve', 'apranax',
  'diclofenac', 'voltaren', 'ketoprofen', 'profenid', 'ketorolac', 'toradol',
  'piroxicam', 'feldene', 'meloxicam', 'mobic', 'celecoxib', 'celebrex', 'nimesulide', 'flurbiprofen', 'mefenam', 'ponstyl'
];
const BISPHOSPHONATES = [
  'alendron', 'fosamax', 'zoledron', 'zometa', 'aclasta', 'reclast',
  'risedron', 'actonel', 'ibandron', 'bonviva', 'boniva', 'pamidron', 'aredia',
  'denosumab', 'prolia', 'xgeva'
];
const MAOIS = ['phenelzine', 'nardil', 'tranylcypromine', 'parnate', 'isocarboxazid', 'marplan', 'iproniazid', 'marsilid', 'selegiline', 'emsam'];
const VASOCONSTRICTOR_TERMS = ['epinephrin', 'epi ', 'levonordefrin', 'adrenalin'];
const PENICILLIN_CLASS = ['cillin', 'amoxil', 'augmentin', 'clamoxyl', 'hiconcil'];
const BETA_LACTAM_ALLERGY_TERMS = [...PENICILLIN_CLASS, 'lactam'];

const PROPHYLAXIS_KEYWORDS = [
  'prosthetic heart valve', 'artificial heart valve', 'mechanical valve',
  'history of infective endocarditis', 'prior endocarditis', 'previous endocarditis',
  'unrepaired congenital heart disease', 'congenital heart disease',
  'cardiac transplant', 'heart transplant',
  'prothese valvulaire', 'valve cardiaque', 'valve mecanique', 'valve prothetique',
  'endocardite', 'cardiopathie congenitale', 'transplantation cardiaque', 'greffe cardiaque'
];

/** Lowercases and strips diacritics: "Pénicilline" -> "penicilline". */
function normalize(text: string): string {
  return (text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function containsAny(haystack: string, needles: string[]): boolean {
  const normalized = normalize(haystack);
  return needles.some(n => normalized.includes(n));
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
  if (containsAny(drugName, PENICILLIN_CLASS) && containsAny(allergies, BETA_LACTAM_ALLERGY_TERMS)) {
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
  const text = normalize(medicalAlerts);
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
