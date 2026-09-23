export interface Identifiable {
  name: string;
  chartId: string;
  phone?: string;
  cnamId?: string;
}

export const REDACTED_PATIENT = '[PATIENT]';
export const REDACTED_CHART = '[CHART-ID]';
export const REDACTED_PHONE = '[PHONE]';
export const REDACTED_CNAM = '[CNAM-ID]';

/**
 * Matches a known phone number however it is typed: with or without the
 * Tunisian prefix (+216 / 00216 / 216) and with any spaces, dots or dashes
 * between digits ("+216 98 123 456", "98.123.456", "0021698123456").
 */
function phonePattern(phone: string): RegExp | null {
  const digits = phone.replace(/\D/g, '').replace(/^(00)?216(?=\d{8}$)/, '');
  if (digits.length < 6) return null;
  const body = digits.split('').join('[\\s.-]?');
  return new RegExp(`(?<!\\d)(?:(?:\\+|00)?216[\\s.-]?)?${body}(?!\\d)`, 'g');
}

const MIN_NAME_PART_LENGTH = 3;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// \b is ASCII-only in JS regex, so it would miss boundaries around accented
// or Arabic letters (e.g. "Hédi", "بن علي"); use Unicode-aware lookarounds.
function wholeWordPattern(term: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, 'giu');
}

/**
 * Replaces every known patient's phone, CNAM id, full name, name parts, and chart ID in `text`
 * before it is sent to an external AI provider. Full names are replaced before
 * individual parts so "Eleanor Davis" becomes one placeholder, not two.
 */
export function redactIdentifiers(text: string, people: Identifiable[]): string {
  if (!text) return text;
  let out = text;

  const fullNames = new Set<string>();
  const nameParts = new Set<string>();
  const chartIds = new Set<string>();

  for (const p of people) {
    const name = (p.name || '').trim();
    if (name) {
      fullNames.add(name);
      name.split(/\s+/).filter(part => part.length >= MIN_NAME_PART_LENGTH).forEach(part => nameParts.add(part));
    }
    if (p.chartId) chartIds.add(p.chartId.trim());
  }

  const byLengthDesc = (a: string, b: string) => b.length - a.length;

  // Numbers first, so a name part can never break up a phone or id.
  for (const p of people) {
    const pattern = p.phone ? phonePattern(p.phone) : null;
    if (pattern) out = out.replace(pattern, REDACTED_PHONE);
    if (p.cnamId && p.cnamId.trim()) out = out.replace(wholeWordPattern(p.cnamId.trim()), REDACTED_CNAM);
  }

  for (const id of [...chartIds].sort(byLengthDesc)) {
    out = out.replace(wholeWordPattern(id), REDACTED_CHART);
  }
  for (const full of [...fullNames].sort(byLengthDesc)) {
    out = out.replace(wholeWordPattern(full), REDACTED_PATIENT);
  }
  for (const part of [...nameParts].sort(byLengthDesc)) {
    out = out.replace(wholeWordPattern(part), REDACTED_PATIENT);
  }
  return out;
}

interface TextPart { text?: string; [key: string]: unknown }
interface ContentEntry { role?: string; parts?: TextPart[]; [key: string]: unknown }

/** Returns a deep-redacted copy of a Gemini `contents` array; non-text parts (images) pass through untouched. */
export function redactContents<T extends ContentEntry[]>(contents: T, people: Identifiable[]): T {
  return contents.map(entry => ({
    ...entry,
    parts: (entry.parts || []).map(part =>
      typeof part.text === 'string' ? { ...part, text: redactIdentifiers(part.text, people) } : part
    )
  })) as T;
}
