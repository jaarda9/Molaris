import type { DB } from '../../db/connection.js';
import { newId, nowIso } from '../../db/ids.js';
import { getJsonSetting, setJsonSetting } from '../../db/settings.js';
import { HttpError, notFound } from '../../routes/http.js';

export const APPOINTMENT_STATUSES =
  ['scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

/** Cancelled and no-show appointments free their slot. */
const NON_BLOCKING: AppointmentStatus[] = ['cancelled', 'no_show'];
/** Statuses that describe a visit on its day (never a future appointment; never deleted). */
const HAPPENED: AppointmentStatus[] = ['arrived', 'in_progress', 'completed', 'no_show'];

const pad2 = (n: number) => String(n).padStart(2, '0');
/** Clinic-local 'YYYY-MM-DD' (the server runs on the clinic PC). */
function localToday(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Why a WhatsApp reminder must not be sent, or null if it can: the appointment is
 * cancelled / missed / finished, or already past. `nowLocal` is 'YYYY-MM-DDTHH:MM'.
 */
export function reminderBlockReason(appointment: Pick<Appointment, 'startAt' | 'status'>, nowLocal: string): string | null {
  if (appointment.status === 'cancelled') return 'Ce rendez-vous est annulé : pas de rappel.';
  if (appointment.status === 'no_show' || appointment.status === 'completed') return 'Ce rendez-vous est terminé ou le patient était absent : pas de rappel.';
  if (appointment.startAt < nowLocal) return 'Ce rendez-vous est déjà passé : pas de rappel.';
  return null;
}

export interface Appointment {
  id: string;
  patientId: string | null;
  patientLabel: string | null;
  patientPhone: string | null;
  /** Display name: the chart's name, or the caller's name for walk-ins. */
  patientName: string;
  chartId: string | null;
  /** Contact number: the one typed on the appointment, else the chart's. */
  phone: string | null;
  startAt: string;          // clinic-local 'YYYY-MM-DDTHH:MM'
  endAt: string;
  chair: string | null;
  reason: string | null;
  status: AppointmentStatus;
  notes: string | null;
  reminderSentAt: string | null;
  arrivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentRow {
  id: string;
  patient_id: string | null;
  patient_label: string | null;
  patient_phone: string | null;
  start_at: string;
  end_at: string;
  chair: string | null;
  reason: string | null;
  status: AppointmentStatus;
  notes: string | null;
  reminder_sent_at: string | null;
  arrived_at: string | null;
  created_at: string;
  updated_at: string;
  chart_name: string | null;
  chart_id: string | null;
  chart_phone: string | null;
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientLabel: row.patient_label,
    patientPhone: row.patient_phone,
    patientName: row.chart_name ?? row.patient_label ?? '',
    chartId: row.chart_id,
    phone: row.patient_phone || row.chart_phone || null,
    startAt: row.start_at,
    endAt: row.end_at,
    chair: row.chair,
    reason: row.reason,
    status: row.status,
    notes: row.notes,
    reminderSentAt: row.reminder_sent_at,
    arrivedAt: row.arrived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const SELECT = `
  SELECT a.*, p.name AS chart_name, p.chart_id AS chart_id, p.phone AS chart_phone
  FROM appointments a
  LEFT JOIN patients p ON p.id = a.patient_id
`;

// ---------------------------------------------------------------------------
// Clinic-local time arithmetic on 'YYYY-MM-DDTHH:MM' strings. Done in UTC so the
// server's own timezone/DST never shifts a clinic time.
// ---------------------------------------------------------------------------
export const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isValidLocalDateTime(value: string): boolean {
  if (!LOCAL_DATETIME.test(value)) return false;
  const d = new Date(`${value}:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 16) === value;
}

export function addMinutes(localDateTime: string, minutes: number): string {
  const d = new Date(`${localDateTime}:00Z`);
  return new Date(d.getTime() + minutes * 60_000).toISOString().slice(0, 16);
}

export function minutesBetween(fromLocal: string, toLocal: string): number {
  return Math.round((new Date(`${toLocal}:00Z`).getTime() - new Date(`${fromLocal}:00Z`).getTime()) / 60_000);
}

const hhmm = (localDateTime: string) => localDateTime.slice(11, 16);

// ---------------------------------------------------------------------------
// Opening hours (settings key 'agenda.hours') and chairs ('agenda.chairs').
// ---------------------------------------------------------------------------
export interface AgendaHours {
  start: string;     // 'HH:MM'
  end: string;       // 'HH:MM'
  days: number[];    // open weekdays, 0 = Sunday … 6 = Saturday
}

export interface AgendaSettings {
  hours: AgendaHours;
  chairs: string[];
}

export const DEFAULT_HOURS: AgendaHours = { start: '08:30', end: '18:00', days: [1, 2, 3, 4, 5, 6] };

export function getAgendaSettings(db: DB): AgendaSettings {
  return {
    hours: { ...DEFAULT_HOURS, ...(getJsonSetting<Partial<AgendaHours>>(db, 'agenda.hours') || {}) },
    chairs: getJsonSetting<string[]>(db, 'agenda.chairs') || []
  };
}

export function setAgendaSettings(db: DB, settings: Partial<AgendaSettings>): AgendaSettings {
  if (settings.hours) {
    if (settings.hours.end <= settings.hours.start) {
      throw new HttpError(400, "L'heure de fermeture doit être après l'heure d'ouverture.");
    }
    if (settings.hours.days.length === 0) throw new HttpError(400, 'Choisissez au moins un jour d\'ouverture.');
    setJsonSetting(db, 'agenda.hours', {
      start: settings.hours.start,
      end: settings.hours.end,
      days: [...new Set(settings.hours.days)].sort((a, b) => a - b)
    });
  }
  if (settings.chairs) {
    const chairs = [...new Set(settings.chairs.map(c => c.trim()).filter(Boolean))];
    setJsonSetting(db, 'agenda.chairs', chairs);
  }
  return getAgendaSettings(db);
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export interface AppointmentInput {
  patientId?: string | null;
  patientLabel?: string | null;
  patientPhone?: string | null;
  startAt: string;
  durationMinutes: number;
  chair?: string | null;
  reason?: string | null;
  notes?: string | null;
  status?: AppointmentStatus;
}

export type AppointmentUpdate = Partial<AppointmentInput>;

const clean = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
};

export class AppointmentRepository {
  constructor(private db: DB) {}

  /** Appointments starting in [fromDate, toDate] inclusive, both 'YYYY-MM-DD'. */
  listBetween(fromDate: string, toDate: string): Appointment[] {
    const rows = this.db.prepare(`
      ${SELECT}
      WHERE a.start_at >= ? AND a.start_at < date(?, '+1 day')
      ORDER BY a.start_at, a.chair
    `).all(fromDate, toDate) as AppointmentRow[];
    return rows.map(toAppointment);
  }

  get(id: string): Appointment | undefined {
    const row = this.db.prepare(`${SELECT} WHERE a.id = ?`).get(id) as AppointmentRow | undefined;
    return row && toAppointment(row);
  }

  require(id: string): Appointment {
    const appointment = this.get(id);
    if (!appointment) throw notFound('Appointment');
    return appointment;
  }

  /**
   * The first active appointment on the same chair overlapping [startAt, endAt).
   * Touching slots (one ends at 10:00, the next starts at 10:00) do not overlap.
   * Appointments without a chair share one implicit chair.
   */
  findConflict(startAt: string, endAt: string, chair: string | null, excludeId?: string): Appointment | undefined {
    const row = this.db.prepare(`
      ${SELECT}
      WHERE a.start_at < @endAt AND a.end_at > @startAt
        AND COALESCE(a.chair, '') = @chair
        AND a.status NOT IN (${NON_BLOCKING.map(s => `'${s}'`).join(', ')})
        AND a.id != @excludeId
      ORDER BY a.start_at
      LIMIT 1
    `).get({ startAt, endAt, chair: chair ?? '', excludeId: excludeId ?? '' }) as AppointmentRow | undefined;
    return row && toAppointment(row);
  }

  create(input: AppointmentInput): Appointment {
    const id = newId('apt');
    const now = nowIso();
    const patientId = clean(input.patientId);
    const status = input.status ?? 'scheduled';
    const row = {
      id,
      patient_id: patientId,
      // A chart's name is read through the join; the label is only for callers without one.
      patient_label: patientId ? null : clean(input.patientLabel),
      patient_phone: clean(input.patientPhone),
      start_at: input.startAt,
      end_at: addMinutes(input.startAt, input.durationMinutes),
      chair: clean(input.chair),
      reason: clean(input.reason),
      status,
      notes: clean(input.notes),
      arrived_at: status === 'arrived' ? now : null,
      created_at: now,
      updated_at: now
    };
    this.db.transaction(() => {
      this.validate(row);
      this.db.prepare(`
        INSERT INTO appointments (id, patient_id, patient_label, patient_phone, start_at, end_at, chair,
          reason, status, notes, arrived_at, created_at, updated_at)
        VALUES (@id, @patient_id, @patient_label, @patient_phone, @start_at, @end_at, @chair,
          @reason, @status, @notes, @arrived_at, @created_at, @updated_at)
      `).run(row);
    })();
    return this.require(id);
  }

  /** Edit, reschedule or change status. Only the fields present in `changes` are touched. */
  update(id: string, changes: AppointmentUpdate): Appointment {
    const current = this.require(id);
    const now = nowIso();
    const has = (key: keyof AppointmentUpdate) => changes[key] !== undefined;

    const patientId = has('patientId') ? clean(changes.patientId) : current.patientId;
    const startAt = changes.startAt ?? current.startAt;
    const duration = changes.durationMinutes ?? minutesBetween(current.startAt, current.endAt);
    const endAt = addMinutes(startAt, duration);
    const rescheduled = startAt !== current.startAt || endAt !== current.endAt;

    let status = changes.status ?? current.status;
    // A confirmation was for the old time slot; a new time needs a new confirmation.
    if (rescheduled && !changes.status && status === 'confirmed') status = 'scheduled';

    let arrivedAt = current.arrivedAt;
    if (status === 'arrived' && current.status !== 'arrived') arrivedAt = now;
    if (status === 'scheduled' || status === 'confirmed') arrivedAt = null;

    const row = {
      id,
      patient_id: patientId,
      patient_label: patientId ? null : clean(has('patientLabel') ? changes.patientLabel : current.patientLabel),
      patient_phone: clean(has('patientPhone') ? changes.patientPhone : current.patientPhone),
      start_at: startAt,
      end_at: endAt,
      chair: has('chair') ? clean(changes.chair) : current.chair,
      reason: has('reason') ? clean(changes.reason) : current.reason,
      status,
      notes: has('notes') ? clean(changes.notes) : current.notes,
      // A reminder for the old time is no longer valid.
      reminder_sent_at: rescheduled ? null : current.reminderSentAt,
      arrived_at: arrivedAt,
      updated_at: now
    };
    this.db.transaction(() => {
      this.validate(row);
      this.db.prepare(`
        UPDATE appointments SET patient_id = @patient_id, patient_label = @patient_label,
          patient_phone = @patient_phone, start_at = @start_at, end_at = @end_at, chair = @chair,
          reason = @reason, status = @status, notes = @notes, reminder_sent_at = @reminder_sent_at,
          arrived_at = @arrived_at, updated_at = @updated_at
        WHERE id = @id
      `).run(row);
    })();
    return this.require(id);
  }

  setStatus(id: string, status: AppointmentStatus): Appointment {
    return this.update(id, { status });
  }

  markReminderSent(id: string): Appointment {
    this.require(id);
    const now = nowIso();
    this.db.prepare('UPDATE appointments SET reminder_sent_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
    return this.require(id);
  }

  /** Only a planned (or cancelled) appointment can be deleted: a visit that took place stays in the history. */
  delete(id: string): void {
    const appointment = this.require(id);
    if (HAPPENED.includes(appointment.status)) {
      throw new HttpError(409, 'Ce rendez-vous a eu lieu (ou le patient était absent) : il reste dans l’historique. Annulez-le au lieu de le supprimer.');
    }
    this.db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  }

  private validate(row: {
    id: string; patient_id: string | null; patient_label: string | null;
    start_at: string; end_at: string; chair: string | null; status: AppointmentStatus;
  }): void {
    if (row.patient_id) {
      const exists = this.db.prepare('SELECT 1 FROM patients WHERE id = ?').get(row.patient_id);
      if (!exists) throw new HttpError(400, 'Patient introuvable.');
    } else if (!row.patient_label) {
      throw new HttpError(400, 'Choisissez un patient ou saisissez le nom de la personne.');
    }
    if (row.end_at <= row.start_at) throw new HttpError(400, 'La durée doit être positive.');
    // "Arrivé", "en cours", "terminé", "absent" describe a visit on its day, not a future one.
    if (HAPPENED.includes(row.status) && row.start_at.slice(0, 10) > localToday()) {
      throw new HttpError(409, 'Ce rendez-vous n’a pas encore eu lieu : il ne peut pas être marqué arrivé, en cours, terminé ou absent.');
    }

    if (NON_BLOCKING.includes(row.status)) return;

    // One patient cannot sit in two chairs at once.
    if (row.patient_id) {
      const own = this.db.prepare(`
        ${SELECT}
        WHERE a.patient_id = @patientId AND a.start_at < @endAt AND a.end_at > @startAt
          AND a.status NOT IN (${NON_BLOCKING.map(s => `'${s}'`).join(', ')})
          AND a.id != @id
        ORDER BY a.start_at LIMIT 1
      `).get({ patientId: row.patient_id, startAt: row.start_at, endAt: row.end_at, id: row.id }) as AppointmentRow | undefined;
      if (own) {
        const where = own.chair ? ` (${own.chair})` : '';
        throw new HttpError(409,
          `Ce patient a déjà un rendez-vous de ${hhmm(own.start_at)} à ${hhmm(own.end_at)}${where}. ` +
          'Déplacez ce rendez-vous ou choisissez un autre horaire.');
      }
    }

    const conflict = this.findConflict(row.start_at, row.end_at, row.chair, row.id);
    if (conflict) {
      const where = row.chair ? `sur « ${row.chair} »` : 'sur ce fauteuil';
      throw new HttpError(409,
        `Créneau déjà occupé ${where} : ${conflict.patientName || 'rendez-vous'} de ${hhmm(conflict.startAt)} à ${hhmm(conflict.endAt)}. ` +
        'Choisissez un autre horaire ou un autre fauteuil.');
    }
  }
}
