import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { scopeToPagePatient } from './active-patient.js';
import { scopedPatientId } from '../repositories/patient-scope.js';

function run(path: string, header: string | undefined, known = ['pt_1', 'pt_2']) {
  let status = 200;
  let scoped: string | undefined = 'not reached';
  const req = { path, get: (name: string) => (name === 'x-molaris-patient' ? header : undefined) } as unknown as Request;
  const res = { status(code: number) { status = code; return this; }, json() { return this; } } as unknown as Response;
  scopeToPagePatient(id => known.includes(id))(req, res, () => { scoped = scopedPatientId(); });
  return { status, scoped };
}

test('a request is scoped to the patient its page shows', () => {
  assert.deepEqual(run('/api/odontogram', 'pt_2'), { status: 200, scoped: 'pt_2' });
  assert.deepEqual(run('/api/medications/med_1', 'pt_1'), { status: 200, scoped: 'pt_1' });
});

test('without the header, the clinic-wide active patient is used', () => {
  assert.deepEqual(run('/api/odontogram', undefined), { status: 200, scoped: undefined });
});

test('a chart deleted elsewhere is refused so the page reloads', () => {
  assert.equal(run('/api/odontogram', 'pt_gone').status, 409);
});
