import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, type DB } from '../../db/connection.js';
import { PatientRepository } from '../../repositories/patients.js';
import { DrugRepository, PrescriptionRepository } from './repository.js';
import { checkPrescriptionSafety } from './safety.js';
import { issuePrescription, renewalItems } from './service.js';
import { seedDemo } from './demo.js';

// In-memory database seeded with the demo patients: pt_1 (no allergy),
// pt_2 Fatma Trabelsi (allergy "Pénicilline (urticaire)", on Aspirine 100 mg).
function setup(): { db: DB; patients: PatientRepository } {
  const db = openDatabase(':memory:');
  const patients = new PatientRepository(db, { legacyJsonFile: null });
  return { db, patients };
}

const amoxicillin = { drugLabel: 'Amoxicilline', strength: '1 g', dosage: '1 comprimé 2 fois par jour', duration: '7 jours' };
const paracetamol = { drugLabel: 'Paracétamol', strength: '1 g', dosage: '1 comprimé si douleur', duration: '5 jours' };
const ibuprofen = { drugLabel: 'Ibuprofène', strength: '400 mg', dosage: '1 comprimé 3 fois par jour' };

test('French drug name "Amoxicilline 1 g" is caught against the French allergy "Pénicilline"', () => {
  const { patients } = setup();
  const { alerts, hasCritical } = checkPrescriptionSafety(patients.getPatientOrThrow('pt_2'), [amoxicillin], 'fr');
  assert.equal(hasCritical, true);
  assert.equal(alerts[0].source, 'allergy');
  assert.match(alerts[0].message, /pénicilline/i);
  assert.equal(alerts[0].drugLabel, 'Amoxicilline 1 g');
});

test('a critical alert blocks issuing and nothing is written', () => {
  const { db, patients } = setup();
  const result = issuePrescription(db, patients.getPatientOrThrow('pt_2'), { items: [amoxicillin] });
  assert.equal(result.status, 'blocked');
  assert.ok(result.alerts.some(a => a.severity === 'critical'));
  assert.equal(new PrescriptionRepository(db).listForPatient('pt_2').length, 0);
  // No number was consumed either.
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM document_counters WHERE kind = 'ORD'").get() as { n: number }).n, 0);
});

test('an NSAID for a patient on aspirin is blocked (interaction alert)', () => {
  const { db, patients } = setup();
  const result = issuePrescription(db, patients.getPatientOrThrow('pt_2'), { items: [paracetamol, ibuprofen] });
  assert.equal(result.status, 'blocked');
  assert.ok(result.alerts.some(a => a.source === 'interaction' && a.severity === 'critical'));
});

test('acknowledgeCriticalAlerts issues the prescription and records the override', () => {
  const { db, patients } = setup();
  const result = issuePrescription(db, patients.getPatientOrThrow('pt_2'), {
    items: [amoxicillin], acknowledgeCriticalAlerts: true
  });
  assert.equal(result.status, 'issued');
  if (result.status !== 'issued') return;
  const stored = new PrescriptionRepository(db).get(result.prescription.id)!;
  assert.equal(stored.criticalAlertsOverridden, true);
  assert.ok(stored.safetyAlerts.some(a => a.severity === 'critical' && a.source === 'allergy'));
  assert.equal(stored.patientName, 'Fatma Trabelsi');
  assert.equal(stored.patientAge, 67);
});

test('a safe prescription is issued without override and numbered ORD-YYYY-NNNN sequentially', () => {
  const { db, patients } = setup();
  const pt2 = patients.getPatientOrThrow('pt_2');
  const first = issuePrescription(db, pt2, { items: [paracetamol], language: 'ar' });
  const second = issuePrescription(db, patients.getPatientOrThrow('pt_1'), { items: [ibuprofen] });
  assert.equal(first.status, 'issued');
  assert.equal(second.status, 'issued');
  if (first.status !== 'issued' || second.status !== 'issued') return;
  const year = new Date().getFullYear();
  assert.equal(first.prescription.number, `ORD-${year}-0001`);
  assert.equal(second.prescription.number, `ORD-${year}-0002`);
  assert.equal(first.prescription.criticalAlertsOverridden, false);
  assert.equal(first.prescription.language, 'ar');
});

test('issued prescriptions are immutable: no update/delete method, and SQL rejects changes', () => {
  const { db, patients } = setup();
  const result = issuePrescription(db, patients.getPatientOrThrow('pt_1'), { items: [paracetamol] });
  assert.equal(result.status, 'issued');
  if (result.status !== 'issued') return;
  const repo = new PrescriptionRepository(db) as unknown as Record<string, unknown>;
  for (const method of ['update', 'delete', 'remove', 'cancel']) assert.equal(repo[method], undefined);

  const id = result.prescription.id;
  assert.throws(() => db.prepare("UPDATE prescriptions SET notes = 'x' WHERE id = ?").run(id), /immutable/);
  assert.throws(() => db.prepare('DELETE FROM prescriptions WHERE id = ?').run(id), /immutable/);
  assert.throws(() => db.prepare("UPDATE prescription_items SET dosage = 'x' WHERE prescription_id = ?").run(id), /immutable/);
  assert.throws(() => db.prepare('DELETE FROM prescription_items WHERE prescription_id = ?').run(id), /immutable/);
});

test('renew copies every line into a new prescription linked to the original', () => {
  const { db, patients } = setup();
  const pt1 = patients.getPatientOrThrow('pt_1');
  const original = issuePrescription(db, pt1, {
    items: [
      { ...paracetamol, quantity: '1 boîte', instructionsAr: 'قرص واحد عند الألم' },
      { ...ibuprofen, form: 'comprimé', duration: '3 jours' }
    ],
    language: 'fr_ar'
  });
  assert.equal(original.status, 'issued');
  if (original.status !== 'issued') return;

  const renewed = issuePrescription(db, pt1, {
    items: renewalItems(original.prescription),
    renewedFromId: original.prescription.id,
    language: original.prescription.language
  });
  assert.equal(renewed.status, 'issued');
  if (renewed.status !== 'issued') return;
  assert.notEqual(renewed.prescription.number, original.prescription.number);
  assert.equal(renewed.prescription.renewedFromId, original.prescription.id);
  const strip = (items: typeof original.prescription.items) => items.map(({ id: _id, ...rest }) => rest);
  assert.deepEqual(strip(renewed.prescription.items), strip(original.prescription.items));
  assert.equal(renewed.prescription.items[0].instructionsAr, 'قرص واحد عند الألم');
});

test('renewing for another patient is refused', () => {
  const { db, patients } = setup();
  const original = issuePrescription(db, patients.getPatientOrThrow('pt_1'), { items: [paracetamol] });
  if (original.status !== 'issued') return assert.fail('expected issued');
  assert.throws(() => issuePrescription(db, patients.getPatientOrThrow('pt_3'), {
    items: renewalItems(original.prescription), renewedFromId: original.prescription.id
  }), /does not belong/);
});

test('drug catalog: create, edit, deactivate', () => {
  const { db } = setup();
  const drugs = new DrugRepository(db);
  const drug = drugs.create({ dci: ' Clindamycine ', strength: '300 mg', category: 'antibiotique', brand: '' });
  assert.equal(drug.dci, 'Clindamycine');
  assert.equal(drug.brand, null);
  assert.equal(drugs.update(drug.id, { defaultDuration: '7 jours' })!.strength, '300 mg');
  drugs.update(drug.id, { active: false });
  assert.equal(drugs.list().length, 0);
  assert.equal(drugs.list({ includeInactive: true }).length, 1);
});

test('demo seed: drugs by DCI without brands, one past prescription for pt_1, idempotent', () => {
  const { db } = setup();
  seedDemo(db);
  seedDemo(db);
  const drugs = new DrugRepository(db).list();
  assert.ok(drugs.length >= 15);
  assert.ok(drugs.every(d => d.brand === null && d.defaultDosage && d.defaultInstructionsAr));
  const history = new PrescriptionRepository(db).listForPatient('pt_1');
  assert.equal(history.length, 1);
  assert.equal(history[0].items.length, 2);
});
