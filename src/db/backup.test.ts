import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { openDatabase } from './connection.js';
import { backupDatabase } from './backup.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'molaris-backup-'));
}

test('a daily backup is a complete, readable copy of the database', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'molaris.db'));
  db.prepare("INSERT INTO settings (key, value) VALUES ('probe', ?)").run('"ok"');

  const file = await backupDatabase(db, path.join(dir, 'backups'), new Date(2026, 8, 24, 10, 0));
  assert.ok(file && file.endsWith('molaris-auto-2026-09-24.db'));
  const copy = new Database(file!, { readonly: true });
  assert.equal((copy.prepare("SELECT value FROM settings WHERE key = 'probe'").get() as { value: string }).value, '"ok"');
  copy.close();
  db.close();
});

test('one backup per day, and only the newest ones are kept', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'molaris.db'));
  const backups = path.join(dir, 'backups');
  assert.ok(await backupDatabase(db, backups, new Date(2026, 8, 1, 9), 3));
  assert.equal(await backupDatabase(db, backups, new Date(2026, 8, 1, 18), 3), null, 'same day: no second copy');
  for (const day of [2, 3, 4, 5]) await backupDatabase(db, backups, new Date(2026, 8, day, 9), 3);

  const names = fs.readdirSync(backups).sort();
  assert.deepEqual(names, ['molaris-auto-2026-09-03.db', 'molaris-auto-2026-09-04.db', 'molaris-auto-2026-09-05.db']);
  db.close();
});
