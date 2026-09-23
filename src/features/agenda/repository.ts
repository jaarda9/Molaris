import type { DB } from '../../db/connection.js';

export type AppointmentStatus =
  'scheduled' | 'confirmed' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  patientId: string | null;
  patientLabel: string | null;
  patientPhone: string | null;
  startAt: string;          // clinic-local 'YYYY-MM-DDTHH:MM'
  endAt: string;
  chair: string | null;
  reason: string | null;
  status: AppointmentStatus;
  notes: string | null;
  reminderSentAt: string | null;
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
  created_at: string;
  updated_at: string;
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientLabel: row.patient_label,
    patientPhone: row.patient_phone,
    startAt: row.start_at,
    endAt: row.end_at,
    chair: row.chair,
    reason: row.reason,
    status: row.status,
    notes: row.notes,
    reminderSentAt: row.reminder_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class AppointmentRepository {
  constructor(private db: DB) {}

  /** Appointments starting in [fromDate, toDate] inclusive, both 'YYYY-MM-DD'. */
  listBetween(fromDate: string, toDate: string): Appointment[] {
    const rows = this.db.prepare(`
      SELECT * FROM appointments
      WHERE start_at >= ? AND start_at < date(?, '+1 day')
      ORDER BY start_at
    `).all(fromDate, toDate) as AppointmentRow[];
    return rows.map(toAppointment);
  }
}
