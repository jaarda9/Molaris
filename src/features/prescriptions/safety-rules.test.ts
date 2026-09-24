import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrescriptionSafety } from './safety.js';

const patient = (allergies: string, extra: Record<string, unknown> = {}) => ({ allergies, medications: [], ...extra });
const severities = (r: ReturnType<typeof checkPrescriptionSafety>) => r.alerts.map(a => a.severity);

// --- Allergies beyond the penicillin class ----------------------------------------

test('an allergy to the exact drug blocks (any drug, not only penicillins)', () => {
  const r = checkPrescriptionSafety(patient('Ibuprofène (œdème de Quincke)'), [{ drugLabel: 'Ibuprofène', strength: '400 mg' }]);
  assert.equal(r.hasCritical, true);
  assert.equal(r.alerts[0].source, 'allergy');
});

test('an allergy inside a combination drug blocks', () => {
  const r = checkPrescriptionSafety(patient('Métronidazole'), [{ drugLabel: 'Spiramycine + métronidazole' }]);
  assert.equal(r.hasCritical, true);
});

test('an allergy to NSAIDs as a class blocks every NSAID', () => {
  for (const drug of ['Diclofénac', 'Kétoprofène', 'Ibuprofène']) {
    assert.equal(checkPrescriptionSafety(patient('Allergie aux AINS'), [{ drugLabel: drug }]).hasCritical, true, drug);
  }
});

test('an aspirin allergy blocks NSAIDs (cross-reactivity)', () => {
  assert.equal(checkPrescriptionSafety(patient('Aspirine'), [{ drugLabel: 'Kétoprofène' }]).hasCritical, true);
});

test('a penicillin allergy warns (does not block) on a cephalosporin', () => {
  const r = checkPrescriptionSafety(patient('Pénicilline (urticaire)'), [{ drugLabel: 'Céfalexine' }]);
  assert.equal(r.hasCritical, false);
  assert.deepEqual(severities(r), ['warning']);
});

test('no allergy alert when the allergy text is a negative statement', () => {
  for (const text of ['Aucune', 'Aucune allergie connue', 'Aucune allergie médicamenteuse connue', '']) {
    assert.equal(checkPrescriptionSafety(patient(text), [{ drugLabel: 'Ibuprofène' }]).alerts.length, 0, text);
  }
});

test('an unrelated allergy does not raise an alert', () => {
  assert.equal(checkPrescriptionSafety(patient('Latex, pollen'), [{ drugLabel: 'Amoxicilline', strength: '1 g' }]).alerts.length, 0);
});

// --- Duplicates within one prescription -------------------------------------------

test('two NSAIDs on the same prescription block', () => {
  const r = checkPrescriptionSafety(patient(''), [{ drugLabel: 'Ibuprofène' }, { drugLabel: 'Kétoprofène' }]);
  assert.equal(r.hasCritical, true);
  assert.equal(r.alerts[0].source, 'duplicate');
});

test('paracetamol on two lines warns about the cumulative daily dose', () => {
  const r = checkPrescriptionSafety(patient(''), [{ drugLabel: 'Paracétamol' }, { drugLabel: 'Paracétamol + codéine' }]);
  assert.equal(r.hasCritical, false);
  assert.ok(r.alerts.some(a => a.severity === 'warning' && a.source === 'duplicate'));
});

test('a single NSAID and paracetamol together raise no duplicate alert', () => {
  assert.equal(checkPrescriptionSafety(patient(''), [{ drugLabel: 'Ibuprofène' }, { drugLabel: 'Paracétamol' }]).alerts.length, 0);
});

// --- Children ------------------------------------------------------------------------

test('a prescription for a child warns that default doses are adult doses', () => {
  const r = checkPrescriptionSafety(patient('', { age: 7, weightKg: 24 }), [{ drugLabel: 'Amoxicilline', strength: '1 g' }]);
  assert.equal(r.hasCritical, false);
  const alert = r.alerts.find(a => a.source === 'patient');
  assert.ok(alert && /24 kg/.test(alert.message));
});

test('no child warning for an adult', () => {
  assert.equal(checkPrescriptionSafety(patient('', { age: 30, weightKg: 70 }), [{ drugLabel: 'Amoxicilline' }]).alerts.length, 0);
});
