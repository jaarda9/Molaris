import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { getClinicIdentity, setClinicIdentity } from '../db/settings.js';
import { loadMemory, saveMemory } from '../repositories/preferences.js';
import { parse, route } from './http.js';

export const settingsRouter = Router();

// Doctor clinical preferences (materials, systems, numbering) used to tailor AI advice.
settingsRouter.get('/api/memory', (req: Request, res: Response) => {
  res.json(loadMemory());
});

settingsRouter.post('/api/memory', (req: Request, res: Response) => {
  try {
    const memory = loadMemory();
    if (req.body.preferences) {
      memory.preferences = { ...memory.preferences, ...req.body.preferences };
    }
    saveMemory(memory);
    res.json({ success: true, memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clinic identity printed as the letterhead of quotes, receipts and prescriptions.
settingsRouter.get('/api/settings/clinic', route((req, res) => {
  res.json({ clinic: getClinicIdentity(getDb()) });
}));

const clinicIdentitySchema = z.object({
  clinicName: z.string().max(200),
  doctorName: z.string().max(200),
  specialty: z.string().max(200),
  address: z.string().max(300),
  city: z.string().max(100),
  phone: z.string().max(50),
  email: z.string().max(200),
  fiscalId: z.string().max(50),
  orderNumber: z.string().max(50),
  cnamCode: z.string().max(50)
}).partial();

settingsRouter.put('/api/settings/clinic', route((req, res) => {
  const updates = parse(clinicIdentitySchema, req.body);
  res.json({ success: true, clinic: setClinicIdentity(getDb(), updates) });
}));
