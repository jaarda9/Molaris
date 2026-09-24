import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../../db/connection.js';
import { HttpError } from '../../routes/http.js';
import {
  addMinutes, AppointmentRepository, getAgendaSettings, isValidLocalDateTime, setAgendaSettings
} from './repository.js';
import { buildReminderMessage, buildWhatsAppLink, normalizePhone } from './reminder.js';
import { seedDemo } from './demo.js';

function setup() {
  const db = openDatabase(':memory:');
  const now = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO patients (id, chart_id, name, phone, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, '{}', ?, ?)`);
  insert.run('pt_1', 'PT-1', 'Mohamed Ben Salah', '+216 98 123 456', now, now);
  insert.run('pt_2', 'PT-2', 'Fatma Trabelsi', null, now, now);
  insert.run('pt_3', 'PT-3', 'Youssef Gharbi', '+216 55 987 654', now, now);
  return { db, repo: new AppointmentRepository(db) };
}

function assertHttpError(fn: () => unknown, status: number, pattern?: RegExp) {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof HttpError, `expected HttpError, got ${err}`);
    assert.equal(err.status, status);
    if (pattern) assert.match(err.message, pattern);
    return true;
  });
}

test('local date-time helpers', () => {
  assert.equal(addMinutes('2026-09-23T09:45', 30), '2026-09-23T10:15');
  assert.equal(addMinutes('2026-12-31T23:30', 45), '2027-01-01T00:15');
  assert.ok(isValidLocalDateTime('2026-09-23T14:30'));
  assert.ok(!isValidLocalDateTime('2026-02-30T10:00'));
  assert.ok(!isValidLocalDateTime('2026-09-23 14:30'));
  assert.ok(!isValidLocalDateTime('2026-09-23T24:00'));
});

test('create computes the end time and reads the chart name, phone and chart id', () => {
  const { repo } = setup();
  const a = repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 45, reason: 'Soins', chair: ' Fauteuil 1 ' });
  assert.equal(a.endAt, '2026-09-23T10:45');
  assert.equal(a.patientName, 'Mohamed Ben Salah');
  assert.equal(a.chartId, 'PT-1');
  assert.equal(a.phone, '+216 98 123 456');
  assert.equal(a.chair, 'Fauteuil 1');
  assert.equal(a.status, 'scheduled');
  assert.equal(a.patientLabel, null);
});

test('walk-ins need a name; unknown patients are rejected', () => {
  const { repo } = setup();
  const walkIn = repo.create({ patientLabel: 'Amira Jlassi', patientPhone: '22 314 587', startAt: '2026-09-23T09:00', durationMinutes: 30 });
  assert.equal(walkIn.patientId, null);
  assert.equal(walkIn.patientName, 'Amira Jlassi');
  assert.equal(walkIn.phone, '22 314 587');
  assertHttpError(() => repo.create({ startAt: '2026-09-23T11:00', durationMinutes: 30 }), 400);
  assertHttpError(() => repo.create({ patientId: 'pt_404', startAt: '2026-09-23T11:00', durationMinutes: 30 }), 400);
});

test('overlap detection: same chair conflicts, touching slots and other chairs do not', () => {
  const { repo } = setup();
  repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 60, chair: 'Fauteuil 1' });

  // Overlapping on the same chair -> 409 with a French message naming the other appointment.
  assertHttpError(() => repo.create({ patientId: 'pt_2', startAt: '2026-09-23T10:30', durationMinutes: 30, chair: 'Fauteuil 1' }),
    409, /Créneau déjà occupé.*Mohamed Ben Salah de 10:00 à 11:00/);
  // Enclosing the existing one also overlaps.
  assertHttpError(() => repo.create({ patientId: 'pt_2', startAt: '2026-09-23T09:30', durationMinutes: 120, chair: 'Fauteuil 1' }), 409);

  // Touching is not overlapping, on both sides.
  repo.create({ patientId: 'pt_2', startAt: '2026-09-23T11:00', durationMinutes: 30, chair: 'Fauteuil 1' });
  repo.create({ patientId: 'pt_3', startAt: '2026-09-23T09:30', durationMinutes: 30, chair: 'Fauteuil 1' });
  // Another chair at the same time is fine.
  repo.create({ patientLabel: 'Karim Ben Ammar', startAt: '2026-09-23T10:15', durationMinutes: 30, chair: 'Fauteuil 2' });
  // Same time on another day is fine.
  repo.create({ patientId: 'pt_2', startAt: '2026-09-24T10:00', durationMinutes: 60, chair: 'Fauteuil 1' });
});

test('appointments without a chair share one implicit chair', () => {
  const { repo } = setup();
  repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 30 });
  assertHttpError(() => repo.create({ patientId: 'pt_2', startAt: '2026-09-23T10:15', durationMinutes: 30, chair: '' }), 409);
  repo.create({ patientId: 'pt_2', startAt: '2026-09-23T10:15', durationMinutes: 30, chair: 'Fauteuil 2' });
});

test('cancelled and no-show appointments free their slot; reactivating one re-checks overlap', () => {
  const { repo } = setup();
  const first = repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 30 });
  repo.setStatus(first.id, 'cancelled');
  const second = repo.create({ patientId: 'pt_2', startAt: '2026-09-23T10:00', durationMinutes: 30 });
  assertHttpError(() => repo.setStatus(first.id, 'scheduled'), 409);
  repo.setStatus(second.id, 'no_show');
  assert.equal(repo.setStatus(first.id, 'confirmed').status, 'confirmed');
});

test('rescheduling checks overlap against others but not against itself', () => {
  const { repo } = setup();
  const a = repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 30 });
  repo.create({ patientId: 'pt_2', startAt: '2026-09-23T11:00', durationMinutes: 30 });
  // Extending into its own old slot is fine.
  assert.equal(repo.update(a.id, { durationMinutes: 60 }).endAt, '2026-09-23T11:00');
  assertHttpError(() => repo.update(a.id, { startAt: '2026-09-23T10:45' }), 409);
  // Unchanged fields are kept.
  const moved = repo.update(a.id, { startAt: '2026-09-23T14:00' });
  assert.equal(moved.endAt, '2026-09-23T15:00');
  assert.equal(moved.patientId, 'pt_1');
});

test('range listing is inclusive of both dates and sorted by start', () => {
  const { repo } = setup();
  repo.create({ patientId: 'pt_1', startAt: '2026-09-22T17:45', durationMinutes: 30 });
  repo.create({ patientId: 'pt_1', startAt: '2026-09-24T16:00', durationMinutes: 30 });
  repo.create({ patientId: 'pt_2', startAt: '2026-09-23T08:30', durationMinutes: 30 });
  repo.create({ patientId: 'pt_3', startAt: '2026-09-24T23:30', durationMinutes: 30 });
  repo.create({ patientId: 'pt_3', startAt: '2026-09-25T00:00', durationMinutes: 30 });
  const listed = repo.listBetween('2026-09-23', '2026-09-24').map(a => a.startAt);
  assert.deepEqual(listed, ['2026-09-23T08:30', '2026-09-24T16:00', '2026-09-24T23:30']);
  assert.equal(repo.listBetween('2026-09-22', '2026-09-22').length, 1);
});

test('status workflow records the arrival time and clears it when going back', () => {
  const { repo } = setup();
  const a = repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 30 });
  assert.equal(repo.setStatus(a.id, 'confirmed').arrivedAt, null);
  const arrived = repo.setStatus(a.id, 'arrived');
  assert.equal(arrived.status, 'arrived');
  assert.ok(arrived.arrivedAt);
  const started = repo.setStatus(a.id, 'in_progress');
  assert.equal(started.arrivedAt, arrived.arrivedAt, 'arrival time survives later statuses');
  assert.equal(repo.setStatus(a.id, 'completed').status, 'completed');
  assert.equal(repo.setStatus(a.id, 'scheduled').arrivedAt, null);
});

test('rescheduling resets the reminder and the confirmation', () => {
  const { repo } = setup();
  const a = repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 30, status: 'confirmed' });
  assert.ok(repo.markReminderSent(a.id).reminderSentAt);
  // Editing notes keeps both.
  const noted = repo.update(a.id, { notes: 'Apporter la radio' });
  assert.ok(noted.reminderSentAt);
  assert.equal(noted.status, 'confirmed');
  const moved = repo.update(a.id, { startAt: '2026-09-24T10:00' });
  assert.equal(moved.reminderSentAt, null);
  assert.equal(moved.status, 'scheduled');
});

test('switching an appointment between chart and walk-in keeps one identity', () => {
  const { repo } = setup();
  const a = repo.create({ patientLabel: 'Sana Mejri', patientPhone: '97245118', startAt: '2026-09-23T10:00', durationMinutes: 30 });
  const linked = repo.update(a.id, { patientId: 'pt_3', patientPhone: null });
  assert.equal(linked.patientLabel, null);
  assert.equal(linked.patientName, 'Youssef Gharbi');
  assert.equal(linked.phone, '+216 55 987 654');
});

test('delete removes the appointment; unknown ids are 404', () => {
  const { repo } = setup();
  const a = repo.create({ patientId: 'pt_1', startAt: '2026-09-23T10:00', durationMinutes: 30 });
  repo.delete(a.id);
  assert.equal(repo.get(a.id), undefined);
  assertHttpError(() => repo.delete(a.id), 404);
  assertHttpError(() => repo.update('apt_missing', { notes: 'x' }), 404);
});

test('opening hours default to 08:30–18:00 Monday–Saturday and are configurable', () => {
  const { db } = setup();
  assert.deepEqual(getAgendaSettings(db), { hours: { start: '08:30', end: '18:00', days: [1, 2, 3, 4, 5, 6] }, chairs: [] });
  const saved = setAgendaSettings(db, { hours: { start: '09:00', end: '17:00', days: [6, 1, 2, 2] }, chairs: [' Fauteuil 1', '', 'Fauteuil 1', 'Fauteuil 2'] });
  assert.deepEqual(saved, { hours: { start: '09:00', end: '17:00', days: [1, 2, 6] }, chairs: ['Fauteuil 1', 'Fauteuil 2'] });
  assertHttpError(() => setAgendaSettings(db, { hours: { start: '18:00', end: '08:00', days: [1] } }), 400);
});

test('Tunisian phone numbers normalize to wa.me digits', () => {
  for (const input of ['+216 98 123 456', '98123456', '0021698123456', '98 123 456', '216 98 123 456', '(+216) 98-123-456', '098123456']) {
    assert.equal(normalizePhone(input), '21698123456', input);
  }
  assert.equal(normalizePhone('+33 6 12 34 56 78'), '33612345678');
  assert.equal(normalizePhone('0033612345678'), '33612345678');
  for (const bad of ['', null, undefined, '12345', '+216 98 123', '9812345678']) {
    assert.equal(normalizePhone(bad), null, String(bad));
  }
});

test('reminder message is polite, bilingual, and carries date, time and clinic', () => {
  const message = buildReminderMessage({ patientName: 'Fatma Trabelsi', startAt: '2026-09-24T14:30', clinicName: 'Cabinet Dentaire El Menzah' });
  assert.match(message, /^Bonjour Fatma Trabelsi,/);
  assert.match(message, /Cabinet Dentaire El Menzah vous rappelle votre rendez-vous dentaire le jeudi 24\/09\/2026 à 14h30\./);
  assert.match(message, /مرحبا Fatma Trabelsi/);
  assert.match(message, /يوم الخميس 24\/09\/2026 على الساعة 14:30/);
  assert.match(message, /في Cabinet Dentaire El Menzah/);

  const anonymous = buildReminderMessage({ patientName: '', startAt: '2026-09-26T09:00', clinicName: '' });
  assert.match(anonymous, /^Bonjour,\nNous vous rappelons votre rendez-vous dentaire le samedi 26\/09\/2026 à 09h00\./);
  assert.match(anonymous, /في عيادة الأسنان يوم السبت/);

  const link = buildWhatsAppLink('21698123456', message);
  assert.ok(link.startsWith('https://wa.me/21698123456?text='));
  assert.equal(decodeURIComponent(link.split('?text=')[1]), message);
});

test('demo seed builds a consistent agenda: no overlaps, a waiting room and reminders to send', () => {
  const { db, repo } = setup();
  seedDemo(db);
  const all = repo.listBetween('2000-01-01', '2100-01-01');
  assert.ok(all.length >= 20);
  for (const a of all) {
    if (a.status === 'cancelled' || a.status === 'no_show') continue;
    assert.equal(repo.findConflict(a.startAt, a.endAt, a.chair, a.id), undefined, `overlap at ${a.startAt} ${a.chair}`);
  }
  assert.ok(all.some(a => a.patientId === null && a.phone && normalizePhone(a.phone)), 'walk-ins with usable phones');
  assert.ok(all.some(a => a.reminderSentAt === null && a.status !== 'cancelled'), 'some reminders still to send');
  assert.deepEqual(getAgendaSettings(db).chairs, ['Fauteuil 1', 'Fauteuil 2']);
});

test('the same patient cannot be booked twice at the same time, even on another chair', () => {
  const { repo } = setup();
  repo.create({ patientId: 'pt_1', startAt: '2026-10-05T10:00', durationMinutes: 30, chair: 'Fauteuil 1' });
  assertHttpError(
    () => repo.create({ patientId: 'pt_1', startAt: '2026-10-05T10:15', durationMinutes: 30, chair: 'Fauteuil 2' }),
    409, /déjà un rendez-vous/
  );
  // Back to back is fine, and so is another patient at the same time on another chair.
  repo.create({ patientId: 'pt_1', startAt: '2026-10-05T10:30', durationMinutes: 30, chair: 'Fauteuil 2' });
  repo.create({ patientId: 'pt_2', startAt: '2026-10-05T10:00', durationMinutes: 30, chair: 'Fauteuil 2' });
});

test("a cancelled appointment does not block rebooking the same patient", () => {
  const { repo } = setup();
  const first = repo.create({ patientId: 'pt_1', startAt: '2026-10-05T10:00', durationMinutes: 30, chair: 'Fauteuil 1' });
  repo.setStatus(first.id, 'cancelled');
  repo.create({ patientId: 'pt_1', startAt: '2026-10-05T10:00', durationMinutes: 30, chair: 'Fauteuil 2' });
});

test('moving an appointment onto another booking of the same patient is refused', () => {
  const { repo } = setup();
  repo.create({ patientId: 'pt_3', startAt: '2026-10-05T14:00', durationMinutes: 30, chair: 'Fauteuil 1' });
  const other = repo.create({ patientId: 'pt_3', startAt: '2026-10-05T16:00', durationMinutes: 30, chair: 'Fauteuil 2' });
  assertHttpError(() => repo.update(other.id, { startAt: '2026-10-05T14:10' }), 409, /déjà un rendez-vous/);
});
