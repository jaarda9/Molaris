import { z } from 'zod';
import { isPrimaryToothId } from '../domain/primary-teeth.js';

/*
 * Input validation for the legacy "active patient" endpoints (patients, odontogram,
 * treatment plan, lab cases, perio, anesthesia). Unknown fields are dropped (zod strips
 * them), so a request can never overwrite, say, a patient's whole odontogram.
 * Messages are in French: they are shown as-is in the clinic UI.
 */

/** Chart tooth id: Universal 1-32 (permanent teeth) or FDI 51-85 (primary teeth). */
export const toothId = z.coerce.number({ invalid_type_error: 'nombre attendu' }).int().refine(
  n => (n >= 1 && n <= 32) || isPrimaryToothId(n),
  'dent inconnue'
);

/** '' from an empty form field means "not given". */
const blankAsUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);
// (preprocess loses the output type; the schema still validates the value.)
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(blankAsUndefined, schema.optional()) as unknown as z.ZodOptional<T>;
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);

const realDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date attendue au format AAAA-MM-JJ').refine(value => {
  const d = new Date(`${value}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}, 'date inexistante');

// --- Patients -----------------------------------------------------------------------

const patientFields = {
  name: z.string().trim().min(1, 'le nom est obligatoire').max(120, '120 caractères maximum'),
  chartId: optional(text(40)),
  phone: text(40).optional(),
  cnamId: text(40).optional(),
  cnamQuality: z.enum(['assure', 'conjoint', 'enfant', 'ascendant', '']).optional(),
  // Age is derived from it when given.
  birthDate: optional(realDate.refine(value => value >= '1900-01-01' && value <= localToday(), 'date de naissance impossible')),
  // Weight and age drive anesthetic doses and paediatric warnings: keep them plausible.
  age: z.coerce.number({ invalid_type_error: 'nombre attendu' }).int('âge en années entières').min(0, 'âge entre 0 et 120 ans').max(120, 'âge entre 0 et 120 ans'),
  gender: z.enum(['Male', 'Female', 'Other']),
  weightKg: z.coerce.number({ invalid_type_error: 'nombre attendu' }).min(2, 'poids entre 2 et 250 kg').max(250, 'poids entre 2 et 250 kg'),
  asaStatus: z.enum(['ASA I', 'ASA II', 'ASA III', 'ASA IV']),
  cardiacRisk: z.boolean(),
  chiefComplaint: text(2000),
  medicalAlerts: text(2000),
  allergies: text(2000),
  isPregnantOrNursing: z.boolean(),
  prophylaxisRequired: z.boolean(),
  prophylaxisReason: text(500)
};

export const patientCreateSchema = z.object({
  ...patientFields,
  age: patientFields.age.optional(),
  gender: patientFields.gender.optional(),
  weightKg: patientFields.weightKg.optional(),
  asaStatus: patientFields.asaStatus.optional(),
  cardiacRisk: patientFields.cardiacRisk.optional(),
  chiefComplaint: patientFields.chiefComplaint.optional(),
  medicalAlerts: patientFields.medicalAlerts.optional(),
  allergies: patientFields.allergies.optional(),
  isPregnantOrNursing: patientFields.isPregnantOrNursing.optional(),
  prophylaxisRequired: patientFields.prophylaxisRequired.optional(),
  prophylaxisReason: patientFields.prophylaxisReason.optional()
});

/** Only the identity/medical fields a form edits; clinical records have their own endpoints. */
export const patientUpdateSchema = z.object(patientFields).partial();

// --- Odontogram ---------------------------------------------------------------------

export const TOOTH_STATUSES = ['sound', 'caries', 'restoration', 'crown', 'rct', 'missing', 'implant', 'veneer', 'unerupted'] as const;

export const toothUpdateSchema = z.object({
  toothId,
  status: z.enum(TOOTH_STATUSES, { message: 'état de dent inconnu' }).optional(),
  notes: text(2000).optional(),
  surfaces: z.object({
    mesial: z.boolean().optional(),
    distal: z.boolean().optional(),
    occlusal: z.boolean().optional(),
    buccal: z.boolean().optional(),
    lingual: z.boolean().optional()
  }).optional()
});

// --- Treatment plan -----------------------------------------------------------------

const TREATMENT_PRIORITIES = ['urgent', 'high', 'routine', 'elective'] as const;
// --- Current medications (drug-safety checks read these names) --------------------------

const medicationFields = {
  name: z.string({ invalid_type_error: 'texte attendu' }).trim().min(1, 'le nom du médicament est obligatoire').max(120, '120 caractères maximum'),
  dosage: text(120).default(''),
  frequency: text(120).default(''),
  prescribedFor: optional(text(300))
};

export const medicationCreateSchema = z.object(medicationFields);

export const medicationUpdateSchema = z.object({
  ...medicationFields,
  active: z.boolean({ invalid_type_error: 'vrai ou faux attendu' })
}).partial();

const TREATMENT_STATUSES =['proposed', 'accepted', 'in_progress', 'completed', 'declined'] as const;
const estimatedCost = z.coerce.number({ invalid_type_error: 'nombre attendu' }).min(0, 'le coût ne peut pas être négatif').max(1_000_000, 'coût trop élevé');

export const treatmentCreateSchema = z.object({
  procedure: z.string().trim().min(1, 'l’acte est obligatoire').max(300),
  toothId: optional(toothId),
  cdtCode: optional(text(40)),
  priority: z.enum(TREATMENT_PRIORITIES, { message: 'priorité inconnue' }).default('routine'),
  estimatedCost: optional(estimatedCost),
  notes: optional(text(2000))
});

export const treatmentUpdateSchema = z.object({
  procedure: z.string().trim().min(1).max(300).optional(),
  toothId: optional(toothId),
  priority: z.enum(TREATMENT_PRIORITIES, { message: 'priorité inconnue' }).optional(),
  status: z.enum(TREATMENT_STATUSES, { message: 'statut inconnu' }).optional(),
  cdtCode: optional(text(40)),
  estimatedCost: optional(estimatedCost),
  notes: optional(text(2000))
});

/** Plan fields an edit may empty: sent as null (a blank means "unchanged" elsewhere). */
export const TREATMENT_CLEARABLE = ['toothId', 'cdtCode', 'estimatedCost', 'notes'] as const;

// --- Lab cases ------------------------------------------------------------------------

const LAB_STATUSES = ['planned', 'sent', 'in_lab', 'returned', 'seated', 'remake'] as const;
const labFields = {
  toothId: optional(toothId),
  material: optional(text(120)),
  shade: optional(text(40)),
  marginDesign: optional(text(120)),
  occlusalNotes: optional(text(500)),
  labName: optional(text(120)),
  dueDate: optional(realDate),
  notes: optional(text(2000))
};

/** Lab case fields an edit may empty: sent as null. */
export const LAB_CLEARABLE = ['toothId', 'material', 'shade', 'marginDesign', 'occlusalNotes', 'labName', 'dueDate', 'notes'] as const;

export const labCaseCreateSchema = z.object({
  caseType: z.string().trim().min(1, 'le type de travail est obligatoire').max(120),
  ...labFields
});

export const labCaseUpdateSchema = z.object({
  caseType: z.string().trim().min(1).max(120).optional(),
  status: z.enum(LAB_STATUSES, { message: 'statut inconnu' }).optional(),
  sentDate: optional(realDate),
  returnedDate: optional(realDate),
  seatedDate: optional(realDate),
  ...labFields
});

// --- Periodontal chart -----------------------------------------------------------------

const mm = z.coerce.number({ invalid_type_error: 'nombre attendu' }).int('millimètres entiers').min(0, 'entre 0 et 15 mm').max(15, 'entre 0 et 15 mm');
const perioSite = z.object({ pocketDepth: mm, recession: mm, bleeding: z.boolean(), suppuration: z.boolean() });

export const perioChartSchema = z.object({
  teeth: z.array(z.object({
    toothId: z.coerce.number({ invalid_type_error: 'nombre attendu' }).int().min(1).max(32),
    mobility: z.coerce.number({ invalid_type_error: 'nombre attendu' }).int().min(0).max(3),
    furcation: z.union([z.null(), z.coerce.number({ invalid_type_error: 'nombre attendu' }).int().min(0).max(3)]),
    sites: z.object({
      mesiobuccal: perioSite, buccal: perioSite, distobuccal: perioSite,
      distolingual: perioSite, lingual: perioSite, mesiolingual: perioSite
    })
  })).min(1, 'relevé vide').max(32).refine(
    teeth => new Set(teeth.map(t => t.toothId)).size === teeth.length,
    'une dent apparaît deux fois'
  ),
  notes: optional(text(2000))
});

// --- Anesthesia --------------------------------------------------------------------------

export const anesthesiaCalcSchema = z.object({
  drugId: z.string().max(40).optional(),
  weightKg: z.coerce.number({ invalid_type_error: 'nombre attendu' }).min(2, 'poids entre 2 et 250 kg').max(250, 'poids entre 2 et 250 kg').optional(),
  isCardiacRisk: z.boolean().optional(),
  carpulesGiven: z.coerce.number({ invalid_type_error: 'nombre attendu' }).min(0, 'le nombre de carpules ne peut pas être négatif').max(30).optional(),
  language: z.enum(['en', 'fr']).optional()
});

export const anesthesiaLogSchema = z.object({
  drugId: z.string().max(40).optional(),
  carpules: z.coerce.number({ invalid_type_error: 'nombre attendu' }).gt(0, 'au moins une fraction de carpule').max(20, '20 carpules maximum par saisie'),
  site: optional(text(200)),
  notes: optional(text(1000)),
  language: z.enum(['en', 'fr']).optional()
});
