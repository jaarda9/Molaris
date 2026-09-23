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
    throw new HttpError(400, `${issue.path.join('.') || 'body'}: ${issue.message}`);
  }
  return result.data;
}

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
