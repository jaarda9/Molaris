# Molaris — what the app does

A reference for recording tutorials. Screen names and buttons are quoted **exactly as they
appear in the French interface**, so the video and the screen match.

Molaris is dental practice software for dentists in Tunisia. It runs on the clinic PC
(opened in the browser at `http://localhost:3000`); the patient data stays on that PC.
The interface is in French (English available); patient documents print in French and/or Arabic.

---

## General

- **Left sidebar** grouped by workflow: **Cabinet**, **Dossier clinique**, **Assistant IA**, **Référence**.
- **Active patient** (top bar): the chart that every clinical screen works on. Click it to
  change patient. Switching patient clears any unsigned draft so nothing lands in the wrong chart.
- **Alertes de sécurité**: a permanent banner (CRITIQUE / AVERTISSEMENT / INFO) for the open
  patient — allergies, drug interactions, cardiac risk, etc.
- **Light / dark mode** and **FR / EN** switch in the top bar.
- **Voice read-out** of the AI advisor's answers (speaker button in the top bar).
- Works on a PC, a tablet and a phone (responsive layout).

---

## 1. Cabinet (the practice)

### Agenda
- **Jour** and **Semaine** views; **Aujourd'hui / Précédent / Suivant** navigation.
- **Nouveau rendez-vous**, or click a free slot to book. Patient = **Patient existant** or
  **Nouvel appelant (sans dossier)** (just name + phone, for a first call).
- Reasons (Consultation, Détartrage, Soins, Endodontie, Extraction, Prothèse, Contrôle,
  Urgence, or free text), duration, chair, notes.
- Appointment flow: **Planifié → Confirmé → Arrivé → En cours → Terminé**, plus **Annulé** and
  **Absent** (kept for history instead of deleting).
- **Salle d'attente**: who is waiting, since when, who is in the chair, the next patient,
  late patients; buttons **Arrivé / Faire entrer / Terminer / Absent**.
- **Rappels** for the next day: one-click **Rappel WhatsApp** per patient (opens WhatsApp with
  the message ready) and tracks which reminders were sent.
- **Horaires**: opening hours, open days, and chairs (each chair gets its own column; overlaps
  are checked per chair).
- **Ouvrir le dossier** from an appointment jumps to the patient's chart.
- New caller without a chart: **Créer le dossier** from the appointment (name, phone and reason
  prefilled); the appointment is attached to the new chart.
- Calling a patient into a chair that is still « En cours » asks for confirmation.

### Patients
- **Dossiers patients** list with search by name, n° de dossier, phone, CNAM n°, or medical history.
- **Nouveau patient**: name, n° de dossier (automatic, `PT-2026-0001`), age / date of birth,
  sex, weight, ASA class, **Risque cardiaque** (caps adrenaline at 0.04 mg), reason for visit,
  medical history and alerts, allergies, phone (WhatsApp), CNAM identifier and status
  (assuré, conjoint, enfant, ascendant).
- If a chart already exists with the same name or phone number, the app says so before
  creating a second one.
- **Ouvrir le dossier** makes a patient the active patient.
- Data tools: **Exporter les dossiers (JSON)**, **Importer des dossiers**, and
  **Sauvegarde complète** (a full copy of the database — agenda, billing, prescriptions,
  charts, settings — to keep on a USB key).

### Facturation (billing) — amounts in dinars (DT)
- **Devis** (quotes):
  - **Nouveau devis** from the procedure catalogue (**Ajouter un acte du catalogue**), or free lines
    (**Ligne libre**); quantity, unit price, discount, per-tooth lines.
  - **Créer depuis le plan de traitement**: imports the planned procedures.
  - Status **Brouillon → Envoyé → Accepté / Refusé / Expiré**, with a validity date.
  - **Dupliquer**, **Imprimer** (with the clinic letterhead).
- **Règlements** (payments):
  - Cash, cheque, card, transfer; linked to a quote (installment) or not (e.g. a consultation).
  - Every payment gets a numbered **reçu** (receipt) you can print right away.
  - A mistaken payment is **cancelled with a reason**, never deleted: it stays visible,
    crossed out, and stops counting.
- Summary per patient: **Devis acceptés / Réglé sur devis / Reste à payer / Autres règlements**.
- Warning when completed treatment is **not on any quote** (unbilled work), with one click to
  quote it.
- **Encaisser sans devis**: for small acts paid on the spot, tick the acts paid; the amount and
  the receipt's subject fill in, and the acts are no longer flagged « non facturé ».
- **Encaissements du jour**: the day's takings by payment method.
- **Catalogue des actes**: your procedures and fees (French label, optional Arabic label,
  default price, optional CNAM key letter and coefficient). Demo prices are only examples.

### Ordonnances (prescriptions)
- Patient header shows **age, allergies and current treatments**; for children the weight is
  printed too. For a child only the drug name (DCI) is copied from the list: strength, form and
  dose must be written for the child's weight.
- Add drugs from the **Liste des médicaments** (recorded by DCI, optional brand) or a free line.
  Default dosages are suggestions to validate.
- **Phrases courantes (FR + AR)** for quick dosage instructions; optional Arabic instructions
  for the patient.
- **Automatic safety check** against allergies, current medications and interactions.
  A critical alert **blocks** printing unless you tick the confirmation.
- **HAS 2026 guidance** on every prescription with an antibiotic (indications, amoxicillin 1 g three
  times a day for 3 days, reassess at 3 days; weight-based dose for children).
- New clinic: **Charger la liste de départ (HAS 2026)** (amoxicillin, azithromycin, metronidazole,
  paracetamol, ibuprofen), to review before use.
- Print language: **Français**, **Arabe**, or **Français + arabe**.
- **Émettre et imprimer** — the prescription is numbered (`ORD-2026-0001`) and becomes a
  permanent record (it cannot be edited or deleted).
- **Historique** per patient: **Imprimer** again or **Renouveler** (copies the lines into a
  new prescription).
- Manage the drug list: add, edit, deactivate.

---

## 2. Dossier clinique (clinical chart) — for the active patient

### Odontogramme
- Interactive chart, **FDI (11–48)** or **Universel (1–32)** numbering.
- Click a tooth: status (**Saine, Carie active, Obturation, Couronne / onlay, Traitement
  endodontique, Implant, Absente / extraite, Non érupté**), affected surfaces, clinical notes.
- **Dents temporaires** (primary teeth) shown automatically for children, or on demand.
- **Demander l’avis du conseiller IA** about the selected tooth.

### Parodontologie
- Per-tooth entry: pocket depth on **6 sites**, recession, bleeding, suppuration, mobility,
  furcation.
- **Enregistrer le relevé** saves a dated exam; **Relevés précédents** to compare over time.
- Missing / unerupted teeth (from the odontogram) are skipped automatically.

### Plan de traitement
- **Ajouter un acte**: tooth, procedure, optional CNAM code, priority (Urgent / Élevée /
  Routine / Optionnel), estimated cost, notes.
- Status **Proposé → Accepté → En cours → Terminé** (or **Refusé**).
- **Modifier** (pencil) button: correct the act, tooth, code, priority, cost or notes.
- Totals: **Reste à réaliser** and **Réalisé**.
- A finished act on a tooth still charted « Carie active » says so, with a **Mettre à jour la
  dent** button.
- Completed procedures cannot be deleted (medical record). The plan can be turned into a quote
  in Facturation.

### Médicaments (patient's current medications)
- The patient's active medications (e.g. anticoagulants), with dosage, frequency and reason.
- This list powers the **interaction and allergy checks** in prescriptions and the safety banner.
- Activate / deactivate instead of deleting; re-activating a drug is re-checked for safety.

### Laboratoire (lab work)
- Track crowns, bridges, dentures, appliances: tooth, type, material, shade, margin, lab, due date.
- Status **Planifié → Envoyé → Au laboratoire → Retourné → Posé** (or **À refaire**); the dates
  sent / received / fitted are recorded automatically.
- **Modifier** button: new due date from the lab, shade, material, notes.
- **En retard** and **Échéance proche** badges.

---

## 3. Assistant IA (AI assistant — decision support, never a diagnosis)

Patient names and chart numbers are removed before anything is sent to the AI.

### Conseiller IA (AI advisor chat)
- Ask clinical questions in French or English, typed or **dictated with the microphone**.
- **Raccourcis au fauteuil** (1-click chairside questions): pulpitis, pulp exposure,
  subgingival margin, broken file, cardiac patient, post-op pain.
- Knows the open patient's chart (age, ASA, allergies, medications, teeth) and your clinical
  preferences.
- **Can act on the software** after you confirm: book an appointment, create a draft quote,
  record a payment, update a tooth, add a medication, switch patient, give a patient's balance
  or the day's takings, list appointments.
- Conversation is kept per patient; **Effacer la conversation** to clear it.
- Voice commands: start a timer (« lance un minuteur de 20 secondes »), open a screen,
  back up the database, mute/unmute.

### Radiographies (X-ray file)
- The patient's **X-ray file**: every radiograph and photo, newest first, stored in the database
  (so in the **Sauvegarde complète**).
- Add an image (JPEG, PNG or WebP, up to 20 MB) with its type (periapical, bitewing, panoramic,
  CBCT, photo), date, tooth and **your interpretation**: **Enregistrer au dossier**, or
  **Enregistrer et analyser (IA)**.
- For each image: full-size view, editable interpretation, **AI second reading to confirm** (kept,
  dated, can be re-run with a specific question).
- An image can be deleted only on the day it was added (mistake); afterwards it stays in the file.
- The two teaching examples are analysed but never stored.

### Comptes-rendus (SOAP notes)
- Enter the procedure, tooth, anaesthesia, materials and outcome → **Générer le compte-rendu**.
- The AI writes a **draft** (Subjectif, Objectif, Analyse, Plan). Missing information shows as
  « [à compléter] » — it never invents facts.
- Edit it, then **Signer et enregistrer au dossier**. A signed note is permanent; corrections are
  added as a dated **Addendum**.
- Before signing, the app points out any « [à compléter] » gaps left.
- **Comptes-rendus signés**: the patient's note history.

---

## 4. Référence (reference tools)

### Anesthésie
- **Dose calculator**: choose the anaesthetic, patient weight, cardiac risk → maximum carpules,
  maximum mg, remaining carpules, limiting factor.
- **+1 carpule injectée** to count during the procedure; doses already logged today are included.
- **Enregistrer au dossier**: records the injected carpules in the patient's chart (day total, used
  by the SOAP note).
- Reference cards: **endocarditis antibiotic prophylaxis** (ESC 2023 + Tunisian consensus) and
  **post-operative pain relief** (non-opioid).
- Always marked « Calcul indicatif : vérifier le RCP ».

### Protocoles
- Quick protocols for chairside complications: hot tooth / failed anaesthesia, broken
  instrument, dry socket, deep margin elevation, oro-antral communication.
- Filter by category; **Demander au conseiller** to discuss a protocol with the AI.

### Profil & préférences
- **Identité du cabinet**: clinic name, doctor, specialty, address, phone, e-mail,
  **n° d'Ordre**, **matricule fiscal**, **CNAM code**. Printed on every quote, receipt and
  prescription. **Imprimer une page de test** to check the letterhead.
- **Préférences cliniques** for the AI advisor: bonding system, composite, rotary files, implant
  system, clinical philosophy.
- **Voix du conseiller**: choose the voice that reads answers aloud (Microsoft Edge has the most
  natural voices).

---

## Suggested tutorial order

1. **First setup** — Profil & préférences: fill the clinic identity, print a test page.
2. **Patients** — create a patient, open the chart.
3. **Agenda** — book, move through the waiting room, send a WhatsApp reminder.
4. **Clinical chart** — odontogram, then a treatment plan.
5. **Facturation** — quote from the plan, record a payment, print the receipt, daily takings.
6. **Ordonnances** — write one, show a safety alert, print in French + Arabic.
7. **AI** — chairside question, X-ray reading, SOAP note draft → sign.
8. **Reference** — anaesthesia calculator and protocols.
9. **Backup** — Sauvegarde complète to a USB key (explain why it matters).

Useful to show: the app works without internet except for the AI features and voice dictation.
