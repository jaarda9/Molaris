// -----------------------------------------------------------------------------
// Interactive Odontogram Engine (FDI chart: 32 permanent teeth + 20 primary teeth)
// -----------------------------------------------------------------------------
async function fetchOdontogram() {
  try {
    const [permanentRes, primaryRes] = await Promise.all([fetch('/api/odontogram'), fetch('/api/odontogram/primary')]);
    systemState.teethData = await permanentRes.json();
    systemState.primaryTeeth = await primaryRes.json();
    renderOdontogram();
  } catch (err) {
    console.error('Failed to load odontogram:', err);
  }
}

function renderOdontogram() {
  const maxGrid = document.getElementById('maxillary-teeth-grid');
  const manGrid = document.getElementById('mandibular-teeth-grid');
  if (!maxGrid || !manGrid) return;
  if (!systemState.teethData || !Array.isArray(systemState.teethData)) return;

  // FDI chart as drawn in Tunisia, patient's right on the left of the screen:
  // upper 18→11 | 21→28 (internal ids 1..16), lower 48→41 | 31→38 (ids 32..17).
  const upper = systemState.teethData.filter(t => t.arch === 'maxillary').sort((a, b) => a.id - b.id);
  const lower = systemState.teethData.filter(t => t.arch === 'mandibular').sort((a, b) => b.id - a.id);
  fillArchRow(maxGrid, upper, createToothCard);
  fillArchRow(manGrid, lower, createToothCard);
  renderPrimaryTeeth();
}

// Primary teeth (ids = FDI 51–85): shown for children automatically, for adults only
// when a baby tooth has a finding or the dentist asks for them (retained tooth).
function renderPrimaryTeeth() {
  const state = systemState.primaryTeeth;
  const upperWrap = document.getElementById('primary-upper-wrap');
  const lowerWrap = document.getElementById('primary-lower-wrap');
  if (!state || !upperWrap || !lowerWrap) return;

  upperWrap.classList.toggle('hidden', !state.visible);
  lowerWrap.classList.toggle('hidden', !state.visible);
  if (state.visible) {
    const teeth = state.primaryTeeth || [];
    const quadrant = (q, ascending) => teeth.filter(t => Math.floor(t.fdi / 10) === q)
      .sort((a, b) => ascending ? a.fdi - b.fdi : b.fdi - a.fdi);
    // 55→51 | 61→65 over 85→81 | 71→75, aligned under 15…11 | 21…25.
    fillPrimaryArchRow(document.getElementById('primary-upper-grid'), quadrant(5, false), quadrant(6, true));
    fillPrimaryArchRow(document.getElementById('primary-lower-grid'), quadrant(8, false), quadrant(7, true));
  }
  renderPrimaryTeethControl();
}

function fillPrimaryArchRow(grid, right, left) {
  if (!grid) return;
  grid.innerHTML = '';
  const spacer = () => grid.appendChild(document.createElement('div'));
  for (let i = 0; i < 3; i++) spacer();
  right.forEach(t => grid.appendChild(createToothCard(t)));
  const midline = document.createElement('div');
  midline.className = 'arch-midline';
  midline.setAttribute('aria-hidden', 'true');
  grid.appendChild(midline);
  left.forEach(t => grid.appendChild(createToothCard(t)));
  for (let i = 0; i < 3; i++) spacer();
}

function renderPrimaryTeethControl() {
  const state = systemState.primaryTeeth;
  const toggle = document.getElementById('primary-teeth-toggle');
  const reason = document.getElementById('primary-teeth-reason');
  const autoLink = document.getElementById('primary-teeth-auto');
  if (!state || !toggle || !reason || !autoLink) return;
  toggle.textContent = molarisT(state.visible ? 'odonto.primaryHideBtn' : 'odonto.primaryShowBtn');
  toggle.setAttribute('aria-pressed', String(state.visible));
  reason.textContent = molarisT('odonto.primaryReason.' + state.reason).replace('{age}', state.age);
  autoLink.classList.toggle('hidden', state.mode === 'auto');
}

async function setPrimaryTeethMode(mode) {
  try {
    const res = await fetch('/api/odontogram/primary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || '');
    systemState.primaryTeeth = data;
    // A hidden primary tooth cannot stay selected.
    if (!data.visible && systemState.selectedTooth && systemState.selectedTooth.dentition === 'primary') {
      systemState.selectedTooth = null;
      document.getElementById('tooth-detail-card')?.classList.add('hidden');
      updateChatToothBanner(null);
    }
    renderOdontogram();
  } catch (err) {
    alert(molarisT('common.networkError') + ' ' + err.message);
  }
}

document.getElementById('primary-teeth-toggle')?.addEventListener('click', () => {
  const visible = !!(systemState.primaryTeeth && systemState.primaryTeeth.visible);
  setPrimaryTeethMode(visible ? 'hidden' : 'shown');
});
document.getElementById('primary-teeth-auto')?.addEventListener('click', () => setPrimaryTeethMode('auto'));
Molaris.events.on('language-changed', renderPrimaryTeethControl);

// Lays out one arch as 8 teeth | midline | 8 teeth. Shared with the perio chart.
function fillArchRow(grid, teeth, createCard) {
  grid.innerHTML = '';
  teeth.forEach((tooth, index) => {
    if (index === 8) {
      const midline = document.createElement('div');
      midline.className = 'arch-midline';
      midline.setAttribute('aria-hidden', 'true');
      grid.appendChild(midline);
    }
    grid.appendChild(createCard(tooth));
  });
}

function createToothCard(tooth) {
  const card = document.createElement('div');
  const isSelected = systemState.selectedTooth && systemState.selectedTooth.id === tooth.id;
  card.className = `tooth-card cursor-pointer p-1.5 rounded-xl border text-center relative flex flex-col items-center justify-between gap-0.5 min-h-[78px] status-${tooth.status} ${isSelected ? 'selected' : ''}`;
  card.id = `tooth-card-${tooth.id}`;

  const isFr = systemState.language === 'fr';
  const frTooth = window.MOLARIS_FRENCH_TEETH && window.MOLARIS_FRENCH_TEETH[tooth.id];
  card.title = isFr && frTooth ? frTooth.name : tooth.name;

  // The FDI number sits next to the occlusal plane, as on the paper chart.
  const number = `<span class="text-sm font-mono font-bold leading-none">${escapeHtml(String(tooth.fdi))}</span>`;
  const icon = `<svg class="tooth-svg w-6 h-6 mx-auto opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${getToothSvgPath(tooth.type)}</svg>`;
  const status = `<span class="text-[9px] font-semibold opacity-75 truncate w-full">${escapeHtml(getTranslatedToothStatus(tooth.status, isFr))}</span>`;
  card.innerHTML = tooth.arch === 'maxillary' ? status + icon + number : number + icon + status;

  card.addEventListener('click', () => {
    selectTooth(tooth);
  });

  return card;
}

function getToothSvgPath(type) {
  switch (type) {
    case 'molar':
      return '<path d="M5 4C3.5 4 2 6 2 9C2 13 3 17 5 21C6 22 7 22 8 20C9 18 9 17 12 17C15 17 15 18 16 20C17 22 18 22 19 21C21 17 22 13 22 9C22 6 20.5 4 19 4C17 4 16 5 12 5C8 5 7 4 5 4Z"/>';
    case 'premolar':
      return '<path d="M6 4C4.5 4 3 6 3 9C3 13 4 17 6 21C7 22 8 22 9 20C10 18 10 17 12 17C14 17 14 18 15 20C16 22 17 22 18 21C20 17 21 13 21 9C21 6 19.5 4 18 4C16 4 15 5 12 5C9 5 8 4 6 4Z"/>';
    case 'canine':
      return '<path d="M7 4C5 4 4 7 4 10C4 15 6 19 8 21C9 22 10 22 11 20C11.5 19 12 17 12 17C12 17 12.5 19 13 20C14 22 15 22 16 21C18 19 20 15 20 10C20 7 19 4 17 4C14 4 13 6 12 6C11 6 10 4 7 4Z"/>';
    default: // incisor
      return '<path d="M7 3C5.5 3 5 5 5 8C5 13 7 18 9 21C10 22 11 22 11.5 20C12 18 12 17 12 17C12 17 12 18 12.5 20C13 22 14 22 15 21C17 18 19 13 19 8C19 5 18.5 3 17 3C15 3 14 4 12 4C10 4 9 3 7 3Z"/>';
  }
}

function selectTooth(tooth) {
  systemState.selectedTooth = tooth;
  renderOdontogram(); // re-render to show selected ring

  const detailCard = document.getElementById('tooth-detail-card');
  const numberEl = document.getElementById('detail-tooth-number');
  const nameEl = document.getElementById('detail-tooth-name');
  const fdiEl = document.getElementById('detail-tooth-fdi');
  const notesEl = document.getElementById('detail-tooth-notes');

  detailCard.classList.remove('hidden');
  const isFr = systemState.language === 'fr';
  const frTooth = window.MOLARIS_FRENCH_TEETH && window.MOLARIS_FRENCH_TEETH[tooth.id];
  const toothName = isFr && frTooth ? frTooth.name : tooth.name;
  const archText = isFr ? (tooth.arch === 'maxillary' ? 'MAXILLAIRE' : 'MANDIBULAIRE') : tooth.arch.toUpperCase();
  const typeText = isFr && frTooth ? frTooth.type.toUpperCase() : tooth.type.toUpperCase();

  numberEl.textContent = String(tooth.fdi);
  nameEl.textContent = toothName;
  fdiEl.textContent = isFr
    ? `Notation FDI : ${tooth.fdi} • Arcade : ${archText} • Type : ${typeText}`
    : `FDI Notation: ${tooth.fdi} • Arch: ${tooth.arch.toUpperCase()} • Type: ${tooth.type.toUpperCase()}`;
  notesEl.value = tooth.notes || '';

  // Initialize tooth surfaces checkboxes from persisted data
  const surfaces = tooth.surfaces || {};
  ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'].forEach(s => {
    const cb = document.getElementById(`surface-${s}`);
    if (cb) cb.checked = !!surfaces[s];
  });

  // Highlight active status button
  document.querySelectorAll('.status-choice-btn').forEach(btn => {
    if (btn.dataset.status === tooth.status) {
      btn.className = 'status-choice-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white border-teal-600';
    } else {
      btn.className = 'status-choice-btn px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300';
    }
  });

  // Also update chat banner
  updateChatToothBanner(tooth);
}

function updateChatToothBanner(tooth) {
  const banner = document.getElementById('chat-tooth-context-banner');
  const nameSpan = document.getElementById('chat-target-tooth-name');
  const statusSpan = document.getElementById('chat-target-tooth-status');
  if (!banner) return;

  if (tooth) {
    banner.classList.remove('hidden');
    const isFr = systemState.language === 'fr';
    const frTooth = window.MOLARIS_FRENCH_TEETH && window.MOLARIS_FRENCH_TEETH[tooth.id];
    const toothName = isFr && frTooth ? frTooth.name : tooth.name;
    const statusName = getTranslatedToothStatus(tooth.status, isFr);
    nameSpan.textContent = isFr ? `Dent ${tooth.fdi} (${toothName})` : `Tooth ${tooth.fdi} (${tooth.name})`;
    statusSpan.textContent = `[${statusName.toUpperCase()}]`;
  } else {
    banner.classList.add('hidden');
  }
}

// Tooth detail drawer handlers
document.querySelectorAll('.status-choice-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!systemState.selectedTooth) return;
    const newStatus = btn.dataset.status;
    systemState.selectedTooth.status = newStatus;

    try {
      await fetch('/api/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothId: systemState.selectedTooth.id,
          status: newStatus
        })
      });
      if (systemState.selectedTooth.dentition === 'primary') {
        // A finding on a baby tooth can change why/whether the primary teeth are shown.
        const id = systemState.selectedTooth.id;
        systemState.primaryTeeth = await (await fetch('/api/odontogram/primary')).json();
        systemState.selectedTooth = systemState.primaryTeeth.primaryTeeth.find(t => t.id === id) || systemState.selectedTooth;
      }
      selectTooth(systemState.selectedTooth);
    } catch (e) {
      console.error(e);
    }
  });
});

function collectToothSurfaces() {
  const surfaces = {};
  ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'].forEach(s => {
    const cb = document.getElementById(`surface-${s}`);
    if (cb) surfaces[s] = cb.checked;
  });
  return surfaces;
}

const saveNoteBtn = document.getElementById('save-tooth-note-btn');
if (saveNoteBtn) {
  saveNoteBtn.addEventListener('click', async () => {
    if (!systemState.selectedTooth) return;
    const notes = document.getElementById('detail-tooth-notes').value;
    const surfaces = collectToothSurfaces();
    systemState.selectedTooth.notes = notes;
    systemState.selectedTooth.surfaces = surfaces;

    try {
      await fetch('/api/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothId: systemState.selectedTooth.id,
          notes,
          surfaces
        })
      });
      playClinicalBeep(700, 'sine', 0.1);
    } catch (e) {
      console.error(e);
    }
  });
}

// Immediate-save on any surface checkbox toggle (mirrors the status-choice-btn pattern)
['mesial', 'distal', 'occlusal', 'buccal', 'lingual'].forEach(s => {
  const cb = document.getElementById(`surface-${s}`);
  if (!cb) return;
  cb.addEventListener('change', async () => {
    if (!systemState.selectedTooth) return;
    const surfaces = collectToothSurfaces();
    systemState.selectedTooth.surfaces = surfaces;
    try {
      await fetch('/api/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothId: systemState.selectedTooth.id,
          surfaces
        })
      });
    } catch (e) {
      console.error(e);
    }
  });
});

const consultToothAdvisorBtn = document.getElementById('consult-tooth-advisor-btn');
if (consultToothAdvisorBtn) {
  consultToothAdvisorBtn.addEventListener('click', () => {
    if (!systemState.selectedTooth) return;
    // Switch to advisor tab
    document.getElementById('nav-tab-advisor')?.click();
    const t = systemState.selectedTooth;
    chatInput.value = systemState.language === 'fr'
      ? `Avis sur la dent ${t.fdi} (statut actuel : ${getTranslatedToothStatus(t.status, true)}). Quel plan de traitement fondé sur les preuves proposez-vous ?`
      : `Advice on tooth ${t.fdi} (current status: ${t.status}). What evidence-based treatment plan do you suggest?`;
    chatInput.focus();
  });
}

const removeToothContextBtn = document.getElementById('remove-tooth-context-btn');
if (removeToothContextBtn) {
  removeToothContextBtn.addEventListener('click', () => {
    systemState.selectedTooth = null;
    updateChatToothBanner(null);
    renderOdontogram();
  });
}

const resetOdontogramBtn = document.getElementById('reset-odontogram-btn');
if (resetOdontogramBtn) {
  resetOdontogramBtn.addEventListener('click', async () => {
    // Everything charted is lost: say for whom and how much, and that it cannot be undone.
    const charted = [...(systemState.teethData || []), ...(systemState.primaryTeeth?.primaryTeeth || [])]
      .filter(t => (t.status && t.status !== 'sound' && t.status !== 'unerupted' && !(t.dentition === 'primary' && t.status === 'missing')) || t.notes).length;
    if (charted && !confirm(molarisT('odonto.resetConfirm')
      .replace('{n}', charted).replace('{name}', systemState.activePatient?.name || ''))) return;
    await fetch('/api/odontogram/reset', { method: 'POST' });
    await fetchOdontogram();
    systemState.selectedTooth = null;
    document.getElementById('tooth-detail-card')?.classList.add('hidden');
    updateChatToothBanner(null);
  });
}
