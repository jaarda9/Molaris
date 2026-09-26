import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../../db/connection.js';
import { DrugRepository } from './repository.js';
import { loadStarterDrugs, STARTER_DRUGS } from './starter.js';

test('the starter list loads once, with the HAS 2026 antibiotic doses', () => {
  const db = openDatabase(':memory:');
  assert.equal(loadStarterDrugs(db), STARTER_DRUGS.length);
  assert.equal(loadStarterDrugs(db), 0, 'loading again adds nothing');
  const amox = new DrugRepository(db).list().find(d => d.dci === 'Amoxicilline')!;
  assert.equal(amox.strength, '1 g');
  assert.equal(amox.defaultDosage, '1 comprimé 3 fois par jour');
  assert.match(amox.defaultDuration!, /^3 jours \(prolonger de 2 jours/);
  // Nothing off-label and nothing without a sourced dose.
  assert.deepEqual(STARTER_DRUGS.map(d => d.dci), ['Amoxicilline', 'Azithromycine', 'Métronidazole', 'Paracétamol', 'Ibuprofène']);
});
