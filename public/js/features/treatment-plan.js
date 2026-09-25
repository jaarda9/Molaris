// -----------------------------------------------------------------------------
// Treatment Plan Engine
// -----------------------------------------------------------------------------

// Teeth are stored by Universal id (1-32) but shown in FDI, the notation used in
// Tunisia (and on the CNAM claim form). Also used by the SOAP screen.
function fdiForToothId(id) {
  const tooth = window.MOLARIS_FRENCH_TEETH && window.MOLARIS_FRENCH_TEETH[Number(id)];
  return tooth ? tooth.fdi : id;
}

// Fills a tooth <select> (values: Universal ids) with "46 — name" labels, in FDI order.
function fillFdiToothSelect(selectEl) {
  if (!selectEl) return;
  const isFr = systemState.language === 'fr';
  const firstOption = selectEl.options.length > 0 ? selectEl.options[0].cloneNode(true) : null;
  selectEl.innerHTML = '';
  if (firstOption) selectEl.appendChild(firstOption);

  const loaded = new Map((systemState.teethData || []).map(t => [t.id, t]));
  Object.entries(window.MOLARIS_FRENCH_TEETH || {})
    .map(([id, fr]) => ({ id: Number(id), fdi: fr.fdi, name: isFr ? fr.name : (loaded.get(Number(id))?.name || '') }))
    .sort((a, b) => a.fdi - b.fdi)
    .forEach(t => {
      const opt = document.createElement('option');
      opt.value = String(t.id);
      opt.textContent = t.name ? `${t.fdi} — ${t.name}` : String(t.fdi);
      selectEl.appendChild(opt);
    });
}
function getTreatmentPriorityLabel(priority, isFr) {
  switch (priority) {
    case 'urgent': return isFr ? 'Urgent' : 'Urgent';
    case 'high': return isFr ? 'Élevée' : 'High';
    case 'routine': return isFr ? 'Routine' : 'Routine';
    case 'elective': return isFr ? 'Optionnel' : 'Elective';
    default: return priority;
  }
}

function getTreatmentStatusLabel(status, isFr) {
  switch (status) {
    case 'proposed': return isFr ? 'Proposé' : 'Proposed';
    case 'accepted': return isFr ? 'Accepté' : 'Accepted';
    case 'in_progress': return isFr ? 'En cours' : 'In Progress';
    case 'completed': return isFr ? 'Terminé' : 'Completed';
    case 'declined': return isFr ? 'Refusé' : 'Declined';
    default: return status;
  }
}

async function fetchTreatmentPlan() {
  try {
    const res = await fetch('/api/treatment-plan');
    const data = await res.json();
    systemState.treatmentPlan = data.items || [];
    renderTreatmentPlanList();
  } catch (err) {
    console.error('Failed to fetch treatment plan:', err);
  }
}

function renderTreatmentPlanList() {
  const container = document.getElementById('treatment-plan-list');
  if (!container) return;
  const items = systemState.treatmentPlan || [];
  const isFr = systemState.language === 'fr';

  if (items.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">${escapeHtml(molarisT('treatment.empty'))}</div>`;
    return;
  }

  const priorityOrder = { urgent: 0, high: 1, routine: 2, elective: 3 };
  const sorted = [...items].sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

  // Totals of the costed items: still to do (proposed / accepted / in progress) and done.
  const millimesOf = (i) => (i.estimatedCost == null || !Number.isFinite(Number(i.estimatedCost)) ? 0 : Math.round(Number(i.estimatedCost) * 1000));
  const costOf = (list) => list.reduce((sum, i) => sum + millimesOf(i), 0);
  const toDo = costOf(items.filter(i => ['proposed', 'accepted', 'in_progress'].includes(i.status)));
  const done = costOf(items.filter(i => i.status === 'completed'));

  container.innerHTML = (toDo || done) ? `
    <div class="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      <span>${escapeHtml(molarisT('treatment.totalToDo'))} <strong class="font-mono text-slate-800 dark:text-slate-100">${escapeHtml(Molaris.format.tnd(toDo))}</strong></span>
      <span>${escapeHtml(molarisT('treatment.totalDone'))} <strong class="font-mono text-slate-800 dark:text-slate-100">${escapeHtml(Molaris.format.tnd(done))}</strong></span>
    </div>` : '';
  sorted.forEach(item => {
    const row = document.createElement('div');
    row.className = 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3';

    row.innerHTML = `
      <div class="flex-1 min-w-[220px] space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          ${item.toothId ? `<span class="font-mono font-bold text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">${escapeHtml(fdiForToothId(item.toothId))}</span>` : ''}
          <span class="font-semibold text-sm text-slate-900 dark:text-white">${escapeHtml(item.procedure)}</span>
          ${item.cdtCode ? `<span class="text-[10px] font-mono text-slate-500 dark:text-slate-400">${escapeHtml(item.cdtCode)}</span>` : ''}
          <span class="px-2 py-0.5 rounded border text-[10px] font-semibold priority-${item.priority}">${getTreatmentPriorityLabel(item.priority, isFr)}</span>
        </div>
        ${item.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(item.notes)}</p>` : ''}
        ${(item.estimatedCost !== undefined && item.estimatedCost !== null) ? `<p class="text-xs font-mono text-teal-700 dark:text-teal-400">${escapeHtml(Molaris.format.tnd(Math.round(Number(item.estimatedCost) * 1000)))}</p>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <select class="treatment-status-select text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5">
          <option value="proposed">${getTreatmentStatusLabel('proposed', isFr)}</option>
          <option value="accepted">${getTreatmentStatusLabel('accepted', isFr)}</option>
          <option value="in_progress">${getTreatmentStatusLabel('in_progress', isFr)}</option>
          <option value="completed">${getTreatmentStatusLabel('completed', isFr)}</option>
          <option value="declined">${getTreatmentStatusLabel('declined', isFr)}</option>
        </select>
        <button class="btn-delete-treatment-item p-2 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" title="${isFr ? 'Supprimer' : 'Delete'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    const statusSelect = row.querySelector('.treatment-status-select');
    if (statusSelect) {
      statusSelect.value = item.status;
      statusSelect.addEventListener('change', async (e) => {
        try {
          const res = await fetch(`/api/treatment-plan/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: e.target.value })
          });
          const resData = await res.json();
          if (resData.success) {
            item.status = resData.item.status;
            playClinicalBeep(700, 'sine', 0.1);
            renderTreatmentPlanList();
          } else {
            e.target.value = item.status;
            alert(`${molarisT('treatment.errUpdate')} ${resData.error || ''}`);
          }
        } catch (err) {
          e.target.value = item.status;
          alert(`${molarisT('treatment.errUpdate')} ${err.message}`);
        }
      });
    }

    row.querySelector('.btn-delete-treatment-item')?.addEventListener('click', async () => {
      if (!confirm(molarisT('treatment.deleteConfirm'))) return;
      try {
        const res = await fetch(`/api/treatment-plan/${item.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) alert(`${molarisT('treatment.errDelete')} ${data.error || ''}`);
        await fetchTreatmentPlan();
      } catch (err) {
        alert(`${molarisT('treatment.errDelete')} ${err.message}`);
      }
    });

    container.appendChild(row);
  });
}

function initTreatmentPlanManager() {
  const addBtn = document.getElementById('btn-add-treatment-item');
  const modal = document.getElementById('modal-treatment-item');
  const closeBtn = document.getElementById('btn-close-modal-treatment');
  const cancelBtn = document.getElementById('btn-cancel-modal-treatment');
  const form = document.getElementById('treatment-item-form');
  if (!modal || !form) return;

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      form.reset();
      fillFdiToothSelect(document.getElementById('form-treatment-tooth'));
      modal.classList.remove('hidden');
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const toothVal = document.getElementById('form-treatment-tooth').value;
    const costVal = document.getElementById('form-treatment-cost').value.trim();
    // Typed the Tunisian way ("1 250,500"); the plan stores dinars (legacy field).
    const costMillimes = costVal !== '' ? Molaris.format.parseTnd(costVal) : undefined;
    if (costMillimes === null) {
      alert(molarisT('treatment.errCost'));
      return;
    }
    const payload = {
      toothId: toothVal ? Number(toothVal) : undefined,
      procedure: document.getElementById('form-treatment-procedure').value.trim(),
      cdtCode: document.getElementById('form-treatment-cdt').value.trim() || undefined,
      priority: document.getElementById('form-treatment-priority').value,
      estimatedCost: costMillimes !== undefined ? costMillimes / 1000 : undefined,
      notes: document.getElementById('form-treatment-notes').value.trim() || undefined
    };
    try {
      const res = await fetch('/api/treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        modal.classList.add('hidden');
        playClinicalBeep(880, 'sine', 0.15);
        await fetchTreatmentPlan();
      } else {
        alert(`${molarisT('treatment.errSave')} ${data.error || ''}`);
      }
    } catch (err) {
      alert(`${molarisT('treatment.errSave')} ${err.message}`);
    }
  });
}
