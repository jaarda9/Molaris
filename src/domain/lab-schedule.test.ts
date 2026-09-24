import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyLabProgress, labWarningsForAppointment } from './lab-schedule.js';
import type { LabCase } from './clinical-records.js';

const lab = (status: LabCase['status'], dueDate?: string): LabCase =>
  ({ id: 'lc', caseType: 'Couronne zircone', toothId: 19, status, dueDate, createdAt: '', updatedAt: '' } as LabCase);

test('fitting before the lab work is due: warning with the return date', () => {
  const w = labWarningsForAppointment([lab('sent', '2026-10-02')], { startAt: '2026-09-29T10:00', reason: 'Prothèse' }, () => 36);
  assert.equal(w.length, 1);
  assert.match(w[0], /Couronne zircone.*dent 36.*02\/10\/2026/);
});

test('no warning once the work is back, or when it is due before the appointment', () => {
  assert.equal(labWarningsForAppointment([lab('returned', '2026-10-02')], { startAt: '2026-09-29T10:00', reason: 'Pose couronne' }).length, 0);
  assert.equal(labWarningsForAppointment([lab('in_lab', '2026-09-25')], { startAt: '2026-09-29T10:00', reason: 'Pose couronne' }).length, 0);
});

test('undated lab work: warning; unrelated reasons and impressions: none', () => {
  assert.match(labWarningsForAppointment([lab('planned')], { startAt: '2026-09-29T10:00', reason: 'Scellement bridge' })[0], /sans date de retour/);
  assert.equal(labWarningsForAppointment([lab('sent', '2026-10-02')], { startAt: '2026-09-29T10:00', reason: 'Détartrage' }).length, 0);
  assert.equal(labWarningsForAppointment([lab('planned')], { startAt: '2026-09-29T10:00', reason: 'Empreinte couronne 36' }).length, 0);
});

// --- Lab case timeline ------------------------------------------------------------------

const today = '2026-09-24';
const clean = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

test('moving a case along records the day of each step', () => {
  assert.deepEqual(clean(applyLabProgress({ status: 'planned' }, { status: 'sent' }, today)), { status: 'sent', sentDate: today });
  const sent = { status: 'in_lab' as const, sentDate: '2026-09-10' };
  assert.deepEqual(clean(applyLabProgress(sent, { status: 'returned' }, today)), { status: 'returned', returnedDate: today });
  // A date given explicitly wins over today.
  assert.deepEqual(clean(applyLabProgress(sent, { status: 'returned', returnedDate: '2026-09-20' }, today)), { status: 'returned', returnedDate: '2026-09-20' });
});

test('a remake clears the return and the fitting, and the new sending is dated today', () => {
  const seated = { status: 'seated' as const, sentDate: '2026-09-01', returnedDate: '2026-09-10', seatedDate: '2026-09-12' };
  const remake = applyLabProgress(seated, { status: 'remake' }, today);
  assert.equal(remake.returnedDate, undefined);
  assert.equal(remake.seatedDate, undefined);
  assert.ok('returnedDate' in remake && 'seatedDate' in remake, 'the old dates are explicitly cleared');
  const resent = applyLabProgress({ status: 'remake', sentDate: '2026-09-01' }, { status: 'sent' }, today);
  assert.equal(resent.sentDate, today);
});

test('stepping back by mistake clears the later step only', () => {
  const seated = { status: 'seated' as const, sentDate: '2026-09-01', returnedDate: '2026-09-10', seatedDate: '2026-09-12' };
  const back = applyLabProgress(seated, { status: 'returned' }, today);
  assert.equal(back.seatedDate, undefined);
  assert.equal({ ...seated, ...back }.returnedDate, '2026-09-10');
});

test('future or out-of-order dates are refused', () => {
  assert.throws(() => applyLabProgress({ status: 'planned' }, { status: 'sent', sentDate: '2026-10-01' }, today), /futur/);
  assert.throws(() => applyLabProgress({ status: 'in_lab', sentDate: '2026-09-20' }, { status: 'returned', returnedDate: '2026-09-15' }, today), /La date du retour précède celle de l’envoi/);
});
