import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openDatabase } from '../db/connection.js';
import { PatientRepository } from './patients.js';
import { ageOn } from '../domain/age.js';

function freshRepo() {
  const db = openDatabase(':memory:');
  return { db, repo: new PatientRepository(db, { legacyJsonFile: null }) };
}

test('a fresh database is seeded with the demo patients and an active patient', () => {
  const { repo } = freshRepo();
  assert.equal(repo.getAllPatients().length, 4);
  assert.equal(repo.getActivePatient().id, 'pt_1');
});

test('writes persist: a new repository on the same database sees them', () => {
  const { db, repo } = freshRepo();
  const created = repo.createPatient({ name: 'Amira Jlassi', age: 31, phone: '+216 20 111 222' });
  repo.addMedicationForActivePatient({ name: 'Paracétamol 1 g', dosage: '1 g', frequency: '3x/j' });

  const reopened = new PatientRepository(db, { legacyJsonFile: null });
  const reloaded = reopened.getPatientById(created.id)!;
  assert.equal(reloaded.name, 'Amira Jlassi');
  assert.equal(reloaded.medications[0].name, 'Paracétamol 1 g');
  assert.equal(reopened.getActivePatient().id, created.id);

  const row = db.prepare('SELECT phone, chart_id FROM patients WHERE id = ?').get(created.id) as { phone: string; chart_id: string };
  assert.equal(row.phone, '+216 20 111 222');
  assert.match(row.chart_id, /^PT-\d{4}-\d{4}$/);
});

test('updatePatient cannot change the id or creation date', () => {
  const { repo } = freshRepo();
  // pt_3 has no birth date, so a typed age is kept (with a birth date, the age is derived).
  const before = repo.getPatientById('pt_3')!;
  const updated = repo.updatePatient('pt_3', { id: 'hijacked', createdAt: '1999-01-01', age: 68 } as any);
  assert.equal(updated.id, 'pt_3');
  assert.equal(updated.createdAt, before.createdAt);
  assert.equal(updated.age, 68);
});

test('a patient with financial records cannot be deleted', () => {
  const { db, repo } = freshRepo();
  db.prepare(`
    INSERT INTO quotes (id, number, patient_id, issued_at, created_at, updated_at)
    VALUES ('q1', 'DV-2026-0001', 'pt_2', '2026-01-01', '2026-01-01', '2026-01-01')
  `).run();
  assert.throws(() => repo.deletePatient('pt_2'), /ne peut pas être supprimé/);
  assert.ok(repo.getPatientById('pt_2'), 'patient must still exist after the refused delete');
  assert.equal(repo.deletePatient('pt_3'), true);
});

test('legacy patients-db.json is imported once and kept as a .migrated backup', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'molaris-'));
  const legacy = path.join(dir, 'patients-db.json');
  fs.writeFileSync(legacy, JSON.stringify({
    activePatientId: 'old_2',
    patients: [
      { id: 'old_1', chartId: 'PT-2025-001', name: 'Legacy One', age: 40, teeth: [], anesthesiaLog: [], soapNotes: [], consultHistory: [], createdAt: '2025-01-01', updatedAt: '2025-01-01' },
      { id: 'old_2', chartId: 'PT-2025-002', name: 'Legacy Two', age: 50, teeth: [], anesthesiaLog: [], soapNotes: [], consultHistory: [], createdAt: '2025-01-02', updatedAt: '2025-01-02' }
    ]
  }));

  const db = openDatabase(':memory:');
  const repo = new PatientRepository(db, { legacyJsonFile: legacy });
  assert.deepEqual(repo.getAllPatients().map(p => p.name), ['Legacy One', 'Legacy Two']);
  assert.equal(repo.getActivePatient().id, 'old_2');
  assert.deepEqual(repo.getPatientById('old_1')!.medications, [], 'newer fields are backfilled');
  assert.ok(!fs.existsSync(legacy));
  assert.ok(fs.existsSync(`${legacy}.migrated`));
});

test('primary teeth: stored apart from the 32 permanent teeth and updated by FDI number', () => {
  const { db, repo } = freshRepo();
  repo.setActivePatient('pt_1');
  const tooth = repo.updateToothForActivePatient(53, { status: 'sound', notes: 'Canine temporaire persistante.' });
  assert.equal(tooth.fdi, 53);
  assert.equal(repo.getActivePatient().teeth.length, 32);

  const reloaded = new PatientRepository(db, { legacyJsonFile: null }).getPatientById('pt_1')!;
  assert.equal(reloaded.primaryTeeth.find(t => t.id === 53)!.notes, 'Canine temporaire persistante.');
});

test('primary teeth: the visibility mode is saved on the chart', () => {
  const { db, repo } = freshRepo();
  repo.setActivePatient('pt_2');
  repo.setPrimaryTeethModeForActivePatient('shown');
  assert.equal(new PatientRepository(db, { legacyJsonFile: null }).getPatientById('pt_2')!.primaryTeethMode, 'shown');
});

test('primary teeth: records written before the feature are backfilled for the patient age', () => {
  const { db } = freshRepo();
  const row = db.prepare('SELECT data FROM patients WHERE id = ?').get('pt_1') as { data: string };
  const legacy = JSON.parse(row.data);
  delete legacy.primaryTeeth;
  delete legacy.primaryTeethMode;
  db.prepare('UPDATE patients SET data = ? WHERE id = ?').run(JSON.stringify(legacy), 'pt_1');

  const patient = new PatientRepository(db, { legacyJsonFile: null }).getPatientById('pt_1')!;
  assert.equal(patient.primaryTeeth.length, 20);
  assert.ok(patient.primaryTeeth.every(t => t.status === 'missing')); // adult: shed
  assert.equal(patient.primaryTeethMode, 'auto');
});

test('primary teeth: correcting the age re-derives them only while nothing was recorded', () => {
  const { repo } = freshRepo();
  const created = repo.createPatient({ name: 'Enfant Test', age: 35 });
  const corrected = repo.updatePatient(created.id, { age: 6 });
  assert.ok(corrected.primaryTeeth.every(t => t.status === 'sound'));

  repo.updateToothForActivePatient(75, { status: 'caries' });
  const older = repo.updatePatient(created.id, { age: 30 });
  assert.equal(older.primaryTeeth.find(t => t.id === 75)!.status, 'caries');
  assert.equal(older.primaryTeeth.find(t => t.id === 51)!.status, 'sound');
});

test('advisor conversation: saved per patient, survives a reload, capped, clearable', () => {
  const { db, repo } = freshRepo();
  repo.appendConsultMessages('pt_1', [{ role: 'user', content: 'Combien doit-il ?' }, { role: 'model', content: 'Reste 300,000 DT.' }]);
  repo.appendConsultMessages('pt_2', [{ role: 'user', content: 'Allergies ?' }]);

  const reopened = new PatientRepository(db, { legacyJsonFile: null });
  assert.deepEqual(reopened.getConsultHistory('pt_1').map(m => m.content), ['Combien doit-il ?', 'Reste 300,000 DT.']);
  assert.equal(reopened.getConsultHistory('pt_2').length, 1, 'each patient has their own conversation');

  for (let i = 0; i < 250; i++) reopened.appendConsultMessages('pt_1', [{ role: 'user', content: `q${i}` }]);
  const capped = reopened.getConsultHistory('pt_1');
  assert.equal(capped.length, 200);
  assert.equal(capped[capped.length - 1].content, 'q249');

  reopened.clearConsultHistory('pt_1');
  assert.equal(reopened.getConsultHistory('pt_1').length, 0);
  assert.equal(reopened.getConsultHistory('pt_2').length, 1);
});

test('a chart with clinical history cannot be deleted; an empty one (created by mistake) can', () => {
  const { db, repo } = freshRepo();
  // pt_1 has a signed SOAP note and an anesthesia log (demo data).
  assert.throws(() => repo.deletePatient('pt_1'), /ne peut pas être supprimé/);

  const empty = repo.createPatient({ name: 'Erreur de saisie' });
  assert.equal(repo.deletePatient(empty.id), true);

  const withVisit = repo.createPatient({ name: 'Patient vu' });
  db.prepare(`INSERT INTO appointments (id, patient_id, start_at, end_at, status, created_at, updated_at)
              VALUES ('apt_x', ?, '2020-01-10T10:00', '2020-01-10T10:30', 'completed', 'now', 'now')`).run(withVisit.id);
  assert.throws(() => repo.deletePatient(withVisit.id), /ne peut pas être supprimé/);
  assert.ok(db.prepare("SELECT 1 FROM appointments WHERE id = 'apt_x'").get(), 'the visit is still there');
});

test('with a birth date, the age is computed (and follows the calendar)', () => {
  const { repo } = freshRepo();
  const lina = repo.getPatientById('pt_4')!;
  assert.equal(lina.birthDate, '2019-05-14');
  assert.equal(lina.age, ageOn('2019-05-14'));

  const created = repo.createPatient({ name: 'Nouveau-né', birthDate: '2024-01-20', age: 99 });
  assert.equal(created.age, ageOn('2024-01-20'), 'the birth date wins over a typed age');

  const edited = repo.updatePatient(created.id, { birthDate: '2016-02-29' });
  assert.equal(edited.age, ageOn('2016-02-29'));
});
