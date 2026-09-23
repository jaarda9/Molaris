import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { parse, route } from '../../routes/http.js';
import { ProcedureRepository } from './repository.js';

export const billingRouter = Router();

billingRouter.get('/api/procedures', route((req, res) => {
  const { includeInactive } = parse(z.object({ includeInactive: z.enum(['true', 'false']).optional() }), req.query);
  const procedures = new ProcedureRepository(getDb()).list({ includeInactive: includeInactive === 'true' });
  res.json({ procedures });
}));
