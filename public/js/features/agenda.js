// Agenda / appointments. Renders into #agenda-root; the tab stays hidden until
// the feature calls Molaris.showTab('agenda'). See CLAUDE.md for conventions.
(function () {
  const VIEW = 'view-agenda';
  const t = (key) => Molaris.i18n.t(key);

  async function render() {
    const root = document.getElementById('agenda-root');
    const day = Molaris.format.isoDate();
    const { appointments } = await Molaris.api.get(`/api/appointments?from=${day}&to=${day}`);

    const rows = appointments.map(a => `
      <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs">
        <span class="font-mono font-bold text-teal-700 dark:text-teal-300">${escapeHtml(a.startAt.slice(11, 16))}</span>
        <span class="flex-1 mx-3 text-slate-800 dark:text-slate-200">${escapeHtml(a.patientLabel || a.patientId || '')}</span>
        <span class="text-slate-500">${escapeHtml(a.reason || '')}</span>
      </div>`).join('');

    root.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(t('agenda.title'))}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(t('agenda.subtitle'))} — ${escapeHtml(Molaris.format.date(new Date()))}</p>
        </div>
        <div class="space-y-2">${rows || `<p class="text-center py-10 text-slate-400 text-xs">${escapeHtml(t('agenda.empty'))}</p>`}</div>
      </div>`;
  }

  function refreshIfVisible() {
    if (systemState.activeTab === VIEW) render().catch(err => Molaris.ui.toast(err.message, 'error'));
  }

  Molaris.events.on('view-shown', ({ view }) => { if (view === VIEW) refreshIfVisible(); });
  Molaris.events.on('language-changed', refreshIfVisible);
})();
