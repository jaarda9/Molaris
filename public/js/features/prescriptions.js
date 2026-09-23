// Prescriptions (ordonnances): drug list, prescription builder, FR/AR printing.
// Renders into #prescriptions-root; the tab stays hidden until the feature calls
// Molaris.showTab('prescriptions'). See CLAUDE.md for conventions.
(function () {
  const VIEW = 'view-prescriptions';
  const t = (key) => Molaris.i18n.t(key);

  async function render() {
    const root = document.getElementById('prescriptions-root');
    const { drugs } = await Molaris.api.get('/api/drugs');

    const rows = drugs.map(d => `
      <tr class="border-t border-slate-100 dark:border-slate-800">
        <td class="py-2 font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(d.dci)}</td>
        <td class="py-2 text-slate-500">${escapeHtml([d.brand, d.form, d.strength].filter(Boolean).join(' · '))}</td>
        <td class="py-2 text-slate-500">${escapeHtml(d.defaultDosage || '')}</td>
      </tr>`).join('');

    root.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(t('prescriptions.drugsTitle'))}</h2>
        ${rows
          ? `<table class="w-full text-xs"><tbody>${rows}</tbody></table>`
          : `<p class="text-center py-10 text-slate-400 text-xs">${escapeHtml(t('prescriptions.drugsEmpty'))}</p>`}
      </div>`;
  }

  function refreshIfVisible() {
    if (systemState.activeTab === VIEW) render().catch(err => Molaris.ui.toast(err.message, 'error'));
  }

  Molaris.events.on('view-shown', ({ view }) => { if (view === VIEW) refreshIfVisible(); });
  Molaris.events.on('language-changed', refreshIfVisible);
})();
