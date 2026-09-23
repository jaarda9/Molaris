import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAnestheticDose } from './anesthesia-calc.js';
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
