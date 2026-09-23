import { Router, Request, Response } from 'express';
import { patientDb } from '../repositories/patients.js';
import { ANESTHETICS, QUICK_PROTOCOLS } from '../domain/dental-data.js';
import { calculateAnestheticDose } from '../domain/anesthesia-calc.js';
import { checkDrugInteractions } from '../domain/clinical-safety.js';
import { languageOf } from './http.js';

export const anesthesiaRouter = Router();

anesthesiaRouter.get('/api/anesthetics', (req: Request, res: Response) => {
  res.json({ anesthetics: ANESTHETICS, protocols: QUICK_PROTOCOLS });
});

anesthesiaRouter.post('/api/calc-la', (req: Request, res: Response) => {
  try {
    const activePatient = patientDb.getActivePatient();
    const { drugId, weightKg, isCardiacRisk, carpulesGiven, language = 'en' } = req.body;
    const drug = ANESTHETICS.find(a => a.id === drugId) || ANESTHETICS[0];

    res.json(calculateAnestheticDose({
      drug,
      weightKg: weightKg !== undefined ? Number(weightKg) : activePatient.weightKg,
      isCardiacRisk: isCardiacRisk !== undefined ? !!isCardiacRisk : activePatient.cardiacRisk,
      carpulesGiven: carpulesGiven !== undefined ? Number(carpulesGiven) : activePatient.deliveredCarpules,
      language
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

anesthesiaRouter.post('/api/anesthesia/log', (req: Request, res: Response) => {
  try {
    const { drugId, carpules, site, notes, language } = req.body;
    const drug = ANESTHETICS.find(a => a.id === drugId) || ANESTHETICS[0];
    const carp = Number(carpules) || 1.0;

    let epiPerCartridge = 0;
    if (drug.epiRatio === '1:100,000') epiPerCartridge = drug.cartridgeVolume * 0.01;
    else if (drug.epiRatio === '1:200,000') epiPerCartridge = drug.cartridgeVolume * 0.005;

    const result = patientDb.logAnesthesiaForActivePatient({
      drugId: drug.id,
      drugName: drug.name,
      carpules: carp,
      mg: Math.round(carp * drug.mgPerCartridge),
      epiMg: Math.round(carp * epiPerCartridge * 1000) / 1000,
      site: site || 'Buccal Infiltration / Block',
      notes
    });

    const safetyAlerts = checkDrugInteractions(result.patient.medications, [drug.name], languageOf(language));
    res.json({ success: true, patient: result.patient, entry: result.entry, safetyAlerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
