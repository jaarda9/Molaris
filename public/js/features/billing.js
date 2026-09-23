// Billing: procedure catalog, quotes (devis), payments/installments, receipts.
// Renders into #billing-root; the tab stays hidden until the feature calls
// Molaris.showTab('billing'). See CLAUDE.md for conventions.
(function () {
  const VIEW = 'view-billing';
  const t = (key) => Molaris.i18n.t(key);

  async function render() {
    const root = document.getElementById('billing-root');
    const { procedures } = await Molaris.api.get('/api/procedures');

    const rows = procedures.map(p => `
      <tr class="border-t border-slate-100 dark:border-slate-800">
        <td class="py-2 font-mono text-slate-500">${escapeHtml(p.code || '')}</td>
        <td class="py-2 text-slate-800 dark:text-slate-200">${escapeHtml(p.labelFr)}</td>
        <td class="py-2 text-right font-mono">${escapeHtml(Molaris.format.tnd(p.defaultPriceMillimes))}</td>
      </tr>`).join('');

    root.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(t('billing.catalogTitle'))}</h2>
        ${rows
          ? `<table class="w-full text-xs"><tbody>${rows}</tbody></table>`
          : `<p class="text-center py-10 text-slate-400 text-xs">${escapeHtml(t('billing.catalogEmpty'))}</p>`}
      </div>`;
  }

  function refreshIfVisible() {
    if (systemState.activeTab === VIEW) render().catch(err => Molaris.ui.toast(err.message, 'error'));
  }

  Molaris.events.on('view-shown', ({ view }) => { if (view === VIEW) refreshIfVisible(); });
  Molaris.events.on('language-changed', refreshIfVisible);
})();
