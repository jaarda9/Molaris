import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { patientDb, PatientRecord } from '../repositories/patients.js';
import { primaryTeethVisibility } from '../domain/primary-teeth.js';
import { createDefaultPerioTeeth } from '../domain/clinical-records.js';
import { checkDrugInteractions, checkAllergyConflict, SafetyAlert } from '../domain/clinical-safety.js';
import { languageOf, parse, route } from './http.js';

// Per-patient clinical chart: odontogram, medications, perio, treatment plan, lab cases.
// These endpoints act on the *active* patient (legacy design); new features take an
// explicit patientId instead — see CLAUDE.md.
export const clinicalRouter = Router();

// --- Odontogram ---------------------------------------------------------------

clinicalRouter.get('/api/odontogram', (req: Request, res: Response) => {
  res.json(patientDb.getActivePatient().teeth);
});

clinicalRouter.post('/api/odontogram', (req: Request, res: Response) => {
  try {
    const { toothId, status, notes, surfaces } = req.body;
    const tooth = patientDb.updateToothForActivePatient(Number(toothId), { status, notes, surfaces });
    res.json({ success: true, tooth, activePatientId: patientDb.getActivePatient().id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.post('/api/odontogram/reset', (req: Request, res: Response) => {
  const teeth = patientDb.resetOdontogramForActivePatient();
  res.json({ success: true, odontogram: teeth });
});

// Primary teeth (FDI 51–85) and whether the chart shows them for this patient.
function primaryTeethPayload(patient: PatientRecord) {
  const { visible, reason } = primaryTeethVisibility(patient.age, patient.primaryTeethMode, patient.primaryTeeth);
  return { primaryTeeth: patient.primaryTeeth, mode: patient.primaryTeethMode, visible, reason, age: patient.age };
}

clinicalRouter.get('/api/odontogram/primary', (req: Request, res: Response) => {
  res.json(primaryTeethPayload(patientDb.getActivePatient()));
});

const primaryModeSchema = z.object({ mode: z.enum(['auto', 'shown', 'hidden']) });

clinicalRouter.put('/api/odontogram/primary', route((req: Request, res: Response) => {
  const { mode } = parse(primaryModeSchema, req.body);
  const patient = patientDb.setPrimaryTeethModeForActivePatient(mode);
  res.json({ success: true, ...primaryTeethPayload(patient) });
}));

// --- Medications (also feed the drug-interaction / allergy safety checks) -----

clinicalRouter.get('/api/medications', (req: Request, res: Response) => {
  res.json({ medications: patientDb.getMedicationsForActivePatient() });
});

clinicalRouter.post('/api/medications', (req: Request, res: Response) => {
  try {
    const { name, dosage, frequency, prescribedFor, language } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Medication name is required' });
    }
    const lang = languageOf(language);
    const allergyAlert = checkAllergyConflict(patientDb.getActivePatient().allergies, name, lang);

    const medication = patientDb.addMedicationForActivePatient({
      name,
      dosage: dosage || '',
      frequency: frequency || '',
      prescribedFor
    });

    const patient = patientDb.getActivePatient();
    const safetyAlerts: SafetyAlert[] = [];
    if (allergyAlert) safetyAlerts.push(allergyAlert);
    safetyAlerts.push(...checkDrugInteractions(patient.medications, [name], lang));

    res.status(201).json({ success: true, medication, patient, safetyAlerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.put('/api/medications/:id', (req: Request, res: Response) => {
  try {
    const medication = patientDb.updateMedicationForActivePatient(String(req.params.id), req.body);
    res.json({ success: true, medication });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

clinicalRouter.delete('/api/medications/:id', (req: Request, res: Response) => {
  try {
    res.json({ success: patientDb.deleteMedicationForActivePatient(String(req.params.id)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Periodontal charting (6-site probing, snapshotted by date) ----------------

clinicalRouter.get('/api/perio-charts', (req: Request, res: Response) => {
  res.json({ charts: patientDb.getPerioChartsForActivePatient() });
});

clinicalRouter.get('/api/perio-charts/latest', (req: Request, res: Response) => {
  const latest = patientDb.getLatestPerioChartForActivePatient();
  if (latest) {
    res.json({ chart: latest, isNew: false });
  } else {
    res.json({
      chart: { id: '', date: new Date().toISOString(), teeth: createDefaultPerioTeeth(), notes: '' },
      isNew: true
    });
  }
});

clinicalRouter.post('/api/perio-charts', (req: Request, res: Response) => {
  try {
    const { teeth, notes } = req.body;
    if (!Array.isArray(teeth) || teeth.length === 0) {
      return res.status(400).json({ error: 'A full teeth array is required to save a perio chart snapshot' });
    }
    res.status(201).json({ success: true, chart: patientDb.savePerioChartForActivePatient(teeth, notes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Treatment plan -------------------------------------------------------------

clinicalRouter.get('/api/treatment-plan', (req: Request, res: Response) => {
  res.json({ items: patientDb.getTreatmentPlanForActivePatient() });
});

clinicalRouter.post('/api/treatment-plan', (req: Request, res: Response) => {
  try {
    const { toothId, procedure, cdtCode, priority, estimatedCost, notes } = req.body;
    if (!procedure || typeof procedure !== 'string') {
      return res.status(400).json({ error: 'Procedure description is required' });
    }
    const item = patientDb.addTreatmentPlanItemForActivePatient({
      toothId: toothId !== undefined && toothId !== '' ? Number(toothId) : undefined,
      procedure,
      cdtCode,
      priority: priority || 'routine',
      estimatedCost: estimatedCost !== undefined && estimatedCost !== '' ? Number(estimatedCost) : undefined,
      notes
    });
    res.status(201).json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.put('/api/treatment-plan/:id', (req: Request, res: Response) => {
  try {
    res.json({ success: true, item: patientDb.updateTreatmentPlanItemForActivePatient(String(req.params.id), req.body) });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

clinicalRouter.delete('/api/treatment-plan/:id', (req: Request, res: Response) => {
  try {
    res.json({ success: patientDb.deleteTreatmentPlanItemForActivePatient(String(req.params.id)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Lab cases --------------------------------------------------------------------

clinicalRouter.get('/api/lab-cases', (req: Request, res: Response) => {
  res.json({ cases: patientDb.getLabCasesForActivePatient() });
});

clinicalRouter.post('/api/lab-cases', (req: Request, res: Response) => {
  try {
    const { toothId, caseType, material, shade, marginDesign, occlusalNotes, labName, dueDate, notes } = req.body;
    if (!caseType || typeof caseType !== 'string') {
      return res.status(400).json({ error: 'Case type is required' });
    }
    const labCase = patientDb.addLabCaseForActivePatient({
      toothId: toothId !== undefined && toothId !== '' ? Number(toothId) : undefined,
      caseType, material, shade, marginDesign, occlusalNotes, labName, dueDate, notes
    });
    res.status(201).json({ success: true, labCase });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.put('/api/lab-cases/:id', (req: Request, res: Response) => {
  try {
    res.json({ success: true, labCase: patientDb.updateLabCaseForActivePatient(String(req.params.id), req.body) });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

clinicalRouter.delete('/api/lab-cases/:id', (req: Request, res: Response) => {
  try {
    res.json({ success: patientDb.deleteLabCaseForActivePatient(String(req.params.id)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
