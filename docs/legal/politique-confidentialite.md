# Politique de confidentialité — Logiciel Molaris

> **Statut : BROUILLON — à faire relire par un juriste tunisien avant publication.**
> Les passages entre crochets `[…]` sont à compléter par l'éditeur. Les points marqués
> **⚠️ À VÉRIFIER** doivent être confirmés avant diffusion.

**Version :** [x.y] — **Date d'entrée en vigueur :** [JJ/MM/AAAA]

**Éditeur :** [Raison sociale], [forme juridique], au capital de [montant] DT, immatriculée au
Registre national des entreprises sous le n° [identifiant unique], matricule fiscal [n°],
siège : [adresse], Tunisie. Contact données personnelles : [adresse e-mail], [téléphone].

---

## 1. À qui s'adresse cette politique ?

Molaris est un logiciel de gestion de cabinet dentaire (dossier patient, schéma dentaire, agenda,
devis, facturation, ordonnances, assistant d'aide à la décision clinique par intelligence
artificielle). Il est installé et fonctionne **sur l'ordinateur du cabinet**.

Cette politique explique :
- quelles données **l'éditeur** traite lui-même (données des cabinets clients) ;
- comment le logiciel traite les **données des patients**, dont le cabinet reste seul responsable ;
- ce qui est envoyé au service d'intelligence artificielle, et à quelles conditions.

Elle est rédigée au regard de la **loi organique n° 2004-63 du 27 juillet 2004** portant sur la
protection des données à caractère personnel et des textes pris pour son application.

## 2. Deux rôles différents

| Données | Qui en est responsable ? | Rôle de l'éditeur |
|---|---|---|
| Données des patients du cabinet (identité, antécédents, soins, radiographies, factures…) | **Le médecin dentiste** (ou la société civile professionnelle) : responsable du traitement | Aucun accès en fonctionnement normal. **Sous-traitant** seulement lors d'une intervention de support autorisée ou [si l'éditeur fournit le service d'IA avec sa propre clé — ⚠️ À VÉRIFIER, voir §5]. |
| Données du cabinet client (nom du praticien, adresse, n° d'inscription à l'Ordre, matricule fiscal, contacts, facturation de l'abonnement) | **L'éditeur** : responsable du traitement | — |

## 3. Données des patients : traitées localement

- Les données des patients sont enregistrées dans une base de données située **sur l'ordinateur du
  cabinet** (fichier local), avec les images (radiographies, photos) dans un dossier local.
- **L'éditeur ne reçoit pas ces données** et n'y a pas accès à distance, sauf intervention de support
  demandée par le cabinet, réalisée en sa présence, et encadrée par un contrat de sous-traitance.
- **⚠️ À VÉRIFIER (équipe technique)** : confirmer qu'aucune donnée patient n'est transmise à
  l'éditeur ou à un tiers en dehors du service d'IA décrit au §5 (aucune télémétrie, aucun rapport
  d'erreur contenant des données, ressources externes chargées sans données patient).
- Le cabinet est responsable de ses obligations envers ses patients : déclaration à l'Instance
  nationale de protection des données personnelles (INPDP), consentement et information des
  patients, sécurité du poste, sauvegardes, respect des droits des patients. L'éditeur fournit des
  modèles (consentements FR/AR) et une liste de contrôle (`inpdp-conformite.md`).

## 4. Données traitées par l'éditeur (cabinets clients)

| Finalité | Données | Base | Durée de conservation |
|---|---|---|---|
| Gestion du contrat, de la licence et de la facturation | Identité du praticien, raison sociale, adresse, matricule fiscal, coordonnées, historique de paiement | Exécution du contrat | Durée du contrat, puis durée légale de conservation comptable **⚠️ À VÉRIFIER (expert-comptable)** |
| Support technique | Échanges, description des incidents | Exécution du contrat | [2 ans] après clôture du ticket |
| Informations sur le produit (nouvelles versions, sécurité) | Adresse e-mail | Exécution du contrat | Durée du contrat |
| Prospection commerciale | Adresse e-mail, téléphone | **Consentement exprès** (la loi interdit l'usage publicitaire sans consentement exprès et spécifique — art. 30) | Jusqu'au retrait du consentement |

Ces données ne sont ni vendues ni louées. Elles sont accessibles au seul personnel de l'éditeur qui
en a besoin, tenu à la confidentialité.

## 5. Assistant d'intelligence artificielle (Google Gemini)

Molaris propose des fonctions d'aide à la décision (question clinique, note SOAP, second avis sur
une radiographie). Elles utilisent le service **Google Gemini** (Google LLC ou ses affiliés), dont les
serveurs sont **situés hors de Tunisie**.

**Ce que fait le logiciel avant l'envoi :**
- il remplace automatiquement les **noms, prénoms et numéros de dossier** de tous les patients
  enregistrés par des marqueurs neutres (`[PATIENT]`, `[CHART-ID]`) ;
- il envoie le reste de la question (par exemple : âge, antécédents, médicaments, description
  clinique) et, pour le second avis radiographique, **l'image telle quelle**.

**Ce que vous devez savoir :**
- Le filtrage retire les noms connus, mais **ne garantit pas l'anonymat** : une date de naissance, un
  numéro de téléphone, un nom incrusté sur une radiographie ou une combinaison de détails peut
  permettre d'identifier une personne. N'écrivez pas ces éléments dans vos questions et recadrez les
  images qui portent un nom.
- **Les fonctions d'IA sont désactivées par défaut** [⚠️ à implémenter]. Le cabinet ne doit les
  activer qu'après avoir accompli les formalités de **transfert de données à l'étranger** auprès de
  l'INPDP (la loi exige une autorisation « dans tous les cas » — art. 52) et recueilli le
  **consentement du patient** (modèle fourni).
- Qui transfère ? **⚠️ À VÉRIFIER (éditeur + juriste)** : [si chaque cabinet utilise sa propre clé
  d'accès Google, le cabinet est l'expéditeur et signe directement les conditions de Google] /
  [si l'éditeur fournit la clé, l'éditeur agit comme sous-traitant du cabinet et c'est lui qui transfère].
- Conditions de Google : **⚠️ À VÉRIFIER (éditeur)** : l'éditeur s'engage à n'utiliser qu'un accès
  payant pour lequel, selon les conditions de Google en vigueur, les contenus ne servent pas à
  améliorer les produits de Google ; préciser ici la durée de conservation des requêtes par Google
  et le lieu de traitement d'après les conditions actuelles.
- Les réponses de l'IA sont une **aide à la décision** : elles ne constituent ni un diagnostic ni une
  prescription et ne remplacent pas le jugement du médecin dentiste (voir les conditions de licence).
- Molaris conserve localement la réponse de l'IA dans le dossier du patient lorsque le praticien
  l'enregistre.

## 6. Sécurité

Mesures prévues par l'éditeur (à tenir à jour avec l'état réel du logiciel) :
- traitement local, sans hébergement des données patients chez l'éditeur ;
- filtrage des identifiants avant tout appel au service d'IA ; communications avec ce service
  chiffrées (HTTPS) ;
- documents médico-légaux (ordonnances, notes signées) non modifiables : les corrections sont des
  ajouts datés ;
- **en cours de développement ⚠️** : comptes utilisateurs individuels avec mot de passe, accès limité
  au poste local par défaut, journal des accès, sauvegarde automatique chiffrée, export du dossier
  d'un patient.

Mesures qui relèvent du cabinet : verrouillage du poste, chiffrement du disque, mises à jour et
antivirus, séparation du Wi-Fi invités, sauvegardes hors site, engagement de confidentialité du
personnel.

## 7. Droits des personnes

Conformément à la loi n° 2004-63, toute personne dispose d'un **droit d'accès** (consultation et
copie de ses données dans une langue claire — art. 32 et 38), d'un **droit de rectification** et
d'effacement des données inexactes ou traitées illégalement (art. 40), d'un **droit d'opposition**
pour des raisons légitimes (art. 42) et du droit de **retirer son consentement** à tout moment (art. 27).

- **Patients** : adressez votre demande **au cabinet dentaire** qui vous soigne ; il est seul
  responsable de votre dossier. L'éditeur n'a pas accès à votre dossier.
- **Cabinets clients** : adressez votre demande à l'éditeur ([adresse e-mail]). Réponse sous un mois
  au plus.
- En cas de refus ou d'absence de réponse, vous pouvez saisir l'**Instance nationale de protection des
  données à caractère personnel (INPDP)**, Tunis — [adresse et site à compléter ⚠️ À VÉRIFIER].

## 8. Transferts hors de Tunisie

Les seules données susceptibles de quitter la Tunisie sont celles envoyées au service d'IA (§5),
après filtrage, lorsque le cabinet a activé cette fonction. Pays de traitement : **⚠️ À VÉRIFIER
(conditions Google)**. Les données de facturation des cabinets clients sont hébergées [en Tunisie /
préciser ⚠️].

## 9. Déclaration auprès de l'INPDP

L'éditeur a déclaré ses traitements auprès de l'INPDP le [date] (récépissé n° [n°])
**⚠️ À COMPLÉTER — ne pas publier cette politique avant le dépôt.**

## 10. Modifications

Toute modification substantielle est communiquée aux cabinets clients par e-mail et dans le
logiciel au moins [30] jours avant son entrée en vigueur.

---

## Sources

- Loi organique n° 2004-63 du 27 juillet 2004 (art. 27, 30, 32, 38, 40, 42, 52 cités) :
  <https://www.ins.tn/sites/default/files/2020-04/Loi%2063-2004%20Fr.pdf>
- Décret n° 2007-3004 du 27 novembre 2007 (déclaration et autorisation) :
  <https://jurisitetunisie.com/tunisie/codes/ce/D2007-3004.html>
- Modèle d'information INPDP (assurances de santé) :
  <https://www.ordremedecins-centre.org.tn/fileadmin/contenu/Communiques_divers/INPDP/INPDP_assurances_sante.pdf>
- Code Molaris (lecture seule) : `src/ai/gemini.ts`, `src/domain/ai-privacy.ts`.
- Analyse détaillée : `docs/legal/inpdp-conformite.md`.
