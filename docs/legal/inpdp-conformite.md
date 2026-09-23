# Conformité à la loi organique n° 2004-63 (protection des données personnelles) — Molaris

> **Statut : BROUILLON — à faire valider par un juriste tunisien et, pour les points marqués, par l'INPDP.**
> Ce document est une liste de contrôle pratique. Ce n'est pas un avis juridique.
> Les numéros d'articles cités ont été vérifiés dans le texte de la loi (voir Sources). Tout point
> incertain est marqué **⚠️ À VÉRIFIER**, avec la personne ou l'organisme à consulter.

Public visé :
- **Le cabinet dentaire** (client de Molaris) : c'est lui qui traite les données de ses patients.
- **L'éditeur de Molaris** (petite société qui vend le logiciel) : il a ses propres obligations,
  et devient sous-traitant dans certains cas (support à distance, sauvegarde externe, clé IA fournie).

---

## 1. Qui est responsable de quoi ?

La loi définit (art. 6) le **responsable du traitement** (« détermine les finalités et les moyens »),
le **sous-traitant** (« traite des données pour le compte du responsable ») et le **tiers**.

| Acteur | Rôle au sens de la loi | Pourquoi |
|---|---|---|
| Le médecin dentiste / la société civile professionnelle | **Responsable du traitement** | Il décide de tenir le dossier patient, de facturer, d'utiliser l'IA. |
| L'éditeur de Molaris | **Aucun rôle** tant que le logiciel tourne seul sur le PC du cabinet et que l'éditeur n'accède à rien. **Sous-traitant** dès qu'il accède aux données (télémaintenance, récupération d'une base, sauvegarde hébergée) ou qu'il fournit la clé API Gemini utilisée pour les appels IA. | Art. 6 et 20. |
| Google (API Gemini) | Destinataire à l'étranger des requêtes IA (et probablement sous-traitant ultérieur) | Les textes, images et questions envoyés sont traités hors de Tunisie. |
| CNAM, assurances complémentaires | Destinataires légitimes de certaines données (bulletins de soins, demandes d'accord préalable) | Données remises au patient ou transmises selon la réglementation de l'assurance maladie. |

**⚠️ À VÉRIFIER (architecture + juriste)** : qui détient la clé `GEMINI_API_KEY` en production ?
Si c'est l'éditeur (une clé pour tous les cabinets), l'éditeur est sous-traitant pour les appels IA
et devient la partie qui transfère les données à Google ; si chaque cabinet a sa propre clé, c'est
le cabinet. Ce choix change qui doit demander l'autorisation de transfert (voir §4).

---

## 2. Les données de santé : une catégorie sensible

Ce que dit la loi (texte vérifié) :

- **Art. 14** : le traitement des données concernant « directement ou indirectement … la santé »
  est **interdit par principe**, sauf notamment **consentement exprès de la personne « donné par
  n'importe quel moyen laissant une trace écrite »**, ou nécessité pour les intérêts vitaux. Le
  même article renvoie, pour la santé, aux règles spéciales du chapitre V.
- **Art. 15** : les données de l'art. 14 sont soumises à **autorisation** de l'INPDP, **« à
  l'exception des données relatives à la santé »**.
- **Art. 16, al. 2** : les articles 7 (déclaration), 8 (contenu de la demande d'autorisation),
  27 (consentement écrit), 28 (enfants), 31 (information préalable) et 47 (communication aux tiers)
  **ne s'appliquent pas « au traitement … qu'exige le suivi de l'état de santé de la personne
  concernée »**.
- **Art. 62** : les données de santé peuvent être traitées notamment (1°) avec le consentement de
  la personne, de ses héritiers ou de son tuteur, (4°) lorsque le traitement est bénéfique pour la
  santé de la personne ou nécessaire, à des fins préventives ou thérapeutiques, au suivi de son état
  de santé.
- **Art. 63** : seuls **des médecins ou des personnes tenues au secret professionnel** peuvent
  mettre en œuvre le traitement. La communication par les médecins à d'autres personnes ou
  établissements se fait **sur la base d'une autorisation de l'INPDP** (réponse sous un mois).
- **Art. 64** : le traitement ne peut pas durer plus que nécessaire à son but.
- **Art. 65** : l'INPDP peut fixer des précautions et interdire la diffusion.
- **Délibération INPDP n° 4 du 5 septembre 2018** « concernant le traitement des données à
  caractère personnel liées à la santé » : texte de référence de l'INPDP (analyse d'impact, registre,
  hébergement des données de santé — son art. 16 est cité par l'INPDP sur l'hébergement externalisé).
  **⚠️ À VÉRIFIER (INPDP)** : nous n'avons pas pu lire le texte intégral de cette délibération ;
  en obtenir une copie et compléter cette liste avec ses exigences exactes.

### Point d'incertitude majeur : déclaration ou pas pour un cabinet dentaire ?

L'art. 16 al. 2 semble dispenser de déclaration (art. 7) le traitement nécessaire au suivi de la
santé du patient. Mais l'INPDP, dans une fiche diffusée par le Conseil régional de l'Ordre des
médecins du Centre (télémédecine), écrit que les traitements de données de santé sont « soumis à une
déclaration et une autorisation préalable de l'Instance, conformément aux articles 7 et 14 … et à
l'article 8 de la délibération n° 4 du 5 septembre 2018 ».

- **⚠️ À VÉRIFIER (INPDP, par écrit)** : quelle formalité exacte un cabinet dentaire libéral doit-il
  accomplir pour (a) le dossier patient, (b) la facturation, (c) l'agenda/rappels SMS, (d) les appels
  IA vers l'étranger ? Déclaration simple, autorisation, ou dispense de l'art. 16 ?
- **Recommandation prudente en attendant** : faire la **déclaration** (formulaire INPDP ; procédure
  du décret n° 2007-3004 du 27 novembre 2007 ; silence d'un mois = acceptation, art. 7) et recueillir
  un **consentement écrit** du patient. Cela ne coûte presque rien et protège le praticien.

---

## 3. Liste de contrôle du cabinet dentaire

Cochez chaque ligne avant d'utiliser Molaris avec de vrais patients.

### 3.1 Formalités

- [ ] **Déclaration** du traitement « dossier patient / gestion du cabinet » auprès de l'INPDP
      (art. 7 ; dépôt contre récépissé, lettre recommandée ou tout moyen laissant une trace écrite ;
      signée par le responsable du traitement — décret 2007-3004). Garder le récépissé.
- [ ] Si l'IA est activée : **demande d'autorisation de transfert à l'étranger** (art. 52 — « dans
      tous les cas ») — voir §4. L'INPDP propose une procédure « autorisation préalable de transfert
      de données de santé » (répertoriée sur Idaraty).
- [ ] Si le cabinet a des **caméras de vidéosurveillance** : autorisation préalable INPDP (art. 69),
      uniquement dans les lieux prévus (art. 70 : lieux ouverts au public et leurs entrées, etc.),
      **jamais d'enregistrement sonore** (art. 71), affichage clair et permanent (art. 72).
      **⚠️ À VÉRIFIER (INPDP)** : une salle d'attente de cabinet est-elle un « lieu ouvert au
      public » ? Aucune caméra en salle de soins.
- [ ] Conditions de l'**art. 22** remplies par le responsable, ses agents et tout sous-traitant :
      nationalité tunisienne, résidence en Tunisie, absence d'antécédents judiciaires (la déclaration
      comporte cet engagement — décret 2007-3004). Voir §4 pour la difficulté que cela pose avec Google.

### 3.2 Consentement et information du patient

- [ ] **Consentement écrit** au traitement des données (modèle : `consentements/consentement-donnees-personnelles.md`,
      FR + AR), signé et conservé (papier scanné ou original).
- [ ] **Consentement séparé** pour l'envoi de données pseudonymisées (nom retiré) au service d'IA (art. 30 : un
      consentement donné pour une finalité ne vaut pas pour une autre).
- [ ] Le consentement n'est **jamais une condition des soins** (art. 17 : interdiction de lier une
      prestation à l'acceptation d'un traitement de données pour d'autres fins). Un refus de l'IA ne
      change rien aux soins.
- [ ] **Information** du patient sur : nature des données, finalités, caractère obligatoire ou non
      des réponses, destinataires, identité du responsable, droits d'accès / de rétractation /
      d'opposition, durée de conservation, mesures de sécurité, **pays de transfert** (liste de l'art. 31).
      Le modèle de consentement reprend ces mentions.
- [ ] Aucune utilisation **publicitaire** (rappels promotionnels, SMS de promotion) sans consentement
      exprès et spécifique (art. 30 al. 2).
- [ ] **Patients mineurs** : l'art. 28 exige le consentement du tuteur **et l'autorisation du juge de
      la famille** ; mais l'art. 16 al. 2 écarte l'art. 28 pour le traitement exigé par le suivi de la
      santé. **⚠️ À VÉRIFIER (INPDP / juriste)** : régime exact pour les enfants soignés au cabinet,
      et surtout pour un **transfert à l'étranger** de données d'enfant — l'art. 52 al. 3 prévoit que
      la demande est alors présentée **au juge de la famille**. Recommandation : **désactiver l'IA
      pour les patients de moins de 18 ans** tant que ce point n'est pas clarifié.
      **⚠️ À VÉRIFIER (juriste)** : âge de la majorité applicable à ce consentement (Code des obligations et des contrats,
      Code du statut personnel — confirmer l'âge et les règles pour un mineur émancipé).

### 3.3 Personnes autorisées

- [ ] Seuls le praticien et le personnel **soumis au secret professionnel** accèdent aux dossiers
      (art. 63). Faire signer à l'assistante / à la secrétaire un **engagement de confidentialité**
      (l'obligation survit à la fin du contrat — art. 23).
- [ ] Un **compte par personne**, pas de compte partagé (recommandation INPDP, fiche télémédecine).
      **Molaris n'a pas encore d'authentification** : voir §5.

### 3.4 Sous-traitants

- [ ] Contrat écrit avec chaque sous-traitant (éditeur si télémaintenance, hébergeur de sauvegarde,
      prestataire SMS…) : il n'agit que sur instruction, respecte la loi, dispose des moyens techniques
      adaptés (art. 20). Le responsable et le sous-traitant sont **civilement responsables** (art. 20).
- [ ] Le droit d'accès du patient peut aussi s'exercer auprès du sous-traitant (art. 36).

### 3.5 Droits des patients (procédure interne)

| Droit | Texte | Délai / modalités | Comment le faire avec Molaris |
|---|---|---|---|
| Accès + copie « dans une langue claire » et forme intelligible | art. 32, 38, 40 | Demande écrite ; copie **sous un mois** ; copie **sans frais** (art. 40). Recours INPDP dans le mois suivant un refus. | ⚠️ Fonction d'export du dossier complet (PDF FR/AR) à prévoir — voir §5. |
| Rectification, complément, mise à jour, effacement si inexact ou illicite | art. 21, 32, 40 | Informer le patient et les destinataires dans les 2 mois (art. 21). | Les actes médico-légaux (ordonnances, notes signées) ne sont **jamais modifiés** : on ajoute un **addendum** (règle Molaris). ⚠️ À VÉRIFIER (juriste) : compatibilité de cette immuabilité avec une demande d'effacement. |
| Demande électronique | art. 37 | Le responsable d'un traitement automatisé doit permettre l'envoi électronique des demandes de rectification/effacement. | Indiquer une adresse e-mail du cabinet dans l'information patient. |
| Opposition | art. 42 | Pour raisons « valables, légitimes et sérieuses », sauf traitement prévu par la loi ou exigé par la nature de l'obligation. **L'opposition suspend immédiatement le traitement.** | Opposition à l'IA ou aux SMS : case à cocher sur la fiche patient (à développer). |
| Retrait du consentement | art. 27 al. 2 | À tout moment. | Idem. |
| Litige sur l'exactitude | art. 39 | Mentionner l'existence du litige jusqu'à décision. | Note datée dans le dossier. |

- [ ] On ne peut pas renoncer à l'avance au droit d'accès (art. 33) : ne jamais l'écrire dans un formulaire.
- [ ] Limitation du droit d'accès possible seulement pour protéger la personne elle-même ou des tiers,
      ou pour la recherche (art. 35).

### 3.6 Conservation et destruction

La loi ne fixe **pas** de durée : la durée est celle indiquée dans la déclaration, ou fixée par des
lois spécifiques, ou la fin de la finalité (art. 45, 64).

| Donnée | Durée proposée | Statut |
|---|---|---|
| Dossier médical dentaire (fiche, schéma dentaire, notes, plans de traitement) | À définir | **⚠️ À VÉRIFIER (Conseil de l'Ordre des médecins dentistes / Ministère de la santé)** : existe-t-il une durée légale de conservation du dossier médical en exercice libéral en Tunisie ? |
| Radiographies et images | Même durée que le dossier | ⚠️ idem |
| Ordonnances (copie cabinet) | Même durée que le dossier | ⚠️ idem |
| Consentements signés | Au moins la durée du dossier | ⚠️ idem — et, pour la preuve en cas de litige, la **prescription de l'action en responsabilité** : ⚠️ À VÉRIFIER (juriste). |
| Factures, reçus, livres comptables | À définir | **⚠️ À VÉRIFIER (expert-comptable)** : durée de conservation fiscale et comptable applicable. |
| Journaux techniques (logs), historique des requêtes IA | Court (ex. 12 mois) | Proposition de l'éditeur, à inscrire dans la déclaration. |

- [ ] Inscrire les durées choisies dans la **déclaration** INPDP.
- [ ] **Destruction** (art. 45) : la loi prévoit qu'**un procès-verbal est établi par huissier de
      justice en présence d'un expert désigné par l'Instance**, aux frais du responsable.
      **⚠️ À VÉRIFIER (INPDP)** : comment cette règle est appliquée en pratique pour un cabinet qui
      purge des dossiers anciens (destruction groupée annuelle ? dispense ?). Ne rien purger en
      masse avant réponse.
- [ ] **Cessation d'activité** (départ à la retraite, fermeture) : informer l'INPDP **trois mois
      avant** (art. 24) ; en cas de décès, les héritiers ont trois mois. L'INPDP autorise la
      destruction ou la communication à un successeur (art. 25) — la communication effective
      nécessite l'accord écrit du patient ; sans accord dans les trois mois, les données sont détruites.
      **⚠️ À VÉRIFIER (Ordre des médecins dentistes)** : articulation avec les règles ordinales de
      transmission des dossiers au successeur.

---

## 4. Transfert à l'étranger : les appels IA vers Google Gemini

### 4.1 Ce que fait le logiciel aujourd'hui (constaté dans le code)

- Tous les appels passent par une fonction unique (`callGeminiWithResilience`) qui **remplace les
  noms, parties de noms et numéros de dossier** de tous les patients connus par `[PATIENT]` /
  `[CHART-ID]` avant l'envoi.
- **Les images (radiographies, photos) sont envoyées telles quelles** : le code indique que les
  parties non textuelles « passent sans modification ». Une radiographie panoramique ou une photo
  peut contenir un nom incrusté, une date de naissance, le nom du cabinet ou un visage.
- Le texte envoyé peut contenir d'autres éléments identifiants non filtrés : âge, date de naissance,
  téléphone, n° CIN, nom d'un parent, ville, profession, antécédents rares.

### 4.2 Analyse

- La loi protège toute information permettant d'identifier une personne **« directement ou
  indirectement »** (art. 4 et 5). Des données pseudonymisées (nom retiré, mais âge + antécédents +
  radiographie) restent, par prudence, des **données personnelles de santé**.
- **Art. 51** : transfert seulement vers un pays assurant un **niveau de protection adéquat**.
  L'INPDP a adopté une **délibération n° 3 du 5 septembre 2018** « portant identification des États
  ayant un niveau de protection adéquat ». **⚠️ À VÉRIFIER (INPDP)** : les pays où Google traite les
  requêtes Gemini (États-Unis et/ou autres) figurent-ils sur cette liste ?
- **Art. 52** : **« Dans tous les cas, l'obtention de l'autorisation de l'Instance pour effectuer le
  transfert … vers l'étranger est obligatoire. »** Réponse sous un mois maximum. Pour un enfant, la
  demande va au juge de la famille.
- **Art. 90** : transférer des données à l'étranger sans autorisation est puni d'un an
  d'emprisonnement et de 5 000 dinars d'amende.
- **Art. 22** : le sous-traitant et ses agents doivent être de nationalité tunisienne, résider en
  Tunisie et être sans antécédents judiciaires. Google ne peut pas remplir ces conditions.
  **⚠️ À VÉRIFIER (juriste spécialisé + INPDP)** : Google est-il juridiquement un « sous-traitant »
  soumis à l'art. 22, ou un « bénéficiaire » d'un transfert autorisé au titre des art. 51-52 ?
  C'est **le point juridique le plus risqué** de Molaris.
- Conditions de Google : **⚠️ À VÉRIFIER (éditeur, lecture des conditions Google en vigueur)** :
  selon les conditions de l'API Gemini, les contenus envoyés via un **niveau gratuit** peuvent être
  utilisés pour améliorer les produits de Google et être lus par des relecteurs humains, ce qui n'est
  pas le cas pour les services **payants** ; vérifier la version actuelle, la durée de conservation
  des requêtes (surveillance des abus) et la région de traitement. **N'utiliser qu'une clé
  rattachée à un compte de facturation payant.**

### 4.3 Recommandations (produit + cabinet)

1. **IA désactivée par défaut** ; activation par le cabinet seulement après dépôt de la demande
   d'autorisation de transfert (le logiciel peut demander le n° de récépissé INPDP).
2. **Consentement IA par patient** (case dédiée, datée) ; aucun appel IA pour un patient sans ce
   consentement ; **aucun appel IA pour un mineur** tant que le §3.2 n'est pas clarifié.
3. Élargir le filtrage : dates de naissance, téléphones, n° CIN, identifiant CNAM, adresses e-mail,
   nom du cabinet et du praticien. Afficher au praticien **le texte exact** qui partira avant l'envoi.
4. Images : retirer les métadonnées (EXIF/DICOM), et **avertir** le praticien de recadrer toute zone
   portant un nom ; idéalement proposer un recadrage/masquage avant envoi.
5. Journaliser chaque appel IA (date, utilisateur, patient concerné, type de données, modèle utilisé)
   **localement**, sans conserver de copie du contenu au-delà du nécessaire.
6. Mentionner le transfert (pays, finalité, destinataire) dans la déclaration INPDP et dans
   l'information patient (art. 31 exige d'indiquer « le pays vers lequel le responsable … entend …
   transférer les données »).

---

## 5. Mesures de sécurité (art. 18 et 19) — état de Molaris

L'art. 19 énumère sept objectifs. Constat au 23/09/2026 sur le code de la branche principale :

| Exigence (art. 19) | État actuel de Molaris | Action recommandée | Priorité |
|---|---|---|---|
| Empêcher l'accès physique non autorisé aux équipements | Dépend du cabinet | PC en zone non accessible au public, session Windows verrouillée, écran tourné vers le praticien. | Cabinet |
| Empêcher que les supports soient lus, copiés, modifiés ou déplacés | Base SQLite `data/molaris.db` et images en clair sur le disque | Chiffrement du disque (BitLocker) ; ⚠️ étudier le chiffrement de la base. | Haute |
| Empêcher l'introduction, la consultation ou l'effacement non autorisés | **Pas de connexion (login) ; le serveur écoute sur `0.0.0.0`** : tout appareil du réseau local du cabinet (y compris un Wi-Fi invité) peut ouvrir `http://<ip-du-pc>:3000` et lire les dossiers | **Bloquant** : authentification par utilisateur, écoute sur `127.0.0.1` par défaut, pare-feu Windows ; Wi-Fi invités séparé. | **Bloquante** |
| Empêcher l'usage du système par des personnes non autorisées | Idem | Comptes individuels, rôles (praticien / assistant / secrétariat), verrouillage après inactivité. | **Bloquante** |
| Pouvoir vérifier a posteriori qui a accédé, quelles données ont été saisies, quand et par qui | Horodatage de certains enregistrements ; pas de journal d'accès par utilisateur | Journal d'audit (consultation, création, modification, export, appel IA) non modifiable. | Haute |
| Empêcher la lecture/modification pendant la communication ou le transport | Appels Gemini en HTTPS ; accès local en HTTP | HTTPS si accès depuis un autre poste ; exports chiffrés (ZIP avec mot de passe) ; jamais par messagerie personnelle (fiche INPDP télémédecine). | Moyenne |
| Sauvegarde par copies de réserve sécurisées | Copie seulement lors de `npm run db:demo` | Sauvegarde automatique quotidienne chiffrée, copie hors site (clé USB chiffrée au coffre ou hébergement conforme), test de restauration trimestriel. | Haute |

Autres points :
- [ ] Mises à jour Windows et antivirus sur le PC du cabinet.
- [ ] Mot de passe du PC personnel à chaque utilisateur ; pas de session partagée.
- [ ] Procédure écrite en cas d'incident (vol du PC, rançongiciel, envoi par erreur). La loi de 2004
      ne prévoit pas d'obligation de notification des violations ; **⚠️ À VÉRIFIER (veille
      juridique)** : le projet de nouvelle loi (voir §8) pourrait en créer une.

---

## 6. Liste de contrôle de l'éditeur de Molaris

- [ ] Déclarer à l'INPDP ses **propres** traitements : fichier clients (cabinets), facturation,
      support, prospection. **⚠️ À VÉRIFIER (INPDP)** : formalité exacte.
- [ ] **Contrat de sous-traitance** type à signer avec chaque cabinet (art. 20), couvrant : accès en
      télémaintenance uniquement sur demande et en présence du cabinet, pas de copie des données,
      confidentialité (art. 23), conditions de l'art. 22 pour les techniciens.
- [ ] Si l'éditeur fournit la clé API Gemini : c'est lui qui transfère → demande d'autorisation art. 52
      au nom de l'éditeur **⚠️ À VÉRIFIER (INPDP)** : un seul dossier pour tous les cabinets ou un par cabinet ?
- [ ] Livrer les correctifs de sécurité du §5 (authentification, écoute locale, audit, sauvegarde, export).
- [ ] Pas de télémétrie contenant des données patients. **⚠️ À VÉRIFIER (équipe technique)** :
      confirmer qu'aucune donnée n'est envoyée à l'éditeur ou à un service tiers en dehors de Gemini
      (polices, CDN Tailwind : le navigateur charge des ressources externes — vérifier qu'aucune
      donnée patient n'est incluse dans ces requêtes).
- [ ] Informer l'INPDP **trois mois avant** une cessation définitive d'activité (art. 24).

---

## 7. Sanctions (rappel, texte de la loi)

| Manquement | Article violé | Peine prévue |
|---|---|---|
| Transfert portant atteinte à la sécurité publique ou aux intérêts vitaux de la Tunisie | art. 50 | 2 à 5 ans + 5 000 à 50 000 D (art. 86) |
| Traitement de données de santé hors cas permis (art. 14 al. 1), par une personne non tenue au secret (art. 63 al. 1), traitement des données d'un enfant sans consentement du tuteur/juge (art. 28 al. 1), sans consentement écrit (art. 27 al. 1), sans information (art. 31) | 14, 27, 28, 31, 63… | 2 ans + 10 000 D (art. 87) |
| Traitement sans déclaration (art. 7), **transfert à l'étranger sans autorisation**, communication sans consentement | 7, 52, 47 | 1 an + 5 000 D (art. 90) |
| Poursuite du traitement malgré opposition | art. 42 | 1 an + 5 000 D (art. 91) |
| Entrave au droit d'accès | art. 32 s. | 8 mois + 3 000 D (art. 92) |
| Défaut de sécurité (art. 18, 19), sous-traitance mal encadrée (art. 20), conservation excessive (art. 45, 64) | 18, 19, 20, 45, 64 | 3 mois + 1 000 D (art. 94) |
| Divulgation par le responsable, le sous-traitant ou leurs agents | — | Art. 254 du Code pénal, par renvoi de l'art. 97 |

Pour une personne morale, les peines s'appliquent au dirigeant (art. 101).

---

## 8. Veille : nouvelle loi en préparation

Une **proposition de loi organique n° 095/2025** relative à la protection des données personnelles
(environ 132 articles, inspirée du RGPD : délégué à la protection des données, amendes jusqu'à
200 000 dinars selon la presse) est examinée par la commission des droits et libertés de l'ARP
(auditions en février 2026, travaux en mai 2026 selon la presse).
**⚠️ À VÉRIFIER (veille juridique, tous les trimestres)** : adoption, date d'entrée en vigueur,
nouvelles obligations (notification des violations, analyse d'impact, règles de transfert).
Ce document devra être revu à l'adoption.

---

## 9. Questions à poser à l'INPDP (courrier à préparer)

1. Pour un cabinet dentaire libéral utilisant un logiciel local : déclaration (art. 7), autorisation,
   ou dispense (art. 16 al. 2) ? Quel formulaire ?
2. Envoi de textes pseudonymisés et d'images dentaires à un service d'IA situé hors de Tunisie :
   autorisation de transfert (art. 52) requise ? Le pays de destination est-il « adéquat »
   (délibération n° 3/2018) ? Google est-il soumis à l'art. 22 ?
3. Si l'éditeur fournit la clé API pour tous ses clients : qui dépose la demande ?
4. Patients mineurs : régime applicable (art. 16, 28, 52 al. 3).
5. Destruction des dossiers anciens (art. 45) : modalités pratiques pour un cabinet.
6. Durées de conservation recommandées pour le dossier dentaire.
7. Texte intégral et applicabilité de la délibération n° 4 du 5 septembre 2018 aux cabinets libéraux.

---

## Sources

- Loi organique n° 2004-63 du 27 juillet 2004 portant sur la protection des données à caractère
  personnel — texte intégral en français publié par l'Institut national de la statistique :
  <https://www.ins.tn/sites/default/files/2020-04/Loi%2063-2004%20Fr.pdf> (articles cités vérifiés
  dans ce texte). Également : <https://legislation-securite.tn/latest-laws/loi-organique-n-2004-63-du-27-juillet-2004-portant-sur-la-protection-des-donnees-a-caractere-personnel/>
- Décret n° 2007-3004 du 27 novembre 2007 fixant les conditions et les procédures de déclaration et
  d'autorisation : <https://jurisitetunisie.com/tunisie/codes/ce/D2007-3004.html>,
  <https://legislation-securite.tn/latest-laws/decret-n-2007-3004-du-27-novembre-2007-fixant-les-conditions-et-les-procedures-de-declaration-et-dautorisation-pour-le-traitement-des-donnees-a-caractere-personnel/>
- INPDP, « Protection des données personnelles : actes de télémédecine » (fiche diffusée par le
  Conseil régional de l'Ordre des médecins du Centre ; cite la délibération n° 4 du 5 septembre 2018
  et le décret 2007-3004) : <https://www.ordremedecins-centre.org.tn/fileadmin/contenu/Communiques_divers/INPDP/INPDP_telemedecine.pdf>
- INPDP, modèle « Obligations légales des assurances de santé » (cite les délibérations n° 3 et n° 4
  du 5 septembre 2018) : <https://www.ordremedecins-centre.org.tn/fileadmin/contenu/Communiques_divers/INPDP/INPDP_assurances_sante.pdf>
- Idaraty, fiches « Déclaration de traitement des données — INPDP » et « Autorisation préalable de
  transfert de données de santé — INPDP » (contenu détaillé réservé aux membres) :
  <https://idaraty.tn/fr/procedures/declaration-de-traitement-des-donnees-inpdp>,
  <https://idaraty.tn/fr/procedures/autorisation-prealable-de-transfert-de-donnees-de-sante-inpdp>
- Site de l'INPDP (formulaires) : <https://www.inpdp.tn/Formulaires.html> (inaccessible lors de la rédaction).
- Projet de loi 095/2025 : La Presse, 21/07/2025 et 05/08/2025
  (<https://lapresse.tn/2025/07/21/a-larp-examen-du-projet-de-loi-fondamentale-sur-la-protection-des-donnees-personnelles/>,
  <https://lapresse.tn/2025/08/05/jusqua-200-000-dinars-damendes-un-nouveau-projet-de-loi-pour-la-protection-des-donnees-personnelles/>) ;
  Business News, 27/02/2026 (<https://businessnews.com.tn/2026/02/27/donnees-personnelles-le-parlement-se-penche-sur-la-modernisation-de-la-legislation-tunisienne/1390118/>) ;
  La Presse, 20/05/2026 (<https://www.lapresse.tn/2026/05/20/arp-la-commission-des-droits-et-libertes-accelere-lexamen-des-chantiers-legislatifs-prioritaires/>).
- Code source Molaris (lecture seule) : `src/ai/gemini.ts`, `src/domain/ai-privacy.ts`, `server.ts`.
