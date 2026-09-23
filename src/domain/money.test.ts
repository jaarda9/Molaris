import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDinarsToMillimes, formatTnd } from './money.js';

test('parses both Tunisian decimal separators', () => {
  assert.equal(parseDinarsToMillimes('125,500'), 125500);
  assert.equal(parseDinarsToMillimes('125.5'), 125500);
  assert.equal(parseDinarsToMillimes('80'), 80000);
});

test('parses thousands separators and a trailing currency label', () => {
  assert.equal(parseDinarsToMillimes('1 250,750 DT'), 1250750);
  assert.equal(parseDinarsToMillimes('45 TND'), 45000);
});

test('rejects garbage, negatives and more than 3 decimals', () => {
  assert.equal(parseDinarsToMillimes('abc'), null);
  assert.equal(parseDinarsToMillimes('-5'), null);
  assert.equal(parseDinarsToMillimes('1,2345'), null);
  assert.equal(parseDinarsToMillimes(-1), null);
});

test('number input is treated as dinars', () => {
  assert.equal(parseDinarsToMillimes(12.345), 12345);
});

test('formats with space thousands and 3 decimals', () => {
  assert.equal(formatTnd(1250500), '1 250,500 DT');
  assert.equal(formatTnd(80000), '80,000 DT');
  assert.equal(formatTnd(5), '0,005 DT');
  assert.equal(formatTnd(-12000), '-12,000 DT');
});
