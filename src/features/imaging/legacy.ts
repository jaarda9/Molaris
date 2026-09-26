// One-time move of the X-rays saved before the imaging feature: image files in
// data/images/ plus a record (with the AI reading) inside the patient's JSON chart.
// They are copied into the xrays table — so the full backup carries them — and the files
// are left in place. Idempotent: an image already imported (same id) is skipped.
import fs from 'fs';
import path from 'path';
import type { DB } from '../../db/connection.js';
import type { PatientRecord } from '../../repositories/patients.js';
import { planToothToFdi } from '../billing/unbilled.js';
import { XrayRepository } from './repository.js';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export function importLegacyImages(db: DB, patients: PatientRecord[], imagesDir: string): number {
  const repo = new XrayRepository(db);
  let imported = 0;
  for (const patient of patients) {
    for (const img of patient.images || []) {
      if (repo.get(img.id)) continue;
      const file = path.join(imagesDir, `${img.id}.${EXT[img.mimeType] ?? 'bin'}`);
      if (!fs.existsSync(file)) continue;
      const day = (img.uploadedAt || new Date().toISOString()).slice(0, 10);
      repo.create({
        patientId: patient.id,
        kind: 'other',
        takenOn: day,
        toothFdi: planToothToFdi(img.toothId),
        filename: img.filename,
        mimeType: img.mimeType,
        data: fs.readFileSync(file)
      }, img.id, img.uploadedAt || new Date().toISOString());
      if (img.analysis) repo.setAnalysis(img.id, { query: img.query || '', text: img.analysis, model: img.modelUsed || '' }, img.uploadedAt);
      imported++;
    }
  }
  return imported;
}
