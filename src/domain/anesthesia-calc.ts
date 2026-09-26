import { AnestheticDrug, ANESTHETICS } from './dental-data.js';

export interface AnestheticDoseInput {
  drug: AnestheticDrug;
  weightKg: number;
  isCardiacRisk: boolean;
  /** Carpules of THIS drug injected now (not yet logged). */
  carpulesGiven: number;
  /** Other injections earlier today (any drug), e.g. from the anesthesia log. */
  priorDoses?: Array<{ drug: AnestheticDrug; carpules: number }>;
  /** Patient age in years: children get the paediatric maximum (AAPD) and age warnings. */
  ageYears?: number;
  language?: 'en' | 'fr';
}

export interface AnestheticDoseResult {
  drugName: string;
  patientWeightKg: number;
  isCardiacRisk: boolean;
  allowedMaxMg: number;
  safeMaxCarpules: number;
  limitingFactor: string;
  carpulesDelivered: number;
  mgDelivered: number;
  epiDeliveredMg: number;
  remainingCarpules: number;
  isExceeded: boolean;
  warning: string | null;
}

/** Under this age the paediatric dental limits apply (AAPD Best Practices, local anesthesia). */
export const PEDIATRIC_LA_AGE = 18;

/**
 * AAPD « Use of local anesthesia for pediatric dental patients », table of maximum doses:
 * lidocaine 4.4 mg/kg (more conservative than the 7 mg/kg manufacturer dose), mepivacaine
 * 4.4 mg/kg, articaine 7 mg/kg, bupivacaine 1.3 mg/kg.
 */
const PEDIATRIC_MG_PER_KG: Record<string, number> = { lido_100k: 4.4, mepi_plain: 4.4, arti_100k: 7, bupi_200k: 1.3 };

function maxMgPerKg(drug: AnestheticDrug, ageYears?: number): number {
  const child = ageYears !== undefined && ageYears < PEDIATRIC_LA_AGE;
  return child && PEDIATRIC_MG_PER_KG[drug.id] !== undefined ? Math.min(drug.maxDoseMgKg, PEDIATRIC_MG_PER_KG[drug.id]) : drug.maxDoseMgKg;
}

/** Maximum mg of this agent for this patient (mg/kg limit, capped by the absolute maximum). */
function allowedMgFor(drug: AnestheticDrug, weightKg: number, ageYears?: number): number {
  return Math.min(weightKg * maxMgPerKg(drug, ageYears), drug.absoluteMaxMg);
}

/** AAPD: articaine not recommended under 4 years, bupivacaine not under 12 years. */
function ageWarning(drug: AnestheticDrug, ageYears: number | undefined, fr: boolean): string | null {
  if (ageYears === undefined) return null;
  if (drug.id === 'arti_100k' && ageYears < 4) {
    return fr ? 'Articaïne : utilisation non recommandée avant 4 ans (fabricant, AAPD).' : 'Articaine: not recommended under 4 years of age (manufacturer, AAPD).';
  }
  if (drug.id === 'bupi_200k' && ageYears < 12) {
    return fr ? 'Bupivacaïne : utilisation non recommandée avant 12 ans (AAPD).' : 'Bupivacaine: not recommended under 12 years of age (AAPD).';
  }
  return null;
}

/**
 * The injections logged on the clinic-local day of `now` (earlier visits do not count
 * toward today's maximum), grouped by drug.
 */
export function dosesLoggedOn(
  log: Array<{ drugId: string; carpules: number; timestamp: string; cancelledAt?: string }>,
  now: Date = new Date(),
  drugs: AnestheticDrug[] = ANESTHETICS
): Array<{ drug: AnestheticDrug; carpules: number }> {
  const sameDay = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  const byDrug = new Map<string, number>();
  for (const entry of log) {
    if (!sameDay(entry.timestamp) || !(entry.carpules > 0) || entry.cancelledAt) continue;
    byDrug.set(entry.drugId, (byDrug.get(entry.drugId) ?? 0) + entry.carpules);
  }
  return [...byDrug].flatMap(([drugId, carpules]) => {
    const drug = drugs.find(d => d.id === drugId);
    return drug ? [{ drug, carpules: Math.round(carpules * 10) / 10 }] : [];
  });
}

// Epinephrine mg per cartridge, by labeled ratio (cartridge volume in mL).
// 1:100,000 -> 0.01 mg epi per mL; 1:200,000 -> 0.005 mg epi per mL.
function epiMgPerCartridge(drug: AnestheticDrug): number {
  if (drug.epiRatio === '1:100,000') return drug.cartridgeVolume * 0.01;
  if (drug.epiRatio === '1:200,000') return drug.cartridgeVolume * 0.005;
  return 0;
}

/**
 * Computes the maximum safe carpule count and current dosage status for a
 * local anesthetic, given patient weight, cardiac risk, and carpules already
 * delivered. Cardiac-risk patients are capped at 0.04mg epinephrine
 * (ADA/AHA guidance); all others at 0.2mg.
 */
export function calculateAnestheticDose(input: AnestheticDoseInput): AnestheticDoseResult {
  const { drug, isCardiacRisk, language = 'en' } = input;
  const weight = input.weightKg;
  const carpules = input.carpulesGiven;

  const weightMaxMg = weight * maxMgPerKg(drug, input.ageYears);
  const allowedMaxMg = Math.min(weightMaxMg, drug.absoluteMaxMg);
  const maxCarpulesByAgent = Math.floor((allowedMaxMg / drug.mgPerCartridge) * 10) / 10;

  const epiPerCartridge = epiMgPerCartridge(drug);
  let maxCarpulesByEpi = 999;
  if (epiPerCartridge > 0) {
    const epiLimit = isCardiacRisk ? 0.04 : 0.2;
    maxCarpulesByEpi = Math.floor((epiLimit / epiPerCartridge) * 10) / 10;
  }

  const safeMaxCarpules = Math.min(maxCarpulesByAgent, maxCarpulesByEpi);
  const mgDelivered = carpules * drug.mgPerCartridge;

  // Everything injected this session: earlier drugs (logged today) + this drug now.
  // Local-anesthetic toxicity is additive: each dose uses a fraction of ITS OWN maximum
  // for this patient; adrenaline simply adds up across all drugs.
  const doses = [...(input.priorDoses ?? []), { drug, carpules }];
  const toxicFractionUsed = doses.reduce((sum, d) => sum + (d.carpules * d.drug.mgPerCartridge) / allowedMgFor(d.drug, weight, input.ageYears), 0);
  const epiDelivered = doses.reduce((sum, d) => sum + d.carpules * epiMgPerCartridge(d.drug), 0);
  const epiLimit = isCardiacRisk ? 0.04 : 0.2;

  const remainingByAgent = ((1 - toxicFractionUsed) * allowedMaxMg) / drug.mgPerCartridge;
  const remainingByEpi = epiPerCartridge > 0 ? (epiLimit - epiDelivered) / epiPerCartridge : Infinity;
  const EPS = 1e-9;
  const remainingCarpules = Math.max(0, Math.floor(Math.min(remainingByAgent, remainingByEpi) * 10 + EPS) / 10);
  const isExceeded = toxicFractionUsed > 1 + EPS || epiDelivered > epiLimit + EPS;

  const limitingFactor = safeMaxCarpules === maxCarpulesByEpi
    ? (language === 'fr' ? 'Adrénaline (plafond cardiovasculaire 0,04 mg)' : 'Epinephrine (Cardiac threshold)')
    : (language === 'fr' ? 'Toxicité du principe actif (Limite mg/kg)' : 'Anesthetic agent toxicity (Mg/kg limit)');

  const child = input.ageYears !== undefined && input.ageYears < PEDIATRIC_LA_AGE;
  const warning = ageWarning(drug, input.ageYears, language === 'fr') ?? (isExceeded
    ? (language === 'fr' ? 'DANGER : Dose maximale recommandée dépassée. Surveillez le patient pour tout signe de toxicité systémique (LAST) et tachycardie.' : 'DANGER: Maximum recommended dose exceeded. Monitor patient for Local Anesthetic Systemic Toxicity (LAST) and tachycardia.')
    : isCardiacRisk && safeMaxCarpules <= 2.2
    ? (language === 'fr' ? 'NOTE : Alerte cardiaque active. Adrénaline plafonnée à 0,04 mg (~2 cartouches dosées à 1:100 000).' : 'NOTE: Patient has cardiac alerts. Epinephrine restricted to 0.04mg (~2 cartridges of 1:100k).')
    : child && maxMgPerKg(drug, input.ageYears) < drug.maxDoseMgKg
    ? (language === 'fr'
      ? `Enfant : dose maximale pédiatrique de ${String(maxMgPerKg(drug, input.ageYears)).replace('.', ',')} mg/kg (AAPD), plus prudente que celle de l’adulte.`
      : `Child: paediatric maximum of ${maxMgPerKg(drug, input.ageYears)} mg/kg (AAPD), more conservative than the adult dose.`)
    : null);

  return {
    drugName: drug.name,
    patientWeightKg: weight,
    isCardiacRisk,
    allowedMaxMg: Math.round(allowedMaxMg),
    safeMaxCarpules,
    limitingFactor,
    carpulesDelivered: carpules,
    mgDelivered: Math.round(mgDelivered),
    epiDeliveredMg: Math.round(epiDelivered * 1000) / 1000,
    remainingCarpules,
    isExceeded,
    warning
  };
}
