import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { MIGRATIONS } from './migrations.js';

export type DB = Database.Database;

export const DATA_DIR = path.join(process.cwd(), 'data');
export const DEFAULT_DB_FILE = path.join(DATA_DIR, 'molaris.db');

export function openDatabase(file: string = DEFAULT_DB_FILE): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  if (file !== ':memory:') snapshotBeforeUpgrade(db, file);
  migrate(db);
  return db;
}

/**
 * Before a new version changes the schema of an existing database, keeps a copy of it
 * as it was (backups/molaris-avant-mise-a-jour-v9-2026-09-25T10-00-00.db): the daily
 * backup is taken after the upgrade, and only once a day.
 */
function snapshotBeforeUpgrade(db: DB, file: string): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  if (current === 0 || current >= MIGRATIONS.length) return;
  const dir = path.join(path.dirname(file), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const target = path.join(dir, `molaris-avant-mise-a-jour-v${current}-${stamp}.db`);
  // VACUUM INTO writes a consistent copy, WAL content included, without closing the database.
  db.prepare('VACUUM INTO ?').run(target);
}

/** Applies every migration newer than the database's PRAGMA user_version, each in its own transaction. */
export function migrate(db: DB, upTo: number = MIGRATIONS.length): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let version = current; version < upTo; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version].sql);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}

let singleton: DB | null = null;

/** The app-wide connection. MOLARIS_DB_FILE overrides the location (tests, demo databases). */
export function getDb(): DB {
  if (!singleton) singleton = openDatabase(process.env.MOLARIS_DB_FILE || DEFAULT_DB_FILE);
  return singleton;
}
