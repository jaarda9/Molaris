// WhatsApp reminders without any API: a https://wa.me/<digits>?text=… link that
// opens WhatsApp (web or desktop) with a pre-filled, bilingual French/Arabic message.

const TUNISIA_CODE = '216';

/**
 * Normalizes a phone number to the international digits wa.me expects.
 * Tunisian numbers: '+216 98 123 456', '98123456', '0021698123456' -> '21698123456'.
 * Foreign numbers written with '+' or '00' are kept as-is. Returns null when unusable.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  const international = raw.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (!international) {
    if (digits.length === 9 && digits.startsWith('0')) digits = digits.slice(1); // '098 123 456'
    if (digits.length === 8) return TUNISIA_CODE + digits;
    if (digits.length === 11 && digits.startsWith(TUNISIA_CODE)) return digits;
    return null;
  }
  if (digits.startsWith(TUNISIA_CODE)) return digits.length === 11 ? digits : null;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export interface ReminderInput {
  patientName: string;
  startAt: string;       // clinic-local 'YYYY-MM-DDTHH:MM'
  clinicName: string;    // may be empty
}

/** Polite bilingual reminder: French first, then Arabic. */
export function buildReminderMessage({ patientName, startAt, clinicName }: ReminderInput): string {
  const [datePart, time] = startAt.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const date = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  const name = patientName.trim();
  const clinic = clinicName.trim();

  const fr = [
    `Bonjour${name ? ` ${name}` : ''},`,
    `${clinic ? `${clinic} vous rappelle` : 'Nous vous rappelons'} votre rendez-vous dentaire ` +
      `le ${DAYS_FR[weekday]} ${date} à ${time.replace(':', 'h')}.`,
    `Merci de nous prévenir en cas d'empêchement. À bientôt !`
  ].join('\n');

  const ar = [
    `مرحبا${name ? ` ${name}` : ''}،`,
    `نذكّركم بموعدكم ${clinic ? `في ${clinic}` : 'في عيادة الأسنان'} يوم ${DAYS_AR[weekday]} ${date} على الساعة ${time}.`,
    `نرجو إعلامنا في حال تعذّر الحضور. شكرا.`
  ].join('\n');

  return `${fr}\n\n${ar}`;
}

export function buildWhatsAppLink(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}
