import type { NextFunction, Request, Response } from 'express';

/**
 * Legacy endpoints that write to the *active* patient (odontogram, medications, perio,
 * treatment plan, lab cases, anesthesia log, AI notes/commands). The browser sends the
 * patient it is showing in X-Molaris-Patient; if another tab or PC switched the active
 * patient meanwhile, the write is refused instead of landing in the wrong chart.
 */
const GUARDED_PATHS = [
  /^\/api\/odontogram(\/|$)/,
  /^\/api\/medications(\/|$)/,
  /^\/api\/perio-charts(\/|$)/,
  /^\/api\/treatment-plan(\/|$)/,
  /^\/api\/lab-cases(\/|$)/,
  /^\/api\/anesthesia\/log$/,
  /^\/api\/chat(\/history)?$/,
  /^\/api\/generate-soap$/,
  /^\/api\/analyze-image$/
];

export const ACTIVE_PATIENT_HEADER = 'x-molaris-patient';

export function guardActivePatient(activePatientId: () => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || !GUARDED_PATHS.some(p => p.test(req.path))) return next();
    const expected = req.get(ACTIVE_PATIENT_HEADER);
    if (expected && expected !== activePatientId()) {
      res.status(409).json({
        code: 'ACTIVE_PATIENT_CHANGED',
        error: 'Le dossier ouvert a changé (autre onglet ou autre poste). Rien n’a été enregistré : la page va se recharger sur le dossier actif.'
      });
      return;
    }
    next();
  };
}
