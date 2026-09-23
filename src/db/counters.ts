import type { DB } from './connection.js';

/** Number prefixes: PT = patient chart, DV = devis (quote), REC = reçu (receipt), ORD = ordonnance. */
export type DocumentKind = 'PT' | 'DV' | 'REC' | 'ORD';

/**
 * Returns the next sequential number for a document kind, restarting each
 * calendar year (DV-2026-0001, DV-2026-0002, …). Atomic within SQLite, so
 * two documents can never share a number. Call inside the same transaction
 * that inserts the document to keep the sequence gap-free.
 */
export function nextDocumentNumber(db: DB, kind: DocumentKind, date: Date = new Date()): string {
  const year = date.getFullYear();
  const row = db.prepare(`
    INSERT INTO document_counters (kind, year, last) VALUES (?, ?, 1)
    ON CONFLICT(kind, year) DO UPDATE SET last = last + 1
    RETURNING last
  `).get(kind, year) as { last: number };
  return `${kind}-${year}-${String(row.last).padStart(4, '0')}`;
}
