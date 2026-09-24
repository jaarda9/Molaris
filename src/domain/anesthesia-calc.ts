import { AnestheticDrug, ANESTHETICS } from './dental-data.js';

export interface AnestheticDoseInput {
  drug: AnestheticDrug;
  weightKg: number;
  isCardiacRisk: boolean;
  /** Carpules of THIS drug injected now (not yet logged). */
  carpulesGiven: number;
  /** Other injections earlier today (any drug), e.g. from the anesthesia log. */
  priorDoses?: Array<{ drug: AnestheticDrug; carpules: number }>;
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

/** Maximum mg of this agent for this patient (mg/kg limit, capped by the absolute maximum). */
function allowedMgFor(drug: AnestheticDrug, weightKg: number): number {
  return Math.min(weightKg * drug.maxDoseMgKg, drug.absoluteMaxMg);
}

/**
 * The injections logged on the clinic-local day of `now` (earlier visits do not count
 * toward today's maximum), grouped by drug.
 */
export function dosesLoggedOn(
  log: Array<{ drugId: string; carpules: number; timestamp: string }>,
  now: Date = new Date(),
  drugs: AnestheticDrug[] = ANESTHETICS
): Array<{ drug: AnestheticDrug; carpules: number }> {
  const sameDay = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };
  const byDrug = new Map<string, number>();
  for (const entry of log) {
    if (!sameDay(entry.timestamp) || !(entry.carpules > 0)) continue;
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

  const weightMaxMg = weight * drug.maxDoseMgKg;
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
  const toxicFractionUsed = doses.reduce((sum, d) => sum + (d.carpules * d.drug.mgPerCartridge) / allowedMgFor(d.drug, weight), 0);
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

  const warning = isExceeded
    ? (language === 'fr' ? 'DANGER : Dose maximale recommandée dépassée. Surveillez le patient pour tout signe de toxicité systémique (LAST) et tachycardie.' : 'DANGER: Maximum recommended dose exceeded. Monitor patient for Local Anesthetic Systemic Toxicity (LAST) and tachycardia.')
    : isCardiacRisk && safeMaxCarpules <= 2.2
    ? (language === 'fr' ? 'NOTE : Alerte cardiaque active. Adrénaline plafonnée à 0,04 mg (~2 cartouches dosées à 1:100 000).' : 'NOTE: Patient has cardiac alerts. Epinephrine restricted to 0.04mg (~2 cartridges of 1:100k).')
    : null;

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
