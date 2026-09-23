import { Router, Request, Response } from 'express';
import { patientDb } from '../repositories/patients.js';
import { loadMemory } from '../repositories/preferences.js';
import { computePatientSafetyAlerts } from '../domain/patient-safety.js';
import { languageOf } from './http.js';

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

patientsRouter.post('/api/patients', (req: Request, res: Response) => {
  try {
    const newPatient = patientDb.createPatient(req.body);
    res.status(201).json({ success: true, patient: newPatient });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

patientsRouter.put('/api/patients/:id', (req: Request, res: Response) => {
  try {
    const updated = patientDb.updatePatient(String(req.params.id), req.body);
    res.json({ success: true, patient: updated });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

patientsRouter.delete('/api/patients/:id', (req: Request, res: Response) => {
  try {
    const success = patientDb.deletePatient(String(req.params.id));
    res.json({ success, activePatient: patientDb.getActivePatient() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

patientsRouter.get('/api/database/export', (req: Request, res: Response) => {
  res.setHeader('Content-Disposition', 'attachment; filename="molaris-patients.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(patientDb.getDatabaseRaw(), null, 2));
});

patientsRouter.post('/api/database/import', (req: Request, res: Response) => {
  try {
    patientDb.importDatabase(req.body);
    res.json({ success: true, activePatient: patientDb.getActivePatient() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
