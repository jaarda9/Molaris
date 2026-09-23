import { Router, type Response } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { HttpError, notFound, parse, route } from '../../routes/http.js';
import { patientDb, type PatientRecord } from '../../repositories/patients.js';
import { DRUG_CATEGORIES, DrugRepository, PRESCRIPTION_LANGUAGES, PrescriptionRepository } from './repository.js';
import { checkPrescriptionSafety } from './safety.js';
import { issuePrescription, PrescriptionInputError, renewalItems, type IssueResult } from './service.js';

export const prescriptionsRouter = Router();

// No update or delete route for prescriptions: they are medicolegal documents.

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).nullish();

const drugSchema = z.object({
  dci: text(200).min(1, 'DCI is required'),
  brand: optionalText(200),
  form: optionalText(100),
  strength: optionalText(100),
  defaultDosage: optionalText(500),
  defaultDuration: optionalText(100),
  defaultInstructionsAr: optionalText(500),
  category: z.enum(DRUG_CATEGORIES).nullish(),
  active: z.boolean().optional()
});

const itemSchema = z.object({
  drugId: z.string().max(100).nullish(),
  drugLabel: text(200).min(1, 'drug name is required'),
  brand: optionalText(200),
  form: optionalText(100),
  strength: optionalText(100),
  dosage: text(500).min(1, 'posology is required'),
  duration: optionalText(100),
  quantity: optionalText(100),
  instructionsAr: optionalText(500)
});

const uiLanguage = z.enum(['en', 'fr']).optional();

const checkSchema = z.object({
  patientId: z.string().min(1),
  items: z.array(itemSchema.pick({ drugLabel: true, brand: true, strength: true })).max(30),
  uiLanguage
});

const issueSchema = z.object({
  patientId: z.string().min(1),
  language: z.enum(PRESCRIPTION_LANGUAGES).default('fr'),
  notes: optionalText(1000),
  items: z.array(itemSchema).min(1, 'add at least one line').max(30),
  acknowledgeCriticalAlerts: z.boolean().optional(),
  renewedFromId: z.string().max(100).nullish(),
  uiLanguage
});

const renewSchema = z.object({
  language: z.enum(PRESCRIPTION_LANGUAGES).optional(),
  acknowledgeCriticalAlerts: z.boolean().optional(),
  uiLanguage
});

function getPatient(id: string): PatientRecord {
  try {
    return patientDb.getPatientOrThrow(id);
  } catch {
    throw notFound('Patient');
  }
}

/** 201 with the prescription, or 409 with the alerts when a critical alert was not acknowledged. */
function sendIssueResult(res: Response, run: () => IssueResult): void {
  let result: IssueResult;
  try {
    result = run();
  } catch (err) {
    if (err instanceof PrescriptionInputError) throw new HttpError(400, err.message);
    throw err;
  }
  if (result.status === 'blocked') {
    res.status(409).json({
      error: 'Critical safety alert: confirm the prescription explicitly to issue it',
      requiresOverride: true,
      alerts: result.alerts
    });
    return;
  }
  res.status(201).json({ success: true, prescription: result.prescription, alerts: result.alerts });
}

// --- Drug catalog ------------------------------------------------------------

prescriptionsRouter.get('/api/drugs', route((req, res) => {
  const { includeInactive } = parse(z.object({ includeInactive: z.enum(['true', 'false']).optional() }), req.query);
  const drugs = new DrugRepository(getDb()).list({ includeInactive: includeInactive === 'true' });
  res.json({ drugs });
}));

prescriptionsRouter.post('/api/drugs', route((req, res) => {
  const input = parse(drugSchema, req.body);
  const drug = new DrugRepository(getDb()).create(input);
  res.status(201).json({ success: true, drug });
}));

// Partial update; send { active: false } to deactivate. Drugs are never deleted.
prescriptionsRouter.put('/api/drugs/:id', route((req, res) => {
  const input = parse(drugSchema.partial(), req.body);
  const drug = new DrugRepository(getDb()).update(req.params.id, input);
  if (!drug) throw notFound('Drug');
  res.json({ success: true, drug });
}));

// --- Prescriptions -----------------------------------------------------------

// Dry run of the safety check, for live alerts in the builder. Issuing re-checks server-side.
prescriptionsRouter.post('/api/prescriptions/check', route((req, res) => {
  const { patientId, items, uiLanguage: lang } = parse(checkSchema, req.body);
  const { alerts, hasCritical } = checkPrescriptionSafety(getPatient(patientId), items, lang ?? 'fr');
  res.json({ alerts, requiresOverride: hasCritical });
}));

prescriptionsRouter.post('/api/prescriptions', route((req, res) => {
  const { patientId, ...request } = parse(issueSchema, req.body);
  const patient = getPatient(patientId);
  sendIssueResult(res, () => issuePrescription(getDb(), patient, request));
}));

prescriptionsRouter.get('/api/prescriptions/:id', route((req, res) => {
  const prescription = new PrescriptionRepository(getDb()).get(req.params.id);
  if (!prescription) throw notFound('Prescription');
  res.json({ prescription });
}));

// "Renouveler": issue a new prescription with the same lines (safety check runs again).
prescriptionsRouter.post('/api/prescriptions/:id/renew', route((req, res) => {
  const request = parse(renewSchema, req.body);
  const original = new PrescriptionRepository(getDb()).get(req.params.id);
  if (!original) throw notFound('Prescription');
  const patient = getPatient(original.patientId);
  sendIssueResult(res, () => issuePrescription(getDb(), patient, {
    ...request,
    language: request.language ?? original.language,
    notes: original.notes,
    items: renewalItems(original),
    renewedFromId: original.id
  }));
}));

prescriptionsRouter.get('/api/patients/:id/prescriptions', route((req, res) => {
  const patient = getPatient(req.params.id);
  const prescriptions = new PrescriptionRepository(getDb()).listForPatient(patient.id);
  res.json({ prescriptions });
}));
