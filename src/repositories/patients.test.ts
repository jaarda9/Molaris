import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openDatabase } from '../db/connection.js';
import { PatientRepository } from './patients.js';

function freshRepo() {
  const db = openDatabase(':memory:');
  return { db, repo: new PatientRepository(db, { legacyJsonFile: null }) };
}

test('a fresh database is seeded with the demo patients and an active patient', () => {
  const { repo } = freshRepo();
  assert.equal(repo.getAllPatients().length, 3);
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
  const before = repo.getPatientById('pt_2')!;
  const updated = repo.updatePatient('pt_2', { id: 'hijacked', createdAt: '1999-01-01', age: 68 } as any);
  assert.equal(updated.id, 'pt_2');
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
