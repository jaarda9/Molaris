import type { DB } from '../../db/connection.js';
import { newId, nowIso } from '../../db/ids.js';
import { HttpError } from '../../routes/http.js';

export const XRAY_KINDS = ['periapical', 'bitewing', 'panoramic', 'cbct', 'photo', 'other'] as const;
export type XrayKind = typeof XRAY_KINDS[number];

/** An X-ray or intraoral photo of a patient, without its image bytes. */
export interface Xray {
  id: string;
  patientId: string;
  kind: XrayKind;
  takenOn: string;            // 'YYYY-MM-DD'
  toothFdi: number | null;
  filename: string | null;
  mimeType: string;
  sizeBytes: number;
  /** The dentist's own reading. */
  interpretation: string | null;
  /** The AI second reading (decision support) and what it was asked. */
  aiQuery: string | null;
  aiAnalysis: string | null;
  aiModel: string | null;
  aiAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface XrayInput {
  patientId: string;
  kind: XrayKind;
  takenOn: string;
  toothFdi?: number | null;
  filename?: string | null;
  mimeType: string;
  data: Buffer;
  interpretation?: string | null;
}

interface XrayRow {
  id: string; patient_id: string; kind: XrayKind; taken_on: string; tooth_fdi: number | null;
  filename: string | null; mime_type: string; size_bytes: number; interpretation: string | null;
  ai_query: string | null; ai_analysis: string | null; ai_model: string | null; ai_at: string | null;
  created_at: string; updated_at: string;
}

const COLUMNS = `id, patient_id, kind, taken_on, tooth_fdi, filename, mime_type, size_bytes, interpretation,
  ai_query, ai_analysis, ai_model, ai_at, created_at, updated_at`;

const toXray = (r: XrayRow): Xray => ({
  id: r.id, patientId: r.patient_id, kind: r.kind, takenOn: r.taken_on, toothFdi: r.tooth_fdi,
  filename: r.filename, mimeType: r.mime_type, sizeBytes: r.size_bytes, interpretation: r.interpretation,
  aiQuery: r.ai_query, aiAnalysis: r.ai_analysis, aiModel: r.ai_model, aiAt: r.ai_at,
  createdAt: r.created_at, updatedAt: r.updated_at
});

const blankToNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
const pad2 = (n: number) => String(n).padStart(2, '0');
const localToday = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export class XrayRepository {
  constructor(private db: DB) {}

  /** A patient's X-rays, most recent first (image bytes not included). */
  listForPatient(patientId: string): Xray[] {
    const rows = this.db.prepare(`SELECT ${COLUMNS} FROM xrays WHERE patient_id = ? ORDER BY taken_on DESC, created_at DESC`)
      .all(patientId) as XrayRow[];
    return rows.map(toXray);
  }

  get(id: string): Xray | null {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM xrays WHERE id = ?`).get(id) as XrayRow | undefined;
    return row ? toXray(row) : null;
  }

  image(id: string): { mimeType: string; data: Buffer } | null {
    const row = this.db.prepare('SELECT mime_type, data FROM xrays WHERE id = ?').get(id) as { mime_type: string; data: Buffer } | undefined;
    return row ? { mimeType: row.mime_type, data: row.data } : null;
  }

  create(input: XrayInput, id: string = newId('xray'), createdAt: string = nowIso()): Xray {
    if (!this.db.prepare('SELECT 1 FROM patients WHERE id = ?').get(input.patientId)) throw new HttpError(404, 'Patient introuvable.');
    if (input.takenOn > localToday()) throw new HttpError(400, 'La date de la radiographie ne peut pas être dans le futur.');
    this.db.prepare(`
      INSERT INTO xrays (id, patient_id, kind, taken_on, tooth_fdi, filename, mime_type, size_bytes, data,
                         interpretation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.patientId, input.kind, input.takenOn, input.toothFdi ?? null, blankToNull(input.filename),
      input.mimeType, input.data.length, input.data, blankToNull(input.interpretation), createdAt, createdAt);
    return this.get(id)!;
  }

  /** Edits what describes the image (type, date, tooth, the dentist's interpretation); never the image. */
  update(id: string, changes: { kind?: XrayKind; takenOn?: string; toothFdi?: number | null; interpretation?: string | null }): Xray {
    const current = this.get(id);
    if (!current) throw new HttpError(404, 'Radiographie introuvable.');
    const takenOn = changes.takenOn ?? current.takenOn;
    if (takenOn > localToday()) throw new HttpError(400, 'La date de la radiographie ne peut pas être dans le futur.');
    this.db.prepare(`
      UPDATE xrays SET kind = ?, taken_on = ?, tooth_fdi = ?, interpretation = ?, updated_at = ? WHERE id = ?
    `).run(changes.kind ?? current.kind, takenOn,
      changes.toothFdi !== undefined ? changes.toothFdi : current.toothFdi,
      changes.interpretation !== undefined ? blankToNull(changes.interpretation) : current.interpretation,
      nowIso(), id);
    return this.get(id)!;
  }

  /** Stores the AI second reading (a new reading replaces the previous one). */
  setAnalysis(id: string, analysis: { query: string; text: string; model: string }, at: string = nowIso()): Xray {
    if (!this.get(id)) throw new HttpError(404, 'Radiographie introuvable.');
    this.db.prepare('UPDATE xrays SET ai_query = ?, ai_analysis = ?, ai_model = ?, ai_at = ?, updated_at = ? WHERE id = ?')
      .run(analysis.query, analysis.text, analysis.model, at, nowIso(), id);
    return this.get(id)!;
  }

  /** Only an image added today (a mistake: wrong patient, wrong file) can be deleted. */
  delete(id: string, now: Date = new Date()): void {
    const current = this.get(id);
    if (!current) throw new HttpError(404, 'Radiographie introuvable.');
    if (new Date(current.createdAt).toDateString() !== now.toDateString()) {
      throw new HttpError(409, 'Cette radiographie fait partie du dossier médical : elle ne peut plus être supprimée.');
    }
    this.db.prepare('DELETE FROM xrays WHERE id = ?').run(id);
  }
}
