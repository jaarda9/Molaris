import { AnestheticDrug } from './dental-data.js';

export interface AnestheticDoseInput {
  drug: AnestheticDrug;
  weightKg: number;
  isCardiacRisk: boolean;
  carpulesGiven: number;
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
  const epiDelivered = carpules * epiPerCartridge;
  const remainingCarpules = Math.max(0, Math.round((safeMaxCarpules - carpules) * 10) / 10);
  const isExceeded = carpules > safeMaxCarpules;

  const limitingFactor = safeMaxCarpules === maxCarpulesByEpi
    ? (language === 'fr' ? 'Épinéphrine (Plafond cardiovasculaire max 0,04 mg)' : 'Epinephrine (Cardiac threshold)')
    : (language === 'fr' ? 'Toxicité du principe actif (Limite mg/kg)' : 'Anesthetic agent toxicity (Mg/kg limit)');

  const warning = isExceeded
    ? (language === 'fr' ? 'DANGER : Dose maximale recommandée dépassée. Surveillez le patient pour tout signe de toxicité systémique (LAST) et tachycardie.' : 'DANGER: Maximum recommended dose exceeded. Monitor patient for Local Anesthetic Systemic Toxicity (LAST) and tachycardia.')
    : isCardiacRisk && safeMaxCarpules <= 2.2
    ? (language === 'fr' ? 'NOTE : Alerte cardiaque active. Épinéphrine plafonnée à 0,04 mg (~2 cartouches dosées à 1:100 000).' : 'NOTE: Patient has cardiac alerts. Epinephrine restricted to 0.04mg (~2 cartridges of 1:100k).')
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
