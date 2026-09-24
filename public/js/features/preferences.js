// -----------------------------------------------------------------------------
// Doctor Preferences & Clinical Practice Memory
// -----------------------------------------------------------------------------
function initPreferencesForm() {
  const form = document.getElementById('preferences-form');
  if (!form) return;

  // Load existing preferences into form
  fetch('/api/memory')
    .then(r => r.json())
    .then(data => {
      const prefs = data.preferences;
      if (!prefs) return;
      document.getElementById('pref-doctor-name').value = prefs.doctorName || '';
      document.getElementById('pref-clinic-name').value = prefs.clinicName || '';
      document.getElementById('pref-bonding-system').value = prefs.bondingSystem || '';
      document.getElementById('pref-composite-system').value = prefs.compositeSystem || '';
      document.getElementById('pref-rotary-system').value = prefs.rotarySystem || '';
      document.getElementById('pref-implant-system').value = prefs.implantSystem || '';
      document.getElementById('pref-notes').value = prefs.notes || '';

      // Update sidebar
      updateSidebarPreferences(prefs);
    })
    .catch(console.warn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      doctorName: document.getElementById('pref-doctor-name').value,
      clinicName: document.getElementById('pref-clinic-name').value,
      bondingSystem: document.getElementById('pref-bonding-system').value,
      compositeSystem: document.getElementById('pref-composite-system').value,
      rotarySystem: document.getElementById('pref-rotary-system').value,
      implantSystem: document.getElementById('pref-implant-system').value,
      notes: document.getElementById('pref-notes').value
    };

    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updated })
      });
      const data = await res.json();
      if (data.success) {
        updateSidebarPreferences(updated);
        playClinicalBeep(880, 'sine', 0.2);
        alert(molarisT('prefs.saved'));
        document.getElementById('nav-tab-advisor')?.click();
      }
    } catch (err) {
      alert(molarisT('common.networkError') + ' ' + err.message);
    }
  });
}

function updateSidebarPreferences(prefs) {
  if (prefs.doctorName) {
    document.getElementById('side-doc-name').textContent = prefs.doctorName;
  }
  if (prefs.bondingSystem) {
    document.getElementById('side-pref-bonding').textContent = prefs.bondingSystem.slice(0, 22) + '...';
  }
  if (prefs.rotarySystem) {
    document.getElementById('side-pref-rotary').textContent = prefs.rotarySystem.slice(0, 22);
  }
  if (prefs.implantSystem) {
    document.getElementById('side-pref-implant').textContent = prefs.implantSystem.slice(0, 22);
  }
}
