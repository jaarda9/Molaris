import fs from 'fs';
import path from 'path';
import { ToothInfo, DEFAULT_TEETH } from '../domain/dental-data.js';
import { createPrimaryTeeth, isPrimaryToothId, isUntouchedPrimaryChart, PrimaryTeethMode } from '../domain/primary-teeth.js';
import {
  Medication,
  PerioChartSnapshot,
  TreatmentPlanItem,
  ConsentRecord,
  ClinicalImageRecord,
  LabCase,
  RecallInfo,
  createDefaultRecall,
  SoapAddendum
} from '../domain/clinical-records.js';
import { DB, DATA_DIR, getDb } from '../db/connection.js';
import { nextDocumentNumber } from '../db/counters.js';
import { newId, nowIso } from '../db/ids.js';

export interface PatientRecord {
  id: string;
  chartId: string;
  name: string;
  phone?: string;
  /** CNAM unique beneficiary identifier, printed on prescriptions (CNAM dentists' convention, art. 40). */
  cnamId?: string;
  /** Beneficiary status on the CNAM card: the insured person or a dependant. */
  cnamQuality?: 'assure' | 'conjoint' | 'enfant' | 'ascendant';
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  weightKg: number;
  asaStatus: 'ASA I' | 'ASA II' | 'ASA III' | 'ASA IV';
  cardiacRisk: boolean;
  medicalAlerts: string;
  allergies: string;
  chiefComplaint: string;
  deliveredCarpules: number;
  selectedDrugId: string;
  isPregnantOrNursing: boolean;
  prophylaxisRequired: boolean;
  prophylaxisReason?: string;
  teeth: ToothInfo[];
  /** Primary teeth FDI 51–85 (ids = FDI numbers), kept apart from the 32 permanent teeth. */
  primaryTeeth: ToothInfo[];
  /** Whether the odontogram shows the primary teeth: automatic (by age/findings) or the dentist's choice. */
  primaryTeethMode: PrimaryTeethMode;
  medications: Medication[];
  perioCharts: PerioChartSnapshot[];
  treatmentPlan: TreatmentPlanItem[];
  consents: ConsentRecord[];
  images: ClinicalImageRecord[];
  labCases: LabCase[];
  recall: RecallInfo;
  anesthesiaLog: Array<{
    id: string;
    timestamp: string;
    drugId: string;
    drugName: string;
    carpules: number;
    mg: number;
    epiMg: number;
    site: string;
    notes?: string;
  }>;
  soapNotes: Array<{
    id: string;
    timestamp: string;
    procedure: string;
    toothId?: number | string;
    anesthesiaUsed: string;
    materialsUsed?: string;
    content: string;
    cdtCodes: string[];
    author: string;
    locked?: boolean;
    addenda?: SoapAddendum[];
  }>;
  consultHistory: Array<{
    role: 'user' | 'model';
    content: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DentalDatabase {
  activePatientId: string;
  patients: PatientRecord[];
}

const LEGACY_JSON_FILE = path.join(DATA_DIR, 'patients-db.json');
const ACTIVE_PATIENT_KEY = 'activePatientId';
/** Advisor conversation kept per patient: the most recent messages, each capped in length. */
const MAX_CONSULT_MESSAGES = 200;
const MAX_CONSULT_MESSAGE_CHARS = 20_000;

/** Looks a tooth up by internal id: Universal 1–32 (permanent) or FDI 51–85 (primary). */
export function findPatientTooth(patient: PatientRecord, toothId: number): ToothInfo | undefined {
  const list = isPrimaryToothId(toothId) ? patient.primaryTeeth : patient.teeth;
  return list.find(t => t.id === toothId);
}

function createPatientTeeth(modifications?: Array<{ id: number; status: ToothInfo['status']; notes?: string }>): ToothInfo[] {
  const teeth: ToothInfo[] = JSON.parse(JSON.stringify(DEFAULT_TEETH));
  modifications?.forEach(mod => {
    const tooth = teeth.find(t => t.id === mod.id);
    if (tooth) {
      tooth.status = mod.status;
      if (mod.notes) tooth.notes = mod.notes;
    }
  });
  return teeth;
}

type ClinicalDefaultFields = 'primaryTeeth' | 'primaryTeethMode' | 'medications' | 'perioCharts' | 'treatmentPlan' | 'consents' | 'images' | 'labCases' | 'recall' | 'isPregnantOrNursing' | 'prophylaxisRequired' | 'prophylaxisReason';
type PatientSeed = Omit<PatientRecord, ClinicalDefaultFields> & Partial<Pick<PatientRecord, ClinicalDefaultFields>>;

// Backfills fields added after a record was first written, so older records
// (legacy JSON files, imports) always load with a consistent shape.
function withClinicalDefaults(patient: PatientSeed): PatientRecord {
  return {
    ...patient,
    primaryTeeth: patient.primaryTeeth ?? createPrimaryTeeth(Number(patient.age) || 0),
    primaryTeethMode: patient.primaryTeethMode ?? 'auto',
    isPregnantOrNursing: patient.isPregnantOrNursing ?? false,
    prophylaxisRequired: patient.prophylaxisRequired ?? false,
    prophylaxisReason: patient.prophylaxisReason,
    medications: patient.medications ?? [],
    perioCharts: patient.perioCharts ?? [],
    treatmentPlan: patient.treatmentPlan ?? [],
    consents: patient.consents ?? [],
    images: patient.images ?? [],
    labCases: patient.labCases ?? [],
    recall: patient.recall ?? createDefaultRecall()
  };
}

// Demo patients for a fresh install: Tunisian personas, French clinical text.
function buildSeedPatients(): PatientRecord[] {
  const now = nowIso();
  const seeds: PatientSeed[] = [
    {
      id: 'pt_1',
      chartId: 'PT-2026-0084',
      name: 'Mohamed Ben Salah',
      phone: '+216 98 123 456',
      cnamId: 'DEMO-0000084',
      cnamQuality: 'assure',
      age: 48,
      gender: 'Male',
      weightKg: 78,
      asaStatus: 'ASA II',
      cardiacRisk: false,
      medicalAlerts: 'Hypertension artérielle contrôlée (amlodipine 5 mg/j).',
      allergies: 'Aucune allergie médicamenteuse connue',
      chiefComplaint: 'Douleur pulsatile de la 46 au froid et à la mastication depuis 3 jours',
      deliveredCarpules: 1.0,
      selectedDrugId: 'arti_100k',
      teeth: createPatientTeeth([
        { id: 30, status: 'caries', notes: 'Carie disto-occlusale profonde atteignant le tiers interne de la dentine. Réponse au froid persistante > 20 s.' },
        { id: 19, status: 'restoration', notes: 'Composite MOD existant, joints intacts.' },
        { id: 3, status: 'crown', notes: 'Couronne zircone monolithique posée en 2022.' }
      ]),
      medications: [
        { id: 'med_seed_1', name: 'Amlodipine 5 mg', dosage: '5 mg', frequency: '1 fois/jour', prescribedFor: 'Hypertension', active: true, addedAt: now }
      ],
      anesthesiaLog: [
        {
          id: 'anes_seed_1',
          timestamp: now,
          drugId: 'arti_100k',
          drugName: 'Articaïne 4% adrénalinée 1/100 000',
          carpules: 1.0,
          mg: 68,
          epiMg: 0.017,
          site: 'Infiltration vestibulaire en regard de la 46'
        }
      ],
      soapNotes: [
        {
          id: 'soap_seed_1',
          timestamp: now,
          procedure: 'Consultation d\'urgence endodontique',
          toothId: 30,
          anesthesiaUsed: '1 carpule d\'articaïne 4% 1/100 000 en infiltration vestibulaire',
          content: 'S : Douleur pulsatile constante, exacerbée par le froid et la mastication côté droit.\nO : 46 — test au froid persistant 25 s, percussion (+), palpation (-). Radioclarté distale profonde proche de la pulpe.\nA : Pulpite irréversible symptomatique avec parodontite apicale symptomatique sur 46.\nP : Anesthésie obtenue à l\'articaïne. Curetage carieux initié sous digue.',
          cdtCodes: [],
          author: 'Dr. Praticien',
          locked: true,
          addenda: []
        }
      ],
      consultHistory: [],
      createdAt: '2026-08-10T09:00:00.000Z',
      updatedAt: now
    },
    {
      id: 'pt_2',
      chartId: 'PT-2026-0091',
      name: 'Fatma Trabelsi',
      phone: '+216 22 456 789',
      cnamId: 'DEMO-0000091',
      cnamQuality: 'conjoint',
      age: 67,
      gender: 'Female',
      weightKg: 60,
      asaStatus: 'ASA III',
      cardiacRisk: true,
      medicalAlerts: 'Infarctus du myocarde avec stent il y a 14 mois ; sensibilité aux vasoconstricteurs.',
      allergies: 'Pénicilline (urticaire)',
      chiefComplaint: 'Fracture de la cuspide palatine de la 24 en mâchant des amandes',
      deliveredCarpules: 0.0,
      selectedDrugId: 'mepi_plain',
      teeth: createPatientTeeth([
        { id: 12, status: 'caries', notes: 'Cuspide palatine fracturée, carie secondaire sous-gingivale en mésial.' },
        { id: 14, status: 'implant', notes: 'Implant bone level posé en 2021.' },
        { id: 18, status: 'missing', notes: 'Extraite pour parodontite sévère.' },
        { id: 31, status: 'missing', notes: 'Extraite en 2018.' }
      ]),
      medications: [
        { id: 'med_seed_2', name: 'Aspirine 100 mg', dosage: '100 mg', frequency: '1 fois/jour', prescribedFor: 'Prévention secondaire (stent)', active: true, addedAt: now },
        { id: 'med_seed_3', name: 'Bisoprolol 5 mg', dosage: '5 mg', frequency: '1 fois/jour', prescribedFor: 'Cardiopathie ischémique', active: true, addedAt: now }
      ],
      anesthesiaLog: [],
      soapNotes: [],
      consultHistory: [],
      createdAt: '2026-08-22T14:30:00.000Z',
      updatedAt: now
    },
    {
      id: 'pt_3',
      chartId: 'PT-2026-0105',
      name: 'Youssef Gharbi',
      phone: '+216 55 987 654',
      age: 24,
      gender: 'Male',
      weightKg: 80,
      asaStatus: 'ASA I',
      cardiacRisk: false,
      medicalAlerts: 'Étudiant sportif, aucun antécédent médical.',
      allergies: 'Aucune',
      chiefComplaint: 'Gêne et gonflement rétro-molaire inférieur gauche (dent de sagesse)',
      deliveredCarpules: 0.0,
      selectedDrugId: 'lido_100k',
      teeth: createPatientTeeth([
        { id: 17, status: 'caries', notes: 'Inclusion muqueuse partielle avec péricoronarite active.' },
        { id: 32, status: 'caries', notes: 'Inclusion mésio-angulaire contre la face distale de la 47.' },
        { id: 1, notes: 'Érupté, hygiène difficile.', status: 'sound' },
        { id: 16, notes: 'Érupté, hygiène difficile.', status: 'sound' }
      ]),
      anesthesiaLog: [],
      soapNotes: [],
      consultHistory: [],
      createdAt: '2026-09-01T11:15:00.000Z',
      updatedAt: now
    },
    {
      id: 'pt_4',
      chartId: 'PT-2026-0112',
      name: 'Lina Ben Youssef',
      phone: '+216 55 214 380',
      cnamId: 'DEMO-0000112',
      cnamQuality: 'enfant',
      age: 7,
      gender: 'Female',
      weightKg: 24,
      asaStatus: 'ASA I',
      cardiacRisk: false,
      medicalAlerts: 'Aucun antécédent médical.',
      allergies: 'Aucune allergie connue',
      chiefComplaint: 'Douleur au sucré en bas à gauche ; contrôle de l’éruption des incisives',
      deliveredCarpules: 0.0,
      selectedDrugId: 'arti_100k',
      // Mixed dentition at 7: first permanent molars and lower central incisors are out,
      // upper central incisors are erupting, the other permanent teeth are not.
      teeth: createPatientTeeth([
        ...[
          1, 2, 4, 5, 6, 7, 10, 11, 12, 13, 15, 16,
          17, 18, 20, 21, 22, 23, 26, 27, 28, 29, 31, 32
        ].map(id => ({ id, status: 'unerupted' as const })),
        { id: 8, status: 'sound', notes: 'En cours d’éruption.' },
        { id: 9, status: 'sound', notes: 'En cours d’éruption.' }
      ]),
      primaryTeeth: (() => {
        const teeth = createPrimaryTeeth(7);
        const set = (fdi: number, status: ToothInfo['status'], notes?: string) => {
          const tooth = teeth.find(t => t.id === fdi)!;
          tooth.status = status;
          if (notes) tooth.notes = notes;
        };
        set(51, 'missing', 'Exfoliée.');
        set(61, 'missing', 'Exfoliée.');
        set(71, 'missing', 'Exfoliée.');
        set(81, 'missing', 'Exfoliée.');
        set(75, 'caries', 'Carie occluso-distale, sensibilité au sucré.');
        set(84, 'restoration', 'Verre ionomère.');
        return teeth;
      })(),
      anesthesiaLog: [],
      soapNotes: [],
      consultHistory: [],
      createdAt: '2026-09-10T09:00:00.000Z',
      updatedAt: now
    }
  ];
  return seeds.map(withClinicalDefaults);
}

interface PatientRow { data: string }

export class PatientRepository {
  // Write-through cache: every mutation updates the in-memory record and then
  // persists only that patient's row (not the whole database as the old JSON
  // file store did).
  private patients = new Map<string, PatientRecord>();
  private activePatientId = '';

  constructor(private db: DB, options: { legacyJsonFile?: string | null } = {}) {
    const legacyFile = options.legacyJsonFile === undefined ? LEGACY_JSON_FILE : options.legacyJsonFile;
    this.load();
    if (this.patients.size === 0) {
      const migrated = legacyFile ? this.migrateLegacyJson(legacyFile) : false;
      if (!migrated) this.seed();
    }
    this.ensureActivePatient();
  }

  private load(): void {
    const rows = this.db.prepare('SELECT data FROM patients ORDER BY created_at, rowid').all() as PatientRow[];
    for (const row of rows) {
      const patient = withClinicalDefaults(JSON.parse(row.data));
      this.patients.set(patient.id, patient);
    }
    const active = this.db.prepare('SELECT value FROM app_state WHERE key = ?').get(ACTIVE_PATIENT_KEY) as { value: string } | undefined;
    this.activePatientId = active?.value || '';
  }

  private migrateLegacyJson(file: string): boolean {
    if (!fs.existsSync(file)) return false;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as Partial<DentalDatabase>;
      if (!Array.isArray(parsed.patients) || parsed.patients.length === 0) return false;
      this.db.transaction(() => {
        for (const raw of parsed.patients!) this.save(withClinicalDefaults(raw as PatientSeed));
        if (parsed.activePatientId) this.setActiveId(parsed.activePatientId);
      })();
      // Keep the original as a backup instead of deleting patient data.
      fs.renameSync(file, `${file}.migrated`);
      console.log(`[Patients] Migrated ${parsed.patients.length} patients from ${path.basename(file)} into SQLite.`);
      return true;
    } catch (err) {
      console.warn('[Patients] Could not migrate legacy JSON database, seeding demo data instead:', err);
      return false;
    }
  }

  private seed(): void {
    this.db.transaction(() => {
      for (const patient of buildSeedPatients()) this.save(patient);
      this.setActiveId('pt_1');
    })();
  }

  private ensureActivePatient(): void {
    if (!this.patients.has(this.activePatientId)) {
      const first = this.patients.values().next().value as PatientRecord | undefined;
      if (first) this.setActiveId(first.id);
    }
  }

  private setActiveId(id: string): void {
    this.activePatientId = id;
    this.db.prepare(`
      INSERT INTO app_state (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(ACTIVE_PATIENT_KEY, id);
  }

  private save(patient: PatientRecord): void {
    this.patients.set(patient.id, patient);
    this.db.prepare(`
      INSERT INTO patients (id, chart_id, name, phone, data, created_at, updated_at)
      VALUES (@id, @chartId, @name, @phone, @data, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        chart_id = excluded.chart_id, name = excluded.name, phone = excluded.phone,
        data = excluded.data, updated_at = excluded.updated_at
    `).run({
      id: patient.id,
      chartId: patient.chartId,
      name: patient.name,
      phone: patient.phone ?? null,
      data: JSON.stringify(patient),
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    });
  }

  private touch(patient: PatientRecord): void {
    patient.updatedAt = nowIso();
    this.save(patient);
  }

  private nextChartId(): string {
    let chartId: string;
    do {
      chartId = nextDocumentNumber(this.db, 'PT');
    } while ([...this.patients.values()].some(p => p.chartId === chartId));
    return chartId;
  }

  // --- Patients ------------------------------------------------------------

  public getAllPatients(): PatientRecord[] {
    return [...this.patients.values()];
  }

  public getActivePatient(): PatientRecord {
    this.ensureActivePatient();
    return this.patients.get(this.activePatientId)!;
  }

  public getPatientById(id: string): PatientRecord | undefined {
    return this.patients.get(id) ?? this.getAllPatients().find(p => p.chartId.toLowerCase() === id.toLowerCase());
  }

  /** Throws a 'not found' error; use in routes that take an explicit patient id. */
  public getPatientOrThrow(id: string): PatientRecord {
    const patient = this.getPatientById(id);
    if (!patient) throw new Error(`Patient '${id}' not found`);
    return patient;
  }

  public getPatientByNameOrQuery(query: string): PatientRecord | undefined {
    const q = query.toLowerCase().trim();
    return this.getAllPatients().find(p =>
      p.name.toLowerCase().includes(q) ||
      p.chartId.toLowerCase().includes(q) ||
      p.id.toLowerCase() === q
    );
  }

  public setActivePatient(id: string): PatientRecord {
    const patient = this.getPatientById(id);
    if (!patient) throw new Error(`Patient with ID or Chart '${id}' not found`);
    this.setActiveId(patient.id);
    return patient;
  }

  public createPatient(data: Partial<PatientRecord>): PatientRecord {
    const now = nowIso();
    const newPatient: PatientRecord = withClinicalDefaults({
      id: newId('pt'),
      chartId: data.chartId || this.nextChartId(),
      name: data.name || 'Nouveau patient',
      phone: data.phone,
      cnamId: data.cnamId,
      cnamQuality: data.cnamQuality,
      age: Number(data.age) || 35,
      gender: data.gender || 'Other',
      weightKg: Number(data.weightKg) || 70,
      asaStatus: data.asaStatus || 'ASA I',
      cardiacRisk: !!data.cardiacRisk,
      medicalAlerts: data.medicalAlerts || 'Aucune',
      allergies: data.allergies || 'Aucune allergie connue',
      chiefComplaint: data.chiefComplaint || 'Consultation',
      deliveredCarpules: 0,
      selectedDrugId: data.selectedDrugId || 'lido_100k',
      isPregnantOrNursing: !!data.isPregnantOrNursing,
      prophylaxisRequired: !!data.prophylaxisRequired,
      prophylaxisReason: data.prophylaxisReason,
      teeth: createPatientTeeth(),
      anesthesiaLog: [],
      soapNotes: [],
      consultHistory: [],
      createdAt: now,
      updatedAt: now
    });
    this.db.transaction(() => {
      this.save(newPatient);
      this.setActiveId(newPatient.id);
    })();
    return newPatient;
  }

  public updatePatient(id: string, updates: Partial<PatientRecord>): PatientRecord {
    const current = this.patients.get(id);
    if (!current) throw new Error(`Patient '${id}' not found`);
    const { id: _ignoredId, createdAt: _ignoredCreated, ...allowed } = updates;
    const updated: PatientRecord = { ...current, ...allowed, id: current.id, createdAt: current.createdAt, updatedAt: nowIso() };
    // An age correction (e.g. 35 -> 7) re-derives the primary teeth while nothing was recorded on them.
    if (updated.age !== current.age && !allowed.primaryTeeth && isUntouchedPrimaryChart(current.primaryTeeth, current.age)) {
      updated.primaryTeeth = createPrimaryTeeth(updated.age);
    }
    this.save(updated);
    return updated;
  }

  public deletePatient(id: string): boolean {
    if (!this.patients.has(id)) return false;
    if (this.patients.size <= 1) {
      throw new Error('Cannot delete the only remaining patient record in the database.');
    }
    try {
      this.db.prepare('DELETE FROM patients WHERE id = ?').run(id);
    } catch (err: any) {
      if (String(err?.code).startsWith('SQLITE_CONSTRAINT')) {
        throw new Error('Ce patient a des devis, paiements ou ordonnances enregistrés : son dossier ne peut pas être supprimé.');
      }
      throw err;
    }
    this.patients.delete(id);
    if (this.activePatientId === id) this.ensureActivePatient();
    return true;
  }

  // --- Odontogram ------------------------------------------------------------

  public updateToothForActivePatient(toothId: number, updates: Partial<ToothInfo>): ToothInfo {
    const patient = this.getActivePatient();
    const tooth = findPatientTooth(patient, Number(toothId));
    if (!tooth) throw new Error(`Tooth #${toothId} not found for patient ${patient.name}`);
    if (updates.status !== undefined) tooth.status = updates.status;
    if (updates.notes !== undefined) tooth.notes = updates.notes;
    if (updates.surfaces !== undefined) tooth.surfaces = updates.surfaces;
    this.touch(patient);
    return tooth;
  }

  public resetOdontogramForActivePatient(): ToothInfo[] {
    const patient = this.getActivePatient();
    patient.teeth = createPatientTeeth();
    patient.primaryTeeth = createPrimaryTeeth(patient.age);
    this.touch(patient);
    return patient.teeth;
  }

  public setPrimaryTeethModeForActivePatient(mode: PrimaryTeethMode): PatientRecord {
    const patient = this.getActivePatient();
    patient.primaryTeethMode = mode;
    this.touch(patient);
    return patient;
  }

  // --- Advisor conversation (kept per patient, survives reloads) ----------------

  public getConsultHistory(patientId: string): PatientRecord['consultHistory'] {
    return this.getPatientById(patientId)?.consultHistory ?? [];
  }

  /** Appends messages to a patient's advisor conversation; the oldest are dropped past the cap. */
  public appendConsultMessages(patientId: string, messages: Array<{ role: 'user' | 'model'; content: string }>): void {
    const patient = this.getPatientById(patientId);
    if (!patient) throw new Error(`Patient '${patientId}' not found`);
    const now = nowIso();
    const history = [...(patient.consultHistory ?? []), ...messages
      .filter(m => m.content && m.content.trim())
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CONSULT_MESSAGE_CHARS), timestamp: now }))];
    patient.consultHistory = history.slice(-MAX_CONSULT_MESSAGES);
    this.touch(patient);
  }

  public clearConsultHistory(patientId: string): void {
    const patient = this.getPatientById(patientId);
    if (!patient) throw new Error(`Patient '${patientId}' not found`);
    patient.consultHistory = [];
    this.touch(patient);
  }

  // --- Anesthesia & SOAP ------------------------------------------------------

  public logAnesthesiaForActivePatient(logEntry: {
    drugId: string;
    drugName: string;
    carpules: number;
    mg: number;
    epiMg: number;
    site: string;
    notes?: string;
  }) {
    const patient = this.getActivePatient();
    const entry = { id: newId('anes'), timestamp: nowIso(), ...logEntry };
    patient.anesthesiaLog.push(entry);
    patient.deliveredCarpules = Math.round((patient.deliveredCarpules + logEntry.carpules) * 10) / 10;
    patient.selectedDrugId = logEntry.drugId;
    this.touch(patient);
    return { patient, entry };
  }

  public addSoapNoteForActivePatient(note: {
    procedure: string;
    toothId?: number | string;
    anesthesiaUsed: string;
    materialsUsed?: string;
    content: string;
    cdtCodes: string[];
    author?: string;
  }) {
    const patient = this.getActivePatient();
    const newNote = {
      id: newId('soap'),
      timestamp: nowIso(),
      procedure: note.procedure,
      toothId: note.toothId,
      anesthesiaUsed: note.anesthesiaUsed,
      materialsUsed: note.materialsUsed,
      content: note.content,
      cdtCodes: note.cdtCodes || [],
      author: note.author || 'Attending Doctor',
      // Signed SOAP notes are a medicolegal record: corrections go in as addenda.
      locked: true,
      addenda: [] as SoapAddendum[]
    };
    patient.soapNotes.unshift(newNote);
    this.touch(patient);
    return newNote;
  }

  public addSoapAddendum(noteId: string, addendum: { content: string; author?: string }): SoapAddendum {
    const patient = this.getActivePatient();
    const note = patient.soapNotes.find(n => n.id === noteId);
    if (!note) throw new Error(`SOAP note '${noteId}' not found`);
    const entry: SoapAddendum = {
      id: newId('addend'),
      content: addendum.content,
      author: addendum.author || 'Attending Doctor',
      timestamp: nowIso()
    };
    if (!note.addenda) note.addenda = [];
    note.addenda.push(entry);
    this.touch(patient);
    return entry;
  }

  // --- Medications ---------------------------------------------------------

  public getMedicationsForActivePatient(): Medication[] {
    return this.getActivePatient().medications;
  }

  public addMedicationForActivePatient(data: { name: string; dosage: string; frequency: string; prescribedFor?: string }): Medication {
    const patient = this.getActivePatient();
    const med: Medication = {
      id: newId('med'),
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      prescribedFor: data.prescribedFor,
      active: true,
      addedAt: nowIso()
    };
    patient.medications.push(med);
    this.touch(patient);
    return med;
  }

  public updateMedicationForActivePatient(medId: string, updates: Partial<Medication>): Medication {
    const patient = this.getActivePatient();
    const med = patient.medications.find(m => m.id === medId);
    if (!med) throw new Error(`Medication '${medId}' not found`);
    Object.assign(med, updates, { id: med.id });
    this.touch(patient);
    return med;
  }

  public deleteMedicationForActivePatient(medId: string): boolean {
    const patient = this.getActivePatient();
    const before = patient.medications.length;
    patient.medications = patient.medications.filter(m => m.id !== medId);
    this.touch(patient);
    return patient.medications.length < before;
  }

  // --- Periodontal charting --------------------------------------------------

  public getPerioChartsForActivePatient(): PerioChartSnapshot[] {
    return this.getActivePatient().perioCharts;
  }

  public getLatestPerioChartForActivePatient(): PerioChartSnapshot | null {
    const charts = this.getActivePatient().perioCharts;
    return charts.length > 0 ? charts[charts.length - 1] : null;
  }

  public savePerioChartForActivePatient(teeth: PerioChartSnapshot['teeth'], notes?: string): PerioChartSnapshot {
    const patient = this.getActivePatient();
    const snapshot: PerioChartSnapshot = { id: newId('perio'), date: nowIso(), teeth, notes };
    patient.perioCharts.push(snapshot);
    this.touch(patient);
    return snapshot;
  }

  // --- Treatment plan --------------------------------------------------------

  public getTreatmentPlanForActivePatient(): TreatmentPlanItem[] {
    return this.getActivePatient().treatmentPlan;
  }

  public addTreatmentPlanItemForActivePatient(data: {
    toothId?: number;
    procedure: string;
    cdtCode?: string;
    priority: TreatmentPlanItem['priority'];
    estimatedCost?: number;
    notes?: string;
  }): TreatmentPlanItem {
    const patient = this.getActivePatient();
    const now = nowIso();
    const item: TreatmentPlanItem = {
      id: newId('tx'),
      toothId: data.toothId,
      procedure: data.procedure,
      cdtCode: data.cdtCode,
      priority: data.priority || 'routine',
      estimatedCost: data.estimatedCost,
      status: 'proposed',
      notes: data.notes,
      createdAt: now,
      updatedAt: now
    };
    patient.treatmentPlan.push(item);
    this.touch(patient);
    return item;
  }

  public updateTreatmentPlanItemForActivePatient(itemId: string, updates: Partial<TreatmentPlanItem>): TreatmentPlanItem {
    const patient = this.getActivePatient();
    const item = patient.treatmentPlan.find(t => t.id === itemId);
    if (!item) throw new Error(`Treatment plan item '${itemId}' not found`);
    Object.assign(item, updates, { id: item.id, updatedAt: nowIso() });
    this.touch(patient);
    return item;
  }

  public deleteTreatmentPlanItemForActivePatient(itemId: string): boolean {
    const patient = this.getActivePatient();
    const before = patient.treatmentPlan.length;
    patient.treatmentPlan = patient.treatmentPlan.filter(t => t.id !== itemId);
    this.touch(patient);
    return patient.treatmentPlan.length < before;
  }

  // --- Consents ----------------------------------------------------------

  public getConsentsForActivePatient(): ConsentRecord[] {
    return this.getActivePatient().consents;
  }

  public addConsentForActivePatient(data: { procedure: string; consentText: string; signatureDataUrl?: string }): ConsentRecord {
    const patient = this.getActivePatient();
    const record: ConsentRecord = {
      id: newId('consent'),
      procedure: data.procedure,
      consentText: data.consentText,
      signatureDataUrl: data.signatureDataUrl,
      signedAt: nowIso()
    };
    patient.consents.push(record);
    this.touch(patient);
    return record;
  }

  // --- Clinical images -----------------------------------------------------

  public getImagesForActivePatient(): ClinicalImageRecord[] {
    return this.getActivePatient().images;
  }

  public addImageRecordForActivePatient(data: {
    id: string;
    filename: string;
    mimeType: string;
    toothId?: number;
    query?: string;
    analysis?: string;
    modelUsed?: string;
  }): ClinicalImageRecord {
    const patient = this.getActivePatient();
    const record: ClinicalImageRecord = { ...data, uploadedAt: nowIso() };
    patient.images.push(record);
    this.touch(patient);
    return record;
  }

  public findImageRecord(imageId: string): { patient: PatientRecord; image: ClinicalImageRecord } | null {
    for (const patient of this.patients.values()) {
      const image = patient.images.find(i => i.id === imageId);
      if (image) return { patient, image };
    }
    return null;
  }

  // --- Lab cases (dental technician workflow) -------------------------------

  public getLabCasesForActivePatient(): LabCase[] {
    return this.getActivePatient().labCases;
  }

  public addLabCaseForActivePatient(data: {
    toothId?: number;
    caseType: string;
    material?: string;
    shade?: string;
    marginDesign?: string;
    occlusalNotes?: string;
    labName?: string;
    dueDate?: string;
    notes?: string;
  }): LabCase {
    const patient = this.getActivePatient();
    const now = nowIso();
    const labCase: LabCase = { id: newId('lab'), ...data, status: 'planned', createdAt: now, updatedAt: now };
    patient.labCases.push(labCase);
    this.touch(patient);
    return labCase;
  }

  public updateLabCaseForActivePatient(caseId: string, updates: Partial<LabCase>): LabCase {
    const patient = this.getActivePatient();
    const labCase = patient.labCases.find(c => c.id === caseId);
    if (!labCase) throw new Error(`Lab case '${caseId}' not found`);
    Object.assign(labCase, updates, { id: labCase.id, updatedAt: nowIso() });
    this.touch(patient);
    return labCase;
  }

  public deleteLabCaseForActivePatient(caseId: string): boolean {
    const patient = this.getActivePatient();
    const before = patient.labCases.length;
    patient.labCases = patient.labCases.filter(c => c.id !== caseId);
    this.touch(patient);
    return patient.labCases.length < before;
  }

  // --- Recall / recurring maintenance ---------------------------------------

  public getRecallForActivePatient(): RecallInfo {
    return this.getActivePatient().recall;
  }

  public setRecallForActivePatient(updates: Partial<RecallInfo>): RecallInfo {
    const patient = this.getActivePatient();
    patient.recall = { ...patient.recall, ...updates };
    this.touch(patient);
    return patient.recall;
  }

  // --- Export / import ------------------------------------------------------

  public getDatabaseRaw(): DentalDatabase {
    return { activePatientId: this.activePatientId, patients: this.getAllPatients() };
  }

  /**
   * Upserts every patient in a JSON export. Patients missing from the file are
   * kept, not deleted: they may own quotes, payments or prescriptions.
   */
  public importDatabase(raw: DentalDatabase): void {
    if (!raw.patients || !Array.isArray(raw.patients) || raw.patients.length === 0) {
      throw new Error('Invalid database format. Must contain a patients array.');
    }
    this.db.transaction(() => {
      for (const p of raw.patients) this.save(withClinicalDefaults(p as PatientSeed));
      if (raw.activePatientId && this.patients.has(raw.activePatientId)) this.setActiveId(raw.activePatientId);
    })();
    this.ensureActivePatient();
  }
}

let instance: PatientRepository | null = null;

export function getPatientRepository(): PatientRepository {
  if (!instance) instance = new PatientRepository(getDb());
  return instance;
}

// Created on first use rather than at import time, so modules (and tests) can
// import this file without opening data/molaris.db as a side effect.
export const patientDb: PatientRepository = new Proxy({} as PatientRepository, {
  get(_target, prop) {
    const repo = getPatientRepository();
    const value = (repo as any)[prop];
    return typeof value === 'function' ? value.bind(repo) : value;
  }
});
