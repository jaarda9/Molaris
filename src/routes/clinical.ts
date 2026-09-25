import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { patientDb, PatientRecord, findPatientTooth } from '../repositories/patients.js';
import { primaryTeethVisibility } from '../domain/primary-teeth.js';
import { applyLabProgress } from '../domain/lab-schedule.js';
import { createDefaultPerioTeeth, type PerioChartSnapshot } from '../domain/clinical-records.js';
import { checkDrugInteractions, checkAllergyConflict, SafetyAlert } from '../domain/clinical-safety.js';
import { HttpError, languageOf, parse, route } from './http.js';
import {
  labCaseCreateSchema, labCaseUpdateSchema, medicationCreateSchema, medicationUpdateSchema, perioChartSchema, toothUpdateSchema, treatmentCreateSchema, treatmentUpdateSchema, TREATMENT_CLEARABLE, LAB_CLEARABLE
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

const plainDrugName = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Allergy + interaction alerts for a drug the patient (now) takes. */
function medicationAlerts(name: string, language: unknown): SafetyAlert[] {
  const patient = patientDb.getActivePatient();
  const lang = languageOf(language);
  const allergyAlert = checkAllergyConflict(patient.allergies, name, lang);
  return [...(allergyAlert ? [allergyAlert] : []), ...checkDrugInteractions(patient.medications, [name], lang)];
}

clinicalRouter.post('/api/medications', route((req: Request, res: Response) => {
  const input = parse(medicationCreateSchema, req.body);
  const already = patientDb.getActivePatient().medications
    .find(m => m.active && plainDrugName(m.name) === plainDrugName(input.name));
  if (already) throw new HttpError(409, `« ${already.name} » figure déjà dans les traitements en cours.`);

  const medication = patientDb.addMedicationForActivePatient({ ...input, dosage: input.dosage ?? '', frequency: input.frequency ?? '' });
  const safetyAlerts = medicationAlerts(medication.name, req.body?.language);
  res.status(201).json({ success: true, medication, patient: patientDb.getActivePatient(), safetyAlerts });
}));

clinicalRouter.put('/api/medications/:id', route((req: Request, res: Response) => {
  const changes = parse(medicationUpdateSchema, req.body);
  const id = String(req.params.id);
  const before = patientDb.getActivePatient().medications.find(m => m.id === id);
  if (!before) throw new HttpError(404, 'Médicament introuvable.');
  const wasActive = before.active;
  const medication = patientDb.updateMedicationForActivePatient(id, changes);
  // A drug taken again (or renamed) is screened like a new one.
  const rescreen = medication.active && (!wasActive || changes.name !== undefined);
  const safetyAlerts = rescreen ? medicationAlerts(medication.name, req.body?.language) : [];
  res.json({ success: true, medication, safetyAlerts });
}));

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

/** Teeth that cannot be probed today: extracted or not erupted (per the odontogram). */
function absentToothIds(): Set<number> {
  return new Set(patientDb.getActivePatient().teeth.filter(t => t.status === 'missing' || t.status === 'unerupted').map(t => t.id));
}

clinicalRouter.get('/api/perio-charts/latest', (req: Request, res: Response) => {
  const latest = patientDb.getLatestPerioChartForActivePatient();
  const absent = absentToothIds();
  // Always the full arch (the grid is positional); a tooth absent from the saved chart
  // starts from the defaults, and absent teeth are flagged so they are not charted.
  const teeth = createDefaultPerioTeeth().map(base => ({
    ...(latest?.teeth.find(t => t.toothId === base.toothId) ?? base),
    absent: absent.has(base.toothId)
  }));
  res.json({
    chart: latest ? { ...latest, teeth } : { id: '', date: new Date().toISOString(), teeth, notes: '' },
    isNew: !latest
  });
});

clinicalRouter.post('/api/perio-charts', route((req: Request, res: Response) => {
  const { teeth, notes } = parse(perioChartSchema, req.body);
  // No measurement is recorded for an extracted or unerupted tooth.
  const absent = absentToothIds();
  const charted = teeth.filter(t => !absent.has(t.toothId));
  if (!charted.length) throw new HttpError(400, 'Aucune dent à sonder sur ce relevé.');
  res.status(201).json({ success: true, chart: patientDb.savePerioChartForActivePatient(charted as PerioChartSnapshot['teeth'], notes) });
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
  const changes: Record<string, unknown> = parse(treatmentUpdateSchema, req.body);
  for (const field of TREATMENT_CLEARABLE) if (req.body?.[field] === null) changes[field] = undefined;
  if (!patientDb.getTreatmentPlanForActivePatient().some(i => i.id === String(req.params.id))) {
    throw new HttpError(404, 'Acte du plan de traitement introuvable.');
  }
  res.json({ success: true, item: patientDb.updateTreatmentPlanItemForActivePatient(String(req.params.id), changes) });
}));

clinicalRouter.delete('/api/treatment-plan/:id', route((req: Request, res: Response) => {
  const item = patientDb.getTreatmentPlanForActivePatient().find(i => i.id === String(req.params.id));
  if (!item) throw new HttpError(404, 'Acte du plan de traitement introuvable.');
  // A performed act is part of the patient's record (and of the unbilled-acts check).
  if (item.status === 'completed') {
    throw new HttpError(409, 'Un acte réalisé fait partie du dossier et ne peut pas être supprimé. S’il a été marqué réalisé par erreur, changez d’abord son statut.');
  }
  res.json({ success: patientDb.deleteTreatmentPlanItemForActivePatient(item.id) });
}));

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
  const current = patientDb.getLabCasesForActivePatient().find(c => c.id === String(req.params.id));
  if (!current) throw new HttpError(404, 'Travail de laboratoire introuvable.');

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let progressed: typeof changes;
  try {
    progressed = applyLabProgress(current, changes, today);
  } catch (err) {
    throw new HttpError(400, (err as Error).message);
  }
  const cleared: Record<string, unknown> = { ...progressed };
  for (const field of LAB_CLEARABLE) if (req.body?.[field] === null) cleared[field] = undefined;
  res.json({ success: true, labCase: patientDb.updateLabCaseForActivePatient(current.id, cleared) });
}));

clinicalRouter.delete('/api/lab-cases/:id', route((req: Request, res: Response) => {
  const labCase = patientDb.getLabCasesForActivePatient().find(c => c.id === String(req.params.id));
  if (!labCase) throw new HttpError(404, 'Travail de laboratoire introuvable.');
  // Once sent to the lab, the work is part of the patient's record (a crown fitted in the mouth).
  if (labCase.status !== 'planned') {
    throw new HttpError(409, 'Ce travail a déjà été envoyé au laboratoire : il reste dans le dossier. Corrigez-le avec « Modifier » ou changez son statut.');
  }
  res.json({ success: patientDb.deleteLabCaseForActivePatient(labCase.id) });
}));
