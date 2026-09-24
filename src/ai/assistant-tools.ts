import type { DB } from '../db/connection.js';
import type { PatientRecord } from '../repositories/patients.js';
import { DEFAULT_TEETH, type ToothInfo } from '../domain/dental-data.js';
import { isPrimaryToothId } from '../domain/primary-teeth.js';
import { formatTnd } from '../domain/money.js';
import {
  addDays, isValidFdiTooth, localDate, PAYMENT_METHODS, PaymentRepository, ProcedureRepository, QuoteRepository,
  type PaymentMethod
} from '../features/billing/repository.js';
import { AppointmentRepository, getAgendaSettings, addMinutes, isValidLocalDateTime } from '../features/agenda/repository.js';

/*
 * Practice-data tools for the AI assistant (Gemini function calling).
 *
 * Privacy: the model never sees a patient's name. Names found in the doctor's message
 * are replaced by codes (P1, P2…; ACTIVE = the open chart) before the prompt leaves the
 * PC, tools take those codes, and every tool result is formatted HERE for the doctor —
 * results are not sent back to the model (no data leaves, no invented figures).
 *
 * Safety: read tools answer at once. Write tools only build a *proposal*: the doctor
 * confirms it in the chat, and the browser then calls the normal API endpoint, with the
 * same validation as the screens.
 */

export type Lang = 'fr' | 'en';
export const ACTIVE_REF = 'ACTIVE';

// ---------------------------------------------------------------------------
// Patient codes
// ---------------------------------------------------------------------------

const ACCENTS: Record<string, string> = { a: '[aàâä]', e: '[eéèêë]', i: '[iîï]', o: '[oôö]', u: '[uùûü]', c: '[cç]' };
const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Accent- and case-insensitive whole-word pattern for a name ("Hédi" also matches "hedi"). */
function namePattern(name: string): RegExp {
  const body = plain(name).trim().split(/\s+/).map(word =>
    [...word].map(ch => ACCENTS[ch] ?? escapeRegex(ch)).join('')
  ).join('\\s+');
  return new RegExp(`(?<![\\p{L}])${body}(?![\\p{L}])`, 'giu');
}

export interface PatientRefs {
  /** The message with every recognised patient name replaced by its code. */
  text: string;
  /** code -> patient id (always contains ACTIVE). */
  refs: Record<string, string>;
}

/**
 * Replaces patient names in the message by codes. Full names always match; a first or
 * last name alone matches only when exactly one patient has it ("Fatma" -> P1).
 */
export function tokenizePatients(message: string, patients: PatientRecord[], activeId: string): PatientRefs {
  const refs: Record<string, string> = { [ACTIVE_REF]: activeId };
  let text = message;
  let next = 1;
  const codeFor = (id: string) => {
    const existing = Object.entries(refs).find(([code, pid]) => pid === id && code !== ACTIVE_REF);
    if (existing) return existing[0];
    const code = `P${next++}`;
    refs[code] = id;
    return code;
  };

  const byLength = [...patients].sort((a, b) => b.name.length - a.name.length);
  for (const p of byLength) {
    text = text.replace(namePattern(p.name), () => codeFor(p.id));
  }
  // Single first or last names, when unambiguous.
  const partCounts = new Map<string, number>();
  for (const p of patients) for (const part of new Set(plain(p.name).split(/\s+/))) partCounts.set(part, (partCounts.get(part) ?? 0) + 1);
  for (const p of patients) {
    for (const part of p.name.split(/\s+/)) {
      if (part.length < 3 || partCounts.get(plain(part)) !== 1) continue;
      text = text.replace(namePattern(part), () => codeFor(p.id));
    }
  }
  return { text, refs };
}

/** Puts the names back into model text ("P1 doit…" -> "Fatma Trabelsi doit…"). */
export function detokenize(text: string, refs: Record<string, string>, patients: PatientRecord[]): string {
  return text.replace(/\b(P\d+|ACTIVE)\b/g, code => {
    const id = refs[code];
    return patients.find(p => p.id === id)?.name ?? code;
  });
}

// ---------------------------------------------------------------------------
// Tool declarations (JSON schema for Gemini)
// ---------------------------------------------------------------------------

const patientParam = {
  type: 'string',
  description: 'Patient code: "ACTIVE" for the chart currently open, or a code such as P1 given in the message. Never a name.'
};
const TOOTH_STATUSES = ['sound', 'caries', 'restoration', 'crown', 'rct', 'missing', 'implant', 'unerupted'] as const;

export const ASSISTANT_TOOLS = [
  {
    name: 'get_patient_summary',
    description: "Read a patient's file: age, weight, ASA, allergies, medical history, current medications, next appointment and amount still owed.",
    parametersJsonSchema: { type: 'object', properties: { patient: patientParam }, required: ['patient'] }
  },
  {
    name: 'get_balance',
    description: "Read a patient's billing: accepted quotes (devis), payments received and amount still owed.",
    parametersJsonSchema: { type: 'object', properties: { patient: patientParam }, required: ['patient'] }
  },
  {
    name: 'get_daily_takings',
    description: "Read the clinic's takings (encaissements / recette) for one day, total and per payment method.",
    parametersJsonSchema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD; today when omitted' } } }
  },
  {
    name: 'list_appointments',
    description: 'Read the agenda for one day, optionally for one patient.',
    parametersJsonSchema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'YYYY-MM-DD' }, patient: patientParam },
      required: ['date']
    }
  },
  {
    name: 'create_quote',
    description: 'Propose a new draft quote (devis) for a patient. Prices come from the clinic catalog unless the doctor gave one.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        patient: patientParam,
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Procedure, in French (e.g. "Couronne céramo-métallique")' },
              tooth: { type: 'integer', description: 'FDI tooth number (11-48, 51-85), if any' },
              quantity: { type: 'integer' },
              unitPriceDinars: { type: 'number', description: 'Only if the doctor stated a price' }
            },
            required: ['label']
          }
        }
      },
      required: ['patient', 'items']
    }
  },
  {
    name: 'record_payment',
    description: 'Propose recording a payment (règlement) received from a patient.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        patient: patientParam,
        amountDinars: { type: 'number' },
        method: { type: 'string', enum: [...PAYMENT_METHODS], description: 'cash = espèces, cheque = chèque, card = carte, transfer = virement' },
        quoteNumber: { type: 'string', description: 'Quote number such as DV-2026-0001, if the doctor named one' },
        reference: { type: 'string', description: 'Cheque number (required for a cheque) or transfer reference, if given' }
      },
      required: ['patient', 'amountDinars', 'method']
    }
  },
  {
    name: 'create_appointment',
    description: 'Propose booking an appointment in the agenda.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        patient: patientParam,
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:MM, 24 h' },
        durationMinutes: { type: 'integer' },
        reason: { type: 'string', description: 'Short reason in French (Contrôle, Détartrage, Soins…)' }
      },
      required: ['patient', 'date', 'time']
    }
  },
  {
    name: 'update_tooth',
    description: "Propose recording a tooth's condition on the open chart's odontogram.",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        tooth: { type: 'integer', description: 'FDI number (11-48, or 51-85 for primary teeth)' },
        status: { type: 'string', enum: [...TOOTH_STATUSES] },
        notes: { type: 'string' }
      },
      required: ['tooth', 'status']
    }
  },
  {
    name: 'add_medication',
    description: "Propose adding a medication the open chart's patient takes (feeds the drug-safety checks).",
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'DCI (+ brand), e.g. "Acénocoumarol (Sintrom)"' },
        dosage: { type: 'string' },
        frequency: { type: 'string' },
        prescribedFor: { type: 'string', description: 'Only if the doctor said what it is for; never guess' }
      },
      required: ['name']
    }
  },
  {
    name: 'switch_patient',
    description: 'Propose opening another patient\'s chart.',
    parametersJsonSchema: { type: 'object', properties: { patient: patientParam }, required: ['patient'] }
  }
];

export const WRITE_TOOLS = new Set(['create_quote', 'record_payment', 'create_appointment', 'update_tooth', 'add_medication', 'switch_patient']);

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/** What the browser does when the doctor confirms (a normal API call). */
export interface Proposal {
  tool: string;
  /** The patient the action is for; the browser refuses it if another chart is open by then. */
  patientId: string;
  summary: string;
  request: { method: 'POST'; url: string; body: Record<string, unknown> };
}

export type ToolOutcome = { reply: string; proposal?: Proposal };

export interface ToolContext {
  db: DB;
  patients: PatientRecord[];
  activeId: string;
  refs: Record<string, string>;
  lang: Lang;
  now?: Date;
}

const METHOD_LABELS: Record<Lang, Record<PaymentMethod, string>> = {
  fr: { cash: 'espèces', cheque: 'chèque', card: 'carte', transfer: 'virement', other: 'autre' },
  en: { cash: 'cash', cheque: 'cheque', card: 'card', transfer: 'transfer', other: 'other' }
};
const STATUS_LABELS: Record<Lang, Record<string, string>> = {
  fr: { sound: 'saine', caries: 'carie', restoration: 'obturation', crown: 'couronne', rct: 'traitement endodontique', missing: 'absente', implant: 'implant', unerupted: 'non érupté' },
  en: { sound: 'sound', caries: 'caries', restoration: 'restoration', crown: 'crown', rct: 'root canal', missing: 'missing', implant: 'implant', unerupted: 'unerupted' }
};
const APPOINTMENT_STATUS: Record<Lang, Record<string, string>> = {
  fr: { scheduled: 'planifié', confirmed: 'confirmé', arrived: 'arrivé', in_progress: 'en cours', completed: 'terminé', cancelled: 'annulé', no_show: 'absent' },
  en: { scheduled: 'scheduled', confirmed: 'confirmed', arrived: 'arrived', in_progress: 'in progress', completed: 'completed', cancelled: 'cancelled', no_show: 'no-show' }
};

const frDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

class ToolError extends Error {}

function resolvePatient(ctx: ToolContext, ref: unknown): PatientRecord {
  const code = str(ref).toUpperCase() || ACTIVE_REF;
  const id = ctx.refs[code];
  const patient = id ? ctx.patients.find(p => p.id === id) : undefined;
  if (!patient) {
    throw new ToolError(ctx.lang === 'fr'
      ? 'Je n’ai pas reconnu le patient. Écrivez son nom et prénom tels qu’ils figurent dans le dossier.'
      : 'I did not recognise the patient. Write their full name as it appears in the chart.');
  }
  return patient;
}

/** FDI number -> internal tooth id (Universal 1-32, or the FDI number for primary teeth). */
function toothIdFromFdi(fdi: number): number | null {
  if (isPrimaryToothId(fdi)) return fdi;
  return DEFAULT_TEETH.find((t: ToothInfo) => t.fdi === fdi)?.id ?? null;
}

/** "Aspirine 100 mg" + dosage "100 mg" + "1 fois/jour" -> "Aspirine 100 mg 1 fois/jour" (no repeated dose). */
function medicationLabel(m: { name: string; dosage?: string; frequency?: string }): string {
  const name = m.name.trim();
  const dosage = m.dosage && !plain(name).includes(plain(m.dosage)) ? m.dosage : '';
  return [name, dosage, m.frequency].filter(Boolean).join(' ');
}

function patientSummary(ctx: ToolContext, patient: PatientRecord): string {
  const fr = ctx.lang === 'fr';
  const meds = patient.medications.filter(m => m.active).map(medicationLabel);
  const now = ctx.now ?? new Date();
  // Within a year (SQLite date() cannot go past year 9999, so no "open end" date).
  const nowLocal = `${localDate(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const upcoming = new AppointmentRepository(ctx.db).listBetween(localDate(now), addDays(localDate(now), 365))
    .find(a => a.patientId === patient.id && a.startAt >= nowLocal && !['cancelled', 'no_show', 'completed'].includes(a.status));
  const balance = new PaymentRepository(ctx.db).balance(patient.id);
  const lines = fr ? [
    `**${patient.name}** (${patient.chartId}) — ${patient.age} ans, ${patient.weightKg} kg, ${patient.asaStatus}${patient.cardiacRisk ? ', **risque cardiaque**' : ''}`,
    `- Allergies : ${patient.allergies || '—'}`,
    `- Antécédents : ${patient.medicalAlerts || '—'}`,
    `- Traitements en cours : ${meds.length ? meds.join(' ; ') : 'aucun enregistré'}`,
    `- Prochain rendez-vous : ${upcoming ? `${frDate(upcoming.startAt)} à ${upcoming.startAt.slice(11)}${upcoming.reason ? ` (${upcoming.reason})` : ''}` : 'aucun'}`,
    `- Reste à payer : ${formatTnd(balance.balanceDueMillimes)}`
  ] : [
    `**${patient.name}** (${patient.chartId}) — ${patient.age} y, ${patient.weightKg} kg, ${patient.asaStatus}${patient.cardiacRisk ? ', **cardiac risk**' : ''}`,
    `- Allergies: ${patient.allergies || '—'}`,
    `- Medical history: ${patient.medicalAlerts || '—'}`,
    `- Current medications: ${meds.length ? meds.join('; ') : 'none recorded'}`,
    `- Next appointment: ${upcoming ? `${frDate(upcoming.startAt)} at ${upcoming.startAt.slice(11)}${upcoming.reason ? ` (${upcoming.reason})` : ''}` : 'none'}`,
    `- Balance due: ${formatTnd(balance.balanceDueMillimes)}`
  ];
  return lines.join('\n');
}

function balanceReply(ctx: ToolContext, patient: PatientRecord): string {
  const fr = ctx.lang === 'fr';
  const b = new PaymentRepository(ctx.db).balance(patient.id);
  const quoteLines = b.quotes.map(q => fr
    ? `- ${q.number} du ${frDate(q.issuedAt)} : ${formatTnd(q.totalMillimes)}, réglé ${formatTnd(q.paidMillimes)}, **reste ${formatTnd(q.remainingMillimes)}**`
    : `- ${q.number} of ${frDate(q.issuedAt)}: ${formatTnd(q.totalMillimes)}, paid ${formatTnd(q.paidMillimes)}, **remaining ${formatTnd(q.remainingMillimes)}**`);
  const drafts = new QuoteRepository(ctx.db).listForPatient(patient.id).filter(q => q.status === 'draft' || q.status === 'sent');
  if (fr) {
    return [
      `**${patient.name}** — reste à payer : **${formatTnd(b.balanceDueMillimes)}**`,
      ...(quoteLines.length ? quoteLines : ['- Aucun devis accepté.']),
      b.paidOutsideQuotesMillimes ? `- Règlements hors devis : ${formatTnd(b.paidOutsideQuotesMillimes)}` : '',
      drafts.length ? `- Devis en attente d’acceptation : ${drafts.map(q => `${q.number} (${formatTnd(q.totalMillimes)})`).join(', ')}` : ''
    ].filter(Boolean).join('\n');
  }
  return [
    `**${patient.name}** — balance due: **${formatTnd(b.balanceDueMillimes)}**`,
    ...(quoteLines.length ? quoteLines : ['- No accepted quote.']),
    b.paidOutsideQuotesMillimes ? `- Payments outside quotes: ${formatTnd(b.paidOutsideQuotesMillimes)}` : '',
    drafts.length ? `- Quotes awaiting acceptance: ${drafts.map(q => `${q.number} (${formatTnd(q.totalMillimes)})`).join(', ')}` : ''
  ].filter(Boolean).join('\n');
}

function validDate(value: string, ctx: ToolContext): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isValidLocalDateTime(`${value}T00:00`)) {
    throw new ToolError(ctx.lang === 'fr' ? `Date non valide : « ${value} ».` : `Invalid date: "${value}".`);
  }
  return value;
}

function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const fr = ctx.lang === 'fr';
  const now = ctx.now ?? new Date();
  switch (name) {
    case 'get_patient_summary':
      return { reply: patientSummary(ctx, resolvePatient(ctx, args.patient)) };

    case 'get_balance':
      return { reply: balanceReply(ctx, resolvePatient(ctx, args.patient)) };

    case 'get_daily_takings': {
      const date = str(args.date) ? validDate(str(args.date), ctx) : localDate(now);
      const d = new PaymentRepository(ctx.db).daily(date);
      const methods = (Object.entries(d.byMethod) as Array<[PaymentMethod, number]>)
        .filter(([, v]) => v > 0).map(([m, v]) => `${METHOD_LABELS[ctx.lang][m]} ${formatTnd(v)}`);
      return {
        reply: fr
          ? `Encaissements du ${frDate(date)} : **${formatTnd(d.totalMillimes)}** (${d.count} règlement${d.count > 1 ? 's' : ''})${methods.length ? ` — ${methods.join(', ')}` : ''}.`
          : `Takings for ${frDate(date)}: **${formatTnd(d.totalMillimes)}** (${d.count} payment${d.count === 1 ? '' : 's'})${methods.length ? ` — ${methods.join(', ')}` : ''}.`
      };
    }

    case 'list_appointments': {
      const date = validDate(str(args.date) || localDate(now), ctx);
      const patient = args.patient ? resolvePatient(ctx, args.patient) : null;
      const list = new AppointmentRepository(ctx.db).listBetween(date, date)
        .filter(a => !patient || a.patientId === patient.id);
      const title = fr
        ? `Rendez-vous du ${frDate(date)}${patient ? ` pour ${patient.name}` : ''}`
        : `Appointments on ${frDate(date)}${patient ? ` for ${patient.name}` : ''}`;
      if (!list.length) return { reply: `${title} : ${fr ? 'aucun.' : 'none.'}` };
      const lines = list.map(a => `- ${a.startAt.slice(11)}–${a.endAt.slice(11)} **${a.patientName}**${a.chair ? ` (${a.chair})` : ''}${a.reason ? ` · ${a.reason}` : ''} · ${APPOINTMENT_STATUS[ctx.lang][a.status] ?? a.status}`);
      return { reply: `${title} :\n${lines.join('\n')}` };
    }

    case 'create_quote': {
      const patient = resolvePatient(ctx, args.patient);
      const rawItems = Array.isArray(args.items) ? args.items as Array<Record<string, unknown>> : [];
      if (!rawItems.length) throw new ToolError(fr ? 'Aucun acte à mettre sur le devis.' : 'No procedure to put on the quote.');
      const catalog = new ProcedureRepository(ctx.db).list();
      const missingPrice: string[] = [];
      const items = rawItems.slice(0, 30).map(item => {
        const label = str(item.label);
        const match = catalog.find(p => plain(p.labelFr) === plain(label))
          ?? catalog.filter(p => plain(label).includes(plain(p.labelFr)) || plain(p.labelFr).includes(plain(label)))
            .sort((a, b) => b.labelFr.length - a.labelFr.length)[0];
        const tooth = Number(item.tooth);
        const given = Number(item.unitPriceDinars);
        const unitPriceMillimes = Number.isFinite(given) && given > 0 ? Math.round(given * 1000) : (match?.defaultPriceMillimes ?? 0);
        if (!unitPriceMillimes) missingPrice.push(match?.labelFr ?? label);
        return {
          procedureId: match?.id ?? null,
          label: match?.labelFr ?? label,
          toothFdi: isValidFdiTooth(tooth) ? tooth : null,
          quantity: Math.min(99, Math.max(1, Math.round(Number(item.quantity) || 1))),
          unitPriceMillimes
        };
      }).filter(i => i.label);
      const total = items.reduce((s, i) => s + i.quantity * i.unitPriceMillimes, 0);
      const lines = items.map(i => `- ${i.label}${i.toothFdi ? ` (dent ${i.toothFdi})` : ''} × ${i.quantity} : ${formatTnd(i.quantity * i.unitPriceMillimes)}`);
      const summary = fr
        ? `Créer un **devis brouillon** pour **${patient.name}** :\n${lines.join('\n')}\nTotal : **${formatTnd(total)}**${missingPrice.length ? `\n⚠️ Prix à compléter dans Facturation : ${missingPrice.join(', ')}` : ''}`
        : `Create a **draft quote** for **${patient.name}**:\n${lines.join('\n')}\nTotal: **${formatTnd(total)}**${missingPrice.length ? `\n⚠️ Price to fill in under Billing: ${missingPrice.join(', ')}` : ''}`;
      return { reply: summary, proposal: { tool: name, patientId: patient.id, summary, request: { method: 'POST', url: '/api/quotes', body: { patientId: patient.id, items } } } };
    }

    case 'record_payment': {
      const patient = resolvePatient(ctx, args.patient);
      const amountMillimes = Math.round(Number(args.amountDinars) * 1000);
      if (!Number.isSafeInteger(amountMillimes) || amountMillimes <= 0) throw new ToolError(fr ? 'Montant non valide.' : 'Invalid amount.');
      const method = (PAYMENT_METHODS as readonly string[]).includes(str(args.method)) ? str(args.method) as PaymentMethod : 'cash';
      const reference = str(args.reference);
      if (method === 'cheque' && !reference) {
        throw new ToolError(fr ? 'Pour un chèque, précisez son numéro (ex. « chèque n° 4521087 »).' : 'For a cheque, give its number (e.g. "cheque no. 4521087").');
      }
      const open = new QuoteRepository(ctx.db).listForPatient(patient.id).filter(q => q.status === 'accepted' && q.remainingMillimes > 0);
      const named = str(args.quoteNumber).toUpperCase();
      const quote = named ? open.find(q => q.number.toUpperCase() === named) : (open.length === 1 ? open[0] : undefined);
      if (named && !quote) throw new ToolError(fr ? `Aucun devis accepté ${named} avec un reste à payer pour ${patient.name}.` : `No accepted quote ${named} with a balance for ${patient.name}.`);
      if (quote && amountMillimes > quote.remainingMillimes) {
        throw new ToolError(fr
          ? `Le montant dépasse le reste à payer sur ${quote.number} (${formatTnd(quote.remainingMillimes)}).`
          : `The amount exceeds what remains on ${quote.number} (${formatTnd(quote.remainingMillimes)}).`);
      }
      const summary = fr
        ? `Enregistrer un **règlement de ${formatTnd(amountMillimes)}** (${METHOD_LABELS.fr[method]}${reference ? ` n° ${reference}` : ''}) pour **${patient.name}**${quote ? ` sur le devis ${quote.number} (reste ensuite ${formatTnd(quote.remainingMillimes - amountMillimes)})` : ' (hors devis)'}. Un reçu sera numéroté.`
        : `Record a **payment of ${formatTnd(amountMillimes)}** (${METHOD_LABELS.en[method]}${reference ? ` no. ${reference}` : ''}) for **${patient.name}**${quote ? ` on quote ${quote.number} (then ${formatTnd(quote.remainingMillimes - amountMillimes)} left)` : ' (outside quotes)'}. A receipt number will be issued.`;
      return {
        reply: summary,
        proposal: { tool: name, patientId: patient.id, summary, request: { method: 'POST', url: '/api/payments', body: { patientId: patient.id, quoteId: quote?.id ?? null, amountMillimes, method, ...(reference ? { reference } : {}) } } }
      };
    }

    case 'create_appointment': {
      const patient = resolvePatient(ctx, args.patient);
      const date = validDate(str(args.date), ctx);
      const time = str(args.time).padStart(5, '0');
      const startAt = `${date}T${time}`;
      if (!isValidLocalDateTime(startAt)) throw new ToolError(fr ? `Heure non valide : « ${str(args.time)} ».` : `Invalid time: "${str(args.time)}".`);
      const duration = Math.min(480, Math.max(5, Math.round(Number(args.durationMinutes) || 30)));
      const endAt = addMinutes(startAt, duration);
      const agenda = new AppointmentRepository(ctx.db);
      const chairs = getAgendaSettings(ctx.db).chairs;
      const chair = chairs.length ? chairs.find(c => !agenda.findConflict(startAt, endAt, c)) : null;
      if (chairs.length && !chair) {
        throw new ToolError(fr ? `Aucun fauteuil libre le ${frDate(date)} de ${time} à ${endAt.slice(11)}.` : `No free chair on ${frDate(date)} from ${time} to ${endAt.slice(11)}.`);
      }
      const reason = str(args.reason) || null;
      // Allowed (emergencies happen) but flagged: a closed day or outside opening hours.
      const { hours } = getAgendaSettings(ctx.db);
      const weekday = new Date(`${date}T12:00:00`).getDay();
      const closedDay = !hours.days.includes(weekday);
      const outsideHours = time < hours.start || endAt.slice(11) > hours.end || endAt.slice(0, 10) !== date;
      const caution = closedDay
        ? (fr ? `\n⚠️ Le cabinet est fermé ce jour-là.` : `\n⚠️ The clinic is closed that day.`)
        : outsideHours
          ? (fr ? `\n⚠️ En dehors des horaires d’ouverture (${hours.start}–${hours.end}).` : `\n⚠️ Outside opening hours (${hours.start}–${hours.end}).`)
          : '';
      const summary = (fr
        ? `Prendre rendez-vous pour **${patient.name}** le **${frDate(date)} à ${time}** (${duration} min${chair ? `, ${chair}` : ''}${reason ? `, ${reason}` : ''}).`
        : `Book **${patient.name}** on **${frDate(date)} at ${time}** (${duration} min${chair ? `, ${chair}` : ''}${reason ? `, ${reason}` : ''}).`) + caution;
      return {
        reply: summary,
        proposal: { tool: name, patientId: patient.id, summary, request: { method: 'POST', url: '/api/appointments', body: { patientId: patient.id, startAt, durationMinutes: duration, chair, reason } } }
      };
    }

    case 'update_tooth': {
      const patient = resolvePatient(ctx, ACTIVE_REF);
      const fdi = Math.round(Number(args.tooth));
      const toothId = toothIdFromFdi(fdi);
      const status = str(args.status);
      if (!toothId) throw new ToolError(fr ? `Dent ${args.tooth} inconnue (numérotation FDI).` : `Unknown tooth ${args.tooth} (FDI numbering).`);
      if (!(TOOTH_STATUSES as readonly string[]).includes(status)) throw new ToolError(fr ? 'État de dent non reconnu.' : 'Unknown tooth status.');
      const notes = str(args.notes);
      const summary = fr
        ? `Noter la **dent ${fdi}** comme **${STATUS_LABELS.fr[status]}** dans le dossier de **${patient.name}**${notes ? ` (« ${notes} »)` : ''}.`
        : `Chart **tooth ${fdi}** as **${STATUS_LABELS.en[status]}** for **${patient.name}**${notes ? ` ("${notes}")` : ''}.`;
      return {
        reply: summary,
        proposal: { tool: name, patientId: patient.id, summary, request: { method: 'POST', url: '/api/odontogram', body: { toothId, status, ...(notes ? { notes } : {}) } } }
      };
    }

    case 'add_medication': {
      const patient = resolvePatient(ctx, ACTIVE_REF);
      const medName = str(args.name);
      if (!medName) throw new ToolError(fr ? 'Nom du médicament manquant.' : 'Medication name missing.');
      const already = patient.medications.find(m => m.active && plain(m.name) === plain(medName));
      if (already) {
        return { reply: fr ? `**${already.name}** figure déjà dans les traitements de **${patient.name}**.` : `**${already.name}** is already in **${patient.name}**'s medications.` };
      }
      const body = { name: medName, dosage: str(args.dosage), frequency: str(args.frequency), prescribedFor: str(args.prescribedFor) || undefined, language: ctx.lang };
      const summary = fr
        ? `Ajouter **${[medName, body.dosage, body.frequency].filter(Boolean).join(' ')}** aux traitements de **${patient.name}** (les alertes de sécurité seront recalculées).`
        : `Add **${[medName, body.dosage, body.frequency].filter(Boolean).join(' ')}** to **${patient.name}**'s medications (safety alerts will be re-checked).`;
      return { reply: summary, proposal: { tool: name, patientId: patient.id, summary, request: { method: 'POST', url: '/api/medications', body } } };
    }

    case 'switch_patient': {
      const patient = resolvePatient(ctx, args.patient);
      if (patient.id === ctx.activeId) return { reply: fr ? `Le dossier de **${patient.name}** est déjà ouvert.` : `**${patient.name}**'s chart is already open.` };
      const summary = fr ? `Ouvrir le dossier de **${patient.name}** (${patient.chartId}).` : `Open **${patient.name}**'s chart (${patient.chartId}).`;
      return { reply: summary, proposal: { tool: name, patientId: patient.id, summary, request: { method: 'POST', url: '/api/patients/select', body: { id: patient.id, language: ctx.lang } } } };
    }

    default:
      throw new ToolError(fr ? 'Action non disponible.' : 'Action not available.');
  }
}

/**
 * Runs the model's tool calls: every read is answered; at most one write proposal is
 * returned (the doctor confirms one action at a time).
 */
export function runAssistantTools(calls: Array<{ name: string; args: Record<string, unknown> }>, ctx: ToolContext): ToolOutcome {
  const replies: string[] = [];
  let proposal: Proposal | undefined;
  for (const call of calls) {
    if (WRITE_TOOLS.has(call.name) && proposal) continue;
    try {
      const outcome = runTool(call.name, call.args || {}, ctx);
      replies.push(outcome.reply);
      if (outcome.proposal) proposal = outcome.proposal;
    } catch (err) {
      if (!(err instanceof ToolError)) throw err;
      replies.push(`⚠️ ${err.message}`);
    }
  }
  return { reply: replies.join('\n\n'), proposal };
}

/** Instructions added to the chat prompt when the tools are offered. */
export function toolInstructions(lang: Lang, now: Date = new Date()): string {
  const days = lang === 'fr'
    ? ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `\n### PRACTICE DATA & ACTIONS (tools)\n` +
    `- Today is ${days[now.getDay()]} ${localDate(now)} (clinic time, Tunisia). Resolve "demain", "lundi prochain"… to YYYY-MM-DD yourself.\n` +
    `- Patients are referred to by codes (ACTIVE = the open chart; P1, P2… = patients named by the doctor). Never ask for or write a name.\n` +
    `- When the doctor asks for practice data (balance/solde, devis, paiements, recette, rendez-vous, allergies, traitements) or asks you to do something (créer un devis, encaisser, prendre rendez-vous, noter une dent, ajouter un médicament, ouvrir un dossier), CALL THE MATCHING TOOL instead of answering in text. Never invent figures.\n` +
    `- For clinical questions, answer normally without tools.\n`;
}
