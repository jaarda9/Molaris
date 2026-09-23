// Demo data for the prescriptions feature (picked up by `npm run db:demo`).
//
// IMPORTANT: these posologies are DEMO DEFAULTS for a healthy adult. They are
// standard dental-practice values but every dentist must review and adapt them
// (age, weight, renal/hepatic function, pregnancy, interactions) before use.
// Drugs are recorded by DCI; `brand` is left empty on purpose (no brand is
// asserted as marketed in Tunisia). Lines marked ⚠️ À VÉRIFIER need a clinical check.
import type { DB } from '../../db/connection.js';
import { DrugRepository, PrescriptionRepository, type DrugInput } from './repository.js';

export const DEMO_DRUGS: Array<DrugInput & { id: string }> = [
  // --- Antibiotiques -------------------------------------------------------
  {
    id: 'drug_demo_amoxicilline', category: 'antibiotique',
    dci: 'Amoxicilline', form: 'comprimé', strength: '1 g',
    // 2 g/jour en 2 prises (adulte).
    defaultDosage: '1 comprimé 2 fois par jour (matin et soir)', defaultDuration: '7 jours',
    defaultInstructionsAr: 'قرص واحد مرتين في اليوم (صباحًا ومساءً)'
  },
  {
    // ⚠️ À VÉRIFIER: forme/dosage 1 g/125 mg et 2 vs 3 prises par jour selon l'indication.
    id: 'drug_demo_amox_clav', category: 'antibiotique',
    dci: 'Amoxicilline + acide clavulanique', form: 'comprimé', strength: '1 g/125 mg',
    defaultDosage: '1 comprimé 2 fois par jour, au début du repas', defaultDuration: '7 jours',
    defaultInstructionsAr: 'قرص واحد مرتين في اليوم في بداية الوجبة'
  },
  {
    // Alternative en cas d'allergie aux pénicillines. 1 200 mg/jour en 2 prises (adulte).
    // ⚠️ À VÉRIFIER: 600 mg × 2/j vs 300 mg × 3/j selon les habitudes locales.
    id: 'drug_demo_clindamycine', category: 'antibiotique',
    dci: 'Clindamycine', form: 'gélule', strength: '300 mg',
    defaultDosage: '2 gélules 2 fois par jour, avec un grand verre d\'eau', defaultDuration: '7 jours',
    defaultInstructionsAr: 'كبسولتان مرتين في اليوم مع كوب كبير من الماء'
  },
  {
    // ⚠️ À VÉRIFIER: schéma 500 mg/jour pendant 3 jours.
    id: 'drug_demo_azithromycine', category: 'antibiotique',
    dci: 'Azithromycine', form: 'comprimé', strength: '250 mg',
    defaultDosage: '2 comprimés en une seule prise par jour', defaultDuration: '3 jours',
    defaultInstructionsAr: 'قرصان مرة واحدة في اليوم'
  },
  {
    // ⚠️ À VÉRIFIER: 4 à 6 comprimés/jour en 2 à 3 prises (adulte).
    id: 'drug_demo_spiramycine_metronidazole', category: 'antibiotique',
    dci: 'Spiramycine + métronidazole', form: 'comprimé', strength: '1,5 MUI/250 mg',
    defaultDosage: '2 comprimés 3 fois par jour, au cours du repas. Pas d\'alcool', defaultDuration: '7 jours',
    defaultInstructionsAr: 'قرصان ثلاث مرات في اليوم أثناء الوجبة. يُمنع شرب الكحول'
  },
  {
    // ⚠️ À VÉRIFIER: 1 500 mg/jour en 3 prises (certains schémas: 2 prises).
    id: 'drug_demo_metronidazole', category: 'antibiotique',
    dci: 'Métronidazole', form: 'comprimé', strength: '500 mg',
    defaultDosage: '1 comprimé 3 fois par jour, au cours du repas. Pas d\'alcool', defaultDuration: '7 jours',
    defaultInstructionsAr: 'قرص واحد ثلاث مرات في اليوم أثناء الوجبة. يُمنع شرب الكحول'
  },
  // --- Antalgiques ----------------------------------------------------------
  {
    // ⚠️ À VÉRIFIER: plafond retenu 3 g/jour (4 g/jour maximum chez l'adulte sain).
    id: 'drug_demo_paracetamol', category: 'antalgique',
    dci: 'Paracétamol', form: 'comprimé', strength: '1 g',
    defaultDosage: '1 comprimé si douleur, à renouveler après au moins 6 heures (maximum 3 comprimés par jour)',
    defaultDuration: '5 jours',
    defaultInstructionsAr: 'قرص واحد عند الألم، ويمكن تكراره بعد 6 ساعات على الأقل (3 أقراص في اليوم كحد أقصى)'
  },
  {
    // ⚠️ À VÉRIFIER: codéine — contre-indications (allaitement, < 12 ans, métaboliseurs ultra-rapides).
    id: 'drug_demo_paracetamol_codeine', category: 'antalgique',
    dci: 'Paracétamol + codéine', form: 'comprimé', strength: '500 mg/30 mg',
    defaultDosage: '1 à 2 comprimés si douleur, à renouveler après au moins 6 heures (maximum 6 comprimés par jour)',
    defaultDuration: '3 jours',
    defaultInstructionsAr: 'قرص أو قرصان عند الألم، ويمكن تكرار ذلك بعد 6 ساعات على الأقل (6 أقراص في اليوم كحد أقصى)'
  },
  // --- AINS -------------------------------------------------------------------
  {
    // 1 200 mg/jour (adulte). Risque hémorragique sous anticoagulant/antiagrégant (alerte critique Molaris).
    id: 'drug_demo_ibuprofene', category: 'AINS',
    dci: 'Ibuprofène', form: 'comprimé', strength: '400 mg',
    defaultDosage: '1 comprimé 3 fois par jour, au milieu du repas', defaultDuration: '3 jours',
    defaultInstructionsAr: 'قرص واحد ثلاث مرات في اليوم في منتصف الوجبة'
  },
  {
    // 150 mg/jour maximum (adulte).
    id: 'drug_demo_diclofenac', category: 'AINS',
    dci: 'Diclofénac', form: 'comprimé', strength: '50 mg',
    defaultDosage: '1 comprimé 3 fois par jour, au milieu du repas', defaultDuration: '3 jours',
    defaultInstructionsAr: 'قرص واحد ثلاث مرات في اليوم في منتصف الوجبة'
  },
  {
    // ⚠️ À VÉRIFIER: forme LP 100 mg, 200 mg/jour maximum.
    id: 'drug_demo_ketoprofene', category: 'AINS',
    dci: 'Kétoprofène', form: 'comprimé à libération prolongée', strength: '100 mg',
    defaultDosage: '1 comprimé matin et soir, au milieu du repas', defaultDuration: '3 jours',
    defaultInstructionsAr: 'قرص واحد صباحًا ومساءً في منتصف الوجبة'
  },
  // --- Antiseptique, antifongique, corticoïde, autre ----------------------------
  {
    // ⚠️ À VÉRIFIER: concentration (0,12 % vs 0,2 %), volume et durée (coloration des dents au-delà de 2 semaines).
    id: 'drug_demo_chlorhexidine', category: 'antiseptique',
    dci: 'Chlorhexidine', form: 'bain de bouche', strength: '0,12 %',
    defaultDosage: 'Bain de bouche 2 fois par jour après le brossage : 15 ml pendant 30 secondes. Ne pas avaler, ne pas rincer à l\'eau',
    defaultDuration: '10 jours',
    defaultInstructionsAr: 'مضمضة مرتين في اليوم بعد تنظيف الأسنان: 15 مل لمدة 30 ثانية. لا تبتلعه ولا تشطف فمك بالماء بعده'
  },
  {
    // ⚠️ À VÉRIFIER: 1,5 à 2 g/jour (1 cuillère à café = 5 ml = 500 mg), 2 à 3 semaines.
    id: 'drug_demo_amphotericine_b', category: 'antifongique',
    dci: 'Amphotéricine B', form: 'suspension buvable', strength: '10 %',
    defaultDosage: '1 cuillère à café 3 fois par jour, à distance des repas ; garder en bouche quelques minutes avant d\'avaler',
    defaultDuration: '14 jours',
    defaultInstructionsAr: 'ملعقة صغيرة ثلاث مرات في اليوم بعيدًا عن الوجبات، مع إبقائها في الفم بضع دقائق قبل البلع'
  },
  {
    // ⚠️ À VÉRIFIER: 1 mg/kg/jour en cure courte (œdème post-opératoire) ; le dentiste précise le nombre de comprimés.
    id: 'drug_demo_prednisolone', category: 'corticoïde',
    dci: 'Prednisolone', form: 'comprimé orodispersible', strength: '20 mg',
    defaultDosage: '1 mg/kg/jour en une prise le matin, au cours du repas', defaultDuration: '3 jours',
    defaultInstructionsAr: 'مرة واحدة في الصباح أثناء الوجبة، بعدد الأقراص الذي حدّده الطبيب'
  },
  {
    // Protection gastrique pendant un traitement AINS chez le patient à risque.
    id: 'drug_demo_omeprazole', category: 'autre',
    dci: 'Oméprazole', form: 'gélule', strength: '20 mg',
    defaultDosage: '1 gélule le matin à jeun, pendant le traitement anti-inflammatoire', defaultDuration: '5 jours',
    defaultInstructionsAr: 'كبسولة واحدة في الصباح على الريق، طوال مدة العلاج المضاد للالتهاب'
  }
];

export function seedDemo(db: DB): void {
  const drugs = new DrugRepository(db);
  for (const { id, ...drug } of DEMO_DRUGS) {
    if (!drugs.get(id)) drugs.create(drug, id);
  }

  // One past prescription for pt_1 (irreversible pulpitis of 46, endodontic
  // treatment started): analgesics only — no antibiotic is indicated.
  const hasPatient = db.prepare('SELECT 1 FROM patients WHERE id = ?').get('pt_1');
  const prescriptions = new PrescriptionRepository(db);
  if (!hasPatient || prescriptions.listForPatient('pt_1').length > 0) return;

  const line = (drugId: string, quantity: string) => {
    const d = drugs.get(drugId)!;
    return {
      drugId: d.id, drugLabel: d.dci, brand: d.brand, form: d.form, strength: d.strength,
      dosage: d.defaultDosage!, duration: d.defaultDuration, quantity, instructionsAr: d.defaultInstructionsAr
    };
  };
  const issued = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);
  prescriptions.create({
    patientId: 'pt_1',
    patientName: 'Mohamed Ben Salah',
    patientAge: 48,
    language: 'fr_ar',
    notes: 'Pulpite irréversible 46 : traitement endodontique en cours.',
    criticalAlertsOverridden: false,
    safetyAlerts: [],
    items: [line('drug_demo_paracetamol', '1 boîte'), line('drug_demo_ibuprofene', '1 boîte')]
  }, issued);
}
