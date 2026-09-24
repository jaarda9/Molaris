// -----------------------------------------------------------------------------
// Bilingual Language Switcher (EN | FR)
// -----------------------------------------------------------------------------
function initLanguageSwitcher() {
  const btnEn = document.getElementById('lang-btn-en');
  const btnFr = document.getElementById('lang-btn-fr');

  function updateLanguageButtonUI(lang) {
    if (!btnEn || !btnFr) return;
    if (lang === 'fr') {
      btnFr.className = 'px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs transition cursor-pointer font-bold';
      btnEn.className = 'px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer font-normal';
    } else {
      btnEn.className = 'px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs transition cursor-pointer font-bold';
      btnFr.className = 'px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer font-normal';
    }
  }

  window.setMolarisLanguage = function(lang) {
    systemState.language = lang;
    localStorage.setItem('molaris_lang', lang);
    updateLanguageButtonUI(lang);

    if (typeof window.applyMolarisLanguage === 'function') {
      window.applyMolarisLanguage(lang);
    }
    Molaris.events.emit('language-changed', { language: lang });

    if (window.molarisRecognition) {
      window.molarisRecognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    }

    // Refresh dynamically rendered subviews
    if (systemState.activePatient) {
      updateActivePatientHeaderUI(systemState.activePatient);
    }
    renderPatientsGrid();
    renderOdontogram();
    if (systemState.selectedTooth) {
      selectTooth(systemState.selectedTooth);
    }
    recalculateLA();
    if (typeof window.refreshProtocolsView === 'function') {
      window.refreshProtocolsView();
    }
    renderTreatmentPlanList();
    renderMedicationsList();
    renderPerioGrid();
    renderPerioHistory();
    renderLabCasesList();
    // Server-built texts (safety alerts, anesthesia drug list) are fetched in the new language.
    fetchActivePatientSafetyAlerts();
    if (Array.isArray(systemState.anesthetics)) renderAnestheticDrugOptions(systemState.anesthetics);
    playClinicalBeep(lang === 'fr' ? 660 : 880, 'sine', 0.1);
  };

  if (btnEn) {
    btnEn.addEventListener('click', () => window.setMolarisLanguage('en'));
  }
  if (btnFr) {
    btnFr.addEventListener('click', () => window.setMolarisLanguage('fr'));
  }

  // Initial apply
  updateLanguageButtonUI(systemState.language);
  if (typeof window.applyMolarisLanguage === 'function') {
    window.applyMolarisLanguage(systemState.language);
  }
}
