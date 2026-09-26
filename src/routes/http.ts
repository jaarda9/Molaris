import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, ZodError, ZodIssueCode, ZodType } from 'zod';

/** Throw from a route to send `{ error: message }` with the given status. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const NOT_FOUND_FR: Record<string, string> = {
  Appointment: 'Rendez-vous introuvable.', Drug: 'Médicament introuvable.', Patient: 'Patient introuvable.',
  Payment: 'Règlement introuvable.', Prescription: 'Ordonnance introuvable.', Procedure: 'Acte introuvable.', Quote: 'Devis introuvable.'
};
/** 404 in French for the clinic UI (« Devis introuvable. »). */
export const notFound = (what: string) => new HttpError(404, NOT_FOUND_FR[what] ?? `${what} introuvable.`);

// French defaults for validation rules that do not carry their own message (those keep it):
// zod's English « Number must be greater than or equal to 1 » would reach the clinic UI.
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      return { message: issue.received === 'undefined' ? 'obligatoire' : issue.expected === 'number' ? 'nombre attendu' : 'valeur non valide' };
    case ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: Number(issue.minimum) <= 1 ? 'obligatoire' : `au moins ${issue.minimum} caractères` };
      if (issue.type === 'array') return { message: `au moins ${issue.minimum} élément(s)` };
      return { message: issue.inclusive ? `au moins ${issue.minimum}` : `doit être supérieur à ${issue.minimum}` };
    case ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `${issue.maximum} caractères au plus` };
      if (issue.type === 'array') return { message: `${issue.maximum} éléments au plus` };
      return { message: issue.inclusive ? `${issue.maximum} au plus` : `doit être inférieur à ${issue.maximum}` };
    case ZodIssueCode.invalid_enum_value:
      return { message: 'valeur non reconnue' };
    case ZodIssueCode.invalid_string:
      return { message: 'format non valide' };
    case ZodIssueCode.unrecognized_keys:
      return { message: `champ(s) inconnu(s) : ${issue.keys.join(', ')}` };
    default:
      return { message: ctx.defaultError };
  }
});

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
  } else if (isBodyParserError(err)) {
    // A malformed or oversized body is the client's mistake, not a server failure.
    res.status(err.status).json({ error: err.type === 'entity.too.large' ? 'Requête trop volumineuse.' : 'Requête invalide (données mal formées).' });
  } else {
    console.error('[Unhandled route error]', err);
    res.status(500).json({ error: (err as Error)?.message || 'Internal server error' });
  }
}

/** Errors raised by express.json() (bad JSON, body too large) carry a 4xx status and a type. */
function isBodyParserError(err: unknown): err is { status: number; type: string } {
  const e = err as { status?: unknown; type?: unknown };
  return typeof e?.type === 'string' && e.type.startsWith('entity.') && typeof e.status === 'number' && e.status >= 400 && e.status < 500;
}

export function languageOf(value: unknown): 'en' | 'fr' {
  return value === 'fr' ? 'fr' : 'en';
}
