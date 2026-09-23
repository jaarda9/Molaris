import type { DB } from '../../db/connection.js';
import { nextDocumentNumber } from '../../db/counters.js';
import { newId, nowIso } from '../../db/ids.js';
import { HttpError, notFound } from '../../routes/http.js';
import { amountInWordsFr } from './amount-words.js';

/** Sanity ceiling for any single amount: 1 000 000 DT. */
export const MAX_AMOUNT_MILLIMES = 1_000_000_000;

// ---------------------------------------------------------------------------
// Clinic-local dates. The server runs on the clinic PC (Tunisia, UTC+1, no DST),
// so the machine's local clock is clinic time.
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' in clinic-local time. */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DDTHH:MM' in clinic-local time. */
export function localDateTime(d: Date = new Date()): string {
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
}

const blankToNull = (value: string | null | undefined) => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

function assertAmount(millimes: number, what: string, { allowZero = false } = {}): void {
  if (!Number.isSafeInteger(millimes) || millimes < (allowZero ? 0 : 1) || millimes > MAX_AMOUNT_MILLIMES) {
    throw new HttpError(400, `${what}: invalid amount`);
  }
}

function assertPatient(db: DB, patientId: string): void {
  if (!db.prepare('SELECT 1 FROM patients WHERE id = ?').get(patientId)) throw notFound('Patient');
}

// ---------------------------------------------------------------------------
// Procedure catalog
// ---------------------------------------------------------------------------

export interface Procedure {
  id: string;
  code: string | null;
  labelFr: string;
  labelAr: string | null;
  category: string | null;
  defaultPriceMillimes: number;
  cnamKeyLetter: string | null;
  cnamCoefficient: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureInput {
  code?: string | null;
  labelFr: string;
  labelAr?: string | null;
  category?: string | null;
  defaultPriceMillimes: number;
  cnamKeyLetter?: string | null;
  cnamCoefficient?: number | null;
  active?: boolean;
}

interface ProcedureRow {
  id: string;
  code: string | null;
  label_fr: string;
  label_ar: string | null;
  category: string | null;
  default_price_millimes: number;
  cnam_key_letter: string | null;
  cnam_coefficient: number | null;
  active: number;
  created_at: string;
  updated_at: string;
}

function toProcedure(row: ProcedureRow): Procedure {
  return {
    id: row.id,
    code: row.code,
    labelFr: row.label_fr,
    labelAr: row.label_ar,
    category: row.category,
    defaultPriceMillimes: row.default_price_millimes,
    cnamKeyLetter: row.cnam_key_letter,
    cnamCoefficient: row.cnam_coefficient,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class ProcedureRepository {
  constructor(private db: DB) {}

  list(options: { includeInactive?: boolean } = {}): Procedure[] {
    const rows = this.db.prepare(`
      SELECT * FROM procedures
      ${options.includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY category, label_fr
    `).all() as ProcedureRow[];
    return rows.map(toProcedure);
  }

  get(id: string): Procedure | null {
    const row = this.db.prepare('SELECT * FROM procedures WHERE id = ?').get(id) as ProcedureRow | undefined;
    return row ? toProcedure(row) : null;
  }

  create(input: ProcedureInput): Procedure {
    if (!input.labelFr || !input.labelFr.trim()) throw new HttpError(400, 'labelFr: required');
    assertAmount(input.defaultPriceMillimes, 'defaultPriceMillimes', { allowZero: true });
    const id = newId('proc');
    const now = nowIso();
    this.db.prepare(`
      INSERT INTO procedures (id, code, label_fr, label_ar, category, default_price_millimes,
                              cnam_key_letter, cnam_coefficient, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, blankToNull(input.code), input.labelFr.trim(), blankToNull(input.labelAr), blankToNull(input.category),
      input.defaultPriceMillimes, blankToNull(input.cnamKeyLetter), input.cnamCoefficient ?? null,
      input.active === false ? 0 : 1, now, now);
    return this.get(id)!;
  }

  /** Partial update; deactivate with `{ active: false }` (procedures are never deleted). */
  update(id: string, input: Partial<ProcedureInput>): Procedure {
    const current = this.get(id);
    if (!current) throw notFound('Procedure');
    const merged: ProcedureInput = {
      code: current.code, labelFr: current.labelFr, labelAr: current.labelAr, category: current.category,
      defaultPriceMillimes: current.defaultPriceMillimes, cnamKeyLetter: current.cnamKeyLetter,
      cnamCoefficient: current.cnamCoefficient, active: current.active,
      ...input
    };
    if (!merged.labelFr || !merged.labelFr.trim()) throw new HttpError(400, 'labelFr: required');
    assertAmount(merged.defaultPriceMillimes, 'defaultPriceMillimes', { allowZero: true });
    this.db.prepare(`
      UPDATE procedures SET code = ?, label_fr = ?, label_ar = ?, category = ?, default_price_millimes = ?,
        cnam_key_letter = ?, cnam_coefficient = ?, active = ?, updated_at = ?
      WHERE id = ?
    `).run(blankToNull(merged.code), merged.labelFr.trim(), blankToNull(merged.labelAr), blankToNull(merged.category),
      merged.defaultPriceMillimes, blankToNull(merged.cnamKeyLetter), merged.cnamCoefficient ?? null,
      merged.active === false ? 0 : 1, nowIso(), id);
    return this.get(id)!;
  }
}

// ---------------------------------------------------------------------------
// Quotes (devis)
// ---------------------------------------------------------------------------

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'refused', 'expired'] as const;
export type QuoteStatus = typeof QUOTE_STATUSES[number];

/** Allowed status changes. Accepted, refused and expired are final (duplicate to re-issue). */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent', 'accepted', 'refused'],
  sent: ['accepted', 'refused', 'expired'],
  accepted: [],
  refused: [],
  expired: []
};

export interface QuoteItemInput {
  procedureId?: string | null;
  label: string;
  toothFdi?: number | null;
  quantity: number;
  unitPriceMillimes: number;
  discountMillimes?: number;
}

export interface QuoteItem {
  id: string;
  procedureId: string | null;
  label: string;
  toothFdi: number | null;
  quantity: number;
  unitPriceMillimes: number;
  discountMillimes: number;
  totalMillimes: number;
}

export interface Quote {
  id: string;
  number: string;
  patientId: string;
  patientName: string;
  patientChartId: string;
  status: QuoteStatus;
  issuedAt: string;            // 'YYYY-MM-DD'
  validUntil: string | null;   // 'YYYY-MM-DD'
  /** Draft/sent quote whose validity date is before today. */
  pastValidity: boolean;
  notes: string | null;
  items: QuoteItem[];
  totalMillimes: number;
  /** Sum of non-cancelled payments linked to this quote. */
  paidMillimes: number;
  remainingMillimes: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteInput {
  patientId: string;
  validUntil?: string | null;
  notes?: string | null;
  items: QuoteItemInput[];
}

interface QuoteRow {
  id: string;
  number: string;
  patient_id: string;
  patient_name: string;
  patient_chart_id: string;
  status: QuoteStatus;
  issued_at: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  paid_millimes: number;
}

interface QuoteItemRow {
  id: string;
  quote_id: string;
  procedure_id: string | null;
  label: string;
  tooth_fdi: number | null;
  quantity: number;
  unit_price_millimes: number;
  discount_millimes: number;
}

/** FDI two-digit notation: permanent teeth 11-48, deciduous 51-85. */
export function isValidFdiTooth(n: number): boolean {
  if (!Number.isInteger(n)) return false;
  const quadrant = Math.floor(n / 10);
  const position = n % 10;
  if (quadrant >= 1 && quadrant <= 4) return position >= 1 && position <= 8;
  if (quadrant >= 5 && quadrant <= 8) return position >= 1 && position <= 5;
  return false;
}

/** quantity × unit price − discount, in millimes. */
export function lineTotal(item: Pick<QuoteItemInput, 'quantity' | 'unitPriceMillimes' | 'discountMillimes'>): number {
  return item.quantity * item.unitPriceMillimes - (item.discountMillimes ?? 0);
}

function validateItems(items: QuoteItemInput[]): void {
  if (items.length > 100) throw new HttpError(400, 'items: at most 100 lines');
  items.forEach((item, i) => {
    const where = `items.${i}`;
    if (!item.label || !item.label.trim()) throw new HttpError(400, `${where}.label: required`);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new HttpError(400, `${where}.quantity: must be a whole number between 1 and 99`);
    }
    assertAmount(item.unitPriceMillimes, `${where}.unitPriceMillimes`, { allowZero: true });
    assertAmount(item.discountMillimes ?? 0, `${where}.discountMillimes`, { allowZero: true });
    if ((item.discountMillimes ?? 0) > item.quantity * item.unitPriceMillimes) {
      throw new HttpError(400, `${where}.discountMillimes: discount exceeds the line amount`);
    }
    if (item.toothFdi != null && !isValidFdiTooth(item.toothFdi)) {
      throw new HttpError(400, `${where}.toothFdi: not a valid FDI tooth number`);
    }
  });
  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);
  if (total > MAX_AMOUNT_MILLIMES) throw new HttpError(400, 'items: quote total is too large');
}

const QUOTE_SELECT = `
  SELECT q.*, p.name AS patient_name, p.chart_id AS patient_chart_id,
    COALESCE((SELECT SUM(amount_millimes) FROM payments pay
              WHERE pay.quote_id = q.id AND pay.cancelled_at IS NULL), 0) AS paid_millimes
  FROM quotes q JOIN patients p ON p.id = q.patient_id
`;

export class QuoteRepository {
  constructor(private db: DB) {}

  private itemsOf(quoteIds: string[]): Map<string, QuoteItem[]> {
    const byQuote = new Map<string, QuoteItem[]>();
    if (quoteIds.length === 0) return byQuote;
    const rows = this.db.prepare(`
      SELECT * FROM quote_items WHERE quote_id IN (${quoteIds.map(() => '?').join(',')})
      ORDER BY position
    `).all(...quoteIds) as QuoteItemRow[];
    for (const row of rows) {
      const list = byQuote.get(row.quote_id) ?? [];
      list.push({
        id: row.id,
        procedureId: row.procedure_id,
        label: row.label,
        toothFdi: row.tooth_fdi,
        quantity: row.quantity,
        unitPriceMillimes: row.unit_price_millimes,
        discountMillimes: row.discount_millimes,
        totalMillimes: lineTotal({ quantity: row.quantity, unitPriceMillimes: row.unit_price_millimes, discountMillimes: row.discount_millimes })
      });
      byQuote.set(row.quote_id, list);
    }
    return byQuote;
  }

  private toQuotes(rows: QuoteRow[]): Quote[] {
    const items = this.itemsOf(rows.map(r => r.id));
    const today = localDate();
    return rows.map(row => {
      const lines = items.get(row.id) ?? [];
      const total = lines.reduce((sum, l) => sum + l.totalMillimes, 0);
      return {
        id: row.id,
        number: row.number,
        patientId: row.patient_id,
        patientName: row.patient_name,
        patientChartId: row.patient_chart_id,
        status: row.status,
        issuedAt: row.issued_at,
        validUntil: row.valid_until,
        pastValidity: (row.status === 'draft' || row.status === 'sent') && !!row.valid_until && row.valid_until < today,
        notes: row.notes,
        items: lines,
        totalMillimes: total,
        paidMillimes: row.paid_millimes,
        remainingMillimes: total - row.paid_millimes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
  }

  listForPatient(patientId: string): Quote[] {
    const rows = this.db.prepare(`${QUOTE_SELECT} WHERE q.patient_id = ? ORDER BY q.issued_at DESC, q.number DESC`)
      .all(patientId) as QuoteRow[];
    return this.toQuotes(rows);
  }

  get(id: string): Quote | null {
    const row = this.db.prepare(`${QUOTE_SELECT} WHERE q.id = ?`).get(id) as QuoteRow | undefined;
    return row ? this.toQuotes([row])[0] : null;
  }

  private insertItems(quoteId: string, items: QuoteItemInput[]): void {
    const insert = this.db.prepare(`
      INSERT INTO quote_items (id, quote_id, procedure_id, label, tooth_fdi, quantity,
                               unit_price_millimes, discount_millimes, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const procedureExists = this.db.prepare('SELECT 1 FROM procedures WHERE id = ?');
    items.forEach((item, position) => {
      const procedureId = item.procedureId && procedureExists.get(item.procedureId) ? item.procedureId : null;
      insert.run(newId('qi'), quoteId, procedureId, item.label.trim(), item.toothFdi ?? null, item.quantity,
        item.unitPriceMillimes, item.discountMillimes ?? 0, position);
    });
  }

  /** Creates a draft; the DV number is allocated in the same transaction (gap-free). */
  create(input: QuoteInput, now: Date = new Date()): Quote {
    validateItems(input.items);
    assertPatient(this.db, input.patientId);
    const id = newId('quote');
    const issuedAt = localDate(now);
    const validUntil = input.validUntil === undefined ? addDays(issuedAt, 30) : input.validUntil;
    if (validUntil && validUntil < issuedAt) throw new HttpError(400, 'validUntil: must not be before the issue date');
    this.db.transaction(() => {
      const number = nextDocumentNumber(this.db, 'DV', now);
      const ts = nowIso();
      this.db.prepare(`
        INSERT INTO quotes (id, number, patient_id, status, issued_at, valid_until, notes, created_at, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)
      `).run(id, number, input.patientId, issuedAt, validUntil, blankToNull(input.notes), ts, ts);
      this.insertItems(id, input.items);
    })();
    return this.get(id)!;
  }

  /** Lines, validity and notes can only change while the quote is a draft. */
  update(id: string, input: { validUntil?: string | null; notes?: string | null; items?: QuoteItemInput[] }): Quote {
    const current = this.get(id);
    if (!current) throw notFound('Quote');
    if (current.status !== 'draft') throw new HttpError(409, 'Only a draft quote can be edited');
    if (input.items) validateItems(input.items);
    const validUntil = input.validUntil === undefined ? current.validUntil : input.validUntil;
    if (validUntil && validUntil < current.issuedAt) throw new HttpError(400, 'validUntil: must not be before the issue date');
    this.db.transaction(() => {
      this.db.prepare('UPDATE quotes SET valid_until = ?, notes = ?, updated_at = ? WHERE id = ?')
        .run(validUntil, input.notes === undefined ? current.notes : blankToNull(input.notes), nowIso(), id);
      if (input.items) {
        this.db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(id);
        this.insertItems(id, input.items);
      }
    })();
    return this.get(id)!;
  }

  setStatus(id: string, status: QuoteStatus): Quote {
    const current = this.get(id);
    if (!current) throw notFound('Quote');
    if (current.status === status) return current;
    if (!QUOTE_TRANSITIONS[current.status].includes(status)) {
      throw new HttpError(409, `A ${current.status} quote cannot become ${status}`);
    }
    if ((status === 'sent' || status === 'accepted') && current.items.length === 0) {
      throw new HttpError(409, 'An empty quote cannot be sent or accepted');
    }
    this.db.prepare('UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
    return this.get(id)!;
  }

  /** New draft with the same lines (to re-issue a refused/expired quote). */
  duplicate(id: string, now: Date = new Date()): Quote {
    const current = this.get(id);
    if (!current) throw notFound('Quote');
    return this.create({
      patientId: current.patientId,
      notes: current.notes,
      items: current.items.map(({ procedureId, label, toothFdi, quantity, unitPriceMillimes, discountMillimes }) =>
        ({ procedureId, label, toothFdi, quantity, unitPriceMillimes, discountMillimes }))
    }, now);
  }
}

// ---------------------------------------------------------------------------
// Payments (règlements) and receipts (reçus)
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = ['cash', 'cheque', 'card', 'transfer', 'other'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export interface Payment {
  id: string;
  receiptNumber: string;
  patientId: string;
  patientName: string;
  patientChartId: string;
  quoteId: string | null;
  quoteNumber: string | null;
  amountMillimes: number;
  /** For the receipt: "cent vingt-cinq dinars et cinq cents millimes". */
  amountInWords: string;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;           // clinic-local 'YYYY-MM-DDTHH:MM'
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

export interface PaymentInput {
  patientId: string;
  quoteId?: string | null;
  amountMillimes: number;
  method: PaymentMethod;
  reference?: string | null;
  /** 'YYYY-MM-DD' (today → current time, past day → 12:00) or 'YYYY-MM-DDTHH:MM'. Defaults to now. */
  paidAt?: string;
  notes?: string | null;
}

interface PaymentRow {
  id: string;
  receipt_number: string;
  patient_id: string;
  patient_name: string;
  patient_chart_id: string;
  quote_id: string | null;
  quote_number: string | null;
  amount_millimes: number;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientChartId: row.patient_chart_id,
    quoteId: row.quote_id,
    quoteNumber: row.quote_number,
    amountMillimes: row.amount_millimes,
    amountInWords: amountInWordsFr(row.amount_millimes),
    method: row.method,
    reference: row.reference,
    paidAt: row.paid_at,
    notes: row.notes,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at
  };
}

const PAYMENT_SELECT = `
  SELECT pay.*, p.name AS patient_name, p.chart_id AS patient_chart_id, q.number AS quote_number
  FROM payments pay
  JOIN patients p ON p.id = pay.patient_id
  LEFT JOIN quotes q ON q.id = pay.quote_id
`;

export interface QuoteBalance {
  quoteId: string;
  number: string;
  issuedAt: string;
  totalMillimes: number;
  paidMillimes: number;
  remainingMillimes: number;
}

export interface PatientBalance {
  patientId: string;
  /** Total of accepted quotes. */
  quotedMillimes: number;
  /** Non-cancelled payments linked to accepted quotes. */
  paidOnQuotesMillimes: number;
  /** Non-cancelled payments not linked to a quote (e.g. a consultation paid on the day). */
  paidOutsideQuotesMillimes: number;
  /** Every non-cancelled payment. */
  paidMillimes: number;
  /** What the patient still owes on accepted quotes (quoted − paid on quotes). */
  balanceDueMillimes: number;
  quotes: QuoteBalance[];
}

export interface DailyTakings {
  date: string;
  totalMillimes: number;
  count: number;
  byMethod: Record<PaymentMethod, number>;
  /** Every payment dated that day, cancelled ones included (they don't count in totals). */
  payments: Payment[];
}

export class PaymentRepository {
  constructor(private db: DB) {}

  get(id: string): Payment | null {
    const row = this.db.prepare(`${PAYMENT_SELECT} WHERE pay.id = ?`).get(id) as PaymentRow | undefined;
    return row ? toPayment(row) : null;
  }

  listForPatient(patientId: string): Payment[] {
    const rows = this.db.prepare(`${PAYMENT_SELECT} WHERE pay.patient_id = ? ORDER BY pay.paid_at DESC, pay.receipt_number DESC`)
      .all(patientId) as PaymentRow[];
    return rows.map(toPayment);
  }

  /** Records a payment; the REC number is allocated in the same transaction (gap-free). */
  create(input: PaymentInput, now: Date = new Date()): Payment {
    assertAmount(input.amountMillimes, 'amountMillimes');
    if (!PAYMENT_METHODS.includes(input.method)) throw new HttpError(400, 'method: unknown payment method');
    assertPatient(this.db, input.patientId);

    let paidAt = input.paidAt || localDateTime(now);
    if (/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
      paidAt = paidAt === localDate(now) ? localDateTime(now) : `${paidAt}T12:00`;
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(paidAt)) throw new HttpError(400, 'paidAt: expected YYYY-MM-DD or YYYY-MM-DDTHH:MM');
    if (paidAt.slice(0, 10) > localDate(now)) throw new HttpError(400, 'paidAt: a payment cannot be dated in the future');

    const id = newId('pay');
    this.db.transaction(() => {
      if (input.quoteId) {
        const quote = new QuoteRepository(this.db).get(input.quoteId);
        if (!quote) throw notFound('Quote');
        if (quote.patientId !== input.patientId) throw new HttpError(400, 'quoteId: the quote belongs to another patient');
        if (quote.status !== 'accepted') throw new HttpError(409, 'Payments can only be recorded against an accepted quote');
        if (input.amountMillimes > quote.remainingMillimes) {
          throw new HttpError(409, `Amount exceeds what remains on quote ${quote.number}`);
        }
      }
      const receiptNumber = nextDocumentNumber(this.db, 'REC', now);
      this.db.prepare(`
        INSERT INTO payments (id, receipt_number, patient_id, quote_id, amount_millimes, method, reference,
                              paid_at, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, receiptNumber, input.patientId, input.quoteId || null, input.amountMillimes, input.method,
        blankToNull(input.reference), paidAt, blankToNull(input.notes), nowIso());
    })();
    return this.get(id)!;
  }

  /** Cancelled payments stay on record (and visible) but no longer count. */
  cancel(id: string, reason: string): Payment {
    const current = this.get(id);
    if (!current) throw notFound('Payment');
    if (current.cancelledAt) throw new HttpError(409, 'This payment is already cancelled');
    const trimmed = (reason ?? '').trim();
    if (trimmed.length < 3) throw new HttpError(400, 'reason: a cancellation reason is required');
    this.db.prepare('UPDATE payments SET cancelled_at = ?, cancel_reason = ? WHERE id = ?').run(nowIso(), trimmed, id);
    return this.get(id)!;
  }

  balance(patientId: string): PatientBalance {
    assertPatient(this.db, patientId);
    const quotes = new QuoteRepository(this.db).listForPatient(patientId).filter(q => q.status === 'accepted');
    const paid = this.db.prepare(`
      SELECT
        COALESCE(SUM(amount_millimes), 0) AS total,
        COALESCE(SUM(CASE WHEN quote_id IS NULL THEN amount_millimes END), 0) AS outside
      FROM payments WHERE patient_id = ? AND cancelled_at IS NULL
    `).get(patientId) as { total: number; outside: number };
    const quotedMillimes = quotes.reduce((s, q) => s + q.totalMillimes, 0);
    const paidOnQuotesMillimes = quotes.reduce((s, q) => s + q.paidMillimes, 0);
    return {
      patientId,
      quotedMillimes,
      paidOnQuotesMillimes,
      paidOutsideQuotesMillimes: paid.outside,
      paidMillimes: paid.total,
      balanceDueMillimes: quotedMillimes - paidOnQuotesMillimes,
      quotes: quotes.map(q => ({
        quoteId: q.id, number: q.number, issuedAt: q.issuedAt,
        totalMillimes: q.totalMillimes, paidMillimes: q.paidMillimes, remainingMillimes: q.remainingMillimes
      }))
    };
  }

  /** Takings for one clinic-local day ('YYYY-MM-DD'), total and per method. */
  daily(date: string): DailyTakings {
    const rows = this.db.prepare(`
      ${PAYMENT_SELECT}
      WHERE pay.paid_at >= ? AND pay.paid_at < date(?, '+1 day')
      ORDER BY pay.paid_at, pay.receipt_number
    `).all(date, date) as PaymentRow[];
    const payments = rows.map(toPayment);
    const byMethod = Object.fromEntries(PAYMENT_METHODS.map(m => [m, 0])) as Record<PaymentMethod, number>;
    let totalMillimes = 0;
    let count = 0;
    for (const p of payments) {
      if (p.cancelledAt) continue;
      byMethod[p.method] += p.amountMillimes;
      totalMillimes += p.amountMillimes;
      count++;
    }
    return { date, totalMillimes, count, byMethod, payments };
  }
}
