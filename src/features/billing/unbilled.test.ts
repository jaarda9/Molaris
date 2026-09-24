import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findUnbilledActs, planToothToFdi } from './unbilled.js';
import type { TreatmentPlanItem } from '../../domain/clinical-records.js';
import type { Procedure, Quote } from './repository.js';

const item = (id: string, procedure: string, status: TreatmentPlanItem['status'], toothId?: number, estimatedCost?: number): TreatmentPlanItem =>
  ({ id, procedure, status, toothId, estimatedCost, priority: 'routine', createdAt: '', updatedAt: '' });
const quote = (status: Quote['status'], lines: Array<[string, number | null, (string | null)?]>): Quote => ({
  id: 'q', number: 'DV', patientId: 'pt_1', patientName: '', patientChartId: '', status, issuedAt: '2026-09-01', validUntil: null,
  pastValidity: false, notes: null, totalMillimes: 0, totalInWords: '', paidMillimes: 0, remainingMillimes: 0, createdAt: '', updatedAt: '',
  items: lines.map(([label, toothFdi, procedureId], i) => ({ id: `l${i}`, procedureId: procedureId ?? null, label, toothFdi, quantity: 1, unitPriceMillimes: 0, discountMillimes: 0, totalMillimes: 0 }))
});
const catalog: Procedure[] = [{ id: 'p_crown', code: null, labelFr: 'Couronne céramo-métallique', labelAr: null, category: null, defaultPriceMillimes: 600_000, cnamKeyLetter: null, cnamCoefficient: null, active: true, createdAt: '', updatedAt: '' }];

test('plan teeth map to FDI (permanent Universal ids and primary FDI ids)', () => {
  assert.equal(planToothToFdi(30), 46);
  assert.equal(planToothToFdi(75), 75);
  assert.equal(planToothToFdi(undefined), null);
});

test('a completed act on no quote is reported, with the catalog price', () => {
  const acts = findUnbilledActs([item('t1', 'couronne ceramo-metallique', 'completed', 30)], [], catalog);
  assert.deepEqual(acts.map(a => [a.procedure, a.toothFdi, a.unitPriceMillimes, a.procedureId]), [['couronne ceramo-metallique', 46, 600_000, 'p_crown']]);
});

test('an act already on a live quote (same act, same tooth) is not reported', () => {
  const quotes = [quote('accepted', [['Couronne céramo-métallique', 46]])];
  assert.equal(findUnbilledActs([item('t1', 'Couronne céramo-métallique', 'completed', 30)], quotes, catalog).length, 0);
  // Same act on another tooth is still unbilled.
  assert.equal(findUnbilledActs([item('t2', 'Couronne céramo-métallique', 'completed', 19)], quotes, catalog).length, 1);
});

test('refused or expired quotes do not count; unfinished acts are not reported', () => {
  const refused = [quote('refused', [['Détartrage', null]])];
  assert.equal(findUnbilledActs([item('t1', 'Détartrage', 'completed', undefined, 80)], refused, []).length, 1);
  assert.equal(findUnbilledActs([item('t2', 'Détartrage', 'proposed'), item('t3', 'Détartrage', 'in_progress')], [], []).length, 0);
});

test('each quote line covers one act: two identical acts, one line -> one unbilled', () => {
  const quotes = [quote('draft', [['Composite 1 face', 46]])];
  const plan = [item('a', 'Composite 1 face', 'completed', 30), item('b', 'Composite 1 face', 'completed', 30)];
  assert.equal(findUnbilledActs(plan, quotes, []).length, 1);
});
