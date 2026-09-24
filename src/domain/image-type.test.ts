import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectImageType } from './image-type.js';

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(parts.flatMap(p => (typeof p === 'string' ? [...p].map(c => c.charCodeAt(0)) : p)));

test('JPEG, PNG and WebP are recognised from their signature', () => {
  assert.equal(detectImageType(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg');
  assert.equal(detectImageType(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a, 0])), 'image/png');
  assert.equal(detectImageType(bytes('RIFF', [1, 2, 3, 4], 'WEBPVP8 ')), 'image/webp');
});

test('other files are refused whatever their extension says', () => {
  assert.equal(detectImageType(bytes('<svg xmlns="http://www.w3.org/2000/svg">')), null);
  assert.equal(detectImageType(bytes('%PDF-1.7')), null);
  assert.equal(detectImageType(bytes(new Array(128).fill(0), 'DICM')), null); // DICOM
  assert.equal(detectImageType(bytes('GIF89a')), null);
  assert.equal(detectImageType(bytes('RIFF', [1, 2, 3, 4], 'WAVE')), null);
  assert.equal(detectImageType(new Uint8Array()), null);
});
