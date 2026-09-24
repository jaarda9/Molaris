import express, { Request, Response } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { AUTH_ENABLED, requireAuth, checkPassword } from './middleware/auth.js';
import { scopeToPagePatient } from './middleware/active-patient.js';
import { patientDb } from './repositories/patients.js';
import { errorMiddleware } from './routes/http.js';
import { patientsRouter } from './routes/patients.js';
import { settingsRouter } from './routes/settings.js';
import { clinicalRouter } from './routes/clinical.js';
import { anesthesiaRouter } from './routes/anesthesia.js';
import { aiRouter } from './routes/ai.js';
import { agendaRouter } from './features/agenda/routes.js';
import { billingRouter } from './features/billing/routes.js';
import { prescriptionsRouter } from './features/prescriptions/routes.js';

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    name: 'molaris.sid',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000 }
  }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again later.' }
  });

  app.post('/api/auth/login', loginLimiter, (req: Request, res: Response) => {
    if (!AUTH_ENABLED) {
      res.json({ success: true });
      return;
    }
    if (!checkPassword(req.body.password)) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }
    req.session.authenticated = true;
    res.json({ success: true });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get('/api/auth/status', (req: Request, res: Response) => {
    res.json({ authEnabled: AUTH_ENABLED, authenticated: !AUTH_ENABLED || !!req.session.authenticated });
  });

  app.use(requireAuth);

  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // Each request acts on the patient its page shows (other tabs/PCs may show others).
  app.use(scopeToPagePatient(id => !!patientDb.getPatientById(id)));

  app.use(patientsRouter);
  app.use(settingsRouter);
  app.use(clinicalRouter);
  app.use(anesthesiaRouter);
  app.use(aiRouter);
  app.use(agendaRouter);
  app.use(billingRouter);
  app.use(prescriptionsRouter);

  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({ error: `Unknown API route: ${req.method} ${req.originalUrl}` });
  });

  // Single-page app: any other path serves the shell.
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorMiddleware);
  return app;
}
