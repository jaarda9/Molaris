# Molaris — ce que fait le logiciel

Référence pour l’enregistrement des tutoriels. Les noms d’écrans et de boutons sont cités
**exactement comme ils apparaissent à l’écran**, pour que la vidéo et l’interface correspondent.

Molaris est un logiciel de gestion de cabinet dentaire pour les médecins dentistes en Tunisie.
Il fonctionne sur le PC du cabinet (ouvert dans le navigateur à l’adresse
`http://localhost:3000`) : les données des patients restent sur ce PC.
L’interface est en français (anglais disponible) ; les documents remis au patient s’impriment
en français et/ou en arabe.

---

## Généralités

- **Menu de gauche** organisé par activité : **Cabinet**, **Dossier clinique**,
  **Assistant IA**, **Référence**.
- **Patient actif** (barre du haut) : le dossier sur lequel travaillent tous les écrans cliniques.
  Cliquez dessus pour changer de patient. Changer de patient efface tout brouillon non signé,
  pour que rien ne soit enregistré dans le mauvais dossier.
- **Alertes de sécurité** : bandeau permanent (CRITIQUE / AVERTISSEMENT / INFO) pour le patient
  ouvert — allergies, interactions médicamenteuses, risque cardiaque, etc.
- **Mode clair / sombre** et choix **FR / EN** dans la barre du haut.
- **Lecture vocale** des réponses du conseiller IA (bouton haut-parleur en haut).
- Fonctionne sur PC, tablette et téléphone (affichage adaptatif).

---

## 1. Cabinet

### Agenda
- Vues **Jour** et **Semaine** ; navigation **Aujourd'hui / Précédent / Suivant**.
- **Nouveau rendez-vous**, ou clic sur un créneau libre. Patient : **Patient existant** ou
  **Nouvel appelant (sans dossier)** (nom + téléphone suffisent, pour un premier appel).
- Motifs (Consultation, Détartrage, Soins, Endodontie, Extraction, Prothèse, Contrôle, Urgence,
  ou texte libre), durée, fauteuil, notes.
- Parcours du rendez-vous : **Planifié → Confirmé → Arrivé → En cours → Terminé**, ainsi que
  **Annulé** et **Absent** (gardés dans l’historique au lieu de supprimer).
- **Salle d'attente** : qui attend et depuis quand, qui est au fauteuil, le prochain patient,
  les retards ; boutons **Arrivé / Faire entrer / Terminer / Absent**.
- **Rappels** pour le lendemain : **Rappel WhatsApp** en un clic par patient (WhatsApp s’ouvre
  avec le message prêt) et suivi des rappels envoyés.
- **Horaires** : heures d’ouverture, jours d’ouverture et fauteuils (chaque fauteuil a sa
  colonne ; les chevauchements sont vérifiés par fauteuil).
- **Ouvrir le dossier** depuis un rendez-vous mène directement au dossier du patient.
- Nouvel appelant sans dossier : **Créer le dossier** depuis le rendez-vous (nom, téléphone et
  motif déjà remplis) ; le rendez-vous est rattaché au nouveau dossier.
- Faire entrer un patient dans un fauteuil encore occupé (« En cours ») demande confirmation.

### Patients
- Liste des **Dossiers patients**, recherche par nom, n° de dossier, téléphone, n° CNAM ou
  antécédent.
- **Nouveau patient** : nom, n° de dossier (automatique, `PT-2026-0001`), âge / date de
  naissance, sexe, poids, classe ASA, **Risque cardiaque** (plafonne l’adrénaline à 0,04 mg),
  motif de consultation, antécédents et alertes médicales, allergies, téléphone (WhatsApp),
  identifiant et qualité CNAM (assuré, conjoint, enfant, ascendant).
- Si un dossier existe déjà au même nom ou au même numéro de téléphone, le logiciel le signale
  avant d’en créer un second.
- **Ouvrir le dossier** fait de ce patient le patient actif.
- Outils de données : **Exporter les dossiers (JSON)**, **Importer des dossiers** et
  **Sauvegarde complète** (copie complète de la base — agenda, facturation, ordonnances,
  dossiers, réglages — à garder sur une clé USB).

### Facturation — montants en dinars (DT)
- **Devis** :
  - **Nouveau devis** à partir du catalogue (**Ajouter un acte du catalogue**) ou en
    **Ligne libre** ; quantité, prix unitaire, remise, ligne par dent.
  - **Créer depuis le plan de traitement** : reprend les actes planifiés.
  - Statuts **Brouillon → Envoyé → Accepté / Refusé / Expiré**, avec date de validité.
  - **Dupliquer**, **Imprimer** (avec l’en-tête du cabinet).
- **Règlements** :
  - Espèces, chèque, carte, virement ; rattaché à un devis (versement) ou non
    (ex. une consultation).
  - Chaque règlement reçoit un **reçu** numéroté, imprimable immédiatement.
  - Un règlement saisi par erreur est **annulé avec un motif**, jamais supprimé : il reste
    visible, barré, et n’est plus compté.
- Récapitulatif par patient : **Devis acceptés / Réglé sur devis / Reste à payer /
  Autres règlements**.
- Alerte quand des actes terminés ne figurent **sur aucun devis** (non facturés), avec création
  du devis en un clic.
- **Encaisser sans devis** : pour les petits actes payés sur place, cochez les actes réglés ;
  le montant et l’objet du reçu se remplissent seuls, et les actes ne sont plus « non facturés ».
- **Encaissements du jour** : la recette de la journée, par mode de paiement.
- **Catalogue des actes** : vos actes et honoraires (libellé français, libellé arabe facultatif,
  prix par défaut, lettre clé et coefficient CNAM facultatifs). Les prix de démonstration ne
  sont que des exemples.

### Ordonnances
- L’en-tête affiche **l’âge, les allergies et les traitements en cours** ; pour un enfant, le
  poids est aussi imprimé. Pour un enfant, seul le nom du médicament (DCI) est repris de la liste :
  dosage, forme et posologie sont à écrire selon le poids.
- Ajout des médicaments depuis la **Liste des médicaments** (enregistrés par DCI, nom commercial
  facultatif) ou en ligne libre. Les posologies par défaut sont des suggestions à valider.
- **Phrases courantes (FR + AR)** pour saisir vite la posologie ; consignes au patient en arabe
  facultatives.
- **Vérification de sécurité automatique** : allergies, traitements en cours et interactions.
  Une alerte critique **bloque** l’impression, sauf si vous cochez la confirmation.
- **Repères HAS 2026** sur toute ordonnance avec antibiotique (indications, amoxicilline 1 g 3 fois par jour
  pendant 3 jours, réévaluation à 3 jours ; dose selon le poids chez l’enfant).
- Cabinet qui démarre : **Charger la liste de départ (HAS 2026)** (amoxicilline, azithromycine,
  métronidazole, paracétamol, ibuprofène), à relire avant usage.
- Langue d’impression : **Français**, **Arabe** ou **Français + arabe**.
- **Émettre et imprimer** : l’ordonnance reçoit un numéro (`ORD-2026-0001`) et devient un
  document définitif (ni modifiable ni supprimable).
- **Historique** par patient : **Imprimer** à nouveau ou **Renouveler** (recopie les lignes dans
  une nouvelle ordonnance).
- Gestion de la liste des médicaments : ajouter, modifier, désactiver.

---

## 2. Dossier clinique — pour le patient actif

### Odontogramme
- Schéma interactif, numérotation **FDI (11-48)** ou **Universel (#1-32)**.
- Clic sur une dent : état (**Saine, Carie active, Obturation, Couronne / onlay, Traitement
  endodontique, Implant, Absente / extraite, Non érupté**), faces concernées, observations.
- **Dents temporaires** affichées automatiquement chez l’enfant, ou à la demande.
- **Demander l’avis du conseiller IA** sur la dent sélectionnée.

### Parodontologie
- Saisie par dent : profondeur de poche sur **6 sites**, récession, saignement, suppuration,
  mobilité, furcation.
- **Enregistrer le relevé** conserve un examen daté ; **Relevés précédents** pour comparer dans
  le temps.
- Les dents absentes ou incluses (d’après l’odontogramme) sont ignorées automatiquement.

### Plan de traitement
- **Ajouter un acte** : dent, acte, code CNAM facultatif, priorité (Urgent / Élevée / Routine /
  Optionnel), coût estimé, notes.
- Statuts **Proposé → Accepté → En cours → Terminé** (ou **Refusé**).
- Bouton **Modifier** (crayon) : corriger l’acte, la dent, le code, la priorité, le coût ou les notes.
- Totaux : **Reste à réaliser** et **Réalisé**.
- Un acte terminé sur une dent encore notée « Carie active » le signale, avec un bouton
  **Mettre à jour la dent**.
- Un acte terminé ne peut pas être supprimé (dossier médical). Le plan peut être transformé en
  devis dans Facturation.

### Médicaments (traitements en cours du patient)
- Les médicaments que prend le patient (ex. anticoagulants), avec posologie, fréquence et
  indication.
- Cette liste alimente les **vérifications d’interactions et d’allergies** des ordonnances et du
  bandeau de sécurité.
- Activer / désactiver plutôt que supprimer ; la réactivation d’un médicament est revérifiée.

### Laboratoire
- Suivi des couronnes, bridges, prothèses, appareils : dent, type, matériau, teinte, limite,
  laboratoire, échéance.
- Statuts **Planifié → Envoyé → Au laboratoire → Retourné → Posé** (ou **À refaire**) ; les dates
  d’envoi, de retour et de pose sont enregistrées automatiquement.
- Bouton **Modifier** : nouvelle échéance donnée par le laboratoire, teinte, matériau, notes.
- Badges **En retard** et **Échéance proche**.

---

## 3. Assistant IA — aide à la décision, jamais un diagnostic

Les noms des patients et les n° de dossier sont retirés avant tout envoi à l’IA.

### Conseiller IA
- Questions cliniques en français ou en anglais, tapées ou **dictées au micro**.
- **Raccourcis au fauteuil** (questions en 1 clic) : pulpite, effraction pulpaire, limite
  sous-gingivale, instrument fracturé, patient cardiaque, douleur post-opératoire.
- Connaît le dossier du patient ouvert (âge, ASA, allergies, traitements, dents) et vos
  préférences cliniques.
- **Peut agir dans le logiciel**, après votre confirmation : prendre un rendez-vous, créer un
  devis brouillon, enregistrer un règlement, mettre à jour une dent, ajouter un médicament,
  changer de patient, donner le solde d’un patient ou les encaissements du jour, lister les
  rendez-vous.
- La conversation est conservée par patient ; **Effacer la conversation** pour la vider.
- Commandes vocales : lancer un minuteur (« lance un minuteur de 20 secondes »), ouvrir un
  écran, sauvegarder la base, couper / remettre le son.

### Radiographies (dossier radiographique)
- **Dossier radiographique** du patient : toutes ses radiographies et photos, de la plus récente à la
  plus ancienne, conservées dans la base (donc dans la **Sauvegarde complète**).
- Ajouter un cliché (JPEG, PNG ou WebP, jusqu’à 20 Mo) avec son type (rétro-alvéolaire, bitewing,
  panoramique, cone beam, photo), sa date, la dent et **votre interprétation** : **Enregistrer au
  dossier**, ou **Enregistrer et analyser (IA)**.
- Pour chaque cliché : ouverture en grand, interprétation modifiable, **seconde lecture IA à
  confirmer** (conservée et datée, relançable avec une question précise).
- Un cliché ne peut être supprimé que le jour de son ajout (erreur) ; ensuite il reste au dossier.
- Les deux exemples pédagogiques sont analysés mais jamais enregistrés.

### Comptes-rendus (SOAP)
- Saisissez l’acte, la dent, l’anesthésie, les matériaux et le déroulement →
  **Générer le compte-rendu**.
- L’IA rédige un **brouillon** (Subjectif, Objectif, Analyse, Plan). Les informations manquantes
  apparaissent en « [à compléter] » : elle n’invente rien.
- Relisez, corrigez, puis **Signer et enregistrer au dossier**. Un compte-rendu signé est
  définitif ; les corrections s’ajoutent en **Addendum** daté.
- Avant la signature, le logiciel signale les mentions « [à compléter] » restantes.
- **Comptes-rendus signés** : l’historique des comptes-rendus du patient.

---

## 4. Référence

### Anesthésie
- **Calculateur de dose** : molécule, poids du patient, risque cardiaque → carpules maximales,
  dose maximale (mg), carpules restantes, facteur limitant.
- **+1 carpule injectée** pour compter pendant l’acte ; les doses déjà enregistrées aujourd’hui
  sont prises en compte.
- **Enregistrer au dossier** : inscrit les carpules injectées dans le dossier du patient (total du
  jour, repris dans le compte-rendu SOAP).
- Fiches de référence : **antibioprophylaxie de l’endocardite** (ESC 2023 + consensus tunisien)
  et **antalgie post-opératoire** (non opioïde).
- Toujours signalé « Calcul indicatif : vérifier le RCP ».

### Protocoles
- Fiches réflexes pour les complications au fauteuil : dent chaude / échec d’anesthésie,
  instrument fracturé, alvéolite, remontée de marge, communication bucco-sinusienne.
- Filtre par catégorie ; **Demander au conseiller** pour discuter d’un protocole avec l’IA.

### Profil & préférences
- **Identité du cabinet** : nom du cabinet, praticien, spécialité, adresse, téléphone, e-mail,
  **n° d’inscription à l’Ordre**, **matricule fiscal**, **code conventionnel CNAM**. Imprimés sur
  chaque devis, reçu et ordonnance. **Imprimer une page de test** pour vérifier l’en-tête.
- **Préférences cliniques** pour le conseiller IA : système adhésif, composite, instrumentation
  rotative, système implantaire, philosophie clinique.
- **Voix du conseiller** : choix de la voix qui lit les réponses (Microsoft Edge propose les voix
  les plus naturelles).

---

## Ordre conseillé pour les tutoriels

1. **Premier réglage** — Profil & préférences : remplir l’identité du cabinet, imprimer une page
   de test.
2. **Patients** — créer un patient, ouvrir son dossier.
3. **Agenda** — prendre un rendez-vous, suivre la salle d’attente, envoyer un rappel WhatsApp.
4. **Dossier clinique** — odontogramme, puis plan de traitement.
5. **Facturation** — devis depuis le plan, enregistrer un règlement, imprimer le reçu,
   encaissements du jour.
6. **Ordonnances** — en rédiger une, montrer une alerte de sécurité, imprimer en français + arabe.
7. **IA** — question au fauteuil, lecture de radiographie, brouillon de compte-rendu → signature.
8. **Référence** — calculateur d’anesthésie et protocoles.
9. **Sauvegarde** — Sauvegarde complète sur clé USB (expliquer pourquoi c’est important).

À souligner : le logiciel fonctionne sans internet, sauf les fonctions IA et la dictée vocale.
