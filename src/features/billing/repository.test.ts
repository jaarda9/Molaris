import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, DB } from '../../db/connection.js';
import { PatientRepository } from '../../repositories/patients.js';
import { HttpError } from '../../routes/http.js';
import {
  addDays, isValidFdiTooth, lineTotal, localDate, PaymentRepository, ProcedureRepository, QuoteRepository
} from './repository.js';
import { seedDemo } from './demo.js';

/** In-memory database with the three demo patients (pt_1, pt_2, pt_3). */
function setup() {
  const db = openDatabase(':memory:');
  new PatientRepository(db, { legacyJsonFile: null });
  return { db, quotes: new QuoteRepository(db), payments: new PaymentRepository(db), procedures: new ProcedureRepository(db) };
}

const status = (code: number) => (err: unknown) => err instanceof HttpError && err.status === code;

function acceptedQuote(quotes: QuoteRepository, patientId = 'pt_1', unitPriceMillimes = 1_000_000) {
  const q = quotes.create({ patientId, items: [{ label: 'Couronne', toothFdi: 36, quantity: 1, unitPriceMillimes }] });
  return quotes.setStatus(q.id, 'accepted');
}

test('quote totals apply quantity and per-line discount, to the millime', () => {
  const { quotes } = setup();
  const q = quotes.create({
    patientId: 'pt_1',
    items: [
      { label: 'Composite 1 face', toothFdi: 16, quantity: 2, unitPriceMillimes: 80_500, discountMillimes: 1_001 },
      { label: 'Détartrage', quantity: 1, unitPriceMillimes: 80_000 },
      { label: 'Consultation offerte', quantity: 1, unitPriceMillimes: 40_000, discountMillimes: 40_000 }
    ]
  });
  assert.deepEqual(q.items.map(i => i.totalMillimes), [159_999, 80_000, 0]);
  assert.equal(q.totalMillimes, 239_999);
  assert.equal(q.remainingMillimes, 239_999);
  assert.equal(lineTotal({ quantity: 3, unitPriceMillimes: 333, discountMillimes: 1 }), 998);
  assert.equal(q.status, 'draft');
  assert.match(q.number, /^DV-\d{4}-0001$/);
});

test('quote validity defaults to 30 days after the issue date', () => {
  const { quotes } = setup();
  const q = quotes.create({ patientId: 'pt_1', items: [] }, new Date(2020, 0, 15, 10));
  assert.equal(q.issuedAt, '2020-01-15');
  assert.equal(q.validUntil, '2020-02-14');
  assert.equal(q.pastValidity, true);
});

test('quote lines are rejected when invalid', () => {
  const { quotes } = setup();
  const base = { label: 'Acte', quantity: 1, unitPriceMillimes: 10_000 };
  assert.throws(() => quotes.create({ patientId: 'pt_1', items: [{ ...base, discountMillimes: 10_001 }] }), status(400));
  assert.throws(() => quotes.create({ patientId: 'pt_1', items: [{ ...base, quantity: 0 }] }), status(400));
  assert.throws(() => quotes.create({ patientId: 'pt_1', items: [{ ...base, unitPriceMillimes: -1 }] }), status(400));
  assert.throws(() => quotes.create({ patientId: 'pt_1', items: [{ ...base, unitPriceMillimes: 10.5 }] }), status(400));
  assert.throws(() => quotes.create({ patientId: 'pt_1', items: [{ ...base, toothFdi: 19 }] }), status(400));
  assert.throws(() => quotes.create({ patientId: 'nobody', items: [base] }), status(404));
  assert.ok(isValidFdiTooth(11) && isValidFdiTooth(48) && isValidFdiTooth(85));
  assert.ok(!isValidFdiTooth(10) && !isValidFdiTooth(49) && !isValidFdiTooth(56) && !isValidFdiTooth(91));
});

test('quote lines are editable while draft only; statuses follow the allowed transitions', () => {
  const { quotes } = setup();
  const q = quotes.create({ patientId: 'pt_1', items: [{ label: 'A', quantity: 1, unitPriceMillimes: 1_000 }] });
  const edited = quotes.update(q.id, { items: [{ label: 'B', quantity: 2, unitPriceMillimes: 1_500 }], notes: 'x' });
  assert.equal(edited.totalMillimes, 3_000);
  assert.equal(edited.items[0].label, 'B');

  quotes.setStatus(q.id, 'sent');
  assert.throws(() => quotes.update(q.id, { notes: 'y' }), status(409));
  assert.throws(() => quotes.setStatus(q.id, 'draft'), status(409));
  quotes.setStatus(q.id, 'accepted');
  assert.throws(() => quotes.setStatus(q.id, 'refused'), status(409));

  const empty = quotes.create({ patientId: 'pt_1', items: [] });
  assert.throws(() => quotes.setStatus(empty.id, 'accepted'), status(409));

  const copy = quotes.duplicate(q.id);
  assert.equal(copy.status, 'draft');
  assert.equal(copy.totalMillimes, 3_000);
  assert.notEqual(copy.number, q.number);
});

test('payments reject invalid amounts', () => {
  const { payments } = setup();
  for (const amountMillimes of [0, -500, 12.5, Number.NaN, 1_000_000_001]) {
    assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes, method: 'cash' }), status(400), `amount=${amountMillimes}`);
  }
  assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes: 1_000, method: 'bitcoin' as any }), status(400));
  assert.throws(() => payments.create({ patientId: 'nobody', amountMillimes: 1_000, method: 'cash' }), status(404));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes: 1_000, method: 'cash', paidAt: localDate(tomorrow) }), status(400));
});

test('installments against a quote: only accepted quotes, same patient, never more than what remains', () => {
  const { quotes, payments } = setup();
  const draft = quotes.create({ patientId: 'pt_1', items: [{ label: 'A', quantity: 1, unitPriceMillimes: 100_000 }] });
  assert.throws(() => payments.create({ patientId: 'pt_1', quoteId: draft.id, amountMillimes: 1_000, method: 'cash' }), status(409));

  const q = acceptedQuote(quotes, 'pt_1', 1_000_000);
  assert.throws(() => payments.create({ patientId: 'pt_2', quoteId: q.id, amountMillimes: 1_000, method: 'cash' }), status(400));

  payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 400_000, method: 'cash' });
  payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 300_500, method: 'cheque', reference: '123' });
  assert.equal(quotes.get(q.id)!.paidMillimes, 700_500);
  assert.equal(quotes.get(q.id)!.remainingMillimes, 299_500);
  assert.throws(() => payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 299_501, method: 'cash' }), status(409));
  payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 299_500, method: 'card' });
  assert.equal(quotes.get(q.id)!.remainingMillimes, 0);
});

test('balance ignores cancelled payments; cancelled payments stay on record', () => {
  const { quotes, payments } = setup();
  const q = acceptedQuote(quotes, 'pt_1', 1_000_000);
  quotes.create({ patientId: 'pt_1', items: [{ label: 'Draft, not counted', quantity: 1, unitPriceMillimes: 500_000 }] });
  const p1 = payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 400_000, method: 'cash' });
  const mistaken = payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 250_000, method: 'cash' });
  payments.create({ patientId: 'pt_1', amountMillimes: 40_000, method: 'card' });

  assert.throws(() => payments.cancel(mistaken.id, ''), status(400));
  const cancelled = payments.cancel(mistaken.id, 'Saisie en double');
  assert.ok(cancelled.cancelledAt);
  assert.equal(cancelled.cancelReason, 'Saisie en double');
  assert.throws(() => payments.cancel(mistaken.id, 'again'), status(409));

  const balance = payments.balance('pt_1');
  assert.equal(balance.quotedMillimes, 1_000_000);
  assert.equal(balance.paidOnQuotesMillimes, 400_000);
  assert.equal(balance.paidOutsideQuotesMillimes, 40_000);
  assert.equal(balance.paidMillimes, 440_000);
  assert.equal(balance.balanceDueMillimes, 600_000);
  assert.deepEqual(balance.quotes.map(x => x.remainingMillimes), [600_000]);

  // Still listed, and the cancelled amount can be collected again.
  assert.equal(payments.listForPatient('pt_1').length, 3);
  payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 600_000, method: 'transfer' });
  assert.equal(payments.balance('pt_1').balanceDueMillimes, 0);
  assert.equal(p1.amountInWords, 'quatre cents dinars');
});

test('the database itself refuses to delete, edit or un-cancel a payment', () => {
  const { db, payments } = setup();
  const p = payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash' });
  assert.throws(() => db.prepare('DELETE FROM payments WHERE id = ?').run(p.id), /never deleted/);
  assert.throws(() => db.prepare('UPDATE payments SET amount_millimes = 1 WHERE id = ?').run(p.id), /immutable/);
  assert.throws(() => db.prepare("UPDATE payments SET cancelled_at = 'x', cancel_reason = '' WHERE id = ?").run(p.id), /reason/);
  payments.cancel(p.id, 'Erreur de patient');
  assert.throws(() => db.prepare('UPDATE payments SET cancelled_at = NULL WHERE id = ?').run(p.id), /cannot be restored/);
  assert.throws(() => db.prepare('DELETE FROM patients WHERE id = ?').run('pt_1'), /FOREIGN KEY/);
});

test('receipt and quote numbers are gap-free: failed inserts do not consume a number', () => {
  const { quotes, payments } = setup();
  const q = acceptedQuote(quotes, 'pt_1', 100_000);
  const numbers: string[] = [];
  numbers.push(payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 50_000, method: 'cash' }).receiptNumber);
  assert.throws(() => payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 60_000, method: 'cash' }), status(409));
  numbers.push(payments.create({ patientId: 'pt_2', amountMillimes: 40_000, method: 'card' }).receiptNumber);
  numbers.push(payments.create({ patientId: 'pt_3', amountMillimes: 40_000, method: 'cash' }).receiptNumber);
  const year = new Date().getFullYear();
  assert.deepEqual(numbers, [`REC-${year}-0001`, `REC-${year}-0002`, `REC-${year}-0003`]);

  assert.throws(() => quotes.create({ patientId: 'pt_1', items: [{ label: 'x', quantity: 1, unitPriceMillimes: 1, discountMillimes: 2 }] }), status(400));
  assert.equal(quotes.create({ patientId: 'pt_2', items: [] }).number, `DV-${year}-0002`);
});

test('daily takings: total and per method for one day, cancelled payments shown but not counted', () => {
  const { payments } = setup();
  const day = new Date(2026, 8, 22, 23, 59); // end of that day: every payment below is in the past
  payments.create({ patientId: 'pt_1', amountMillimes: 100_000, method: 'cash', paidAt: '2026-09-22T09:00' }, day);
  payments.create({ patientId: 'pt_2', amountMillimes: 25_500, method: 'cash', paidAt: '2026-09-22T23:59' }, day);
  payments.create({ patientId: 'pt_3', amountMillimes: 300_000, method: 'cheque', reference: '77', paidAt: '2026-09-22T10:00' }, day);
  const wrong = payments.create({ patientId: 'pt_3', amountMillimes: 999_000, method: 'card', paidAt: '2026-09-22T11:00' }, day);
  payments.cancel(wrong.id, 'Mauvais montant');
  payments.create({ patientId: 'pt_1', amountMillimes: 1_000, method: 'cash', paidAt: '2026-09-21T23:59' }, day);
  payments.create({ patientId: 'pt_1', amountMillimes: 2_000, method: 'cash', paidAt: '2026-09-23T00:00' }, new Date(2026, 8, 23, 8));

  const daily = payments.daily('2026-09-22');
  assert.equal(daily.totalMillimes, 425_500);
  assert.equal(daily.count, 3);
  assert.deepEqual(daily.byMethod, { cash: 125_500, cheque: 300_000, card: 0, transfer: 0, other: 0 });
  assert.equal(daily.payments.length, 4);
  assert.equal(daily.payments.filter(p => p.cancelledAt).length, 1);
});

test('a past date without a time is recorded at noon; today uses the current time', () => {
  const { payments } = setup();
  const now = new Date(2026, 8, 23, 15, 42);
  assert.equal(payments.create({ patientId: 'pt_1', amountMillimes: 1_000, method: 'cash', paidAt: '2026-09-20' }, now).paidAt, '2026-09-20T12:00');
  assert.equal(payments.create({ patientId: 'pt_1', amountMillimes: 1_000, method: 'cash', paidAt: '2026-09-23' }, now).paidAt, '2026-09-23T15:42');
});

test('catalog: create, edit, deactivate (never delete), and price validation', () => {
  const { procedures } = setup();
  const p = procedures.create({ labelFr: 'Consultation', category: 'Consultation', defaultPriceMillimes: 40_000, code: '  ' });
  assert.equal(p.code, null);
  assert.equal(procedures.update(p.id, { defaultPriceMillimes: 45_000 }).defaultPriceMillimes, 45_000);
  procedures.update(p.id, { active: false });
  assert.equal(procedures.list().length, 0);
  assert.equal(procedures.list({ includeInactive: true }).length, 1);
  assert.throws(() => procedures.create({ labelFr: 'X', defaultPriceMillimes: -1 }), status(400));
  assert.throws(() => procedures.create({ labelFr: ' ', defaultPriceMillimes: 1 }), status(400));
  assert.throws(() => procedures.update('nope', { active: false }), status(404));
});

test('demo data seeds a consistent billing history', () => {
  const db: DB = openDatabase(':memory:');
  new PatientRepository(db, { legacyJsonFile: null });
  db.transaction(() => seedDemo(db))();
  const payments = new PaymentRepository(db);
  const procedures = new ProcedureRepository(db).list();
  assert.ok(procedures.length >= 20);
  assert.ok(procedures.every(p => p.code === null && p.cnamKeyLetter === null && p.cnamCoefficient === null), 'no invented CNAM codes');
  const balance = payments.balance('pt_1');
  assert.equal(balance.quotedMillimes, 1_000_000);
  assert.equal(balance.balanceDueMillimes, 300_000);
  assert.equal(new QuoteRepository(db).listForPatient('pt_2')[0].status, 'draft');
  assert.equal(payments.daily(localDate()).totalMillimes, 395_000);
});

test('impossible dates and times are rejected (31 February, 25:99)', () => {
  const { quotes, payments } = setup();
  assert.throws(() => quotes.create({ patientId: 'pt_1', validUntil: '2099-02-31', items: [] }), status(400));
  assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash', paidAt: '2026-02-30' }), status(400));
  assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash', paidAt: '2026-01-10T25:99' }), status(400));
  assert.equal(payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash', paidAt: '2024-02-29T09:30' }, new Date(2024, 2, 1, 10)).paidAt, '2024-02-29T09:30');
});

test('a payment cannot be dated before its quote was issued', () => {
  const { quotes, payments } = setup();
  const q = acceptedQuote(quotes);
  const err = (() => { try { payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 10_000, method: 'cash', paidAt: addDays(localDate(), -1) }); } catch (e) { return e as HttpError; } })();
  assert.ok(err instanceof HttpError && err.status === 400);
  assert.match(err!.message, /avant le devis/);
});

test('a payment cannot be dated later than now, even today', () => {
  const { payments } = setup();
  const now = new Date(2026, 8, 24, 10, 0);
  assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash', paidAt: '2026-09-24T23:59' }, now), status(400));
  assert.equal(payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash', paidAt: '2026-09-24T09:55' }, now).paidAt, '2026-09-24T09:55');
});

test('a payment more than a year old is refused (usually a mistyped year)', () => {
  const { payments } = setup();
  const now = new Date(2026, 8, 24, 10, 0);
  assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash', paidAt: '2025-09-01' }, now), status(400));
  assert.ok(payments.create({ patientId: 'pt_1', amountMillimes: 10_000, method: 'cash', paidAt: '2026-01-10' }, now));
});

test('a cheque needs its number', () => {
  const { payments } = setup();
  assert.throws(() => payments.create({ patientId: 'pt_1', amountMillimes: 50_000, method: 'cheque' }), status(400));
  assert.equal(payments.create({ patientId: 'pt_1', amountMillimes: 50_000, method: 'cheque', reference: '4521087' }).reference, '4521087');
});

test('payment errors are in French for the clinic UI', () => {
  const { quotes, payments } = setup();
  const q = acceptedQuote(quotes, 'pt_1', 100_000);
  const message = (fn: () => unknown) => { try { fn(); return ''; } catch (e) { return (e as Error).message; } };
  assert.match(message(() => payments.create({ patientId: 'pt_1', quoteId: q.id, amountMillimes: 100_001, method: 'cash' })), /dépasse le reste à payer.*100,000 DT/);
  const draft = quotes.create({ patientId: 'pt_1', items: [{ label: 'Détartrage', quantity: 1, unitPriceMillimes: 80_000 }] });
  assert.match(message(() => payments.create({ patientId: 'pt_1', quoteId: draft.id, amountMillimes: 1_000, method: 'cash' })), /devis accepté/);
});

test('an expired quote cannot be accepted at its old prices (duplicate it instead)', () => {
  const { quotes } = setup();
  const old = quotes.create({ patientId: 'pt_1', validUntil: '2026-01-31', items: [{ label: 'Couronne', quantity: 1, unitPriceMillimes: 500_000 }] }, new Date(2026, 0, 5));
  quotes.setStatus(old.id, 'sent');
  const err = (() => { try { quotes.setStatus(old.id, 'accepted'); } catch (e) { return e as HttpError; } })();
  assert.ok(err instanceof HttpError && err.status === 409);
  assert.match(err!.message, /expiré/);
  assert.equal(quotes.setStatus(quotes.duplicate(old.id).id, 'accepted').status, 'accepted');
});
