import type { DB } from '../../db/connection.js';

export interface Procedure {
  id: string;
  code: string | null;
  labelFr: string;
  labelAr: string | null;
  category: string | null;
  defaultPriceMillimes: number;
  cnamKeyLetter: string | null;
  cnamCoefficient: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProcedureRow {
  id: string;
  code: string | null;
  label_fr: string;
  label_ar: string | null;
  category: string | null;
  default_price_millimes: number;
  cnam_key_letter: string | null;
  cnam_coefficient: number | null;
  active: number;
  created_at: string;
  updated_at: string;
}

function toProcedure(row: ProcedureRow): Procedure {
  return {
    id: row.id,
    code: row.code,
    labelFr: row.label_fr,
    labelAr: row.label_ar,
    category: row.category,
    defaultPriceMillimes: row.default_price_millimes,
    cnamKeyLetter: row.cnam_key_letter,
    cnamCoefficient: row.cnam_coefficient,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class ProcedureRepository {
  constructor(private db: DB) {}

  list(options: { includeInactive?: boolean } = {}): Procedure[] {
    const rows = this.db.prepare(`
      SELECT * FROM procedures
      ${options.includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY category, label_fr
    `).all() as ProcedureRow[];
    return rows.map(toProcedure);
  }
}
