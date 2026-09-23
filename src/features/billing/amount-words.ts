/**
 * French amounts in words for receipts ("Arrêté le présent reçu à la somme de …").
 *
 * Spelling follows the traditional rules (pre-1990 reform), still the usual
 * form on Tunisian commercial documents:
 *  - hyphens only between tens and units below 100: "vingt-deux", "quatre-vingt-onze";
 *  - "et" without hyphens for 21, 31, 41, 51, 61, 71: "vingt et un", "soixante et onze";
 *    but "quatre-vingt-un", "quatre-vingt-onze" (no "et");
 *  - "quatre-vingts" and "deux cents" take an s only when final, and also before
 *    the nouns "millions"/"milliards" — never before "mille" (an invariable adjective):
 *    "deux cents", "deux cent un", "deux cent mille", "deux cents millions";
 *  - "mille" never takes an s and "un mille" is just "mille";
 *  - "million"/"milliard" are nouns: "un million", "deux millions", and
 *    "un million de dinars" when nothing follows them.
 */

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf'
];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

/** 0..99. `final` = nothing follows (so "quatre-vingts" keeps its s). */
function below100(n: number, final: boolean): string {
  if (n < 20) return UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens <= 6) {
    if (unit === 0) return TENS[tens];
    if (unit === 1) return `${TENS[tens]} et un`;
    return `${TENS[tens]}-${UNITS[unit]}`;
  }
  if (tens === 7) {
    // 70..79 = soixante + 10..19
    return unit === 1 ? 'soixante et onze' : `soixante-${UNITS[10 + unit]}`;
  }
  // 80..99 = quatre-vingt + 0..19
  const rest = n - 80;
  if (rest === 0) return final ? 'quatre-vingts' : 'quatre-vingt';
  return `quatre-vingt-${UNITS[rest]}`;
}

/** 0..999. `final` = nothing follows, or a noun (million/milliard) follows. */
function below1000(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return below100(rest, final);
  const head = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent${rest === 0 && final ? 's' : ''}`;
  return rest === 0 ? head : `${head} ${below100(rest, final)}`;
}

/**
 * A non-negative integer in French words (0 .. 999 999 999 999).
 * Throws on anything else so a receipt can never print a wrong amount.
 */
export function numberToWordsFr(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0 || n > 999_999_999_999) {
    throw new RangeError(`Cannot write ${n} in words`);
  }
  if (n === 0) return 'zéro';

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor(n / 1_000_000) % 1000;
  const thousands = Math.floor(n / 1000) % 1000;
  const units = n % 1000;
  const parts: string[] = [];

  if (billions) parts.push(`${below1000(billions, true)} milliard${billions > 1 ? 's' : ''}`);
  if (millions) parts.push(`${below1000(millions, true)} million${millions > 1 ? 's' : ''}`);
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${below1000(thousands, false)} mille`);
  if (units) parts.push(below1000(units, true));
  return parts.join(' ');
}

function withNoun(n: number, singular: string, plural: string): string {
  const words = numberToWordsFr(n);
  // "un million de dinars", "deux milliards de dinars": a bare million/milliard takes "de".
  const de = n >= 1_000_000 && n % 1_000_000 === 0 ? 'de ' : '';
  return `${words} ${de}${n >= 2 ? plural : singular}`;
}

/**
 * Tunisian dinar amount (integer millimes) in French words:
 *   125500  -> "cent vingt-cinq dinars et cinq cents millimes"
 *   1000    -> "un dinar"
 *   500     -> "cinq cents millimes"
 *   0       -> "zéro dinar"
 */
export function amountInWordsFr(millimes: number): string {
  if (!Number.isSafeInteger(millimes) || millimes < 0) {
    throw new RangeError(`Invalid amount in millimes: ${millimes}`);
  }
  const dinars = Math.floor(millimes / 1000);
  const rest = millimes % 1000;
  if (dinars === 0 && rest === 0) return 'zéro dinar';
  const parts: string[] = [];
  if (dinars > 0) parts.push(withNoun(dinars, 'dinar', 'dinars'));
  if (rest > 0) parts.push(withNoun(rest, 'millime', 'millimes'));
  return parts.join(' et ');
}
