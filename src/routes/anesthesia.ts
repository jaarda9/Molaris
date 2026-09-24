import { Router, Request, Response } from 'express';
import { patientDb } from '../repositories/patients.js';
import { ANESTHETICS, QUICK_PROTOCOLS } from '../domain/dental-data.js';
import { calculateAnestheticDose, dosesLoggedOn } from '../domain/anesthesia-calc.js';
import { checkDrugInteractions } from '../domain/clinical-safety.js';
import { HttpError, languageOf, parse } from './http.js';
import { anesthesiaCalcSchema, anesthesiaLogSchema } from './clinical-validation.js';

export const anesthesiaRouter = Router();

anesthesiaRouter.get('/api/anesthetics', (req: Request, res: Response) => {
  res.json({ anesthetics: ANESTHETICS, protocols: QUICK_PROTOCOLS });
});

anesthesiaRouter.post('/api/calc-la', (req: Request, res: Response) => {
  try {
    const activePatient = patientDb.getActivePatient();
    const { drugId, weightKg, isCardiacRisk, carpulesGiven, language = 'en' } = parse(anesthesiaCalcSchema, req.body);
    const drug = ANESTHETICS.find(a => a.id === drugId) || ANESTHETICS[0];

    // Injections already logged today (any drug) count toward today's maximum; the UI
    // counter only holds carpules of the selected drug injected now and not yet logged.
    const loggedToday = dosesLoggedOn(activePatient.anesthesiaLog);
    res.json({
      ...calculateAnestheticDose({
        drug,
        weightKg: weightKg !== undefined ? Number(weightKg) : activePatient.weightKg,
        isCardiacRisk: isCardiacRisk !== undefined ? !!isCardiacRisk : activePatient.cardiacRisk,
        carpulesGiven: carpulesGiven !== undefined ? Number(carpulesGiven) : 0,
        priorDoses: loggedToday,
        language
      }),
      loggedToday: loggedToday.map(d => ({ drugId: d.drug.id, drugName: d.drug.name, carpules: d.carpules }))
    });
  } catch (err: any) {
    // Validation errors (HttpError) keep their 400; anything else is a server error.
    res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message });
  }
});

anesthesiaRouter.post('/api/anesthesia/log', (req: Request, res: Response) => {
  try {
    // 0 used to be logged as 1 carpule and negative values lowered the day's total.
    const { drugId, carpules, site, notes, language } = parse(anesthesiaLogSchema, req.body);
    const drug = ANESTHETICS.find(a => a.id === drugId) || ANESTHETICS[0];
    const carp = carpules;

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
    // Validation errors (HttpError) keep their 400; anything else is a server error.
    res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message });
  }
});
