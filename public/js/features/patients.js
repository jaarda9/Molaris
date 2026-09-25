// -----------------------------------------------------------------------------
// Patient Manager & Local File Database Engine
// -----------------------------------------------------------------------------
async function fetchPatients() {
  try {
    const res = await fetch('/api/patients');
    const data = await res.json();
    systemState.patients = data.patients || [];
    if (data.activePatient) {
      systemState.activePatient = data.activePatient;
      updateActivePatientHeaderUI(data.activePatient);
    }
    renderPatientsGrid();
  } catch (err) {
    console.error('Failed to fetch patients:', err);
  }
}

function genderLabel(gender, isFr) {
  if (gender === 'Male') return isFr ? 'H' : 'M';
  if (gender === 'Female') return 'F';
  if (gender === 'Other') return isFr ? 'Autre' : 'Other';
  return gender || '';
}

function renderPatientsGrid(filterText = '') {
  const grid = document.getElementById('patients-grid');
  const countBadge = document.getElementById('patient-count-badge');
  if (!grid) return;
  if (!systemState.patients || !Array.isArray(systemState.patients)) return;

  // Accent-insensitive ("hedi" finds "Hédi"); phone and CNAM numbers match on their digits.
  const plain = (s) => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const q = plain(filterText).trim();
  const qDigits = filterText.replace(/\D/g, '');
  const filtered = systemState.patients.filter(p => {
    if (!q) return true;
    const text = [p.name, p.chartId, p.asaStatus, p.chiefComplaint, p.medicalAlerts, p.cnamId].map(plain).join(' | ');
    if (text.includes(q)) return true;
    return qDigits.length >= 4 && [p.phone, p.cnamId].some(v => String(v || '').replace(/\D/g, '').includes(qDigits));
  });

  if (countBadge) {
    const isFr = systemState.language === 'fr';
    countBadge.textContent = isFr
      ? `${filtered.length} sur ${systemState.patients.length} patients`
      : `${filtered.length} of ${systemState.patients.length} patients`;
  }

  if (filtered.length === 0) {
    const isFr = systemState.language === 'fr';
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
        <svg class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <p class="text-sm font-medium">${isFr ? `Aucun dossier ne correspond à "${escapeHtml(filterText)}"` : `No patient records match "${escapeHtml(filterText)}"`}</p>
        <button onclick="document.getElementById('btn-create-patient')?.click()" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer">
          ${isFr ? '+ Nouveau patient' : '+ Add New Patient Record'}
        </button>
      </div>
    `;
    return;
  }

  const isFr = systemState.language === 'fr';
  grid.innerHTML = '';
  filtered.forEach(patient => {
    const isActive = systemState.activePatient && systemState.activePatient.id === patient.id;
    const card = document.createElement('div');
    card.className = `rounded-2xl border p-5 transition flex flex-col justify-between space-y-4 ${
      isActive
        ? 'border-teal-500 dark:border-teal-400 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20 shadow-md'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
    }`;
    card.id = `patient-card-${patient.id}`;

    // Calculate metrics
    const teethWithFindings = (patient.odontogram || []).filter(t => t.status && t.status !== 'sound' && t.status !== 'unerupted').length;
    const totalCarpulesGiven = (patient.anesthesiaLog || []).reduce((sum, item) => sum + (Number(item.carpules) || 0), 0);
    const soapCount = (patient.soapNotes || []).length;

    // Initials
    const initials = patient.name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    card.innerHTML = `
      <div class="space-y-3">
        <!-- Top row: Avatar, Name, Active Badge -->
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl ${
              isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            } font-bold text-xs flex items-center justify-center shadow-xs">
              ${initials}
            </div>
            <div>
              <h3 class="font-bold text-sm text-slate-900 dark:text-white leading-snug">${escapeHtml(patient.name)}</h3>
              <div class="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>${escapeHtml(patient.chartId)}</span>
                <span>&bull;</span>
                <span>${patient.age || 35}${isFr ? ' ans' : 'y'} / ${escapeHtml(genderLabel(patient.gender, isFr))}</span>
              </div>
            </div>
          </div>

          ${
            isActive
              ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white tracking-wide shadow-xs">${isFr ? 'DOSSIER ACTIF' : 'ACTIVE CHART'}</span>`
              : ''
          }
        </div>

        <!-- Meta Pills: ASA, Cardiac, Weight -->
        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            ${escapeHtml(patient.asaStatus || 'ASA I')}
          </span>
          ${
            patient.cardiacRisk
              ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center space-x-1"><span>⚠️</span><span>${isFr ? 'ALERTE CARDIAQUE' : 'CARDIAC ALERT'}</span></span>`
              : ''
          }
          <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            ${patient.weightKg || 70} kg
          </span>
        </div>

        <!-- Chief Complaint -->
        <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
          <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">${isFr ? 'Motif de consultation' : 'Chief Complaint'}</div>
          <p class="italic line-clamp-2">${escapeHtml(patient.chiefComplaint || (isFr ? 'Bilan bucco-dentaire complet de routine' : 'Routine comprehensive evaluation'))}</p>
        </div>

        <!-- Medical Alerts / Allergies -->
        ${
          patient.medicalAlerts || patient.allergies
            ? `<div class="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                ${patient.medicalAlerts ? `<div class="truncate"><strong class="text-slate-700 dark:text-slate-300">${isFr ? 'Alertes :' : 'Alerts:'}</strong> ${escapeHtml(patient.medicalAlerts)}</div>` : ''}
                ${patient.allergies ? `<div class="truncate"><strong class="text-rose-600 dark:text-rose-400">${isFr ? 'Allergies :' : 'Allergies:'}</strong> ${escapeHtml(patient.allergies)}</div>` : ''}
              </div>`
            : ''
        }

        <!-- Operatory Metrics Grid -->
        <div class="grid grid-cols-3 gap-2 pt-1 text-center">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div class="text-xs font-bold text-slate-900 dark:text-white">${teethWithFindings}</div>
            <div class="text-[9px] text-slate-400">${isFr ? 'Dents notées' : 'Teeth Charted'}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div class="text-xs font-bold text-teal-600 dark:text-teal-400">${totalCarpulesGiven}</div>
            <div class="text-[9px] text-slate-400">${isFr ? 'Carpules AL' : 'Carpules LA'}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div class="text-xs font-bold text-cyan-600 dark:text-cyan-400">${soapCount}</div>
            <div class="text-[9px] text-slate-400">${isFr ? 'Notes SOAP' : 'SOAP Notes'}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <button class="btn-select-patient flex-1 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs ${
          isActive
            ? 'bg-teal-700 text-white'
            : 'bg-teal-600 hover:bg-teal-700 text-white'
        }" data-id="${patient.id}">
          ${isActive ? (isFr ? '✓ Dossier ouvert' : '✓ Chart open') : (isFr ? 'Ouvrir le dossier' : 'Open chart')}
        </button>

        <button class="btn-edit-patient p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer" data-id="${patient.id}" title="${isFr ? 'Modifier le dossier patient' : 'Edit Patient Chart'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>

        <button class="btn-delete-patient p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer" data-id="${patient.id}" data-name="${escapeHtml(patient.name)}" title="${isFr ? 'Supprimer le dossier' : 'Delete Patient Record'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Hook events
    card.querySelector('.btn-select-patient')?.addEventListener('click', () => {
      selectPatient(patient.id);
    });

    card.querySelector('.btn-edit-patient')?.addEventListener('click', () => {
      openEditPatientModal(patient);
    });

    card.querySelector('.btn-delete-patient')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmPrompt = isFr
        ? `Êtes-vous certain de vouloir supprimer le dossier du patient "${patient.name}" (${patient.chartId}) ?`
        : `Are you sure you want to delete patient record for "${patient.name}" (${patient.chartId})?`;
      if (!confirm(confirmPrompt)) return;
      try {
        const res = await fetch(`/api/patients/${patient.id}`, { method: 'DELETE' });
        const resData = await res.json();
        if (resData.success) {
          playClinicalBeep(520, 'sine', 0.1);
          await fetchPatients();
          await fetchOdontogram();
          await fetchSystemStatus();
        } else {
          // e.g. a chart with clinical history, which is kept.
          Molaris.ui.toast(resData.error || molarisT('common.saveError'), 'error');
        }
      } catch (err) {
        alert(molarisT('common.networkError') + ' ' + err.message);
      }
    });

    grid.appendChild(card);
  });
}

async function selectPatient(patientId) {
  try {
    const res = await fetch('/api/patients/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: patientId })
    });
    const data = await res.json();
    if (data.activePatient) {
      systemState.activePatient = data.activePatient;
      updateActivePatientHeaderUI(data.activePatient);
      renderPatientsGrid();
      await fetchOdontogram();
      await fetchActivePatientSafetyAlerts();
      await fetchTreatmentPlan();
      await fetchMedications();
      await fetchLabCases();
      await fetchPerioLatest();
      await fetchPerioHistory();

      // Update LA calculator
      const calcWeightInput = document.getElementById('calc-weight-input');
      const calcWeightSlider = document.getElementById('calc-weight-slider');
      if (calcWeightInput && calcWeightSlider) {
        calcWeightInput.value = data.activePatient.weightKg || 70;
        calcWeightSlider.value = data.activePatient.weightKg || 70;
      }
      const calcCardiac = document.getElementById('calc-cardiac-toggle');
      if (calcCardiac) calcCardiac.checked = !!data.activePatient.cardiacRisk;

      // New chart: the "injected now" counter starts at 0 (today's logged injections are counted by the server).
      systemState.deliveredCarpules = 0;
      const calcDelivered = document.getElementById('calc-delivered-carpules');
      if (calcDelivered) calcDelivered.textContent = '0';

      recalculateLA();
      playClinicalBeep(659.25, 'sine', 0.15);

      // The advisor conversation of the new chart is reloaded on 'patient-changed' (advisor-chat.js).
    }
  } catch (err) {
    console.error('Failed to select patient:', err);
  }
}

function openEditPatientModal(patient) {
  const modal = document.getElementById('modal-patient');
  const title = document.getElementById('modal-patient-title');
  if (!modal) return;

  const isFr = systemState.language === 'fr';
  title.textContent = isFr ? `Modifier le dossier : ${patient.name}` : `Edit Patient: ${patient.name}`;
  document.getElementById('form-patient-id').value = patient.id;
  document.getElementById('form-patient-name').value = patient.name;
  document.getElementById('form-patient-chart').value = patient.chartId;
  document.getElementById('form-patient-phone').value = patient.phone || '';
  document.getElementById('form-patient-cnam-id').value = patient.cnamId || '';
  document.getElementById('form-patient-cnam-quality').value = patient.cnamQuality || '';
  document.getElementById('form-patient-birthdate').value = patient.birthDate || '';
  document.getElementById('form-patient-age').value = patient.age || 35;
  syncAgeFromBirthDate();
  document.getElementById('form-patient-gender').value = patient.gender || 'Male';
  document.getElementById('form-patient-weight').value = patient.weightKg || 70;
  document.getElementById('form-patient-asa').value = patient.asaStatus || 'ASA I';
  document.getElementById('form-patient-cardiac').checked = !!patient.cardiacRisk;
  document.getElementById('form-patient-complaint').value = patient.chiefComplaint || '';
  document.getElementById('form-patient-alerts').value = patient.medicalAlerts || '';
  document.getElementById('form-patient-allergies').value = patient.allergies || '';

  modal.classList.remove('hidden');
}

/** With a birth date the age is computed (and the age box is read-only). */
function syncAgeFromBirthDate() {
  const birth = document.getElementById('form-patient-birthdate');
  const ageInput = document.getElementById('form-patient-age');
  if (!birth || !ageInput) return;
  const value = birth.value;
  ageInput.readOnly = !!value;
  ageInput.classList.toggle('opacity-60', !!value);
  if (!value) return;
  const [y, m, d] = value.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  if (age >= 0 && age <= 120) ageInput.value = age;
}

let pendingPatientCreated = null;

function initPatientManager() {
  document.getElementById('form-patient-birthdate')?.addEventListener('input', syncAgeFromBirthDate);
  const birthInput = document.getElementById('form-patient-birthdate');
  if (birthInput) birthInput.max = new Date().toISOString().slice(0, 10);
  const searchInput = document.getElementById('patient-search-input');
  const createBtn = document.getElementById('btn-create-patient');
  const modal = document.getElementById('modal-patient');
  const modalTitle = document.getElementById('modal-patient-title');
  const closeBtn = document.getElementById('btn-close-modal-patient');
  const cancelBtn = document.getElementById('btn-cancel-modal-patient');
  const form = document.getElementById('patient-form');
  const importInput = document.getElementById('input-import-db');

  // Header switcher buttons
  const patientSelectorBtn = document.getElementById('patient-selector-btn');
  const openModalBtn = document.getElementById('btn-open-patient-modal');

  if (patientSelectorBtn) {
    patientSelectorBtn.addEventListener('click', () => {
      document.getElementById('nav-tab-patients')?.click();
    });
  }

  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
      document.getElementById('nav-tab-patients')?.click();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderPatientsGrid(e.target.value);
    });
  }

  // Empty form for a new chart; other screens prefill it (agenda: the caller's name and phone)
  // and are told which chart was created (null if the form is closed).
  window.openNewPatientModal = (prefill = {}, onDone = null) => {
    if (pendingPatientCreated) pendingPatientCreated(null);
    pendingPatientCreated = onDone;
    const isFr = systemState.language === 'fr';
    modalTitle.textContent = isFr ? 'Nouveau patient' : 'Add New Dental Patient';
    form.reset();
    document.getElementById('form-patient-id').value = '';
    document.getElementById('form-patient-weight').value = 70;
    document.getElementById('form-patient-age').value = 35;
    document.getElementById('form-patient-name').value = prefill.name || '';
    document.getElementById('form-patient-phone').value = prefill.phone || '';
    document.getElementById('form-patient-complaint').value = prefill.chiefComplaint || '';
    syncAgeFromBirthDate();
    modal.classList.remove('hidden');
  };
  if (createBtn) createBtn.addEventListener('click', () => window.openNewPatientModal());

  const closePatientModal = () => {
    modal.classList.add('hidden');
    if (pendingPatientCreated) pendingPatientCreated(null);
    pendingPatientCreated = null;
  };
  if (closeBtn) closeBtn.addEventListener('click', closePatientModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePatientModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patientId = document.getElementById('form-patient-id').value;
      const payload = {
        name: document.getElementById('form-patient-name').value.trim(),
        chartId: document.getElementById('form-patient-chart').value.trim() || undefined,
        // Empty strings (not undefined) so clearing a field on edit actually clears it.
        phone: document.getElementById('form-patient-phone').value.trim(),
        cnamId: document.getElementById('form-patient-cnam-id').value.trim(),
        cnamQuality: document.getElementById('form-patient-cnam-quality').value,
        birthDate: document.getElementById('form-patient-birthdate').value || undefined,
        age: Number(document.getElementById('form-patient-age').value) || 35,
        gender: document.getElementById('form-patient-gender').value,
        weightKg: Number(document.getElementById('form-patient-weight').value) || 70,
        asaStatus: document.getElementById('form-patient-asa').value,
        cardiacRisk: document.getElementById('form-patient-cardiac').checked,
        chiefComplaint: document.getElementById('form-patient-complaint').value.trim(),
        medicalAlerts: document.getElementById('form-patient-alerts').value.trim(),
        allergies: document.getElementById('form-patient-allergies').value.trim(),
      };

      try {
        let res;
        if (patientId) {
          res = await fetch(`/api/patients/${patientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        const data = await res.json();
        if (data.patient) {
          modal.classList.add('hidden');
          playClinicalBeep(880, 'sine', 0.15);
          await fetchPatients();
          await selectPatient(data.patient.id);
          const onCreated = patientId ? null : pendingPatientCreated;
          pendingPatientCreated = null;
          if (onCreated) onCreated(data.patient);
        } else {
          alert(molarisT('common.saveError') + ' ' + (data.error || ''));
        }
      } catch (err) {
        alert(molarisT('common.networkError') + ' ' + err.message);
      }
    });
  }

  // Database file import
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target.result);
          const res = await fetch('/api/database/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
          });
          const result = await res.json();
          if (result.success) {
            playClinicalBeep(880, 'sine', 0.3);
            alert(molarisT('patients.importDone')
              .replace('{imported}', result.imported ?? 0)
              .replace('{skipped}', result.skipped ?? 0)
              .replace('{invalid}', result.invalid ?? 0));
            await fetchPatients();
            await fetchOdontogram();
            await fetchSystemStatus();
          } else {
            alert(molarisT('patients.importFailed') + ' ' + (result.error || ''));
          }
        } catch (err) {
          alert(molarisT('patients.importFailed') + ' ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }
}
