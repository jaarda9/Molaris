import type { PatientRecord } from '../repositories/patients.js';
import { checkDrugInteractions, suggestProphylaxisReview, SafetyAlert } from './clinical-safety.js';

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
