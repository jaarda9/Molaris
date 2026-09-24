import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The patient a request is about. Each page sends the patient it shows
 * (X-Molaris-Patient); the legacy "active patient" endpoints then act on THAT patient,
 * so two tabs or two PCs can work on different charts at the same time.
 * Without the header, the clinic-wide active patient is used (as before).
 */
export const patientScope = new AsyncLocalStorage<string>();

export function scopedPatientId(): string | undefined {
  return patientScope.getStore();
}
