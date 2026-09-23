import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPrescriptionSafety } from './safety.js';

const onBisphosphonate = { allergies: 'Aucune', medications: [{ id: 'm1', name: 'Acide alendronique 70 mg', dosage: '', frequency: '', active: true, addedAt: '' }] };
const onAspirin = { allergies: 'Aucune', medications: [{ id: 'm2', name: 'Aspirine 100 mg', dosage: '', frequency: '', active: true, addedAt: '' }] };

test('a standing MRONJ alert is shown but does not block an unrelated prescription', () => {
  const { alerts, hasCritical } = checkPrescriptionSafety(onBisphosphonate, [{ drugLabel: 'Paracétamol 1 g' }]);
  assert.equal(hasCritical, false);
  const mronj = alerts.find(a => /MRONJ/.test(a.message));
  assert.ok(mronj, 'the MRONJ alert must still be visible');
  assert.equal(mronj!.severity, 'warning');
  assert.equal(mronj!.source, 'patient');
});

test('an interaction caused by the prescribed drug still blocks', () => {
  const { alerts, hasCritical } = checkPrescriptionSafety(onAspirin, [{ drugLabel: 'Ibuprofène 400 mg' }]);
  assert.equal(hasCritical, true);
  assert.ok(alerts.some(a => a.severity === 'critical' && a.source === 'interaction'));
});

test('an allergy conflict still blocks', () => {
  const { hasCritical } = checkPrescriptionSafety({ allergies: 'Pénicilline', medications: [] }, [{ drugLabel: 'Amoxicilline 1 g' }]);
  assert.equal(hasCritical, true);
});
