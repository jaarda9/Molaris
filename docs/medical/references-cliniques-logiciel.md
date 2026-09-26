# Références cliniques intégrées au logiciel

Chaque chiffre clinique que Molaris affiche ou propose, avec sa source. À relire par le
praticien référent ; toute mise à jour d'une source doit être reportée ici **et** dans le code
indiqué.

## Antibiotiques — OMS, guide AWaRe 2022

**Source :** *The WHO AWaRe (Access, Watch, Reserve) antibiotic book*, Organisation mondiale de
la Santé, 2022, chapitre 8 « Oral and dental infections » (pages adulte et enfant).
https://www.who.int/publications/i/item/9789240062382

Repris dans le logiciel :

| Point | Texte OMS | Où |
|---|---|---|
| Indication | Pas d'antibiotique pour la douleur dentaire, la pulpite ni avant un acte courant ; le traitement est le geste dentaire (drainage, extraction). Antibiotique en complément seulement si infection qui s'étend avec signes généraux (tuméfaction faciale, trismus, fièvre ≥ 38 °C, tachycardie), immunodépression sévère ou diabète non équilibré. | Rappel « Repères OMS » sur toute ordonnance contenant un antibiotique ; consignes du conseiller IA |
| Adulte, 1er choix (groupe Access) | Amoxicilline 500 mg toutes les 8 h, ou phénoxyméthylpénicilline 500 mg (800 000 UI) toutes les 6 h, par voie orale | Liste de départ ; données de démonstration (amoxicilline) |
| Durée | 3 jours si la cause est traitée (drainage/geste), sinon 5 jours ; réévaluer avant la fin | Idem |
| Enfant | Amoxicilline 80–90 mg/kg/jour ; tranches de poids : 3–<6 kg 250 mg/12 h ; 6–<10 kg 375 mg/12 h ; 10–<15 kg 500 mg/12 h ; 15–<20 kg 750 mg/12 h ; ≥ 20 kg 500 mg/8 h ou 1 g/12 h | Repère affiché sur l'ordonnance d'un enfant (le logiciel ne pré-remplit aucune dose pédiatrique) |
| Groupe « Watch » | Azithromycine, clarithromycine : risque de résistance plus élevé | Avertissement sur l'ordonnance |
| Antalgiques (adulte) | Ibuprofène 200–400 mg toutes les 6–8 h (max 2,4 g/j) ; paracétamol 500 mg–1 g toutes les 4–6 h (max 4 g/j, 2 g/j si atteinte hépatique) | Liste de départ |

Non repris faute de posologie dans le chapitre dentaire OMS : métronidazole (cité comme option
pour les infections des tissus mous), alternatives en cas d'allergie aux pénicillines. Le
praticien les ajoute lui-même. Code : `src/features/prescriptions/starter.ts`,
`src/features/prescriptions/safety.ts`, `src/ai/system-prompt.ts`.

## Anesthésie locale chez l'enfant — AAPD

**Source :** American Academy of Pediatric Dentistry, *Use of local anesthesia for pediatric
dental patients* (Best Practices, Reference Manual), tableau des doses maximales.
https://www.aapd.org/globalassets/media/policies_guidelines/bp_localanesthesia.pdf

L'OMS ne fixe pas de dose maximale d'anesthésique dentaire ; la référence pédiatrique
reconnue est l'AAPD. Appliqué avant 18 ans :

| Molécule | Dose maximale | Restriction d'âge |
|---|---|---|
| Lidocaïne | 4,4 mg/kg (le fabricant indique 7 mg/kg ; l'AAPD retient 4,4) | — |
| Mépivacaïne | 4,4 mg/kg | — |
| Articaïne | 7 mg/kg | Non recommandée avant 4 ans |
| Bupivacaïne | 1,3 mg/kg | Non recommandée avant 12 ans |

Code : `src/domain/anesthesia-calc.ts` (`PEDIATRIC_MG_PER_KG`, `PEDIATRIC_LA_AGE`).

⚠️ À VÉRIFIER : choix de 18 ans comme limite (l'AAPD parle de « pediatric dental patients »),
et concordance avec la pratique tunisienne.

## Autres références déjà présentes

- Antibioprophylaxie de l'endocardite : ESC 2023 et consensus tunisien de Sfax (2016) — carte
  « Anesthésie » et consignes du conseiller IA.
- Adrénaline chez le patient cardiaque : plafond de 0,04 mg par séance — calculateur.
