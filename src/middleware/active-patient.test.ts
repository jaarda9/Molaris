import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { guardActivePatient } from './active-patient.js';

function run(method: string, path: string, header: string | undefined, activeId = 'pt_1') {
  let status = 200;
  let passed = false;
  const req = { method, path, get: (name: string) => (name === 'x-molaris-patient' ? header : undefined) } as unknown as Request;
  const res = { status(code: number) { status = code; return this; }, json() { return this; } } as unknown as Response;
  guardActivePatient(() => activeId)(req, res, () => { passed = true; });
  return { status, passed };
}

test('a write for the patient that is still active goes through', () => {
  assert.deepEqual(run('POST', '/api/odontogram', 'pt_1'), { status: 200, passed: true });
});

test('a write for a patient that is no longer active is refused', () => {
  for (const path of ['/api/odontogram', '/api/medications/med_1', '/api/treatment-plan', '/api/generate-soap', '/api/chat']) {
    assert.deepEqual(run(path === '/api/medications/med_1' ? 'DELETE' : 'POST', path, 'pt_2'), { status: 409, passed: false }, path);
  }
});

test('reads, unguarded endpoints and requests without the header are not affected', () => {
  assert.equal(run('GET', '/api/odontogram', 'pt_2').passed, true);
  assert.equal(run('POST', '/api/patients/select', 'pt_2').passed, true);
  assert.equal(run('POST', '/api/appointments', 'pt_2').passed, true);
  assert.equal(run('POST', '/api/odontogram', undefined).passed, true);
});
