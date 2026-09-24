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

// Only these fields, of sensible length: they are sent to the AI with every question.
const preferencesSchema = z.object({
  preferences: z.object({
    doctorName: z.string().trim().max(120),
    clinicName: z.string().trim().max(200),
    bondingSystem: z.string().trim().max(200),
    compositeSystem: z.string().trim().max(200),
    rotarySystem: z.string().trim().max(200),
    implantSystem: z.string().trim().max(200),
    numberingSystem: z.enum(['fdi', 'universal']),
    preferredAnesthetic: z.string().trim().max(60),
    voiceFeedbackEnabled: z.boolean(),
    notes: z.string().trim().max(2000, '2000 caractères maximum')
  }).partial()
});

settingsRouter.post('/api/memory', route((req: Request, res: Response) => {
  const { preferences } = parse(preferencesSchema, req.body);
  const memory = loadMemory();
  memory.preferences = { ...memory.preferences, ...preferences };
  saveMemory(memory);
  res.json({ success: true, memory });
}));

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
