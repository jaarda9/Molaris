import { Router, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getDb } from '../db/connection.js';
import { patientDb, type PatientRecord } from '../repositories/patients.js';
import { loadMemory } from '../repositories/preferences.js';
import { computePatientSafetyAlerts } from '../domain/patient-safety.js';
import { HttpError, languageOf, parse, route } from './http.js';
import { patientCreateSchema, patientUpdateSchema } from './clinical-validation.js';

/** A chart number identifies one patient: refuse a duplicate with a clear message. */
function assertChartIdFree(chartId: string | undefined, exceptPatientId?: string): void {
  if (!chartId) return;
  const other = patientDb.getAllPatients().find(p => p.chartId.toLowerCase() === chartId.toLowerCase() && p.id !== exceptPatientId);
  if (other) throw new HttpError(409, `Le numéro de dossier ${chartId} est déjà attribué à ${other.name}.`);
}

export const patientsRouter = Router();

patientsRouter.get('/api/status', (req: Request, res: Response) => {
  const memory = loadMemory();
  const activePatient = patientDb.getActivePatient();
  res.json({
    status: 'online',
    systemName: 'M.O.L.A.R.I.S',
    version: '0.5.0',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    doctorName: memory.preferences.doctorName,
    clinicName: memory.preferences.clinicName,
    numberingSystem: memory.preferences.numberingSystem,
    activePatient,
    patientsCount: patientDb.getAllPatients().length,
    teethCount: activePatient.teeth.length
  });
});

patientsRouter.get('/api/patients', (req: Request, res: Response) => {
  res.json({
    activePatientId: patientDb.getActivePatient().id,
    patients: patientDb.getAllPatients()
  });
});

patientsRouter.get('/api/patients/active', (req: Request, res: Response) => {
  const patient = patientDb.getActivePatient();
  res.json({ ...patient, safetyAlerts: computePatientSafetyAlerts(patient, [], languageOf(req.query.language)) });
});

patientsRouter.post('/api/patients/select', (req: Request, res: Response) => {
  try {
    const { id, language } = req.body;
    if (!id) return res.status(400).json({ error: 'Patient ID is required' });
    const patient = patientDb.setActivePatient(id);
    const safetyAlerts = computePatientSafetyAlerts(patient, [], languageOf(language));
    res.json({ success: true, activePatient: { ...patient, safetyAlerts } });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

patientsRouter.post('/api/patients', route((req: Request, res: Response) => {
  const input = parse(patientCreateSchema, req.body);
  assertChartIdFree(input.chartId);
  const newPatient = patientDb.createPatient(input as Partial<PatientRecord>);
  res.status(201).json({ success: true, patient: newPatient });
}));

patientsRouter.put('/api/patients/:id', route((req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!patientDb.getPatientById(id)) throw new HttpError(404, 'Patient introuvable.');
  const changes = parse(patientUpdateSchema, req.body);
  assertChartIdFree(changes.chartId, id);
  const updated = patientDb.updatePatient(id, changes as Partial<PatientRecord>);
  res.json({ success: true, patient: updated });
}));

patientsRouter.delete('/api/patients/:id', (req: Request, res: Response) => {
  try {
    const success = patientDb.deletePatient(String(req.params.id));
    res.json({ success, activePatient: patientDb.getActivePatient() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Full backup: a consistent copy of the whole database (agenda, billing, prescriptions,
// charts, settings) — unlike the JSON export, which only holds the patient charts.
patientsRouter.get('/api/database/backup', route(async (req: Request, res: Response) => {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const file = path.join(os.tmpdir(), `molaris-export-${process.pid}-${Date.now()}.db`);
  await getDb().backup(file);
  res.download(file, `molaris-sauvegarde-${day}.db`, () => fs.unlink(file, () => { /* temp file */ }));
}));

patientsRouter.get('/api/database/export', (req: Request, res: Response) => {
  res.setHeader('Content-Disposition', 'attachment; filename="molaris-patients.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(patientDb.getDatabaseRaw(), null, 2));
});

patientsRouter.post('/api/database/import', (req: Request, res: Response) => {
  try {
    const result = patientDb.importDatabase(req.body);
    res.json({ success: true, ...result, activePatient: patientDb.getActivePatient() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
