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
  migrate(db);
  return db;
}

/** Applies every migration newer than the database's PRAGMA user_version, each in its own transaction. */
export function migrate(db: DB): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let version = current; version < MIGRATIONS.length; version++) {
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
