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

  // 'YYYY-MM-DD' shown as 24/09/2026 (parsed as a local day, not UTC midnight).
  const labDay = (iso) => escapeHtml(`${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`);

  container.innerHTML = '';
  sorted.forEach(lc => {
    const now = new Date();
    let dueBadge = '';
    // Late only while the work is still expected back from the lab.
    if (lc.dueDate && ['planned', 'sent', 'in_lab', 'remake'].includes(lc.status)) {
      // Whole clinic-local days between today and the due day ('YYYY-MM-DD' read as a local date).
      const [y, m, d] = lc.dueDate.split('-').map(Number);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.round((new Date(y, m - 1, d) - today) / (1000 * 60 * 60 * 24));
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
          ${lc.dueDate ? `<span>${isFr ? 'Échéance :' : 'Due:'} ${labDay(lc.dueDate)}</span>` : ''}
          ${lc.sentDate ? `<span>${isFr ? 'Envoyé le' : 'Sent'} ${labDay(lc.sentDate)}</span>` : ''}
          ${lc.returnedDate ? `<span>${isFr ? 'Reçu le' : 'Back'} ${labDay(lc.returnedDate)}</span>` : ''}
          ${lc.seatedDate ? `<span>${isFr ? 'Posé le' : 'Fitted'} ${labDay(lc.seatedDate)}</span>` : ''}
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
        <button class="btn-edit-labcase p-2 rounded-lg bg-slate-100 hover:bg-teal-100 dark:bg-slate-800 dark:hover:bg-teal-950/60 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300" title="${escapeHtml(molarisT('labcases.edit'))}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
        </button>
        <button class="btn-delete-labcase ${lc.status === 'planned' ? '' : 'hidden'} p-2 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" title="${isFr ? 'Supprimer' : 'Delete'}">
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
          } else {
            alert(molarisT('common.saveError') + ' ' + (data.error || ''));
          }
          await fetchLabCases();
        } catch (err) {
          alert(molarisT('common.networkError') + ' ' + err.message);
        }
      });
    }

    row.querySelector('.btn-edit-labcase')?.addEventListener('click', () => openLabCaseForm(lc));

    row.querySelector('.btn-delete-labcase')?.addEventListener('click', async () => {
      const isFr2 = systemState.language === 'fr';
      if (!confirm(isFr2 ? 'Supprimer ce cas de laboratoire ?' : 'Delete this lab case?')) return;
      try {
        const res = await fetch(`/api/lab-cases/${lc.id}`, { method: 'DELETE' });
        if (!res.ok) alert((await res.json()).error || molarisT('common.saveError'));
        await fetchLabCases();
      } catch (err) {
        alert(molarisT('common.networkError') + ' ' + err.message);
      }
    });

    container.appendChild(row);
  });
}

// The add form doubles as the edit form (the lab moves the due date, a shade is corrected…).
let editingLabCase = null;
const LAB_FORM_FIELDS = [
  ['form-labcase-type', 'caseType'], ['form-labcase-material', 'material'], ['form-labcase-shade', 'shade'],
  ['form-labcase-margin', 'marginDesign'], ['form-labcase-occlusal', 'occlusalNotes'], ['form-labcase-labname', 'labName'],
  ['form-labcase-duedate', 'dueDate'], ['form-labcase-notes', 'notes']
];

function openLabCaseForm(lc = null) {
  const form = document.getElementById('lab-case-form');
  const modal = document.getElementById('modal-lab-case');
  editingLabCase = lc;
  form.reset();
  fillFdiToothSelect(document.getElementById('form-labcase-tooth'));
  const title = modal.querySelector('[data-i18n="labcases.modalTitle"]');
  if (title) title.textContent = molarisT(lc ? 'labcases.editTitle' : 'labcases.modalTitle');
  if (lc) {
    document.getElementById('form-labcase-tooth').value = lc.toothId ? String(lc.toothId) : '';
    LAB_FORM_FIELDS.forEach(([id, key]) => { document.getElementById(id).value = lc[key] || ''; });
  }
  modal.classList.remove('hidden');
}

function initLabCaseManager() {
  const addBtn = document.getElementById('btn-add-lab-case');
  const modal = document.getElementById('modal-lab-case');
  const closeBtn = document.getElementById('btn-close-modal-labcase');
  const cancelBtn = document.getElementById('btn-cancel-modal-labcase');
  const form = document.getElementById('lab-case-form');
  if (!modal || !form) return;

  if (addBtn) addBtn.addEventListener('click', () => openLabCaseForm());
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
    // On edit, an emptied field is sent as null so it is really cleared.
    if (editingLabCase) {
      for (const key of ['toothId', ...LAB_FORM_FIELDS.map(([, k]) => k).filter(k => k !== 'caseType')]) if (payload[key] === undefined) payload[key] = null;
    }
    try {
      const res = await fetch(editingLabCase ? `/api/lab-cases/${encodeURIComponent(editingLabCase.id)}` : '/api/lab-cases', {
        method: editingLabCase ? 'PUT' : 'POST',
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
