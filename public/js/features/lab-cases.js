// -----------------------------------------------------------------------------
// Lab Cases Engine (crown & bridge / denture / appliance workflow with a lab)
// -----------------------------------------------------------------------------
function getLabStatusLabel(status, isFr) {
  switch (status) {
    case 'planned': return isFr ? 'Planifié' : 'Planned';
    case 'sent': return isFr ? 'Envoyé' : 'Sent';
    case 'in_lab': return isFr ? 'Au laboratoire' : 'In Lab';
    case 'returned': return isFr ? 'Retourné' : 'Returned';
    case 'seated': return isFr ? 'Posé' : 'Seated';
    case 'remake': return isFr ? 'À refaire' : 'Remake';
    default: return status;
  }
}

async function fetchLabCases() {
  try {
    const res = await fetch('/api/lab-cases');
    const data = await res.json();
    systemState.labCases = data.cases || [];
    renderLabCasesList();
  } catch (err) {
    console.error('Failed to fetch lab cases:', err);
  }
}

function renderLabCasesList() {
  const container = document.getElementById('lab-cases-list');
  if (!container) return;
  const cases = systemState.labCases || [];
  const isFr = systemState.language === 'fr';

  if (cases.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">${isFr ? 'Aucun cas de laboratoire enregistré pour ce patient.' : 'No lab cases on file for this patient.'}</div>`;
    return;
  }

  const statusOrder = { planned: 0, sent: 1, in_lab: 2, returned: 3, seated: 4, remake: 5 };
  const sorted = [...cases].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  container.innerHTML = '';
  sorted.forEach(lc => {
    const now = new Date();
    let dueBadge = '';
    if (lc.dueDate && lc.status !== 'seated') {
      const due = new Date(lc.dueDate);
      const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        dueBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">${isFr ? 'EN RETARD' : 'OVERDUE'}</span>`;
      } else if (diffDays <= 2) {
        dueBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">${isFr ? 'ÉCHÉANCE PROCHE' : 'DUE SOON'}</span>`;
      }
    }

    const row = document.createElement('div');
    row.className = 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3';
    row.innerHTML = `
      <div class="flex-1 min-w-[220px] space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          ${lc.toothId ? `<span class="font-mono font-bold text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">${escapeHtml(String(fdiForToothId(lc.toothId)))}</span>` : ''}
          <span class="font-semibold text-sm text-slate-900 dark:text-white">${escapeHtml(lc.caseType)}</span>
          ${lc.material ? `<span class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(lc.material)}${lc.shade ? ' • ' + escapeHtml(lc.shade) : ''}</span>` : ''}
          <span class="px-2 py-0.5 rounded border text-[10px] font-semibold labstatus-${lc.status}">${getLabStatusLabel(lc.status, isFr)}</span>
          ${dueBadge}
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3">
          ${lc.labName ? `<span>${isFr ? 'Labo :' : 'Lab:'} ${escapeHtml(lc.labName)}</span>` : ''}
          ${lc.dueDate ? `<span>${isFr ? 'Échéance :' : 'Due:'} ${new Date(lc.dueDate).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}</span>` : ''}
        </div>
        ${lc.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 italic">${escapeHtml(lc.notes)}</p>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <select class="labcase-status-select text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5">
          <option value="planned">${getLabStatusLabel('planned', isFr)}</option>
          <option value="sent">${getLabStatusLabel('sent', isFr)}</option>
          <option value="in_lab">${getLabStatusLabel('in_lab', isFr)}</option>
          <option value="returned">${getLabStatusLabel('returned', isFr)}</option>
          <option value="seated">${getLabStatusLabel('seated', isFr)}</option>
          <option value="remake">${getLabStatusLabel('remake', isFr)}</option>
        </select>
        <button class="btn-delete-labcase p-2 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" title="${isFr ? 'Supprimer' : 'Delete'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    const statusSelect = row.querySelector('.labcase-status-select');
    if (statusSelect) {
      statusSelect.value = lc.status;
      statusSelect.addEventListener('change', async (e) => {
        try {
          const res = await fetch(`/api/lab-cases/${lc.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: e.target.value })
          });
          const data = await res.json();
          if (data.success) {
            playClinicalBeep(700, 'sine', 0.1);
            await fetchLabCases();
          }
        } catch (err) {
          alert(molarisT('common.networkError') + ' ' + err.message);
        }
      });
    }

    row.querySelector('.btn-delete-labcase')?.addEventListener('click', async () => {
      const isFr2 = systemState.language === 'fr';
      if (!confirm(isFr2 ? 'Supprimer ce cas de laboratoire ?' : 'Delete this lab case?')) return;
      try {
        await fetch(`/api/lab-cases/${lc.id}`, { method: 'DELETE' });
        await fetchLabCases();
      } catch (err) {
        alert(molarisT('common.networkError') + ' ' + err.message);
      }
    });

    container.appendChild(row);
  });
}

function initLabCaseManager() {
  const addBtn = document.getElementById('btn-add-lab-case');
  const modal = document.getElementById('modal-lab-case');
  const closeBtn = document.getElementById('btn-close-modal-labcase');
  const cancelBtn = document.getElementById('btn-cancel-modal-labcase');
  const form = document.getElementById('lab-case-form');
  if (!modal || !form) return;

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      form.reset();
      fillFdiToothSelect(document.getElementById('form-labcase-tooth'));
      modal.classList.remove('hidden');
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const toothVal = document.getElementById('form-labcase-tooth').value;
    const payload = {
      toothId: toothVal ? Number(toothVal) : undefined,
      caseType: document.getElementById('form-labcase-type').value.trim(),
      material: document.getElementById('form-labcase-material').value.trim() || undefined,
      shade: document.getElementById('form-labcase-shade').value.trim() || undefined,
      marginDesign: document.getElementById('form-labcase-margin').value.trim() || undefined,
      occlusalNotes: document.getElementById('form-labcase-occlusal').value.trim() || undefined,
      labName: document.getElementById('form-labcase-labname').value.trim() || undefined,
      dueDate: document.getElementById('form-labcase-duedate').value || undefined,
      notes: document.getElementById('form-labcase-notes').value.trim() || undefined
    };
    try {
      const res = await fetch('/api/lab-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        modal.classList.add('hidden');
        playClinicalBeep(880, 'sine', 0.15);
        await fetchLabCases();
      } else {
        alert(molarisT('common.saveError') + ' ' + (data.error || ''));
      }
    } catch (err) {
      alert(molarisT('common.networkError') + ' ' + err.message);
    }
  });
}
