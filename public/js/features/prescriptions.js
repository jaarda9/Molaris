// Prescriptions (ordonnances): drug list, prescription builder with a server-side
// safety check, history (reprint / renew) and FR / AR / bilingual printing.
// Renders into #prescriptions-root. See CLAUDE.md for conventions.
(function () {
  const VIEW = 'view-prescriptions';
  const t = (key) => Molaris.i18n.t(key);
  const esc = (value) => escapeHtml(value);

  const CATEGORIES = ['antibiotique', 'antalgique', 'AINS', 'antiseptique', 'antifongique', 'corticoïde', 'autre'];
  const LANGUAGES = ['fr', 'ar', 'fr_ar'];

  // Common posology phrases with ready French (printed posology) and Arabic
  // (patient instructions) versions. Keep the Arabic simple.
  const PHRASES = [
    { fr: '1 comprimé 3 fois par jour pendant 7 jours', ar: 'قرص واحد ثلاث مرات في اليوم لمدة سبعة أيام' },
    { fr: '1 comprimé 2 fois par jour (matin et soir)', ar: 'قرص واحد مرتين في اليوم (صباحًا ومساءً)' },
    { fr: '1 comprimé 3 fois par jour, au milieu du repas', ar: 'قرص واحد ثلاث مرات في اليوم في منتصف الوجبة' },
    { fr: '1 comprimé le matin', ar: 'قرص واحد في الصباح' },
    { fr: '1 comprimé le soir au coucher', ar: 'قرص واحد في المساء قبل النوم' },
    { fr: '1 comprimé si douleur, à renouveler après au moins 6 heures', ar: 'قرص واحد عند الألم، ويمكن تكراره بعد 6 ساعات على الأقل' },
    { fr: '1 gélule 3 fois par jour', ar: 'كبسولة واحدة ثلاث مرات في اليوم' },
    { fr: '1 gélule 2 fois par jour', ar: 'كبسولة واحدة مرتين في اليوم' },
    { fr: 'Bain de bouche 2 fois par jour après le brossage, ne pas avaler', ar: 'مضمضة مرتين في اليوم بعد تنظيف الأسنان، دون ابتلاع' },
    { fr: 'Bain de bouche 3 fois par jour après les repas, ne pas avaler', ar: 'مضمضة ثلاث مرات في اليوم بعد الوجبات، دون ابتلاع' },
    { fr: 'Appliquer sur la zone 3 fois par jour', ar: 'يوضع على المنطقة المصابة ثلاث مرات في اليوم' }
  ];

  const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm';
  const INPUT = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white';
  const BTN_PRIMARY = 'px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed';
  const BTN_SECONDARY = 'px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold';
  const BTN_LINK = 'text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline';

  const state = {
    patientId: null,
    patients: [],
    drugs: [],                 // active drugs, for the builder
    catalog: [],               // drug list card (optionally with inactive ones)
    showInactive: false,
    history: [],
    lines: [],
    language: 'fr',
    notes: '',
    renewedFrom: null,         // { id, number }
    alerts: [],
    requiresOverride: false,
    acknowledged: false,
    checking: false
  };

  const root = () => document.getElementById('prescriptions-root');
  const byId = (id) => document.getElementById(id);
  const patient = () => state.patients.find(p => p.id === state.patientId) || null;

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  async function loadDrugs() {
    state.drugs = (await Molaris.api.get('/api/drugs')).drugs;
    state.catalog = state.showInactive
      ? (await Molaris.api.get('/api/drugs?includeInactive=true')).drugs
      : state.drugs;
  }

  async function loadHistory() {
    state.history = state.patientId
      ? (await Molaris.api.get(`/api/patients/${encodeURIComponent(state.patientId)}/prescriptions`)).prescriptions
      : [];
  }

  let checkTimer = null;
  let checkSeq = 0;
  function scheduleCheck() {
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => runCheck().catch(err => Molaris.ui.toast(err.message, 'error')), 350);
  }

  // Live dry-run of the server-side safety check. Issuing checks again on the server.
  async function runCheck() {
    const items = state.lines.filter(l => l.drugLabel.trim()).map(toItem)
      .map(({ drugLabel, brand, strength }) => ({ drugLabel, brand, strength }));
    const seq = ++checkSeq;
    if (!state.patientId || items.length === 0) {
      applyAlerts([], false);
      return;
    }
    state.checking = true;
    renderAlerts();
    try {
      const data = await Molaris.api.post('/api/prescriptions/check', {
        patientId: state.patientId, items, uiLanguage: Molaris.lang()
      });
      if (seq === checkSeq) applyAlerts(data.alerts, data.requiresOverride);
    } finally {
      if (seq === checkSeq) {
        state.checking = false;
        renderAlerts();
      }
    }
  }

  function applyAlerts(alerts, requiresOverride) {
    // A confirmation only covers the alerts the dentist actually saw.
    if (JSON.stringify(alerts) !== JSON.stringify(state.alerts)) state.acknowledged = false;
    state.alerts = alerts;
    state.requiresOverride = requiresOverride;
    renderAlerts();
  }

  // ---------------------------------------------------------------------------
  // Builder lines
  // ---------------------------------------------------------------------------

  function emptyLine() {
    return { drugId: null, drugLabel: '', brand: '', form: '', strength: '', dosage: '', duration: '', quantity: '', instructionsAr: '' };
  }

  function lineFromDrug(d) {
    // The list holds adult strengths and doses. For a child (same age limit as the server's
    // pediatric alert) only the DCI is copied: strength, form and dose must be written for
    // this child, so an adult dose can never be issued by default.
    const p = patient();
    if (p && Number(p.age) < 15) {
      return { ...emptyLine(), drugId: d.id, drugLabel: d.dci, duration: d.defaultDuration || '', pediatric: true };
    }
    return {
      drugId: d.id, drugLabel: d.dci, brand: d.brand || '', form: d.form || '', strength: d.strength || '',
      dosage: d.defaultDosage || '', duration: d.defaultDuration || '', quantity: '', instructionsAr: d.defaultInstructionsAr || ''
    };
  }

  function toItem(line) {
    const clean = (v) => (v || '').trim() || null;
    return {
      drugId: line.drugId || null,
      drugLabel: line.drugLabel.trim(),
      brand: clean(line.brand),
      form: clean(line.form),
      strength: clean(line.strength),
      dosage: line.dosage.trim(),
      duration: clean(line.duration),
      quantity: clean(line.quantity),
      instructionsAr: clean(line.instructionsAr)
    };
  }

  function resetBuilder() {
    state.lines = [];
    state.notes = '';
    state.renewedFrom = null;
    state.acknowledged = false;
    applyAlerts([], false);
    renderBuilder();
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async function render() {
    const el = root();
    if (!el) return;
    el.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 ${CARD} space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-bold text-slate-900 dark:text-white">${esc(t('prescriptions.newTitle'))}</h2>
            <label class="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto min-w-0">
              <span>${esc(t('prescriptions.patient'))}</span>
              <select id="rx-patient" class="${INPUT} min-w-0 flex-1 sm:flex-none sm:!w-64"></select>
            </label>
          </div>
          <div id="rx-patient-info"></div>
          <div id="rx-builder"></div>
        </div>
        <div class="${CARD} space-y-3">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">${esc(t('prescriptions.historyTitle'))}</h2>
          <div id="rx-history"></div>
        </div>
      </div>
      <div class="${CARD} space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">${esc(t('prescriptions.drugsTitle'))}</h2>
            <p class="text-[11px] text-slate-500 mt-0.5">${esc(t('prescriptions.drugsHint'))}</p>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <input type="checkbox" id="rx-drug-inactive" ${state.showInactive ? 'checked' : ''}>
              <span>${esc(t('prescriptions.showInactive'))}</span>
            </label>
            <button type="button" id="rx-drug-new" class="${BTN_PRIMARY}">${esc(t('prescriptions.newDrug'))}</button>
          </div>
        </div>
        <div id="rx-drugs"></div>
      </div>`;

    if (!state.patientId) state.patientId = Molaris.patients.active()?.id || null;
    const patients = await Molaris.patients.fillSelect(byId('rx-patient'), state.patientId, { allowEmpty: !state.patientId });
    state.patients = patients;
    if (state.patientId && !patients.some(p => p.id === state.patientId)) state.patientId = null;

    await Promise.all([loadDrugs(), loadHistory()]);
    renderPatientInfo();
    renderBuilder();
    renderHistory();
    renderDrugs();
    scheduleCheck();
  }

  function renderPatientInfo() {
    const el = byId('rx-patient-info');
    if (!el) return;
    const p = patient();
    if (!p) {
      el.innerHTML = `<p class="text-xs text-slate-400">${esc(t('prescriptions.selectPatient'))}</p>`;
      return;
    }
    const meds = (p.medications || []).filter(m => m.active).map(m => m.name).join(', ');
    el.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-slate-400">${esc(t('prescriptions.age'))}</div>
          <div class="font-semibold text-slate-800 dark:text-slate-200">${esc(p.age)} ${esc(t('prescriptions.years'))}</div>
        </div>
        <div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-slate-400">${esc(t('prescriptions.allergies'))}</div>
          ${p.allergies
            ? `<div class="font-semibold text-slate-800 dark:text-slate-200">${esc(p.allergies)}</div>`
            : `<div class="font-semibold text-amber-700 dark:text-amber-300">${esc(t('prescriptions.notRecorded'))}</div>`}
        </div>
        <div class="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <div class="text-[10px] uppercase tracking-wide text-slate-400">${esc(t('prescriptions.currentMeds'))}</div>
          <div class="font-semibold text-slate-800 dark:text-slate-200">${esc(meds || t('prescriptions.none'))}</div>
        </div>
      </div>`;
  }

  function drugOptions() {
    return CATEGORIES.map(cat => {
      const drugs = state.drugs.filter(d => (d.category || 'autre') === cat);
      if (!drugs.length) return '';
      return `<optgroup label="${esc(t(`prescriptions.cat.${cat}`))}">${drugs.map(d =>
        `<option value="${esc(d.id)}">${esc([d.dci, d.strength, d.form].filter(Boolean).join(' · '))}${d.brand ? ` (${esc(d.brand)})` : ''}</option>`
      ).join('')}</optgroup>`;
    }).join('');
  }

  function renderBuilder() {
    const el = byId('rx-builder');
    if (!el) return;
    const renewBanner = state.renewedFrom ? `
      <div class="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 text-xs">
        <span><strong>${esc(t('prescriptions.renewing'))} ${esc(state.renewedFrom.number)}</strong> — ${esc(t('prescriptions.renewHint'))}</span>
        <button type="button" data-action="cancel-renew" class="${BTN_LINK}">${esc(t('prescriptions.cancelRenew'))}</button>
      </div>` : '';

    el.innerHTML = `
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <select id="rx-drug-pick" class="${INPUT} !w-auto flex-1 min-w-[14rem]">
            <option value="">${esc(t('prescriptions.pickDrug'))}</option>${drugOptions()}
          </select>
          <button type="button" id="rx-add-drug" class="${BTN_PRIMARY}">${esc(t('prescriptions.addDrug'))}</button>
          <button type="button" id="rx-add-free" class="${BTN_SECONDARY}">${esc(t('prescriptions.addFree'))}</button>
        </div>
        ${renewBanner}
        <div id="rx-lines" class="space-y-3">${renderLines()}</div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label class="block text-[11px] text-slate-500">${esc(t('prescriptions.printLanguage'))}
            <select id="rx-language" class="${INPUT} mt-1">
              ${LANGUAGES.map(l => `<option value="${l}" ${state.language === l ? 'selected' : ''}>${esc(t(`prescriptions.lang.${l}`))}</option>`).join('')}
            </select>
          </label>
          <label class="block text-[11px] text-slate-500 sm:col-span-2">${esc(t('prescriptions.notes'))}
            <input id="rx-notes" class="${INPUT} mt-1" maxlength="1000" value="${esc(state.notes)}">
          </label>
        </div>
        <div id="rx-alerts"></div>
        <div class="flex justify-end gap-2">
          <button type="button" id="rx-clear" class="${BTN_SECONDARY}">${esc(t('prescriptions.clear'))}</button>
          <button type="button" id="rx-issue" class="${BTN_PRIMARY}">${esc(t('prescriptions.issue'))}</button>
        </div>
      </div>`;
    renderAlerts();
  }

  function renderLines() {
    if (!state.lines.length) {
      return `<p class="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">${esc(t('prescriptions.linesEmpty'))}</p>`;
    }
    const field = (i, name, placeholder, extra = '') =>
      `<input data-line="${i}" data-field="${name}" value="${esc(state.lines[i][name])}" placeholder="${esc(placeholder)}" title="${esc(placeholder)}" class="${INPUT}" ${extra}>`;
    return state.lines.map((line, i) => `
      <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <div class="flex items-start gap-2">
          <span class="mt-2 w-5 text-xs font-bold text-teal-700 dark:text-teal-400">${i + 1}.</span>
          <div class="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2">
            <div class="col-span-2 md:col-span-2">${field(i, 'drugLabel', t('prescriptions.dci'), 'maxlength="200"')}</div>
            <div class="md:col-span-1">${field(i, 'strength', t('prescriptions.strength'), 'maxlength="100"')}</div>
            <div class="md:col-span-1">${field(i, 'form', t('prescriptions.form'), 'maxlength="100"')}</div>
            <div class="col-span-2 md:col-span-2">${field(i, 'brand', t('prescriptions.brand'), 'maxlength="200"')}</div>
          </div>
          <button type="button" data-action="remove-line" data-line="${i}" title="${esc(t('prescriptions.removeLine'))}" class="mt-1 text-slate-400 hover:text-rose-600 text-lg leading-none px-1">&times;</button>
        </div>
        <div class="pl-7 grid grid-cols-1 md:grid-cols-6 gap-2">
          <div class="md:col-span-4">${field(i, 'dosage', line.pediatric ? t('prescriptions.childDosage').replace('{kg}', patient()?.weightKg ?? '?') : t('prescriptions.dosage'), 'maxlength="500"')}</div>
          <select data-action="phrase" data-line="${i}" class="${INPUT} md:col-span-2">
            <option value="">${esc(t('prescriptions.phrase'))}</option>
            ${PHRASES.map((p, k) => `<option value="${k}">${esc(p.fr)}</option>`).join('')}
          </select>
        </div>
        <div class="pl-7 grid grid-cols-2 gap-2">
          ${field(i, 'duration', t('prescriptions.duration'), 'maxlength="100"')}
          ${field(i, 'quantity', t('prescriptions.quantity'), 'maxlength="100"')}
        </div>
        <div class="pl-7">${field(i, 'instructionsAr', t('prescriptions.instructionsAr'), 'dir="rtl" lang="ar" maxlength="500"')}</div>
      </div>`).join('');
  }

  function renderAlerts() {
    const el = byId('rx-alerts');
    const issueBtn = byId('rx-issue');
    if (!el) return;
    const critical = state.alerts.filter(a => a.severity === 'critical');
    const others = state.alerts.filter(a => a.severity === 'warning');
    // Guidance (WHO antibiotic use), not a safety problem: shown apart, never alarming.
    const guidance = state.alerts.filter(a => a.severity === 'info');
    const safetyCount = critical.length + others.length;
    const hasLines = state.lines.some(l => l.drugLabel.trim());

    let html = '';
    if (state.checking && !state.alerts.length) {
      html = `<p class="text-[11px] text-slate-400">${esc(t('prescriptions.checking'))}</p>`;
    } else if (hasLines && state.patientId && !safetyCount) {
      html = `<p class="text-[11px] text-emerald-700 dark:text-emerald-400">✓ ${esc(t('prescriptions.noAlerts'))}</p>`;
    }
    if (critical.length) {
      html += `
        <div role="alert" class="rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/50 p-3 space-y-2">
          <div class="text-sm font-extrabold text-rose-700 dark:text-rose-300">⚠ ${esc(t('prescriptions.criticalTitle'))}</div>
          <ul class="list-disc pl-5 space-y-1 text-xs text-rose-800 dark:text-rose-200">
            ${critical.map(a => `<li>${esc(a.message)}</li>`).join('')}
          </ul>
          <label class="flex items-start gap-2 pt-1 text-xs font-bold text-rose-800 dark:text-rose-200 cursor-pointer">
            <input type="checkbox" id="rx-ack" class="mt-0.5" ${state.acknowledged ? 'checked' : ''}>
            <span>${esc(t('prescriptions.acknowledge'))}</span>
          </label>
        </div>`;
    }
    if (others.length) {
      html += `
        <div class="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3">
          <div class="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">${esc(t('prescriptions.alertsTitle'))}</div>
          <ul class="list-disc pl-5 space-y-1 text-xs text-amber-900 dark:text-amber-200">${others.map(a => `<li>${esc(a.message)}</li>`).join('')}</ul>
        </div>`;
    }
    if (guidance.length) {
      html += `
        <div class="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 p-3">
          <div class="text-xs font-bold text-teal-800 dark:text-teal-300 mb-1">${esc(t('prescriptions.guidanceTitle'))}</div>
          <ul class="list-disc pl-5 space-y-1 text-xs text-teal-900 dark:text-teal-200">${guidance.map(a => `<li>${esc(a.message)}</li>`).join('')}</ul>
        </div>`;
    }
    el.innerHTML = `<div class="space-y-2">${html}</div>`;
    if (issueBtn) {
      issueBtn.disabled = !state.patientId || !state.lines.length || (state.requiresOverride && !state.acknowledged);
      issueBtn.title = state.requiresOverride && !state.acknowledged ? t('prescriptions.ackRequired') : '';
    }
  }

  function renderHistory() {
    const el = byId('rx-history');
    if (!el) return;
    if (!state.history.length) {
      el.innerHTML = `<p class="text-center py-6 text-slate-400 text-xs">${esc(t('prescriptions.historyEmpty'))}</p>`;
      return;
    }
    const numberOf = (id) => state.history.find(h => h.id === id)?.number || '';
    el.innerHTML = `<div class="space-y-3">${state.history.map(rx => `
      <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-900 dark:text-white">${esc(rx.number)}</span>
          <span class="text-[11px] text-slate-500">${esc(Molaris.format.date(rx.issuedAt))}</span>
        </div>
        <ul class="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
          ${rx.items.map(i => `<li>• ${esc([i.drugLabel, i.strength].filter(Boolean).join(' '))}</li>`).join('')}
        </ul>
        ${rx.criticalAlertsOverridden ? `<div class="text-[10px] font-bold text-rose-700 dark:text-rose-300">⚠ ${esc(t('prescriptions.overridden'))}</div>` : ''}
        ${rx.renewedFromId ? `<div class="text-[10px] text-slate-500">${esc(t('prescriptions.renewOf'))} ${esc(numberOf(rx.renewedFromId) || '…')}</div>` : ''}
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <span class="text-[11px] text-slate-400">${esc(t('prescriptions.print'))} :</span>
          ${LANGUAGES.map(l => `<button type="button" data-action="print" data-id="${esc(rx.id)}" data-lang="${l}" class="${BTN_LINK}">${esc(t(`prescriptions.lang.${l}`))}</button>`).join('')}
          <button type="button" data-action="renew" data-id="${esc(rx.id)}" class="${BTN_LINK} ml-auto">↻ ${esc(t('prescriptions.renew'))}</button>
        </div>
      </div>`).join('')}</div>`;
  }

  function renderDrugs() {
    const el = byId('rx-drugs');
    if (!el) return;
    if (!state.catalog.length) {
      // A new clinic: offer the WHO starter list (loaded only on request, to review).
      el.innerHTML = `
        <div class="text-center py-8 space-y-3">
          <p class="text-slate-400 text-xs">${esc(t('prescriptions.drugsEmpty'))}</p>
          <button type="button" data-action="load-starter" class="${BTN_PRIMARY}">${esc(t('prescriptions.starterLoad'))}</button>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">${esc(t('prescriptions.starterHint'))}</p>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <tbody>
            ${state.catalog.map(d => `
              <tr class="border-t border-slate-100 dark:border-slate-800 ${d.active ? '' : 'opacity-50'}">
                <td class="py-2 pr-3">
                  <div class="font-semibold text-slate-800 dark:text-slate-200">${esc(d.dci)}${d.active ? '' : ` <span class="text-[10px] font-normal text-slate-400">(${esc(t('prescriptions.inactive'))})</span>`}</div>
                  <div class="text-slate-500">${esc([d.brand, d.form, d.strength].filter(Boolean).join(' · '))}</div>
                  <div class="sm:hidden mt-1 text-slate-500">${esc(t(`prescriptions.cat.${d.category || 'autre'}`))} · ${esc(d.defaultDosage || '')}${d.defaultDuration ? ` — ${esc(d.defaultDuration)}` : ''}</div>
                </td>
                <td class="py-2 pr-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">${esc(t(`prescriptions.cat.${d.category || 'autre'}`))}</td>
                <td class="py-2 pr-3 text-slate-500 hidden sm:table-cell">${esc(d.defaultDosage || '')}${d.defaultDuration ? ` — ${esc(d.defaultDuration)}` : ''}</td>
                <td class="py-2 text-right whitespace-nowrap align-top sm:align-middle">
                  <div class="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-3">
                    <button type="button" data-action="edit-drug" data-id="${esc(d.id)}" class="${BTN_LINK}">${esc(t('prescriptions.edit'))}</button>
                    <button type="button" data-action="toggle-drug" data-id="${esc(d.id)}" class="${BTN_LINK}">${esc(t(d.active ? 'prescriptions.deactivate' : 'prescriptions.reactivate'))}</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function switchPatient(patientId) {
    state.patientId = patientId || null;
    // A renewal belongs to the original patient.
    if (state.renewedFrom) state.renewedFrom = null;
    await loadHistory();
    renderPatientInfo();
    renderBuilder();
    renderHistory();
    scheduleCheck();
  }

  async function issue() {
    if (!state.patientId) return Molaris.ui.toast(t('prescriptions.selectPatient'), 'error');
    if (!state.lines.length || state.lines.some(l => !l.drugLabel.trim() || !l.dosage.trim())) {
      return Molaris.ui.toast(t('prescriptions.lineIncomplete'), 'error');
    }
    const btn = byId('rx-issue');
    btn.disabled = true;
    try {
      const { prescription } = await Molaris.api.post('/api/prescriptions', {
        patientId: state.patientId,
        language: state.language,
        notes: state.notes.trim() || null,
        items: state.lines.map(toItem),
        acknowledgeCriticalAlerts: state.requiresOverride && state.acknowledged,
        renewedFromId: state.renewedFrom?.id || null,
        uiLanguage: Molaris.lang()
      });
      Molaris.ui.toast(`${t('prescriptions.issued')} : ${prescription.number}`);
      const language = state.language;
      resetBuilder();
      await loadHistory();
      renderHistory();
      await printPrescription(prescription, language);
    } catch (err) {
      // 409 = a critical alert the dentist has not confirmed (e.g. the patient's chart changed).
      Molaris.ui.toast(err.message, 'error');
      await runCheck().catch(() => {});
    } finally {
      renderAlerts();
    }
  }

  function renew(id) {
    const rx = state.history.find(h => h.id === id);
    if (!rx) return;
    state.lines = rx.items.map(i => ({
      drugId: i.drugId, drugLabel: i.drugLabel, brand: i.brand || '', form: i.form || '', strength: i.strength || '',
      dosage: i.dosage, duration: i.duration || '', quantity: i.quantity || '', instructionsAr: i.instructionsAr || ''
    }));
    state.language = rx.language;
    state.notes = rx.notes || '';
    state.renewedFrom = { id: rx.id, number: rx.number };
    state.acknowledged = false;
    renderBuilder();
    scheduleCheck();
    byId('rx-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openDrugForm(drug) {
    const val = (key) => esc(drug?.[key] || '');
    const label = (key, inner) => `<label class="block"><span class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">${esc(t(key))}</span>${inner}</label>`;
    Molaris.ui.modal({
      title: t(drug ? 'prescriptions.editDrug' : 'prescriptions.newDrug'),
      wide: true,
      bodyHtml: `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${label('prescriptions.dci', `<input name="dci" required maxlength="200" class="${INPUT}" value="${val('dci')}">`)}
          ${label('prescriptions.brand', `<input name="brand" maxlength="200" class="${INPUT}" value="${val('brand')}">`)}
          ${label('prescriptions.form', `<input name="form" maxlength="100" class="${INPUT}" value="${val('form')}">`)}
          ${label('prescriptions.strength', `<input name="strength" maxlength="100" class="${INPUT}" value="${val('strength')}">`)}
          ${label('prescriptions.category', `<select name="category" class="${INPUT}">${CATEGORIES.map(c =>
            `<option value="${esc(c)}" ${(drug?.category || 'autre') === c ? 'selected' : ''}>${esc(t(`prescriptions.cat.${c}`))}</option>`).join('')}</select>`)}
          ${label('prescriptions.defaultDuration', `<input name="defaultDuration" maxlength="100" class="${INPUT}" value="${val('defaultDuration')}">`)}
        </div>
        ${label('prescriptions.defaultDosage', `<input name="defaultDosage" maxlength="500" class="${INPUT}" value="${val('defaultDosage')}">`)}
        ${label('prescriptions.defaultInstructionsAr', `<input name="defaultInstructionsAr" dir="rtl" lang="ar" maxlength="500" class="${INPUT}" value="${val('defaultInstructionsAr')}">`)}`,
      onSubmit: async (form, { close }) => {
        const body = {};
        for (const key of ['dci', 'brand', 'form', 'strength', 'category', 'defaultDosage', 'defaultDuration', 'defaultInstructionsAr']) {
          body[key] = String(form.get(key) || '').trim() || null;
        }
        if (drug) await Molaris.api.put(`/api/drugs/${encodeURIComponent(drug.id)}`, body);
        else await Molaris.api.post('/api/drugs', body);
        close();
        Molaris.ui.toast(t('prescriptions.drugSaved'));
        await refreshDrugs();
      }
    });
  }

  async function refreshDrugs() {
    await loadDrugs();
    renderDrugs();
    const pick = byId('rx-drug-pick');
    if (pick) pick.innerHTML = `<option value="">${esc(t('prescriptions.pickDrug'))}</option>${drugOptions()}`;
  }

  async function onClick(e) {
    const target = e.target.closest('button');
    if (!target) return;
    const action = target.dataset.action || target.id;
    switch (action) {
      case 'rx-add-drug': {
        const drug = state.drugs.find(d => d.id === byId('rx-drug-pick').value);
        if (!drug) return;
        state.lines.push(lineFromDrug(drug));
        renderBuilder();
        scheduleCheck();
        break;
      }
      case 'rx-add-free':
        state.lines.push(emptyLine());
        renderBuilder();
        byId('rx-lines')?.querySelector(`[data-line="${state.lines.length - 1}"][data-field="drugLabel"]`)?.focus();
        break;
      case 'remove-line':
        state.lines.splice(Number(target.dataset.line), 1);
        renderBuilder();
        scheduleCheck();
        break;
      case 'rx-clear':
        if (state.lines.length && !confirm(t('prescriptions.clearConfirm'))) return;
        resetBuilder();
        break;
      case 'cancel-renew':
        resetBuilder();
        break;
      case 'rx-issue':
        await issue();
        break;
      case 'print': {
        const rx = state.history.find(h => h.id === target.dataset.id);
        if (rx) await printPrescription(rx, target.dataset.lang);
        break;
      }
      case 'renew':
        renew(target.dataset.id);
        break;
      case 'rx-drug-new':
        openDrugForm(null);
        break;
      case 'load-starter': {
        const { added } = await Molaris.api.post('/api/drugs/starter');
        Molaris.ui.toast(t('prescriptions.starterLoaded').replace('{n}', added));
        await refreshDrugs();
        break;
      }
      case 'edit-drug':
        openDrugForm(state.catalog.find(d => d.id === target.dataset.id));
        break;
      case 'toggle-drug': {
        const drug = state.catalog.find(d => d.id === target.dataset.id);
        if (!drug) return;
        await Molaris.api.put(`/api/drugs/${encodeURIComponent(drug.id)}`, { active: !drug.active });
        await refreshDrugs();
        break;
      }
    }
  }

  function onInput(e) {
    const el = e.target;
    if (el.dataset.field && el.dataset.line !== undefined) {
      const line = state.lines[Number(el.dataset.line)];
      if (!line) return;
      line[el.dataset.field] = el.value;
      if (['drugLabel', 'brand', 'strength'].includes(el.dataset.field)) {
        line.drugId = el.dataset.field === 'drugLabel' ? null : line.drugId;
        scheduleCheck();
      }
      if (el.dataset.field === 'dosage' || el.dataset.field === 'drugLabel') renderAlerts();
    } else if (el.id === 'rx-notes') {
      state.notes = el.value;
    }
  }

  async function onChange(e) {
    const el = e.target;
    if (el.id === 'rx-patient') {
      await switchPatient(el.value);
    } else if (el.id === 'rx-language') {
      state.language = el.value;
    } else if (el.id === 'rx-ack') {
      state.acknowledged = el.checked;
      renderAlerts();
    } else if (el.id === 'rx-drug-inactive') {
      state.showInactive = el.checked;
      await refreshDrugs();
    } else if (el.dataset.action === 'phrase' && el.value !== '') {
      const phrase = PHRASES[Number(el.value)];
      const line = state.lines[Number(el.dataset.line)];
      if (!phrase || !line) return;
      line.dosage = phrase.fr;
      line.instructionsAr = phrase.ar;
      const lineEls = byId('rx-lines');
      lineEls.querySelector(`[data-line="${el.dataset.line}"][data-field="dosage"]`).value = phrase.fr;
      lineEls.querySelector(`[data-line="${el.dataset.line}"][data-field="instructionsAr"]`).value = phrase.ar;
      el.value = '';
    }
  }

  // ---------------------------------------------------------------------------
  // Printing (French, Arabic, or French block then Arabic block)
  // ---------------------------------------------------------------------------

  const AR = {
    title: 'وصفة طبية', number: 'رقم الوصفة', date: 'التاريخ', patient: 'المريض', age: 'العمر', weight: 'الوزن', kg: 'كغ',
    duration: 'المدة', quantity: 'الكمية', notes: 'ملاحظة', signature: 'إمضاء وختم الطبيب'
  };
  const FR = {
    title: 'Ordonnance', number: 'N°', date: 'Date', patient: 'Patient', age: 'Âge', years: 'ans', weight: 'Poids',
    duration: 'Durée', quantity: 'Quantité', notes: 'Remarque', signature: 'Signature et cachet du praticien'
  };

  // "7 jours" -> "7 أيام", "2 semaines" -> "أسبوعان"; anything else is printed as written.
  function arabicDuration(text) {
    const m = String(text || '').trim().match(/^(\d+)\s*(jours?|semaines?)$/i);
    if (!m) return null;
    const n = Number(m[1]);
    const day = /^j/i.test(m[2]);
    if (n === 1) return day ? 'يوم واحد' : 'أسبوع واحد';
    if (n === 2) return day ? 'يومان' : 'أسبوعان';
    if (n >= 3 && n <= 10) return `${n} ${day ? 'أيام' : 'أسابيع'}`;
    return `${n} ${day ? 'يومًا' : 'أسبوعًا'}`;
  }

  // Arabic number agreement: 1 سنة واحدة, 2 سنتان, 3–10 سنوات, 11+ سنة.
  function arabicAge(n) {
    if (n === 1) return 'سنة واحدة';
    if (n === 2) return 'سنتان';
    return `${n} ${n >= 3 && n <= 10 ? 'سنوات' : 'سنة'}`;
  }
  // Children only (snapshotted at issue): paediatric doses are checked against the weight.
  const frWeight = (rx) => rx.patientWeightKg ? ` &nbsp;·&nbsp; <strong>${FR.weight} :</strong> ${esc(formatKg(rx.patientWeightKg))} kg` : '';
  const arWeight = (rx) => rx.patientWeightKg ? ` &nbsp;·&nbsp; <strong>${AR.weight}:</strong> ${esc(formatKg(rx.patientWeightKg))} ${AR.kg}` : '';
  const formatKg = (kg) => String(Math.round(kg * 10) / 10).replace('.', ',');

  const ltr = (value) => `<bdi dir="ltr">${esc(value)}</bdi>`;

  // CNAM convention art. 40: the beneficiary's unique identifier and status go on the ordonnance.
  const CNAM_QUALITY_FR = { assure: 'Assuré social', conjoint: 'Conjoint', enfant: 'Enfant', ascendant: 'Ascendant' };
  const cnamLineFr = (rx) => rx.patientCnamId
    ? `<div class="rx-cnam"><strong>Identifiant CNAM :</strong> ${esc(rx.patientCnamId)}${CNAM_QUALITY_FR[rx.patientCnamQuality] ? ` &nbsp;·&nbsp; <strong>Qualité :</strong> ${CNAM_QUALITY_FR[rx.patientCnamQuality]}` : ''}</div>`
    : '';
  // Official Arabic wording is not verified, so the Arabic block shows the acronym and number only.
  const cnamLineAr = (rx) => rx.patientCnamId ? `<div class="rx-cnam"><strong>CNAM:</strong> ${ltr(rx.patientCnamId)}</div>` : '';
  const drugTitle = (i) => `<strong>${esc(i.drugLabel)}</strong>${i.brand ? ` (${esc(i.brand)})` : ''}${[i.form, i.strength].some(Boolean) ? ` — ${esc([i.form, i.strength].filter(Boolean).join(' '))}` : ''}`;

  function frenchBlock(rx, { withArabicInstructions, withSignature }) {
    const lines = rx.items.map(i => `
      <li>
        <div>${drugTitle(i)}</div>
        <div>${esc(i.dosage)}</div>
        ${i.duration || i.quantity ? `<div class="muted">${[i.duration && `${FR.duration} : ${esc(i.duration)}`, i.quantity && `${FR.quantity} : ${esc(i.quantity)}`].filter(Boolean).join(' · ')}</div>` : ''}
        ${withArabicInstructions && i.instructionsAr ? `<div class="ar" dir="rtl" lang="ar">${esc(i.instructionsAr)}</div>` : ''}
      </li>`).join('');
    return `
      <div class="rx-meta"><span><strong>${FR.number} :</strong> ${esc(rx.number)}</span><span><strong>${FR.date} :</strong> ${esc(Molaris.format.date(rx.issuedAt))}</span></div>
      <div class="rx-patient"><strong>${FR.patient} :</strong> ${esc(rx.patientName || '')}${rx.patientAge ? ` &nbsp;·&nbsp; <strong>${FR.age} :</strong> ${esc(rx.patientAge)} ${FR.years}` : ''}${frWeight(rx)}</div>
      ${cnamLineFr(rx)}
      <ol class="rx-lines">${lines}</ol>
      ${rx.notes ? `<p class="muted">${FR.notes} : ${esc(rx.notes)}</p>` : ''}
      ${withSignature ? `<div class="signature">${FR.signature}</div>` : ''}`;
  }

  function arabicBlock(rx) {
    const lines = rx.items.map(i => {
      const duration = i.duration ? (arabicDuration(i.duration) ? esc(arabicDuration(i.duration)) : ltr(i.duration)) : '';
      return `
      <li>
        <div dir="ltr" class="drug">${drugTitle(i)}</div>
        <div class="ar">${i.instructionsAr ? esc(i.instructionsAr) : ltr(i.dosage)}</div>
        ${duration || i.quantity ? `<div class="muted">${[duration && `${AR.duration}: ${duration}`, i.quantity && `${AR.quantity}: ${ltr(i.quantity)}`].filter(Boolean).join(' · ')}</div>` : ''}
      </li>`;
    }).join('');
    return `
      <div dir="rtl" lang="ar" class="ar-block">
        <div class="rx-meta"><span><strong>${AR.number}:</strong> ${ltr(rx.number)}</span><span><strong>${AR.date}:</strong> ${ltr(Molaris.format.date(rx.issuedAt))}</span></div>
        <div class="rx-patient"><strong>${AR.patient}:</strong> ${ltr(rx.patientName || '')}${rx.patientAge ? ` &nbsp;·&nbsp; <strong>${AR.age}:</strong> ${esc(arabicAge(rx.patientAge))}` : ''}${arWeight(rx)}</div>
        ${cnamLineAr(rx)}
        <ol class="rx-lines">${lines}</ol>
        ${rx.notes ? `<p class="muted">${AR.notes}: ${ltr(rx.notes)}</p>` : ''}
        <div class="signature">${AR.signature}</div>
      </div>`;
  }

  const PRINT_STYLE = `<style>
    .rx-meta { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .rx-patient { margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    .rx-cnam { margin: -8px 0 14px; font-size: 10.5pt; color: #334155; }
    .rx-lines { padding-inline-start: 22px; margin: 0; }
    .rx-lines li { margin-bottom: 12px; line-height: 1.45; }
    .ar, .ar-block { font-family: 'Traditional Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13pt; }
    .ar-block .drug { text-align: right; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11pt; }
    .separator { border: 0; border-top: 1px dashed #94a3b8; margin: 22px 0; }
  </style>`;

  async function printPrescription(rx, language) {
    if (language === 'ar') {
      return Molaris.print.document({ title: AR.title, bodyHtml: PRINT_STYLE + arabicBlock(rx), dir: 'rtl', lang: 'ar' });
    }
    if (language === 'fr_ar') {
      return Molaris.print.document({
        title: `${FR.title} — ${AR.title}`,
        bodyHtml: PRINT_STYLE + frenchBlock(rx, { withArabicInstructions: false, withSignature: false }) + '<hr class="separator">' + arabicBlock(rx),
        dir: 'ltr', lang: 'fr'
      });
    }
    return Molaris.print.document({
      title: FR.title,
      bodyHtml: PRINT_STYLE + frenchBlock(rx, { withArabicInstructions: true, withSignature: true }),
      dir: 'ltr', lang: 'fr'
    });
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------

  const isVisible = () => window.systemState && systemState.activeTab === VIEW;
  const fail = (err) => Molaris.ui.toast(err.message, 'error');

  function refreshIfVisible() {
    if (isVisible()) render().catch(fail);
  }

  function wire() {
    const el = root();
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    el.addEventListener('click', e => { onClick(e).catch(fail); });
    el.addEventListener('input', onInput);
    el.addEventListener('change', e => { onChange(e).catch(fail); });
  }

  wire();
  Molaris.events.on('view-shown', ({ view }) => { if (view === VIEW) refreshIfVisible(); });
  Molaris.events.on('language-changed', refreshIfVisible);
  Molaris.events.on('patient-changed', ({ patient: p }) => {
    if (!p || p.id === state.patientId) return;
    state.patientId = p.id;
    state.renewedFrom = null;
    if (isVisible()) render().catch(fail);
  });
  Molaris.showTab('prescriptions');
})();
