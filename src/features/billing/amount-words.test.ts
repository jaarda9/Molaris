import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountInWordsFr, numberToWordsFr } from './amount-words.js';

test('numberToWordsFr: units, teens and tens', () => {
  const cases: Array<[number, string]> = [
    [0, 'zéro'], [1, 'un'], [7, 'sept'], [10, 'dix'], [11, 'onze'], [16, 'seize'],
    [17, 'dix-sept'], [19, 'dix-neuf'], [20, 'vingt'], [21, 'vingt et un'], [22, 'vingt-deux'],
    [31, 'trente et un'], [45, 'quarante-cinq'], [51, 'cinquante et un'], [61, 'soixante et un'],
    [69, 'soixante-neuf'], [70, 'soixante-dix'], [71, 'soixante et onze'], [72, 'soixante-douze'],
    [77, 'soixante-dix-sept'], [79, 'soixante-dix-neuf'], [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'], [89, 'quatre-vingt-neuf'], [90, 'quatre-vingt-dix'],
    [91, 'quatre-vingt-onze'], [99, 'quatre-vingt-dix-neuf']
  ];
  for (const [n, words] of cases) assert.equal(numberToWordsFr(n), words, `n=${n}`);
});

test('numberToWordsFr: hundreds agree only when final', () => {
  const cases: Array<[number, string]> = [
    [100, 'cent'], [101, 'cent un'], [180, 'cent quatre-vingts'], [200, 'deux cents'],
    [201, 'deux cent un'], [280, 'deux cent quatre-vingts'], [999, 'neuf cent quatre-vingt-dix-neuf']
  ];
  for (const [n, words] of cases) assert.equal(numberToWordsFr(n), words, `n=${n}`);
});

test('numberToWordsFr: thousands, millions and milliards', () => {
  const cases: Array<[number, string]> = [
    [1000, 'mille'], [1001, 'mille un'], [1250, 'mille deux cent cinquante'], [2000, 'deux mille'],
    [21_000, 'vingt et un mille'], [80_000, 'quatre-vingt mille'], [200_000, 'deux cent mille'],
    [280_300, 'deux cent quatre-vingt mille trois cents'],
    [1_000_000, 'un million'], [2_000_000, 'deux millions'], [200_000_000, 'deux cents millions'],
    [80_000_000, 'quatre-vingts millions'], [1_234_567, 'un million deux cent trente-quatre mille cinq cent soixante-sept'],
    [1_000_000_000, 'un milliard'], [3_000_000_001, 'trois milliards un']
  ];
  for (const [n, words] of cases) assert.equal(numberToWordsFr(n), words, `n=${n}`);
});

test('amountInWordsFr: dinars and millimes', () => {
  const cases: Array<[number, string]> = [
    [0, 'zéro dinar'],
    [1, 'un millime'],
    [500, 'cinq cents millimes'],
    [1000, 'un dinar'],
    [1500, 'un dinar et cinq cents millimes'],
    [2000, 'deux dinars'],
    [21_000, 'vingt et un dinars'],
    [80_000, 'quatre-vingts dinars'],
    [81_000, 'quatre-vingt-un dinars'],
    [100_000, 'cent dinars'],
    [101_000, 'cent un dinars'],
    [125_500, 'cent vingt-cinq dinars et cinq cents millimes'],
    [125_005, 'cent vingt-cinq dinars et cinq millimes'],
    [1_000_000, 'mille dinars'],
    [1_250_500, 'mille deux cent cinquante dinars et cinq cents millimes'],
    [1_000_000_000, 'un million de dinars'],
    [2_000_080_000, 'deux millions quatre-vingts dinars'],
    [1_001_000_000, 'un million mille dinars'],
    [999_999_999, 'neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf dinars et neuf cent quatre-vingt-dix-neuf millimes']
  ];
  for (const [millimes, words] of cases) assert.equal(amountInWordsFr(millimes), words, `millimes=${millimes}`);
});

test('amountInWordsFr rejects negative, fractional and non-numeric amounts', () => {
  for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => amountInWordsFr(bad), RangeError, `value=${bad}`);
  }
});
