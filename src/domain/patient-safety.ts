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
        ? `Antécédents médicaux mentionnant « ${reason} » — vérifier les recommandations de prophylaxie antibiotique avant tout acte invasif.`
        : `Medical history mentions "${reason}" — review antibiotic prophylaxis guidance before invasive procedures.`
    });
  }

  return alerts;
}
