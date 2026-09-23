// Resets data/molaris.db (or MOLARIS_DB_FILE) to fresh demo data for client demos.
// The current database is moved to data/backups/ first, never deleted.
// Stop the server before running (Windows keeps the database file locked).
//
// Each feature may add demo rows by exporting `seedDemo(db)` from
// src/features/<feature>/demo.ts; those files are discovered automatically.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { openDatabase, DATA_DIR, DEFAULT_DB_FILE, DB } from '../src/db/connection.js';
import { PatientRepository } from '../src/repositories/patients.js';
import { setClinicIdentity } from '../src/db/settings.js';

async function main(): Promise<void> {
  const target = process.env.MOLARIS_DB_FILE || DEFAULT_DB_FILE;
  const backupDir = path.join(DATA_DIR, 'backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (fs.existsSync(target)) {
    fs.mkdirSync(backupDir, { recursive: true });
    for (const suffix of ['', '-wal', '-shm']) {
      const file = target + suffix;
      if (fs.existsSync(file)) fs.renameSync(file, path.join(backupDir, `molaris-${stamp}.db${suffix}`));
    }
    console.log(`Previous database backed up to data/backups/molaris-${stamp}.db`);
  }

  const db = openDatabase(target);
  new PatientRepository(db, { legacyJsonFile: null });
  // Obviously fictitious letterhead so printed demo documents look complete.
  setClinicIdentity(db, {
    clinicName: 'Cabinet Dentaire Démo',
    doctorName: 'Dr. Praticien Démo',
    specialty: 'Médecin Dentiste',
    address: '10, avenue de la Démo',
    city: 'Tunis',
    phone: '+216 71 000 000',
    email: 'contact@cabinet-demo.tn',
    orderNumber: 'DEMO-0000',
    fiscalId: 'DEMO/0000000',
    cnamCode: 'DEMO-CNAM-00'
  });

  const featuresDir = path.join(process.cwd(), 'src', 'features');
  for (const feature of fs.readdirSync(featuresDir)) {
    const demoFile = path.join(featuresDir, feature, 'demo.ts');
    if (!fs.existsSync(demoFile)) continue;
    const mod = await import(pathToFileURL(demoFile).href) as { seedDemo?: (db: DB) => void };
    if (typeof mod.seedDemo === 'function') {
      db.transaction(() => mod.seedDemo!(db))();
      console.log(`Seeded demo data: ${feature}`);
    }
  }

  db.close();
  console.log(`Demo database ready: ${target}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
