import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { patientDb, PatientRecord, findPatientTooth } from '../repositories/patients.js';
import { primaryTeethVisibility } from '../domain/primary-teeth.js';
import { createDefaultPerioTeeth, type PerioChartSnapshot } from '../domain/clinical-records.js';
import { checkDrugInteractions, checkAllergyConflict, SafetyAlert } from '../domain/clinical-safety.js';
import { HttpError, languageOf, parse, route } from './http.js';
import {
  labCaseCreateSchema, labCaseUpdateSchema, perioChartSchema, toothUpdateSchema, treatmentCreateSchema, treatmentUpdateSchema
} from './clinical-validation.js';

// Per-patient clinical chart: odontogram, medications, perio, treatment plan, lab cases.
// These endpoints act on the *active* patient (legacy design); new features take an
// explicit patientId instead — see CLAUDE.md.
export const clinicalRouter = Router();

// --- Odontogram ---------------------------------------------------------------

clinicalRouter.get('/api/odontogram', (req: Request, res: Response) => {
  res.json(patientDb.getActivePatient().teeth);
});

clinicalRouter.post('/api/odontogram', route((req: Request, res: Response) => {
  const { toothId, status, notes, surfaces } = parse(toothUpdateSchema, req.body);
  if (!findPatientTooth(patientDb.getActivePatient(), toothId)) throw new HttpError(404, `Dent ${toothId} introuvable dans ce dossier.`);
  const tooth = patientDb.updateToothForActivePatient(toothId, { status, notes, surfaces });
  res.json({ success: true, tooth, activePatientId: patientDb.getActivePatient().id });
}));

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

clinicalRouter.post('/api/perio-charts', route((req: Request, res: Response) => {
  const { teeth, notes } = parse(perioChartSchema, req.body);
  res.status(201).json({ success: true, chart: patientDb.savePerioChartForActivePatient(teeth as PerioChartSnapshot['teeth'], notes) });
}));

// --- Treatment plan -------------------------------------------------------------

clinicalRouter.get('/api/treatment-plan', (req: Request, res: Response) => {
  res.json({ items: patientDb.getTreatmentPlanForActivePatient() });
});

clinicalRouter.post('/api/treatment-plan', route((req: Request, res: Response) => {
  const input = parse(treatmentCreateSchema, req.body);
  const item = patientDb.addTreatmentPlanItemForActivePatient({ ...input, priority: input.priority ?? 'routine' });
  res.status(201).json({ success: true, item });
}));

clinicalRouter.put('/api/treatment-plan/:id', route((req: Request, res: Response) => {
  const changes = parse(treatmentUpdateSchema, req.body);
  if (!patientDb.getTreatmentPlanForActivePatient().some(i => i.id === String(req.params.id))) {
    throw new HttpError(404, 'Acte du plan de traitement introuvable.');
  }
  res.json({ success: true, item: patientDb.updateTreatmentPlanItemForActivePatient(String(req.params.id), changes) });
}));

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

clinicalRouter.post('/api/lab-cases', route((req: Request, res: Response) => {
  const labCase = patientDb.addLabCaseForActivePatient(parse(labCaseCreateSchema, req.body));
  res.status(201).json({ success: true, labCase });
}));

clinicalRouter.put('/api/lab-cases/:id', route((req: Request, res: Response) => {
  const changes = parse(labCaseUpdateSchema, req.body);
  if (!patientDb.getLabCasesForActivePatient().some(c => c.id === String(req.params.id))) {
    throw new HttpError(404, 'Travail de laboratoire introuvable.');
  }
  res.json({ success: true, labCase: patientDb.updateLabCaseForActivePatient(String(req.params.id), changes) });
}));

clinicalRouter.delete('/api/lab-cases/:id', (req: Request, res: Response) => {
  try {
    res.json({ success: patientDb.deleteLabCaseForActivePatient(String(req.params.id)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
