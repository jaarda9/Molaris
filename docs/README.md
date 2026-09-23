# Documentation juridique et médicale de Molaris (Tunisie)

Rédigée pour un petit éditeur de logiciel et ses cabinets dentaires clients. **Aucun de ces documents
n'est validé** : tous sont des brouillons à faire relire par les interlocuteurs indiqués. Les points
incertains sont marqués **⚠️ À VÉRIFIER** dans chaque fichier ; ils sont regroupés ci-dessous par
vérificateur. Aucun numéro d'article, code CNAM, tarif ou fait sur un médicament n'a été inventé.

Statuts : **Brouillon complet** = tous les chapitres rédigés, en attente de relecture ;
**À vérifier (bloquant)** = ne pas utiliser avant réponse sur les points signalés.

## Index

| Fichier | Contenu | Langue | Statut | Relecteur principal |
|---|---|---|---|---|
| `legal/inpdp-conformite.md` | Check-list loi organique n° 2004-63 : données de santé, formalités INPDP, transfert vers Google (IA), sécurité, durées, droits des patients, projet de réforme | FR | À vérifier (bloquant pour l'IA) | INPDP, juriste |
| `legal/politique-confidentialite.md` | Politique de confidentialité du logiciel | FR | Brouillon complet | Juriste |
| `legal/conditions-licence.md` | Conditions : abonnement mensuel **et** licence perpétuelle + maintenance annuelle ; IA = aide à la décision | FR | Brouillon complet | Avocat, expert-comptable |
| `legal/consentements/README.md` | Règles d'utilisation des consentements | FR | Brouillon complet | Ordre des médecins dentistes |
| `legal/consentements/consentement-donnees-personnelles.md` | Traitement des données (options SMS, IA) | FR + AR | À vérifier (bloquant) | INPDP, juriste |
| `legal/consentements/consentement-soins-generaux.md` | Soins courants | FR + AR | Brouillon complet | Ordre / praticien référent |
| `legal/consentements/consentement-extraction.md` | Extraction | FR + AR | Brouillon complet | Ordre / chirurgien oral |
| `legal/consentements/consentement-traitement-endodontique.md` | Traitement de canal | FR + AR | Brouillon complet | Ordre / endodontiste |
| `legal/consentements/consentement-chirurgie-implantaire.md` | Implant | FR + AR | Brouillon complet | Ordre / implantologue |
| `legal/consentements/consentement-anesthesie-locale.md` | Anesthésie locale | FR + AR | Brouillon complet | Ordre / praticien référent |
| `medical/revue-contenu-clinique.md` | Revue de `system-prompt.ts`, `dental-data.ts`, `clinical-safety.ts` : changements recommandés (CDT, AHA/ADA, DCI, anesthésiques, antibioprophylaxie, FDI) | FR | Brouillon complet — **recommandations à appliquer par l'intégrateur** (fichiers partagés) | Praticien référent, pharmacien |
| `medical/nomenclature-cnam.md` | Facturation CNAM : ce qui est établi (convention 2020, bulletin, liste des actes DCH) et ce qui doit être obtenu | FR | À vérifier (bloquant pour la facturation CNAM) | CNAM, syndicat |
| `medical/consignes-post-operatoires/README.md` | Règles d'utilisation des fiches | FR | Brouillon complet | Praticien référent |
| `medical/consignes-post-operatoires/extraction.md` | Après extraction | FR + AR | Brouillon complet | Chirurgien oral |
| `medical/consignes-post-operatoires/chirurgie-implantaire.md` | Après implant | FR + AR | Brouillon complet | Implantologue |
| `medical/consignes-post-operatoires/traitement-endodontique.md` | Après traitement de canal | FR + AR | Brouillon complet | Endodontiste |
| `medical/consignes-post-operatoires/detartrage-surfacage.md` | Après détartrage / surfaçage | FR + AR | Brouillon complet | Parodontiste |
| `medical/consignes-post-operatoires/anesthesie-locale.md` | Après anesthésie locale | FR + AR | Brouillon complet | Praticien référent |

Les textes arabes sont en arabe standard moderne simple : ⚠️ À VÉRIFIER — relecture par un
locuteur natif (idéalement un soignant tunisien) avant impression.

## Points ⚠️ À VÉRIFIER, par vérificateur

### INPDP
- Formalité exacte d'un cabinet libéral pour les données de santé (déclaration ou autorisation) ;
  un dossier par cabinet ou un seul pour l'éditeur ; formalité de l'éditeur pour ses propres fichiers.
- Texte intégral de la délibération INPDP sur les données de santé (exigences d'hébergement).
- Transfert vers Google (IA) : pays de traitement, qualification de Google, autorisation nécessaire.
- Vidéosurveillance en salle d'attente ; régime des mineurs ; application pratique de la règle de
  conservation ; adresse et site de l'INPDP à imprimer.

### Juriste / avocat
- Qui détient la clé Gemini (cabinet ou éditeur) → rôle de sous-traitant de l'éditeur.
- Âge de la majorité et signature pour un mineur (un parent suffit-il ? mineur seul ?).
- Immuabilité des actes médico-légaux face à une demande d'effacement.
- Prescription de l'action en responsabilité (durée de conservation des consentements).
- Clauses de licence : propriété, limitation de responsabilité (plafond 12 mois), force majeure,
  langue qui prévaut, tribunal compétent, contrat conclu en ligne (loi n° 2000-83).
- Références déontologiques exactes (Code de déontologie, loi n° 91-21) à citer en pied des consentements.
- Veille trimestrielle : projet de nouvelle loi sur les données personnelles (notification des
  violations, analyse d'impact, transferts).

### Conseil de l'Ordre des médecins dentistes / praticien référent
- Liste des risques de chaque consentement ; délais et valeurs des consignes post-opératoires.
- Durée légale de conservation du dossier dentaire ; articulation avec les règles ordinales.
- Recommandation tunisienne actuelle d'antibioprophylaxie (consensus de Sfax 2016 vs ESC 2023) et
  liste des actes contre-indiqués chez le patient à haut risque.
- Seuil d'INR pour les actes sanglants sous AVK ; liste des antirésorptifs / antiangiogéniques à alerter.
- Référentiels tunisiens (protocoles des sociétés savantes, INEAS) à citer par l'IA.
- Nom de l'assistant IA (acronyme anglais) : décision produit.

### Pharmacien / Direction de la pharmacie et du médicament
- Anesthésiques dentaires autorisés en Tunisie (DCI, adrénaline, volume de cartouche, marques, dose
  maximale du RCP) ; bupivacaïne dentaire ; prilocaïne.
- Clindamycine orale et alternatives en cas d'allergie aux pénicillines ; présentations
  d'amoxicilline / amoxicilline-acide clavulanique.
- Marques tunisiennes des AINS, anticoagulants, antiagrégants, bisphosphonates à ajouter aux alertes.
- Interaction adrénaline × IMAO / tricycliques / bêtabloquants non sélectifs.
- Chlorhexidine, décongestionnants nasaux, pansements alvéolaires disponibles ; fournisseurs (X-Tip, Alveogyl).
- Statut réglementaire d'un logiciel d'aide à la décision clinique (dispositif médical ?).

### CNAM / Syndicat des médecins dentistes de libre pratique
- Valeurs actuelles des lettres-clés Cd, Cds, D (30 / 45 / 3 DT depuis le 01/01/2021) et avenants postérieurs.
- Coefficients officiels (NGAP) de chaque code DCH ; version en vigueur de la liste des actes et
  régime d'accord préalable code par code.
- Prothèse fixe et implants : hors nomenclature ? Prothèses adjointes : accord préalable ou non ?
- Cotation des radiographies au cabinet ; plafonds, taux de remboursement, règles enfants, APCI.
- Modèles officiels (accord préalable, feuille de soins) et droit d'imprimer dessus ; SEED / télétransmission.
- Prise en charge des implants (consentement implantaire).

### Expert-comptable
- Taux de TVA applicable aux licences / abonnements ; durées de conservation comptable et fiscale.

### Équipe technique Molaris
- Aucune donnée patient dans la télémétrie, les journaux ou le support ; filtrage élargi avant l'IA
  (dates de naissance, téléphones, CIN, identifiant CNAM).
- Numéro d'urgence imprimé sur les fiches (SAMU 190 à confirmer) : paramètre du cabinet.

### Relecture linguistique
- Textes arabes des consentements et des consignes (locuteur natif).
