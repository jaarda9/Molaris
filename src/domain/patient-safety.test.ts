import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePatientSafetyAlerts } from './patient-safety.js';
import type { PatientRecord } from '../repositories/patients.js';

const patient = (medications: Array<{ name: string; active: boolean }>) =>
  ({ medications, medicalAlerts: '', allergies: '' } as unknown as PatientRecord);

test('an active anticoagulant raises a standing bleeding-risk warning, with the INR for a vitamin K antagonist', () => {
  const avk = computePatientSafetyAlerts(patient([{ name: 'Acénocoumarol (Sintrom) 4 mg', active: true }]), [], 'fr');
  const alert = avk.find(a => /risque hémorragique/.test(a.message));
  assert.equal(alert?.severity, 'warning');
  assert.match(alert!.message, /INR/);
  const aspirin = computePatientSafetyAlerts(patient([{ name: 'Aspirine 100 mg', active: true }]), [], 'fr');
  assert.ok(aspirin.some(a => /risque hémorragique/.test(a.message) && !/INR/.test(a.message)));
});

test('no bleeding warning for a stopped anticoagulant or unrelated drugs', () => {
  assert.equal(computePatientSafetyAlerts(patient([{ name: 'Warfarine', active: false }, { name: 'Amlodipine 5 mg', active: true }]), [], 'fr').length, 0);
});
