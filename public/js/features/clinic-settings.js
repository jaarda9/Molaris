// Clinic identity (letterhead of quotes, receipts, prescriptions): edit form + live preview.
// Renders into #clinic-identity-root inside the Preferences tab.
(function () {
  const t = (key) => Molaris.i18n.t(key);
  const FIELDS = [
    ['clinicName', 'text'], ['doctorName', 'text'], ['specialty', 'text'], ['phone', 'tel'],
    ['address', 'text'], ['city', 'text'], ['email', 'email'],
    ['orderNumber', 'text'], ['fiscalId', 'text'], ['cnamCode', 'text']
  ];
  const inputClass = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white';
  let clinic = {};

  function previewHtml(c) {
    const lines = [
      c.specialty,
      c.doctorName ? c.clinicName : '',
      [c.address, c.city].filter(Boolean).join(', '),
      c.phone ? `Tél : ${c.phone}` : '',
      c.orderNumber ? `N° Ordre : ${c.orderNumber}` : '',
      c.fiscalId ? `MF : ${c.fiscalId}` : '',
      c.cnamCode ? `Code CNAM : ${c.cnamCode}` : ''
    ].filter(Boolean);
    const title = c.doctorName || c.clinicName;
    if (!title && lines.length === 0) {
      return `<p class="text-slate-400">${escapeHtml(t('clinic.empty'))}</p>`;
    }
    return `
      <div class="text-sm font-bold text-teal-700 dark:text-teal-300">${escapeHtml(title || '')}</div>
      ${lines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}`;
  }

  function readForm(root) {
    const data = {};
    for (const [key] of FIELDS) data[key] = root.querySelector(`[name="${key}"]`).value.trim();
    return data;
  }

  function render() {
    const root = document.getElementById('clinic-identity-root');
    if (!root) return;
    const field = ([key, type]) => `
      <label class="block">
        <span class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">${escapeHtml(t('clinic.' + key))}</span>
        <input type="${type}" name="${key}" value="${escapeHtml(clinic[key] || '')}" class="${inputClass}">
      </label>`;

    root.innerHTML = `
      <div class="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div class="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">${escapeHtml(t('clinic.title'))}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(t('clinic.subtitle'))}</p>
        </div>
        <form class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${FIELDS.slice(0, 7).map(field).join('')}</div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">${FIELDS.slice(7).map(field).join('')}</div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(t('clinic.cnamHint'))}</p>
          <div>
            <div class="font-semibold text-slate-700 dark:text-slate-300 mb-1">${escapeHtml(t('clinic.preview'))}</div>
            <div data-preview class="border-b-2 border-teal-600 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-xs text-slate-600 dark:text-slate-300 space-y-0.5"></div>
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <button type="button" data-print class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">${escapeHtml(t('clinic.printTest'))}</button>
            <button type="submit" class="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm">${escapeHtml(t('clinic.save'))}</button>
          </div>
        </form>
      </div>`;

    const form = root.querySelector('form');
    const preview = root.querySelector('[data-preview]');
    const refreshPreview = () => { preview.innerHTML = previewHtml(readForm(root)); };
    refreshPreview();
    form.addEventListener('input', refreshPreview);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        clinic = (await Molaris.api.put('/api/settings/clinic', readForm(root))).clinic;
        Molaris.ui.toast(t('clinic.saved'));
      } catch (err) {
        Molaris.ui.toast(err.message, 'error');
      }
    });

    root.querySelector('[data-print]').addEventListener('click', async () => {
      try {
        // Save first so the printed page (which reads the saved identity) matches the form.
        clinic = (await Molaris.api.put('/api/settings/clinic', readForm(root))).clinic;
        await Molaris.print.document({
          title: t('clinic.testTitle'),
          bodyHtml: `<p>${escapeHtml(t('clinic.testBody'))}</p><div class="signature">${escapeHtml(clinic.doctorName || '')}</div>`
        });
      } catch (err) {
        Molaris.ui.toast(err.message, 'error');
      }
    });
  }

  async function load() {
    try {
      clinic = (await Molaris.api.get('/api/settings/clinic')).clinic;
      render();
    } catch (err) {
      Molaris.ui.toast(err.message, 'error');
    }
  }

  Molaris.events.on('view-shown', ({ view }) => { if (view === 'view-preferences') load(); });
  Molaris.events.on('language-changed', () => { if (systemState.activeTab === 'view-preferences') render(); });
})();
