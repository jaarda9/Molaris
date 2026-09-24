import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOn } from './age.js';

test('age in whole years, a year older on the birthday', () => {
  assert.equal(ageOn('2019-05-14', new Date(2026, 4, 13)), 6);
  assert.equal(ageOn('2019-05-14', new Date(2026, 4, 14)), 7);
  assert.equal(ageOn('1978-12-31', new Date(2026, 8, 24)), 47);
});

test('born on 29 February', () => {
  assert.equal(ageOn('2016-02-29', new Date(2026, 1, 28)), 9);
  assert.equal(ageOn('2016-02-29', new Date(2026, 2, 1)), 10);
});

test('missing, invalid or future birth dates give no age', () => {
  assert.equal(ageOn(undefined), null);
  assert.equal(ageOn('2019-02-30'), null);
  assert.equal(ageOn('abc'), null);
  assert.equal(ageOn('2099-01-01', new Date(2026, 8, 24)), null);
});
