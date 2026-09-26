// -----------------------------------------------------------------------------
// System Status & Memory Loading
// -----------------------------------------------------------------------------
async function fetchSystemStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.doctorName) {
      document.getElementById('side-doc-name').textContent = data.doctorName;
    }
    if (data.activePatient) {
      systemState.activePatient = data.activePatient;
      updateActivePatientHeaderUI(data.activePatient);
      
      const calcWeightInput = document.getElementById('calc-weight-input');
      const calcWeightSlider = document.getElementById('calc-weight-slider');
      if (calcWeightInput && calcWeightSlider) {
        calcWeightInput.value = data.activePatient.weightKg;
        calcWeightSlider.value = data.activePatient.weightKg;
      }
      const calcCardiacToggle = document.getElementById('calc-cardiac-toggle');
      if (calcCardiacToggle) {
        calcCardiacToggle.checked = !!data.activePatient.cardiacRisk;
      }
    }
  } catch (err) {
    console.warn('Status fetch warning:', err);
  }
}

function updateActivePatientHeaderUI(patient) {
  if (!patient) return;
  const isFr = systemState.language === 'fr';
  const nameEl = document.getElementById('header-patient-name');
  const idEl = document.getElementById('header-patient-id');
  const asaEl = document.getElementById('header-patient-asa');
  const cardiacBadge = document.getElementById('header-cardiac-badge');
  const weightEl = document.getElementById('header-patient-weight');

  const initialsEl = document.getElementById('header-patient-initials');

  if (nameEl) nameEl.textContent = patient.name;
  if (idEl) idEl.textContent = patient.chartId;
  if (asaEl) asaEl.textContent = patient.asaStatus || 'ASA I';
  if (initialsEl) {
    initialsEl.textContent = String(patient.name || '').split(/\s+/).filter(Boolean)
      .map(part => part[0]).slice(0, 2).join('').toUpperCase() || '—';
  }
  // Age matters at a glance (children, elderly patients); weight drives the anesthesia doses.
  if (weightEl) weightEl.textContent = `${patient.age} ${isFr ? 'ans' : 'y'} · ${isFr ? String(patient.weightKg).replace('.', ',') : patient.weightKg} kg`;

  if (cardiacBadge) {
    cardiacBadge.textContent = isFr ? 'Risque cardiaque' : 'Cardiac risk';
    if (patient.cardiacRisk) cardiacBadge.classList.remove('hidden');
    else cardiacBadge.classList.add('hidden');
  }

  // Every path that loads the active patient passes through here, so this is
  // the one place that announces a switch to other features.
  if (patient.id !== updateActivePatientHeaderUI.lastPatientId) {
    updateActivePatientHeaderUI.lastPatientId = patient.id;
    Molaris.events.emit('patient-changed', { patient });
  }
}
