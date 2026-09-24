function getTranslatedToothStatus(status, isFr) {
  if (!isFr) return status;
  switch (status) {
    case 'sound': return 'Saine';
    case 'caries': return 'Carie';
    case 'restoration': return 'Obturation';
    case 'crown': return 'Couronne';
    case 'rct': return 'Endo';
    case 'implant': return 'Implant';
    case 'missing': return 'Absente';
    default: return status;
  }
}
// M.O.L.A.R.I.S — Senior Dental Advisor & Chairside Assistant Engine

let systemState = window.systemState = {
  language: localStorage.getItem('molaris_lang') || 'fr',
  activeTab: 'advisor',
  voiceEnabled: true,
  numberingSystem: 'fdi', // 'fdi' (used in Tunisia, and on the CNAM forms) | 'universal'
  selectedTooth: null,
  teethData: [],
  patients: [],
  anesthetics: [],
  selectedDrugId: 'lido_100k',
  deliveredCarpules: 0,
  preferences: null,
  activePatient: null,
  chatHistory: []
};
window.systemState = systemState;

// Global state for voice recognition & chairside audio reactive HUD
let isListening = false;

// Web Audio synthesizer for chairside timers and chimes
let audioCtx = null;
function playClinicalBeep(freq = 880, type = 'sine', duration = 0.2) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio feedback not available', e);
  }
}
