import type { PatientRecord } from '../repositories/patients.js';
import { checkDrugInteractions, isAnticoagulant, isVitaminKAntagonist, suggestProphylaxisReview, SafetyAlert } from './clinical-safety.js';

/**
 * Standing safety alerts for a patient chart: active drug interactions and
 * antibiotic-prophylaxis history flags. `plannedDrugs` also screens a drug
 * about to be given (anesthetic, new prescription) against the patient's list.
 */
export function computePatientSafetyAlerts(
  patient: PatientRecord,
  plannedDrugs: string[] = [],
  language: 'en' | 'fr' = 'en'
): SafetyAlert[] {
  const alerts: SafetyAlert[] = checkDrugInteractions(patient.medications, plannedDrugs, language);

  // Standing bleeding-risk reminder for any active anticoagulant/antiplatelet (the NSAID
  // combination above is a separate, critical alert).
  const bleeding = (patient.medications || []).filter(m => m.active && isAnticoagulant(m.name));
  if (bleeding.length) {
    const names = bleeding.map(m => m.name).join(', ');
    const avk = bleeding.some(m => isVitaminKAntagonist(m.name));
    alerts.push({
      severity: 'warning',
      message: language === 'fr'
        ? `Traitement anticoagulant/antiagrégant (${names}) : risque hémorragique lors des actes sanglants (extraction, chirurgie, détartrage profond). Ne pas l’interrompre sans l’avis du prescripteur ; prévoir une hémostase locale${avk ? ' ; AVK : contrôler un INR récent avant l’acte' : ''}.`
        : `Anticoagulant/antiplatelet therapy (${names}): bleeding risk with bleeding procedures (extraction, surgery, deep scaling). Do not stop it without the prescriber's advice; plan local haemostasis${avk ? '; vitamin K antagonist: check a recent INR before the procedure' : ''}.`
    });
  }

  for (const reason of suggestProphylaxisReview(patient.medicalAlerts)) {
    alerts.push({
      severity: 'info',
      message: language === 'fr'
        ? `Antécédents médicaux mentionnant « ${reason} » — vérifier la classe de risque d'endocardite (ESC 2023, consensus tunisien de Sfax 2016) avant tout acte invasif.`
        : `Medical history mentions "${reason}" — check the endocarditis risk class (ESC 2023, Tunisian Sfax consensus 2016) before invasive procedures.`
    });
  }

  return alerts;
}
