import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAnestheticDose, dosesLoggedOn } from './anesthesia-calc.js';
import { ANESTHETICS } from './dental-data.js';

const lidocaine = ANESTHETICS.find(a => a.id === 'lido_100k')!;
const articaine = ANESTHETICS.find(a => a.id === 'arti_100k')!;
const mepivacaine = ANESTHETICS.find(a => a.id === 'mepi_plain')!;
const bupivacaine = ANESTHETICS.find(a => a.id === 'bupi_200k')!;

test('healthy adult: toxicity (mg/kg), not epinephrine, is the limiting factor', () => {
  const result = calculateAnestheticDose({
    drug: lidocaine,
    weightKg: 70,
    isCardiacRisk: false,
    carpulesGiven: 4
  });
  // 70kg * 7mg/kg = 490mg -> floor(490/36 *10)/10 = 13.6 carpules by toxicity
  // non-cardiac epi limit 0.2mg / 0.018mg per carpule -> floor(11.1*10)/10 = 11.1 carpules by epi
  assert.equal(result.limitingFactor, 'Epinephrine (Cardiac threshold)');
  assert.equal(result.isExceeded, false);
});

test('cardiac-risk patient is capped at 0.04mg epinephrine regardless of body weight', () => {
  const heavyCardiacPatient = calculateAnestheticDose({
    drug: lidocaine,
    weightKg: 120, // large enough that toxicity limit would allow far more
    isCardiacRisk: true,
    carpulesGiven: 0
  });
  // 0.04mg / 0.018mg per carpule = ~2.2 carpules — must stay near the cardiac ceiling
  // regardless of the much higher toxicity-based allowance for a 120kg patient.
  assert.ok(heavyCardiacPatient.safeMaxCarpules <= 2.3, `expected cardiac cap near 2.2, got ${heavyCardiacPatient.safeMaxCarpules}`);
  assert.equal(heavyCardiacPatient.limitingFactor, 'Epinephrine (Cardiac threshold)');
});

test('flags isExceeded once delivered carpules pass the safe maximum', () => {
  const result = calculateAnestheticDose({
    drug: lidocaine,
    weightKg: 60,
    isCardiacRisk: true,
    carpulesGiven: 5 // well above the ~2.2 cardiac cap
  });
  assert.equal(result.isExceeded, true);
  assert.match(result.warning ?? '', /DANGER/);
});

test('plain mepivacaine (no epinephrine) is limited only by agent toxicity', () => {
  const result = calculateAnestheticDose({
    drug: mepivacaine,
    weightKg: 70,
    isCardiacRisk: false,
    carpulesGiven: 0
  });
  // No epi ratio -> maxCarpulesByEpi stays at the 999 sentinel, so toxicity governs.
  assert.equal(result.limitingFactor, 'Anesthetic agent toxicity (Mg/kg limit)');
  // 70kg * 6.6mg/kg = 462mg, capped by the 400mg absolute ceiling -> floor(400/54*10)/10 = 7.4 carpules
  assert.equal(result.allowedMaxMg, 400);
  assert.equal(result.safeMaxCarpules, 7.4);
});

test('absolute max mg caps toxicity limit for high body weight (articaine)', () => {
  const result = calculateAnestheticDose({
    drug: articaine,
    weightKg: 150, // 150 * 7 = 1050mg, far above the 500mg absolute ceiling
    isCardiacRisk: false,
    carpulesGiven: 0
  });
  assert.equal(result.allowedMaxMg, 500);
});

test('low-epi bupivacaine 1:200k halves epi delivered per cartridge vs 1:100k drugs', () => {
  const result = calculateAnestheticDose({
    drug: bupivacaine,
    weightKg: 70,
    isCardiacRisk: false,
    carpulesGiven: 2
  });
  // 1.8mL * 0.005mg/mL = 0.009mg epi per cartridge -> 2 carpules = 0.018mg
  assert.equal(result.epiDeliveredMg, 0.018);
});

test('remainingCarpules never goes negative once the safe max is exceeded', () => {
  const result = calculateAnestheticDose({
    drug: lidocaine,
    weightKg: 60,
    isCardiacRisk: true,
    carpulesGiven: 50
  });
  assert.equal(result.remainingCarpules, 0);
});

// --- Several anesthetics in one session: toxicity is additive (fraction of each maximum) ---

test('articaine already given counts against bupivacaine (fraction of each maximum)', () => {
  // 5 articaine carpules = 340 mg of the 490 mg allowed at 70 kg (7 mg/kg) -> 69.4 % of the toxic budget used.
  const result = calculateAnestheticDose({
    drug: bupivacaine, weightKg: 70, isCardiacRisk: false, carpulesGiven: 0,
    priorDoses: [{ drug: articaine, carpules: 5 }]
  });
  // Bupivacaine max 90 mg = 10 carpules; only 30.6 % of the budget is left -> 3.0 carpules, not 10.
  assert.equal(result.remainingCarpules, 3);
  assert.equal(result.isExceeded, false);
});

test('mixing drugs past the combined maximum is flagged, even if each alone is under its own', () => {
  const result = calculateAnestheticDose({
    drug: bupivacaine, weightKg: 70, isCardiacRisk: false, carpulesGiven: 5, // 50 % of bupivacaine
    priorDoses: [{ drug: articaine, carpules: 5 }]                          // + 68 % of articaine
  });
  assert.equal(result.isExceeded, true);
  assert.equal(result.remainingCarpules, 0);
});

test('adrenaline adds up across drugs (cardiac ceiling 0.04 mg)', () => {
  // 1 lidocaine carpule = 0.018 mg; 1 articaine carpule = 0.017 mg -> 0.035 mg of 0.04 mg.
  const result = calculateAnestheticDose({
    drug: articaine, weightKg: 70, isCardiacRisk: true, carpulesGiven: 1,
    priorDoses: [{ drug: lidocaine, carpules: 1 }]
  });
  assert.equal(result.epiDeliveredMg, 0.035);
  assert.ok(result.remainingCarpules <= 0.3, `only ~0.005 mg of adrenaline left, got ${result.remainingCarpules} carpules`);
});

test('only injections logged today count; earlier visits do not', () => {
  const log = [
    { drugId: 'arti_100k', carpules: 4, timestamp: new Date(2026, 8, 10, 10, 0).toISOString() },
    { drugId: 'lido_100k', carpules: 1.5, timestamp: new Date(2026, 8, 24, 9, 30).toISOString() },
    { drugId: 'lido_100k', carpules: 0.5, timestamp: new Date(2026, 8, 24, 11, 0).toISOString() }
  ];
  const today = dosesLoggedOn(log, new Date(2026, 8, 24, 15, 0));
  assert.deepEqual(today.map(d => [d.drug.id, d.carpules]), [['lido_100k', 2]]);
});

test('a cancelled anesthesia entry no longer counts toward the day', () => {
  const now = new Date();
  const log = [
    { drugId: 'arti_100k', carpules: 2, timestamp: now.toISOString() },
    { drugId: 'arti_100k', carpules: 1, timestamp: now.toISOString(), cancelledAt: now.toISOString() }
  ];
  assert.equal(dosesLoggedOn(log, now).reduce((s, d) => s + d.carpules, 0), 2);
});
