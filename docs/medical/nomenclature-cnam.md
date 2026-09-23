# Facturation CNAM en médecine dentaire — ce que Molaris doit prendre en charge

> **Statut : BROUILLON — à faire vérifier par la CNAM (centre régional / service des
> conventions) et par le Syndicat tunisien des médecins dentistes de libre pratique.**
> Ce document distingue ce qui est **établi par un document officiel lu** (source citée) de ce qui
> **reste à obtenir**. Aucun code, coefficient ou tarif n'est inventé : les exemples de codes
> ci-dessous sont recopiés de la liste officielle publiée par la CNAM ; les **coefficients**
> (cotations) n'y figurent pas et doivent être obtenus.

---

## 1. Cadre — ce qui est établi

Source principale : **Convention sectorielle des médecins dentistes de libre pratique**, conclue le
17 décembre 2020 entre la CNAM et le Syndicat tunisien des médecins dentistes de libre pratique
(texte publié sur cnam.nat.tn). Base légale citée par la convention : loi n° 2004-71 du 2 août 2004
instituant un régime d'assurance maladie.

| Point | Ce que dit la source | Conséquence pour Molaris |
|---|---|---|
| Conventionnement | L'adhésion est **personnelle**, même en cabinet de groupe ou SCP (art. 3). La CNAM notifie un **code individuel** à utiliser dans les relations conventionnelles (art. 13). Les actes d'un dentiste **non conventionné** ne sont pas couverts (définitions). | Paramètres cabinet : `conventionné CNAM oui/non` et **code CNAM par praticien** (pas seulement par cabinet). |
| Rémunération | À l'acte, dans la limite des honoraires conventionnels (art. 55). Le dentiste **perçoit l'intégralité** de ses honoraires du patient, qui se fait **rembourser** par la caisse (art. 56). | Mode par défaut = **remboursement** : le patient paie tout ; Molaris produit les documents à remettre au patient. Pas de tiers payant à gérer pour l'instant. |
| Dépassement | Interdit : le dentiste conventionné ne peut pratiquer, pour les assurés, des honoraires supérieurs aux honoraires conventionnels (art. 57). | Pour un acte coté CNAM chez un assuré, avertir si le prix saisi dépasse le tarif conventionnel calculé. ⚠️ À VÉRIFIER (CNAM / syndicat) : traitement des actes **hors nomenclature** (implants, couronnes céramique…) facturés au même patient. |
| Lettres-clés (annexe, honoraires en dinars) | **Cd** (consultation du médecin dentiste) : 18,000 jusqu'au 31/12/2020 → **30,000** à compter du 01/01/2021. **Cds** (consultation du spécialiste — orthodontiste) : 30,000 → **45,000**. **D** (acte réalisé par un médecin dentiste) : 1,700 → **3,000**. | Stocker les lettres-clés et leur **valeur datée** (historique), en millimes : Cd = 30 000, Cds = 45 000, D = 3 000 à compter du 01/01/2021. Tarif d'un acte = coefficient × valeur de la lettre. ⚠️ À VÉRIFIER (CNAM / syndicat) : ces valeurs ont-elles été **révisées** depuis ? La convention prévoit une révision tous les 3 ans (art. 58-59) et une durée de 4 ans reconductible (art. 96). |
| Nomenclature | La **Nomenclature générale des actes professionnels** (NGAP) est fixée par **arrêté du ministre chargé de la santé publique** (définitions). Toute prescription d'acte ou de prothèse porte le **libellé et le code** de la nomenclature (art. 46). | Table `actes` : code officiel, libellé officiel, lettre-clé, coefficient, régime d'accord préalable, date de validité. Données **chargées d'une source officielle**, jamais saisies de mémoire. |
| Feuille de soins | Après chaque consultation ou acte : honoraires perçus, nature de l'acte et **code** ; si plusieurs séances, la feuille est rédigée **à la fin de la dernière séance** (art. 51). | Le plan de traitement doit savoir qu'un acte multi-séances (ex. traitement endodontique) n'est reporté qu'une fois terminé. |
| Identification du patient | Le dentiste vérifie l'identité et la validité du support d'accès aux soins ; il inscrit l'**identifiant unique** du bénéficiaire sur tout document conventionnel (art. 22). | Fiche patient : **identifiant unique CNAM**, qualité (assuré / conjoint / enfant n° / ascendant), régime d'origine (CNSS / CNRPS / convention bilatérale — cases du bulletin). Donnée sensible : jamais envoyée à l'IA (voir `../legal/inpdp-conformite.md`). |
| Accord préalable | Pour un acte soumis à accord préalable : informer le patient, lui remettre la **demande d'accord préalable** (modèle CNAM) et un **rapport médical sous pli confidentiel** (diagnostic, nature exacte de la prestation, **code**) (art. 24), **avant** l'acte (art. 48). Sans accord valide, pas de remboursement (art. 24). | Statut d'acte « accord préalable demandé / accordé / refusé » ; bloquer (ou avertir fortement) la réalisation d'un acte soumis à accord sans accord enregistré ; générer le rapport médical. ⚠️ À VÉRIFIER (CNAM) : obtenir les **modèles officiels** de demande. |
| Ordonnance | Mentions réglementaires + **code CNAM du prescripteur** + **identifiant unique** du malade et sa qualité (art. 40) ; toujours datée (art. 41) ; pas d'ordonnances pré-établies (art. 42) ; pour chaque médicament : nom (**DCI** ou commercial), quantité journalière en unités, durée totale (art. 44). La convention encourage les **génériques** et la prescription en **DCI** (art. 34). | Le module Ordonnances doit imprimer ces champs (modèle d'ordonnance en annexe de la convention : nom, spécialité, adresse, téléphone du praticien ; nom et identifiant unique du bénéficiaire ; date ; cachet et signature). Les « modèles d'ordonnance » de Molaris doivent être des **aides à la saisie** que le praticien valide à chaque fois (art. 42). |
| Médicaments | Prescrire selon les indications de l'**AMM** délivrée par le ministère de la santé (art. 33). | Voir `revue-contenu-clinique.md`. |
| Référentiels | Le dentiste se réfère aux **protocoles thérapeutiques** élaborés par les sociétés savantes sous l'égide du ministère de la santé (art. 31) ; le contrôle médical s'appuie sur ces références (art. 60). | Afficher la source des protocoles intégrés. |
| Échange électronique | Objectif d'un système d'échange électronique (« SEED ») ; conditions à fixer **par avenant** (art. 53-54). | Aucune télétransmission à développer tant que l'avenant n'est pas connu. ⚠️ À VÉRIFIER (CNAM) : existence d'un avenant / d'une API pour les médecins dentistes. |
| Médecin de famille | Dans le parcours coordonné, le recours au **médecin dentiste fait exception** : pas besoin d'orientation par le médecin de famille (définitions). Selon la FAQ CNAM, les soins dentaires sont pris en charge dans la **filière privée selon le mode de remboursement**. | Pas de champ « orientation du médecin de famille » requis pour les soins dentaires. |
| Remplacement | Le remplaçant inscrit « Médecin dentiste remplaçant » et ses nom et prénom sur les documents (art. 26). | Paramètre « praticien remplaçant » imprimé sur ordonnances et feuilles de soins. |

### 1.1 Le bulletin de remboursement des frais de soins (modèle CNAM « BS »)

Constaté sur le formulaire publié par la CNAM :

- Deux tableaux distincts : **« Consultations et actes de soins dentaires »** et **« Prothèses
  dentaires »**, avec les colonnes **Date — Dent(s) — Code acte — Cotation — Honoraires — Code
  professionnel de santé — Cachet et signature**.
- Mention imprimée : *« Il est indispensable d'indiquer la dent traitée, de désigner les actes
  pratiqués en se référant aux codes et cotations de la nomenclature officielle. »*
- Schéma dentaire en **numérotation FDI** : dents permanentes 11-48 **et temporaires 51-85**.
- Partie assuré : identifiant unique, régime (CNSS / CNRPS / convention bilatérale), qualité du
  malade (assuré, conjoint, enfant n° 01, 02…, ascendant père = 01 / mère = 02).
- Le bulletin doit être déposé par l'assuré dans un **délai de 60 jours** à compter de la date des soins.

**Conséquence pour Molaris** : proposer une **impression pré-remplie** (ou un récapitulatif à
recopier) des lignes du bulletin : date, dent FDI, code, cotation (« D » suivie du coefficient officiel), honoraires,
code du praticien — séparée en soins / prothèses ; rappeler le délai de 60 jours au patient.
⚠️ À VÉRIFIER (CNAM) : le praticien a-t-il le droit d'imprimer sur le formulaire officiel ou
d'y joindre un état imprimé ? Sinon, Molaris imprime seulement un aide-mémoire.

### 1.2 La liste des actes (codes « DCH… »)

La CNAM publie une **« Liste des actes des professions de santé »** (document RB, espace
professionnels de santé de cnam.nat.tn). Son chapitre VII *Dents et gencives* (actes effectués
par les médecins dentistes) donne pour chaque acte un **code**, un **libellé** et le régime de
**prise en charge** (« Sans accord préalable » / « Accord préalable »). Structure constatée :

| Section | Exemples (recopiés de la liste) |
|---|---|
| I — Soins conservateurs, obturations définitives | DCH010010 cavité simple ; DCH010030 cavité composée deux faces ; DCH010050 trois faces et plus ; codes distincts **« si dent permanente d'un enfant de moins de 14 ans »** (DCH010020, DCH010040) ; DCH010080 / 010090 / 010100 traitement canalaire groupe incisivo-canin / prémolaire / molaire (cotable seulement si obturation à pâte radio-opaque) |
| II — Soins chirurgicaux | DCH020030 / 020040 / 020050 extraction simple par groupe ; DCH020140 extraction chirurgicale d'une dent incluse ou enclavée (**radiographie préopératoire obligatoire**) ; DCH020280 curetage périapical / résection apicale ; kystes, chirurgie pré-prothétique |
| III — Hygiène bucco-dentaire, parodontologie | DCH030010 détartrage complet sus et sous gingival ; DCH030020 traitement des gingivites (détartrage, curetage, surfaçage, 4 séances maximum) ; lambeaux, greffe gingivale, frénectomie |
| IV — Pédodontie, prévention | DCH040010 couronne pédodontique préformée ; DCH040020 scellement de sillons ; fluor ; mainteneurs d'espace |
| V — Orthopédie dento-faciale | DCH050010 examen avec empreintes ; traitements par période (6 mois, 12 mois, années 1 à 3, contention) — **accord préalable** |
| VI — Prothèse dentaire (adjointe) | DCH060010 appareillage 1 à 3 dents ; DCH060030 appareillage complet haut et bas ; réparations, rebasage. Mention : **prothèses adjointes et complètes remplaçables seulement après 3 ans** |

Autres règles lues dans cette liste : l'**anesthésie locale** pratiquée pour les actes des sections I
et II **ne donne pas lieu à cotation** ; certaines chirurgies exigent une radiographie préopératoire.

**Limites de ce qui a été lu** (à ne pas combler de mémoire) :
- La liste **ne donne pas les coefficients** (le nombre qui suit la lettre-clé, « D n ») : ⚠️ À VÉRIFIER (CNAM /
  arrêté fixant la NGAP) — obtenir le coefficient officiel de **chaque** code.
- L'extraction du PDF décale parfois la colonne « prise en charge » : ⚠️ À VÉRIFIER (CNAM) —
  reprendre le régime d'accord préalable code par code sur le document officiel (ou un fichier
  fourni par la CNAM), notamment pour les sections III et VI.
- La **date de version** du document n'est pas indiquée clairement : ⚠️ À VÉRIFIER (CNAM) — version
  en vigueur au jour de l'intégration.
- **Absence constatée** dans ce chapitre de la **prothèse fixe** (couronnes, bridges, inlays-cores)
  et des **implants** : ⚠️ À VÉRIFIER (CNAM / syndicat) — ces actes sont-ils hors nomenclature (non
  remboursés) ou couverts par un autre texte / avenant ?
- Des articles de presse de 2019 évoquent une prise en charge des prothèses dentaires **« hors
  plafond et sans accord préalable »**, alors que la liste marque la section VI « accord préalable » :
  ⚠️ À VÉRIFIER (CNAM) — règle actuelle pour les prothèses.

---

## 2. Ce qui doit être obtenu auprès de sources officielles

| # | Donnée | Auprès de qui | Pourquoi |
|---|---|---|---|
| 1 | Texte en vigueur de la **NGAP** (arrêté) pour les actes dentaires, avec **coefficients** et **lettres-clés** | CNAM, ministère de la santé (JORT), syndicat | Calcul des honoraires conventionnels |
| 2 | **Valeurs actuelles** de Cd, Cds, D (et éventuelles autres lettres, ex. radiographie) et avenants postérieurs à 2020 | CNAM, syndicat | Tarifs datés |
| 3 | Liste officielle des codes **DCH** sous forme exploitable (tableur), avec régime d'accord préalable et date de version | CNAM (service des conventions) | Import sans ressaisie manuelle |
| 4 | Cotation des **radiographies** dentaires faites au cabinet (rétro-alvéolaire, panoramique) | CNAM / NGAP | Non trouvée dans le chapitre VII lu |
| 5 | **Plafond annuel** de remboursement et majoration pour soins dentaires ; taux de prise en charge / ticket modérateur des actes dentaires | CNAM | Information du patient sur son reste à charge. Une source secondaire (CLEISS, 2025) mentionne une majoration de plafond de **150 TND** pour les soins dentaires ambulatoires et un remboursement à **60 %** — ⚠️ À VÉRIFIER (CNAM) |
| 6 | Règles propres aux **enfants** (codes « moins de 14 ans », pédodontie, ODF, limites d'âge) | CNAM | ⚠️ À VÉRIFIER : une affirmation non sourcée de meilleure prise en charge des 4-18 ans circule ; ne pas l'utiliser sans texte |
| 7 | Soins liés aux **APCI** (affections prises en charge intégralement) : liste des actes dentaires concernés (révisée tous les 3 ans, art. 49) | CNAM | Prise en charge différente |
| 8 | Modèles officiels : demande d'**accord préalable**, feuille de soins, ordonnance | CNAM (centre de référence) | Impression conforme |
| 9 | Règles des **assurances complémentaires** / mutuelles (devis, formulaires) | Assureurs | Hors CNAM, fréquent en pratique |
| 10 | Existence d'un **échange électronique** (SEED) pour les dentistes | CNAM | Télétransmission future |

---

## 3. Exigences fonctionnelles pour Molaris (à répartir entre les sessions Facturation et Ordonnances)

1. **Référentiel d'actes versionné** : code, libellé officiel FR (et AR si disponible), lettre-clé,
   coefficient, accord préalable oui/non, règles (âge < 14 ans, radiographie obligatoire, délai de
   renouvellement 3 ans, nombre maximal de séances), date de début / fin de validité, **source**.
   Import par fichier officiel ; aucune valeur par défaut inventée ; un acte sans code officiel est
   marqué « hors nomenclature ».
2. **Lettres-clés datées** (valeur en millimes, date d'effet) : Cd, Cds, D… Le tarif d'un acte est
   calculé à la date de l'acte.
3. **Acte réalisé** = date, dent(s) FDI (permanentes **et temporaires** 51-85), code, cotation,
   honoraires perçus, praticien (code CNAM, remplaçant éventuel), statut multi-séances (terminé ou non).
4. **Contrôles** : dépassement du tarif conventionnel pour un assuré ; acte soumis à accord
   préalable sans accord enregistré ; code « enfant < 14 ans » incohérent avec l'âge ; renouvellement
   de prothèse adjointe avant 3 ans ; radiographie préopératoire absente pour une extraction chirurgicale.
5. **Documents** : récapitulatif pour bulletin de soins (soins / prothèses séparés), dossier de
   demande d'accord préalable + rapport médical sous pli confidentiel, ordonnance conforme à l'art. 40
   et 44, rappel du délai de dépôt de 60 jours.
6. **Devis** : distinguer part « tarif conventionnel » et actes hors nomenclature, sans afficher de
   montant de remboursement tant que les taux et plafonds ne sont pas vérifiés (point 5 du §2).
7. **IA** : ne jamais proposer de code (voir `revue-contenu-clinique.md` §2) ; l'identifiant unique
   CNAM fait partie des données filtrées avant tout appel.

---

## Sources

- CNAM, *Convention sectorielle des médecins dentistes de libre pratique*, décembre 2020 (signée le
  17/12/2020), et annexe « Honoraires conventionnels » :
  <https://www.cnam.nat.tn/doc/upload/NOU_CONV_MED_DENTISTE.pdf> (consulté le 23/09/2026)
- CNAM, *Bulletin de remboursement des frais de soins* : <https://www.cnam.nat.tn/doc/upload/BS1.pdf>
- CNAM, *Liste des actes des professions de santé* (document RB), chapitre VII « Dents et gencives » :
  <https://www.cnam.nat.tn/doc/upload/RBactes.pdf>
- CNAM, espace professionnels de santé (conventions et avenants) : <https://www.cnam.nat.tn/espace_ps.jsp>
- CNAM, questions fréquentes (filière privée, soins dentaires) : <https://www.cnam.nat.tn/qf.jsp>
- CLEISS, *La sécurité sociale des salariés en Tunisie* (source secondaire, plafonds) :
  <https://www.cleiss.fr/docs/regimes/regime_tunisie_salaries.html>
- Loi n° 2004-71 du 2 août 2004 instituant un régime d'assurance maladie (citée par la convention).
