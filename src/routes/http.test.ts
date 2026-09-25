import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { HttpError, parse } from './http.js';

const messageOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof HttpError);
    return err.message;
  }
  assert.fail('expected an HttpError');
};

test('validation errors name the field in French for the clinic UI', () => {
  const schema = z.object({ procedure: z.string().min(1, 'l’acte est obligatoire'), amountMillimes: z.number() });
  assert.equal(messageOf(() => parse(schema, { procedure: '', amountMillimes: 1 })), 'Acte : l’acte est obligatoire');
  // zod's own "Required" becomes « obligatoire ».
  assert.equal(messageOf(() => parse(schema, { procedure: 'x' })), 'Montant : obligatoire');
});

test('nested and unknown fields keep a readable path', () => {
  const schema = z.object({ items: z.array(z.object({ label: z.string().min(1, 'vide') })), zzz: z.string().optional() });
  assert.equal(messageOf(() => parse(schema, { items: [{ label: '' }] })), 'Lignes › 1 › Libellé : vide');
  assert.equal(messageOf(() => parse(z.object({ zzz: z.string().min(2, 'court') }), { zzz: 'a' })), 'zzz : court');
});
