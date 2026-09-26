// Starter drug list offered to a new clinic (empty list), loaded only on request.
//
// Sources (see docs/medical/references-cliniques-logiciel.md):
// - Antibiotics: HAS, « Prescription des antibiotiques en pratique bucco-dentaire », juillet
//   2026, tableau 14 (adulte). Tunisia has no dental prescribing guideline of its own and
//   follows the French references.
// - Analgesics (not covered by the HAS text, which is about antibiotics): WHO AWaRe
//   antibiotic book 2022, chapter 8, « Symptomatic treatment ».
// Nothing else is added: no dose these sources do not give, no brand, no off-label use
// (clarithromycin and pristinamycin are « hors AMM » in the HAS table). Adult doses: for
// children the prescription screen copies the DCI only and shows the HAS weight-based dose.
// The dentist reviews the list before use.
import type { DB } from '../../db/connection.js';
import { DrugRepository, type DrugInput } from './repository.js';

const THREE_DAYS = '3 jours (prolonger de 2 jours si les symptômes persistent)';

export const STARTER_DRUGS: DrugInput[] = [
  {
    // HAS 2026, 1re intention (parodontite apicale aiguë, abcès apical ou parodontal,
    // péri-implantite, alvéolite suppurée…): « Amoxicilline 1 g, 3 fois par jour, durant 3 jours ».
    dci: 'Amoxicilline', form: 'comprimé', strength: '1 g', category: 'antibiotique',
    defaultDosage: '1 comprimé 3 fois par jour', defaultDuration: THREE_DAYS,
    defaultInstructionsAr: 'قرص واحد 3 مرات في اليوم'
  },
  {
    // HAS 2026, alternative en cas d'allergie avérée aux pénicillines (with AMM):
    // « Azithromycine 500 mg, 1 fois par jour, durant 3 jours ».
    dci: 'Azithromycine', form: 'comprimé', strength: '500 mg', category: 'antibiotique',
    defaultDosage: '1 comprimé par jour (allergie aux pénicillines)', defaultDuration: '3 jours',
    defaultInstructionsAr: 'قرص واحد مرة واحدة في اليوم'
  },
  {
    // HAS 2026, 1re intention pour la maladie parodontale nécrosante:
    // « Métronidazole 500 mg, 3 fois par jour, durant 3 jours ».
    dci: 'Métronidazole', form: 'comprimé', strength: '500 mg', category: 'antibiotique',
    defaultDosage: '1 comprimé 3 fois par jour', defaultDuration: THREE_DAYS,
    defaultInstructionsAr: 'قرص واحد 3 مرات في اليوم'
  },
  {
    // WHO: « Paracetamol 500 mg–1 g q4–6h (max 4 g/day) »; max 2 g/day in hepatic impairment.
    dci: 'Paracétamol', form: 'comprimé', strength: '500 mg', category: 'antalgique',
    defaultDosage: '1 à 2 comprimés toutes les 4 à 6 heures si douleur, sans dépasser 8 comprimés (4 g) par jour',
    defaultDuration: null,
    defaultInstructionsAr: 'قرص إلى قرصين كل 4 إلى 6 ساعات عند الألم، دون تجاوز 8 أقراص في اليوم'
  },
  {
    // WHO: « Ibuprofen 200–400 mg q6–8h (max 2.4 g/day) ».
    dci: 'Ibuprofène', form: 'comprimé', strength: '200 mg', category: 'AINS',
    defaultDosage: '1 à 2 comprimés toutes les 6 à 8 heures si douleur, sans dépasser 12 comprimés (2,4 g) par jour',
    defaultDuration: null,
    defaultInstructionsAr: 'قرص إلى قرصين كل 6 إلى 8 ساعات عند الألم، دون تجاوز 12 قرصًا في اليوم'
  }
];

const key = (d: { dci: string; strength?: string | null }) =>
  `${d.dci} ${d.strength ?? ''}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Adds the starter drugs that are not already in the list; returns how many were added. */
export function loadStarterDrugs(db: DB): number {
  const repo = new DrugRepository(db);
  const existing = new Set(repo.list({ includeInactive: true }).map(key));
  let added = 0;
  db.transaction(() => {
    for (const drug of STARTER_DRUGS) {
      if (existing.has(key(drug))) continue;
      repo.create(drug);
      added++;
    }
  })();
  return added;
}
