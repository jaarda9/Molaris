import { patientDb } from '../repositories/patients.js';
import { checkDrugInteractions } from '../domain/clinical-safety.js';
import { isPrimaryToothId } from '../domain/primary-teeth.js';
import { dosesLoggedOn } from '../domain/anesthesia-calc.js';

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

type ToothStatus = 'caries' | 'restoration' | 'crown' | 'rct' | 'missing' | 'implant' | 'sound';
type DrugId = 'lido_100k' | 'arti_100k' | 'mepi_plain' | 'bupi_200k';

/** What a typed or dictated chairside command asks for (nothing is done yet). */
export type ChairsideCommand =
  | { kind: 'timer'; seconds: number }
  | { kind: 'tooth'; toothId: number; status: ToothStatus }
  | { kind: 'anesthesia'; carpules: number; drugId: DrugId }
  | { kind: 'open'; view: 'anesthesia' | 'vision' | 'odontogram' | 'soap' | 'patients' }
  | { kind: 'export' }
  | { kind: 'mute'; muted: boolean };

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`]/g, "'").trim();
const QUESTION_START = /^(comment|pourquoi|quel|quelle|quels|quelles|que|qu'|quoi|est-ce|faut-il|faut il|dois-je|peut-on|peux-tu|combien|quand|ou|how|what|why|which|when|where|should|can|could|would|is|are|do|does|did)\b/;
const MAX_COMMAND_WORDS = 14;

const DRUG_HINTS: Array<[DrugId, RegExp]> = [
  ['arti_100k', /\b(articaine|septocaine|ubistesin|arti)\b/],
  ['mepi_plain', /\b(mepivacaine|carbocaine|scandonest|mepi)\b/],
  ['bupi_200k', /\b(bupivacaine|marcaine)\b/],
  ['lido_100k', /\b(lidocaine|xylocaine|lido)\b/]
];

/**
 * Reads a chairside command, or null. Commands act at once (some write in the chart), so a
 * sentence only counts when it IS a command: it starts with the command's verb, is short,
 * and is not a question. « J'ai injecté 2 carpules, que faire ? » is a question for the
 * advisor, never a record of 2 carpules. No side effects: safe to test.
 */
export function parseChairsideCommand(text: string): ChairsideCommand | null {
  let command = plain(text).replace(/^(ok |ok,)?\s*molaris[\s,:]*/, '').replace(/^(s'il te plait|stp|please)[\s,]*/, '');
  if (!command || text.includes('?') || QUESTION_START.test(command)) return null;
  if (command.split(/\s+/).length > MAX_COMMAND_WORDS) return null;
  command = command.replace(/[.!]+$/, '');

  // Timer: « lance un minuteur de 20 secondes », « minuteur 15 s », « start 20s timer »
  if (/^(lance|lancer|demarre|demarrer|active|activer|mets|mettre|start|set|begin)\b.*\b(minuteur|chrono|chronometre|timer)\b/.test(command)
    || /^(minuteur|chrono|chronometre|timer)\b/.test(command)
    || /^(start|set|begin)\s+(a\s+)?\d+\s*(s|sec|seconds?|min|minutes?)\b/.test(command)) {
    const n = command.match(/(\d+)\s*(s|sec|secondes?|seconds?|min|mins|minutes?)?\b/);
    const value = n ? parseInt(n[1], 10) : 20;
    const seconds = n && /^min/.test(n[2] || '') ? value * 60 : value;
    return seconds > 0 && seconds <= 3600 ? { kind: 'timer', seconds } : null;
  }

  // Tooth: « note dent 46 carie », « dent 36 couronne », « mark tooth 19 as caries »
  const tooth = command.match(/^(?:(?:note|noter|marque|marquer|mark|set|update)\s+(?:la\s+)?)?(?:tooth|dent)\s*#?\s*(\d{1,2})\s*(?:as|to|has|is|comme|en|a|est)?\s*(?:une?\s+)?(caries|carie|decay|cavity|saine|sound|obturation|composite|restoration|filling|couronne|crown|onlay|endo|rct|root canal|traitement de canal|absente|manquante|missing|extraite|extracted|implant)\b/);
  if (tooth) {
    const raw = parseInt(tooth[1], 10);
    const toothId = isPrimaryToothId(raw) ? raw : (fdiToUniversal(raw) ?? (raw >= 1 && raw <= 32 ? raw : null));
    if (!toothId) return null;
    const s = tooth[2];
    const status: ToothStatus = /carie|decay|cavity/.test(s) ? 'caries'
      : /obturation|composite|restoration|filling/.test(s) ? 'restoration'
      : /couronne|crown|onlay/.test(s) ? 'crown'
      : /endo|rct|canal/.test(s) ? 'rct'
      : /absente|manquante|missing|extraite|extracted/.test(s) ? 'missing'
      : /implant/.test(s) ? 'implant' : 'sound';
    return { kind: 'tooth', toothId, status };
  }

  // Anesthesia: « note 2 carpules d'articaïne », « j'ai injecté 1,5 carpule de mépivacaïne »
  const anes = command.match(/^(?:note|noter|enregistre|enregistrer|log|j'ai injecte|injecte|injected|administered|gave)\s+(\d+(?:[.,]\d+)?)\s*(?:carpules?|cartouches?|cartridges?)\b(.*)$/);
  if (anes) {
    const carpules = parseFloat(anes[1].replace(',', '.'));
    const drug = DRUG_HINTS.find(([, re]) => re.test(anes[2]));
    // Without a recognised anesthetic nothing is recorded (it used to default to lidocaine).
    if (!drug || !(carpules > 0) || carpules > 20) return null;
    return { kind: 'anesthesia', carpules, drugId: drug[0] };
  }

  // Screens: « ouvre la radio », « open odontogram »…
  if (/^(ouvre|ouvrir|affiche|afficher|open|show|launch)\b/.test(command)) {
    if (/calculat|anesthesi/.test(command)) return { kind: 'open', view: 'anesthesia' };
    if (/radio|x-ray|imaging|radiograph/.test(command)) return { kind: 'open', view: 'vision' };
    if (/odontogram|schema dentaire|dental chart/.test(command)) return { kind: 'open', view: 'odontogram' };
    if (/soap|compte[ -]rendu/.test(command)) return { kind: 'open', view: 'soap' };
    if (/patients|dossiers|patient records/.test(command)) return { kind: 'open', view: 'patients' };
    return null;
  }

  if (/^(sauvegarde|sauvegarder|exporte|exporter|backup|export)\b.*\b(base|donnees|database|dossiers)\b/.test(command)) return { kind: 'export' };
  if (/^(coupe|couper|mute)\b.*\b(son|sound|volume|voix)\b/.test(command)) return { kind: 'mute', muted: true };
  if (/^(active|activer|remets|remettre|unmute)\b.*\b(son|sound|volume|voix)\b/.test(command)) return { kind: 'mute', muted: false };
  return null;
}

const DRUGS: Record<DrugId, { fr: string; en: string; mgPerCarp: number; epiPerCarp: number }> = {
  lido_100k: { fr: 'Lidocaïne 2 % adrénalinée 1/100 000', en: 'Lidocaine 2% with 1:100,000 epinephrine', mgPerCarp: 36, epiPerCarp: 0.018 },
  arti_100k: { fr: 'Articaïne 4 % adrénalinée 1/100 000', en: 'Articaine 4% with 1:100,000 epinephrine', mgPerCarp: 68, epiPerCarp: 0.017 },
  mepi_plain: { fr: 'Mépivacaïne 3 % sans vasoconstricteur', en: 'Mepivacaine 3% plain', mgPerCarp: 54, epiPerCarp: 0 },
  bupi_200k: { fr: 'Bupivacaïne 0,5 % adrénalinée 1/200 000', en: 'Bupivacaine 0.5% with 1:200,000 epinephrine', mgPerCarp: 9, epiPerCarp: 0.009 }
};

const VIEW_SUMMARY: Record<string, [string, string]> = {
  anesthesia: ['Ouverture du calculateur de doses d’anesthésie locale.', 'Opening the local anesthetic dose calculator.'],
  vision: ['Ouverture de l’analyse radiographique.', 'Opening the radiograph analysis.'],
  odontogram: ['Affichage de l’odontogramme.', 'Opening the odontogram.'],
  soap: ['Ouverture du compte-rendu SOAP.', 'Opening the SOAP progress note.'],
  patients: ['Ouverture des dossiers patients.', 'Opening the patient records.']
};

export function executeMolarisAction(commandText: string, language: string = 'en'): ActionResult {
  const isFr = language === 'fr';
  const command = parseChairsideCommand(commandText);
  if (!command) return { executed: false };

  switch (command.kind) {
    case 'timer':
      return {
        executed: true,
        actionType: 'START_TIMER',
        summary: isFr
          ? `Minuteur fauteuil lancé pour **${command.seconds} secondes** avec alerte sonore audible.`
          : `Started chairside timer for **${command.seconds} seconds** with audible alert.`,
        data: { seconds: command.seconds, durationSeconds: command.seconds }
      };

    case 'tooth': {
      const updatedTooth = patientDb.updateToothForActivePatient(command.toothId, { status: command.status });
      const activePatient = patientDb.getActivePatient();
      return {
        executed: true,
        actionType: 'UPDATE_TOOTH',
        summary: isFr
          ? `Dent **${updatedTooth.fdi}** (${updatedTooth.name}) mise à jour sur **[${command.status.toUpperCase()}]** dans le dossier de ${activePatient.name}.`
          : `Updated **tooth ${updatedTooth.fdi}** (FDI, ${updatedTooth.name}) to **[${command.status.toUpperCase()}]** in ${activePatient.name}'s chart.`,
        data: { tooth: updatedTooth, patient: activePatient }
      };
    }

    case 'anesthesia': {
      const drug = DRUGS[command.drugId];
      const drugName = isFr ? drug.fr : drug.en;
      const res = patientDb.logAnesthesiaForActivePatient({
        drugId: command.drugId,
        drugName,
        carpules: command.carpules,
        mg: Math.round(command.carpules * drug.mgPerCarp),
        epiMg: Math.round(command.carpules * drug.epiPerCarp * 1000) / 1000,
        notes: isFr ? 'Enregistré via action vocale M.O.L.A.R.I.S' : 'Logged via chairside assistant action'
      });
      const safetyAlerts = checkDrugInteractions(res.patient.medications, [drugName], isFr ? 'fr' : 'en');
      const today = Math.round(dosesLoggedOn(res.patient.anesthesiaLog).reduce((s, d) => s + d.carpules, 0) * 10) / 10;
      let summary = isFr
        ? `**${command.carpules} carpule(s)** de **${drugName}** ajoutée(s) au dossier de ${res.patient.name} (total aujourd'hui : ${today} carpules).`
        : `Logged **${command.carpules} carpules** of **${drugName}** to ${res.patient.name}'s chart (total today: ${today} carpules).`;
      if (safetyAlerts.length > 0) {
        summary += `\n\n${safetyAlerts.map(a => `${isFr ? '⚠️ ALERTE : ' : '⚠️ ALERT: '}${a.message}`).join('\n')}`;
      }
      return { executed: true, actionType: 'LOG_ANESTHESIA', summary, data: { patient: res.patient, logEntry: res.entry, safetyAlerts } };
    }

    case 'open':
      return { executed: true, actionType: 'LAUNCH_APP', summary: VIEW_SUMMARY[command.view][isFr ? 0 : 1], data: { targetView: command.view } };

    case 'export':
      return {
        executed: true,
        actionType: 'EXPORT_DATABASE',
        summary: isFr ? 'Export des dossiers patients déclenché.' : 'Patient records export triggered.',
        data: { downloadUrl: '/api/database/export' }
      };

    case 'mute':
      return command.muted
        ? { executed: true, actionType: 'AUDIO_MUTE', summary: isFr ? 'Synthèse vocale et alertes audio coupées.' : 'Voice read-out and audio alerts muted.', data: { muted: true } }
        : { executed: true, actionType: 'AUDIO_UNMUTE', summary: isFr ? 'Synthèse vocale et alertes sonores réactivées.' : 'Voice read-out and audio alerts restored.', data: { muted: false } };
  }
}
