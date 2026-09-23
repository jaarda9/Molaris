// -----------------------------------------------------------------------------
// Navigation Tabs
// -----------------------------------------------------------------------------
function initNavigation() {
  // Every button with class "nav-tab" and id "nav-tab-X" shows the section "view-X",
  // so adding a tab only needs markup; features react via Molaris.events 'view-shown'.
  const tabs = Array.from(document.querySelectorAll('.nav-tab[id^="nav-tab-"]')).map(btn => ({
    id: btn.id,
    view: 'view-' + btn.id.slice('nav-tab-'.length)
  }));

  tabs.forEach(t => {
    const btn = document.getElementById(t.id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      // Update buttons
      tabs.forEach(other => {
        const b = document.getElementById(other.id);
        const v = document.getElementById(other.view);
        if (b) {
          b.classList.remove('bg-teal-600', 'text-white', 'active');
          b.classList.add('text-slate-600', 'dark:text-slate-300');
        }
        if (v) v.classList.add('hidden');
      });

      btn.classList.add('bg-teal-600', 'text-white', 'active');
      btn.classList.remove('text-slate-600', 'dark:text-slate-300');
      const targetView = document.getElementById(t.view);
      if (targetView) targetView.classList.remove('hidden');
      systemState.activeTab = t.view;

      if (t.view === 'view-treatment') fetchTreatmentPlan();
      if (t.view === 'view-medications') fetchMedications();
      if (t.view === 'view-perio') { fetchPerioLatest(); fetchPerioHistory(); }
      if (t.view === 'view-labcases') fetchLabCases();
      Molaris.events.emit('view-shown', { view: t.view });
    });
  });

  const jumpProtocols = document.getElementById('jump-to-protocols-btn');
  if (jumpProtocols) {
    jumpProtocols.addEventListener('click', () => {
      document.getElementById('nav-tab-protocols')?.click();
    });
  }

  const openPrefs = document.getElementById('open-preferences-btn');
  if (openPrefs) {
    openPrefs.addEventListener('click', () => {
      document.getElementById('nav-tab-preferences')?.click();
    });
  }
}
