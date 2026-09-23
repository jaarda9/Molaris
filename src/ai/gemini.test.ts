import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiErrorMessage, AiUnavailableError } from './gemini.js';

test('quota exhaustion gets a clear message in the UI language, not raw API JSON', () => {
  const fr = aiErrorMessage(new AiUnavailableError('quota'), 'fr');
  assert.match(fr, /Quota de l'assistant IA épuisé/);
  assert.match(aiErrorMessage(new AiUnavailableError('quota'), 'en'), /quota is used up/);
  assert.doesNotMatch(fr, /RESOURCE_EXHAUSTED|\{/);
});

test('overload gets a retry-later message; other errors keep their own message', () => {
  assert.match(aiErrorMessage(new AiUnavailableError('unavailable'), 'fr'), /momentanément surchargé/);
  assert.equal(aiErrorMessage(new Error('GEMINI_API_KEY environment variable is not configured.'), 'fr'), 'GEMINI_API_KEY environment variable is not configured.');
});
