/**
 * The image formats the X-ray reader accepts, recognised from the file's first bytes
 * (the browser's declared type is only a guess from the extension). Gemini reads
 * JPEG, PNG and WebP; DICOM exports must be converted to one of these first.
 */
export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

export function detectImageType(bytes: Uint8Array): SupportedImageType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}
