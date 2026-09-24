import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../db/connection.js';
import { PatientRepository } from '../repositories/patients.js';
import { seedDemo as seedBilling } from '../features/billing/demo.js';
import { AppointmentRepository, setAgendaSettings } from '../features/agenda/repository.js';
import { detokenize, runAssistantTools, tokenizePatients, type ToolContext } from './assistant-tools.js';

function setup() {
  const db = openDatabase(':memory:');
  const repo = new PatientRepository(db, { legacyJsonFile: null });
  seedBilling(db);
  setAgendaSettings(db, { chairs: ['Fauteuil 1', 'Fauteuil 2'] });
  const patients = repo.getAllPatients();
  const ctx = (message: string, lang: 'fr' | 'en' = 'fr'): ToolContext & { text: string } => {
    const { text, refs } = tokenizePatients(message, patients, 'pt_1');
    return { db, patients, activeId: 'pt_1', refs, lang, text, now: new Date(2026, 8, 24, 9, 0) };
  };
  return { db, patients, ctx };
}

// --- Privacy: names never reach the model ------------------------------------------

test('patient names become codes; the model never sees them', () => {
  const { ctx } = setup();
  const c = ctx('Combien doit encore Mohamed Ben Salah ? Et fatma trabelsi ?');
  assert.equal(c.text, 'Combien doit encore P1 ? Et P2 ?');
  assert.equal(c.refs.P1, 'pt_1');
  assert.equal(c.refs.P2, 'pt_2');
});

test('accents and a lone unambiguous first name are recognised; ambiguous parts are not', () => {
  const { ctx } = setup();
  assert.equal(ctx('Encaisser 50 DT pour Fatma').text, 'Encaisser 50 DT pour P1');
  // "Youssef" is Youssef Gharbi's first name and part of Lina Ben Youssef's name: ambiguous.
  assert.equal(ctx('Rendez-vous pour Youssef').text, 'Rendez-vous pour Youssef');
  assert.equal(ctx('Et Lina ?').text, 'Et P1 ?');
});

test('codes in the model answer are turned back into names', () => {
  const { ctx, patients } = setup();
  const c = ctx('Fatma Trabelsi');
  assert.equal(detokenize('P1 a une allergie ; ACTIVE non.', c.refs, patients), 'Fatma Trabelsi a une allergie ; Mohamed Ben Salah non.');
});

// --- Reads: answered locally, exact figures ------------------------------------------

test('balance question: exact amounts from the billing data', () => {
  const { ctx } = setup();
  const c = ctx('Combien doit Mohamed Ben Salah ?');
  const { reply, proposal } = runAssistantTools([{ name: 'get_balance', args: { patient: 'P1' } }], c);
  assert.equal(proposal, undefined);
  assert.match(reply, /Mohamed Ben Salah/);
  assert.match(reply, /reste à payer : \*\*300,000 DT\*\*/);
  assert.match(reply, /DV-2026-0001/);
  // The last payments answer « quand a-t-il payé ? » without another tool.
  assert.match(reply, /Derniers règlements :\n- \d{2}\/\d{2}\/\d{4} : [\d ]+,\d{3} DT/);
});

test('patient summary lists allergies, medications and balance', () => {
  const { ctx } = setup();
  const { reply } = runAssistantTools([{ name: 'get_patient_summary', args: { patient: 'ACTIVE' } }], ctx('ce patient'));
  assert.match(reply, /Amlodipine 5 mg/);
  assert.match(reply, /Reste à payer : 300,000 DT/);
});

test('an unknown patient code gets a clear message instead of a guess', () => {
  const { ctx } = setup();
  const { reply, proposal } = runAssistantTools([{ name: 'get_balance', args: { patient: 'P7' } }], ctx('x'));
  assert.equal(proposal, undefined);
  assert.match(reply, /pas reconnu le patient/);
});

// --- Writes: proposals only, in the normal API format ---------------------------------

test('payment: proposal linked to the single open quote, nothing written yet', () => {
  const { ctx, db } = setup();
  const before = (db.prepare('SELECT COUNT(*) AS n FROM payments').get() as { n: number }).n;
  const { proposal } = runAssistantTools([{ name: 'record_payment', args: { patient: 'ACTIVE', amountDinars: 200, method: 'cash' } }], ctx('x'));
  assert.ok(proposal);
  assert.equal(proposal!.request.url, '/api/payments');
  assert.equal(proposal!.request.body.amountMillimes, 200_000);
  assert.ok(proposal!.request.body.quoteId, 'linked to the open quote');
  assert.match(proposal!.summary, /reste ensuite 100,000 DT/);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM payments').get() as { n: number }).n, before);
});

test('payment larger than what remains is refused with the amount left', () => {
  const { ctx } = setup();
  const { reply, proposal } = runAssistantTools([{ name: 'record_payment', args: { patient: 'ACTIVE', amountDinars: 900, method: 'cash' } }], ctx('x'));
  assert.equal(proposal, undefined);
  assert.match(reply, /dépasse le reste à payer.*300,000 DT/);
});

test('quote: catalog price is used and the FDI tooth kept', () => {
  const { ctx } = setup();
  const { proposal } = runAssistantTools([{
    name: 'create_quote',
    args: { patient: 'ACTIVE', items: [{ label: 'couronne céramo-métallique', tooth: 36 }, { label: 'Acte inconnu' }] }
  }], ctx('x'));
  const items = proposal!.request.body.items as Array<{ label: string; toothFdi: number | null; unitPriceMillimes: number }>;
  assert.equal(items[0].label, 'Couronne céramo-métallique');
  assert.equal(items[0].toothFdi, 36);
  assert.ok(items[0].unitPriceMillimes > 0);
  assert.equal(items[1].unitPriceMillimes, 0);
  assert.match(proposal!.summary, /Prix à compléter/);
});

test('appointment: date/time checked and a free chair chosen', () => {
  const { ctx } = setup();
  const { proposal } = runAssistantTools([{ name: 'create_appointment', args: { patient: 'ACTIVE', date: '2026-09-25', time: '10:00', reason: 'Contrôle' } }], ctx('x'));
  assert.deepEqual(proposal!.request.body, { patientId: 'pt_1', startAt: '2026-09-25T10:00', durationMinutes: 30, chair: 'Fauteuil 1', reason: 'Contrôle' });
  const bad = runAssistantTools([{ name: 'create_appointment', args: { patient: 'ACTIVE', date: '2026-02-30', time: '10:00' } }], ctx('x'));
  assert.equal(bad.proposal, undefined);
});

test('tooth: FDI number mapped to the chart id (permanent and primary)', () => {
  const { ctx } = setup();
  const permanent = runAssistantTools([{ name: 'update_tooth', args: { tooth: 46, status: 'caries' } }], ctx('x'));
  assert.equal(permanent.proposal!.request.body.toothId, 30);
  const primary = runAssistantTools([{ name: 'update_tooth', args: { tooth: 75, status: 'caries' } }], ctx('x'));
  assert.equal(primary.proposal!.request.body.toothId, 75);
});

test('only one action is proposed at a time; reads still answered alongside', () => {
  const { ctx } = setup();
  const { reply, proposal } = runAssistantTools([
    { name: 'get_daily_takings', args: {} },
    { name: 'update_tooth', args: { tooth: 46, status: 'caries' } },
    { name: 'update_tooth', args: { tooth: 47, status: 'caries' } }
  ], ctx('x'));
  assert.match(reply, /Encaissements du 24\/09\/2026/);
  assert.equal(proposal!.request.body.toothId, 30);
  assert.doesNotMatch(reply, /dent 47/);
});

test('patient summary shows the next appointment and no repeated dose', () => {
  const { ctx, db } = setup();
  new AppointmentRepository(db).create({ patientId: 'pt_2', startAt: '2026-09-25T10:00', durationMinutes: 45, chair: 'Fauteuil 1', reason: 'Endodontie' });
  const { reply } = runAssistantTools([{ name: 'get_patient_summary', args: { patient: 'P1' } }], ctx('Fatma Trabelsi'));
  assert.match(reply, /Prochain rendez-vous : 25\/09\/2026 à 10:00 \(Endodontie\)/);
  assert.doesNotMatch(reply, /100 mg 100 mg/);
});

test('a medication already on the list is not proposed again', () => {
  const { ctx } = setup();
  const { reply, proposal } = runAssistantTools([{ name: 'add_medication', args: { name: 'amlodipine 5 mg' } }], ctx('x'));
  assert.equal(proposal, undefined);
  assert.match(reply, /figure déjà/);
});

test('a cheque payment asks for the cheque number, then carries it to the receipt', () => {
  const { ctx } = setup();
  const missing = runAssistantTools([{ name: 'record_payment', args: { patient: 'ACTIVE', amountDinars: 100, method: 'cheque' } }], ctx('x'));
  assert.equal(missing.proposal, undefined);
  assert.match(missing.reply, /numéro/);
  const ok = runAssistantTools([{ name: 'record_payment', args: { patient: 'ACTIVE', amountDinars: 100, method: 'cheque', reference: '4521087' } }], ctx('x'));
  assert.equal(ok.proposal!.request.body.reference, '4521087');
  assert.match(ok.proposal!.summary, /chèque n° 4521087/);
});

test('an appointment on a closed day or outside opening hours is proposed with a warning', () => {
  const { ctx } = setup();
  // Default hours: Monday-Saturday, 08:30-18:00. 2026-09-27 is a Sunday.
  const sunday = runAssistantTools([{ name: 'create_appointment', args: { patient: 'ACTIVE', date: '2026-09-27', time: '10:00' } }], ctx('x'));
  assert.match(sunday.proposal!.summary, /fermé ce jour-là/);
  const late = runAssistantTools([{ name: 'create_appointment', args: { patient: 'ACTIVE', date: '2026-09-28', time: '19:30' } }], ctx('x'));
  assert.match(late.proposal!.summary, /En dehors des horaires/);
  const normal = runAssistantTools([{ name: 'create_appointment', args: { patient: 'ACTIVE', date: '2026-09-28', time: '10:00' } }], ctx('x'));
  assert.doesNotMatch(normal.proposal!.summary, /⚠️/);
});
