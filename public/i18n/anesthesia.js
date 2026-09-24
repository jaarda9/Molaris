// Clinical reference cards of the anesthesia tab. Content follows
// docs/medical/revue-contenu-clinique.md (§4.3, §4.5): ESC 2023 + Tunisian consensus (Sfax 2016),
// drugs by DCI, no clindamycin by default. Doses are to be validated against the local SmPC.
Molaris.i18n.register({
  en: {
    'la.form.weight': 'Patient weight',
    'la.form.cardiac': 'Cardiac risk / ASA III+',
    'la.form.delivered': 'Carpules delivered so far',
    'la.form.deliveredHint': 'Keep track as you inject during the appointment',
    'la.result.title': 'Calculated safe limit',
    'la.result.maxCarpules': 'Safe max carpules',
    'la.result.maxMg': 'Max anesthetic (mg)',
    'la.result.remaining': 'Remaining (carpules)',

    'la.prophy.title': 'Infective endocarditis: antibiotic prophylaxis',
    'la.prophy.sources': 'References: ESC 2023 and the Tunisian consensus (Sfax, 2016).',
    'la.prophy.highRiskTitle': 'High-risk patients',
    'la.prophy.highRisk1': 'Prosthetic valve (including TAVI) or valve repair material',
    'la.prophy.highRisk2': 'Previous infective endocarditis',
    'la.prophy.highRisk3': 'Some congenital heart diseases (check the risk class)',
    'la.prophy.highRisk4': 'Tunisia (Sfax consensus): regurgitant rheumatic valve disease (aortic or mitral regurgitation)',
    'la.prophy.adultTitle': 'Single dose, 30–60 min before the procedure',
    'la.prophy.adultDose': 'Amoxicillin 2 g orally (child: 50 mg/kg)',
    'la.prophy.allergyTitle': 'Penicillin allergy',
    'la.prophy.allergyDose': 'Cefalexin 2 g (no severe immediate allergy), azithromycin or clarithromycin 500 mg, or doxycycline 100 mg',
    'la.prophy.clindaNote': 'Clindamycin is no longer recommended (ESC 2023); its oral form was reported unavailable in Tunisia.',
    'la.prophy.validate': 'To be validated by the dentist: check current guidance and availability in Tunisia.',

    'la.analgesia.title': 'Post-operative pain (non-opioid)',
    'la.analgesia.mildTitle': 'Mild to moderate pain',
    'la.analgesia.mild': 'Ibuprofen 400 mg, repeated if needed within the SmPC interval and maximum daily dose.',
    'la.analgesia.severeTitle': 'More intense pain',
    'la.analgesia.severe': 'Ibuprofen 400–600 mg combined with paracetamol 1 g, without exceeding either maximum daily dose.',
    'la.analgesia.contra': 'NSAIDs: avoid with anticoagulants/antiplatelets, kidney failure, peptic ulcer, pregnancy. Paracetamol: maximum daily dose, liver disease.',
    'la.analgesia.validate': 'Doses to be validated against the SmPC of the products available in Tunisia.'
  },
  fr: {
    'la.form.weight': 'Poids du patient',
    'la.form.cardiac': 'Risque cardiaque / ASA III+',
    'la.form.delivered': 'Carpules déjà injectées',
    'la.form.deliveredHint': 'À mettre à jour au fil des injections pendant la séance',
    'la.result.title': 'Limite de sécurité calculée',
    'la.result.maxCarpules': 'Carpules maximales',
    'la.result.maxMg': 'Dose maximale (mg)',
    'la.result.remaining': 'Restant (carpules)',

    'la.prophy.title': "Antibioprophylaxie de l'endocardite infectieuse",
    'la.prophy.sources': 'Références : ESC 2023 et consensus tunisien (Sfax, 2016).',
    'la.prophy.highRiskTitle': 'Patients à haut risque',
    'la.prophy.highRisk1': 'Prothèse valvulaire (y compris TAVI) ou matériel de réparation valvulaire',
    'la.prophy.highRisk2': "Antécédent d'endocardite infectieuse",
    'la.prophy.highRisk3': 'Certaines cardiopathies congénitales (vérifier la classe de risque)',
    'la.prophy.highRisk4': 'En Tunisie (consensus de Sfax) : valvulopathies rhumatismales fuyantes (insuffisance aortique ou mitrale)',
    'la.prophy.adultTitle': "Dose unique, 30 à 60 min avant l'acte",
    'la.prophy.adultDose': 'Amoxicilline 2 g per os (enfant : 50 mg/kg)',
    'la.prophy.allergyTitle': 'Allergie aux pénicillines',
    'la.prophy.allergyDose': 'Céfalexine 2 g (hors allergie immédiate grave), azithromycine ou clarithromycine 500 mg, ou doxycycline 100 mg',
    'la.prophy.clindaNote': "La clindamycine n'est plus recommandée (ESC 2023) ; sa forme orale a été signalée indisponible en Tunisie.",
    'la.prophy.validate': 'À valider par le praticien : vérifier la recommandation en vigueur et la disponibilité en Tunisie.',

    'la.analgesia.title': 'Douleur post-opératoire (antalgie non opioïde)',
    'la.analgesia.mildTitle': 'Douleur légère à modérée',
    'la.analgesia.mild': "Ibuprofène 400 mg, à renouveler si besoin en respectant l'intervalle et la dose maximale journalière du RCP.",
    'la.analgesia.severeTitle': 'Douleur plus intense',
    'la.analgesia.severe': "Ibuprofène 400 à 600 mg associé au paracétamol 1 g, sans dépasser la dose maximale journalière de chacun.",
    'la.analgesia.contra': 'AINS : éviter sous anticoagulants/antiagrégants, insuffisance rénale, ulcère, grossesse. Paracétamol : dose maximale journalière, atteinte hépatique.',
    'la.analgesia.validate': 'Posologies à valider selon le RCP des produits disponibles en Tunisie.'
  }
});
