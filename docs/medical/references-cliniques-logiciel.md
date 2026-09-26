# Références cliniques intégrées au logiciel

Chaque chiffre clinique que Molaris affiche ou propose, avec sa source. À relire par le
praticien référent ; toute mise à jour d'une source doit être reportée ici **et** dans le code
indiqué.

## Quelle référence pour la Tunisie ?

Recherche faite en septembre 2026 :

- **Pas de recommandation tunisienne sur la prescription en médecine dentaire.** L'INEAS
  (Instance nationale de l'évaluation et de l'accréditation en santé) publie 35 guides de
  pratique clinique, aucun sur la médecine dentaire, les antibiotiques au cabinet ou
  l'endocardite. La STPI (Société tunisienne de pathologie infectieuse) publie des
  recommandations d'antibiothérapie (infections urinaires, ostéo-articulaires, VIH,
  hépatites…), aucune sur les infections bucco-dentaires.
- **En pratique, les références françaises** (enseignement et exercice en français) : la
  recommandation ANSM de 2011, remplacée par la **recommandation HAS 2026**.
- **Seule référence tunisienne dentaire :** le consensus de Sfax (Cardiologie Tunisienne,
  2016) pour l'antibioprophylaxie de l'endocardite.

Choix retenu : **HAS 2026 = référence principale** des antibiotiques ; OMS (AWaRe 2022) en
complément (classement « Watch », antalgiques) ; AAPD pour l'anesthésie de l'enfant.

⚠️ À VÉRIFIER auprès du Conseil de l'Ordre des médecins dentistes de Tunisie ou d'une
faculté (Monastir) : adoption officielle de la recommandation HAS 2026.

## Antibiotiques — HAS 2026 (référence principale)

**Source :** Haute Autorité de Santé, *Prescription des antibiotiques en pratique
bucco-dentaire*, recommandation de bonne pratique, juillet 2026 (publiée le 14 septembre 2026),
tableaux 14 (adulte) et 15 (enfant), section 5.2.
https://www.has-sante.fr/jcms/p_3525810/fr/prescription-des-antibiotiques-en-pratique-bucco-dentaire

| Point | Texte HAS | Où dans Molaris |
|---|---|---|
| Principe | Douleurs dentaires majoritairement inflammatoires : geste étiologique + antalgiques. Antibiothérapie toujours en complément d'un geste local (drainage, traitement de la cause). | Rappel sur toute ordonnance avec antibiotique ; conseiller IA |
| Indications (parodontite apicale aiguë, abcès apical/parodontal/endo-parodontal, flare-up, péri-implantite, alvéolite suppurée) | Patient à haut risque d'endocardite infectieuse ou à risque infectieux augmenté ; signes d'extension locale (suppuration), régionale (tuméfaction, trismus) ou systémique (lymphadénopathie, fièvre) ; possiblement si un geste local ne peut pas être réalisé | Idem |
| Adulte, 1re intention | Amoxicilline 1 g, 3 fois par jour, 3 jours (prolonger de 2 jours si persistance) | Liste de départ, données de démonstration, rappel |
| Allergie avérée aux pénicillines | Clarithromycine 500 mg × 2/j (hors AMM), azithromycine 500 mg × 1/j 3 jours, pristinamycine 1 g × 2/j (hors AMM) | Liste de départ (azithromycine seulement, hors AMM exclus) ; avertissement si prescrit |
| Maladie parodontale nécrosante | Métronidazole 500 mg, 3 fois par jour, 3 jours | Liste de départ |
| Enfant | Amoxicilline 50 mg/kg/j, sans dépasser 3 g/j, en 3 prises, 3 jours ; pas de comprimés ou gélules à avaler avant 6 ans | Repère calculé selon le poids sur l'ordonnance ; alerte avant 6 ans |
| Réévaluation | À 3 jours (consultation, téléconsultation ou téléphone) | Rappel |
| Communication bucco-sinusienne | Antibioprophylaxie post-opératoire recommandée : amoxicilline 1 g × 2/j, 5 jours ; allergie : azithromycine 500 mg × 1/j, 3 jours (ou clarithromycine, pristinamycine) | Protocole « Communication bucco-sinusienne » |

Code : `src/features/prescriptions/safety.ts`, `src/features/prescriptions/starter.ts`,
`src/features/prescriptions/demo.ts`, `src/ai/system-prompt.ts`, protocoles
(`public/i18n/core.js`, `src/domain/dental-data.ts`).

## Antibiotiques — OMS (complément)

**Source :** *The WHO AWaRe (Access, Watch, Reserve) antibiotic book*, OMS, 2022.
https://www.who.int/publications/i/item/9789240062382

- Azithromycine et clarithromycine appartiennent au groupe « Watch » (risque de résistance
  plus élevé) : l'avertissement de l'ordonnance le rappelle.
- Antalgiques de la liste de départ (le texte HAS ne traite que des antibiotiques) :
  ibuprofène 200–400 mg toutes les 6–8 h (max 2,4 g/j) ; paracétamol 500 mg–1 g toutes les
  4–6 h (max 4 g/j, 2 g/j si atteinte hépatique).

## Anesthésie locale chez l'enfant — AAPD

**Source :** American Academy of Pediatric Dentistry, *Use of local anesthesia for pediatric
dental patients* (Best Practices, Reference Manual), tableau des doses maximales.
https://www.aapd.org/globalassets/media/policies_guidelines/bp_localanesthesia.pdf

Appliqué avant 18 ans :

| Molécule | Dose maximale | Restriction d'âge |
|---|---|---|
| Lidocaïne | 4,4 mg/kg (le fabricant indique 7 mg/kg ; l'AAPD retient 4,4) | — |
| Mépivacaïne | 4,4 mg/kg | — |
| Articaïne | 7 mg/kg | Non recommandée avant 4 ans |
| Bupivacaïne | 1,3 mg/kg | Non recommandée avant 12 ans |

Code : `src/domain/anesthesia-calc.ts` (`PEDIATRIC_MG_PER_KG`, `PEDIATRIC_LA_AGE`).

⚠️ À VÉRIFIER : choix de 18 ans comme limite (l'AAPD parle de « pediatric dental patients »),
et concordance avec la pratique tunisienne.

## Autres références

- Antibioprophylaxie de l'endocardite : ESC 2023 et consensus tunisien de Sfax (2016) — carte
  « Anesthésie » et conseiller IA. (La HAS a une recommandation 2024 dédiée, non reprise.)
- Adrénaline chez le patient cardiaque : plafond de 0,04 mg par séance — calculateur.
