import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChairsideCommand } from './voice-actions.js';

test('clinical questions never trigger a chairside action (some write in the chart)', () => {
  for (const q of [
    "J'ai injecté 2 carpules d'articaïne et la 46 est encore sensible, que faire ?",
    "Faut-il noter 1 carpule de plus chez un patient cardiaque ?",
    "Combien de temps de mordançage ? 15 secondes ou 30 secondes minuteur habituel ?",
    "Le patient demande s'il faut couper le son de l'appareil auditif pendant le soin",
    "Comment sauvegarder la base de la prothèse avant rebasage",
    "Que faire pour une dent 46 avec carie profonde",
    "La dent 36 est cariée en distal, coiffage ou endo",
    "Quel protocole pour ouvrir la chambre pulpaire d'une 46 en urgence"
  ]) {
    assert.equal(parseChairsideCommand(q), null, q);
  }
});

test('short commands still work, spoken or typed', () => {
  assert.deepEqual(parseChairsideCommand('Lance un minuteur de 20 secondes'), { kind: 'timer', seconds: 20 });
  assert.deepEqual(parseChairsideCommand('Molaris, minuteur 2 minutes'), { kind: 'timer', seconds: 120 });
  assert.deepEqual(parseChairsideCommand('note dent 46 carie'), { kind: 'tooth', toothId: 30, status: 'caries' });
  assert.deepEqual(parseChairsideCommand('Dent 75 couronne'), { kind: 'tooth', toothId: 75, status: 'crown' });
  assert.deepEqual(parseChairsideCommand('Ouvre la radio'), { kind: 'open', view: 'vision' });
  assert.deepEqual(parseChairsideCommand('coupe le son'), { kind: 'mute', muted: true });
  assert.deepEqual(parseChairsideCommand('Sauvegarder la base de données'), { kind: 'export' });
});

test('anesthesia is recorded with the drug that was said, never a default one', () => {
  assert.deepEqual(parseChairsideCommand("Note 2 carpules d'articaïne"), { kind: 'anesthesia', carpules: 2, drugId: 'arti_100k' });
  assert.deepEqual(parseChairsideCommand("J'ai injecté 1,5 carpule de mépivacaïne."), { kind: 'anesthesia', carpules: 1.5, drugId: 'mepi_plain' });
  assert.deepEqual(parseChairsideCommand('note 1 cartouche’ de Xylocaïne'), { kind: 'anesthesia', carpules: 1, drugId: 'lido_100k' });
  assert.equal(parseChairsideCommand('Note 2 carpules'), null);
  assert.equal(parseChairsideCommand('note 50 carpules de lidocaine'), null);
});
