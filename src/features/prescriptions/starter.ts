// Starter drug list offered to a new clinic (empty list), loaded only on request.
//
// Source for every dose below: The WHO AWaRe (Access, Watch, Reserve) antibiotic book,
// World Health Organization, 2022 — chapter 8 « Oral and dental infections », adult page
// (antibiotic treatment, symptomatic treatment, durations). Nothing else is added: no dose
// the WHO chapter does not give (e.g. metronidazole, penicillin-allergy alternatives), no
// brand. Adult doses: for children the prescription screen copies the DCI only and shows
// the WHO weight bands. The dentist reviews the list before use.
import type { DB } from '../../db/connection.js';
import { DrugRepository, type DrugInput } from './repository.js';

export const WHO_STARTER_DRUGS: DrugInput[] = [
  {
    // Access antibiotic, first choice. « Amoxicillin 500 mg q8h ORAL »; 3 days if adequate
    // source control, otherwise 5 days.
    dci: 'Amoxicilline', form: 'gélule', strength: '500 mg', category: 'antibiotique',
    defaultDosage: '1 gélule toutes les 8 heures',
    defaultDuration: '3 jours (5 jours si la cause n’a pas pu être traitée)',
    defaultInstructionsAr: 'كبسولة واحدة كل 8 ساعات'
  },
  {
    // Access antibiotic, equal first choice. « Phenoxymethylpenicillin 500 mg (800 000 IU) q6h ORAL ».
    dci: 'Phénoxyméthylpénicilline', form: 'comprimé', strength: '500 mg (800 000 UI)', category: 'antibiotique',
    defaultDosage: '1 comprimé toutes les 6 heures',
    defaultDuration: '3 jours (5 jours si la cause n’a pas pu être traitée)',
    defaultInstructionsAr: 'قرص واحد كل 6 ساعات'
  },
  {
    // « Paracetamol 500 mg–1 g q4–6h (max 4 g/day) »; max 2 g/day in hepatic impairment.
    dci: 'Paracétamol', form: 'comprimé', strength: '500 mg', category: 'antalgique',
    defaultDosage: '1 à 2 comprimés toutes les 4 à 6 heures si douleur, sans dépasser 8 comprimés (4 g) par jour',
    defaultDuration: null,
    defaultInstructionsAr: 'قرص إلى قرصين كل 4 إلى 6 ساعات عند الألم، دون تجاوز 8 أقراص في اليوم'
  },
  {
    // « Ibuprofen 200–400 mg q6–8h (max 2.4 g/day) ».
    dci: 'Ibuprofène', form: 'comprimé', strength: '200 mg', category: 'AINS',
    defaultDosage: '1 à 2 comprimés toutes les 6 à 8 heures si douleur, sans dépasser 12 comprimés (2,4 g) par jour',
    defaultDuration: null,
    defaultInstructionsAr: 'قرص إلى قرصين كل 6 إلى 8 ساعات عند الألم، دون تجاوز 12 قرصًا في اليوم'
  }
];

const key = (d: { dci: string; strength?: string | null }) =>
  `${d.dci} ${d.strength ?? ''}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Adds the WHO starter drugs that are not already in the list; returns how many were added. */
export function loadWhoStarterDrugs(db: DB): number {
  const repo = new DrugRepository(db);
  const existing = new Set(repo.list({ includeInactive: true }).map(key));
  let added = 0;
  db.transaction(() => {
    for (const drug of WHO_STARTER_DRUGS) {
      if (existing.has(key(drug))) continue;
      repo.create(drug);
      added++;
    }
  })();
  return added;
}
