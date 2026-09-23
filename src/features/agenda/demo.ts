// Demo agenda for client demos (picked up by `npm run db:demo`). Everything is
// relative to the moment the demo database is built: today's past appointments
// are done, the current one is in the chair, the next ones are in the waiting
// room, and the next open day has appointments that still need a reminder.
import type { DB } from '../../db/connection.js';
import { newId, nowIso } from '../../db/ids.js';
import { setJsonSetting } from '../../db/settings.js';
import { addMinutes, AppointmentStatus, DEFAULT_HOURS } from './repository.js';

interface Walker { name: string; phone: string }
const WALK_INS: Record<string, Walker> = {
  amira: { name: 'Amira Jlassi', phone: '+216 22 314 587' },
  karim: { name: 'Karim Ben Ammar', phone: '50 612 903' },
  sana: { name: 'Sana Mejri', phone: '97245118' },
  hedi: { name: 'Hédi Bouazizi', phone: '+216 24 870 331' },
  mehdi: { name: 'Mehdi Sassi', phone: '0021655321764' },
  nizar: { name: 'Nizar Hammami', phone: '+216 98 402 116' },
  rim: { name: 'Rim Chaabane', phone: '+216 29 118 540' },
  yassine: { name: 'Yassine Karoui', phone: '+216 53 776 209' }
};

type Who = 'pt_1' | 'pt_2' | 'pt_3' | keyof typeof WALK_INS;
type Plan = 'no_show' | 'cancelled' | 'confirmed' | 'reminded' | undefined;
type Slot = [chair: 1 | 2, time: string, minutes: number, who: Who, reason: string, notes?: string, plan?: Plan];

const TODAY: Slot[] = [
  [1, '08:30', 30, 'pt_2', 'Contrôle', 'Contrôle post-opératoire 25'],
  [1, '09:00', 45, 'amira', 'Urgence', 'Douleur 36 depuis 3 jours, réveille la nuit'],
  [1, '10:00', 60, 'pt_1', 'Endodontie', 'Traitement canalaire 46, séance 2'],
  [1, '11:15', 30, 'karim', 'Consultation', 'Première consultation'],
  [1, '11:45', 30, 'pt_3', 'Détartrage', undefined, 'confirmed'],
  [1, '14:00', 45, 'pt_2', 'Soins', 'Composite 25 (vestibulaire)', 'confirmed'],
  [1, '15:00', 30, 'mehdi', 'Consultation'],
  [1, '15:30', 90, 'pt_1', 'Prothèse', 'Empreinte couronne 36', 'confirmed'],
  [1, '17:15', 30, 'rim', 'Contrôle'],
  [2, '08:45', 45, 'nizar', 'Extraction', 'Extraction 48, radio panoramique apportée'],
  [2, '09:30', 30, 'hedi', 'Contrôle', undefined, 'no_show'],
  [2, '10:30', 30, 'pt_3', 'Consultation', 'Annulé par téléphone, à rappeler', 'cancelled'],
  [2, '11:00', 60, 'sana', 'Soins', 'Soins 14 et 15'],
  [2, '14:30', 30, 'yassine', 'Détartrage', undefined, 'confirmed'],
  [2, '16:00', 45, 'pt_3', 'Soins']
];

const NEXT_DAY: Slot[] = [
  [1, '09:00', 30, 'pt_3', 'Contrôle', undefined, 'reminded'],
  [1, '10:00', 45, 'pt_2', 'Endodontie', 'Pulpectomie 24'],
  [1, '11:30', 30, 'amira', 'Contrôle', 'Contrôle après urgence 36'],
  [2, '09:30', 60, 'pt_1', 'Prothèse', 'Essayage couronne 36'],
  [2, '14:00', 30, 'karim', 'Détartrage']
];

// Lighter days to fill the rest of the week view.
const OTHER_DAY: Slot[] = [
  [1, '09:00', 30, 'rim', 'Détartrage'],
  [1, '10:30', 45, 'pt_1', 'Soins'],
  [2, '11:00', 30, 'yassine', 'Consultation'],
  [1, '14:30', 60, 'pt_2', 'Prothèse'],
  [2, '16:00', 30, 'hedi', 'Contrôle']
];

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDateTime = (d: Date) => `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function seedDemo(db: DB): void {
  setJsonSetting(db, 'agenda.hours', DEFAULT_HOURS);
  setJsonSetting(db, 'agenda.chairs', ['Fauteuil 1', 'Fauteuil 2']);

  const now = new Date();
  const nowLocal = localDateTime(now);
  const today = localDate(now);
  const minutesAgoIso = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

  const insert = db.prepare(`
    INSERT INTO appointments (id, patient_id, patient_label, patient_phone, start_at, end_at, chair,
      reason, status, notes, reminder_sent_at, arrived_at, created_at, updated_at)
    VALUES (@id, @patientId, @label, @phone, @startAt, @endAt, @chair,
      @reason, @status, @notes, @reminderSentAt, @arrivedAt, @createdAt, @createdAt)
  `);

  let waiting = 0;
  const add = (date: string, [chair, time, minutes, who, reason, notes, plan]: Slot, when: 'past' | 'today' | 'future') => {
    const startAt = `${date}T${time}`;
    const endAt = addMinutes(startAt, minutes);
    let status: AppointmentStatus = plan === 'confirmed' || plan === 'reminded' ? 'confirmed' : 'scheduled';
    let arrivedAt: string | null = null;

    if (plan === 'cancelled') status = 'cancelled';
    else if (when === 'past') status = plan === 'no_show' ? 'no_show' : 'completed';
    else if (when === 'today') {
      if (endAt <= nowLocal) status = plan === 'no_show' ? 'no_show' : 'completed';
      else if (startAt <= nowLocal) status = 'in_progress';
      else if (waiting < 2 && addMinutes(nowLocal, 40) >= startAt) {
        // Patients come early: the next one or two are already in the waiting room.
        status = 'arrived';
        arrivedAt = minutesAgoIso(waiting === 0 ? 14 : 5);
        waiting++;
      }
    }

    const walkIn = who.startsWith('pt_') ? null : WALK_INS[who];
    insert.run({
      id: newId('apt'),
      patientId: walkIn ? null : who,
      label: walkIn?.name ?? null,
      phone: walkIn?.phone ?? null,
      startAt,
      endAt,
      chair: `Fauteuil ${chair}`,
      reason,
      status,
      notes: notes ?? null,
      reminderSentAt: plan === 'reminded' || (when !== 'future' && status !== 'cancelled') ? minutesAgoIso(60 * 20) : null,
      arrivedAt,
      createdAt: minutesAgoIso(60 * 24 * 5)
    });
  };

  for (const slot of TODAY) add(today, slot, 'today');

  // Next open day (Saturday -> Monday): the one the reminders panel is about.
  const next = new Date(now);
  do next.setDate(next.getDate() + 1); while (!DEFAULT_HOURS.days.includes(next.getDay()));
  const nextDay = localDate(next);
  for (const slot of NEXT_DAY) add(nextDay, slot, 'future');

  // Rest of the current week (Monday–Saturday), plus the next open day's week if it differs.
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  for (let i = 0; i < 6; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const date = localDate(day);
    if (date === today || date === nextDay) continue;
    const slots = OTHER_DAY.filter((_, k) => (k + i) % 5 !== 0); // vary the days a little
    for (const slot of slots) add(date, slot, date < today ? 'past' : 'future');
  }
}
