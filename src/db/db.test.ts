import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { migrate, openDatabase } from './connection.js';
import { MIGRATIONS } from './migrations.js';
import { nextDocumentNumber } from './counters.js';
import { getClinicIdentity, setClinicIdentity } from './settings.js';

test('migrations bring a fresh database to the latest schema version', () => {
  const db = openDatabase(':memory:');
  assert.equal(db.pragma('user_version', { simple: true }), MIGRATIONS.length);
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map(t => t.name);
  for (const t of ['patients', 'appointments', 'procedures', 'quotes', 'quote_items', 'payments', 'drugs', 'prescriptions', 'prescription_items']) {
    assert.ok(tables.includes(t), `missing table ${t}`);
  }
});

test('document numbers are sequential per kind and restart each year', () => {
  const db = openDatabase(':memory:');
  const d2026 = new Date('2026-05-01T10:00:00');
  assert.equal(nextDocumentNumber(db, 'DV', d2026), 'DV-2026-0001');
  assert.equal(nextDocumentNumber(db, 'DV', d2026), 'DV-2026-0002');
  assert.equal(nextDocumentNumber(db, 'REC', d2026), 'REC-2026-0001');
  assert.equal(nextDocumentNumber(db, 'DV', new Date('2027-01-02T10:00:00')), 'DV-2027-0001');
});

test('clinic identity merges partial updates and ignores unknown keys', () => {
  const db = openDatabase(':memory:');
  setClinicIdentity(db, { clinicName: '  Cabinet Dentaire El Menzah ', phone: '+216 71 000 000' });
  setClinicIdentity(db, { city: 'Tunis', ...({ bogus: 'x' } as object) });
  const identity = getClinicIdentity(db);
  assert.equal(identity.clinicName, 'Cabinet Dentaire El Menzah');
  assert.equal(identity.city, 'Tunis');
  assert.equal(identity.phone, '+216 71 000 000');
  assert.equal((identity as any).bogus, undefined);
});

test('foreign keys are enforced: a quote cannot reference a missing patient', () => {
  const db = openDatabase(':memory:');
  assert.throws(() => db.prepare(`
    INSERT INTO quotes (id, number, patient_id, issued_at, created_at, updated_at)
    VALUES ('q1', 'DV-2026-0001', 'nobody', '2026-01-01', '2026-01-01', '2026-01-01')
  `).run(), /FOREIGN KEY/);
});

test('an existing database is copied to backups/ before a schema upgrade, not on a normal start', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'molaris-upgrade-'));
  const file = path.join(dir, 'molaris.db');
  const old = new Database(file);
  migrate(old, MIGRATIONS.length - 1);   // as left by the previous version
  old.close();

  openDatabase(file).close();
  const copies = fs.readdirSync(path.join(dir, 'backups'));
  assert.equal(copies.length, 1);
  assert.match(copies[0], new RegExp(`^molaris-avant-mise-a-jour-v${MIGRATIONS.length - 1}-`));
  const snapshot = new Database(path.join(dir, 'backups', copies[0]), { readonly: true });
  assert.equal(snapshot.pragma('user_version', { simple: true }), MIGRATIONS.length - 1);
  snapshot.close();

  openDatabase(file).close();            // already up to date: no new copy
  assert.equal(fs.readdirSync(path.join(dir, 'backups')).length, 1);
});
