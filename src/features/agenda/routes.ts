import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { getClinicIdentity } from '../../db/settings.js';
import { HttpError, parse, route } from '../../routes/http.js';
import {
  APPOINTMENT_STATUSES, AppointmentRepository, getAgendaSettings, isValidLocalDateTime, setAgendaSettings
} from './repository.js';
import { buildReminderMessage, buildWhatsAppLink, normalizePhone } from './reminder.js';

export const agendaRouter = Router();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format attendu AAAA-MM-JJ');
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'format attendu HH:MM');
const localDateTime = z.string().refine(isValidLocalDateTime, 'date/heure invalide (format AAAA-MM-JJTHH:MM)');
const optionalText = (max: number) => z.string().max(max).nullable().optional();

const appointmentFields = {
  patientId: z.string().max(100).nullable().optional(),
  patientLabel: optionalText(120),
  patientPhone: optionalText(40),
  startAt: localDateTime,
  durationMinutes: z.number().int().min(5, 'durée minimale 5 min').max(480, 'durée maximale 8 h'),
  chair: optionalText(60),
  reason: optionalText(120),
  notes: optionalText(2000),
  status: z.enum(APPOINTMENT_STATUSES).optional()
};
const createSchema = z.object(appointmentFields);
const updateSchema = z.object(appointmentFields).partial();

const repo = () => new AppointmentRepository(getDb());

agendaRouter.get('/api/appointments', route((req, res) => {
  const { from, to } = parse(z.object({ from: isoDate, to: isoDate }), req.query);
  if (to < from) throw new HttpError(400, 'to: doit être après from');
  res.json({ appointments: repo().listBetween(from, to) });
}));

agendaRouter.post('/api/appointments', route((req, res) => {
  const input = parse(createSchema, req.body);
  res.status(201).json({ success: true, appointment: repo().create(input) });
}));

agendaRouter.put('/api/appointments/:id', route((req, res) => {
  const changes = parse(updateSchema, req.body);
  res.json({ success: true, appointment: repo().update(req.params.id, changes) });
}));

agendaRouter.delete('/api/appointments/:id', route((req, res) => {
  repo().delete(req.params.id);
  res.json({ success: true });
}));

/** Builds the wa.me link for the front end to open, and records that a reminder was sent. */
agendaRouter.post('/api/appointments/:id/reminder', route((req, res) => {
  const appointments = repo();
  const appointment = appointments.require(req.params.id);
  const phone = normalizePhone(appointment.phone);
  if (!phone) throw new HttpError(400, 'Numéro de téléphone manquant ou invalide pour ce rendez-vous.');
  const clinic = getClinicIdentity(getDb());
  const message = buildReminderMessage({
    patientName: appointment.patientName,
    startAt: appointment.startAt,
    clinicName: clinic.clinicName || clinic.doctorName
  });
  const updated = appointments.markReminderSent(appointment.id);
  res.json({ success: true, appointment: updated, link: buildWhatsAppLink(phone, message), message });
}));

const hoursSchema = z.object({
  start: clockTime,
  end: clockTime,
  days: z.array(z.number().int().min(0).max(6)).max(7)
});

agendaRouter.get('/api/agenda/settings', route((req, res) => {
  res.json({ settings: getAgendaSettings(getDb()) });
}));

agendaRouter.put('/api/agenda/settings', route((req, res) => {
  const input = parse(z.object({
    hours: hoursSchema.optional(),
    chairs: z.array(z.string().max(60)).max(20).optional()
  }), req.body);
  res.json({ success: true, settings: setAgendaSettings(getDb(), input) });
}));
