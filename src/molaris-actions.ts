import { patientDb, PatientRecord } from './patient-db.js';
import os from 'os';

export interface ActionResult {
  executed: boolean;
  actionType?: string;
  summary?: string;
  data?: any;
}

// Map FDI two-digit numbering to Universal (1-32)
function fdiToUniversal(fdi: number): number | null {
  const fdiMap: Record<number, number> = {
    // Upper Right (Quadrant 1)
    18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
    // Upper Left (Quadrant 2)
    21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
    // Lower Left (Quadrant 3)
    38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
    // Lower Right (Quadrant 4)
    41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32
  };
  return fdiMap[fdi] || null;
}

export function executeMolarisAction(commandText: string, language: string = 'en'): ActionResult {
  const text = commandText.trim();
  const lower = text.toLowerCase();
  const isFr = language === 'fr';

  // 1. Switch Patient Action (English & French)
  // e.g. "switch patient to Eleanor Davis", "changer de patient pour Lucas Chen", "ouvrir dossier Eleanor"
  const switchMatch = lower.match(/(?:switch|change|open|select|changer|basculer|ouvrir|sélectionner)\s+(?:patient|chart|record|dossier)?\s*(?:to|pour|sur|de)?\s*([a-z0-9\s\-]+)/i);
  if (switchMatch && (
    lower.includes('patient') ||
    lower.includes('chart') ||
    lower.includes('dossier') ||
    lower.includes('switch to') ||
    lower.includes('changer pour') ||
    lower.includes('basculer sur') ||
    lower.includes('open chart')
  )) {
    const query = switchMatch[1].replace(/patient|chart|record|dossier/gi, '').trim();
    if (query) {
      const patient = patientDb.getPatientByNameOrQuery(query);
      if (patient) {
        patientDb.setActivePatient(patient.id);
        const summary = isFr
          ? `Dossier actif basculé sur **${patient.name}** (${patient.chartId}, ASA ${patient.asaStatus}, ${patient.weightKg}kg).`
          : `Switched active chart to **${patient.name}** (${patient.chartId}, ${patient.asaStatus}, ${patient.weightKg}kg).`;
        return {
          executed: true,
          actionType: 'SWITCH_PATIENT',
          summary,
          data: { patientId: patient.id, patient }
        };
      }
    }
  }

  // 2. Start Chairside Timer Action (English & French)
  // e.g. "start 15s etch timer", "lancer minuteur 20s", "chronomètre 30 secondes", "start cure timer 20 seconds"
  const timerMatch = lower.match(/(?:start|set|begin|lancer|activer|démarrer|chronomètre|minuteur)\s+(?:a\s+|un\s+)?(\d+)\s*(?:s|sec|secondes?|seconds?|min|minutes?)\s*(?:etch|cure|timer|chairside|mordançage|polymérisation)?/i);
  if (timerMatch || (lower.includes('minuteur') || lower.includes('timer') || lower.includes('chronomètre'))) {
    let seconds = 20;
    if (timerMatch) {
      const rawVal = parseInt(timerMatch[1], 10);
      const isMin = /\b(?:min|mins|minutes?)\b/i.test(timerMatch[0]);
      seconds = isMin ? rawVal * 60 : rawVal;
    } else {
      const numMatch = lower.match(/(\d+)/);
      if (numMatch) seconds = parseInt(numMatch[1], 10);
    }

    const summary = isFr
      ? `Minuteur fauteuil lancé pour **${seconds} secondes** avec alerte sonore audible.`
      : `Started chairside timer for **${seconds} seconds** with audible alert.`;

    return {
      executed: true,
      actionType: 'START_TIMER',
      summary,
      data: { seconds, durationSeconds: seconds }
    };
  }

  // 3. Update Tooth Action (English & French - Supports Universal 1-32 and FDI 11-48)
  // e.g. "mark tooth 19 as caries", "dent 46 a une carie profonde", "tooth 30 has deep caries"
  const toothMatch = lower.match(/(?:mark|set|update|marquer|noter)?\s*(?:tooth|dent)\s*#?\s*(\d{1,2})\s*(?:as|to|has|is|comme|a|est)?\s*(caries|decay|cavity|carie|sound|saine|restoration|filling|composite|obturation|crown|couronne|onlay|rct|root canal|endo|traitement de canal|missing|manquante|extracted|extraite|implant)/i);
  if (toothMatch) {
    const rawToothNum = parseInt(toothMatch[1], 10);
    let toothId: number | null = null;

    if (rawToothNum >= 1 && rawToothNum <= 32) {
      toothId = rawToothNum;
    } else if (rawToothNum >= 11 && rawToothNum <= 48) {
      toothId = fdiToUniversal(rawToothNum);
    }

    if (toothId && toothId >= 1 && toothId <= 32) {
      let statusRaw = toothMatch[2].toLowerCase();
      let mappedStatus: any = 'sound';
      if (statusRaw.includes('carie') || statusRaw.includes('decay') || statusRaw.includes('cavity')) mappedStatus = 'caries';
      else if (statusRaw.includes('restoration') || statusRaw.includes('filling') || statusRaw.includes('composite') || statusRaw.includes('obturation')) mappedStatus = 'restoration';
      else if (statusRaw.includes('crown') || statusRaw.includes('couronne') || statusRaw.includes('onlay')) mappedStatus = 'crown';
      else if (statusRaw.includes('rct') || statusRaw.includes('root canal') || statusRaw.includes('endo') || statusRaw.includes('canal')) mappedStatus = 'rct';
      else if (statusRaw.includes('missing') || statusRaw.includes('manquante') || statusRaw.includes('extracted') || statusRaw.includes('extraite')) mappedStatus = 'missing';
      else if (statusRaw.includes('implant')) mappedStatus = 'implant';
      else mappedStatus = 'sound';

      const updatedTooth = patientDb.updateToothForActivePatient(toothId, { status: mappedStatus });
      const activePatient = patientDb.getActivePatient();

      const summary = isFr
        ? `Dent **#${toothId}** (FDI ${updatedTooth.fdi} - ${updatedTooth.name}) mise à jour sur **[${mappedStatus.toUpperCase()}]** dans le dossier de ${activePatient.name}.`
        : `Updated **Tooth #${toothId}** (${updatedTooth.name}) to **[${mappedStatus.toUpperCase()}]** in ${activePatient.name}'s chart.`;

      return {
        executed: true,
        actionType: 'UPDATE_TOOTH',
        summary,
        data: { tooth: updatedTooth, patient: activePatient }
      };
    }
  }

  // 4. Log Anesthesia Action (English & French)
  // e.g. "log 1 carpule of septocaine", "injecté 1.5 carpules articaine", "noter 1 cartouche mepivacaine"
  const anesMatch = lower.match(/(?:log|administered|injected|gave|injecté|injecter|noter|administré)\s+([0-9.]+)\s*(?:carpule|carpules|cartridge|cartridges|cartouche|cartouches)\s*(?:of|de|d\')?\s*([a-z0-9\s%]+)?/i);
  if (anesMatch) {
    const carpules = parseFloat(anesMatch[1]) || 1.0;
    const drugHint = (anesMatch[2] || '').toLowerCase();
    let drugId = 'lido_100k';
    let drugName = 'Lidocaine 2% with 1:100k Epinephrine';
    let mgPerCarp = 36;
    let epiPerCarp = 0.018;

    if (drugHint.includes('septocaine') || drugHint.includes('articaine') || drugHint.includes('arti')) {
      drugId = 'arti_100k';
      drugName = 'Articaine 4% with 1:100k Epinephrine (Septocaine)';
      mgPerCarp = 68;
      epiPerCarp = 0.017;
    } else if (drugHint.includes('mepivacaine') || drugHint.includes('carbocaine') || drugHint.includes('plain')) {
      drugId = 'mepi_plain';
      drugName = 'Mepivacaine 3% Plain (Carbocaine)';
      mgPerCarp = 54;
      epiPerCarp = 0;
    } else if (drugHint.includes('marcaine') || drugHint.includes('bupivacaine')) {
      drugId = 'bupi_200k';
      drugName = 'Bupivacaine 0.5% with 1:200k Epinephrine (Marcaine)';
      mgPerCarp = 9;
      epiPerCarp = 0.009;
    }

    const res = patientDb.logAnesthesiaForActivePatient({
      drugId,
      drugName,
      carpules,
      mg: Math.round(carpules * mgPerCarp),
      epiMg: Math.round(carpules * epiPerCarp * 1000) / 1000,
      site: isFr ? 'Infiltration / Tronculaire Spix au Fauteuil' : 'Chairside Operatory Infiltration/Block',
      notes: isFr ? 'Enregistré via action vocale M.O.L.A.R.I.S' : 'Logged via chairside assistant action'
    });

    const summary = isFr
      ? `**${carpules} carpule(s)** de **${drugName}** ajoutée(s) au dossier de ${res.patient.name} (Total délivré aujourd'hui : ${res.patient.deliveredCarpules} carpules).`
      : `Logged **${carpules} carpules** of **${drugName}** to ${res.patient.name}'s chart (Total delivered: ${res.patient.deliveredCarpules} carpules).`;

    return {
      executed: true,
      actionType: 'LOG_ANESTHESIA',
      summary,
      data: { patient: res.patient, logEntry: res.entry }
    };
  }

  // 5. Operatory App & Tool Launchers (PC Copilot Features)
  // e.g. "open calculator", "launch imaging", "open odontogram", "open soap", "open patients", "backup database"
  if (lower.includes('open calculator') || lower.includes('launch calculator') || lower.includes('ouvrir la calculatrice') || lower.includes('calculateur anesthésie')) {
    return {
      executed: true,
      actionType: 'LAUNCH_APP',
      summary: isFr ? 'Lancement du calculateur de doses et plafond d\'anesthésie locale.' : 'Launching chairside Local Anesthetic & dosage calculator.',
      data: { targetView: 'anesthesia' }
    };
  }

  if (lower.includes('open radiograph') || lower.includes('launch imaging') || lower.includes('open x-ray') || lower.includes('ouvrir radiographie') || lower.includes('vision')) {
    return {
      executed: true,
      actionType: 'LAUNCH_APP',
      summary: isFr ? 'Ouverture de la suite d\'analyse radiographique Gemini Vision.' : 'Launching Gemini Vision radiograph diagnostic suite.',
      data: { targetView: 'vision' }
    };
  }

  if (lower.includes('open odontogram') || lower.includes('open dental chart') || lower.includes('ouvrir odontogramme') || lower.includes('schéma dentaire')) {
    return {
      executed: true,
      actionType: 'LAUNCH_APP',
      summary: isFr ? 'Affichage de l\'odontogramme interactif 32 dents.' : 'Opening interactive 32-tooth odontogram chart.',
      data: { targetView: 'odontogram' }
    };
  }

  if (lower.includes('open soap') || lower.includes('generate soap') || lower.includes('rédiger compte rendu') || lower.includes('ouvrir soap')) {
    return {
      executed: true,
      actionType: 'LAUNCH_APP',
      summary: isFr ? 'Ouverture du générateur médico-légal de notes SOAP et codification CDT.' : 'Opening medicolegal SOAP progress note and CDT generator.',
      data: { targetView: 'soap' }
    };
  }

  if (lower.includes('open patients') || lower.includes('liste des patients') || lower.includes('view patient records') || lower.includes('base de données patients')) {
    return {
      executed: true,
      actionType: 'LAUNCH_APP',
      summary: isFr ? 'Ouverture du répertoire et base de données patients.' : 'Opening patient records & local file database directory.',
      data: { targetView: 'patients' }
    };
  }

  // 6. Database Backup & Export
  if (lower.includes('backup database') || lower.includes('export database') || lower.includes('sauvegarder la base') || lower.includes('exporter la base')) {
    return {
      executed: true,
      actionType: 'EXPORT_DATABASE',
      summary: isFr ? 'Export et sauvegarde du fichier local de base de données déclenchés.' : 'Export and backup of local JSON database triggered.',
      data: { downloadUrl: '/api/database/export' }
    };
  }

  // 7. Audio Mute / Unmute / Sound Control
  if (lower.includes('mute sound') || lower.includes('mute volume') || lower.includes('couper le son') || lower.includes('silence')) {
    return {
      executed: true,
      actionType: 'AUDIO_MUTE',
      summary: isFr ? 'Synthèse vocale et alertes audio coupées.' : 'Operatory voice synthesizer and alerts muted.',
      data: { muted: true }
    };
  }

  if (lower.includes('unmute sound') || lower.includes('unmute volume') || lower.includes('activer le son') || lower.includes('remettre le son')) {
    return {
      executed: true,
      actionType: 'AUDIO_UNMUTE',
      summary: isFr ? 'Synthèse vocale et alertes sonores réactivées.' : 'Operatory voice synthesizer and audio restored.',
      data: { muted: false }
    };
  }

  // 8. System Telemetry / Hardware Check (English & French)
  // e.g. "system telemetry", "hardware check", "system diagnostics", "status check", "télémétrie système", "état du système"
  if (lower.includes('telemetry') || lower.includes('diagnostics') || lower.includes('hardware check') || lower.includes('system status') || lower.includes('télémétrie') || lower.includes('état du système') || lower.includes('diagnostic matériel')) {
    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const patientCount = patientDb.getAllPatients().length;

    const summary = isFr
      ? `**Télémétrie M.O.L.A.R.I.S JARVIS** : Uptime : ${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s | Tas mémoire Node : ${heapUsedMb} Mo | RAM Système : ${freeMemMb} Mo libres sur ${totalMemMb} Mo | Base Patients : ${patientCount} dossiers actifs | Plateforme : ${os.platform()}-${os.arch()}.`
      : `**M.O.L.A.R.I.S JARVIS Telemetry**: Node Uptime: ${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s | Memory Heap: ${heapUsedMb} MB / System RAM: ${freeMemMb} MB free of ${totalMemMb} MB | Database Patients: ${patientCount} active records | Architecture: ${os.platform()}-${os.arch()}.`;

    return {
      executed: true,
      actionType: 'SYSTEM_TELEMETRY',
      summary,
      data: { heapUsedMb, freeMemMb, totalMemMb, uptimeSec, patientCount, targetView: 'system' }
    };
  }

  return { executed: false };
}
