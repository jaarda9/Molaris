import { randomUUID } from 'crypto';

/** Collision-free id with a readable prefix, e.g. newId('apt') -> 'apt_3f1c…'. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
