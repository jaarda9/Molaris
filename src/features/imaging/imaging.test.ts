import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openDatabase } from '../../db/connection.js';
import { PatientRepository } from '../../repositories/patients.js';
import { HttpError } from '../../routes/http.js';
import { XrayRepository } from './repository.js';
import { importLegacyImages } from './legacy.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

function setup() {
  const db = openDatabase(':memory:');
  const patients = new PatientRepository(db, { legacyJsonFile: null });
  return { db, patients, xrays: new XrayRepository(db) };
}
const status = (code: number) => (err: unknown) => err instanceof HttpError && err.status === code;

test('an X-ray is kept in the patient file with its interpretation and AI reading', () => {
  const { xrays } = setup();
  const x = xrays.create({ patientId: 'pt_1', kind: 'periapical', takenOn: '2026-09-20', toothFdi: 46, mimeType: 'image/png', data: PNG, interpretation: 'Radioclarté apicale 46' });
  assert.equal(x.sizeBytes, PNG.length);
  assert.equal(xrays.listForPatient('pt_1').length, 1);
  assert.deepEqual(xrays.image(x.id)!.data, PNG);
  const edited = xrays.update(x.id, { interpretation: 'Lésion apicale 46, contrôle à 6 mois', kind: 'bitewing' });
  assert.equal(edited.kind, 'bitewing');
  const read = xrays.setAnalysis(x.id, { query: 'Lésion ?', text: 'Radioclarté périapicale…', model: 'gemini' });
  assert.equal(read.aiAnalysis, 'Radioclarté périapicale…');
  assert.equal(read.interpretation, 'Lésion apicale 46, contrôle à 6 mois', 'the dentist reading is untouched');
  assert.equal(xrays.listForPatient('pt_2').length, 0);
});

test('X-ray dates cannot be in the future; deletion only on the day it was added', () => {
  const { xrays } = setup();
  assert.throws(() => xrays.create({ patientId: 'pt_1', kind: 'photo', takenOn: '2999-01-01', mimeType: 'image/png', data: PNG }), status(400));
  const x = xrays.create({ patientId: 'pt_1', kind: 'photo', takenOn: '2026-09-20', mimeType: 'image/png', data: PNG });
  assert.throws(() => xrays.delete(x.id, new Date(Date.now() + 2 * 86_400_000)), status(409));
  xrays.delete(x.id);
  assert.equal(xrays.get(x.id), null);
});

test('a patient with an X-ray cannot be deleted (medical record)', () => {
  const { patients, xrays } = setup();
  const p = patients.createPatient({ name: 'Avec radio', age: 30, weightKg: 70 });
  xrays.create({ patientId: p.id, kind: 'panoramic', takenOn: '2026-09-20', mimeType: 'image/png', data: PNG });
  assert.throws(() => patients.deletePatient(p.id), /radiographies/);
});

test('X-rays saved before the imaging feature are imported once, with their AI reading', () => {
  const { db, patients } = setup();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'molaris-img-'));
  fs.writeFileSync(path.join(dir, 'img_old.png'), PNG);
  patients.addImageRecordForActivePatient({ id: 'img_old', filename: 'radio.png', mimeType: 'image/png', toothId: 30, query: 'q', analysis: 'lecture ancienne', modelUsed: 'm' });
  assert.equal(importLegacyImages(db, patients.getAllPatients(), dir), 1);
  assert.equal(importLegacyImages(db, patients.getAllPatients(), dir), 0, 'idempotent');
  const x = new XrayRepository(db).get('img_old')!;
  assert.equal(x.toothFdi, 46);
  assert.equal(x.aiAnalysis, 'lecture ancienne');
});
