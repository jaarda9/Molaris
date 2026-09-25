import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, ZodType } from 'zod';

/** Throw from a route to send `{ error: message }` with the given status. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);

/** Validates a request body/query against a zod schema; a failure becomes a 400 with the first issue. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    // Shown as-is in the (French) clinic UI: « Acte : l’acte est obligatoire ».
    const where = issue.path.map(part => (typeof part === 'number' ? String(part + 1) : FIELD_LABELS[part] ?? part)).join(' › ');
    const missing = issue.code === 'invalid_type' && issue.received === 'undefined';
    throw new HttpError(400, `${where || 'Requête'} : ${missing ? 'obligatoire' : issue.message}`);
  }
  return result.data;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom', phone: 'Téléphone', age: 'Âge', birthDate: 'Date de naissance', weightKg: 'Poids', gender: 'Sexe',
  asaStatus: 'Classe ASA', allergies: 'Allergies', medicalAlerts: 'Antécédents', chartId: 'N° de dossier',
  cnamId: 'Identifiant CNAM', cnamQuality: 'Qualité CNAM', patientId: 'Patient',
  procedure: 'Acte', toothId: 'Dent', toothFdi: 'Dent', status: 'Statut', priority: 'Priorité', notes: 'Remarques',
  content: 'Texte', estimatedCost: 'Coût estimé', caseType: 'Type de travail', dueDate: 'Échéance',
  dosage: 'Posologie', frequency: 'Fréquence', duration: 'Durée', drugLabel: 'Médicament',
  amountMillimes: 'Montant', method: 'Mode de paiement', reference: 'Référence', paidAt: 'Date du paiement',
  quoteId: 'Devis', items: 'Lignes', label: 'Libellé', quantity: 'Quantité', unitPriceMillimes: 'Prix unitaire',
  startAt: 'Début', endAt: 'Fin', durationMinutes: 'Durée', reason: 'Motif', chair: 'Fauteuil',
  carpules: 'Carpules', drugId: 'Anesthésique', teeth: 'Dents', sites: 'Sites', language: 'Langue'
};

/** Wraps a (possibly async) handler so thrown errors reach the error middleware. */
export function route(handler: (req: Request, res: Response) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

/** Last middleware: turns HttpError / ZodError / anything else into a JSON error. */
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message || 'Invalid request' });
  } else {
    console.error('[Unhandled route error]', err);
    res.status(500).json({ error: (err as Error)?.message || 'Internal server error' });
  }
}

export function languageOf(value: unknown): 'en' | 'fr' {
  return value === 'fr' ? 'fr' : 'en';
}
