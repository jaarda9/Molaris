import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../db/connection.js';
import { PatientRepository } from '../repositories/patients.js';
import { historyForModel } from './chat-history.js';
import { tokenizePatients } from './assistant-tools.js';

const patients = new PatientRepository(openDatabase(':memory:'), { legacyJsonFile: null }).getAllPatients();
const now = new Date('2026-09-24T15:00:00Z');
const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();
const msg = (role: 'user' | 'model', content: string, hoursAgo = 1) => ({ role, content, timestamp: at(hoursAgo) });

test('a patient keeps the same code in the history and in the new question', () => {
  const { turns, refs } = historyForModel([
    msg('user', 'Combien doit Fatma Trabelsi ?'),
    msg('model', 'Fatma Trabelsi doit 200,000 DT.')
  ], patients, 'pt_1', now);
  assert.equal(turns[0].parts[0].text, 'Combien doit P1 ?');
  assert.equal(turns[1].parts[0].text, 'P1 doit 200,000 DT.');
  const question = tokenizePatients('Et Mohamed Ben Salah ? Fatma a payé ?', patients, 'pt_1', refs);
  assert.equal(question.text, 'Et P2 ? P1 a payé ?');
  assert.equal(question.refs.P1, 'pt_2');
});

test('the patient discussed last is known, so « et son dernier paiement ? » is about them', () => {
  const history = [msg('user', 'Solde de Mohamed Ben Salah ?'), msg('model', 'Mohamed Ben Salah doit 300 DT.'),
    msg('user', 'Et Fatma Trabelsi ?'), msg('model', 'Fatma Trabelsi ne doit rien.')];
  const { lastDiscussed, refs } = historyForModel(history, patients, 'pt_1', now);
  assert.equal(refs[lastDiscussed!], 'pt_2');
  assert.equal(historyForModel([msg('user', 'Dose max articaïne ?'), msg('model', '7 mg/kg.')], patients, 'pt_1', now).lastDiscussed, null);
});

test('the history starts with a question and alternates roles', () => {
  const { turns } = historyForModel([
    msg('model', '✅ Rendez-vous créé.'),
    msg('user', 'Et la dent 36 ?'),
    msg('model', 'Carie profonde.'),
    msg('model', '❌ Devis annulé.'),
    msg('user', 'Ok')
  ], patients, 'pt_1', now);
  assert.deepEqual(turns.map(t => t.role), ['user', 'model', 'user']);
  assert.equal(turns[1].parts[0].text, 'Carie profonde.\n\n❌ Devis annulé.');
});

test('exchanges from another visit are left out, and at most 8 messages are sent', () => {
  const old = historyForModel([msg('user', 'Solde ?', 30), msg('model', '200 DT', 30)], patients, 'pt_1', now);
  assert.equal(old.turns.length, 0);
  const many = Array.from({ length: 20 }, (_, i) => msg(i % 2 ? 'model' : 'user', `m${i}`));
  const { turns } = historyForModel(many, patients, 'pt_1', now);
  assert.equal(turns.length, 8);
  assert.equal(turns[0].parts[0].text, 'm12');
});
