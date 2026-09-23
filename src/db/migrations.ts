/**
 * Ordered schema migrations. The array index + 1 is the schema version stored in
 * PRAGMA user_version. Rules:
 *  - Never edit or reorder a migration that has shipped; append a new one instead.
 *  - Money is always INTEGER millimes (1 DT = 1000 millimes), never REAL.
 *  - Timestamps are ISO-8601 TEXT. Appointment times are clinic-local
 *    'YYYY-MM-DDTHH:MM' (Tunisia, UTC+1, no DST) so they sort and compare as text.
 */
export const MIGRATIONS: Array<{ name: string; sql: string }> = [
  {
    name: 'core: patients, settings, document counters',
    sql: `
      CREATE TABLE app_state (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- Clinical detail (odontogram, perio charts, SOAP notes, ...) lives in the
      -- JSON 'data' column as one document per patient. Columns that other
      -- tables join or search on are duplicated alongside and kept in sync by
      -- the patients repository.
      CREATE TABLE patients (
        id         TEXT PRIMARY KEY,
        chart_id   TEXT NOT NULL UNIQUE,
        name       TEXT NOT NULL,
        phone      TEXT,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_patients_name ON patients(name);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      -- Sequential, gap-free numbering per document kind and year (DV-2026-0001).
      CREATE TABLE document_counters (
        kind TEXT    NOT NULL,
        year INTEGER NOT NULL,
        last INTEGER NOT NULL,
        PRIMARY KEY (kind, year)
      );
    `
  },
  {
    name: 'agenda: appointments',
    sql: `
      CREATE TABLE appointments (
        id               TEXT PRIMARY KEY,
        patient_id       TEXT REFERENCES patients(id) ON DELETE CASCADE,
        patient_label    TEXT,  -- walk-ins / new callers without a chart yet
        patient_phone    TEXT,
        start_at         TEXT NOT NULL,
        end_at           TEXT NOT NULL,
        chair            TEXT,
        reason           TEXT,
        status           TEXT NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled','confirmed','arrived','in_progress','completed','cancelled','no_show')),
        notes            TEXT,
        reminder_sent_at TEXT,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL,
        CHECK (patient_id IS NOT NULL OR patient_label IS NOT NULL),
        CHECK (end_at > start_at)
      );
      CREATE INDEX idx_appointments_start   ON appointments(start_at);
      CREATE INDEX idx_appointments_patient ON appointments(patient_id);
    `
  },
  {
    name: 'billing: procedure catalog, quotes, payments',
    sql: `
      CREATE TABLE procedures (
        id                     TEXT PRIMARY KEY,
        code                   TEXT,  -- CNAM nomenclature code or internal code
        label_fr               TEXT NOT NULL,
        label_ar               TEXT,
        category               TEXT,
        default_price_millimes INTEGER NOT NULL DEFAULT 0 CHECK (default_price_millimes >= 0),
        cnam_key_letter        TEXT,
        cnam_coefficient       REAL,
        active                 INTEGER NOT NULL DEFAULT 1,
        created_at             TEXT NOT NULL,
        updated_at             TEXT NOT NULL
      );

      -- Financial records are never cascade-deleted: a patient with quotes or
      -- payments cannot be deleted (ON DELETE RESTRICT).
      CREATE TABLE quotes (
        id          TEXT PRIMARY KEY,
        number      TEXT NOT NULL UNIQUE,
        patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
        status      TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','accepted','refused','expired')),
        issued_at   TEXT NOT NULL,
        valid_until TEXT,
        notes       TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
      CREATE INDEX idx_quotes_patient ON quotes(patient_id);

      CREATE TABLE quote_items (
        id                  TEXT PRIMARY KEY,
        quote_id            TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        procedure_id        TEXT REFERENCES procedures(id) ON DELETE SET NULL,
        label               TEXT NOT NULL,
        tooth_fdi           INTEGER,
        quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        unit_price_millimes INTEGER NOT NULL CHECK (unit_price_millimes >= 0),
        discount_millimes   INTEGER NOT NULL DEFAULT 0 CHECK (discount_millimes >= 0),
        position            INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

      -- Installments are simply several payments against the same quote.
      CREATE TABLE payments (
        id              TEXT PRIMARY KEY,
        receipt_number  TEXT NOT NULL UNIQUE,
        patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
        quote_id        TEXT REFERENCES quotes(id) ON DELETE SET NULL,
        amount_millimes INTEGER NOT NULL CHECK (amount_millimes > 0),
        method          TEXT NOT NULL CHECK (method IN ('cash','cheque','card','transfer','other')),
        reference       TEXT,  -- cheque number, transfer reference
        paid_at         TEXT NOT NULL,
        notes           TEXT,
        created_at      TEXT NOT NULL
      );
      CREATE INDEX idx_payments_patient ON payments(patient_id);
      CREATE INDEX idx_payments_quote   ON payments(quote_id);
    `
  },
  {
    name: 'prescriptions: drug catalog, prescriptions',
    sql: `
      CREATE TABLE drugs (
        id               TEXT PRIMARY KEY,
        dci              TEXT NOT NULL,  -- INN / DCI name
        brand            TEXT,
        form             TEXT,
        strength         TEXT,
        default_dosage   TEXT,
        default_duration TEXT,
        category         TEXT,
        active           INTEGER NOT NULL DEFAULT 1,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL
      );

      -- A prescription is a medicolegal document: immutable once issued.
      CREATE TABLE prescriptions (
        id         TEXT PRIMARY KEY,
        number     TEXT NOT NULL UNIQUE,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
        issued_at  TEXT NOT NULL,
        language   TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','ar','fr_ar')),
        notes      TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);

      CREATE TABLE prescription_items (
        id              TEXT PRIMARY KEY,
        prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        drug_id         TEXT REFERENCES drugs(id) ON DELETE SET NULL,
        drug_label      TEXT NOT NULL,
        dosage          TEXT NOT NULL,
        duration        TEXT,
        quantity        TEXT,
        instructions_ar TEXT,
        position        INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_prescription_items_rx ON prescription_items(prescription_id);
    `
  },
  {
    name: 'prescriptions: safety override, patient snapshot, renewals, immutability',
    sql: `
      -- Arabic patient instructions proposed when the drug is added to a prescription.
      ALTER TABLE drugs ADD COLUMN default_instructions_ar TEXT;

      -- Patient identity as printed on the ordonnance (a reprint must match the original).
      ALTER TABLE prescriptions ADD COLUMN patient_name TEXT;
      ALTER TABLE prescriptions ADD COLUMN patient_age  INTEGER;
      -- "Renouveler": the prescription this one was copied from.
      ALTER TABLE prescriptions ADD COLUMN renewed_from_id TEXT REFERENCES prescriptions(id);
      -- 1 = issued despite at least one critical safety alert, explicitly confirmed by the dentist.
      ALTER TABLE prescriptions ADD COLUMN critical_alerts_overridden INTEGER NOT NULL DEFAULT 0;
      -- JSON array of every safety alert shown when the prescription was issued.
      ALTER TABLE prescriptions ADD COLUMN safety_alerts TEXT;

      -- Snapshot of the drug as printed (the catalog entry may change later).
      ALTER TABLE prescription_items ADD COLUMN brand    TEXT;
      ALTER TABLE prescription_items ADD COLUMN form     TEXT;
      ALTER TABLE prescription_items ADD COLUMN strength TEXT;

      -- Medicolegal documents are immutable once issued: corrections are new prescriptions.
      CREATE TRIGGER prescriptions_no_update BEFORE UPDATE ON prescriptions
      BEGIN SELECT RAISE(ABORT, 'prescriptions are immutable'); END;
      CREATE TRIGGER prescriptions_no_delete BEFORE DELETE ON prescriptions
      BEGIN SELECT RAISE(ABORT, 'prescriptions are immutable'); END;
      CREATE TRIGGER prescription_items_no_update BEFORE UPDATE ON prescription_items
      BEGIN SELECT RAISE(ABORT, 'prescriptions are immutable'); END;
      CREATE TRIGGER prescription_items_no_delete BEFORE DELETE ON prescription_items
      BEGIN SELECT RAISE(ABORT, 'prescriptions are immutable'); END;
    `
  },
  {
    name: 'billing: payment cancellation, immutable payments',
    sql: `
      -- A mistaken payment is cancelled with a reason, never deleted or edited.
      ALTER TABLE payments ADD COLUMN cancelled_at  TEXT;
      ALTER TABLE payments ADD COLUMN cancel_reason TEXT;
      CREATE INDEX idx_payments_paid_at ON payments(paid_at);

      CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments
      BEGIN
        SELECT RAISE(ABORT, 'payments are never deleted: cancel them with a reason');
      END;

      CREATE TRIGGER payments_immutable
      BEFORE UPDATE OF receipt_number, patient_id, quote_id, amount_millimes, method, reference, paid_at, created_at ON payments
      BEGIN
        SELECT RAISE(ABORT, 'payments are immutable: cancel and record a new one');
      END;

      CREATE TRIGGER payments_cancel_once
      BEFORE UPDATE OF cancelled_at, cancel_reason ON payments
      WHEN OLD.cancelled_at IS NOT NULL
        OR NEW.cancelled_at IS NULL
        OR trim(coalesce(NEW.cancel_reason, '')) = ''
      BEGIN
        SELECT RAISE(ABORT, 'a payment is cancelled once, with a reason, and cannot be restored');
      END;
    `
  }
];
