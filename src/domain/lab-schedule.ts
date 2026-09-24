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
