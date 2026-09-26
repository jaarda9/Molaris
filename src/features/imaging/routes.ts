import { Router, type Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { HttpError, languageOf, parse, route } from '../../routes/http.js';
import { patientDb } from '../../repositories/patients.js';
import { DEFAULT_TEETH } from '../../domain/dental-data.js';
import { detectImageType } from '../../domain/image-type.js';
import { readDentalImage } from '../../ai/vision.js';
import { aiErrorMessage, AiUnavailableError } from '../../ai/gemini.js';
import { XRAY_KINDS, XrayRepository } from './repository.js';

export const imagingRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de demandes à l’IA : patientez une minute.' } });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date attendue au format AAAA-MM-JJ');
const toothFdi = z.coerce.number().int().refine(n => (n >= 11 && n <= 48) || (n >= 51 && n <= 85), 'numéro de dent FDI attendu');
const metaSchema = z.object({
  kind: z.enum(XRAY_KINDS),
  takenOn: isoDate,
  toothFdi: z.union([toothFdi, z.literal('').transform(() => null), z.null()]).optional(),
  interpretation: z.string().max(10000).nullable().optional()
});

const repo = () => new XrayRepository(getDb());
/** A blank tooth field from the form means « no tooth ». */
const toothOrNull = (v: number | '' | null | undefined) => (v === '' || v == null ? null : v);

function requirePatient(id: string): void {
  if (!patientDb.getPatientById(id)) throw new HttpError(404, 'Patient introuvable.');
}

imagingRouter.get('/api/patients/:id/xrays', route((req, res) => {
  requirePatient(String(req.params.id));
  res.json({ xrays: repo().listForPatient(String(req.params.id)) });
}));

// Stores an X-ray in the patient's file (with or without the dentist's interpretation).
imagingRouter.post('/api/patients/:id/xrays', upload.single('image'), route((req, res) => {
  const patientId = String(req.params.id);
  requirePatient(patientId);
  if (!req.file) throw new HttpError(400, 'Aucune image reçue.');
  const mimeType = detectImageType(req.file.buffer);
  if (!mimeType) throw new HttpError(400, 'Format non pris en charge : envoyez une image JPEG, PNG ou WebP (exportez d’abord les radios DICOM dans l’un de ces formats).');
  const meta = parse(metaSchema, req.body);
  const xray = repo().create({
    patientId, kind: meta.kind, takenOn: meta.takenOn, toothFdi: toothOrNull(meta.toothFdi),
    filename: req.file.originalname, mimeType, data: req.file.buffer, interpretation: meta.interpretation ?? null
  });
  res.status(201).json({ success: true, xray });
}));

imagingRouter.get('/api/xrays/:id/image', route((req, res: Response) => {
  const image = repo().image(String(req.params.id));
  if (!image) throw new HttpError(404, 'Radiographie introuvable.');
  res.setHeader('Content-Type', image.mimeType);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.send(image.data);
}));

imagingRouter.put('/api/xrays/:id', route((req, res) => {
  const { toothFdi: tooth, ...changes } = parse(metaSchema.partial(), req.body);
  res.json({ success: true, xray: repo().update(String(req.params.id), { ...changes, ...(tooth !== undefined ? { toothFdi: toothOrNull(tooth) } : {}) }) });
}));

// AI second reading of a stored X-ray; the reading is kept with it.
imagingRouter.post('/api/xrays/:id/analyze', aiLimiter, route(async (req, res) => {
  const { query, language } = parse(z.object({ query: z.string().max(1000).optional(), language: z.enum(['fr', 'en']).optional() }), req.body);
  const xray = repo().get(String(req.params.id));
  if (!xray) throw new HttpError(404, 'Radiographie introuvable.');
  const patient = patientDb.getPatientById(xray.patientId);
  if (!patient) throw new HttpError(404, 'Patient introuvable.');
  const image = repo().image(xray.id)!;
  const tooth = xray.toothFdi ? DEFAULT_TEETH.find(t => t.fdi === xray.toothFdi) : null;
  try {
    const result = await readDentalImage({
      data: image.data, mimeType: image.mimeType, query, language: languageOf(language),
      focusTooth: xray.toothFdi ? { fdi: xray.toothFdi, name: tooth?.name ?? '' } : null,
      patient
    });
    res.json({ success: true, xray: repo().setAnalysis(xray.id, { query: result.query, text: result.text, model: result.modelUsed }) });
  } catch (err) {
    if (err instanceof AiUnavailableError) throw new HttpError(503, aiErrorMessage(err, languageOf(language)));
    throw err;
  }
}));

imagingRouter.delete('/api/xrays/:id', route((req, res) => {
  repo().delete(String(req.params.id));
  res.json({ success: true });
}));
