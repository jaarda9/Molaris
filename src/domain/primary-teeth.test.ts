import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPrimaryTeeth, isPrimaryToothId, isUntouchedPrimaryChart, primaryTeethVisibility } from './primary-teeth.js';

test('there are 20 primary teeth, FDI 51-55, 61-65, 71-75, 81-85', () => {
  const teeth = createPrimaryTeeth(6);
  assert.equal(teeth.length, 20);
  assert.deepEqual(teeth.map(t => t.fdi).filter(f => f < 60), [51, 52, 53, 54, 55]);
  assert.ok(teeth.every(t => t.id === t.fdi && isPrimaryToothId(t.id) && t.dentition === 'primary'));
  assert.equal(teeth.find(t => t.fdi === 75)!.type, 'molar');
  assert.equal(teeth.find(t => t.fdi === 83)!.type, 'canine');
  assert.equal(teeth.find(t => t.fdi === 64)!.arch, 'maxillary');
});

test('primary tooth ids never collide with permanent (Universal 1-32) ids', () => {
  for (let id = 1; id <= 32; id++) assert.equal(isPrimaryToothId(id), false);
  assert.equal(isPrimaryToothId(56), false);
  assert.equal(isPrimaryToothId(90), false);
});

test('children start with sound primary teeth, adults with shed (missing) ones', () => {
  assert.ok(createPrimaryTeeth(8).every(t => t.status === 'sound'));
  assert.ok(createPrimaryTeeth(30).every(t => t.status === 'missing'));
});

test('auto mode: shown for children, hidden for adults', () => {
  assert.deepEqual(primaryTeethVisibility(7, 'auto', createPrimaryTeeth(7)), { visible: true, reason: 'child' });
  assert.deepEqual(primaryTeethVisibility(12, 'auto', createPrimaryTeeth(12)), { visible: true, reason: 'child' });
  assert.deepEqual(primaryTeethVisibility(35, 'auto', createPrimaryTeeth(35)), { visible: false, reason: 'adult' });
});

test('auto mode: an adult with a recorded primary tooth gets the primary teeth shown', () => {
  const teeth = createPrimaryTeeth(28);
  teeth.find(t => t.fdi === 53)!.notes = 'Canine temporaire persistante, 13 incluse.';
  assert.deepEqual(primaryTeethVisibility(28, 'auto', teeth), { visible: true, reason: 'recorded' });

  const withCaries = createPrimaryTeeth(28);
  withCaries.find(t => t.fdi === 85)!.status = 'caries';
  assert.equal(primaryTeethVisibility(28, 'auto', withCaries).visible, true);
});

test("the dentist's explicit choice overrides the automatic rule", () => {
  assert.deepEqual(primaryTeethVisibility(40, 'shown', createPrimaryTeeth(40)), { visible: true, reason: 'shown' });
  assert.deepEqual(primaryTeethVisibility(6, 'hidden', createPrimaryTeeth(6)), { visible: false, reason: 'hidden' });
});

test('a primary chart counts as untouched only while it holds its defaults', () => {
  const teeth = createPrimaryTeeth(35);
  assert.equal(isUntouchedPrimaryChart(teeth, 35), true);
  teeth[0].status = 'sound';
  assert.equal(isUntouchedPrimaryChart(teeth, 35), false);
});
