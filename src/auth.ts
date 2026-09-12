import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
  }
}

// Auth is only enforced once a real APP_PASSWORD is configured, so local
// development keeps working out of the box. Anything reachable beyond
// localhost MUST set a real APP_PASSWORD.
export const AUTH_ENABLED = !!process.env.APP_PASSWORD && process.env.APP_PASSWORD !== 'change_me';

const OPEN_PATHS = new Set(['/login.html', '/api/auth/login', '/api/auth/status']);

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!AUTH_ENABLED || OPEN_PATHS.has(req.path) || req.session?.authenticated) {
    next();
    return;
  }
  if (req.path.startsWith('/api/')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  res.redirect('/login.html');
}

export function checkPassword(candidate: string): boolean {
  const expected = Buffer.from(process.env.APP_PASSWORD || '');
  const given = Buffer.from(String(candidate || ''));
  if (expected.length !== given.length) return false;
  return crypto.timingSafeEqual(expected, given);
}
