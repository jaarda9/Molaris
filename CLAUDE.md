# Molaris — conventions for every session

Dental practice software for **dentists in Tunisia**. Runs **locally on the clinic PC**
(`http://localhost:3000`, no login for now). Clinical UI in **French** (English also
supported); patient-facing documents in **French and Arabic**. AI features (advisor chat,
X-ray second opinion, SOAP notes) use Google Gemini.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the server (`tsx server.ts`), port from `PORT` (default 3000) |
| `npm test` | Run every `src/**/*.test.ts` (auto-discovered, in-memory SQLite) |
| `npm run lint` | Type-check (`tsc --noEmit`) — must pass before committing |
| `npm run db:demo` | Back up `data/molaris.db` to `data/backups/` and recreate it with demo data. **Stop the server first.** |

**Never test writes against the real database** (`data/molaris.db` holds real patient data).
Start a throwaway server instead: `MOLARIS_DB_FILE=<some temp path>.db PORT=3100 npx tsx server.ts`.

Node 20 is required by the pinned `better-sqlite3@11.10.0` (newer versions ship no Node 20
binaries). Do not bump it without upgrading Node.

## Architecture

```
server.ts                  entry point (loads .env, opens DB, listens)
src/app.ts                 express app: middleware + every router (shared — see below)
src/db/                    connection + migrations, settings, document counters, ids
src/domain/                pure logic, unit-tested (safety checks, dosing, money, AI redaction)
src/ai/                    Gemini client (with patient redaction), system prompt, voice commands
src/repositories/          patients (legacy per-patient JSON document), doctor preferences
src/routes/                legacy routes acting on the *active* patient
src/features/<name>/       new features: repository.ts, routes.ts, demo.ts, *.test.ts
scripts/                   test runner, demo-database reset
public/index.html          page shell: nav tabs + one <section id="view-X"> per tab
public/i18n/core.js        legacy translations dictionary + language switcher logic
public/i18n/<name>.js      each feature's translations
public/js/core/            shared frontend (state, navigation, Molaris toolkit, utils)
public/js/features/        one script per screen
data/                      molaris.db, backups/, images/ — git-ignored, NEVER commit
```

## Data rules

- **Schema changes = a new entry appended to `src/db/migrations.ts`.** Never edit or
  reorder a shipped migration. Two branches adding migrations will conflict on purpose:
  the integrator renumbers them at merge.
- **Money is integer millimes** (1 DT = 1000 millimes). Server: `src/domain/money.ts`
  (`parseDinarsToMillimes`, `formatTnd`). Browser: `Molaris.format.tnd / parseTnd`.
  Never store dinars as REAL.
- **Dates**: timestamps are ISO-8601 strings (`nowIso()`); appointment times are
  clinic-local `'YYYY-MM-DDTHH:MM'` (Tunisia = UTC+1, no DST). Display as `23/09/2026 14:30`.
- **Ids**: `newId('prefix')` (`src/db/ids.ts`). Document numbers: `nextDocumentNumber(db, kind)`
  → `DV-2026-0001` (quote), `REC-…` (receipt), `ORD-…` (prescription), `PT-…` (chart).
  Allocate the number in the same transaction that inserts the document.
- **Medicolegal records are immutable**: prescriptions and signed SOAP notes are never
  updated or deleted; corrections are new records/addenda. Payments are never deleted — a
  mistaken payment is marked cancelled with a reason (add the columns via a new migration).
- Quotes, payments and prescriptions use `ON DELETE RESTRICT`: a patient with financial or
  prescription history cannot be deleted.
- Clinic letterhead (name, doctor, address, n° Ordre, matricule fiscal) lives in settings:
  `GET/PUT /api/settings/clinic`, used by `Molaris.print.document`.

## Backend conventions (new code)

- New feature code lives only in `src/features/<name>/`. Repository classes take a `DB` in the
  constructor and map snake_case rows to camelCase objects (see `features/agenda/repository.ts`).
- **New endpoints take an explicit `patientId`**; do not build on the legacy "active patient".
  Validate with zod: `parse(schema, req.body)`; wrap handlers in `route(...)`; throw
  `new HttpError(status, message)` or `notFound('Quote')`. Errors reach the client as `{ error }`.
- Response shape: `{ <resource>: … }` for reads, `{ success: true, <resource>: … }` for writes.
- Tests: `openDatabase(':memory:')` + the repository; never the real DB. Put them next to the
  code as `*.test.ts` — the runner finds them.
- Demo data for client demos: export `seedDemo(db)` from `src/features/<name>/demo.ts`
  (picked up by `npm run db:demo`). Demo patients are `pt_1`, `pt_2`, `pt_3` (adults) and `pt_4` (a 7-year-old, mixed dentition).

## Frontend conventions (new code)

- Plain browser JS, no build step, Tailwind via CDN. Classic scripts share one global scope,
  so **wrap each feature file in an IIFE** and expose nothing global.
- Render into your section's root (`#agenda-root`, …). Reveal your hidden tab with
  `Molaris.showTab('<name>')` once the screen works.
- Use the toolkit in `public/js/core/molaris.js`, not other features' globals:
  `Molaris.api.get/post/put/del`, `Molaris.events.on('view-shown' | 'patient-changed' |
  'language-changed')`, `Molaris.i18n.register/t`, `Molaris.format.*`, `Molaris.ui.modal/toast`,
  `Molaris.patients.fillSelect / active / select`, `Molaris.print.document({ title, bodyHtml, dir, lang })`.
- **Escape everything** inserted with innerHTML: `escapeHtml(value)` (`js/core/utils.js`).
- Every visible string goes through i18n (`public/i18n/<name>.js`, both `en` and `fr`).
  Arabic is for printed patient documents (`dir: 'rtl'`), not the UI.
- Match the existing look: cards `bg-white dark:bg-slate-900 rounded-2xl border
  border-slate-200 dark:border-slate-800 p-5 shadow-sm`, primary buttons `bg-teal-600
  hover:bg-teal-700 text-white rounded-xl text-xs font-semibold`, inputs `bg-slate-50
  dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs`.
  Support dark mode.
- Colors are theme tokens: `slate` (neutrals) and `teal` (accent) read CSS variables that
  `:root` (light, "cozy clinic": warm cream + sage teal) and `.dark` ("refined dark": graphite +
  glowing teal) redefine in `index.html`. Use those two scales, never raw hex, so both themes follow.
- Navigation is the left sidebar in `index.html`, grouped by workflow (Cabinet, Dossier clinique,
  Assistant IA, Référence). A new screen = a `.nav-item` button `nav-tab-<name>` in the right group
  + a `<section id="view-<name>">`.
- French UI text uses sentence case (« Plan de traitement », not « Plan de Traitement »).

## AI, privacy, clinical content

- Every Gemini call goes through `callGeminiWithResilience` (`src/ai/gemini.ts`), which
  strips every patient name and chart id. Never add identity to prompts.
- AI output is **decision support** ("aide à la décision"), never presented as a diagnosis.
- Never invent CNAM codes, legal references, or drug facts. Drugs are recorded by **DCI**
  (+ optional brand). Drug-safety matching (`src/domain/clinical-safety.ts`) normalizes
  accents — keep French and Tunisian brand names in its lists.

## Parallel sessions: file ownership

Each session works on its own branch in its own git worktree and edits **only its files**:

| Session | Owns |
|---|---|
| Agenda | `src/features/agenda/**`, `public/js/features/agenda.js`, `public/i18n/agenda.js` |
| Billing | `src/features/billing/**`, `public/js/features/billing.js`, `public/i18n/billing.js` |
| Prescriptions | `src/features/prescriptions/**`, `public/js/features/prescriptions.js`, `public/i18n/prescriptions.js` |
| Legal/medical docs | `docs/**` |

**Shared files — do not edit** (the integrator does, at merge): `src/app.ts`, `src/db/*`
(except appending a migration), `src/routes/*`, `src/repositories/*`, `src/domain/*`,
`public/index.html`, `public/js/core/*`, `public/i18n/core.js`, `package.json`.
If you need a change there, describe it in your final summary instead.
