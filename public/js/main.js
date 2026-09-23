// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initLanguageSwitcher();
  initNavigation();
  initChairsideTimer();
  initSpeechSynthesis();
  initSpeechRecognition();
  initQuickPrompts();
  initAnesthesiaCalculator();
  initVisionUploader();
  initSOAPGenerator();
  initPreferencesForm();
  initPatientManager();
  initTreatmentPlanManager();
  initMedicationManager();
  initPerioChartManager();
  initLabCaseManager();

  await fetchPatients();
  await fetchSystemStatus();
  await fetchOdontogram();
  await fetchAnestheticsAndProtocols();
  await fetchActivePatientSafetyAlerts();
  await fetchTreatmentPlan();
  await fetchMedications();
  await fetchLabCases();
  await fetchPerioLatest();
  await fetchPerioHistory();
});
