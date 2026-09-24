import type { PatientRecord } from '../repositories/patients.js';
import { tokenizePatients } from './assistant-tools.js';

type SavedMessage = PatientRecord['consultHistory'][number];
export type ModelTurn = { role: 'user' | 'model'; parts: Array<{ text: string }> };

/** How much of a patient's saved conversation the model sees with a new question. */
export const HISTORY_MAX_MESSAGES = 8;
/** Older exchanges belong to another visit: their figures (balance, doses…) may be stale. */
export const HISTORY_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * The saved conversation as model turns: recent messages only, starting with a question,
 * consecutive messages of one role merged (app notes are saved as lone model lines), and
 * patient names coded with the same refs the new question will use (P1 stays P1).
 */
export function historyForModel(
  history: SavedMessage[],
  patients: PatientRecord[],
  activeId: string,
  now: Date = new Date()
): { turns: ModelTurn[]; refs: Record<string, string>; lastDiscussed: string | null } {
  const cutoff = now.getTime() - HISTORY_MAX_AGE_MS;
  const recent = history
    .filter(m => Date.parse(m.timestamp) >= cutoff && m.content.trim())
    .slice(-HISTORY_MAX_MESSAGES);
  while (recent.length && recent[0].role !== 'user') recent.shift();

  let refs: Record<string, string> = {};
  const turns: ModelTurn[] = [];
  for (const message of recent) {
    const coded = tokenizePatients(message.content, patients, activeId, refs);
    refs = coded.refs;
    const last = turns[turns.length - 1];
    if (last && last.role === message.role) last.parts[0].text += `\n\n${coded.text}`;
    else turns.push({ role: message.role, parts: [{ text: coded.text }] });
  }
  // The coded patient mentioned last: what « il / elle / son dossier » in a follow-up refers to.
  const mentioned = turns.flatMap(t => t.parts[0].text.match(/\bP\d+\b/g) ?? []).filter(code => refs[code]);
  return { turns, refs, lastDiscussed: mentioned.length ? mentioned[mentioned.length - 1] : null };
}
