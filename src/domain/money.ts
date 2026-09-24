/**
 * Tunisian dinar amounts are stored as integer millimes (1 DT = 1000 millimes)
 * so sums never drift the way floating-point dinars would.
 */
export const MILLIMES_PER_DINAR = 1000;

/**
 * Parses a user-entered dinar amount into millimes. Accepts both decimal
 * separators used in Tunisia ("125,500" and "125.500") and spaces as
 * thousands separators ("1 250,5"). Returns null for anything unparseable
 * or negative.
 */
export function parseDinarsToMillimes(input: string | number): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? Math.round(input * MILLIMES_PER_DINAR) : null;
  }
  let cleaned = input.trim().replace(/\s/g, '').replace(/(dt|tnd|د\.ت)$/i, '');
  // "1.250,500": dots group thousands, the comma marks millimes. "1.250.000": several
  // dots are thousands too. A single dot ("1.250") is the dinar/millime separator.
  if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  else if ((cleaned.match(/\./g) || []).length > 1) cleaned = cleaned.replace(/\./g, '');
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * MILLIMES_PER_DINAR + Number(fraction.padEnd(3, '0'));
}

/** Formats millimes the Tunisian way: 1250500 -> "1 250,500 DT". */
export function formatTnd(millimes: number): string {
  const sign = millimes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(millimes));
  const dinars = Math.floor(abs / MILLIMES_PER_DINAR);
  const rest = String(abs % MILLIMES_PER_DINAR).padStart(3, '0');
  const grouped = String(dinars).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped},${rest} DT`;
}
