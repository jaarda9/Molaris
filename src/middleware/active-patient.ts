import { AsyncResource } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { patientScope } from '../repositories/patient-scope.js';

/**
 * Every API request from a page carries the patient that page shows (X-Molaris-Patient).
 * The request is then scoped to that patient: the legacy "active patient" endpoints
 * (odontogram, medications, perio, treatment plan, lab cases, anesthesia, SOAP, chat…)
 * read and write THAT chart, even if another tab or PC opened another patient meanwhile.
 * A chart that no longer exists (deleted elsewhere) gets a 409 so the page reloads.
 */
export const ACTIVE_PATIENT_HEADER = 'x-molaris-patient';

export function scopeToPagePatient(patientExists: (id: string) => boolean) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const patientId = req.get(ACTIVE_PATIENT_HEADER);
    if (!patientId || !req.path.startsWith('/api/')) return next();
    if (!patientExists(patientId)) {
      res.status(409).json({
        code: 'ACTIVE_PATIENT_CHANGED',
        error: 'Ce dossier n’existe plus (supprimé depuis un autre poste). Rien n’a été enregistré : la page va se recharger.'
      });
      return;
    }
    patientScope.run(patientId, () => {
      // Multipart parsers (multer: X-ray uploads) call next() from the request stream's events,
      // which run outside this scope: bind them to it so the upload lands in the right chart.
      if (typeof req.emit === 'function') req.emit = AsyncResource.bind(req.emit, 'molaris-patient-scope', req) as typeof req.emit;
      next();
    });
  };
}
