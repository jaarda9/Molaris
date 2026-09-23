import type { DB } from '../../db/connection.js';

export interface Drug {
  id: string;
  dci: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  defaultDosage: string | null;
  defaultDuration: string | null;
  category: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DrugRow {
  id: string;
  dci: string;
  brand: string | null;
  form: string | null;
  strength: string | null;
  default_dosage: string | null;
  default_duration: string | null;
  category: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

function toDrug(row: DrugRow): Drug {
  return {
    id: row.id,
    dci: row.dci,
    brand: row.brand,
    form: row.form,
    strength: row.strength,
    defaultDosage: row.default_dosage,
    defaultDuration: row.default_duration,
    category: row.category,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class DrugRepository {
  constructor(private db: DB) {}

  list(options: { includeInactive?: boolean } = {}): Drug[] {
    const rows = this.db.prepare(`
      SELECT * FROM drugs
      ${options.includeInactive ? '' : 'WHERE active = 1'}
      ORDER BY category, dci
    `).all() as DrugRow[];
    return rows.map(toDrug);
  }
}
