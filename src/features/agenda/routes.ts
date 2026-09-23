import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../../db/connection.js';
import { parse, route } from '../../routes/http.js';
import { AppointmentRepository } from './repository.js';

export const agendaRouter = Router();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

agendaRouter.get('/api/appointments', route((req, res) => {
  const { from, to } = parse(z.object({ from: isoDate, to: isoDate }), req.query);
  const appointments = new AppointmentRepository(getDb()).listBetween(from, to);
  res.json({ appointments });
}));
