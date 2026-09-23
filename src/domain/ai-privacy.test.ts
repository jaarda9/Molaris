import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactIdentifiers, redactContents, REDACTED_PATIENT, REDACTED_CHART, REDACTED_PHONE, REDACTED_CNAM } from './ai-privacy.js';

const people = [
  { name: 'Eleanor Davis', chartId: 'PT-2026-091' },
  { name: 'Mohamed Ben Salah', chartId: 'PT-2026-120' },
  { name: 'Hédi Trabelsi', chartId: 'PT-2026-121' }
];

test('replaces full name as a single placeholder', () => {
  const out = redactIdentifiers('Switched active chart to **Eleanor Davis** (PT-2026-091).', people);
  assert.equal(out, `Switched active chart to **${REDACTED_PATIENT}** (${REDACTED_CHART}).`);
});

test('replaces name parts used on their own, case-insensitively', () => {
  const out = redactIdentifiers('mrs davis reports pain; Salah was seen yesterday', people);
  assert.ok(!/davis/i.test(out));
  assert.ok(!/salah/i.test(out));
});

test('handles accented names with Unicode-aware boundaries', () => {
  const out = redactIdentifiers('Patient Hédi Trabelsi, douleur 46.', people);
  assert.equal(out, `Patient ${REDACTED_PATIENT}, douleur 46.`);
});

test('does not redact substrings inside other words', () => {
  // "Ben" is a name part (>= 3 chars) but must not eat "Bench" or "Benzocaine".
  const out = redactIdentifiers('Benzocaine topical applied at the bench.', people);
  assert.equal(out, 'Benzocaine topical applied at the bench.');
});

test('redactContents leaves image parts untouched and redacts text parts', () => {
  const image = { inlineData: { data: 'AAAA', mimeType: 'image/png' } };
  const contents: Array<{ role: string; parts: Array<{ text?: string; inlineData?: unknown }> }> = [
    { role: 'user', parts: [{ text: 'PATIENT: Eleanor Davis' }, image] }
  ];
  const out = redactContents(contents, people);
  assert.equal(out[0].parts[0].text, `PATIENT: ${REDACTED_PATIENT}`);
  assert.deepEqual(out[0].parts[1], image);
  assert.equal(contents[0].parts[0].text, 'PATIENT: Eleanor Davis', 'input must not be mutated');
});

test('redacts a known phone however it is written', () => {
  const people = [{ name: 'Amira Jlassi', chartId: 'PT-2026-0200', phone: '+216 98 123 456' }];
  for (const written of ['+216 98 123 456', '98123456', '0021698123456', '98.123.456', '216-98-123-456']) {
    assert.equal(redactIdentifiers(`appeler le ${written} demain`, people), `appeler le ${REDACTED_PHONE} demain`, written);
  }
});

test('redacts a known CNAM identifier', () => {
  const people = [{ name: 'Amira Jlassi', chartId: 'PT-2026-0200', cnamId: '1234567-89' }];
  assert.equal(redactIdentifiers('CNAM 1234567-89, dent 46', people), `CNAM ${REDACTED_CNAM}, dent 46`);
});

test('leaves clinical numbers alone', () => {
  const people = [{ name: 'Amira Jlassi', chartId: 'PT-2026-0200', phone: '98 123 456', cnamId: '1234567-89' }];
  const clinical = 'Ibuprofène 400 mg, dent 46, 1,5 carpule, le 23/09/2026, INR 2.5, 981234567 comprimés';
  assert.equal(redactIdentifiers(clinical, people), clinical);
});
