import type { LabCase } from './clinical-records.js';

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Appointment reasons that need the lab work back (fitting a prosthesis). */
const FITTING_WORDS = ['prothese', 'pose', 'scellement', 'couronne', 'bridge', 'inlay', 'onlay', 'facette', 'gouttiere', 'appareil', 'essayage'];
/** Taking an impression STARTS the lab work: no warning. */
const IMPRESSION_WORDS = ['empreinte'];
const NOT_BACK: LabCase['status'][] = ['planned', 'sent', 'in_lab', 'remake'];

const frDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * Warnings when a fitting appointment is booked before the patient's lab work is back:
 * an open lab case due after the appointment day, or not dated at all.
 */
export function labWarningsForAppointment(
  labCases: LabCase[],
  appointment: { startAt: string; reason?: string | null },
  toothLabel: (toothId: number) => string | number = id => id
): string[] {
  const reason = plain(appointment.reason ?? '');
  if (!FITTING_WORDS.some(w => reason.includes(w)) || IMPRESSION_WORDS.some(w => reason.includes(w))) return [];
  const day = appointment.startAt.slice(0, 10);
  return labCases
    .filter(c => NOT_BACK.includes(c.status) && (!c.dueDate || c.dueDate > day))
    .map(c => {
      const what = `« ${c.caseType} »${c.toothId ? ` (dent ${toothLabel(c.toothId)})` : ''}`;
      return c.dueDate
        ? `Travail de laboratoire ${what} pas encore revenu : retour prévu le ${frDate(c.dueDate)}, après ce rendez-vous.`
        : `Travail de laboratoire ${what} pas encore revenu, sans date de retour : vérifiez avec le laboratoire avant ce rendez-vous.`;
    });
}

type LabDates = Pick<LabCase, 'status' | 'sentDate' | 'returnedDate' | 'seatedDate'>;
const STEP_RANK: Record<LabCase['status'], number> = { planned: 0, sent: 1, in_lab: 1, remake: 1, returned: 2, seated: 3 };
const STEPS = [['sentDate', 'de l’envoi'], ['returnedDate', 'du retour'], ['seatedDate', 'de la pose']] as const;

/**
 * Applies a status/date change to a lab case and returns the dates to save.
 * - Moving the case along records the day it happened (sent, returned, seated).
 * - Stepping back, or a remake (the work goes back to the lab), clears the later steps;
 *   the remake's new sending gets today's date.
 * - Dates cannot be in the future nor out of order. Throws an Error with a French message.
 */
export function applyLabProgress<T extends Partial<LabDates>>(current: LabDates, changes: T, today: string): T & Partial<LabDates> {
  const out: Partial<LabDates> = { ...changes };
  const status = changes.status;
  if (status && status !== current.status) {
    const rank = STEP_RANK[status];
    STEPS.forEach(([field], i) => {
      if (rank <= i && out[field] === undefined) out[field] = undefined;
    });
    const again = current.status === 'remake' && status === 'sent';
    const field = status === 'sent' ? 'sentDate' : status === 'returned' ? 'returnedDate' : status === 'seated' ? 'seatedDate' : null;
    if (field && changes[field] === undefined && (again || !current[field])) {
      out[field] = today;
    }
  }
  const merged = { ...current, ...out };
  const known = STEPS.map(([field, label]) => [merged[field], label] as const).filter(([date]) => date) as Array<readonly [string, string]>;
  for (const [date, label] of known) {
    if (date > today) throw new Error(`La date ${label} ne peut pas être dans le futur.`);
  }
  for (let i = 1; i < known.length; i++) {
    if (known[i][0] < known[i - 1][0]) throw new Error(`La date ${known[i][1]} précède celle ${known[i - 1][1]}.`);
  }
  return out as T & Partial<LabDates>;
}
