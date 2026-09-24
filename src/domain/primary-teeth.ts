import type { ToothInfo } from './dental-data.js';

/**
 * Primary (deciduous) teeth, FDI 51–85. Their internal id is the FDI number itself:
 * it cannot collide with the permanent teeth's Universal ids (1–32).
 */
export function isPrimaryToothId(id: number): boolean {
  const quadrant = Math.floor(id / 10);
  const position = id % 10;
  return quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5;
}

const QUADRANTS: Array<{ q: number; arch: ToothInfo['arch']; side: string }> = [
  { q: 5, arch: 'maxillary', side: 'Right' },
  { q: 6, arch: 'maxillary', side: 'Left' },
  { q: 7, arch: 'mandibular', side: 'Left' },
  { q: 8, arch: 'mandibular', side: 'Right' }
];
const POSITIONS: Array<{ type: ToothInfo['type']; name: string }> = [
  { type: 'incisor', name: 'Central Incisor' },
  { type: 'incisor', name: 'Lateral Incisor' },
  { type: 'canine', name: 'Canine' },
  { type: 'molar', name: '1st Molar' },
  { type: 'molar', name: '2nd Molar' }
];

/** Oldest age (in years) at which baby teeth are shown automatically. */
export const PRIMARY_DENTITION_MAX_AGE = 12;

/**
 * The 20 primary teeth. For a child they start sound; for an adult they start
 * missing (shed), so revealing them only shows the retained teeth the dentist marks.
 */
export function createPrimaryTeeth(age: number): ToothInfo[] {
  const status: ToothInfo['status'] = age <= PRIMARY_DENTITION_MAX_AGE ? 'sound' : 'missing';
  return QUADRANTS.flatMap(({ q, arch, side }) => POSITIONS.map((p, i) => ({
    id: q * 10 + i + 1,
    fdi: q * 10 + i + 1,
    name: `Primary ${arch === 'maxillary' ? 'Maxillary' : 'Mandibular'} ${side} ${p.name}`,
    arch,
    type: p.type,
    dentition: 'primary' as const,
    status
  })));
}

/**
 * True while the primary teeth still hold their defaults for `age` (nothing recorded),
 * so they can be regenerated when the patient's age is corrected.
 */
export function isUntouchedPrimaryChart(teeth: ToothInfo[], age: number): boolean {
  const defaultStatus = createPrimaryTeeth(age)[0].status;
  return teeth.every(t => t.status === defaultStatus && !(t.notes && t.notes.trim())
    && !(t.surfaces && Object.values(t.surfaces).some(Boolean)));
}

/**
 * 'auto': shown for children, or when a baby tooth has a recorded finding;
 * 'shown' / 'hidden': the dentist's explicit choice for this patient.
 */
export type PrimaryTeethMode = 'auto' | 'shown' | 'hidden';

export type PrimaryTeethReason = 'child' | 'recorded' | 'adult' | 'shown' | 'hidden';

/** A finding worth keeping on screen: anything other than the sound/shed defaults. */
function hasRecordedFinding(tooth: ToothInfo): boolean {
  if (tooth.status !== 'sound' && tooth.status !== 'missing') return true;
  if (tooth.notes && tooth.notes.trim()) return true;
  return !!tooth.surfaces && Object.values(tooth.surfaces).some(Boolean);
}

export function primaryTeethVisibility(
  age: number,
  mode: PrimaryTeethMode,
  primaryTeeth: ToothInfo[]
): { visible: boolean; reason: PrimaryTeethReason } {
  if (mode === 'shown') return { visible: true, reason: 'shown' };
  if (mode === 'hidden') return { visible: false, reason: 'hidden' };
  if (age <= PRIMARY_DENTITION_MAX_AGE) return { visible: true, reason: 'child' };
  if (primaryTeeth.some(hasRecordedFinding)) return { visible: true, reason: 'recorded' };
  return { visible: false, reason: 'adult' };
}
