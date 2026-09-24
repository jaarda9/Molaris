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
      // Sidebar items are styled by .nav-item.active (index.html).
      tabs.forEach(other => {
        const b = document.getElementById(other.id);
        const v = document.getElementById(other.view);
        if (b) {
          b.classList.remove('active');
          b.removeAttribute('aria-current');
        }
        if (v) v.classList.add('hidden');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
      const targetView = document.getElementById(t.view);
      if (targetView) targetView.classList.remove('hidden');
      systemState.activeTab = t.view;
      closeMobileNav();
      window.scrollTo({ top: 0 });
      try { sessionStorage.setItem('molaris_view', t.id); } catch (e) { /* storage unavailable */ }

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

  // Small screens: the sidebar slides in over the page.
  const toggle = document.getElementById('sidebar-toggle');
  toggle?.addEventListener('click', () => {
    const open = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeMobileNav);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobileNav(); });

  // Landing view: the one open before a reload, otherwise the day's agenda.
  let startId = 'nav-tab-agenda';
  try { startId = sessionStorage.getItem('molaris_view') || startId; } catch (e) { /* storage unavailable */ }
  const start = document.getElementById(startId);
  (start && !start.classList.contains('hidden') ? start : document.getElementById('nav-tab-advisor'))?.click();
}

function closeMobileNav() {
  document.body.classList.remove('nav-open');
  document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', 'false');
}
