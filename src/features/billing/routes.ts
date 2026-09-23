import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { notFound, parse, route } from '../../routes/http.js';
import {
  localDate, MAX_AMOUNT_MILLIMES, PAYMENT_METHODS, PaymentRepository, ProcedureRepository,
  QUOTE_STATUSES, QuoteRepository
} from './repository.js';

export const billingRouter = Router();

// ---------------------------------------------------------------------------
// Schemas. Every amount is integer millimes (1 DT = 1000 millimes).
// ---------------------------------------------------------------------------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const millimes = z.number().int('amount must be whole millimes').min(0).max(MAX_AMOUNT_MILLIMES);
const positiveMillimes = z.number().int('amount must be whole millimes').positive('amount must be greater than zero').max(MAX_AMOUNT_MILLIMES);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

const procedureSchema = z.object({
  code: optionalText(40),
  labelFr: z.string().trim().min(1, 'required').max(200),
  labelAr: optionalText(200),
  category: optionalText(80),
  defaultPriceMillimes: millimes,
  cnamKeyLetter: optionalText(10),
  cnamCoefficient: z.number().positive().max(10_000).nullable().optional(),
  active: z.boolean().optional()
}).strict();

const quoteItemSchema = z.object({
  procedureId: z.string().max(100).nullable().optional(),
  label: z.string().trim().min(1, 'required').max(300),
  toothFdi: z.number().int().min(11).max(85).nullable().optional(),
  quantity: z.number().int().min(1).max(99),
  unitPriceMillimes: millimes,
  discountMillimes: millimes.optional()
}).strict();

const quoteCreateSchema = z.object({
  patientId: z.string().min(1),
  validUntil: isoDate.nullable().optional(),
  notes: optionalText(2000),
  items: z.array(quoteItemSchema).max(100)
}).strict();

const quoteUpdateSchema = z.object({
  validUntil: isoDate.nullable().optional(),
  notes: optionalText(2000),
  items: z.array(quoteItemSchema).max(100).optional()
}).strict();

const paymentSchema = z.object({
  patientId: z.string().min(1),
  quoteId: z.string().min(1).nullable().optional(),
  amountMillimes: positiveMillimes,
  method: z.enum(PAYMENT_METHODS),
  reference: optionalText(80),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, 'expected YYYY-MM-DD or YYYY-MM-DDTHH:MM').optional(),
  notes: optionalText(500)
}).strict();

const byPatient = z.object({ patientId: z.string().min(1) });

// ---------------------------------------------------------------------------
// Procedure catalog (Catalogue des actes). Procedures are deactivated, never deleted.
// ---------------------------------------------------------------------------

billingRouter.get('/api/procedures', route((req, res) => {
  const { includeInactive } = parse(z.object({ includeInactive: z.enum(['true', 'false']).optional() }), req.query);
  const procedures = new ProcedureRepository(getDb()).list({ includeInactive: includeInactive === 'true' });
  res.json({ procedures });
}));

billingRouter.post('/api/procedures', route((req, res) => {
  const procedure = new ProcedureRepository(getDb()).create(parse(procedureSchema, req.body));
  res.status(201).json({ success: true, procedure });
}));

billingRouter.put('/api/procedures/:id', route((req, res) => {
  const procedure = new ProcedureRepository(getDb()).update(String(req.params.id), parse(procedureSchema.partial(), req.body));
  res.json({ success: true, procedure });
}));

// ---------------------------------------------------------------------------
// Quotes (devis). Lines are editable while the quote is a draft only.
// ---------------------------------------------------------------------------

billingRouter.get('/api/quotes', route((req, res) => {
  const { patientId } = parse(byPatient, req.query);
  res.json({ quotes: new QuoteRepository(getDb()).listForPatient(patientId) });
}));

billingRouter.get('/api/quotes/:id', route((req, res) => {
  const quote = new QuoteRepository(getDb()).get(String(req.params.id));
  if (!quote) throw notFound('Quote');
  res.json({ quote });
}));

billingRouter.post('/api/quotes', route((req, res) => {
  const quote = new QuoteRepository(getDb()).create(parse(quoteCreateSchema, req.body));
  res.status(201).json({ success: true, quote });
}));

billingRouter.put('/api/quotes/:id', route((req, res) => {
  const quote = new QuoteRepository(getDb()).update(String(req.params.id), parse(quoteUpdateSchema, req.body));
  res.json({ success: true, quote });
}));

billingRouter.post('/api/quotes/:id/status', route((req, res) => {
  const { status } = parse(z.object({ status: z.enum(QUOTE_STATUSES) }), req.body);
  const quote = new QuoteRepository(getDb()).setStatus(String(req.params.id), status);
  res.json({ success: true, quote });
}));

billingRouter.post('/api/quotes/:id/duplicate', route((req, res) => {
  const quote = new QuoteRepository(getDb()).duplicate(String(req.params.id));
  res.status(201).json({ success: true, quote });
}));

// ---------------------------------------------------------------------------
// Payments (règlements) and receipts. Never deleted: cancelled with a reason.
// ---------------------------------------------------------------------------

billingRouter.get('/api/payments', route((req, res) => {
  const { patientId } = parse(byPatient, req.query);
  res.json({ payments: new PaymentRepository(getDb()).listForPatient(patientId) });
}));

// Registered before /api/payments/:id so "daily" is not taken for an id.
billingRouter.get('/api/payments/daily', route((req, res) => {
  const { date } = parse(z.object({ date: isoDate.optional() }), req.query);
  res.json({ daily: new PaymentRepository(getDb()).daily(date || localDate()) });
}));

billingRouter.get('/api/payments/:id', route((req, res) => {
  const payment = new PaymentRepository(getDb()).get(String(req.params.id));
  if (!payment) throw notFound('Payment');
  res.json({ payment });
}));

billingRouter.post('/api/payments', route((req, res) => {
  const payment = new PaymentRepository(getDb()).create(parse(paymentSchema, req.body));
  res.status(201).json({ success: true, payment });
}));

billingRouter.post('/api/payments/:id/cancel', route((req, res) => {
  const { reason } = parse(z.object({ reason: z.string().trim().min(3, 'a cancellation reason is required').max(500) }), req.body);
  const payment = new PaymentRepository(getDb()).cancel(String(req.params.id), reason);
  res.json({ success: true, payment });
}));

billingRouter.get('/api/patients/:id/balance', route((req, res) => {
  res.json({ balance: new PaymentRepository(getDb()).balance(String(req.params.id)) });
}));
