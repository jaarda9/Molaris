// Shared toolkit for feature scripts, exposed as window.Molaris.
// New features should use these helpers instead of reaching into other
// features' globals: see CLAUDE.md ("Frontend conventions").
window.Molaris = window.Molaris || {};

// ---------------------------------------------------------------------------
// Events: loose coupling between features.
//   'view-shown'       { view }       a nav tab's section became visible
//   'patient-changed'  { patient }    the active patient was switched/created
//   'language-changed' { language }   UI language switched ('en' | 'fr')
// ---------------------------------------------------------------------------
Molaris.events = {
  emit(name, detail) {
    document.dispatchEvent(new CustomEvent(`molaris:${name}`, { detail }));
  },
  on(name, handler) {
    document.addEventListener(`molaris:${name}`, e => handler(e.detail));
  }
};

// ---------------------------------------------------------------------------
// Patient scope. Every API request carries the patient this page shows
// (X-Molaris-Patient): the server reads and writes THAT chart, so two tabs or two PCs
// can work on different patients. If the chart was deleted elsewhere, the server answers
// 409 ACTIVE_PATIENT_CHANGED and the page reloads.
// ---------------------------------------------------------------------------
(function guardActivePatientWrites() {
  const nativeFetch = window.fetch.bind(window);
  let reloading = false;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const activeId = window.systemState && systemState.activePatient && systemState.activePatient.id;
    if (activeId && url.startsWith('/api/')) {
      const headers = new Headers(init.headers || {});
      headers.set('X-Molaris-Patient', activeId);
      init = { ...init, headers };
    }
    const res = await nativeFetch(input, init);
    if (res.status === 409 && !reloading) {
      const data = await res.clone().json().catch(() => null);
      if (data && data.code === 'ACTIVE_PATIENT_CHANGED') {
        reloading = true;
        alert(data.error);
        location.reload();
      }
    }
    return res;
  };
})();

// Practice-management tabs ship hidden; a feature reveals its tab when ready.
Molaris.showTab = (name) => {
  document.getElementById(`nav-tab-${name}`)?.classList.remove('hidden');
};

// ---------------------------------------------------------------------------
// API: JSON in/out; any non-2xx response throws Error(serverMessage).
// ---------------------------------------------------------------------------
Molaris.api = {
  async request(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch { /* empty or non-JSON body */ }
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  },
  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body ?? {}); },
  put(url, body) { return this.request('PUT', url, body ?? {}); },
  del(url) { return this.request('DELETE', url); }
};

// ---------------------------------------------------------------------------
// i18n: each feature registers its own keys; static markup uses data-i18n.
// ---------------------------------------------------------------------------
Molaris.lang = () => (window.systemState && systemState.language) || 'en';
Molaris.isFr = () => Molaris.lang() === 'fr';

Molaris.i18n = {
  register(dictionaries) {
    for (const [lang, entries] of Object.entries(dictionaries)) {
      window.MOLARIS_TRANSLATIONS[lang] = Object.assign(window.MOLARIS_TRANSLATIONS[lang] || {}, entries);
    }
  },
  t(key) {
    return window.molarisT(key, Molaris.lang());
  }
};

// ---------------------------------------------------------------------------
// Formatting. Money is integer millimes everywhere (1 DT = 1000 millimes),
// matching src/domain/money.ts on the server.
// ---------------------------------------------------------------------------
Molaris.format = {
  tnd(millimes) {
    const sign = millimes < 0 ? '-' : '';
    const abs = Math.abs(Math.round(millimes || 0));
    const dinars = String(Math.floor(abs / 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sign}${dinars},${String(abs % 1000).padStart(3, '0')} DT`;
  },
  // "125,500" / "125.5" / "1 250" -> millimes, or null if invalid.
  parseTnd(input) {
    // Same rules as the server (src/domain/money.ts): '1.250,500' and '1.250.000' use dots for thousands.
    let cleaned = String(input ?? '').trim().replace(/\s/g, '').replace(/(dt|tnd)$/i, '');
    if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    else if ((cleaned.match(/\./g) || []).length > 1) cleaned = cleaned.replace(/\./g, '');
    if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;
    const [whole, fraction = ''] = cleaned.split('.');
    return Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  },
  // Dates are shown the Tunisian way: 23/09/2026, 14:30.
  date(value) {
    const d = new Date(value);
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  time(value) {
    const d = new Date(value);
    return isNaN(d) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  },
  dateTime(value) {
    return `${Molaris.format.date(value)} ${Molaris.format.time(value)}`.trim();
  },
  // Local calendar date as 'YYYY-MM-DD' (not UTC, so late-evening dates don't shift).
  isoDate(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

// ---------------------------------------------------------------------------
// UI: modal + toast in the app's existing visual style.
// ---------------------------------------------------------------------------
Molaris.ui = {
  /**
   * Opens a modal containing a <form>. `bodyHtml` holds the form fields.
   * onSubmit(formData, { close, setError }) may be async; throw to show an error.
   */
  /** Open modals, topmost last (Escape closes only the topmost). */
  _modals: [],

  modal({ title, bodyHtml, submitLabel, onSubmit, wide = false }) {
    const isFr = Molaris.isFr();
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 ${wide ? 'max-w-3xl' : 'max-w-lg'} w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(title)}</h3>
          <button type="button" data-close class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none">&times;</button>
        </div>
        <form class="space-y-3 text-xs">
          ${bodyHtml}
          <div data-error class="hidden p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"></div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" data-close class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">${isFr ? 'Annuler' : 'Cancel'}</button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm">${escapeHtml(submitLabel || (isFr ? 'Enregistrer' : 'Save'))}</button>
          </div>
        </form>
      </div>`;
    const onKey = (e) => { if (e.key === 'Escape' && Molaris.ui._modals.at(-1) === overlay) dismiss(); };
    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      Molaris.ui._modals = Molaris.ui._modals.filter(m => m !== overlay);
    };
    // Escape or a click beside the dialog closes it, but never silently drops typed data
    // (a stray click must not lose a 10-line quote).
    let dirty = false;
    const dismiss = () => {
      if (!dirty || window.confirm(isFr ? 'Fermer sans enregistrer ?' : 'Close without saving?')) close();
    };
    const errorBox = overlay.querySelector('[data-error]');
    const setError = (message) => {
      errorBox.textContent = message || '';
      errorBox.classList.toggle('hidden', !message);
    };
    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) dismiss(); });
    const form = overlay.querySelector('form');
    form.addEventListener('input', () => { dirty = true; });
    form.addEventListener('change', () => { dirty = true; });
    document.addEventListener('keydown', onKey);
    Molaris.ui._modals.push(overlay);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setError('');
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        await onSubmit(new FormData(form), { close, setError });
      } catch (err) {
        setError(err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });
    document.body.appendChild(overlay);
    form.querySelector('input, select, textarea')?.focus();
    return { close, element: overlay, form };
  },

  toast(message, type = 'success') {
    const colors = {
      success: 'bg-emerald-600',
      error: 'bg-rose-600',
      info: 'bg-slate-800'
    };
    const el = document.createElement('div');
    el.className = `fixed bottom-5 right-5 z-[60] px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-lg ${colors[type] || colors.info}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
};

// ---------------------------------------------------------------------------
// Patients: shared list for pickers (agenda, billing, prescriptions).
// ---------------------------------------------------------------------------
Molaris.patients = {
  async list() {
    const data = await Molaris.api.get('/api/patients');
    return data.patients;
  },
  active() {
    return window.systemState ? systemState.activePatient : null;
  },
  // Makes a patient the active chart (header, odontogram, meds…); emits 'patient-changed'.
  select(patientId) {
    return window.selectPatient(patientId);
  },
  // Opens the new-patient form, optionally prefilled ({ name, phone, chiefComplaint }).
  // Resolves with the created patient (now the active chart), or null if the form was closed.
  create(prefill = {}) {
    return new Promise(resolve => window.openNewPatientModal(prefill, resolve));
  },
  // Fills a <select> with all patients ("Name — Chart"), preselecting selectedId.
  async fillSelect(selectEl, selectedId, { allowEmpty = false } = {}) {
    const patients = await Molaris.patients.list();
    const isFr = Molaris.isFr();
    selectEl.innerHTML = (allowEmpty ? `<option value="">${isFr ? '— Choisir un patient —' : '— Select a patient —'}</option>` : '') +
      patients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .map(p => `<option value="${escapeHtml(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)} — ${escapeHtml(p.chartId)}</option>`)
        .join('');
    return patients;
  }
};

// ---------------------------------------------------------------------------
// Print: A4 document with the clinic letterhead (Settings > Clinic identity).
// Prints through a hidden iframe, so no popup blocker gets in the way.
// dir: 'ltr' for French, 'rtl' for Arabic documents.
// ---------------------------------------------------------------------------
Molaris.print = {
  async document({ title, bodyHtml, dir = 'ltr', lang = 'fr' }) {
    let clinic = {};
    try {
      clinic = (await Molaris.api.get('/api/settings/clinic')).clinic;
    } catch { /* print without letterhead rather than not at all */ }

    // dir="auto": each line keeps its own direction, so a French address on an Arabic
    // document stays « 10, avenue… » (not « avenue… ,10 »), and an Arabic one reads right to left.
    const line = (label, value) => value ? `<div dir="auto">${label ? `${escapeHtml(label)} ` : ''}${escapeHtml(value)}</div>` : '';
    const letterhead = `
      <header class="letterhead">
        <div>
          <div class="clinic" dir="auto">${escapeHtml(clinic.doctorName || clinic.clinicName || '')}</div>
          ${line('', clinic.specialty)}
          ${clinic.doctorName ? line('', clinic.clinicName) : ''}
        </div>
        <div class="contact">
          ${line('', clinic.address)}
          ${line('', clinic.city)}
          ${line('Tél :', clinic.phone)}
          ${line('', clinic.email)}
          ${line('N° Ordre :', clinic.orderNumber)}
          ${line('MF :', clinic.fiscalId)}
          ${line('Code CNAM :', clinic.cnamCode)}
        </div>
      </header>`;

    const html = `<!doctype html>
      <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; font-size: 12pt; margin: 0; }
          .letterhead { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 18px; font-size: 10pt; color: #334155; }
          .letterhead .clinic { font-size: 14pt; font-weight: 700; color: #0f766e; }
          .letterhead .contact { text-align: end; }
          h1 { font-size: 15pt; text-align: center; margin: 8px 0 16px; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: start; font-size: 11pt; }
          th { background: #f1f5f9; }
          .num { text-align: end; white-space: nowrap; }
          .muted { color: #64748b; font-size: 10pt; }
          .signature { margin-top: 48px; text-align: end; }
          /* Long documents: header row repeated on each page, no row or signature split in two. */
          thead { display: table-header-group; }
          tr, .signature, .keep-together { break-inside: avoid; page-break-inside: avoid; }
        </style>
      </head>
      <body>${letterhead}<h1>${escapeHtml(title)}</h1>${bodyHtml}</body>
      </html>`;

    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
  }
};
