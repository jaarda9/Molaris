// -----------------------------------------------------------------------------
// Medications Engine (feeds drug-interaction & allergy safety checks)
// -----------------------------------------------------------------------------
async function fetchMedications() {
  try {
    const res = await fetch('/api/medications');
    const data = await res.json();
    systemState.medications = data.medications || [];
    renderMedicationsList();
  } catch (err) {
    console.error('Failed to fetch medications:', err);
  }
}

function renderMedicationsList() {
  const container = document.getElementById('medications-list');
  if (!container) return;
  const meds = systemState.medications || [];
  const isFr = systemState.language === 'fr';

  if (meds.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">${isFr ? 'Aucun médicament enregistré pour ce patient.' : 'No medications on file for this patient.'}</div>`;
    return;
  }

  container.innerHTML = '';
  meds.forEach(med => {
    const row = document.createElement('div');
    row.className = 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3';
    row.innerHTML = `
      <div class="flex-1 min-w-[200px] space-y-0.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold text-sm text-slate-900 dark:text-white">${escapeHtml(med.name)}</span>
          ${med.dosage ? `<span class="text-xs font-mono text-slate-500 dark:text-slate-400">${escapeHtml(med.dosage)}</span>` : ''}
          ${med.frequency ? `<span class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(med.frequency)}</span>` : ''}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${med.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
            ${med.active ? (isFr ? 'Actif' : 'Active') : (isFr ? 'Inactif' : 'Inactive')}
          </span>
        </div>
        ${med.prescribedFor ? `<p class="text-xs text-slate-500 dark:text-slate-400 italic">${isFr ? 'Prescrit pour :' : 'Prescribed for:'} ${escapeHtml(med.prescribedFor)}</p>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-toggle-med px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
          ${med.active ? (isFr ? 'Désactiver' : 'Deactivate') : (isFr ? 'Activer' : 'Activate')}
        </button>
        <button class="btn-delete-med p-2 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" title="${isFr ? 'Supprimer' : 'Delete'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    row.querySelector('.btn-toggle-med')?.addEventListener('click', async () => {
      try {
        const res = await fetch(`/api/medications/${med.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !med.active })
        });
        const data = await res.json();
        if (data.success) {
          await fetchMedications();
        }
      } catch (err) {
        alert('Failed to update medication: ' + err.message);
      }
    });

    row.querySelector('.btn-delete-med')?.addEventListener('click', async () => {
      const isFr2 = systemState.language === 'fr';
      if (!confirm(isFr2 ? 'Supprimer ce médicament ?' : 'Delete this medication?')) return;
      try {
        await fetch(`/api/medications/${med.id}`, { method: 'DELETE' });
        await fetchMedications();
      } catch (err) {
        alert('Failed to delete medication: ' + err.message);
      }
    });

    container.appendChild(row);
  });
}

function initMedicationManager() {
  const addBtn = document.getElementById('btn-add-medication');
  const modal = document.getElementById('modal-medication');
  const closeBtn = document.getElementById('btn-close-modal-medication');
  const cancelBtn = document.getElementById('btn-cancel-modal-medication');
  const form = document.getElementById('medication-form');
  if (!modal || !form) return;

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      form.reset();
      modal.classList.remove('hidden');
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('form-med-name').value.trim(),
      dosage: document.getElementById('form-med-dosage').value.trim(),
      frequency: document.getElementById('form-med-frequency').value.trim(),
      prescribedFor: document.getElementById('form-med-prescribedfor').value.trim() || undefined,
      language: systemState.language || 'en'
    };
    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        modal.classList.add('hidden');
        playClinicalBeep(880, 'sine', 0.15);
        await fetchMedications();
        // Critical: surface any returned drug-interaction / allergy safety alerts prominently
        renderSafetyAlertsInto('medication-safety-alerts', data.safetyAlerts);
        await fetchActivePatientSafetyAlerts();
        if (data.safetyAlerts && data.safetyAlerts.length > 0) {
          playClinicalBeep(300, 'sawtooth', 0.25);
        }
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error saving medication: ' + err.message);
    }
  });
}
