// -----------------------------------------------------------------------------
// Full-Mouth Perio Chart Engine (6-site probing, snapshotted by date)
// -----------------------------------------------------------------------------
const PERIO_SITE_KEYS = ['mesiobuccal', 'buccal', 'distobuccal', 'distolingual', 'lingual', 'mesiolingual'];

function getPerioSiteLabel(key, isFr) {
  const map = {
    mesiobuccal: isFr ? 'Mésio-vestibulaire' : 'Mesiobuccal',
    buccal: isFr ? 'Vestibulaire' : 'Buccal',
    distobuccal: isFr ? 'Disto-vestibulaire' : 'Distobuccal',
    distolingual: isFr ? 'Disto-lingual' : 'Distolingual',
    lingual: isFr ? 'Lingual' : 'Lingual',
    mesiolingual: isFr ? 'Mésio-lingual' : 'Mesiolingual'
  };
  return map[key] || key;
}

async function fetchPerioLatest() {
  try {
    const res = await fetch('/api/perio-charts/latest');
    const data = await res.json();
    systemState.perioTeeth = data.chart.teeth;
    systemState.perioChartId = data.chart.id;
    systemState.perioIsNew = data.isNew;

    const notesInput = document.getElementById('perio-notes-input');
    if (notesInput) notesInput.value = data.chart.notes || '';

    const dateBadge = document.getElementById('perio-chart-date-badge');
    if (dateBadge) {
      const isFr = systemState.language === 'fr';
      dateBadge.textContent = data.isNew
        ? (isFr ? 'Nouveau relevé' : 'New Chart')
        : new Date(data.chart.date).toLocaleDateString(isFr ? 'fr-FR' : 'en-US');
    }

    renderPerioGrid();
  } catch (err) {
    console.error('Failed to fetch latest perio chart:', err);
  }
}

async function fetchPerioHistory() {
  try {
    const res = await fetch('/api/perio-charts');
    const data = await res.json();
    systemState.perioHistory = data.charts || [];
    renderPerioHistory();
  } catch (err) {
    console.error('Failed to fetch perio chart history:', err);
  }
}

function renderPerioHistory() {
  const container = document.getElementById('perio-history-list');
  if (!container) return;
  const history = systemState.perioHistory || [];
  const isFr = systemState.language === 'fr';

  if (history.length === 0) {
    container.innerHTML = `<div class="text-slate-400 py-2">${isFr ? 'Aucun relevé antérieur enregistré.' : 'No prior snapshots saved yet.'}</div>`;
    return;
  }

  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sorted.map(snap => `
    <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
      <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">${new Date(snap.date).toLocaleString(isFr ? 'fr-FR' : 'en-US')}</span>
      ${snap.notes ? `<span class="text-slate-500 dark:text-slate-400 italic truncate ml-3">${escapeHtml(snap.notes)}</span>` : ''}
    </div>
  `).join('');
}

function renderPerioGrid() {
  const maxGrid = document.getElementById('perio-maxillary-grid');
  const manGrid = document.getElementById('perio-mandibular-grid');
  if (!maxGrid || !manGrid) return;
  const teeth = systemState.perioTeeth || [];
  if (teeth.length === 0) return;

  maxGrid.innerHTML = '';
  manGrid.innerHTML = '';

  const maxillary = teeth.filter(t => isMaxillaryToothId(t.toothId)).sort((a, b) => a.toothId - b.toothId);
  const mandibular = teeth.filter(t => !isMaxillaryToothId(t.toothId)).sort((a, b) => b.toothId - a.toothId);

  maxillary.forEach(t => maxGrid.appendChild(createPerioToothCard(t)));
  mandibular.forEach(t => manGrid.appendChild(createPerioToothCard(t)));
}

function createPerioToothCard(entry) {
  const sites = Object.values(entry.sites);
  const maxDepth = Math.max(...sites.map(s => s.pocketDepth));
  const anyBleeding = sites.some(s => s.bleeding);
  const anySuppuration = sites.some(s => s.suppuration);

  let severityClass = 'status-sound';
  if (maxDepth >= 6) severityClass = 'status-caries';
  else if (maxDepth >= 4) severityClass = 'status-crown';

  const card = document.createElement('div');
  card.className = `cursor-pointer p-2 rounded-xl border text-center flex flex-col items-center justify-between gap-1 min-h-[72px] ${severityClass}`;
  card.innerHTML = `
    <span class="text-[10px] font-mono font-bold">#${entry.toothId}</span>
    <span class="text-sm font-bold">${maxDepth}mm</span>
    <span class="flex items-center gap-1 h-3">
      ${anyBleeding ? '<span class="w-2 h-2 rounded-full bg-rose-500" title="Bleeding on probing"></span>' : ''}
      ${anySuppuration ? '<span class="w-2 h-2 rounded-full bg-amber-500" title="Suppuration"></span>' : ''}
      ${entry.mobility > 0 ? `<span class="text-[9px] font-mono">M${entry.mobility}</span>` : ''}
    </span>
  `;
  card.addEventListener('click', () => openPerioToothModal(entry));
  return card;
}

function openPerioToothModal(entry) {
  const modal = document.getElementById('modal-perio-tooth');
  const title = document.getElementById('modal-perio-title');
  if (!modal) return;
  const isFr = systemState.language === 'fr';

  document.getElementById('form-perio-tooth-id').value = entry.toothId;
  title.textContent = isFr ? `Saisie Parodontale — Dent #${entry.toothId}` : `Perio Entry — Tooth #${entry.toothId}`;
  document.getElementById('form-perio-mobility').value = String(entry.mobility);
  document.getElementById('form-perio-furcation').value = (entry.furcation === null || entry.furcation === undefined) ? 'null' : String(entry.furcation);

  const sitesContainer = document.getElementById('perio-sites-container');
  sitesContainer.innerHTML = PERIO_SITE_KEYS.map(key => {
    const site = entry.sites[key];
    return `
      <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5" data-site="${key}">
        <div class="font-semibold text-slate-700 dark:text-slate-300">${getPerioSiteLabel(key, isFr)}</div>
        <div class="grid grid-cols-2 gap-1.5">
          <label class="flex flex-col gap-0.5">
            <span class="text-[10px] text-slate-500">${isFr ? 'Profondeur (mm)' : 'Pocket (mm)'}</span>
            <input type="number" min="0" max="15" class="site-pocket w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1" value="${site.pocketDepth}">
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[10px] text-slate-500">${isFr ? 'Récession (mm)' : 'Recession (mm)'}</span>
            <input type="number" min="0" max="15" class="site-recession w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1" value="${site.recession}">
          </label>
        </div>
        <div class="flex items-center gap-3 pt-0.5">
          <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" class="site-bleeding" ${site.bleeding ? 'checked' : ''}> <span>${isFr ? 'Saignement' : 'Bleeding'}</span></label>
          <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" class="site-suppuration" ${site.suppuration ? 'checked' : ''}> <span>${isFr ? 'Suppuration' : 'Suppuration'}</span></label>
        </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function initPerioChartManager() {
  const modal = document.getElementById('modal-perio-tooth');
  const closeBtn = document.getElementById('btn-close-modal-perio');
  const cancelBtn = document.getElementById('btn-cancel-modal-perio');
  const form = document.getElementById('perio-tooth-form');
  const saveSnapshotBtn = document.getElementById('btn-save-perio-snapshot');
  if (!modal || !form) return;

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const toothId = Number(document.getElementById('form-perio-tooth-id').value);
    const entry = (systemState.perioTeeth || []).find(t => t.toothId === toothId);
    if (!entry) return;

    entry.mobility = Number(document.getElementById('form-perio-mobility').value);
    const furcationVal = document.getElementById('form-perio-furcation').value;
    entry.furcation = furcationVal === 'null' ? null : Number(furcationVal);

    document.querySelectorAll('#perio-sites-container [data-site]').forEach(siteDiv => {
      const key = siteDiv.dataset.site;
      const pocket = Number(siteDiv.querySelector('.site-pocket').value) || 0;
      const recession = Number(siteDiv.querySelector('.site-recession').value) || 0;
      const bleeding = siteDiv.querySelector('.site-bleeding').checked;
      const suppuration = siteDiv.querySelector('.site-suppuration').checked;
      entry.sites[key] = { pocketDepth: pocket, recession, bleeding, suppuration };
    });

    modal.classList.add('hidden');
    renderPerioGrid();
    playClinicalBeep(700, 'sine', 0.1);
  });

  if (saveSnapshotBtn) {
    saveSnapshotBtn.addEventListener('click', async () => {
      const notes = document.getElementById('perio-notes-input')?.value || '';
      const confirmEl = document.getElementById('perio-save-confirmation');
      if (confirmEl) confirmEl.classList.add('hidden');
      try {
        const res = await fetch('/api/perio-charts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teeth: systemState.perioTeeth, notes })
        });
        const data = await res.json();
        if (data.success) {
          playClinicalBeep(880, 'sine', 0.2);
          if (confirmEl) confirmEl.classList.remove('hidden');
          await fetchPerioLatest();
          await fetchPerioHistory();
        } else {
          alert('Error saving perio snapshot: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error saving perio snapshot: ' + err.message);
      }
    });
  }
}
