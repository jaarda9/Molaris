import { patientDb, PatientRecord } from './patient-db.js';
import os from 'os';

export interface ActionResult {
  executed: boolean;
  actionType?: string;
  summary?: string;
  data?: any;
}

export function executeMolarisAction(commandText: string): ActionResult {
  const text = commandText.trim();
  const lower = text.toLowerCase();

  // 1. Switch Patient Action
  // e.g. "switch patient to Eleanor Davis", "change patient to PT-2026-091", "open chart Lucas Chen"
  const switchMatch = lower.match(/(?:switch|change|open|select)\s+(?:patient|chart|record)?\s*(?:to\s+)?([a-z0-9\s\-]+)/i);
  if (switchMatch && (lower.includes('patient') || lower.includes('chart') || lower.includes('switch to') || lower.includes('open chart'))) {
    const query = switchMatch[1].replace(/patient|chart|record/gi, '').trim();
    if (query) {
      const patient = patientDb.getPatientByNameOrQuery(query);
      if (patient) {
        patientDb.setActivePatient(patient.id);
        return {
          executed: true,
          actionType: 'SWITCH_PATIENT',
          summary: `Switched active chart to **${patient.name}** (${patient.chartId}, ${patient.asaStatus}, ${patient.weightKg}kg).`,
          data: { patientId: patient.id, patient }
        };
      }
    }
  }

  // 2. Start Timer Action
  // e.g. "start 15s etch timer", "start 20 second timer", "set timer 30 seconds"
  const timerMatch = lower.match(/(?:start|set|begin)\s+(?:a\s+)?(\d+)\s*(?:s|sec|seconds?|min|minutes?)\s*(?:etch|cure|timer|chairside)?/i);
  if (timerMatch) {
    const rawVal = parseInt(timerMatch[1], 10);
    const isMin = lower.includes('min');
    const seconds = isMin ? rawVal * 60 : rawVal;
    return {
      executed: true,
      actionType: 'START_TIMER',
      summary: `Started chairside timer for **${seconds} seconds** with audible alert.`,
      data: { seconds }
    };
  }

  // 3. Update Tooth Action
  // e.g. "mark tooth 19 as caries", "tooth 30 has deep caries", "tooth 14 is implant", "tooth 18 is missing"
  const toothMatch = lower.match(/(?:mark|set|update)?\s*tooth\s*#?\s*(\d{1,2})\s*(?:as|to|has|is)?\s*(caries|decay|cavity|sound|restoration|filling|composite|crown|rct|root canal|missing|extracted|implant)/i);
  if (toothMatch) {
    const toothId = parseInt(toothMatch[1], 10);
    if (toothId >= 1 && toothId <= 32) {
      let statusRaw = toothMatch[2].toLowerCase();
      let mappedStatus: any = 'sound';
      if (statusRaw.includes('caries') || statusRaw.includes('decay') || statusRaw.includes('cavity')) mappedStatus = 'caries';
      else if (statusRaw.includes('restoration') || statusRaw.includes('filling') || statusRaw.includes('composite')) mappedStatus = 'restoration';
      else if (statusRaw.includes('crown')) mappedStatus = 'crown';
      else if (statusRaw.includes('rct') || statusRaw.includes('root canal')) mappedStatus = 'rct';
      else if (statusRaw.includes('missing') || statusRaw.includes('extracted')) mappedStatus = 'missing';
      else if (statusRaw.includes('implant')) mappedStatus = 'implant';
      else mappedStatus = 'sound';

      const updatedTooth = patientDb.updateToothForActivePatient(toothId, { status: mappedStatus });
      const activePatient = patientDb.getActivePatient();
      return {
        executed: true,
        actionType: 'UPDATE_TOOTH',
        summary: `Updated **Tooth #${toothId}** (${updatedTooth.name}) to **[${mappedStatus.toUpperCase()}]** in ${activePatient.name}'s chart.`,
        data: { tooth: updatedTooth, patient: activePatient }
      };
    }
  }

  // 4. Log Anesthesia Action
  // e.g. "log 1 carpule of septocaine", "administered 1.5 carpules articaine"
  const anesMatch = lower.match(/(?:log|administered|injected|gave)\s+([0-9.]+)\s*(?:carpule|carpules|cartridge|cartridges)\s*(?:of\s+)?([a-z0-9\s%]+)?/i);
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
      site: 'Chairside Operatory Infiltration/Block',
      notes: 'Logged via chairside assistant action'
    });

    return {
      executed: true,
      actionType: 'LOG_ANESTHESIA',
      summary: `Logged **${carpules} carpules** of **${drugName}** to ${res.patient.name}'s chart (Total delivered: ${res.patient.deliveredCarpules} carpules).`,
      data: { patient: res.patient, logEntry: res.entry }
    };
  }

  // 5. System Telemetry / Hardware Check
  // e.g. "system telemetry", "hardware check", "system diagnostics", "status check"
  if (lower.includes('telemetry') || lower.includes('diagnostics') || lower.includes('hardware check') || lower.includes('system status')) {
    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const patientCount = patientDb.getAllPatients().length;

    return {
      executed: true,
      actionType: 'SYSTEM_TELEMETRY',
      summary: `**M.O.L.A.R.I.S JARVIS Telemetry**: Node Uptime: ${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s | Memory Heap: ${heapUsedMb} MB / System RAM: ${freeMemMb} MB free of ${totalMemMb} MB | Database Patients: ${patientCount} active records | Architecture: ${os.platform()}-${os.arch()}.`,
      data: { heapUsedMb, freeMemMb, totalMemMb, uptimeSec, patientCount }
    };
  }

  return { executed: false };
}
