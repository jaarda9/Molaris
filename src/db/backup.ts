import fs from 'fs';
import path from 'path';
import type { DB } from './connection.js';

/** How many daily backups are kept in data/backups/ (older ones are removed). */
export const BACKUPS_KEPT = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const FILE_PATTERN = /^molaris-auto-(\d{4}-\d{2}-\d{2})\.db$/;

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Writes today's backup (data/backups/molaris-auto-YYYY-MM-DD.db) with SQLite's online
 * backup API, which is consistent while the app keeps writing. At most one per day;
 * keeps the newest BACKUPS_KEPT. Returns the file written, or null if today's exists.
 */
export async function backupDatabase(db: DB, dir: string, now: Date = new Date(), keep = BACKUPS_KEPT): Promise<string | null> {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `molaris-auto-${localDay(now)}.db`);
  if (fs.existsSync(file)) return null;

  // Back up to a temporary name first: a crash mid-copy never leaves a truncated "backup".
  const partial = `${file}.partial`;
  await db.backup(partial);
  fs.renameSync(partial, file);

  const backups = fs.readdirSync(dir).filter(name => FILE_PATTERN.test(name)).sort();
  for (const old of backups.slice(0, Math.max(0, backups.length - keep))) {
    fs.unlinkSync(path.join(dir, old));
  }
  return file;
}

/** Backs up at startup, then checks every hour (a PC left on overnight still gets one per day). */
export function scheduleDailyBackups(db: DB, dir: string): void {
  const run = () => backupDatabase(db, dir)
    .then(file => { if (file) console.log(`[Backup] ${path.basename(file)} written to ${dir}`); })
    .catch(err => console.error('[Backup] failed:', err));
  run();
  setInterval(run, DAY_MS / 24).unref();
}
