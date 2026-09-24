/**
 * Age in whole years on `today` for a 'YYYY-MM-DD' birth date (clinic-local calendar),
 * or null when the date is missing or invalid. Born on 29 February: a year older on
 * 1 March in non-leap years.
 */
export function ageOn(birthDate: string | undefined | null, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate ?? '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d);
  if (beforeBirthday) age--;
  return age >= 0 ? age : null;
}
