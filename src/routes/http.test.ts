import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { errorMiddleware, HttpError, parse } from './http.js';

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

test('a malformed JSON body is a 400 with a French message, not a server error', () => {
  let status = 0; let body: unknown;
  const res = { status(s: number) { status = s; return this; }, json(b: unknown) { body = b; return this; } };
  const parseErr = Object.assign(new SyntaxError('Unexpected token'), { status: 400, type: 'entity.parse.failed' });
  errorMiddleware(parseErr, {} as never, res as never, () => {});
  assert.equal(status, 400);
  assert.deepEqual(body, { error: 'Requête invalide (données mal formées).' });
});

test('rules without their own message still answer in French', () => {
  const schema = z.object({ quantity: z.number().int().min(1).max(99), label: z.string().max(3), status: z.enum(['a', 'b']) });
  assert.equal(messageOf(() => parse(schema, { quantity: 0, label: 'x', status: 'a' })), 'Quantité : au moins 1');
  assert.equal(messageOf(() => parse(schema, { quantity: 100, label: 'x', status: 'a' })), 'Quantité : 99 au plus');
  assert.equal(messageOf(() => parse(schema, { quantity: 'x', label: 'x', status: 'a' })), 'Quantité : nombre attendu');
  assert.equal(messageOf(() => parse(schema, { quantity: 1, label: 'xxxx', status: 'a' })), 'Libellé : 3 caractères au plus');
  assert.equal(messageOf(() => parse(schema, { quantity: 1, label: 'x', status: 'z' })), 'Statut : valeur non reconnue');
});
