import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { parse, route } from '../../routes/http.js';
import { DrugRepository } from './repository.js';

export const prescriptionsRouter = Router();

prescriptionsRouter.get('/api/drugs', route((req, res) => {
  const { includeInactive } = parse(z.object({ includeInactive: z.enum(['true', 'false']).optional() }), req.query);
  const drugs = new DrugRepository(getDb()).list({ includeInactive: includeInactive === 'true' });
  res.json({ drugs });
}));
