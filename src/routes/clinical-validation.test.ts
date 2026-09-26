import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  anesthesiaLogSchema, anesthesiaCalcSchema, labCaseUpdateSchema, patientCreateSchema, patientUpdateSchema,
  medicationCreateSchema, medicationUpdateSchema, perioChartSchema, toothUpdateSchema, treatmentCreateSchema,
  treatmentUpdateSchema
} from './clinical-validation.js';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) => schema.safeParse(value).success;

test('medication: a real name is required; an update can only touch known fields', () => {
  assert.equal(ok(medicationCreateSchema, { name: '   ' }), false);
  assert.equal(ok(medicationCreateSchema, { name: 123 }), false);
  assert.equal(ok(medicationCreateSchema, { name: 'x'.repeat(200) }), false);
  const created = medicationCreateSchema.parse({ name: ' Amlodipine ', dosage: '5 mg' });
  assert.deepEqual(created, { name: 'Amlodipine', dosage: '5 mg', frequency: '' });
  assert.equal(ok(medicationUpdateSchema, { name: 42 }), false);
  assert.equal(ok(medicationUpdateSchema, { active: 'yes' }), false);
  assert.deepEqual(medicationUpdateSchema.parse({ active: false, id: 'med_x', addedAt: '1999' }), { active: false });
});

test('patient: weight and age must be plausible (they drive anesthetic doses)', () => {
  assert.equal(ok(patientCreateSchema, { name: 'A', weightKg: 700 }), false);
  assert.equal(ok(patientCreateSchema, { name: 'A', weightKg: 0 }), false);
  assert.equal(ok(patientCreateSchema, { name: 'A', age: -5 }), false);
  assert.equal(ok(patientCreateSchema, { name: 'Lina', age: 7, weightKg: 24 }), true);
});

test('patient update: name cannot be emptied, ASA must exist, clinical records are not writable here', () => {
  assert.equal(ok(patientUpdateSchema, { name: '' }), false);
  assert.equal(ok(patientUpdateSchema, { weightKg: 'abc' }), false);
  assert.equal(ok(patientUpdateSchema, { asaStatus: 'ASA IX' }), false);
  const parsed = patientUpdateSchema.parse({ age: 40, teeth: 'junk', medications: [] }) as Record<string, unknown>;
  assert.deepEqual(Object.keys(parsed), ['age']);
});

test('odontogram: known teeth and statuses only', () => {
  assert.equal(ok(toothUpdateSchema, { toothId: 3, status: 'banana' }), false);
  assert.equal(ok(toothUpdateSchema, { toothId: 99, status: 'caries' }), false);
  assert.equal(ok(toothUpdateSchema, { toothId: 75, status: 'caries' }), true);
  assert.equal(ok(toothUpdateSchema, { toothId: 30, surfaces: { occlusal: true } }), true);
});

test('treatment plan and lab cases: no negative cost, no invented status or tooth', () => {
  assert.equal(ok(treatmentCreateSchema, { procedure: 'X', estimatedCost: -500 }), false);
  assert.equal(ok(treatmentCreateSchema, { procedure: 'X', priority: 'whatever' }), false);
  assert.equal(ok(treatmentCreateSchema, { procedure: 'X', toothId: 99 }), false);
  assert.equal(ok(treatmentCreateSchema, { procedure: 'Couronne', toothId: '', estimatedCost: '' }), true);
  assert.equal(ok(treatmentUpdateSchema, { status: 'banana' }), false);
  assert.equal(ok(labCaseUpdateSchema, { status: 'banana' }), false);
  assert.equal(ok(labCaseUpdateSchema, { status: 'in_lab', dueDate: '2026-02-30' }), false);
});

test('perio: depths 0-15 mm, one entry per tooth', () => {
  const site = { pocketDepth: 3, recession: 0, bleeding: false, suppuration: false };
  const sites = { mesiobuccal: site, buccal: site, distobuccal: site, distolingual: site, lingual: site, mesiolingual: site };
  const tooth = (id: number, depth = 3) => ({ toothId: id, mobility: 0, furcation: null, sites: { ...sites, buccal: { ...site, pocketDepth: depth } } });
  assert.equal(ok(perioChartSchema, { teeth: [tooth(1)] }), true);
  assert.equal(ok(perioChartSchema, { teeth: [tooth(1, -4)] }), false);
  assert.equal(ok(perioChartSchema, { teeth: [tooth(1, 250)] }), false);
  assert.equal(ok(perioChartSchema, { teeth: [tooth(1), tooth(1)] }), false);
  assert.equal(ok(perioChartSchema, { teeth: [{ junk: true }] }), false);
});

test('anesthesia: no zero or negative carpules, plausible weight', () => {
  assert.equal(ok(anesthesiaLogSchema, { carpules: -2 }), false);
  assert.equal(ok(anesthesiaLogSchema, { carpules: 0 }), false);
  assert.equal(ok(anesthesiaLogSchema, { carpules: 1.5 }), true);
  assert.equal(ok(anesthesiaCalcSchema, { weightKg: 0 }), false);
  assert.equal(ok(anesthesiaCalcSchema, { weightKg: 70, carpulesGiven: -3 }), false);
});

test('patient names: extra spaces collapse, letters are untouched', () => {
  assert.equal(patientCreateSchema.parse({ name: '  Sassi   Mejri\tSalsabil ', age: 30, weightKg: 60 }).name, 'Sassi Mejri Salsabil');
});

test('a chart is not created with a guessed age or weight', () => {
  assert.equal(ok(patientCreateSchema, { name: 'A', weightKg: 60 }), false);          // no age, no birth date
  assert.equal(ok(patientCreateSchema, { name: 'A', age: 30 }), false);               // no weight
  assert.equal(ok(patientCreateSchema, { name: 'A', birthDate: '1990-05-01', weightKg: 60 }), true);
  assert.equal(ok(patientCreateSchema, { name: 'A', age: 30, weightKg: 60 }), true);
});
