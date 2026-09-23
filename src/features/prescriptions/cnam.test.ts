import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../../db/connection.js';
import { PatientRepository } from '../../repositories/patients.js';
import { PrescriptionRepository } from './repository.js';
import { issuePrescription } from './service.js';

test('a prescription snapshots the CNAM identifier and status; later chart edits do not change it', () => {
  const db = openDatabase(':memory:');
  const patients = new PatientRepository(db, { legacyJsonFile: null });
  patients.updatePatient('pt_3', { cnamId: '1234567-89', cnamQuality: 'enfant' });

  const result = issuePrescription(db, patients.getPatientOrThrow('pt_3'), {
    items: [{ drugLabel: 'Paracétamol', strength: '1 g', dosage: '1 cp si douleur' }]
  });
  assert.equal(result.status, 'issued');
  const id = result.status === 'issued' ? result.prescription.id : '';

  patients.updatePatient('pt_3', { cnamId: 'CHANGED' });
  const reread = new PrescriptionRepository(db).get(id)!;
  assert.equal(reread.patientCnamId, '1234567-89');
  assert.equal(reread.patientCnamQuality, 'enfant');
});

test('a patient without CNAM data gets empty CNAM fields', () => {
  const db = openDatabase(':memory:');
  const patients = new PatientRepository(db, { legacyJsonFile: null });
  const uninsured = patients.createPatient({ name: 'Sans Couverture', age: 30 });
  const result = issuePrescription(db, patients.getPatientOrThrow(uninsured.id), {
    items: [{ drugLabel: 'Paracétamol', dosage: '1 cp si douleur' }]
  });
  assert.equal(result.status, 'issued');
  if (result.status === 'issued') assert.equal(result.prescription.patientCnamId, null);
});
