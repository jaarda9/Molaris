import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labWarningsForAppointment } from './lab-schedule.js';
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
