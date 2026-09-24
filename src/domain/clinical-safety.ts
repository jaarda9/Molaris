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
const CEPHALOSPORINS = ['cefa', 'cefu', 'cefi', 'cefo', 'cefp', 'cefr', 'ceft', 'cefz', 'cepha', 'keforal', 'oroken', 'orelox', 'zinnat'];
const ASPIRIN = ['aspirin', 'acetylsalicyl', 'aspegic', 'kardegic'];
const PARACETAMOL = ['paracetamol', 'acetaminophen', 'doliprane', 'efferalgan', 'dafalgan', 'panadol', 'algesic'];
/** Words of an allergy entry that describe the reaction, not the allergen. */
const ALLERGY_STOPWORDS = new Set([
  'allergie', 'allergies', 'allergique', 'allergy', 'allergic', 'aucune', 'aucun', 'connue', 'connues', 'known',
  'medicamenteuse', 'medicamenteuses', 'reaction', 'reactions', 'severe', 'grave', 'urticaire', 'oedeme', 'quincke',
  'anaphylaxie', 'anaphylaxis', 'anaphylactique', 'eruption', 'cutanee', 'prurit', 'intolerance', 'digestive',
  'choc', 'asthme', 'aussi', 'suspectee', 'suspicion', 'enfance', 'depuis'
]);

/** True when the drug name is an NSAID (aspirin included). */
export function isNsaid(drugName: string): boolean {
  return containsAny(drugName, NSAIDS) || containsAny(drugName, ASPIRIN);
}

/** True when the drug name contains paracetamol (alone or in a combination). */
export function isParacetamol(drugName: string): boolean {
  return containsAny(drugName, PARACETAMOL);
}

/** Allergen words of a free-text allergy entry ("Ibuprofène (œdème)" -> ["ibuprofene"]). */
function allergenTokens(allergies: string): string[] {
  return normalize(allergies).split(/[^a-z]+/).filter(w => w.length >= 5 && !ALLERGY_STOPWORDS.has(w));
}

const PROPHYLAXIS_KEYWORDS = [
  'prosthetic heart valve', 'artificial heart valve', 'mechanical valve',
  'history of infective endocarditis', 'prior endocarditis', 'previous endocarditis',
  'unrepaired congenital heart disease', 'congenital heart disease',
  'cardiac transplant', 'heart transplant',
  'prothese valvulaire', 'valve cardiaque', 'valve mecanique', 'valve prothetique',
  'endocardite', 'cardiopathie congenitale', 'transplantation cardiaque', 'greffe cardiaque',
  // ESC 2023: transcatheter valves, valve repair material, ventricular assist devices.
  'tavi', 'plastie valvulaire', 'valve repair', 'assistance ventriculaire', 'ventricular assist',
  // Tunisian consensus (Sfax 2016) also rates regurgitant rheumatic valve disease as high risk.
  'rhumatism', 'rheumatic', 'insuffisance aortique', 'insuffisance mitrale', 'aortic regurgitation', 'mitral regurgitation'
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
        ? 'Le patient est sous anticoagulant/antiagrégant et une exposition aux AINS (actuelle ou prévue) augmente le risque hémorragique. Privilégier le paracétamol pour l\'analgésie (en respectant sa dose maximale journalière) et confirmer avec le prescripteur avant tout acte invasif.'
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
        ? 'Le patient est sous IMAO. Les anesthésiques contenant un vasoconstricteur comportent un risque théorique de crise hypertensive — utiliser la dose minimale efficace d\'adrénaline et surveiller les constantes.'
        : 'Patient is on an MAOI. Vasoconstrictor-containing anesthetics carry a theoretical hypertensive crisis risk — use the minimum effective epinephrine dose and monitor vitals.'
    });
  }

  return alerts;
}

/**
 * Checks a single planned drug against the patient's recorded (free-text) allergies:
 * - penicillin allergy vs any penicillin (critical) or a cephalosporin (cross-reactivity, warning);
 * - NSAID-class or aspirin allergy vs any NSAID (critical);
 * - any other allergen named in the entry that appears in the drug name (critical),
 *   e.g. "Métronidazole" vs "Spiramycine + métronidazole".
 */
export function checkAllergyConflict(allergies: string, drugName: string, language: 'en' | 'fr' = 'en'): SafetyAlert | null {
  const fr = language === 'fr';
  const allergyText = normalize(allergies);
  const penicillinAllergy = containsAny(allergies, BETA_LACTAM_ALLERGY_TERMS);

  if (containsAny(drugName, PENICILLIN_CLASS) && penicillinAllergy) {
    return {
      severity: 'critical',
      message: fr
        ? `Allergie documentée aux pénicillines : ${drugName} est contre-indiqué. Choisir une alternative selon le type d'allergie et les recommandations en vigueur, et vérifier sa disponibilité en Tunisie.`
        : `Documented penicillin allergy: ${drugName} is contraindicated. Choose an alternative according to the type of allergy and current guidance, and check its availability in Tunisia.`
    };
  }

  const nsaidAllergy = /\b(ains|nsaids?|anti-?inflammatoires?)\b/.test(allergyText) || containsAny(allergies, ASPIRIN);
  if (nsaidAllergy && isNsaid(drugName)) {
    return {
      severity: 'critical',
      message: fr
        ? `Allergie documentée à l'aspirine ou aux AINS : ${drugName} est contre-indiqué (réactivité croisée entre AINS). Préférer un antalgique non AINS.`
        : `Documented aspirin/NSAID allergy: ${drugName} is contraindicated (cross-reactivity between NSAIDs). Prefer a non-NSAID analgesic.`
    };
  }

  const drugText = normalize(drugName);
  const allergen = allergenTokens(allergies).find(token => drugText.includes(token));
  if (allergen) {
    return {
      severity: 'critical',
      message: fr
        ? `Allergie documentée (« ${allergies.trim()} ») : ${drugName} est contre-indiqué.`
        : `Documented allergy ("${allergies.trim()}"): ${drugName} is contraindicated.`
    };
  }

  if (penicillinAllergy && containsAny(drugName, CEPHALOSPORINS)) {
    return {
      severity: 'warning',
      message: fr
        ? `Allergie aux pénicillines : réactivité croisée possible avec ${drugName} (céphalosporine). À éviter en cas d'allergie immédiate grave ; préciser le type de réaction.`
        : `Penicillin allergy: possible cross-reactivity with ${drugName} (cephalosporin). Avoid after a severe immediate reaction; check the type of reaction.`
    };
  }
  return null;
}

/**
 * Flags medical-history phrases that may put the patient at high risk of infective
 * endocarditis (ESC 2023; Tunisian consensus, Sfax 2016). This is a prompt for the clinician to review, not an automatic
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
