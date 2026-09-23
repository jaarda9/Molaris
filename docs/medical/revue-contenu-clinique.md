# Revue du contenu clinique de Molaris pour la Tunisie

> **Statut : BROUILLON — recommandations à valider par un médecin dentiste référent et, pour les
> médicaments, par un pharmacien.** Ce document propose des changements ; il ne modifie aucun code.
> Les fichiers revus sont partagés (`src/ai/*`, `src/domain/*`) : les changements sont à faire par
> l'intégrateur.

Fichiers revus (lecture seule, état du 23/09/2026) :
- `src/ai/system-prompt.ts` — consigne système de l'assistant IA (« M.O.L.A.R.I.S »)
- `src/domain/dental-data.ts` — dents, anesthésiques, protocoles rapides
- `src/domain/clinical-safety.ts` — alertes interactions, allergies, antibioprophylaxie

Règle suivie : aucune dose, aucun code, aucune disponibilité de médicament n'est affirmée sans
source. Tout ce qui dépend du marché tunisien est marqué **⚠️ À VÉRIFIER** avec l'interlocuteur.

---

## 1. Synthèse — les 10 changements prioritaires

| # | Changement | Fichier | Gravité |
|---|---|---|---|
| 1 | Retirer les **codes CDT américains** (D0140, D2392…) de la consigne IA ; ne proposer aucun code tant que la nomenclature tunisienne (NGAP, lettre-clé D) n'est pas intégrée | system-prompt | Haute |
| 2 | Remplacer le cadre **AHA/ADA** de l'antibioprophylaxie par l'ESC 2023 + le consensus tunisien (Sfax, 2016), et ajouter la **valvulopathie rhumatismale** aux mots-clés | clinical-safety, system-prompt | Haute |
| 3 | Ne plus proposer la **clindamycine** comme alternative par défaut en cas d'allergie à la pénicilline (abandonnée par l'ESC 2023 pour la prophylaxie ; forme orale signalée indisponible en Tunisie en 2016) | clinical-safety, system-prompt | Haute |
| 4 | Faire répondre l'IA **en français**, avec les **DCI** et la terminologie française (paracétamol, adrénaline), et rappeler qu'elle est une **aide à la décision** | system-prompt | Haute |
| 5 | Supprimer le ton « elite / board-certified / authoritative / decisive » et le verbe « calculate exact maximum dosages » ; exiger d'afficher le calcul et de renvoyer au RCP | system-prompt | Haute |
| 6 | Revoir la liste d'**anesthésiques** : concentrations d'adrénaline et volumes de cartouche du marché tunisien, marques américaines (Septocaine, Carbocaine, Marcaine) → DCI + marque locale saisie par le cabinet ; bupivacaïne à retirer si non disponible | dental-data | Haute |
| 7 | Ajouter la **denture temporaire** (FDI 51–85) : le bulletin de soins CNAM la comporte ; la liste des actes CNAM a des codes propres aux enfants de moins de 14 ans | dental-data | Haute |
| 8 | Traduire les noms de dents, surfaces et **protocoles rapides** en français ; adapter les produits cités (Augmentin 875 mg, oxymétazoline, Alveogyl, X-Tip) | dental-data | Moyenne |
| 9 | Compléter les listes d'interactions : AINS et anticoagulants manquants (DCI), **antidépresseurs tricycliques et bêtabloquants non sélectifs** avec l'adrénaline ; revoir l'alerte IMAO | clinical-safety | Moyenne |
| 10 | Ajouter des alertes de terrain fréquentes : **radiothérapie tête et cou**, antiangiogéniques (ostéonécrose), grossesse, AVK → contrôle de l'INR | clinical-safety | Moyenne |

---

## 2. `src/ai/system-prompt.ts`

### 2.1 Constats

| Passage actuel | Problème pour la Tunisie |
|---|---|
| « elite personal AI Senior Dental Advisor… seasoned, **board-certified** senior dentist… authoritative… **decisive** » | Cadre américain (« board-certified » n'existe pas en Tunisie). Surtout, le ton « décisif » pousse le modèle à affirmer, contraire au principe Molaris : **aide à la décision, jamais diagnostic**. |
| « Grounded in current **ADA**, ESE, ITI, **AAP**, and **AACD** guidelines » | ADA/AACD : références américaines. Absence des références françaises et tunisiennes que les praticiens tunisiens utilisent (formation francophone). |
| « **Calculate exact maximum dosages** (carpules) of Lidocaine 2% 1:100k, Articaine 4% 1:100k, Mepivacaine 3%, Bupivacaine 0.5% » | Produits et concentrations du marché américain ; un LLM ne doit pas « calculer exactement » sans montrer le calcul ; Molaris a déjà un calculateur déterministe (`anesthesia-calc.ts`) : l'IA devrait y renvoyer. |
| « epinephrine limits for cardiac patients (**ASA III/IV**: max 0.04 mg epi = 2 carpules of 1:100k) » | La limite de 0,04 mg d'adrénaline est classiquement citée pour le **patient cardiaque** ; la rattacher à « ASA III/IV » en général est trop large et imprécis. « 2 carpules » n'est vrai que pour des cartouches de 1,8 ml à 1/100 000 (0,018 mg) ; à 1/80 000 (cartouche 1,8 ml = 0,0225 mg) cela fait moins de 2 cartouches ; à 1/200 000 davantage. |
| « Amoxicillin, **Clindamycin** alternatives, Azithromycin » | Voir §4.3 : clindamycine abandonnée par l'ESC 2023 pour l'antibioprophylaxie ; disponibilité orale en Tunisie à vérifier. |
| « staggered Ibuprofen 600mg + **Acetaminophen** 500mg-1000mg » | Terminologie américaine (« acetaminophen » = **paracétamol**). Doses sans rappel des doses maximales ni des contre-indications (AINS : anticoagulants, insuffisance rénale, ulcère, grossesse…). |
| « SOAP Notes & **CDT Coding** … (D0140, D2392, D3330, D2740, D7140) » | **Codes américains sans valeur en Tunisie.** La CNAM exige le code de la **Nomenclature générale des actes professionnels** et la cotation par lettre-clé (voir `nomenclature-cnam.md`). Un code CDT sur une note pourrait être recopié sur un bulletin de soins. |
| « Address the user … as "Doctor" » | Acceptable ; en français : « Docteur » / « cher confrère ». |
| Aucune consigne de langue | Les réponses risquent d'être en anglais alors que l'interface clinique est en français. |

### 2.2 Proposition de consigne (à adapter par l'intégrateur)

Principes à inscrire dans la nouvelle consigne (texte indicatif, en français) :

1. **Rôle** : « Tu es un assistant d'aide à la décision clinique pour des médecins dentistes exerçant
   en Tunisie. Tu ne poses pas de diagnostic et ne prescris pas : tu proposes des éléments de
   réflexion que le praticien vérifie. Signale clairement tes incertitudes et quand un avis
   spécialisé ou un bilan médical est nécessaire. »
2. **Langue** : répondre en **français** (sauf demande contraire) ; médicaments en **DCI**
   (paracétamol, adrénaline, amoxicilline) ; numérotation dentaire **FDI** ; explications destinées
   au patient possibles en **arabe standard** si le praticien le demande.
3. **Références** : recommandations européennes et françaises (ESC 2023 pour l'endocardite, ESE,
   EFP/SFPIO pour la parodontologie, SFCO pour la chirurgie orale), références tunisiennes quand
   elles existent (protocoles des sociétés savantes sous l'égide du Ministère de la santé, auxquels
   renvoie la convention CNAM, art. 31). ⚠️ À VÉRIFIER (praticien référent / INEAS) : liste des
   références tunisiennes officielles en médecine dentaire à citer.
4. **Médicaments** : ne citer que des DCI ; rappeler de vérifier la **disponibilité en Tunisie** et
   le **RCP** (résumé des caractéristiques du produit) autorisé en Tunisie ; ne jamais donner une dose
   sans la posologie de référence, la dose maximale et les principales contre-indications ; pour les
   anesthésiques, renvoyer au calculateur de Molaris et **montrer le calcul**.
5. **Codage** : « Ne propose **aucun code d'acte** (ni CDT, ni NGAP). Décris l'acte en toutes lettres ;
   le praticien choisit le code dans la nomenclature intégrée au logiciel. »
6. **Alerte** : garder l'encadré ⚠️ pour les risques (dose toxique, nerf, perforation, interaction),
   en français : « ⚠️ **ALERTE CLINIQUE** ».
7. **Confidentialité** : « Les noms sont remplacés par [PATIENT] ; ne demande jamais d'élément
   d'identité. »
8. **Nom** : l'acronyme « Medical & Odontological Lifeline Assistant for Real-time Interventions &
   Surgery » est en anglais ; ⚠️ décision produit : le garder ou le franciser.

---

## 3. `src/domain/dental-data.ts`

### 3.1 Dents (`DEFAULT_TEETH`)

| Constat | Recommandation |
|---|---|
| Identifiant principal = numérotation **universelle américaine 1–32** ; FDI en champ secondaire | En Tunisie la numérotation d'usage est la **FDI** (le bulletin de soins CNAM est imprimé en FDI). Faire de la FDI l'identifiant affiché partout ; garder l'universel seulement en interne si nécessaire. |
| **Pas de dents temporaires** | Le bulletin de soins CNAM comporte la denture temporaire **51–55, 61–65, 71–75, 81–85**. La liste des actes CNAM distingue certains soins sur dent permanente d'un enfant de moins de 14 ans (voir `nomenclature-cnam.md`). Ajouter un schéma temporaire et mixte. |
| Noms en anglais (« Maxillary Right 1st Molar ») | Noms français : « 16 — première molaire maxillaire droite » ; libellés arabes pour les documents patients (ex. « الضرس الأول العلوي الأيمن »). |
| Surfaces `mesial, distal, occlusal, buccal, lingual` | Français : **mésiale, distale, occlusale (incisale pour les dents antérieures), vestibulaire, linguale / palatine** (palatine au maxillaire). |
| Statuts (`rct`, `veneer`…) | Libellés français : traitement endodontique, facette, etc. (i18n). |

### 3.2 Anesthésiques (`ANESTHETICS`)

Les valeurs mg/ml sont de l'arithmétique correcte (2 % = 20 mg/ml, 4 % = 40 mg/ml, 3 % = 30 mg/ml,
0,5 % = 5 mg/ml). Les problèmes portent sur le **marché** et les **doses maximales**.

| Entrée actuelle | Constat | Action |
|---|---|---|
| Lidocaïne 2 % + adrénaline **1/100 000**, cartouche 1,8 ml, 7 mg/kg, max 500 mg | 1/100 000 est la présentation courante aux États-Unis ; en Europe francophone la lidocaïne dentaire adrénalinée est fréquemment à **1/80 000**. Les 7 mg/kg / 500 mg correspondent à l'étiquetage américain. | **⚠️ À VÉRIFIER (pharmacien / nomenclature des médicaments autorisés en Tunisie — DPM)** : présentations disponibles (concentration d'adrénaline, volume de cartouche) et dose maximale du RCP tunisien. Ajouter une entrée 1/80 000 si elle existe (0,0225 mg d'adrénaline par cartouche de 1,8 ml). |
| Articaïne 4 % + adrénaline 1/100 000 « **(Septocaine)** », 1,7 ml, 7 mg/kg, max 500 mg | « Septocaine » est une marque américaine. L'articaïne existe aussi à **1/200 000** (utile chez le patient cardiaque). Le maximum absolu de 500 mg est à confirmer. | Nom en **DCI** ; marque locale saisie par le cabinet. **⚠️ À VÉRIFIER (pharmacien)** : marques et présentations en Tunisie, volume des cartouches, dose maximale du RCP. Ajouter articaïne 1/200 000 si disponible. |
| Mépivacaïne 3 % sans vasoconstricteur « **(Carbocaine)** », 6,6 mg/kg, max 400 mg | Marque américaine ; doses maximales issues de références américaines. | DCI ; **⚠️ À VÉRIFIER (pharmacien)** : présentation et dose maximale du RCP tunisien. |
| Bupivacaïne 0,5 % + adrénaline 1/200 000 « **(Marcaine)** », **2,0 mg/kg**, max 90 mg | Cartouches dentaires de bupivacaïne peu répandues hors Amérique du Nord. La valeur de 2,0 mg/kg n'est pas cohérente avec toutes les références (certaines ne donnent que le maximum absolu de 90 mg, d'autres une valeur en mg/kg plus basse). | **⚠️ À VÉRIFIER (pharmacien)** : si aucune cartouche dentaire n'est autorisée en Tunisie, **retirer** l'entrée ; sinon, reprendre la dose du RCP. |
| Absence de la **prilocaïne** et d'autres produits éventuellement présents | — | **⚠️ À VÉRIFIER (pharmacien)** : liste complète des anesthésiques dentaires autorisés en Tunisie (y compris fabrication locale). |

Recommandation de structure : rendre la liste **modifiable par le cabinet** (DCI, concentration,
adrénaline, volume de cartouche, marque) avec des valeurs par défaut validées ; afficher la source
(RCP) de chaque dose maximale.

### 3.3 Protocoles rapides (`QUICK_PROTOCOLS`)

Tous en anglais : à traduire (i18n FR, et AR si un extrait est destiné au patient).

| Protocole | Points à revoir |
|---|---|
| **Hot tooth** (pulpite, bloc du nerf alvéolaire inférieur) | Contenu technique cohérent avec la littérature internationale. Préciser les concentrations d'adrénaline réellement disponibles ; **X-Tip / Stabident** : disponibilité en Tunisie ⚠️ À VÉRIFIER (fournisseurs dentaires). L'injection intra-ligamentaire est **contre-indiquée chez le patient à haut risque d'endocardite** (consensus de Sfax 2016) : l'ajouter. |
| **Instrument fracturé** | Correct. L'étape « inform patient in writing » rejoint l'obligation d'information : lier au modèle de consentement endodontique. Ultrasons Start-X / ET20 : noms de marques, à présenter comme exemples. |
| **Alvéolite** | Chlorhexidine 0,12 % : présentations tunisiennes ⚠️ À VÉRIFIER (pharmacien). **Alveogyl** : marque, disponibilité ⚠️ À VÉRIFIER (fournisseurs). Pansement « eugénol / iodoforme » : vérifier l'allergie à l'iode. Consigne patient : renvoyer à la fiche `consignes-post-operatoires/extraction.md`. |
| **Deep margin elevation** | Technique ; pas d'enjeu local. Traduire. |
| **Communication bucco-sinusienne** | « Amoxicillin/Clavulanate (**Augmentin**) **875 mg BID** x 7 d » : dosage de la présentation américaine ; **⚠️ À VÉRIFIER (pharmacien)** : présentations d'amoxicilline-acide clavulanique disponibles en Tunisie et posologie recommandée. « **Oxymetazoline** spray x 3 d » : décongestionnant nasal dont la disponibilité et les restrictions d'usage sont à vérifier **⚠️ À VÉRIFIER (pharmacien)**. Écrire les produits en DCI. |

---

## 4. `src/domain/clinical-safety.ts`

### 4.1 Anticoagulants / antiagrégants × AINS

Bonne base, accents normalisés (« héparine » → contient « heparin »).
- **Manquants (DCI)** à ajouter : `nadroparin` (nadroparine), `dalteparin`, `fondaparinux`,
  `ticlopidin`. ⚠️ À VÉRIFIER (pharmacien) : marques commercialisées en Tunisie à ajouter (ne pas
  deviner de noms de marque).
- **AINS manquants (DCI)** : `aceclofenac`, `indometacin`, `tenoxicam`, `lornoxicam`, `etoricoxib`,
  `etodolac`, `niflumi` (acide niflumique), `tiaprofen` (acide tiaprofénique). Attention :
  `mefenam` est déjà présent. ⚠️ À VÉRIFIER (pharmacien) : lesquels sont commercialisés en Tunisie
  et sous quelles marques.
- **AVK** (warfarine, acénocoumarol, fluindione) : ajouter une alerte distincte « contrôler l'INR
  récent avant un acte sanglant ». ⚠️ À VÉRIFIER (praticien référent) : seuil d'INR et délai de
  contrôle à retenir (recommandations SFCO / nationales).
- Le texte de l'alerte recommande le paracétamol : correct ; ajouter « en respectant la dose maximale
  journalière et les contre-indications hépatiques ».

### 4.2 Antirésorptifs (ostéonécrose des mâchoires)

- Liste correcte (bisphosphonates, dénosumab). Envisager d'ajouter les **antiangiogéniques**
  (ex. `bevacizumab`, `sunitinib`) et le `romosozumab`, également associés à l'ostéonécrose dans la
  littérature récente. ⚠️ À VÉRIFIER (praticien référent / chirurgien oral) : liste à retenir.
- **Radiothérapie de la tête et du cou** (risque d'ostéoradionécrose) : aucune alerte. À ajouter
  (mots-clés : `radiotherapie`, `radiotherapy`, `irradiation`, `cancer orl`…).
- « drug holiday » (fenêtre thérapeutique) : formulation prudente (« à discuter avec le
  prescripteur »), conserver.

### 4.3 Allergie à la pénicilline

- La détection (`cillin` couvre « amoxicilline », « pénicilline ») est bonne.
- **Texte de l'alerte** : « Envisager la clindamycine ou l'azithromycine ». À corriger :
  - l'**ESC 2023** a abandonné la clindamycine pour l'antibioprophylaxie de l'endocardite
    (risque de colite à *Clostridioides difficile*) et propose, en cas d'allergie, **céfalexine**,
    **azithromycine / clarithromycine** ou **doxycycline** (céphalosporines seulement en l'absence
    d'allergie immédiate grave) ;
  - le **consensus tunisien de Sfax (2016)** notait déjà l'absence de forme orale de clindamycine en
    Tunisie et proposait pristinamycine, azithromycine ou clarithromycine.
  - Proposition de texte : « Allergie documentée aux pénicillines : [médicament] contre-indiqué.
    Choisir une alternative selon le type d'allergie et les recommandations en vigueur ; vérifier la
    disponibilité en Tunisie. »
  - ⚠️ À VÉRIFIER (pharmacien + praticien référent) : alternatives disponibles en Tunisie et
    recommandation nationale actuelle.
- Ajouter la détection d'allergie croisée **céphalosporines** (terme `cef`, `ceph`) en cas d'allergie
  immédiate grave aux pénicillines (alerte « avertissement »), et des allergies utiles en cabinet :
  **latex**, **chlorhexidine**, **iode**, **anesthésiques locaux / sulfites**.

### 4.4 IMAO × vasoconstricteur

Plusieurs références de pharmacologie dentaire considèrent l'interaction IMAO–adrénaline comme peu
significative, et signalent plutôt les **antidépresseurs tricycliques** (amitriptyline,
clomipramine, imipramine…) et les **bêtabloquants non sélectifs** (propranolol…) avec
l'adrénaline. ⚠️ À VÉRIFIER (pharmacien / praticien référent) avant de modifier la gravité ou la liste.

### 4.5 Antibioprophylaxie de l'endocardite (`PROPHYLAXIS_KEYWORDS`)

- Le commentaire parle de « AHA antibiotic prophylaxis guidance ». En Tunisie, les références
  pertinentes sont l'**ESC 2023** et le **consensus de Sfax (Cardiologie Tunisienne, 2016)**.
- Le consensus tunisien classe à **haut risque** : prothèse valvulaire, antécédent d'endocardite,
  cardiopathie congénitale cyanogène (selon conditions), **et les valvulopathies rhumatismales
  fuyantes (insuffisance aortique, insuffisance mitrale)** — particularité liée à la fréquence du
  rhumatisme articulaire aigu en Tunisie. Ajouter les mots-clés : `rhumatism` (valvulopathie
  rhumatismale, cardiopathie rhumatismale), `raa`, `insuffisance aortique`, `insuffisance mitrale`
  (risque de faux positifs acceptable : ce n'est qu'une invitation à vérifier).
- ESC 2023 : ajouter `tavi`, `plastie valvulaire` / `anneau`, `assistance ventriculaire`.
- Le mot-clé `congenital heart disease` / `cardiopathie congenitale` est large (toutes les
  cardiopathies congénitales ne sont pas à haut risque) : garder, mais le message doit dire
  « vérifier la classe de risque ».
- Le consensus de Sfax liste aussi des **actes contre-indiqués chez le patient à haut risque**
  (anesthésie intra-ligamentaire, chirurgie implantaire, chirurgie parodontale, traitement endodontique
  de dent nécrosée…). Afficher cette liste avec l'alerte, en citant la source. ⚠️ À VÉRIFIER
  (praticien référent / cardiologue) : actualité de cette liste après l'ESC 2023, qui est moins restrictive
  sur certains actes.
- Le protocole (moment, dose adulte / enfant) doit venir d'une référence validée et affichée, pas
  être généré par l'IA.

### 4.6 Autres contrôles suggérés

- **Grossesse / allaitement** : case dans le questionnaire + rappel sur radiographies et médicaments.
- **Diabète déséquilibré**, **immunodépression** : alerte de cicatrisation / infection pour la chirurgie.
- **Âge < 18 ans** : désactiver l'IA (voir `../legal/inpdp-conformite.md` §3.2) et proposer la denture temporaire.

---

## 5. Questions pour les vérificateurs

**Pharmacien (ou Direction de la pharmacie et du médicament) :**
1. Anesthésiques dentaires autorisés en Tunisie : DCI, concentration, adrénaline, volume de cartouche, marques, dose maximale du RCP.
2. Disponibilité orale de la clindamycine ; alternatives pour allergie aux pénicillines ; présentations d'amoxicilline et d'amoxicilline-acide clavulanique.
3. Marques tunisiennes des AINS, anticoagulants, antiagrégants, bisphosphonates à ajouter aux listes d'alerte.
4. Décongestionnants nasaux, chlorhexidine, pansements alvéolaires disponibles.

**Praticien référent / Ordre des médecins dentistes / société savante :**
5. Recommandation tunisienne actuelle d'antibioprophylaxie (le consensus de Sfax de 2016 a-t-il été mis à jour après l'ESC 2023 ?).
6. Seuil d'INR pour les actes sanglants sous AVK.
7. Référentiels tunisiens (INEAS, protocoles thérapeutiques) à citer dans l'IA.

---

## Sources

- Code Molaris (lecture seule) : `src/ai/system-prompt.ts`, `src/domain/dental-data.ts`, `src/domain/clinical-safety.ts`.
- Hachicha I., Triki F. et al., « Consensus de la région de Sfax sur la prise en charge bucco-dentaire
  des patients à risque d'endocardite infectieuse », *Cardiologie Tunisienne*, vol. 12 n° 3, 2016,
  p. 143-148 : <https://www.stcccv.org.tn/uploads/files/1505956078.pdf>
- ESC 2023 Guidelines for the management of endocarditis (European Heart Journal) — synthèse ACC :
  <https://www.acc.org/Latest-in-Cardiology/ten-points-to-remember/2023/08/29/20/49/2023-esc-guidelines-for-endocarditis-esc-2023> ;
  position SPILF-AEPEI : <https://www.sciencedirect.com/science/article/pii/S2666991924001787>
- ANSM (France), « Prescription des antibiotiques en pratique bucco-dentaire », 2011 :
  <https://ansm.sante.fr/uploads/2021/02/04/reco-prescription-des-antibiotiques-en-pratique-buccodentaire-septembre2011.pdf>
- Convention sectorielle CNAM – médecins dentistes (2020), art. 31 à 34 (protocoles, DCI, génériques) :
  <https://www.cnam.nat.tn/doc/upload/NOU_CONV_MED_DENTISTE.pdf>
- Bulletin de remboursement des frais de soins CNAM (schéma dentaire FDI, denture temporaire) :
  <https://www.cnam.nat.tn/doc/upload/BS1.pdf>
