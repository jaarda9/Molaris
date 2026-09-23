export interface Identifiable {
  name: string;
  chartId: string;
}

export const REDACTED_PATIENT = '[PATIENT]';
export const REDACTED_CHART = '[CHART-ID]';

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
 * Replaces every known patient's full name, name parts, and chart ID in `text`
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
