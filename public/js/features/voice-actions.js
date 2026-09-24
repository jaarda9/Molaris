// -----------------------------------------------------------------------------
// Voice-Command Action Dispatcher
// -----------------------------------------------------------------------------
function handleMolarisAutonomousAction(action) {
  if (!action || !action.executed) return;

  // Sound feedback: High-tech dual chime
  playClinicalBeep(880, 'sine', 0.08);
  setTimeout(() => playClinicalBeep(1320, 'sine', 0.12), 90);

  switch (action.actionType) {
    case 'START_TIMER':
      if (typeof window.startChairsideTimer === 'function') {
        const secs = (action.data && (action.data.seconds || action.data.durationSeconds)) ? (action.data.seconds || action.data.durationSeconds) : 20;
        window.startChairsideTimer(secs);
      }
      break;

    case 'SWITCH_PATIENT':
      if (action.data && action.data.patientId) {
        selectPatient(action.data.patientId);
      } else {
        fetchPatients().then(() => {
          fetchOdontogram();
          fetchSystemStatus();
          fetchActivePatientSafetyAlerts();
        });
      }
      break;

    case 'UPDATE_TOOTH':
      fetchOdontogram().then(() => {
        if (action.data && action.data.tooth) {
          systemState.selectedTooth = action.data.tooth;
          updateChatToothBanner(action.data.tooth);
        }
      });
      break;

    case 'LOG_ANESTHESIA':
      fetchPatients().then(() => {
        if (action.data && action.data.patient) {
          // Logged now: counted from the log by the calculator, so the "injected now" counter is back to 0.
          systemState.deliveredCarpules = 0;
          const calcDelivered = document.getElementById('calc-delivered-carpules');
          if (calcDelivered) calcDelivered.textContent = '0';
        }
        recalculateLA();
        if (action.data && action.data.safetyAlerts) {
          renderSafetyAlertsInto('safety-alerts-anesthesia', action.data.safetyAlerts);
        }
      });
      break;

    case 'CREATE_PATIENT':
      fetchPatients();
      break;

    case 'LAUNCH_APP':
      if (action.data && action.data.targetView) {
        const tabBtn = document.getElementById(`nav-tab-${action.data.targetView}`);
        if (tabBtn) tabBtn.click();
      }
      break;

    case 'EXPORT_DATABASE':
      const a = document.createElement('a');
      a.href = '/api/database/export';
      a.download = 'molaris-patients-database.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      break;

    case 'AUDIO_MUTE':
      systemState.voiceEnabled = false;
      const voiceIconOnM = document.getElementById('voice-icon-on');
      const voiceIconOffM = document.getElementById('voice-icon-off');
      if (voiceIconOnM) voiceIconOnM.classList.add('hidden');
      if (voiceIconOffM) voiceIconOffM.classList.remove('hidden');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      break;

    case 'AUDIO_UNMUTE':
      systemState.voiceEnabled = true;
      const voiceIconOnU = document.getElementById('voice-icon-on');
      const voiceIconOffU = document.getElementById('voice-icon-off');
      if (voiceIconOnU) voiceIconOnU.classList.remove('hidden');
      if (voiceIconOffU) voiceIconOffU.classList.add('hidden');
      break;

    default:
      console.log('Action handled:', action);
  }
}
