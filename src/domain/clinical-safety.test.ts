import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDrugInteractions, checkAllergyConflict, suggestProphylaxisReview, addMonthsToDate } from './clinical-safety.js';

test('flags anticoagulant + NSAID combination as critical', () => {
  const alerts = checkDrugInteractions(
    [{ name: 'Warfarin 5mg', active: true }],
    ['Ibuprofen 600mg']
  );
  assert.ok(alerts.some(a => a.severity === 'critical' && /bleeding/i.test(a.message)));
});

test('does not flag anticoagulant alone with no NSAID exposure', () => {
  const alerts = checkDrugInteractions([{ name: 'Warfarin 5mg', active: true }], []);
  assert.equal(alerts.some(a => /bleeding/i.test(a.message)), false);
});

test('ignores inactive/discontinued medications', () => {
  const alerts = checkDrugInteractions(
    [{ name: 'Warfarin 5mg', active: false }],
    ['Ibuprofen 600mg']
  );
  assert.equal(alerts.length, 0);
});

test('flags bisphosphonate history regardless of planned procedure', () => {
  const alerts = checkDrugInteractions([{ name: 'Alendronate (Fosamax) 70mg weekly', active: true }]);
  assert.ok(alerts.some(a => a.severity === 'critical' && /MRONJ/.test(a.message)));
});

test('flags MAOI + epinephrine-containing anesthetic as a warning, not critical', () => {
  const alerts = checkDrugInteractions(
    [{ name: 'Phenelzine (Nardil)', active: true }],
    ['Lidocaine 2% with Epinephrine 1:100k']
  );
  const maoiAlert = alerts.find(a => /hypertensive/i.test(a.message));
  assert.ok(maoiAlert);
  assert.equal(maoiAlert!.severity, 'warning');
});

test('allergy conflict: penicillin allergy blocks amoxicillin', () => {
  const alert = checkAllergyConflict('Penicillin (hives)', 'Amoxicillin 500mg');
  assert.ok(alert);
  assert.equal(alert!.severity, 'critical');
});

test('allergy conflict: no conflict when allergy list is unrelated', () => {
  const alert = checkAllergyConflict('Latex', 'Amoxicillin 500mg');
  assert.equal(alert, null);
});

test('prophylaxis review: flags prosthetic valve history', () => {
  const reasons = suggestProphylaxisReview('History of prosthetic heart valve replacement in 2019');
  assert.ok(reasons.length > 0);
});

test('prophylaxis review: a plain cardiac stent does not trigger a suggestion', () => {
  // Per current AHA guidance, coronary stents alone are not a prophylaxis indication.
  const reasons = suggestProphylaxisReview('History of Myocardial Infarction (Stent 14 mos ago)');
  assert.equal(reasons.length, 0);
});

test('addMonthsToDate: simple case adds months without clamping', () => {
  const result = addMonthsToDate('2026-01-15T10:00:00.000Z', 6);
  assert.equal(result.slice(0, 10), '2026-07-15');
});

test('addMonthsToDate: clamps day-of-month for shorter target months', () => {
  const result = addMonthsToDate('2026-01-31T10:00:00.000Z', 1);
  assert.equal(result.slice(0, 10), '2026-02-28');
});

// --- French-language input (Tunisian market) --------------------------------

test('FR: accented drug names match (Warfarine + Ibuprofène)', () => {
  const alerts = checkDrugInteractions([{ name: 'Warfarine 5 mg', active: true }], ['Ibuprofène 400 mg']);
  assert.ok(alerts.some(a => a.severity === 'critical'));
});

test('FR: common brands match (Sintrom + Profenid, Kardégic + Voltarène)', () => {
  assert.ok(checkDrugInteractions([{ name: 'Sintrom 4 mg', active: true }], ['Profenid 100 mg']).some(a => a.severity === 'critical'));
  assert.ok(checkDrugInteractions([{ name: 'Kardégic 75 mg', active: true }], ['Voltarène 50 mg']).some(a => a.severity === 'critical'));
});

test('FR: "acide alendronique" is recognized as an antiresorptive (MRONJ)', () => {
  const alerts = checkDrugInteractions([{ name: 'Acide alendronique 70 mg', active: true }]);
  assert.ok(alerts.some(a => /MRONJ/.test(a.message)));
});

test('FR: penicillin allergy written in French blocks amoxicillin', () => {
  const alert = checkAllergyConflict('Pénicilline (urticaire)', 'Amoxicilline 1 g');
  assert.ok(alert);
  assert.equal(alert!.severity, 'critical');
});

test('FR: beta-lactam allergy blocks Augmentin', () => {
  assert.ok(checkAllergyConflict('Allergie aux bêta-lactamines', 'Augmentin 1 g'));
});

test('FR: non-penicillin antibiotic is not flagged for a penicillin allergy', () => {
  assert.equal(checkAllergyConflict('Pénicilline', 'Clindamycine 300 mg'), null);
});

test('FR: prosthetic valve history in French triggers a prophylaxis review', () => {
  assert.ok(suggestProphylaxisReview('Prothèse valvulaire mitrale mécanique depuis 2019').length > 0);
});

test('FR: adrenaline-containing anesthetic + MAOI is flagged', () => {
  const alerts = checkDrugInteractions([{ name: 'Phénelzine', active: true }], ['Articaïne 4% adrénalinée 1/100 000']);
  assert.ok(alerts.some(a => a.severity === 'warning'));
});
