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

  if (nameEl) nameEl.textContent = patient.name;
  if (idEl) idEl.textContent = patient.chartId;
  if (asaEl) asaEl.textContent = patient.asaStatus || 'ASA I';
  if (weightEl) weightEl.textContent = `${patient.weightKg} kg`;

  if (cardiacBadge) {
    cardiacBadge.textContent = isFr ? 'Risque Cardiaque (Épi Max 0,04mg)' : 'Cardiac Risk';
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
