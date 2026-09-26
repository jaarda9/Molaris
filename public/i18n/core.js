/**
 * M.O.L.A.R.I.S Bilingual Translation Dictionary & Localization Engine
 * English (en) & French (fr)
 * Full Clinical Odontological & Operatory Coverage
 */

window.MOLARIS_TRANSLATIONS = {
  en: {
    // Brand & Header
    "brand.title": "M.O.L.A.R.I.S",
    "brand.subtitle": "Clinical decision-support assistant for the dental practice",
    "brand.badge": "Decision support",
    "patients.namePlaceholder": "e.g. Amira Jlassi",
    "patients.complaintPlaceholder": "e.g. Sensitivity to cold on tooth 46 when chewing",
    "patient.activeBadge": "ACTIVE CHART",
    "patient.cardiacAlert": "Cardiac Risk (Epi Capped 0.04mg)",
    "patient.standardEpi": "Standard Epi",
    "patient.btnPatients": "Patients",
    "timer.etch": "15s",
    "timer.cure": "20s",
    "timer.stop": "Stop",
    "timer.etchTitle": "Acid Etch 15s",
    "timer.cureTitle": "Cure 20s",
    "header.voiceTooltip": "Toggle Advisor Voice Readout",
    "header.themeTooltip": "Toggle Operatory Light/Dark Mode",

    // Navigation Tabs
    "navgroup.practice": "Practice",
    "navgroup.chart": "Clinical chart",
    "navgroup.assistant": "AI assistant",
    "navgroup.reference": "Reference",
    "header.menu": "Menu",
    "nav.advisor": "AI advisor",
    "nav.patients": "Patients",
    "nav.odontogram": "Odontogram",
    "nav.anesthesia": "Anesthesia",
    "nav.vision": "X-rays",
    "nav.protocols": "Protocols",
    "nav.soap": "SOAP notes",
    "nav.preferences": "Profile & preferences",
    "nav.treatment": "Treatment plan",
    "nav.medications": "Medications",
    "nav.perio": "Periodontics",
    "nav.labcases": "Lab cases",

    // Advisor Chat
    "chat.headerTitle": "Senior Dental Advisor",
    "chat.headerSubtitle": "Clinical decision support • does not replace your clinical judgement",
    "chat.clearFeed": "Clear Feed",
    "chat.welcomeSender": "M.O.L.A.R.I.S SENIOR ADVISOR",
    "chat.welcomeGreeting": "Hello, Doctor. What procedure or diagnostic question are we looking at today?",
    "chat.welcomeLi1": "Anesthesia failing on a lower molar with irreversible pulpitis?",
    "chat.welcomeLi2": "Maximum number of cartridges for a cardiac patient, with the calculation shown?",
    "chat.welcomeLi3": "Pulp capping (MTA, tricalcium silicate) or root canal treatment?",
    "chat.welcomeLi4": "Separated file, deep subgingival margin or dry socket?",
    "chat.welcomeHint": "Type your question, dictate it with the microphone, or pick a quick starter. Answers are decision support and do not replace your clinical judgement.",
    "chat.contextualFocus": "Tooth in focus:",
    "chat.removeFocus": "✕ Remove",
    "chat.inputPlaceholder": "Ask a clinical question (e.g. 'Anesthesia on a hot 46?' or 'DME or crown lengthening?')...",
    "chat.sendBtn": "Ask",
    "chat.micStatus": "● Microphone listening... ask your clinical question",
    "chat.micTooltip": "Hands-free voice dictation",
    "chat.micUnsupported": "Speech recognition is not supported by this browser",
    "chat.micErrorDenied": "Microphone blocked: allow the microphone for this site (padlock icon in the address bar), then try again.",
    "chat.micErrorNoDevice": "No microphone found: check that one is plugged in and selected in Windows.",
    "chat.micErrorNetwork": "Voice dictation needs an internet connection (the browser’s speech service is online).",
    "chat.micErrorLanguage": "This browser cannot recognise this language.",
    "chat.micErrorGeneric": "Voice dictation stopped unexpectedly. Try again.",
    "chat.clearConfirm": "Erase this patient’s advisor conversation for good?",
    "chat.resumed": "Conversation with {name} · since {date}",
    "chat.voiceEnabled": "Voice output enabled, Doctor.",
    "chat.quickStarters": "Chairside quick starters",
    "chat.oneClick": "1-CLICK",
    "chat.starter1Title": "Hot tooth:",
    "chat.starter1Desc": "46 still sensitive to cold after an inferior alveolar nerve block. Next step?",
    "chat.starter2Title": "Pulp exposure:",
    "chat.starter2Desc": "Pinpoint bleeding during caries removal. Direct pulp cap or root canal treatment?",
    "chat.starter3Title": "Subgingival margin:",
    "chat.starter3Desc": "Deep margin elevation or surgical crown lengthening?",
    "chat.starter4Title": "Separated file:",
    "chat.starter4Desc": "NiTi 20/.04 file separated in the apical third of the mesiobuccal canal of 36. Protocol?",
    "chat.starter5Title": "Cardiac patient:",
    "chat.starter5Desc": "Maximum number of cartridges: articaine or mepivacaine?",
    "chat.starter6Title": "Post-Op Pain:",
    "chat.starter6Desc": "Severe throbbing 48h after root canal. Non-narcotic regimen?",
    "chat.sidebarPrefTitle": "Doctor Profile Memory",
    "chat.sidebarDoc": "Attending:",
    "chat.sidebarBonding": "Bonding System:",
    "chat.sidebarRotary": "Rotary Endodontics:",
    "chat.sidebarImplant": "Implant System:",
    "chat.sidebarNotation": "Notation System:",
    "chat.sidebarEditPrefs": "Edit clinical preferences →",
    "chat.triageTitle": "Emergency Chairside Triage",
    "chat.triageDesc": "Rapid protocols for dry socket, oroantral communication, sodium hypochlorite accidents and local anesthetic systemic toxicity.",
    "chat.triageBtn": "View clinical protocols",
    "chat.doctorLabel": "Dentist",
    "chat.copy": "Copy",
    "chat.actionExecuted": "⚡ ACTION EXECUTED",
    "chat.alertPrefix": "⚠️ Clinical assistant alert:",
    "chat.commFailure": "⚠️ Could not reach the clinical assistant.",
    "chat.typing": "Reviewing the question and the patient record...",
    "chat.cleared": "Conversation cleared. M.O.L.A.R.I.S is ready for your next question.",

    // Odontogram
    "odonto.title": "Interactive Clinical Odontogram",
    "odonto.activeChart": "Active Chart",
    "odonto.subtitle": "Click any tooth to examine, log restorations/caries/endo, or direct-consult M.O.L.A.R.I.S Senior Advisor.",
    "odonto.universalSystem": "Universal (#1-32)",
    "odonto.fdiSystem": "FDI",
    "odonto.resetBtn": "Reset Chart",
    "odonto.legendTitle": "Status Legend:",
    "odonto.legendSound": "Sound",
    "odonto.legendCaries": "Caries",
    "odonto.legendFilled": "Composite/Amalgam",
    "odonto.legendCrown": "Crown/Bridge",
    "odonto.legendRct": "Root canal",
    "odonto.legendImplant": "Implant",
    "odonto.legendMissing": "Missing/Extract",
    "odonto.maxillaryArch": "Upper Arch • Maxillary (Right → Left)",
    "odonto.maxillarySub": "Quadrant 1 (1-8) • Quadrant 2 (9-16)",
    "odonto.occlusalPlane": "Occlusal Plane",
    "odonto.mandibularArch": "Lower Arch • Mandibular (Right → Left)",
    "odonto.mandibularSub": "Quadrant 4 (32-25) • Quadrant 3 (24-17)",
    "odonto.drawerTitle": "Tooth Examination & Findings",
    "odonto.consultBtn": "Ask the AI advisor about this tooth",
    "odonto.statusLabel": "Tooth Condition:",
    "odonto.statusSound": "Sound",
    "odonto.statusCaries": "Active Caries",
    "odonto.statusRestoration": "Restoration",
    "odonto.statusCrown": "Crown / Onlay",
    "odonto.statusRct": "Endodontic RCT",
    "odonto.statusImplant": "Implant",
    "odonto.statusMissing": "Missing / Extracted",
    "odonto.surfacesLabel": "Affected Surfaces:",
    "odonto.surfaceOcclusal": "Occlusal / Incisal",
    "odonto.surfaceMesial": "Mesial",
    "odonto.surfaceDistal": "Distal",
    "odonto.surfaceBuccal": "Buccal / Facial",
    "odonto.surfaceLingual": "Lingual / Palatal",
    "odonto.notesLabel": "Clinical Findings & Treatment Plan:",
    "odonto.notesPlaceholder": "e.g. Deep disto-occlusal caries, cold-test negative, percussion tender...",
    "odonto.saveBtn": "Save Note",

    // Anesthesia Calculator
    "la.title": "Anesthetic dose calculator",
    "la.badge": "Indicative calculation: check the SmPC",
    "la.subtitle": "Determine safe cartridge limits based on patient body weight and vasoconstrictor cardiac threshold.",
    "la.selectDrug": "Select Local Anesthetic Agent:",
    "la.weightLabel": "Patient Body Weight (kg):",
    "la.cardiacLabel": "Cardiac Risk / ASA III+",
    "la.cardiacSub": "Strict 0.04mg Epinephrine Limit",
    "la.deliveredLabel": "Carpules Delivered so far:",
    "la.deliveredSub": "Keep track as you infiltrate during the appointment",
    "la.incrementBtn": "+1 Carpule Injected",
    "la.resetCarpulesBtn": "Reset Carpules",
    "la.calcLimitTitle": "Calculated Safe Limit:",
    "la.calcLimitFactor": "Factor: Mg/Kg Body Weight",
    "la.resultMaxCarpules": "Safe Max Carpules",
    "la.resultMaxMg": "Max Anesthetic (mg)",
    "la.resultRemaining": "Remaining Safe",
    "la.resultLimiting": "Limiting Factor",
    "la.cardiacWarning": "Epinephrine restricted to 0.04mg for cardiac safety.",

    // Vision Diagnostics
    "vision.title": "X-rays",
    "vision.badge": "Gemini",
    "vision.subtitle": "Store the patient's radiographs and photos with your reading; ask the AI for a second reading (decision support) if needed.",
    "vision.dropPrompt": "Click or drag & drop dental radiograph",
    "vision.dropSub": "JPEG, PNG or WebP (export from your X-ray software), up to 20 MB",
    "vision.samplesTitle": "Or try a teaching example (not stored):",
    "vision.sampleA": "Case A: Periapical 46",
    "vision.sampleADesc": "PA radiolucency & deep caries",
    "vision.sampleB": "Case B: Bitewing 26-27",
    "vision.sampleBDesc": "Interproximal lesion & bone loss",
    "vision.questionLabel": "Question for the AI (optional)",
    "vision.questionPlaceholder": "e.g. 'Bone loss around 36?' or 'Furcation involvement on 46?'",
    "vision.analyzeBtn": "Analyze image",
    "vision.resultTitle": "Reading",
    "vision.resultEmpty": "Upload a periapical, bitewing or clinical photo to get a second reading.",
    "vision.evaluated": "Analyzed",
    "vision.sampleNote": "Teaching example: analysed but never stored in a patient file.",
    "vision.kind": "Type",
    "vision.kind.periapical": "Periapical",
    "vision.kind.bitewing": "Bitewing",
    "vision.kind.panoramic": "Panoramic",
    "vision.kind.cbct": "CBCT (slice)",
    "vision.kind.photo": "Intraoral photo",
    "vision.kind.other": "Other",
    "vision.takenOn": "Date taken",
    "vision.tooth": "Tooth (FDI, optional)",
    "vision.toothNone": "— No specific tooth —",
    "vision.interpretation": "Your interpretation (optional)",
    "vision.saveBtn": "Save to the file",
    "vision.saveAnalyzeBtn": "Save and analyse (AI)",
    "vision.analyzeSampleBtn": "Analyse the example (AI)",
    "vision.fileTitle": "X-ray file",
    "vision.count": "{n} image(s)",
    "vision.empty": "No X-ray in this patient's file yet.",
    "vision.selectPrompt": "Choose an X-ray in the file below, or add a new one.",
    "vision.dentistTitle": "Your interpretation",
    "vision.interpretationPlaceholder": "Your reading of this image (kept in the file)",
    "vision.saveInterpretation": "Save the interpretation",
    "vision.aiTitle": "AI second reading (to be confirmed)",
    "vision.aiNone": "No AI reading for this image.",
    "vision.aiRun": "Ask the AI for a second reading",
    "vision.aiRerun": "New AI reading",
    "vision.aiAt": "Read on {date}",
    "vision.saved": "X-ray saved in the file",
    "vision.interpretationSaved": "Interpretation saved",
    "vision.deleteBtn": "Delete (added by mistake)",
    "vision.deleteConfirm": "Delete this X-ray? Only possible on the day it was added.",
    "vision.openFull": "Open full size",
    "vision.noPatient": "Open a patient chart first.",
    "vision.dentistLabel": "Dentist",
    "vision.hasAi": "AI",
    "vision.copyBtn": "Copy reading",
    "vision.copied": "Copied!",
    "vision.noImage": "Upload or select a dental image first.",
    "vision.analyzing": "Analyzing the image with Gemini Vision...",
    "vision.error": "⚠️ Image analysis error:",
    "vision.connectError": "⚠️ Could not reach the image analysis service:",
    "vision.sampleWatermarkA": "SAMPLE PERIAPICAL: TOOTH 46 (CARIES & APICAL LESION)",
    "vision.sampleWatermarkB": "SAMPLE BITEWING: 26-27 INTERPROXIMAL DEMINERALIZATION",

    // Clinical Playbooks
    "playbooks.title": "Clinical protocols & complications",
    "playbooks.subtitle": "Step-by-step clinical workflows refined for immediate chairside reference under operative pressure.",
    "playbooks.filterAll": "All Protocols",
    "playbooks.filterEndo": "Endodontics",
    "playbooks.filterSurgery": "Oral Surgery",
    "playbooks.filterRestorative": "Restorative",
    "playbooks.filterEmergencies": "Emergencies",
    "playbooks.askAdvisor": "Ask Advisor",

    // SOAP Note Generator
    "soap.title": "SOAP Progress Note",
    "soap.subtitle": "Draft progress note (Subjective, Objective, Assessment, Plan) for the active patient, written by the AI: you review and sign it before it enters the chart.",
    "soap.procedureLabel": "Procedure Type:",
    "soap.procedurePlaceholder": "e.g. Root canal treatment, composite restoration, extraction...",
    "soap.toothLabel": "Tooth Involved:",
    "soap.toothNone": "General / not specified",
    "soap.anesthesiaLabel": "Local Anesthesia Administered:",
    "soap.anesthesiaPlaceholder": "e.g. 1 cartridge articaine 4% with epinephrine 1:100,000, inferior alveolar nerve block",
    "soap.materialsLabel": "Materials & Isolation:",
    "soap.materialsPlaceholder": "e.g. Rubber dam, sectional matrix, universal adhesive, composite...",
    "soap.detailsLabel": "Clinical Outcome & Post-Op Instructions:",
    "soap.detailsPlaceholder": "e.g. Uneventful, well tolerated. Post-op instructions given.",
    "soap.generateBtn": "Generate SOAP note",
    "soap.outputTitle": "Generated progress note",
    "soap.copyBtn": "Copy note",
    "soap.copied": "Copied!",
    "soap.outputEmpty": "Fill in the procedure, then generate the note. Missing details appear as [to be completed].",
    "soap.generating": "Drafting the SOAP note...",
    "soap.error": "Error:",
    "soap.connectError": "Could not reach the note generator:",
    "soap.exampleProc": "Direct composite restoration, class II (DO)",
    "soap.exampleAnesthesia": "1 cartridge articaine 4% with epinephrine 1:100,000, inferior alveolar nerve block, aspiration negative",
    "soap.exampleMaterials": "Rubber dam, sectional matrix and wedge, selective enamel etching (37% phosphoric acid, 15 s), universal adhesive light-cured 20 s, A2 composite in 2 mm increments, occlusion checked with articulating paper",
    "soap.exampleOutcome": "Uneventful, well tolerated. Soft diet until the anesthesia wears off. Post-op instructions given.",
    "soap.saveBtn": "Save to Patient Record",

    // Patient Manager
    "patients.title": "Patient records",
    "patients.badge": "Local database (this PC)",
    "patients.subtitle": "Choose a patient to open their chart: dental chart, anesthesia, prescriptions and notes.",
    "patients.searchPlaceholder": "Search by name, chart number, phone, CNAM number or medical history...",
    "patients.addNew": "+ Add New Patient",
    "patients.exportDb": "Export charts (JSON)",
    "patients.importDb": "Import charts",
    "patients.backupDb": "Full backup",
    "patients.backupTitle": "Download a complete copy of the database (agenda, billing, prescriptions, charts, settings). Keep it on a USB key or in the cloud.",
    "patients.selectAndTreat": "Select Patient & Treat",
    "patients.activePatientBtn": "✓ Active Operatory Patient",
    "patients.editChart": "Edit Patient Chart",
    "patients.deleteRecord": "Delete Patient Record",
    "patients.teethCharted": "Teeth Charted",
    "patients.carpulesLa": "Carpules LA",
    "patients.soapNotes": "SOAP Notes",
    "patients.modalAddTitle": "Add New Dental Patient",
    "patients.modalEditTitle": "Edit Dental Patient",
    "patients.fullName": "Full Patient Name *",
    "patients.chartId": "Chart ID *",
    "patients.age": "Age",
    "patients.birthDate": "Date of birth",
    "soap.defaultProcedure": "Dental treatment",
    "soap.draftNotice": "AI draft: read it, correct it, then sign it. Nothing is saved to the chart before you sign.",
    "soap.signBtn": "Sign and save to the chart",
    "soap.signed": "Signed and saved to the chart.",
    "soap.gapsConfirm": "The note still contains {n} \"[to be completed]\" gap(s). Complete them before signing, or sign anyway?",
    "soap.signConfirm": "Sign this note? Once signed it can no longer be changed (only amended).",
    "soap.historyTitle": "Signed notes",
    "soap.historyEmpty": "No signed note for this patient yet.",
    "soap.addendumBtn": "Add an addendum",
    "soap.addendumSave": "Sign the addendum",
    "soap.addendumPrompt": "Addendum (correction or complement, dated and signed):",
    "soap.addendumLabel": "Addendum",
    "soap.signedBy": "Signed by {author} on {date}",
    "patients.gender": "Gender",
    "patients.genderMale": "Male",
    "patients.genderFemale": "Female",
    "patients.genderOther": "Other",
    "patients.weight": "Weight (kg) *",
    "patients.asa": "ASA Physical Status *",
    "patients.asa1": "ASA I - Normal healthy patient",
    "patients.asa2": "ASA II - Mild systemic disease",
    "patients.asa3": "ASA III - Severe systemic disease",
    "patients.asa4": "ASA IV - Severe disease with constant threat",
    "patients.cardiacRisk": "Cardiac Risk Alert",
    "patients.cardiacRiskSub": "Strictly caps epinephrine at 0.04mg",
    "patients.chiefComplaint": "Chief Complaint *",
    "patients.medicalAlerts": "Medical Alerts",
    "patients.allergies": "Known Allergies",
    "patients.cancel": "Cancel",
    "patients.savePatient": "Save Patient Record",
    "patients.chartIdLabel": "Chart ID",
    "patients.chartIdPlaceholder": "Automatic (PT-2026-0001)",
    "patients.phoneLabel": "Phone (WhatsApp)",

    // Doctor Profile & Preferences
    "prefs.title": "Practitioner profile",
    "prefs.subtitle": "Customize M.O.L.A.R.I.S to adapt to your preferred restorative systems, endodontic files, implant brands, and operatory workflows.",
    "prefs.doctorName": "Doctor Name & Title:",
    "prefs.clinicName": "Clinic Name:",
    "prefs.degree": "Degree & Specialty:",
    "prefs.school": "Dental School / Training:",
    "prefs.bondingSystem": "Preferred Bonding System:",
    "prefs.compositeSystem": "Preferred Composite System:",
    "prefs.rotarySystem": "Preferred Rotary Endodontics:",
    "prefs.implantSystem": "Preferred Implant System:",
    "prefs.notes": "Practice Clinical Philosophy & Special Rules:",
    "prefs.saveBtn": "Save Clinical Memory Profile",

    // Common Alerts & Feedback
    "common.copied": "Copied to clipboard!",
    "common.saved": "Saved successfully!",
    "common.deleteConfirm": "Are you sure you want to delete this record?",
    "common.switchSuccess": "Active chart switched to:",
    "common.none": "None",

    // Standing Safety Alerts
    "safety.title": "Standing Safety Alerts",
    "safety.critical": "CRITICAL",
    "safety.warning": "WARNING",
    "safety.info": "INFO",

    // Treatment Plan
    "treatment.title": "Treatment Plan",
    "treatment.subtitle": "Propose, prioritize, and track per-tooth procedures through to completion.",
    "treatment.addBtn": "Add Item",
    "treatment.modalTitle": "Add Treatment Plan Item",
    "treatment.tooth": "Tooth (FDI)",
    "treatment.procedure": "Procedure *",
    "treatment.procedurePlaceholder": "e.g. Crown, composite restoration, extraction",
    "treatment.cdtCode": "Procedure code (CNAM nomenclature, optional)",
    "treatment.cdtCodePlaceholder": "Code from the official nomenclature",
    "treatment.priority": "Priority",
    "treatment.priorityUrgent": "Urgent",
    "treatment.priorityHigh": "High",
    "treatment.priorityRoutine": "Routine",
    "treatment.priorityElective": "Elective",
    "treatment.cost": "Estimated cost (DT)",
    "treatment.status": "Status",
    "treatment.statusProposed": "Proposed",
    "treatment.statusAccepted": "Accepted",
    "treatment.statusInProgress": "In Progress",
    "treatment.statusCompleted": "Completed",
    "treatment.statusDeclined": "Declined",
    "treatment.notes": "Notes",
    "treatment.save": "Save Item",
    "treatment.cancel": "Cancel",
    "treatment.delete": "Delete",
    "treatment.empty": "No treatment plan items yet. Add the first proposed procedure.",
    "treatment.deleteConfirm": "Delete this treatment plan item?",
    "treatment.errUpdate": "Could not update the status:",
    "treatment.errDelete": "Could not delete the item:",
    "treatment.errSave": "Could not save the item:",
    "treatment.errCost": "Invalid amount. Examples: 120 · 120.500 · 1 250.000",
    "treatment.totalToDo": "Still to do:",
    "treatment.totalDone": "Done:",
    "treatment.chartStillCaries": "Tooth {tooth} is still charted as \"Active caries\" on the odontogram.",
    "treatment.updateChart": "Update the tooth",
    "treatment.edit": "Edit",
    "treatment.editTitle": "Edit treatment plan item",

    // Medications
    "meds.title": "Medications",
    "meds.subtitle": "Maintain the active medication list that feeds drug-interaction and allergy safety checks.",
    "meds.addBtn": "+ Add Medication",
    "meds.modalTitle": "Add Medication",
    "meds.name": "Medication Name *",
    "meds.dosage": "Dosage",
    "meds.frequency": "Frequency",
    "meds.prescribedFor": "Prescribed For",
    "meds.save": "Save Medication",
    "meds.cancel": "Cancel",
    "meds.delete": "Delete",
    "meds.active": "Active",
    "meds.inactive": "Inactive",
    "meds.activate": "Activate",
    "meds.deactivate": "Deactivate",
    "meds.empty": "No medications on file for this patient.",

    // Periodontal Chart
    "perio.title": "Periodontal charting",
    "perio.subtitle": "Click a tooth to record 6-site probing depths, recession, bleeding, mobility & furcation. Save creates a new dated snapshot.",
    "perio.saveSnapshot": "Save Snapshot",
    "perio.saved": "Snapshot saved to periodontal chart history.",
    "perio.history": "Snapshot History",
    "perio.noHistory": "No prior snapshots saved yet.",
    "perio.modalTitle": "Perio Entry — Tooth",
    "perio.mobility": "Mobility",
    "perio.furcation": "Furcation",
    "perio.pocketDepth": "Pocket Depth (mm)",
    "perio.recession": "Recession (mm)",
    "perio.bleeding": "Bleeding",
    "perio.suppuration": "Suppuration",
    "perio.save": "Save",
    "perio.saveEntry": "Update Tooth (In Memory)",
    "perio.cancel": "Cancel",
    "perio.site.mesiobuccal": "Mesiobuccal",
    "perio.site.buccal": "Buccal",
    "perio.site.distobuccal": "Distobuccal",
    "perio.site.distolingual": "Distolingual",
    "perio.site.lingual": "Lingual",
    "perio.site.mesiolingual": "Mesiolingual",
    "perio.maxDepth": "Max Depth",

    // Lab Cases
    "labcases.title": "Lab work",
    "labcases.subtitle": "Track crown & bridge, denture, and appliance cases through the outside dental lab workflow.",
    "labcases.addBtn": "+ Add Case",
    "labcases.modalTitle": "Add Lab Case",
    "labcases.tooth": "Tooth #",
    "labcases.caseType": "Case Type *",
    "labcases.material": "Material",
    "labcases.shade": "Shade",
    "labcases.marginDesign": "Margin Design",
    "labcases.occlusalNotes": "Occlusal Notes",
    "labcases.labName": "Lab Name",
    "labcases.dueDate": "Due Date",
    "labcases.notes": "Notes",
    "labcases.status": "Status",
    "labcases.save": "Save Case",
    "labcases.cancel": "Cancel",
    "labcases.delete": "Delete",
    "labcases.empty": "No lab cases on file for this patient.",
    "labcases.statusPlanned": "Planned",
    "labcases.statusSent": "Sent",
    "labcases.statusInLab": "In Lab",
    "labcases.statusReturned": "Returned",
    "labcases.statusSeated": "Seated",
    "labcases.statusRemake": "Remake",
    "labcases.overdue": "Overdue",
    "labcases.dueSoon": "Due Soon",
    "labcases.edit": "Edit",
    "labcases.editTitle": "Edit lab case",

    // FR sweep (odontogram FDI chart, placeholders, messages)
    "header.patientSelectorTitle": "Click to switch or manage patients",
    "header.openPatientsTitle": "Open the patient records",
    "odonto.quadrant1": "Quadrant 1 · upper right",
    "odonto.quadrant2": "Quadrant 2 · upper left",
    "odonto.quadrant3": "Quadrant 3 · lower left",
    "odonto.quadrant4": "Quadrant 4 · lower right",
    "odonto.maxillaryArchShort": "Maxilla",
    "odonto.mandibularArchShort": "Mandible",
    "odonto.patientRight": "Patient's right",
    "odonto.patientLeft": "Patient's left",
    "odonto.resetConfirm": "Erase the findings and notes of {n} tooth/teeth charted for {name}? Every tooth goes back to sound. This cannot be undone.",
    "patients.localDbBadge": "Local database (this PC)",
    "patients.cardiacRiskLabel": "Cardiac risk",
    "patients.cardiacRiskHint": "Caps adrenaline at 0.04 mg",
    "patients.alertsPlaceholder": "e.g. Hypertension, diabetes",
    "patients.allergiesPlaceholder": "e.g. Penicillin, latex, none known",
    "patients.importDone": "Import: {imported} chart(s) added, {skipped} already here (left unchanged), {invalid} invalid (ignored).",
    "patients.importFailed": "Import failed:",
    "patients.demoBanner": "{n} example chart(s) (fictitious patients provided for the demonstration) are still in your records. Remove them now that you have entered your own patients.",
    "patients.demoBannerFirst": "The {n} charts below are examples (fictitious patients) to try Molaris. Create your first patient; you can then remove the examples in one click.",
    "patients.demoRemove": "Remove the example charts",
    "patients.demoBadge": "Example",
    "patients.demoRemoveConfirm": "Remove the example charts and everything recorded in them? Your own patients are not affected.",
    "patients.moreHidden": "{n} other charts not shown: search by name, chart number or phone.",
    "patients.duplicateConfirm": "A chart already exists: {name} ({chart}, {phone}). Create a second chart anyway?\n\nTo see the existing one, cancel and search for it in Patients.",
    "perio.notesPlaceholder": "Chart notes (optional)...",
    "perio.bleedingTitle": "Bleeding on probing",
    "perio.absentTitle": "Missing or unerupted on the odontogram: not probed",
    "perio.statTeeth": "teeth probed",
    "perio.statBop": "Bleeding",
    "perio.statMean": "mean depth",
    "perio.statEmpty": "No site recorded.",
    "perio.suppurationTitle": "Suppuration",
    "perio.errSave": "Could not save the perio chart:",
    "meds.namePlaceholder": "e.g. Acenocoumarol (Sintrom)",
    "meds.frequencyPlaceholder": "e.g. Once daily",
    "meds.prescribedForPlaceholder": "e.g. Atrial fibrillation",
    "labcases.typePlaceholder": "e.g. Crown, bridge, denture",
    "labcases.materialPlaceholder": "e.g. Zirconia",
    "labcases.marginPlaceholder": "e.g. Deep chamfer, feather edge",
    "la.maxLabel": "Max:",
    "la.carpulesUnit": "carpules",
    "common.networkError": "Connection error with the local server:",
    "common.saveError": "Could not save:",
    "prefs.saved": "Preferences saved. The advisor will now follow these practice standards.",
    "odonto.statusUnerupted": "Unerupted",
    "odonto.legendUnerupted": "Unerupted",
    "odonto.primaryTeeth": "Primary teeth",
    "odonto.primaryShown": "shown",
    "odonto.primaryHidden": "hidden",
    "odonto.primaryShowBtn": "Show primary teeth",
    "odonto.primaryHideBtn": "Hide primary teeth",
    "odonto.primaryAutoLink": "Back to automatic",
    "odonto.scrollHint": "Swipe sideways to see the whole chart →",
    "odonto.primaryReason.child": "Automatic: patient aged {age}",
    "odonto.primaryReason.recorded": "Automatic: a primary tooth has a finding",
    "odonto.primaryReason.adult": "Hidden by default for adults",
    "odonto.primaryReason.shown": "Shown for this patient",
    "odonto.primaryReason.hidden": "Hidden for this patient",
    "odonto.primaryRowUpper": "Primary teeth · upper",
    "odonto.primaryRowLower": "Primary teeth · lower",
    "assistant.confirmPrompt": "Confirm this action?",
    "assistant.confirm": "Confirm",
    "assistant.cancel": "Cancel",
    "assistant.cancelled": "Cancelled: nothing was saved.",
    "assistant.failed": "Not done:",
    "assistant.notAllowed": "This action is not allowed from the chat.",
    "assistant.patientChanged": "Another chart is open now: re-ask the assistant for this patient.",
    "assistant.done.quote": "Draft quote {n} created (see Billing).",
    "assistant.done.payment": "Payment recorded: receipt {n} (printable from Billing).",
    "assistant.done.appointment": "Appointment booked: {d}.",
    "assistant.done.tooth": "Odontogram updated.",
    "assistant.done.medication": "Medication added.",
    "assistant.done.switch": "Chart opened.",
    "assistant.done.generic": "Done.",
    "voice.title": "Advisor voice",
    "voice.subtitle": "The voice that reads the advisor’s answers aloud (speaker button at the top). Remembered on this PC.",
    "voice.preview": "Listen",
    "voice.natural": "natural",
    "voice.none": "No voice available in this browser",
    "voice.hint": "For a natural, human-sounding voice, open the app in Microsoft Edge (free “Natural” voices, internet required) or Chrome.",
    "voice.sample": "Hello Doctor. I can read your appointments, prepare a quote or remind you of a dosage. Tell me what you need."
  },

  fr: {
    // Brand & Header
    "brand.title": "M.O.L.A.R.I.S",
    "brand.subtitle": "Assistant clinique d'aide à la décision pour le cabinet dentaire",
    "brand.badge": "Aide à la décision",
    "patients.namePlaceholder": "ex. Amira Jlassi",
    "patients.complaintPlaceholder": "ex. Sensibilité au froid sur la 46 à la mastication",
    "patient.activeBadge": "DOSSIER ACTIF",
    "patient.cardiacAlert": "Risque cardiaque (adrénaline max 0,04 mg)",
    "patient.standardEpi": "Adrénaline standard",
    "patient.btnPatients": "Dossiers",
    "timer.etch": "15s",
    "timer.cure": "20s",
    "timer.stop": "Arrêt",
    "timer.etchTitle": "Mordançage acide 15 s",
    "timer.cureTitle": "Polymérisation 20s",
    "header.voiceTooltip": "Activer / désactiver la lecture vocale",
    "header.themeTooltip": "Mode clair / sombre",

    // Navigation Tabs
    "navgroup.practice": "Cabinet",
    "navgroup.chart": "Dossier clinique",
    "navgroup.assistant": "Assistant IA",
    "navgroup.reference": "Référence",
    "header.menu": "Menu",
    "nav.advisor": "Conseiller IA",
    "nav.patients": "Patients",
    "nav.odontogram": "Odontogramme",
    "nav.anesthesia": "Anesthésie",
    "nav.vision": "Radiographies",
    "nav.protocols": "Protocoles",
    "nav.soap": "Comptes-rendus",
    "nav.preferences": "Profil & préférences",
    "nav.treatment": "Plan de traitement",
    "nav.medications": "Médicaments",
    "nav.perio": "Parodontologie",
    "nav.labcases": "Laboratoire",

    // Advisor Chat
    "chat.headerTitle": "Conseiller dentaire senior",
    "chat.headerSubtitle": "Aide à la décision clinique • ne remplace pas votre jugement clinique",
    "chat.clearFeed": "Effacer la conversation",
    "chat.welcomeSender": "M.O.L.A.R.I.S CONSEILLER SENIOR",
    "chat.welcomeGreeting": "Bonjour Docteur. Sur quel acte ou quelle question diagnostique travaillons-nous aujourd'hui ?",
    "chat.welcomeLi1": "Échec d'anesthésie sur une molaire mandibulaire en pulpite irréversible ?",
    "chat.welcomeLi2": "Nombre maximal de cartouches chez un patient cardiaque, calcul à l'appui ?",
    "chat.welcomeLi3": "Coiffage pulpaire (MTA, silicate tricalcique) ou traitement endodontique ?",
    "chat.welcomeLi4": "Instrument fracturé, limite sous-gingivale profonde ou alvéolite ?",
    "chat.welcomeHint": "Écrivez votre question, dictez-la au micro ou choisissez un raccourci. Les réponses sont une aide à la décision et ne remplacent pas votre jugement clinique.",
    "chat.contextualFocus": "Dent ciblée :",
    "chat.removeFocus": "✕ Retirer",
    "chat.inputPlaceholder": "Posez votre question clinique (ex. « Anesthésie d'une 46 en pulpite ? » ou « DME ou élongation coronaire ? »)...",
    "chat.sendBtn": "Envoyer",
    "chat.micStatus": "● Micro actif... énoncez votre question clinique",
    "chat.micTooltip": "Dictée vocale mains libres",
    "chat.micUnsupported": "La reconnaissance vocale n'est pas prise en charge par ce navigateur",
    "chat.micErrorDenied": "Micro bloqué : autorisez le microphone pour ce site (icône cadenas dans la barre d’adresse), puis réessayez.",
    "chat.micErrorNoDevice": "Aucun microphone détecté : vérifiez qu’il est branché et sélectionné dans Windows.",
    "chat.micErrorNetwork": "La dictée vocale nécessite une connexion internet (le service de reconnaissance du navigateur est en ligne).",
    "chat.micErrorLanguage": "Ce navigateur ne reconnaît pas cette langue.",
    "chat.micErrorGeneric": "La dictée s’est arrêtée de façon inattendue. Réessayez.",
    "chat.clearConfirm": "Effacer définitivement la conversation avec le conseiller pour ce patient ?",
    "chat.resumed": "Conversation — {name} · depuis le {date}",
    "chat.voiceEnabled": "Lecture vocale activée, Docteur.",
    "chat.quickStarters": "Raccourcis au fauteuil",
    "chat.oneClick": "1-CLIC",
    "chat.starter1Title": "Dent en pulpite :",
    "chat.starter1Desc": "46 encore sensible au froid après une tronculaire à l'épine de Spix. Que faire ?",
    "chat.starter2Title": "Effraction pulpaire :",
    "chat.starter2Desc": "Saignement punctiforme lors de l'éviction carieuse. Coiffage direct ou traitement endodontique ?",
    "chat.starter3Title": "Limite sous-gingivale :",
    "chat.starter3Desc": "Remontée de marge (DME) ou élongation coronaire chirurgicale ?",
    "chat.starter4Title": "Instrument fracturé :",
    "chat.starter4Desc": "Lime NiTi 20/.04 fracturée au tiers apical du canal mésio-vestibulaire de la 36. Conduite à tenir ?",
    "chat.starter5Title": "Patient cardiaque :",
    "chat.starter5Desc": "Nombre maximal de cartouches : articaïne ou mépivacaïne ?",
    "chat.starter6Title": "Douleur Post-Op :",
    "chat.starter6Desc": "Douleur pulsatile 48h après endo. Prescription non morphinique ?",
    "chat.sidebarPrefTitle": "Mémoire du cabinet",
    "chat.sidebarDoc": "Praticien :",
    "chat.sidebarBonding": "Système adhésif :",
    "chat.sidebarRotary": "Limes rotatives :",
    "chat.sidebarImplant": "Système implantaire :",
    "chat.sidebarNotation": "Numérotation :",
    "chat.sidebarEditPrefs": "Modifier les préférences cliniques →",
    "chat.triageTitle": "Urgences au fauteuil",
    "chat.triageDesc": "Protocoles rapides : alvéolite, communication bucco-sinusienne, accident à l'hypochlorite de sodium, toxicité systémique des anesthésiques locaux.",
    "chat.triageBtn": "Voir les protocoles",
    "chat.doctorLabel": "Praticien",
    "chat.copy": "Copier",
    "chat.actionExecuted": "⚡ ACTION EXÉCUTÉE",
    "chat.alertPrefix": "⚠️ Alerte de l'assistant clinique :",
    "chat.commFailure": "⚠️ Impossible de joindre l'assistant clinique.",
    "chat.typing": "Analyse de la question et du dossier patient...",
    "chat.cleared": "Conversation effacée. M.O.L.A.R.I.S est prêt pour votre prochaine question.",

    // Odontogram
    "odonto.title": "Odontogramme clinique interactif",
    "odonto.activeChart": "Dossier actif",
    "odonto.subtitle": "Cliquez sur une dent pour l’examiner, noter caries, soins et traitements endodontiques, ou demander l’avis du conseiller IA.",
    "odonto.universalSystem": "Universel (#1-32)",
    "odonto.fdiSystem": "FDI (11-48)",
    "odonto.resetBtn": "Réinitialiser le schéma",
    "odonto.legendTitle": "Légende :",
    "odonto.legendSound": "Saine",
    "odonto.legendCaries": "Carie",
    "odonto.legendFilled": "Composite/Amalgame",
    "odonto.legendCrown": "Couronne/Bridge",
    "odonto.legendRct": "Traitement endo",
    "odonto.legendImplant": "Implant",
    "odonto.legendMissing": "Absente/Extraite",
    "odonto.maxillaryArch": "Arcade supérieure · maxillaire (droite → gauche)",
    "odonto.maxillarySub": "Quadrant 1 (18-11) • Quadrant 2 (21-28)",
    "odonto.occlusalPlane": "Plan d'Occlusion",
    "odonto.mandibularArch": "Arcade inférieure · mandibule (droite → gauche)",
    "odonto.mandibularSub": "Quadrant 4 (48-41) • Quadrant 3 (31-38)",
    "odonto.drawerTitle": "Examen de la dent",
    "odonto.consultBtn": "Demander l’avis du conseiller IA",
    "odonto.statusLabel": "État de la dent :",
    "odonto.statusSound": "Saine",
    "odonto.statusCaries": "Carie active",
    "odonto.statusRestoration": "Obturation (composite / amalgame)",
    "odonto.statusCrown": "Couronne / onlay",
    "odonto.statusRct": "Traitement endodontique",
    "odonto.statusImplant": "Implant",
    "odonto.statusMissing": "Absente / extraite",
    "odonto.surfacesLabel": "Faces concernées :",
    "odonto.surfaceOcclusal": "Occlusale / incisive",
    "odonto.surfaceMesial": "Mésiale",
    "odonto.surfaceDistal": "Distale",
    "odonto.surfaceBuccal": "Vestibulaire",
    "odonto.surfaceLingual": "Linguale / palatine",
    "odonto.notesLabel": "Observations cliniques et plan de traitement :",
    "odonto.notesPlaceholder": "ex: Carie disto-occlusale profonde, test froid négatif, percussion sensible...",
    "odonto.saveBtn": "Enregistrer",

    // Anesthesia Calculator
    "la.title": "Calculateur de dose d’anesthésique",
    "la.badge": "Calcul indicatif : vérifier le RCP",
    "la.subtitle": "Déterminez le seuil de sécurité en carpules selon le poids corporel et le seuil vasoconstricteur cardiaque.",
    "la.selectDrug": "Molécule anesthésique",
    "la.weightLabel": "Poids du patient (kg)",
    "la.cardiacLabel": "Risque cardiaque / ASA III+",
    "la.cardiacSub": "Limite stricte à 0,04 mg d'adrénaline",
    "la.deliveredLabel": "Carpules déjà injectées",
    "la.deliveredSub": "Comptabilisez vos injections en cours d'intervention",
    "la.incrementBtn": "+1 carpule injectée",
    "la.resetCarpulesBtn": "Remettre à zéro",
    "la.calcLimitTitle": "Limite de sécurité calculée",
    "la.calcLimitFactor": "Facteur : mg/kg de poids corporel",
    "la.resultMaxCarpules": "Carpules maximales",
    "la.resultMaxMg": "Dose maximale (mg)",
    "la.resultRemaining": "Carpules restantes",
    "la.resultLimiting": "Facteur limitant",
    "la.cardiacWarning": "Adrénaline plafonnée à 0,04 mg pour sécurité cardiovasculaire.",

    // Vision Diagnostics
    "vision.badge": "Gemini",
    "vision.dropPrompt": "Cliquer ou glisser-déposer une radiographie dentaire",
    "vision.dropSub": "JPEG, PNG ou WebP (export depuis votre logiciel de radio), jusqu’à 20 Mo",
    "vision.sampleA": "Cas A : rétro-alvéolaire 46",
    "vision.sampleADesc": "Radioclarté périapicale & carie profonde",
    "vision.sampleB": "Cas B : bitewing 26-27",
    "vision.sampleBDesc": "Lésion interproximale & alvéolyse",
    "vision.questionPlaceholder": "ex. « Alvéolyse autour de la 36 ? » ou « Atteinte de furcation sur la 46 ? »",
    "vision.analyzeBtn": "Analyser l'image",
    "vision.resultEmpty": "Importez une rétro-alvéolaire, un bitewing ou une photo clinique pour obtenir une seconde lecture.",
    "vision.evaluated": "Analysée",
    "vision.title": "Radiographies",
    "vision.subtitle": "Conservez les radiographies et photos du patient avec votre interprétation ; demandez une seconde lecture à l’IA (aide à la décision) si besoin.",
    "vision.samplesTitle": "Ou essayez un exemple pédagogique (non enregistré) :",
    "vision.sampleNote": "Exemple pédagogique : analysé mais jamais enregistré dans un dossier patient.",
    "vision.kind": "Type",
    "vision.kind.periapical": "Rétro-alvéolaire",
    "vision.kind.bitewing": "Bitewing",
    "vision.kind.panoramic": "Panoramique",
    "vision.kind.cbct": "Cone beam (coupe)",
    "vision.kind.photo": "Photo intra-orale",
    "vision.kind.other": "Autre",
    "vision.takenOn": "Date du cliché",
    "vision.tooth": "Dent (FDI, facultatif)",
    "vision.toothNone": "— Pas de dent précise —",
    "vision.interpretation": "Votre interprétation (facultatif)",
    "vision.questionLabel": "Question pour l’IA (facultatif)",
    "vision.saveBtn": "Enregistrer au dossier",
    "vision.saveAnalyzeBtn": "Enregistrer et analyser (IA)",
    "vision.analyzeSampleBtn": "Analyser l’exemple (IA)",
    "vision.resultTitle": "Lecture",
    "vision.fileTitle": "Dossier radiographique",
    "vision.count": "{n} image(s)",
    "vision.empty": "Aucune radiographie dans le dossier de ce patient.",
    "vision.selectPrompt": "Choisissez une radiographie dans le dossier ci-dessous, ou ajoutez-en une.",
    "vision.dentistTitle": "Votre interprétation",
    "vision.interpretationPlaceholder": "Votre lecture de ce cliché (conservée au dossier)",
    "vision.saveInterpretation": "Enregistrer l’interprétation",
    "vision.aiTitle": "Seconde lecture IA (à confirmer)",
    "vision.aiNone": "Pas de lecture IA pour ce cliché.",
    "vision.aiRun": "Demander une seconde lecture à l’IA",
    "vision.aiRerun": "Nouvelle lecture IA",
    "vision.aiAt": "Lue le {date}",
    "vision.saved": "Radiographie enregistrée au dossier",
    "vision.interpretationSaved": "Interprétation enregistrée",
    "vision.deleteBtn": "Supprimer (ajoutée par erreur)",
    "vision.deleteConfirm": "Supprimer cette radiographie ? Possible uniquement le jour de son ajout.",
    "vision.openFull": "Ouvrir en grand",
    "vision.noPatient": "Ouvrez d’abord un dossier patient.",
    "vision.dentistLabel": "Praticien",
    "vision.hasAi": "IA",
    "vision.copyBtn": "Copier la lecture",
    "vision.copied": "Copié !",
    "vision.noImage": "Importez ou sélectionnez d'abord une image dentaire.",
    "vision.analyzing": "Analyse de l’image en cours…",
    "vision.error": "⚠️ Erreur d’analyse de l’image :",
    "vision.connectError": "⚠️ Impossible de joindre le service d’analyse d’image :",
    "vision.sampleWatermarkA": "EXEMPLE RÉTRO-ALVÉOLAIRE : DENT 46 (CARIE ET LÉSION APICALE)",
    "vision.sampleWatermarkB": "EXEMPLE BITEWING : 26-27 DÉMINÉRALISATION PROXIMALE",

    // Clinical Playbooks
    "playbooks.title": "Protocoles cliniques et gestion des complications",
    "playbooks.subtitle": "Arbres décisionnels et fiches réflexes conçus pour consultation immédiate sous pression opératoire.",
    "playbooks.filterAll": "Tous",
    "playbooks.filterEndo": "Endodontie",
    "playbooks.filterSurgery": "Chirurgie orale",
    "playbooks.filterRestorative": "Dentisterie restauratrice",
    "playbooks.filterEmergencies": "Urgences médicales",
    "playbooks.askAdvisor": "Demander au conseiller",

    // SOAP Note Generator
    "soap.title": "Compte-rendu SOAP",
    "soap.subtitle": "Projet de compte-rendu (Subjectif, Objectif, Analyse, Plan) pour le patient actif, rédigé par l’IA : vous le relisez et le signez avant qu’il n’entre au dossier.",
    "soap.procedureLabel": "Acte réalisé",
    "soap.procedurePlaceholder": "ex. Traitement endodontique, restauration composite, extraction...",
    "soap.toothLabel": "Dent concernée",
    "soap.toothNone": "Général / non précisé",
    "soap.anesthesiaLabel": "Anesthésie locale",
    "soap.anesthesiaPlaceholder": "ex. 1 cartouche d'articaïne 4 % adrénalinée 1/100 000, tronculaire à l'épine de Spix",
    "soap.materialsLabel": "Matériaux et champ opératoire",
    "soap.materialsPlaceholder": "ex. Digue, matrice sectorielle, adhésif universel, composite...",
    "soap.detailsLabel": "Déroulement et suites opératoires",
    "soap.detailsPlaceholder": "ex. Acte sans complication, bien toléré. Consignes post-opératoires remises.",
    "soap.generateBtn": "Générer le compte-rendu",
    "soap.outputTitle": "Compte-rendu généré",
    "soap.copyBtn": "Copier le compte-rendu",
    "soap.copied": "Copié !",
    "soap.outputEmpty": "Renseignez l'acte puis générez le compte-rendu. Les éléments manquants apparaissent en « [à compléter] ».",
    "soap.generating": "Rédaction du compte-rendu SOAP...",
    "soap.error": "Erreur :",
    "soap.connectError": "Impossible de joindre le générateur de compte-rendu :",
    "soap.exampleProc": "Restauration directe au composite, classe II (OD)",
    "soap.exampleAnesthesia": "1 cartouche d'articaïne 4 % adrénalinée 1/100 000, tronculaire à l'épine de Spix, aspiration négative",
    "soap.exampleMaterials": "Digue, matrice sectorielle et coin, mordançage sélectif de l'émail (acide orthophosphorique 37 %, 15 s), adhésif universel photopolymérisé 20 s, composite A2 par incréments de 2 mm, contrôle occlusal au papier à articuler",
    "soap.exampleOutcome": "Acte sans complication, bien toléré. Alimentation molle jusqu'à la disparition de l'anesthésie. Consignes post-opératoires remises.",
    "soap.saveBtn": "Enregistrer dans le dossier",

    // Patient Manager
    "patients.title": "Dossiers patients",
    "patients.badge": "Base de données locale (ce PC)",
    "patients.subtitle": "Choisissez un patient pour ouvrir son dossier : schéma dentaire, anesthésie, ordonnances et comptes-rendus.",
    "patients.searchPlaceholder": "Rechercher par nom, n° de dossier, téléphone, n° CNAM ou antécédent...",
    "patients.addNew": "Nouveau patient",
    "patients.exportDb": "Exporter les dossiers (JSON)",
    "patients.importDb": "Importer des dossiers",
    "patients.backupDb": "Sauvegarde complète",
    "patients.backupTitle": "Télécharger une copie complète de la base (agenda, facturation, ordonnances, dossiers, réglages). À garder sur une clé USB ou dans le cloud.",
    "patients.selectAndTreat": "Ouvrir le dossier",
    "patients.activePatientBtn": "✓ Dossier ouvert",
    "patients.editChart": "Modifier le dossier",
    "patients.deleteRecord": "Supprimer le dossier",
    "patients.teethCharted": "Dents notées",
    "patients.carpulesLa": "Carpules AL",
    "patients.soapNotes": "Notes SOAP",
    "patients.modalAddTitle": "Nouveau patient",
    "patients.modalEditTitle": "Modifier le dossier patient",
    "patients.fullName": "Nom et prénom *",
    "patients.chartId": "N° de dossier *",
    "patients.age": "Âge",
    "patients.birthDate": "Date de naissance",
    "soap.defaultProcedure": "Soin dentaire",
    "soap.draftNotice": "Brouillon IA : relisez-le, corrigez-le, puis signez-le. Rien n’est enregistré au dossier avant la signature.",
    "soap.signBtn": "Signer et enregistrer au dossier",
    "soap.signed": "Compte-rendu signé et enregistré au dossier.",
    "soap.gapsConfirm": "Le compte-rendu contient encore {n} mention(s) « [à compléter] ». Complétez-les avant de signer, ou signez quand même ?",
    "soap.signConfirm": "Signer ce compte-rendu ? Une fois signé, il ne peut plus être modifié (seulement complété par un addendum).",
    "soap.historyTitle": "Comptes-rendus signés",
    "soap.historyEmpty": "Aucun compte-rendu signé pour ce patient.",
    "soap.addendumBtn": "Ajouter un addendum",
    "soap.addendumSave": "Signer l’addendum",
    "soap.addendumPrompt": "Addendum (correction ou complément, daté et signé) :",
    "soap.addendumLabel": "Addendum",
    "soap.signedBy": "Signé par {author} le {date}",
    "patients.gender": "Sexe",
    "patients.genderMale": "Masculin",
    "patients.genderFemale": "Féminin",
    "patients.genderOther": "Autre",
    "patients.weight": "Poids (kg) *",
    "patients.asa": "Classification ASA *",
    "patients.asa1": "ASA I - Patient sain sans pathologie",
    "patients.asa2": "ASA II - Atteinte systémique modérée",
    "patients.asa3": "ASA III - Atteinte systémique sévère",
    "patients.asa4": "ASA IV - Pathologie sévère avec menace vitale",
    "patients.cardiacRisk": "Risque cardiaque",
    "patients.cardiacRiskSub": "Plafonne strictement l'adrénaline à 0,04 mg",
    "patients.chiefComplaint": "Motif de consultation *",
    "patients.medicalAlerts": "Antécédents et alertes médicales",
    "patients.allergies": "Allergies connues",
    "patients.cancel": "Annuler",
    "patients.savePatient": "Enregistrer",
    "patients.chartIdLabel": "N° de dossier",
    "patients.chartIdPlaceholder": "Automatique (PT-2026-0001)",
    "patients.phoneLabel": "Téléphone (WhatsApp)",

    // Doctor Profile & Preferences
    "prefs.title": "Profil du praticien",
    "prefs.subtitle": "Personnalisez M.O.L.A.R.I.S pour adapter ses conseils à vos systèmes adhésifs, limes d'endodontie, implants et habitudes opératoires.",
    "prefs.doctorName": "Nom & Titre du Praticien :",
    "prefs.clinicName": "Nom du Cabinet / Clinique :",
    "prefs.degree": "Titre et spécialité",
    "prefs.school": "Faculté / formation",
    "prefs.bondingSystem": "Système adhésif préféré",
    "prefs.compositeSystem": "Composite préféré",
    "prefs.rotarySystem": "Système d’endodontie mécanisée",
    "prefs.implantSystem": "Système implantaire de référence",
    "prefs.notes": "Philosophie Clinique & Règles Particulières :",
    "prefs.saveBtn": "Enregistrer le profil",

    // Common Alerts & Feedback
    "common.copied": "Copié dans le presse-papiers !",
    "common.saved": "Enregistré avec succès !",
    "common.deleteConfirm": "Êtes-vous certain de vouloir supprimer ce dossier ?",
    "common.switchSuccess": "Dossier actif basculé sur :",
    "common.none": "Aucun",

    // Alertes de Sécurité Permanentes
    "safety.title": "Alertes de sécurité",
    "safety.critical": "CRITIQUE",
    "safety.warning": "AVERTISSEMENT",
    "safety.info": "INFO",

    // Plan de Traitement
    "treatment.title": "Plan de traitement",
    "treatment.subtitle": "Proposez, priorisez et suivez les actes par dent jusqu'à leur réalisation.",
    "treatment.addBtn": "Ajouter un acte",
    "treatment.modalTitle": "Ajouter un acte au plan de traitement",
    "treatment.tooth": "Dent (FDI)",
    "treatment.procedure": "Acte *",
    "treatment.procedurePlaceholder": "ex. Couronne, restauration composite, extraction",
    "treatment.cdtCode": "Code acte (nomenclature CNAM, facultatif)",
    "treatment.cdtCodePlaceholder": "Code de la nomenclature officielle",
    "treatment.priority": "Priorité",
    "treatment.priorityUrgent": "Urgent",
    "treatment.priorityHigh": "Élevée",
    "treatment.priorityRoutine": "Routine",
    "treatment.priorityElective": "Optionnel",
    "treatment.cost": "Coût estimé (DT)",
    "treatment.status": "Statut",
    "treatment.statusProposed": "Proposé",
    "treatment.statusAccepted": "Accepté",
    "treatment.statusInProgress": "En cours",
    "treatment.statusCompleted": "Terminé",
    "treatment.statusDeclined": "Refusé",
    "treatment.notes": "Notes",
    "treatment.save": "Enregistrer l'Acte",
    "treatment.cancel": "Annuler",
    "treatment.delete": "Supprimer",
    "treatment.empty": "Aucun acte planifié pour l'instant. Ajoutez le premier acte proposé.",
    "treatment.deleteConfirm": "Supprimer cet acte du plan de traitement ?",
    "treatment.errUpdate": "Impossible de modifier le statut :",
    "treatment.errDelete": "Impossible de supprimer l'acte :",
    "treatment.errSave": "Impossible d'enregistrer l'acte :",
    "treatment.errCost": "Montant non valide. Exemples : 120 · 120,500 · 1 250,000",
    "treatment.totalToDo": "Reste à réaliser :",
    "treatment.totalDone": "Réalisé :",
    "treatment.chartStillCaries": "La dent {tooth} est encore notée « Carie active » sur l’odontogramme.",
    "treatment.updateChart": "Mettre à jour la dent",
    "treatment.edit": "Modifier",
    "treatment.editTitle": "Modifier l’acte du plan de traitement",

    // Médicaments
    "meds.title": "Médicaments",
    "meds.subtitle": "Tenez à jour la liste des médicaments actifs qui alimente les vérifications d'interactions et d'allergies.",
    "meds.addBtn": "+ Ajouter un médicament",
    "meds.modalTitle": "Ajouter un médicament",
    "meds.name": "Nom du médicament *",
    "meds.dosage": "Posologie",
    "meds.frequency": "Fréquence",
    "meds.prescribedFor": "Prescrit pour",
    "meds.save": "Enregistrer",
    "meds.cancel": "Annuler",
    "meds.delete": "Supprimer",
    "meds.active": "Actif",
    "meds.inactive": "Inactif",
    "meds.activate": "Activer",
    "meds.deactivate": "Désactiver",
    "meds.empty": "Aucun médicament enregistré pour ce patient.",

    // Charte Parodontale
    "perio.title": "Charting parodontal",
    "perio.subtitle": "Cliquez sur une dent pour enregistrer les profondeurs de sondage sur 6 sites, la récession, le saignement, la mobilité et l'atteinte de furcation. L'enregistrement crée un nouveau relevé daté.",
    "perio.saveSnapshot": "Enregistrer le relevé",
    "perio.saved": "Relevé enregistré dans l'historique de la charte parodontale.",
    "perio.history": "Relevés précédents",
    "perio.noHistory": "Aucun relevé antérieur enregistré.",
    "perio.modalTitle": "Saisie parodontale — dent",
    "perio.mobility": "Mobilité",
    "perio.furcation": "Furcation",
    "perio.pocketDepth": "Profondeur de poche (mm)",
    "perio.recession": "Récession (mm)",
    "perio.bleeding": "Saignement",
    "perio.suppuration": "Suppuration",
    "perio.save": "Enregistrer",
    "perio.saveEntry": "Valider la dent",
    "perio.cancel": "Annuler",
    "perio.site.mesiobuccal": "Mésio-vestibulaire",
    "perio.site.buccal": "Vestibulaire",
    "perio.site.distobuccal": "Disto-vestibulaire",
    "perio.site.distolingual": "Disto-lingual",
    "perio.site.lingual": "Lingual",
    "perio.site.mesiolingual": "Mésio-lingual",
    "perio.maxDepth": "Profondeur max",

    // Cas de Laboratoire
    "labcases.title": "Travaux de laboratoire",
    "labcases.subtitle": "Suivez les couronnes/bridges, prothèses et appareils tout au long du circuit avec le laboratoire externe.",
    "labcases.addBtn": "+ Nouveau travail",
    "labcases.modalTitle": "Nouveau travail de laboratoire",
    "labcases.tooth": "Dent n°",
    "labcases.caseType": "Type de travail *",
    "labcases.material": "Matériau",
    "labcases.shade": "Teinte",
    "labcases.marginDesign": "Type de limite",
    "labcases.occlusalNotes": "Notes occlusales",
    "labcases.labName": "Laboratoire",
    "labcases.dueDate": "Date d'Échéance",
    "labcases.notes": "Notes",
    "labcases.status": "Statut",
    "labcases.save": "Enregistrer",
    "labcases.cancel": "Annuler",
    "labcases.delete": "Supprimer",
    "labcases.empty": "Aucun cas de laboratoire enregistré pour ce patient.",
    "labcases.statusPlanned": "Planifié",
    "labcases.statusSent": "Envoyé",
    "labcases.statusInLab": "Au laboratoire",
    "labcases.statusReturned": "Retourné",
    "labcases.statusSeated": "Posé",
    "labcases.statusRemake": "À refaire",
    "labcases.overdue": "En retard",
    "labcases.dueSoon": "Échéance proche",
    "labcases.edit": "Modifier",
    "labcases.editTitle": "Modifier le travail de laboratoire",

    // FR sweep (odontogram FDI chart, placeholders, messages)
    "header.patientSelectorTitle": "Cliquer pour changer ou gérer les patients",
    "header.openPatientsTitle": "Ouvrir les dossiers patients",
    "odonto.quadrant1": "Quadrant 1 · haut droit",
    "odonto.quadrant2": "Quadrant 2 · haut gauche",
    "odonto.quadrant3": "Quadrant 3 · bas gauche",
    "odonto.quadrant4": "Quadrant 4 · bas droit",
    "odonto.maxillaryArchShort": "Maxillaire",
    "odonto.mandibularArchShort": "Mandibule",
    "odonto.patientRight": "Droite du patient",
    "odonto.patientLeft": "Gauche du patient",
    "odonto.resetConfirm": "Effacer les constatations et notes des {n} dent(s) notée(s) de {name} ? Toutes les dents repassent « saines ». Cette action est définitive.",
    "patients.localDbBadge": "Base de données locale (ce PC)",
    "patients.cardiacRiskLabel": "Risque cardiaque",
    "patients.cardiacRiskHint": "Plafonne l’adrénaline à 0,04 mg",
    "patients.alertsPlaceholder": "ex. Hypertension, diabète",
    "patients.allergiesPlaceholder": "ex. Pénicilline, latex, aucune connue",
    "patients.importDone": "Import : {imported} dossier(s) ajouté(s), {skipped} déjà présent(s) (non modifiés), {invalid} invalide(s) (ignorés).",
    "patients.importFailed": "Échec de l’import :",
    "patients.demoBanner": "{n} dossier(s) d’exemple (patients fictifs fournis pour la démonstration) figurent encore dans vos dossiers. Supprimez-les maintenant que vous avez saisi vos propres patients.",
    "patients.demoBannerFirst": "Les {n} dossiers ci-dessous sont des exemples (patients fictifs) pour découvrir Molaris. Créez votre premier patient ; vous pourrez ensuite supprimer les exemples en un clic.",
    "patients.demoRemove": "Supprimer les dossiers d’exemple",
    "patients.demoBadge": "Exemple",
    "patients.demoRemoveConfirm": "Supprimer les dossiers d’exemple et tout ce qui y est enregistré ? Vos propres patients ne sont pas concernés.",
    "patients.moreHidden": "{n} autres dossiers non affichés : recherchez par nom, n° de dossier ou téléphone.",
    "patients.duplicateConfirm": "Un dossier existe déjà : {name} ({chart}, {phone}). Créer quand même un second dossier ?\n\nPour ouvrir le dossier existant, annulez et recherchez-le dans Patients.",
    "perio.notesPlaceholder": "Notes du relevé (facultatif)...",
    "perio.bleedingTitle": "Saignement au sondage",
    "perio.absentTitle": "Dent absente ou incluse sur l’odontogramme : non sondée",
    "perio.statTeeth": "dents sondées",
    "perio.statBop": "Saignement",
    "perio.statMean": "profondeur moyenne",
    "perio.statEmpty": "Aucun site relevé.",
    "perio.suppurationTitle": "Suppuration",
    "perio.errSave": "Impossible d’enregistrer le charting parodontal :",
    "meds.namePlaceholder": "ex. Acénocoumarol (Sintrom)",
    "meds.frequencyPlaceholder": "ex. 1 fois par jour",
    "meds.prescribedForPlaceholder": "ex. Fibrillation auriculaire",
    "labcases.typePlaceholder": "ex. Couronne, bridge, prothèse amovible",
    "labcases.materialPlaceholder": "ex. Zircone",
    "labcases.marginPlaceholder": "ex. Congé profond, limite en lame de couteau",
    "la.maxLabel": "Max :",
    "la.carpulesUnit": "carpules",
    "common.networkError": "Erreur de connexion avec le serveur local :",
    "common.saveError": "Enregistrement impossible :",
    "prefs.saved": "Préférences enregistrées. Le conseiller suivra désormais ces standards de pratique.",
    "odonto.statusUnerupted": "Non érupté",
    "odonto.legendUnerupted": "Non érupté",
    "odonto.primaryTeeth": "Dents temporaires",
    "odonto.primaryShown": "affichées",
    "odonto.primaryHidden": "masquées",
    "odonto.primaryShowBtn": "Afficher les dents temporaires",
    "odonto.primaryHideBtn": "Masquer les dents temporaires",
    "odonto.primaryAutoLink": "Revenir en automatique",
    "odonto.scrollHint": "Faites glisser horizontalement pour voir tout le schéma →",
    "odonto.primaryReason.child": "Automatique : patient de {age} ans",
    "odonto.primaryReason.recorded": "Automatique : une dent temporaire est renseignée",
    "odonto.primaryReason.adult": "Masquées par défaut chez l’adulte",
    "odonto.primaryReason.shown": "Affichées pour ce patient",
    "odonto.primaryReason.hidden": "Masquées pour ce patient",
    "odonto.primaryRowUpper": "Dents temporaires · haut",
    "odonto.primaryRowLower": "Dents temporaires · bas",
    "assistant.confirmPrompt": "Confirmer cette action ?",
    "assistant.confirm": "Confirmer",
    "assistant.cancel": "Annuler",
    "assistant.cancelled": "Annulé : rien n’a été enregistré.",
    "assistant.failed": "Non effectué :",
    "assistant.notAllowed": "Cette action n’est pas autorisée depuis la conversation.",
    "assistant.patientChanged": "Un autre dossier est ouvert : redemandez au conseiller pour ce patient.",
    "assistant.done.quote": "Devis brouillon {n} créé (voir Facturation).",
    "assistant.done.payment": "Règlement enregistré : reçu {n} (imprimable depuis Facturation).",
    "assistant.done.appointment": "Rendez-vous enregistré : {d}.",
    "assistant.done.tooth": "Odontogramme mis à jour.",
    "assistant.done.medication": "Médicament ajouté.",
    "assistant.done.switch": "Dossier ouvert.",
    "assistant.done.generic": "Fait.",
    "voice.title": "Voix du conseiller",
    "voice.subtitle": "La voix qui lit à haute voix les réponses du conseiller (bouton haut-parleur en haut). Mémorisée sur ce PC.",
    "voice.preview": "Écouter",
    "voice.natural": "naturelle",
    "voice.none": "Aucune voix disponible dans ce navigateur",
    "voice.hint": "Pour une voix naturelle, au rendu humain, ouvrez l’application dans Microsoft Edge (voix « naturelles » gratuites, connexion internet requise) ou Chrome.",
    "voice.sample": "Bonjour Docteur. Je peux lire vos rendez-vous, préparer un devis ou vous rappeler une posologie. Dites-moi ce dont vous avez besoin."
  }
};

// French anatomical tooth names map (Universal 1-32)
window.MOLARIS_FRENCH_TEETH = {
  1: { fdi: 18, name: "3ème Molaire Supérieure Droite (Dent de sagesse)", arch: "Maxillaire", type: "Molaire" },
  2: { fdi: 17, name: "2ème Molaire Supérieure Droite", arch: "Maxillaire", type: "Molaire" },
  3: { fdi: 16, name: "1ère Molaire Supérieure Droite", arch: "Maxillaire", type: "Molaire" },
  4: { fdi: 15, name: "2ème Prémolaire Supérieure Droite", arch: "Maxillaire", type: "Prémolaire" },
  5: { fdi: 14, name: "1ère Prémolaire Supérieure Droite", arch: "Maxillaire", type: "Prémolaire" },
  6: { fdi: 13, name: "Canine Supérieure Droite", arch: "Maxillaire", type: "Canine" },
  7: { fdi: 12, name: "Incisive Latérale Supérieure Droite", arch: "Maxillaire", type: "Incisive" },
  8: { fdi: 11, name: "Incisive Centrale Supérieure Droite", arch: "Maxillaire", type: "Incisive" },
  9: { fdi: 21, name: "Incisive Centrale Supérieure Gauche", arch: "Maxillaire", type: "Incisive" },
  10: { fdi: 22, name: "Incisive Latérale Supérieure Gauche", arch: "Maxillaire", type: "Incisive" },
  11: { fdi: 23, name: "Canine Supérieure Gauche", arch: "Maxillaire", type: "Canine" },
  12: { fdi: 24, name: "1ère Prémolaire Supérieure Gauche", arch: "Maxillaire", type: "Prémolaire" },
  13: { fdi: 25, name: "2ème Prémolaire Supérieure Gauche", arch: "Maxillaire", type: "Prémolaire" },
  14: { fdi: 26, name: "1ère Molaire Supérieure Gauche", arch: "Maxillaire", type: "Molaire" },
  15: { fdi: 27, name: "2ème Molaire Supérieure Gauche", arch: "Maxillaire", type: "Molaire" },
  16: { fdi: 28, name: "3ème Molaire Supérieure Gauche (Dent de sagesse)", arch: "Maxillaire", type: "Molaire" },
  17: { fdi: 38, name: "3ème Molaire Inférieure Gauche (Dent de sagesse)", arch: "Mandibulaire", type: "Molaire" },
  18: { fdi: 37, name: "2ème Molaire Inférieure Gauche", arch: "Mandibulaire", type: "Molaire" },
  19: { fdi: 36, name: "1ère Molaire Inférieure Gauche", arch: "Mandibulaire", type: "Molaire" },
  20: { fdi: 35, name: "2ème Prémolaire Inférieure Gauche", arch: "Mandibulaire", type: "Prémolaire" },
  21: { fdi: 34, name: "1ère Prémolaire Inférieure Gauche", arch: "Mandibulaire", type: "Prémolaire" },
  22: { fdi: 33, name: "Canine Inférieure Gauche", arch: "Mandibulaire", type: "Canine" },
  23: { fdi: 32, name: "Incisive Latérale Inférieure Gauche", arch: "Mandibulaire", type: "Incisive" },
  24: { fdi: 31, name: "Incisive Centrale Inférieure Gauche", arch: "Mandibulaire", type: "Incisive" },
  25: { fdi: 41, name: "Incisive Centrale Inférieure Droite", arch: "Mandibulaire", type: "Incisive" },
  26: { fdi: 42, name: "Incisive Latérale Inférieure Droite", arch: "Mandibulaire", type: "Incisive" },
  27: { fdi: 43, name: "Canine Inférieure Droite", arch: "Mandibulaire", type: "Canine" },
  28: { fdi: 44, name: "1ère Prémolaire Inférieure Droite", arch: "Mandibulaire", type: "Prémolaire" },
  29: { fdi: 45, name: "2ème Prémolaire Inférieure Droite", arch: "Mandibulaire", type: "Prémolaire" },
  30: { fdi: 46, name: "1ère Molaire Inférieure Droite", arch: "Mandibulaire", type: "Molaire" },
  31: { fdi: 47, name: "2ème Molaire Inférieure Droite", arch: "Mandibulaire", type: "Molaire" },
  32: { fdi: 48, name: "3ème Molaire Inférieure Droite (Dent de sagesse)", arch: "Mandibulaire", type: "Molaire" },
  // Primary teeth: the internal id is the FDI number (51-85).
  51: { fdi: 51, name: "Incisive centrale temporaire supérieure droite", arch: "Maxillaire", type: "Incisive temporaire" },
  52: { fdi: 52, name: "Incisive latérale temporaire supérieure droite", arch: "Maxillaire", type: "Incisive temporaire" },
  53: { fdi: 53, name: "Canine temporaire supérieure droite", arch: "Maxillaire", type: "Canine temporaire" },
  54: { fdi: 54, name: "1ère molaire temporaire supérieure droite", arch: "Maxillaire", type: "Molaire temporaire" },
  55: { fdi: 55, name: "2ème molaire temporaire supérieure droite", arch: "Maxillaire", type: "Molaire temporaire" },
  61: { fdi: 61, name: "Incisive centrale temporaire supérieure gauche", arch: "Maxillaire", type: "Incisive temporaire" },
  62: { fdi: 62, name: "Incisive latérale temporaire supérieure gauche", arch: "Maxillaire", type: "Incisive temporaire" },
  63: { fdi: 63, name: "Canine temporaire supérieure gauche", arch: "Maxillaire", type: "Canine temporaire" },
  64: { fdi: 64, name: "1ère molaire temporaire supérieure gauche", arch: "Maxillaire", type: "Molaire temporaire" },
  65: { fdi: 65, name: "2ème molaire temporaire supérieure gauche", arch: "Maxillaire", type: "Molaire temporaire" },
  71: { fdi: 71, name: "Incisive centrale temporaire inférieure gauche", arch: "Mandibulaire", type: "Incisive temporaire" },
  72: { fdi: 72, name: "Incisive latérale temporaire inférieure gauche", arch: "Mandibulaire", type: "Incisive temporaire" },
  73: { fdi: 73, name: "Canine temporaire inférieure gauche", arch: "Mandibulaire", type: "Canine temporaire" },
  74: { fdi: 74, name: "1ère molaire temporaire inférieure gauche", arch: "Mandibulaire", type: "Molaire temporaire" },
  75: { fdi: 75, name: "2ème molaire temporaire inférieure gauche", arch: "Mandibulaire", type: "Molaire temporaire" },
  81: { fdi: 81, name: "Incisive centrale temporaire inférieure droite", arch: "Mandibulaire", type: "Incisive temporaire" },
  82: { fdi: 82, name: "Incisive latérale temporaire inférieure droite", arch: "Mandibulaire", type: "Incisive temporaire" },
  83: { fdi: 83, name: "Canine temporaire inférieure droite", arch: "Mandibulaire", type: "Canine temporaire" },
  84: { fdi: 84, name: "1ère molaire temporaire inférieure droite", arch: "Mandibulaire", type: "Molaire temporaire" },
  85: { fdi: 85, name: "2ème molaire temporaire inférieure droite", arch: "Mandibulaire", type: "Molaire temporaire" }
};

// French Playbooks translations
window.MOLARIS_FRENCH_PROTOCOLS = [
  {
    id: 'hot-tooth',
    title: 'Dent chaude / pulpite aiguë sur molaire mandibulaire',
    category: 'Anesthésie et urgence',
    summary: 'Le taux d\'échec de l\'anesthésie tronculaire à l\'épine de Spix atteint 50 à 70% en cas de pulpite symptomatique irréversible.',
    steps: [
      '1. Spix standard + nerf buccal : 1 carpule de Lidocaïne 2% 1:100 000 ou Articaïne 4%.',
      '2. Infiltration complémentaire obligatoire : 1 carpule d\'Articaïne 4% 1:100 000 en vestibulaire en regard de la dent (diffuse à travers la corticale).',
      '3. Infiltration linguale : 0,5 carpule d\'Articaïne 4% pour bloquer le nerf mylo-hyoïdien.',
      '4. Si sensibilité persistante à l\'ouverture de chambre : Injection intraligamentaire (blanchiment requis, 0,2 ml par racine) ou intra-osseuse (X-Tip/Quicksleeper) à la mépivacaïne 3 % ou à la lidocaïne.',
      '5. Injection intra-pulpaire en dernier recours : Forte contre-pression avec aiguille courte 30G dans la corne pulpaire.'
    ]
  },
  {
    id: 'broken-instrument',
    title: 'Instrument rotatif fracturé dans le canal',
    category: 'Endodontie',
    summary: 'Protocole de gestion des instruments nickel-titane séparés au cours de la préparation canalaire.',
    steps: [
      '1. Arrêt immédiat : Ne forcez aucun autre instrument. Inondez le canal d\'EDTA 17%.',
      '2. Contrôle radiographique : Déterminez la localisation exacte (tiers coronaire, médian ou apical) et la courbure.',
      '3. Si tiers coronaire / médian rectiligne : Accès optique direct sous grossissement/microscope. Inserts ultrasonores dans le sens anti-horaire à faible puissance à sec.',
      '4. Systèmes d\'extraction : Système IRS, microtubes ou limes de Hedström (technique de tressage).',
      '5. Si apical à la courbure : Tentative de contournement (bypass) avec limes K manuelles pré-courbées #08 / #10 sous EDTA abondant. Si contourné, préparez et obturez en intégrant le fragment.',
      '6. Si bypass impossible et sans lésion périapicale : Obturer jusqu\'au fragment, informer le patient par écrit et surveiller ou adresser à un endodontiste.'
    ]
  },
  {
    id: 'dry-socket',
    title: 'Alvéolite sèche (ostéite alvéolaire)',
    category: 'Chirurgie orale',
    summary: 'Survient 2 à 5 jours après extraction suite à la lyse prématurée du caillot sanguin (fibrinolyse).',
    steps: [
      '1. Diagnostic : Douleur pulsatile insomniante irradiant vers l\'oreille/tempe, fétidité, alvéole vide à os nu, rebelle aux antalgiques habituels.',
      '2. Irrigation : Irriguer doucement avec du sérum physiologique tiède ou chlorhexidine 0,12%. NE PAS cureter les parois osseuses (extrêmement douloureux et retarde la cicatrisation).',
      '3. Pansement : Poser une mèche sans compression imprégnée d\'Alvéogyl ou pâte eugénol/iodoforme.',
      '4. Consignes au patient : Soulagement rapide (15-30 min). Ne pas fumer, ne pas aspirer avec une paille.',
      '5. Suivi : Remplacer ou retirer la mèche sous 24-48h. Poursuivre les bains de bouche tièdes doux.'
    ]
  },
  {
    id: 'class2-deep-margin',
    title: 'Remontée de marge cervicale sous-gingivale (DME)',
    category: 'Dentisterie restauratrice',
    summary: 'Élévation de la boîte proximale sous-gingivale avant restauration directe ou indirecte.',
    steps: [
      '1. Gestion gingivale : Contrôler le fluide créviculaire et le saignement avec ruban Téflon, fil de rétraction ou bistouri électrique.',
      '2. Matrice individualisée : Ajuster une matrice sectionnelle pour qu\'elle descende 1 mm sous la marge cavosurface sans déformation.',
      '3. Coin et renfort Téflon : Coin fermement inséré, calé avec du Téflon pour un plaquage parfait.',
      '4. Adhésion : Mordançage amélaire sélectif (15s) -> rinçage -> adhésif universel frotté 20s -> séchage doux -> photopolymérisation 20s.',
      '5. Couche de remontée : Incrément de 1 à 1,5 mm de composite fluide haute viscosité ou composite réchauffé. Polymériser avec guide d\'onde bien positionné.',
      '6. Contrôle : Sondage doux et cliché bitewing de contrôle pour vérifier l\'absence de surcontour et l\'étanchéité.'
    ]
  },
  {
    id: 'sinus-perforation',
    title: 'Communication bucco-sinusienne (CBS)',
    category: 'Chirurgie orale',
    summary: 'Gestion de l\'effraction du plancher sinusien lors de l\'extraction d\'une prémolaire ou molaire supérieure.',
    steps: [
      '1. Vérification : Examiner l\'apex extrait. Manœuvre de Valsalva douce (pincer le nez et souffler bouche ouverte) en observant si des bulles apparaissent dans l\'alvéole.',
      '2. Si perforation < 2 mm : Favoriser un caillot stable. Mèche de collagène ou éponge de gélatine + suture en croix (huit). Cicatrisation spontanée fréquente.',
      '3. Si perforation 2 à 5 mm : Bouchon de collagène ou membrane PRF suturée en huit. Antibioprophylaxie post-opératoire recommandée (HAS 2026) : amoxicilline 1 g 2 fois par jour pendant 5 jours ; en cas d’allergie avérée aux pénicillines, azithromycine 500 mg 1 fois par jour pendant 3 jours. + décongestionnant nasal.',
      '4. Si perforation > 5 mm : Fermeture chirurgicale par lambeau d\'avancement vestibulaire ou palatin. Si praticien non expérimenté, méchage, antibiothérapie et adressage urgent en chirurgie maxillo-faciale.',
      '5. Consignes sinusiennes impératives : Ne pas se moucher pendant 2 semaines, éternuer bouche grande ouverte, pas de paille, pas d\'instruments à vent.'
    ]
  }
];

window.molarisT = function(key, lang) {
  const currentLang = lang || (window.systemState && window.systemState.language) || 'en';
  const dict = window.MOLARIS_TRANSLATIONS[currentLang] || window.MOLARIS_TRANSLATIONS.en;
  return dict[key] || window.MOLARIS_TRANSLATIONS.en[key] || key;
};

/**
 * Main application language applicator
 */
window.applyMolarisLanguage = function(lang) {
  const isFr = lang === 'fr';
  const t = (k) => window.molarisT(k, lang);
  document.documentElement.lang = isFr ? 'fr' : 'en';

  // 1. Process all declarative elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });

  // 2. Comprehensive Header & Brand Updates
  const brandSub = document.querySelector('header .text-\\[10px\\].text-slate-500, header .text-\\[10px\\], header p');
  if (brandSub && brandSub.textContent.includes('Assistant')) brandSub.textContent = t('brand.subtitle');
  
  const cardiacBadgeText = document.querySelector('#header-cardiac-badge span:last-child');
  if (cardiacBadgeText) cardiacBadgeText.textContent = t('patient.cardiacAlert');

  const btnPatients = document.querySelector('#btn-open-patients-modal span');
  if (btnPatients) btnPatients.textContent = t('patient.btnPatients');

  const timerBtn15 = document.getElementById('timer-btn-15');
  if (timerBtn15) { timerBtn15.textContent = t('timer.etch'); timerBtn15.title = t('timer.etchTitle'); }
  const timerBtn20 = document.getElementById('timer-btn-20');
  if (timerBtn20) { timerBtn20.textContent = t('timer.cure'); timerBtn20.title = t('timer.cureTitle'); }
  const timerBtnStop = document.getElementById('timer-btn-stop');
  if (timerBtnStop) timerBtnStop.textContent = t('timer.stop');

  const voiceBtn = document.getElementById('voice-synthesis-btn');
  if (voiceBtn) voiceBtn.title = t('header.voiceTooltip');
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) themeBtn.title = t('header.themeTooltip');

  // 3. Navigation Tabs
  const navMap = [
    { id: 'nav-tab-advisor', key: 'nav.advisor' },
    { id: 'nav-tab-patients', key: 'nav.patients' },
    { id: 'nav-tab-odontogram', key: 'nav.odontogram' },
    { id: 'nav-tab-anesthesia', key: 'nav.anesthesia' },
    { id: 'nav-tab-vision', key: 'nav.vision' },
    { id: 'nav-tab-protocols', key: 'nav.protocols' },
    { id: 'nav-tab-soap', key: 'nav.soap' },
    { id: 'nav-tab-preferences', key: 'nav.preferences' }
  ];
  navMap.forEach(({ id, key }) => {
    const el = document.querySelector(`#${id} span`);
    if (el) el.textContent = t(key);
  });

  // 4. Advisor Chat Tab
  const advTitle = document.querySelector('#view-advisor h2');
  if (advTitle) advTitle.textContent = t('chat.headerTitle');
  const advSub = document.querySelector('#view-advisor header p, #view-advisor .border-b p');
  if (advSub) advSub.textContent = t('chat.headerSubtitle');
  const clearBtn = document.getElementById('clear-chat-btn');
  if (clearBtn) clearBtn.textContent = t('chat.clearFeed');
  const chatIn = document.getElementById('chat-input');
  if (chatIn) chatIn.placeholder = t('chat.inputPlaceholder');
  const sendBtnSpan = document.querySelector('#send-chat-btn span');
  if (sendBtnSpan) sendBtnSpan.textContent = t('chat.sendBtn');
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) micBtn.title = t('chat.micTooltip');
  const micStatus = document.getElementById('mic-status-label');
  if (micStatus) micStatus.textContent = t('chat.micStatus');

  // Welcome message and quick starters are translated through data-i18n.

  // Sidebar Practice Memory
  const sidePrefTitle = document.querySelector('#view-advisor aside h4, .lg\\:col-span-4 aside h4');
  if (sidePrefTitle) sidePrefTitle.textContent = t('chat.sidebarPrefTitle');
  const triageTitle = document.querySelector('#view-advisor aside .text-rose-600');
  if (triageTitle) triageTitle.textContent = t('chat.triageTitle');

  // 5. Odontogram Tab
  const oTitle = document.querySelector('#view-odontogram h2');
  if (oTitle) oTitle.textContent = t('odonto.title');
  const oSub = document.querySelector('#view-odontogram p');
  if (oSub) oSub.textContent = t('odonto.subtitle');
  const btnUniv = document.getElementById('btn-numbering-universal');
  if (btnUniv) btnUniv.textContent = t('odonto.universalSystem');
  const btnFdi = document.getElementById('btn-numbering-fdi');
  if (btnFdi) btnFdi.textContent = t('odonto.fdiSystem');
  const btnResetO = document.getElementById('reset-odontogram-btn');
  if (btnResetO) btnResetO.textContent = t('odonto.resetBtn');
  const archUpper = document.getElementById('arch-title-upper');
  if (archUpper) archUpper.textContent = t('odonto.maxillaryArch');
  const archLower = document.getElementById('arch-title-lower');
  if (archLower) archLower.textContent = t('odonto.mandibularArch');

  // Legend
  const legendSpan = document.querySelector('#view-odontogram .flex-wrap.items-center span.font-semibold');
  if (legendSpan) legendSpan.textContent = t('odonto.legendTitle');

  // Tooth Drawer
  const drawerHeader = document.querySelector('#tooth-detail-drawer h3');
  if (drawerHeader) drawerHeader.textContent = t('odonto.drawerTitle');
  const consultToothBtn = document.getElementById('btn-consult-on-tooth');
  if (consultToothBtn) consultToothBtn.textContent = t('odonto.consultBtn');
  const saveToothBtn = document.getElementById('btn-save-tooth-findings');
  if (saveToothBtn) saveToothBtn.textContent = t('odonto.saveBtn');
  const notesLabel = document.querySelector('#tooth-detail-drawer label');
  if (notesLabel) notesLabel.textContent = t('odonto.notesLabel');
  const notesArea = document.getElementById('tooth-notes-input');
  if (notesArea) notesArea.placeholder = t('odonto.notesPlaceholder');

  // Tooth status buttons in Odontogram drawer
  const statusBtns = document.querySelectorAll('.status-choice-btn');
  statusBtns.forEach(btn => {
    const st = btn.dataset.status;
    if (st === 'sound') btn.textContent = t('odonto.statusSound');
    else if (st === 'caries') btn.textContent = t('odonto.statusCaries');
    else if (st === 'restoration') btn.textContent = t('odonto.statusRestoration');
    else if (st === 'crown') btn.textContent = t('odonto.statusCrown');
    else if (st === 'rct') btn.textContent = t('odonto.statusRct');
    else if (st === 'implant') btn.textContent = t('odonto.statusImplant');
    else if (st === 'missing') btn.textContent = t('odonto.statusMissing');
    else if (st === 'unerupted') btn.textContent = t('odonto.statusUnerupted');
  });

  // Surface buttons
  const surfBtns = document.querySelectorAll('.surface-btn');
  surfBtns.forEach(btn => {
    const s = btn.dataset.surface;
    if (s === 'occlusal') btn.textContent = t('odonto.surfaceOcclusal');
    else if (s === 'mesial') btn.textContent = t('odonto.surfaceMesial');
    else if (s === 'distal') btn.textContent = t('odonto.surfaceDistal');
    else if (s === 'buccal') btn.textContent = t('odonto.surfaceBuccal');
    else if (s === 'lingual') btn.textContent = t('odonto.surfaceLingual');
  });

  // 6. Anesthesia Calculator Tab
  const laTitle = document.querySelector('#view-anesthesia h2');
  if (laTitle) laTitle.textContent = t('la.title');
  const laBadge = document.querySelector('#view-anesthesia .bg-teal-100');
  if (laBadge) laBadge.textContent = t('la.badge');
  const laSub = document.querySelector('#view-anesthesia p.text-slate-500');
  if (laSub) laSub.textContent = t('la.subtitle');
  const addCarpuleBtn = document.getElementById('btn-add-carpule');
  if (addCarpuleBtn) addCarpuleBtn.textContent = t('la.incrementBtn');
  const resetCarpulesBtn = document.getElementById('btn-reset-carpules');
  if (resetCarpulesBtn) resetCarpulesBtn.textContent = t('la.resetCarpulesBtn');

  // Anesthesia cards labels
  const laLabels = document.querySelectorAll('#view-anesthesia label, #view-anesthesia .text-xs.font-bold');
  laLabels.forEach(lbl => {
    const txt = lbl.textContent.trim();
    if (txt.includes('Select Local Anesthetic') || txt.includes('Sélectionner la Molécule')) lbl.textContent = t('la.selectDrug');
    else if (txt.includes('Patient Body Weight') || txt.includes('Poids Corporel')) lbl.textContent = t('la.weightLabel');
    else if (txt.includes('Carpules Delivered') || txt.includes('Carpules Déjà Injectées')) lbl.textContent = t('la.deliveredLabel');
  });

  // 7. Vision Tab: every label carries data-i18n / data-i18n-placeholder (handled above).

  // 8. Clinical Playbooks Tab
  const pTitle = document.querySelector('#view-protocols h2');
  if (pTitle) pTitle.textContent = t('playbooks.title');
  const pSub = document.querySelector('#view-protocols p');
  if (pSub) pSub.textContent = t('playbooks.subtitle');

  // Protocol filter buttons
  const filterBtns = document.querySelectorAll('.protocol-filter-btn');
  if (filterBtns.length >= 5) {
    filterBtns[0].textContent = t('playbooks.filterAll');
    filterBtns[1].textContent = t('playbooks.filterEndo');
    filterBtns[2].textContent = t('playbooks.filterSurgery');
    filterBtns[3].textContent = t('playbooks.filterRestorative');
    filterBtns[4].textContent = t('playbooks.filterEmergencies');
  }

  // 9. SOAP Note Tab
  const soapTitle = document.querySelector('#view-soap h2');
  if (soapTitle) soapTitle.textContent = t('soap.title');
  const soapSub = document.querySelector('#view-soap p');
  if (soapSub) soapSub.textContent = t('soap.subtitle');
  const genSoapSpan = document.querySelector('#generate-soap-btn span');
  if (genSoapSpan) genSoapSpan.textContent = t('soap.generateBtn');
  const copySoapBtn = document.getElementById('copy-soap-btn');
  if (copySoapBtn) copySoapBtn.textContent = t('soap.copyBtn');
  const saveSoapBtn = document.getElementById('save-soap-to-patient-btn');
  if (saveSoapBtn) saveSoapBtn.textContent = t('soap.saveBtn');
  const inProc = document.getElementById('soap-input-proc');
  if (inProc) inProc.placeholder = t('soap.procedurePlaceholder');
  const inDetails = document.getElementById('soap-input-outcome');
  if (inDetails) inDetails.placeholder = t('soap.detailsPlaceholder');
  const inAnesth = document.getElementById('soap-input-anesthesia');
  if (inAnesth) inAnesth.placeholder = t('soap.anesthesiaPlaceholder');
  const inMat = document.getElementById('soap-input-materials');
  if (inMat) inMat.placeholder = t('soap.materialsPlaceholder');
  const soapOutTitle = document.querySelector('#view-soap h3');
  if (soapOutTitle) soapOutTitle.textContent = t('soap.outputTitle');

  // 10. Patients View
  const patTitle = document.querySelector('#view-patients h2');
  if (patTitle) patTitle.textContent = t('patients.title');
  const patSub = document.querySelector('#view-patients p');
  if (patSub) patSub.textContent = t('patients.subtitle');
  const patSearch = document.getElementById('patient-search-input');
  if (patSearch) patSearch.placeholder = t('patients.searchPlaceholder');
  const btnCreateP = document.querySelector('#btn-create-patient span');
  if (btnCreateP) btnCreateP.textContent = t('patients.addNew');
  const btnExportDb = document.getElementById('btn-export-db');
  if (btnExportDb) btnExportDb.textContent = t('patients.exportDb');
  const btnImportDb = document.getElementById('btn-import-db');
  if (btnImportDb) btnImportDb.textContent = t('patients.importDb');

  // 12. Patient Modal Localization
  const modalLabels = document.querySelectorAll('#patient-form label');
  modalLabels.forEach(lbl => {
    const txt = lbl.textContent.trim();
    if (txt.includes('Full Patient Name') || txt.includes('Nom Complet')) lbl.textContent = t('patients.fullName');
    else if (txt.includes('Chart ID') || txt.includes('N° de Dossier')) lbl.textContent = t('patients.chartId');
    else if (txt.includes('Age') || txt.includes('Âge')) lbl.textContent = t('patients.age');
    else if (txt.includes('Gender') || txt.includes('Sexe')) lbl.textContent = t('patients.gender');
    else if (txt.includes('Weight') || txt.includes('Poids')) lbl.textContent = t('patients.weight');
    else if (txt.includes('ASA Physical') || txt.includes('Classification ASA')) lbl.textContent = t('patients.asa');
    else if (txt.includes('Chief Complaint') || txt.includes('Motif de Consultation')) lbl.textContent = t('patients.chiefComplaint');
    else if (txt.includes('Medical Alerts') || txt.includes('Antécédents')) lbl.textContent = t('patients.medicalAlerts');
    else if (txt.includes('Known Allergies') || txt.includes('Allergies Connues')) lbl.textContent = t('patients.allergies');
  });

  const genderSelect = document.getElementById('form-patient-gender');
  if (genderSelect) {
    const labels = { Male: 'patients.genderMale', Female: 'patients.genderFemale', Other: 'patients.genderOther' };
    [...genderSelect.options].forEach(o => { if (labels[o.value]) o.text = t(labels[o.value]); });
  }

  const asaSelect = document.getElementById('form-patient-asa');
  if (asaSelect && asaSelect.options.length >= 4) {
    asaSelect.options[0].text = t('patients.asa1');
    asaSelect.options[1].text = t('patients.asa2');
    asaSelect.options[2].text = t('patients.asa3');
    asaSelect.options[3].text = t('patients.asa4');
  }

  const cancelModalBtn = document.getElementById('btn-cancel-modal-patient');
  if (cancelModalBtn) cancelModalBtn.textContent = t('patients.cancel');
  const saveModalBtn = document.querySelector('#patient-form button[type="submit"]');
  if (saveModalBtn) saveModalBtn.textContent = t('patients.savePatient');

  // Trigger dynamic component updates
  if (typeof window.renderOdontogram === 'function' && window.systemState && Array.isArray(window.systemState.teethData) && window.systemState.teethData.length > 0) {
    window.renderOdontogram();
  }
  if (typeof window.renderPatientsGrid === 'function' && window.systemState && Array.isArray(window.systemState.patients) && window.systemState.patients.length > 0) {
    window.renderPatientsGrid();
  }
  if (typeof window.recalculateLA === 'function') {
    window.recalculateLA();
  }
  if (typeof window.refreshProtocolsView === 'function') {
    window.refreshProtocolsView();
  }
};
