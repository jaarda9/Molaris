import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../../db/connection.js';
import { DrugRepository } from './repository.js';
import { loadWhoStarterDrugs, WHO_STARTER_DRUGS } from './starter.js';

test('the WHO starter list loads once, and holds only WHO-sourced doses', () => {
  const db = openDatabase(':memory:');
  assert.equal(loadWhoStarterDrugs(db), WHO_STARTER_DRUGS.length);
  assert.equal(loadWhoStarterDrugs(db), 0, 'loading again adds nothing');
  const amox = new DrugRepository(db).list().find(d => d.dci === 'Amoxicilline')!;
  assert.equal(amox.strength, '500 mg');
  assert.match(amox.defaultDosage!, /toutes les 8 heures/);
  assert.match(amox.defaultDuration!, /^3 jours/);
  // Only Access antibiotics and the two WHO analgesics: nothing without a WHO dose.
  assert.deepEqual(WHO_STARTER_DRUGS.map(d => d.dci), ['Amoxicilline', 'Phénoxyméthylpénicilline', 'Paracétamol', 'Ibuprofène']);
});
