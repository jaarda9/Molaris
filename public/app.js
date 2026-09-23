
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
  language: localStorage.getItem('molaris_lang') || 'en',
  activeTab: 'advisor',
  voiceEnabled: true,
  numberingSystem: 'universal', // 'universal' | 'fdi'
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
}

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

// -----------------------------------------------------------------------------
// Navigation Tabs
// -----------------------------------------------------------------------------
function initNavigation() {
  const tabs = [
    { id: 'nav-tab-advisor', view: 'view-advisor' },
    { id: 'nav-tab-patients', view: 'view-patients' },
    { id: 'nav-tab-odontogram', view: 'view-odontogram' },
    { id: 'nav-tab-anesthesia', view: 'view-anesthesia' },
    { id: 'nav-tab-vision', view: 'view-vision' },
    { id: 'nav-tab-protocols', view: 'view-protocols' },
    { id: 'nav-tab-soap', view: 'view-soap' },
    { id: 'nav-tab-preferences', view: 'view-preferences' },
    { id: 'nav-tab-treatment', view: 'view-treatment' },
    { id: 'nav-tab-medications', view: 'view-medications' },
    { id: 'nav-tab-perio', view: 'view-perio' },
    { id: 'nav-tab-labcases', view: 'view-labcases' },
  ];

  tabs.forEach(t => {
    const btn = document.getElementById(t.id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      // Update buttons
      tabs.forEach(other => {
        const b = document.getElementById(other.id);
        const v = document.getElementById(other.view);
        if (b) {
          b.classList.remove('bg-teal-600', 'text-white', 'active');
          b.classList.add('text-slate-600', 'dark:text-slate-300');
        }
        if (v) v.classList.add('hidden');
      });

      btn.classList.add('bg-teal-600', 'text-white', 'active');
      btn.classList.remove('text-slate-600', 'dark:text-slate-300');
      const targetView = document.getElementById(t.view);
      if (targetView) targetView.classList.remove('hidden');
      systemState.activeTab = t.view;

      if (t.view === 'view-treatment') fetchTreatmentPlan();
      if (t.view === 'view-medications') fetchMedications();
      if (t.view === 'view-perio') { fetchPerioLatest(); fetchPerioHistory(); }
      if (t.view === 'view-labcases') fetchLabCases();
    });
  });

  const jumpProtocols = document.getElementById('jump-to-protocols-btn');
  if (jumpProtocols) {
    jumpProtocols.addEventListener('click', () => {
      document.getElementById('nav-tab-protocols')?.click();
    });
  }

  const openPrefs = document.getElementById('open-preferences-btn');
  if (openPrefs) {
    openPrefs.addEventListener('click', () => {
      document.getElementById('nav-tab-preferences')?.click();
    });
  }
}

// -----------------------------------------------------------------------------
// Theme Management (Operatory Light / Dark)
// -----------------------------------------------------------------------------
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const isDark = localStorage.getItem('molaris_theme') === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const willBeDark = !document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark', willBeDark);
      localStorage.setItem('molaris_theme', willBeDark ? 'dark' : 'light');
    });
  }
}

// -----------------------------------------------------------------------------
// Chairside Timer Widget (Etch 15s, Cure 20s, Custom)
// -----------------------------------------------------------------------------
let timerInterval = null;
let timerSecondsRemaining = 0;

function initChairsideTimer() {
  const display = document.getElementById('timer-display');
  const btn15 = document.getElementById('timer-btn-15');
  const btn20 = document.getElementById('timer-btn-20');
  const btnStop = document.getElementById('timer-btn-stop');

  function updateTimerText() {
    const mins = Math.floor(timerSecondsRemaining / 60);
    const secs = timerSecondsRemaining % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function startTimer(seconds) {
    clearInterval(timerInterval);
    timerSecondsRemaining = seconds;
    updateTimerText();
    btnStop.classList.remove('hidden');
    playClinicalBeep(520, 'sine', 0.1);

    timerInterval = setInterval(() => {
      timerSecondsRemaining--;
      updateTimerText();
      if (timerSecondsRemaining <= 0) {
        clearInterval(timerInterval);
        btnStop.classList.add('hidden');
        // Finish chime
        playClinicalBeep(880, 'sine', 0.4);
        setTimeout(() => playClinicalBeep(1046.5, 'sine', 0.4), 200);
      }
    }, 1000);
  }

  window.startChairsideTimer = startTimer;

  if (btn15) btn15.addEventListener('click', () => startTimer(15));
  if (btn20) btn20.addEventListener('click', () => startTimer(20));
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      clearInterval(timerInterval);
      timerSecondsRemaining = 0;
      updateTimerText();
      btnStop.classList.add('hidden');
    });
  }
}

// -----------------------------------------------------------------------------
// Speech Synthesis (Senior Advisor Voice)
// -----------------------------------------------------------------------------
function initSpeechSynthesis() {
  const voiceBtn = document.getElementById('voice-synthesis-btn');
  const iconOn = document.getElementById('voice-icon-on');
  const iconOff = document.getElementById('voice-icon-off');

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      systemState.voiceEnabled = !systemState.voiceEnabled;
      if (systemState.voiceEnabled) {
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
        speakAdvisorText("M.O.L.A.R.I.S voice output enabled, Doctor.");
      } else {
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
        window.speechSynthesis.cancel();
      }
    });
  }
}

function speakAdvisorText(text) {
  if (!systemState.voiceEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  
  // Clean markdown syntax for clean speech
  const clean = text
    .replace(/[#*_`~]/g, '')
    .replace(/\b([A-Z]{2,})\b/g, '$1')
    .slice(0, 450); // read first concise paragraph chairside

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.05;
  utterance.pitch = 0.95; // professional, composed tone
  
  const isFr = systemState.language === 'fr';
  utterance.lang = isFr ? 'fr-FR' : 'en-US';

  const voices = window.speechSynthesis.getVoices();
  const prefix = isFr ? 'fr' : 'en';
  const naturalVoice = voices.find(v => v.lang.startsWith(prefix) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Thomas') || v.name.includes('Audrey') || v.name.includes('Alex')));
  const fallbackVoice = voices.find(v => v.lang.startsWith(prefix));
  if (naturalVoice) utterance.voice = naturalVoice;
  else if (fallbackVoice) utterance.voice = fallbackVoice;

  window.speechSynthesis.speak(utterance);
}

// -----------------------------------------------------------------------------
// Hands-free Voice Dictation (Web Speech Recognition)
// -----------------------------------------------------------------------------
function initSpeechRecognition() {
  const micBtn = document.getElementById('mic-btn');
  const micStatus = document.getElementById('mic-status-label');
  const chatInput = document.getElementById('chat-input');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (micBtn) {
      micBtn.title = "Speech recognition not supported on this browser";
      micBtn.classList.add('opacity-50');
    }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = systemState.language === 'fr' ? 'fr-FR' : 'en-US';
  window.molarisRecognition = recognition;

  isListening = false;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add('recording-pulse', 'text-rose-600');
    micStatus.classList.remove('hidden');
    playClinicalBeep(660, 'sine', 0.15);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    playClinicalBeep(880, 'sine', 0.1);
    // Automatically submit query
    document.getElementById('chat-form').dispatchEvent(new Event('submit'));
  };

  recognition.onerror = (e) => {
    console.warn('Speech recognition error:', e);
    isListening = false;
    micBtn.classList.remove('recording-pulse', 'text-rose-600');
    micStatus.classList.add('hidden');
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove('recording-pulse', 'text-rose-600');
    micStatus.classList.add('hidden');
  };

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  }
}

// -----------------------------------------------------------------------------
// Senior Dental Advisor Chat Flow
// -----------------------------------------------------------------------------
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

if (chatForm) {
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;

    // Append User Message
    appendMessage('doctor', query);
    chatInput.value = '';

    // Typing placeholder
    const typingId = appendTypingIndicator();

    try {
      const payload = {
        message: query,
        toothId: systemState.selectedTooth ? systemState.selectedTooth.id : undefined,
        conversationHistory: systemState.chatHistory,
        language: systemState.language || 'en'
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      removeMessage(typingId);

      if (data.error) {
        const isFr = systemState.language === 'fr';
        appendMessage('molaris', `${isFr ? '⚠️ Alerte Conseiller Clinique :' : '⚠️ Clinical Advisor Alert:'} ${data.error}`);
      } else {
        appendMessage('molaris', data.reply, data.action);
        systemState.chatHistory.push({ role: 'user', content: query });
        systemState.chatHistory.push({ role: 'model', content: data.reply });
        speakAdvisorText(data.reply);
        renderSafetyAlertsInto('chat-safety-alerts', data.safetyAlerts);
        renderSafetyAlertsInto('safety-alerts-sidebar', data.safetyAlerts, { parentCardId: 'safety-alerts-card' });

        // Execute autonomous client actions triggered by the voice-command action engine
        if (data.action && data.action.executed) {
          handleMolarisAutonomousAction(data.action);
        }
      }
    } catch (err) {
      removeMessage(typingId);
      appendMessage('molaris', `⚠️ Communication failure with clinical engine. ${err.message}`);
    }
  });
}

function appendMessage(sender, text, action = null) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'flex items-start space-x-3';
  const id = 'msg-' + Date.now();
  msgDiv.id = id;

  if (sender === 'doctor') {
    msgDiv.innerHTML = `
      <div class="flex-1 flex justify-end">
        <div class="bg-teal-600 text-white rounded-2xl rounded-tr-sm p-3.5 text-sm max-w-[80%] shadow-sm leading-relaxed">
          <div class="text-[10px] font-semibold text-teal-200 uppercase tracking-wider mb-1">Attending Doctor</div>
          <div>${escapeHtml(text)}</div>
        </div>
      </div>
      <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
        Dr
      </div>
    `;
  } else {
    const actionBadge = (action && action.executed) ? `
      <div class="mb-2 p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center space-x-2">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span class="font-bold">⚡ AUTONOMOUS ACTION [${escapeHtml(action.actionType)}]:</span>
        <span class="text-cyan-100">${escapeHtml(action.summary)}</span>
      </div>
    ` : '';

    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
        M
      </div>
      <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 text-sm max-w-[85%] border border-slate-200 dark:border-slate-700 space-y-2 leading-relaxed text-slate-800 dark:text-slate-100">
        <div class="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-1.5">
          <span class="font-bold text-teal-700 dark:text-teal-400">M.O.L.A.R.I.S SENIOR ADVISOR</span>
          <button onclick="navigator.clipboard.writeText(this.closest('.space-y-2').innerText)" class="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Copy</button>
        </div>
        ${actionBadge}
        <div class="markdown-content">${formatMarkdown(text)}</div>
      </div>
    `;
  }

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function appendTypingIndicator() {
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex items-start space-x-3';
  div.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
      M
    </div>
    <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
      <span class="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
      <span>${systemState.language === 'fr' ? 'Revue des données cliniques et du dossier patient...' : 'Reviewing clinical evidence and patient history...'}</span>
    </div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function formatMarkdown(text) {
  return escapeHtml(text)
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-teal-700 dark:text-teal-300 text-sm mt-2">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-slate-900 dark:text-white text-base mt-3">$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
    .replace(/^\s*[-*]\s+(.*$)/gim, '<div class="flex items-start gap-1.5 ml-1"><span class="text-teal-600">&bull;</span><span>$1</span></div>')
    .replace(/\n\n/g, '<div class="h-2"></div>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initQuickPrompts() {
  const buttons = document.querySelectorAll('.quick-prompt-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.innerText.replace(/^[⚡🔍🦷⚠️💊]\s*/, '').trim();
      chatInput.value = text;
      document.getElementById('chat-form').dispatchEvent(new Event('submit'));
    });
  });

  const clearBtn = document.getElementById('clear-chat-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      systemState.chatHistory = [];
      const isFr = systemState.language === 'fr';
      chatMessages.innerHTML = `
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">M</div>
          <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-xs text-slate-600 dark:text-slate-300">
            ${isFr ? 'Fil de discussion effacé. M.O.L.A.R.I.S est à votre disposition pour la prochaine consultation au fauteuil.' : 'Feed cleared. M.O.L.A.R.I.S is ready for your next chairside consultation.'}
          </div>
        </div>
      `;
    });
  }
}

// -----------------------------------------------------------------------------
// Interactive 32-Tooth Odontogram Engine
// -----------------------------------------------------------------------------
async function fetchOdontogram() {
  try {
    const res = await fetch('/api/odontogram');
    systemState.teethData = await res.json();
    renderOdontogram();
  } catch (err) {
    console.error('Failed to load odontogram:', err);
  }
}

function renderOdontogram() {
  const maxGrid = document.getElementById('maxillary-teeth-grid');
  const manGrid = document.getElementById('mandibular-teeth-grid');
  if (!maxGrid || !manGrid) return;
  if (!systemState.teethData || !Array.isArray(systemState.teethData)) return;

  maxGrid.innerHTML = '';
  manGrid.innerHTML = '';

  // Maxillary teeth: 1 to 16
  const maxillaryTeeth = systemState.teethData.filter(t => t.arch === 'maxillary');
  maxillaryTeeth.forEach(tooth => {
    maxGrid.appendChild(createToothCard(tooth));
  });

  // Mandibular teeth: 32 down to 17 (standard dental arch view)
  const mandibularTeeth = systemState.teethData.filter(t => t.arch === 'mandibular');
  // Order: 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17
  const orderedMandibular = [...mandibularTeeth].sort((a, b) => b.id - a.id);
  orderedMandibular.forEach(tooth => {
    manGrid.appendChild(createToothCard(tooth));
  });
}

function createToothCard(tooth) {
  const card = document.createElement('div');
  const isSelected = systemState.selectedTooth && systemState.selectedTooth.id === tooth.id;
  card.className = `tooth-card cursor-pointer p-2 rounded-xl border text-center relative flex flex-col items-center justify-between min-h-[78px] status-${tooth.status} ${isSelected ? 'selected' : ''}`;
  card.id = `tooth-card-${tooth.id}`;

  const toothLabel = systemState.numberingSystem === 'universal' ? `#${tooth.id}` : `FDI ${tooth.fdi}`;

  card.innerHTML = `
    <span class="text-[10px] font-mono font-bold">${toothLabel}</span>
    <div class="my-1">
      <svg class="w-6 h-6 mx-auto opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        ${getToothSvgPath(tooth.type)}
      </svg>
    </div>
    <span class="text-[9px] uppercase tracking-wider font-semibold opacity-70 truncate w-full">${getTranslatedToothStatus(tooth.status, systemState.language === 'fr')}</span>
  `;

  card.addEventListener('click', () => {
    selectTooth(tooth);
  });

  return card;
}

function getToothSvgPath(type) {
  switch (type) {
    case 'molar':
      return '<path d="M5 4C3.5 4 2 6 2 9C2 13 3 17 5 21C6 22 7 22 8 20C9 18 9 17 12 17C15 17 15 18 16 20C17 22 18 22 19 21C21 17 22 13 22 9C22 6 20.5 4 19 4C17 4 16 5 12 5C8 5 7 4 5 4Z"/>';
    case 'premolar':
      return '<path d="M6 4C4.5 4 3 6 3 9C3 13 4 17 6 21C7 22 8 22 9 20C10 18 10 17 12 17C14 17 14 18 15 20C16 22 17 22 18 21C20 17 21 13 21 9C21 6 19.5 4 18 4C16 4 15 5 12 5C9 5 8 4 6 4Z"/>';
    case 'canine':
      return '<path d="M7 4C5 4 4 7 4 10C4 15 6 19 8 21C9 22 10 22 11 20C11.5 19 12 17 12 17C12 17 12.5 19 13 20C14 22 15 22 16 21C18 19 20 15 20 10C20 7 19 4 17 4C14 4 13 6 12 6C11 6 10 4 7 4Z"/>';
    default: // incisor
      return '<path d="M7 3C5.5 3 5 5 5 8C5 13 7 18 9 21C10 22 11 22 11.5 20C12 18 12 17 12 17C12 17 12 18 12.5 20C13 22 14 22 15 21C17 18 19 13 19 8C19 5 18.5 3 17 3C15 3 14 4 12 4C10 4 9 3 7 3Z"/>';
  }
}

function selectTooth(tooth) {
  systemState.selectedTooth = tooth;
  renderOdontogram(); // re-render to show selected ring

  const detailCard = document.getElementById('tooth-detail-card');
  const numberEl = document.getElementById('detail-tooth-number');
  const nameEl = document.getElementById('detail-tooth-name');
  const fdiEl = document.getElementById('detail-tooth-fdi');
  const notesEl = document.getElementById('detail-tooth-notes');

  detailCard.classList.remove('hidden');
  const isFr = systemState.language === 'fr';
  const frTooth = window.MOLARIS_FRENCH_TEETH && window.MOLARIS_FRENCH_TEETH[tooth.id];
  const toothName = isFr && frTooth ? frTooth.name : tooth.name;
  const archText = isFr ? (tooth.arch === 'maxillary' ? 'MAXILLAIRE' : 'MANDIBULAIRE') : tooth.arch.toUpperCase();
  const typeText = isFr && frTooth ? frTooth.type.toUpperCase() : tooth.type.toUpperCase();

  numberEl.textContent = `#${tooth.id}`;
  nameEl.textContent = toothName;
  fdiEl.textContent = isFr
    ? `Notation FDI : ${tooth.fdi} • Arcade : ${archText} • Type : ${typeText}`
    : `FDI Notation: ${tooth.fdi} • Arch: ${tooth.arch.toUpperCase()} • Type: ${tooth.type.toUpperCase()}`;
  notesEl.value = tooth.notes || '';

  // Initialize tooth surfaces checkboxes from persisted data
  const surfaces = tooth.surfaces || {};
  ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'].forEach(s => {
    const cb = document.getElementById(`surface-${s}`);
    if (cb) cb.checked = !!surfaces[s];
  });

  // Highlight active status button
  document.querySelectorAll('.status-choice-btn').forEach(btn => {
    if (btn.dataset.status === tooth.status) {
      btn.className = 'status-choice-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white border-teal-600';
    } else {
      btn.className = 'status-choice-btn px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300';
    }
  });

  // Also update chat banner
  updateChatToothBanner(tooth);
}

function updateChatToothBanner(tooth) {
  const banner = document.getElementById('chat-tooth-context-banner');
  const nameSpan = document.getElementById('chat-target-tooth-name');
  const statusSpan = document.getElementById('chat-target-tooth-status');
  if (!banner) return;

  if (tooth) {
    banner.classList.remove('hidden');
    const isFr = systemState.language === 'fr';
    const frTooth = window.MOLARIS_FRENCH_TEETH && window.MOLARIS_FRENCH_TEETH[tooth.id];
    const toothName = isFr && frTooth ? frTooth.name : tooth.name;
    const statusName = getTranslatedToothStatus(tooth.status, isFr);
    nameSpan.textContent = isFr ? `Dent #${tooth.id} (${toothName})` : `Tooth #${tooth.id} (${tooth.name})`;
    statusSpan.textContent = `[${statusName.toUpperCase()}]`;
  } else {
    banner.classList.add('hidden');
  }
}

// Tooth detail drawer handlers
document.querySelectorAll('.status-choice-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!systemState.selectedTooth) return;
    const newStatus = btn.dataset.status;
    systemState.selectedTooth.status = newStatus;

    try {
      await fetch('/api/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothId: systemState.selectedTooth.id,
          status: newStatus
        })
      });
      selectTooth(systemState.selectedTooth);
    } catch (e) {
      console.error(e);
    }
  });
});

function collectToothSurfaces() {
  const surfaces = {};
  ['mesial', 'distal', 'occlusal', 'buccal', 'lingual'].forEach(s => {
    const cb = document.getElementById(`surface-${s}`);
    if (cb) surfaces[s] = cb.checked;
  });
  return surfaces;
}

const saveNoteBtn = document.getElementById('save-tooth-note-btn');
if (saveNoteBtn) {
  saveNoteBtn.addEventListener('click', async () => {
    if (!systemState.selectedTooth) return;
    const notes = document.getElementById('detail-tooth-notes').value;
    const surfaces = collectToothSurfaces();
    systemState.selectedTooth.notes = notes;
    systemState.selectedTooth.surfaces = surfaces;

    try {
      await fetch('/api/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothId: systemState.selectedTooth.id,
          notes,
          surfaces
        })
      });
      playClinicalBeep(700, 'sine', 0.1);
    } catch (e) {
      console.error(e);
    }
  });
}

// Immediate-save on any surface checkbox toggle (mirrors the status-choice-btn pattern)
['mesial', 'distal', 'occlusal', 'buccal', 'lingual'].forEach(s => {
  const cb = document.getElementById(`surface-${s}`);
  if (!cb) return;
  cb.addEventListener('change', async () => {
    if (!systemState.selectedTooth) return;
    const surfaces = collectToothSurfaces();
    systemState.selectedTooth.surfaces = surfaces;
    try {
      await fetch('/api/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothId: systemState.selectedTooth.id,
          surfaces
        })
      });
    } catch (e) {
      console.error(e);
    }
  });
});

const consultToothAdvisorBtn = document.getElementById('consult-tooth-advisor-btn');
if (consultToothAdvisorBtn) {
  consultToothAdvisorBtn.addEventListener('click', () => {
    if (!systemState.selectedTooth) return;
    // Switch to advisor tab
    document.getElementById('nav-tab-advisor')?.click();
    chatInput.value = `Doctor consultation regarding Tooth #${systemState.selectedTooth.id} (${systemState.selectedTooth.name}) with current status [${systemState.selectedTooth.status}]. What is the best evidence-based treatment plan?`;
    chatInput.focus();
  });
}

const removeToothContextBtn = document.getElementById('remove-tooth-context-btn');
if (removeToothContextBtn) {
  removeToothContextBtn.addEventListener('click', () => {
    systemState.selectedTooth = null;
    updateChatToothBanner(null);
    renderOdontogram();
  });
}

// Numbering toggle buttons
const btnNumUniversal = document.getElementById('btn-numbering-universal');
const btnNumFdi = document.getElementById('btn-numbering-fdi');
if (btnNumUniversal && btnNumFdi) {
  btnNumUniversal.addEventListener('click', () => {
    systemState.numberingSystem = 'universal';
    btnNumUniversal.className = 'px-2.5 py-1 rounded-md font-semibold bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm';
    btnNumFdi.className = 'px-2.5 py-1 rounded-md font-medium text-slate-600 dark:text-slate-400';
    renderOdontogram();
  });
  btnNumFdi.addEventListener('click', () => {
    systemState.numberingSystem = 'fdi';
    btnNumFdi.className = 'px-2.5 py-1 rounded-md font-semibold bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm';
    btnNumUniversal.className = 'px-2.5 py-1 rounded-md font-medium text-slate-600 dark:text-slate-400';
    renderOdontogram();
  });
}

const resetOdontogramBtn = document.getElementById('reset-odontogram-btn');
if (resetOdontogramBtn) {
  resetOdontogramBtn.addEventListener('click', async () => {
    if (!confirm("Reset all 32 teeth to pristine sound condition?")) return;
    await fetch('/api/odontogram/reset', { method: 'POST' });
    await fetchOdontogram();
    systemState.selectedTooth = null;
    document.getElementById('tooth-detail-card')?.classList.add('hidden');
    updateChatToothBanner(null);
  });
}

// -----------------------------------------------------------------------------
// Local Anesthetic Calculator Engine
// -----------------------------------------------------------------------------
async function fetchAnestheticsAndProtocols() {
  try {
    const res = await fetch('/api/anesthetics');
    const data = await res.json();
    systemState.anesthetics = data.anesthetics;
    renderAnestheticDrugOptions(data.anesthetics);
    renderProtocolsList(data.protocols);
    recalculateLA();
  } catch (err) {
    console.error(err);
  }
}

function renderAnestheticDrugOptions(drugs) {
  const container = document.getElementById('anesthetic-drug-options');
  if (!container) return;
  container.innerHTML = '';

  drugs.forEach((drug, index) => {
    const isSelected = drug.id === systemState.selectedDrugId;
    const card = document.createElement('div');
    card.className = `cursor-pointer p-3 rounded-xl border text-xs transition ${
      isSelected
        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:border-teal-500'
        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
    }`;
    card.id = `drug-card-${drug.id}`;

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <span class="font-bold text-slate-900 dark:text-white">${drug.name}</span>
        <span class="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-semibold">${drug.mgPerCartridge}mg</span>
      </div>
      <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        ${drug.vasoconstrictor} &bull; Max: ${drug.maxDoseMgKg} mg/kg
      </div>
    `;

    card.addEventListener('click', () => {
      systemState.selectedDrugId = drug.id;
      renderAnestheticDrugOptions(drugs);
      recalculateLA();
    });

    container.appendChild(card);
  });
}

function initAnesthesiaCalculator() {
  const weightInput = document.getElementById('calc-weight-input');
  const weightSlider = document.getElementById('calc-weight-slider');
  const cardiacToggle = document.getElementById('calc-cardiac-toggle');
  const minusBtn = document.getElementById('btn-carpule-minus');
  const plusBtn = document.getElementById('btn-carpule-plus');

  if (weightInput && weightSlider) {
    weightInput.addEventListener('input', () => {
      weightSlider.value = weightInput.value;
      recalculateLA();
    });
    weightSlider.addEventListener('input', () => {
      weightInput.value = weightSlider.value;
      recalculateLA();
    });
  }

  if (cardiacToggle) {
    cardiacToggle.addEventListener('change', () => {
      recalculateLA();
    });
  }

  if (minusBtn && plusBtn) {
    minusBtn.addEventListener('click', () => {
      if (systemState.deliveredCarpules > 0) {
        systemState.deliveredCarpules = Math.round((systemState.deliveredCarpules - 0.5) * 10) / 10;
        document.getElementById('calc-delivered-carpules').textContent = systemState.deliveredCarpules;
        recalculateLA();
      }
    });
    plusBtn.addEventListener('click', () => {
      systemState.deliveredCarpules = Math.round((systemState.deliveredCarpules + 0.5) * 10) / 10;
      document.getElementById('calc-delivered-carpules').textContent = systemState.deliveredCarpules;
      recalculateLA();
    });
  }
}

async function recalculateLA() {
  const weight = Number(document.getElementById('calc-weight-input')?.value) || 70;
  const isCardiac = !!document.getElementById('calc-cardiac-toggle')?.checked;

  try {
    const res = await fetch('/api/calc-la', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drugId: systemState.selectedDrugId,
        weightKg: weight,
        isCardiacRisk: isCardiac,
        carpulesGiven: systemState.deliveredCarpules,
        language: systemState.language || 'en'
      })
    });

    const data = await res.json();
    const isFr = systemState.language === 'fr';
    document.getElementById('calc-limiting-factor').textContent = `${isFr ? 'Facteur Limitant :' : 'Limiting Factor:'} ${data.limitingFactor}`;
    document.getElementById('calc-res-max-carpules').textContent = `${data.safeMaxCarpules} carpules`;
    document.getElementById('calc-res-max-mg').textContent = `${data.allowedMaxMg} mg`;
    document.getElementById('calc-res-remaining').textContent = `${data.remainingCarpules}`;

    const warningBanner = document.getElementById('calc-warning-banner');
    const warningText = document.getElementById('calc-warning-text');
    if (data.warning) {
      warningBanner.classList.remove('hidden');
      warningText.textContent = data.warning;
    } else {
      warningBanner.classList.add('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

// -----------------------------------------------------------------------------
// Procedural Protocols Playbooks Engine
// -----------------------------------------------------------------------------
let molarisCachedProtocols = [];
window.refreshProtocolsView = function() {
  if (molarisCachedProtocols && molarisCachedProtocols.length > 0) {
    renderProtocolsList(molarisCachedProtocols);
  }
};

function renderProtocolsList(protocols) {
  if (protocols && protocols.length > 0) {
    molarisCachedProtocols = protocols;
  }
  const container = document.getElementById('protocols-list-container');
  if (!container) return;
  container.innerHTML = '';

  const isFr = systemState.language === 'fr';
  const listToRender = (isFr && window.MOLARIS_FRENCH_PROTOCOLS) ? window.MOLARIS_FRENCH_PROTOCOLS : (protocols || molarisCachedProtocols);

  listToRender.forEach(protocol => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3';
    card.id = `protocol-card-${protocol.id}`;

    const stepsHtml = protocol.steps.map(s => `
      <li class="flex items-start gap-2">
        <span class="text-teal-600 dark:text-teal-400 font-bold">&check;</span>
        <span>${escapeHtml(s)}</span>
      </li>
    `).join('');

    card.innerHTML = `
      <div class="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
        <div>
          <h4 class="font-bold text-slate-900 dark:text-white text-sm">${protocol.title}</h4>
          <span class="text-[10px] font-mono text-teal-700 dark:text-teal-400 uppercase font-semibold">${protocol.category}</span>
        </div>
        <button class="ask-protocol-btn text-xs font-semibold px-2 py-1 rounded bg-teal-600 text-white hover:bg-teal-700" data-title="${protocol.title}">
          ${isFr ? 'Consulter le Conseiller' : 'Ask Advisor'}
        </button>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 italic">${protocol.summary}</p>
      <ul class="text-xs space-y-1 text-slate-700 dark:text-slate-300">
        ${stepsHtml}
      </ul>
    `;

    container.appendChild(card);
  });

  document.querySelectorAll('.ask-protocol-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title;
      document.getElementById('nav-tab-advisor')?.click();
      const isFr = systemState.language === 'fr';
      chatInput.value = isFr
        ? `Conseil clinique du senior demandé pour le protocole : "${title}". Quels sont vos meilleurs conseils opératoires, astuces et écueils à éviter ?`
        : `Senior guidance requested on protocol: "${title}". What are your top chairside pearls, troubleshooting tips, and common pitfalls?`;
      chatInput.focus();
    });
  });
}

// -----------------------------------------------------------------------------
// Radiograph & Vision Diagnostic Engine
// -----------------------------------------------------------------------------
let currentImageFile = null;

function initVisionUploader() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const removeBtn = document.getElementById('remove-image-btn');
  const runVisionBtn = document.getElementById('run-vision-btn');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-teal-500');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-teal-500');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-teal-500');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    currentImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      previewContainer.classList.remove('hidden');
      dropZone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      currentImageFile = null;
      fileInput.value = '';
      previewContainer.classList.add('hidden');
      dropZone.classList.remove('hidden');
    });
  }

  // Sample Case Loaders
  document.querySelectorAll('.sample-case-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const caseType = btn.dataset.case;
      loadSampleDentalImage(caseType);
    });
  });

  if (runVisionBtn) {
    runVisionBtn.addEventListener('click', async () => {
      if (!currentImageFile) {
        alert("Please upload or select a dental image/radiograph first.");
        return;
      }

      const outputArea = document.getElementById('vision-output-area');
      const statusChip = document.getElementById('vision-status-chip');
      const copyBtn = document.getElementById('copy-vision-btn');
      const query = document.getElementById('vision-query-input')?.value || 'Clinical diagnostic analysis';

      outputArea.innerHTML = `
        <div class="flex items-center justify-center py-16 space-x-3 text-teal-600">
          <span class="w-3 h-3 rounded-full bg-teal-500 animate-ping"></span>
          <span class="font-semibold text-sm">Senior diagnostic specialist analyzing radiograph with Gemini Vision...</span>
        </div>
      `;

      try {
        const formData = new FormData();
        formData.append('image', currentImageFile);
        formData.append('query', query);
        formData.append('language', systemState.language || 'en');
        if (systemState.selectedTooth) {
          formData.append('toothId', systemState.selectedTooth.id);
        }

        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (data.error) {
          outputArea.innerHTML = `<div class="p-4 bg-rose-50 text-rose-700 rounded-xl">⚠️ Diagnostic analysis error: ${data.error}</div>`;
        } else {
          outputArea.innerHTML = `<div class="markdown-content">${formatMarkdown(data.analysis || '')}</div>`;
          statusChip?.classList.remove('hidden');
          copyBtn?.classList.remove('hidden');
          playClinicalBeep(880, 'sine', 0.2);
        }
      } catch (err) {
        outputArea.innerHTML = `<div class="p-4 bg-rose-50 text-rose-700 rounded-xl">⚠️ Failed to connect to vision engine: ${err.message}</div>`;
      }
    });
  }

  const copyVisionBtn = document.getElementById('copy-vision-btn');
  if (copyVisionBtn) {
    copyVisionBtn.addEventListener('click', () => {
      const text = document.getElementById('vision-output-area')?.innerText;
      if (text) {
        navigator.clipboard.writeText(text);
        copyVisionBtn.textContent = 'Copied!';
        setTimeout(() => copyVisionBtn.textContent = 'Copy Assessment', 2000);
      }
    });
  }
}

// Generate realistic dental radiograph canvas for instant prototype testing
function loadSampleDentalImage(caseType) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  // Dark x-ray background with radiographic noise
  ctx.fillStyle = '#0f171e';
  ctx.fillRect(0, 0, 600, 400);

  // Alveolar bone trabecular pattern
  ctx.fillStyle = '#1c2833';
  ctx.fillRect(0, 180, 600, 220);

  // Draw molar tooth outline (Tooth #30)
  ctx.fillStyle = '#d5dbdb';
  ctx.strokeStyle = '#f4f6f7';
  ctx.lineWidth = 3;

  // Crown
  ctx.beginPath();
  ctx.roundRect(180, 80, 240, 120, [30, 30, 5, 5]);
  ctx.fill();
  ctx.stroke();

  // Roots (Mesial & Distal)
  ctx.beginPath();
  // Mesial root
  ctx.moveTo(190, 200);
  ctx.lineTo(220, 340);
  ctx.lineTo(260, 340);
  ctx.lineTo(270, 200);
  // Distal root
  ctx.moveTo(330, 200);
  ctx.lineTo(340, 335);
  ctx.lineTo(380, 335);
  ctx.lineTo(410, 200);
  ctx.fill();

  // Pulp chamber & canals (Radiolucent dark)
  ctx.fillStyle = '#0f171e';
  ctx.beginPath();
  ctx.roundRect(230, 130, 140, 50, [10]);
  // canals
  ctx.rect(235, 180, 15, 140);
  ctx.rect(350, 180, 15, 135);
  ctx.fill();

  if (caseType === 'periapical') {
    // Deep caries invading pulp
    ctx.fillStyle = '#05080b';
    ctx.beginPath();
    ctx.arc(330, 110, 35, 0, Math.PI * 2);
    ctx.fill();

    // Periapical radiolucency around mesial apex
    ctx.fillStyle = '#0a0e14';
    ctx.beginPath();
    ctx.arc(240, 350, 30, 0, Math.PI * 2);
    ctx.fill();

    // Text watermark
    ctx.fillStyle = '#566573';
    ctx.font = '14px monospace';
    ctx.fillText('SAMPLE DIGITAL PERIAPICAL: TOOTH #30 (CARIES & APICAL LESION)', 20, 30);
  } else {
    // Bitewing interproximal caries
    ctx.fillStyle = '#05080b';
    ctx.beginPath();
    ctx.arc(415, 120, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#566573';
    ctx.font = '14px monospace';
    ctx.fillText('SAMPLE DIGITAL BITEWING: #14-#15 INTERPROXIMAL DEMINERALIZATION', 20, 30);
  }

  canvas.toBlob((blob) => {
    const file = new File([blob], `${caseType}-radiograph.png`, { type: 'image/png' });
    currentImageFile = file;
    const imagePreview = document.getElementById('image-preview');
    imagePreview.src = canvas.toDataURL();
    document.getElementById('preview-container').classList.remove('hidden');
    document.getElementById('drop-zone').classList.add('hidden');
  });
}

// -----------------------------------------------------------------------------
// SOAP Progress Note & CDT Coding Generator
// -----------------------------------------------------------------------------
function initSOAPGenerator() {
  const btn = document.getElementById('generate-soap-btn');
  const copyBtn = document.getElementById('copy-soap-btn');

  if (btn) {
    btn.addEventListener('click', async () => {
      const proc = document.getElementById('soap-input-proc')?.value;
      const toothId = document.getElementById('soap-input-tooth')?.value;
      const anesthesia = document.getElementById('soap-input-anesthesia')?.value;
      const materials = document.getElementById('soap-input-materials')?.value;
      const details = document.getElementById('soap-input-outcome')?.value;

      const output = document.getElementById('soap-output-area');
      output.textContent = 'Generating comprehensive medicolegal SOAP progress note and CDT codes with senior guidance...';

      try {
        const res = await fetch('/api/generate-soap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            procedure: proc,
            toothId: toothId,
            anesthesiaUsed: anesthesia,
            materialsUsed: materials,
            details: details,
            language: systemState.language || 'en'
          })
        });

        const data = await res.json();
        if (data.error) {
          output.textContent = `Error: ${data.error}`;
        } else {
          output.textContent = data.soapNote;
          playClinicalBeep(880, 'sine', 0.15);
        }
      } catch (err) {
        output.textContent = `Error connecting to documentation engine: ${err.message}`;
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = document.getElementById('soap-output-area')?.textContent;
      if (text) {
        navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied to Chart!';
        setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
      }
    });
  }
}

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
        alert("Clinical preferences updated. M.O.L.A.R.I.S will now advise according to these practice standards.");
        document.getElementById('nav-tab-advisor')?.click();
      }
    } catch (err) {
      alert("Failed to save preferences: " + err.message);
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
          systemState.deliveredCarpules = action.data.patient.deliveredCarpules;
          const calcDelivered = document.getElementById('calc-delivered-carpules');
          if (calcDelivered) calcDelivered.textContent = action.data.patient.deliveredCarpules;
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

function renderPatientsGrid(filterText = '') {
  const grid = document.getElementById('patients-grid');
  const countBadge = document.getElementById('patient-count-badge');
  if (!grid) return;
  if (!systemState.patients || !Array.isArray(systemState.patients)) return;

  const q = filterText.toLowerCase().trim();
  const filtered = systemState.patients.filter(p => {
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.chartId && p.chartId.toLowerCase().includes(q)) ||
      (p.asaStatus && p.asaStatus.toLowerCase().includes(q)) ||
      (p.chiefComplaint && p.chiefComplaint.toLowerCase().includes(q)) ||
      (p.medicalAlerts && p.medicalAlerts.toLowerCase().includes(q))
    );
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
          ${isFr ? '+ Ajouter un Nouveau Dossier Patient' : '+ Add New Patient Record'}
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
    const teethWithFindings = (patient.odontogram || []).filter(t => t.status && t.status !== 'sound').length;
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
                <span>${patient.age || 35}${isFr ? ' ans' : 'y'} / ${patient.gender || 'M'}</span>
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
              : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${isFr ? 'Épi Standard' : 'Standard Epi'}</span>`
          }
          <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            ${patient.weightKg || 70} kg
          </span>
        </div>

        <!-- Chief Complaint -->
        <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
          <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">${isFr ? 'Motif de Consultation' : 'Chief Complaint'}</div>
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
        <div class="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div class="text-xs font-bold text-slate-900 dark:text-white">${teethWithFindings}</div>
            <div class="text-[9px] text-slate-400">${isFr ? 'Dents Chartées' : 'Teeth Charted'}</div>
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
          ${isActive ? (isFr ? '✓ Dossier Actif au Fauteuil' : '✓ Active Operatory Patient') : (isFr ? 'Sélectionner &amp; Soigner' : 'Select Patient &amp; Treat')}
        </button>

        <button class="btn-edit-patient p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer" data-id="${patient.id}" title="${isFr ? 'Modifier le Dossier Patient' : 'Edit Patient Chart'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>

        <button class="btn-delete-patient p-2 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer" data-id="${patient.id}" data-name="${escapeHtml(patient.name)}" title="${isFr ? 'Supprimer le Dossier' : 'Delete Patient Record'}">
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
        }
      } catch (err) {
        alert('Failed to delete patient: ' + err.message);
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

      // Reset delivered carpules to match patient's log
      const totalCarpules = (data.activePatient.anesthesiaLog || []).reduce((sum, item) => sum + (Number(item.carpules) || 0), 0);
      systemState.deliveredCarpules = totalCarpules;
      const calcDelivered = document.getElementById('calc-delivered-carpules');
      if (calcDelivered) calcDelivered.textContent = totalCarpules;

      recalculateLA();
      playClinicalBeep(659.25, 'sine', 0.15);

      // Add feedback notification in chat
      const isFr = systemState.language === 'fr';
      const notificationMsg = isFr
        ? `Contexte opératoire basculé sur le patient **${data.activePatient.name}** (${data.activePatient.chartId}). Chargement de l'odontogramme 32 dents, alertes médicales et référence ASA ${data.activePatient.asaStatus}.`
        : `Operatory context switched to patient **${data.activePatient.name}** (${data.activePatient.chartId}). Loaded 32-tooth odontogram, medical alerts, and ASA ${data.activePatient.asaStatus} baseline.`;
      appendMessage('molaris', notificationMsg);
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
  title.textContent = isFr ? `Modifier la Fiche Patient : ${patient.name}` : `Edit Patient: ${patient.name}`;
  document.getElementById('form-patient-id').value = patient.id;
  document.getElementById('form-patient-name').value = patient.name;
  document.getElementById('form-patient-chart').value = patient.chartId;
  document.getElementById('form-patient-age').value = patient.age || 35;
  document.getElementById('form-patient-gender').value = patient.gender || 'Male';
  document.getElementById('form-patient-weight').value = patient.weightKg || 70;
  document.getElementById('form-patient-asa').value = patient.asaStatus || 'ASA I';
  document.getElementById('form-patient-cardiac').checked = !!patient.cardiacRisk;
  document.getElementById('form-patient-complaint').value = patient.chiefComplaint || '';
  document.getElementById('form-patient-alerts').value = patient.medicalAlerts || '';
  document.getElementById('form-patient-allergies').value = patient.allergies || '';

  modal.classList.remove('hidden');
}

function initPatientManager() {
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

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const isFr = systemState.language === 'fr';
      modalTitle.textContent = isFr ? 'Ajouter un Nouveau Patient' : 'Add New Dental Patient';
      form.reset();
      document.getElementById('form-patient-id').value = '';
      document.getElementById('form-patient-weight').value = 70;
      document.getElementById('form-patient-age').value = 35;
      modal.classList.remove('hidden');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patientId = document.getElementById('form-patient-id').value;
      const payload = {
        name: document.getElementById('form-patient-name').value.trim(),
        chartId: document.getElementById('form-patient-chart').value.trim(),
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
        } else {
          alert('Error saving patient: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error saving patient: ' + err.message);
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
            alert(`Database successfully imported! Loaded ${result.count} patient records.`);
            await fetchPatients();
            await fetchOdontogram();
            await fetchSystemStatus();
          } else {
            alert('Import failed: ' + (result.error || 'Invalid file format'));
          }
        } catch (err) {
          alert('Failed to parse database file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }
}

// -----------------------------------------------------------------------------
// Shared Safety Alerts Banner Renderer (critical / warning / info)
// -----------------------------------------------------------------------------
function renderSafetyAlertsInto(containerId, alerts, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const parentCard = opts.parentCardId ? document.getElementById(opts.parentCardId) : null;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (parentCard) parentCard.classList.add('hidden');
    return;
  }

  const isFr = systemState.language === 'fr';
  container.innerHTML = alerts.map(a => {
    const label = a.severity === 'critical' ? (isFr ? 'CRITIQUE' : 'CRITICAL')
      : a.severity === 'warning' ? (isFr ? 'AVERTISSEMENT' : 'WARNING')
      : 'INFO';
    const icon = a.severity === 'info' ? 'ℹ️' : '⚠️';
    return `
      <div class="severity-${a.severity} border rounded-lg px-3 py-2 flex items-start gap-2 text-xs">
        <span class="font-bold whitespace-nowrap">${icon} ${label}:</span>
        <span>${escapeHtml(a.message)}</span>
      </div>
    `;
  }).join('');
  container.classList.remove('hidden');
  if (parentCard) parentCard.classList.remove('hidden');
}

async function fetchActivePatientSafetyAlerts() {
  try {
    const lang = systemState.language || 'en';
    const res = await fetch(`/api/patients/active?language=${lang}`);
    const data = await res.json();
    renderSafetyAlertsInto('safety-alerts-sidebar', data.safetyAlerts, { parentCardId: 'safety-alerts-card' });
    renderSafetyAlertsInto('safety-alerts-anesthesia', data.safetyAlerts);
  } catch (err) {
    console.warn('Failed to fetch active patient safety alerts:', err);
  }
}

// -----------------------------------------------------------------------------
// Shared Tooth Select Populator (Treatment Plan / Lab Cases)
// -----------------------------------------------------------------------------
function populateToothSelect(selectEl) {
  if (!selectEl) return;
  const firstOption = selectEl.options.length > 0 ? selectEl.options[0].cloneNode(true) : null;
  selectEl.innerHTML = '';
  if (firstOption) selectEl.appendChild(firstOption);

  const teeth = (systemState.teethData && systemState.teethData.length === 32)
    ? systemState.teethData
    : Array.from({ length: 32 }, (_, i) => ({ id: i + 1, name: '' }));

  teeth.slice().sort((a, b) => a.id - b.id).forEach(t => {
    const opt = document.createElement('option');
    opt.value = String(t.id);
    opt.textContent = t.name ? `#${t.id} — ${t.name}` : `#${t.id}`;
    selectEl.appendChild(opt);
  });
}

function isMaxillaryToothId(id) {
  return id >= 1 && id <= 16;
}

function isMolarToothId(id) {
  return [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(id);
}

// -----------------------------------------------------------------------------
// Treatment Plan Engine
// -----------------------------------------------------------------------------
function getTreatmentPriorityLabel(priority, isFr) {
  switch (priority) {
    case 'urgent': return isFr ? 'Urgent' : 'Urgent';
    case 'high': return isFr ? 'Élevée' : 'High';
    case 'routine': return isFr ? 'Routine' : 'Routine';
    case 'elective': return isFr ? 'Optionnel' : 'Elective';
    default: return priority;
  }
}

function getTreatmentStatusLabel(status, isFr) {
  switch (status) {
    case 'proposed': return isFr ? 'Proposé' : 'Proposed';
    case 'accepted': return isFr ? 'Accepté' : 'Accepted';
    case 'in_progress': return isFr ? 'En Cours' : 'In Progress';
    case 'completed': return isFr ? 'Terminé' : 'Completed';
    case 'declined': return isFr ? 'Refusé' : 'Declined';
    default: return status;
  }
}

async function fetchTreatmentPlan() {
  try {
    const res = await fetch('/api/treatment-plan');
    const data = await res.json();
    systemState.treatmentPlan = data.items || [];
    renderTreatmentPlanList();
  } catch (err) {
    console.error('Failed to fetch treatment plan:', err);
  }
}

function renderTreatmentPlanList() {
  const container = document.getElementById('treatment-plan-list');
  if (!container) return;
  const items = systemState.treatmentPlan || [];
  const isFr = systemState.language === 'fr';

  if (items.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-slate-400 text-xs">${isFr ? 'Aucun acte planifié pour l\'instant. Ajoutez le premier acte proposé.' : 'No treatment plan items yet. Add the first proposed procedure.'}</div>`;
    return;
  }

  const priorityOrder = { urgent: 0, high: 1, routine: 2, elective: 3 };
  const sorted = [...items].sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

  container.innerHTML = '';
  sorted.forEach(item => {
    const row = document.createElement('div');
    row.className = 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3';

    row.innerHTML = `
      <div class="flex-1 min-w-[220px] space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          ${item.toothId ? `<span class="font-mono font-bold text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">#${item.toothId}</span>` : ''}
          <span class="font-semibold text-sm text-slate-900 dark:text-white">${escapeHtml(item.procedure)}</span>
          ${item.cdtCode ? `<span class="text-[10px] font-mono text-slate-500 dark:text-slate-400">${escapeHtml(item.cdtCode)}</span>` : ''}
          <span class="px-2 py-0.5 rounded border text-[10px] font-semibold priority-${item.priority}">${getTreatmentPriorityLabel(item.priority, isFr)}</span>
        </div>
        ${item.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(item.notes)}</p>` : ''}
        ${(item.estimatedCost !== undefined && item.estimatedCost !== null) ? `<p class="text-xs font-mono text-teal-700 dark:text-teal-400">$${Number(item.estimatedCost).toFixed(2)}</p>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <select class="treatment-status-select text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5">
          <option value="proposed">${getTreatmentStatusLabel('proposed', isFr)}</option>
          <option value="accepted">${getTreatmentStatusLabel('accepted', isFr)}</option>
          <option value="in_progress">${getTreatmentStatusLabel('in_progress', isFr)}</option>
          <option value="completed">${getTreatmentStatusLabel('completed', isFr)}</option>
          <option value="declined">${getTreatmentStatusLabel('declined', isFr)}</option>
        </select>
        <button class="btn-delete-treatment-item p-2 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" title="${isFr ? 'Supprimer' : 'Delete'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    const statusSelect = row.querySelector('.treatment-status-select');
    if (statusSelect) {
      statusSelect.value = item.status;
      statusSelect.addEventListener('change', async (e) => {
        try {
          const res = await fetch(`/api/treatment-plan/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: e.target.value })
          });
          const resData = await res.json();
          if (resData.success) {
            item.status = resData.item.status;
            playClinicalBeep(700, 'sine', 0.1);
          }
        } catch (err) {
          alert('Failed to update status: ' + err.message);
        }
      });
    }

    row.querySelector('.btn-delete-treatment-item')?.addEventListener('click', async () => {
      const isFr2 = systemState.language === 'fr';
      if (!confirm(isFr2 ? 'Supprimer cet acte du plan de traitement ?' : 'Delete this treatment plan item?')) return;
      try {
        await fetch(`/api/treatment-plan/${item.id}`, { method: 'DELETE' });
        await fetchTreatmentPlan();
      } catch (err) {
        alert('Failed to delete item: ' + err.message);
      }
    });

    container.appendChild(row);
  });
}

function initTreatmentPlanManager() {
  const addBtn = document.getElementById('btn-add-treatment-item');
  const modal = document.getElementById('modal-treatment-item');
  const closeBtn = document.getElementById('btn-close-modal-treatment');
  const cancelBtn = document.getElementById('btn-cancel-modal-treatment');
  const form = document.getElementById('treatment-item-form');
  if (!modal || !form) return;

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      form.reset();
      populateToothSelect(document.getElementById('form-treatment-tooth'));
      modal.classList.remove('hidden');
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const toothVal = document.getElementById('form-treatment-tooth').value;
    const costVal = document.getElementById('form-treatment-cost').value;
    const payload = {
      toothId: toothVal ? Number(toothVal) : undefined,
      procedure: document.getElementById('form-treatment-procedure').value.trim(),
      cdtCode: document.getElementById('form-treatment-cdt').value.trim() || undefined,
      priority: document.getElementById('form-treatment-priority').value,
      estimatedCost: costVal !== '' ? Number(costVal) : undefined,
      notes: document.getElementById('form-treatment-notes').value.trim() || undefined
    };
    try {
      const res = await fetch('/api/treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        modal.classList.add('hidden');
        playClinicalBeep(880, 'sine', 0.15);
        await fetchTreatmentPlan();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error saving treatment plan item: ' + err.message);
    }
  });
}

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

// -----------------------------------------------------------------------------
// Full-Mouth Perio Chart Engine (6-site probing, snapshotted by date)
// -----------------------------------------------------------------------------
const PERIO_SITE_KEYS = ['mesiobuccal', 'buccal', 'distobuccal', 'distolingual', 'lingual', 'mesiolingual'];

function getPerioSiteLabel(key, isFr) {
  const map = {
    mesiobuccal: isFr ? 'Mésio-vestibulaire' : 'Mesiobuccal',
    buccal: isFr ? 'Vestibulaire' : 'Buccal',
    distobuccal: isFr ? 'Disto-vestibulaire' : 'Distobuccal',
    distolingual: isFr ? 'Disto-lingual' : 'Distolingual',
    lingual: isFr ? 'Lingual' : 'Lingual',
    mesiolingual: isFr ? 'Mésio-lingual' : 'Mesiolingual'
  };
  return map[key] || key;
}

async function fetchPerioLatest() {
  try {
    const res = await fetch('/api/perio-charts/latest');
    const data = await res.json();
    systemState.perioTeeth = data.chart.teeth;
    systemState.perioChartId = data.chart.id;
    systemState.perioIsNew = data.isNew;

    const notesInput = document.getElementById('perio-notes-input');
    if (notesInput) notesInput.value = data.chart.notes || '';

    const dateBadge = document.getElementById('perio-chart-date-badge');
    if (dateBadge) {
      const isFr = systemState.language === 'fr';
      dateBadge.textContent = data.isNew
        ? (isFr ? 'Nouveau relevé' : 'New Chart')
        : new Date(data.chart.date).toLocaleDateString(isFr ? 'fr-FR' : 'en-US');
    }

    renderPerioGrid();
  } catch (err) {
    console.error('Failed to fetch latest perio chart:', err);
  }
}

async function fetchPerioHistory() {
  try {
    const res = await fetch('/api/perio-charts');
    const data = await res.json();
    systemState.perioHistory = data.charts || [];
    renderPerioHistory();
  } catch (err) {
    console.error('Failed to fetch perio chart history:', err);
  }
}

function renderPerioHistory() {
  const container = document.getElementById('perio-history-list');
  if (!container) return;
  const history = systemState.perioHistory || [];
  const isFr = systemState.language === 'fr';

  if (history.length === 0) {
    container.innerHTML = `<div class="text-slate-400 py-2">${isFr ? 'Aucun relevé antérieur enregistré.' : 'No prior snapshots saved yet.'}</div>`;
    return;
  }

  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sorted.map(snap => `
    <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
      <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">${new Date(snap.date).toLocaleString(isFr ? 'fr-FR' : 'en-US')}</span>
      ${snap.notes ? `<span class="text-slate-500 dark:text-slate-400 italic truncate ml-3">${escapeHtml(snap.notes)}</span>` : ''}
    </div>
  `).join('');
}

function renderPerioGrid() {
  const maxGrid = document.getElementById('perio-maxillary-grid');
  const manGrid = document.getElementById('perio-mandibular-grid');
  if (!maxGrid || !manGrid) return;
  const teeth = systemState.perioTeeth || [];
  if (teeth.length === 0) return;

  maxGrid.innerHTML = '';
  manGrid.innerHTML = '';

  const maxillary = teeth.filter(t => isMaxillaryToothId(t.toothId)).sort((a, b) => a.toothId - b.toothId);
  const mandibular = teeth.filter(t => !isMaxillaryToothId(t.toothId)).sort((a, b) => b.toothId - a.toothId);

  maxillary.forEach(t => maxGrid.appendChild(createPerioToothCard(t)));
  mandibular.forEach(t => manGrid.appendChild(createPerioToothCard(t)));
}

function createPerioToothCard(entry) {
  const sites = Object.values(entry.sites);
  const maxDepth = Math.max(...sites.map(s => s.pocketDepth));
  const anyBleeding = sites.some(s => s.bleeding);
  const anySuppuration = sites.some(s => s.suppuration);

  let severityClass = 'status-sound';
  if (maxDepth >= 6) severityClass = 'status-caries';
  else if (maxDepth >= 4) severityClass = 'status-crown';

  const card = document.createElement('div');
  card.className = `cursor-pointer p-2 rounded-xl border text-center flex flex-col items-center justify-between gap-1 min-h-[72px] ${severityClass}`;
  card.innerHTML = `
    <span class="text-[10px] font-mono font-bold">#${entry.toothId}</span>
    <span class="text-sm font-bold">${maxDepth}mm</span>
    <span class="flex items-center gap-1 h-3">
      ${anyBleeding ? '<span class="w-2 h-2 rounded-full bg-rose-500" title="Bleeding on probing"></span>' : ''}
      ${anySuppuration ? '<span class="w-2 h-2 rounded-full bg-amber-500" title="Suppuration"></span>' : ''}
      ${entry.mobility > 0 ? `<span class="text-[9px] font-mono">M${entry.mobility}</span>` : ''}
    </span>
  `;
  card.addEventListener('click', () => openPerioToothModal(entry));
  return card;
}

function openPerioToothModal(entry) {
  const modal = document.getElementById('modal-perio-tooth');
  const title = document.getElementById('modal-perio-title');
  if (!modal) return;
  const isFr = systemState.language === 'fr';

  document.getElementById('form-perio-tooth-id').value = entry.toothId;
  title.textContent = isFr ? `Saisie Parodontale — Dent #${entry.toothId}` : `Perio Entry — Tooth #${entry.toothId}`;
  document.getElementById('form-perio-mobility').value = String(entry.mobility);
  document.getElementById('form-perio-furcation').value = (entry.furcation === null || entry.furcation === undefined) ? 'null' : String(entry.furcation);

  const sitesContainer = document.getElementById('perio-sites-container');
  sitesContainer.innerHTML = PERIO_SITE_KEYS.map(key => {
    const site = entry.sites[key];
    return `
      <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5" data-site="${key}">
        <div class="font-semibold text-slate-700 dark:text-slate-300">${getPerioSiteLabel(key, isFr)}</div>
        <div class="grid grid-cols-2 gap-1.5">
          <label class="flex flex-col gap-0.5">
            <span class="text-[10px] text-slate-500">${isFr ? 'Profondeur (mm)' : 'Pocket (mm)'}</span>
            <input type="number" min="0" max="15" class="site-pocket w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1" value="${site.pocketDepth}">
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-[10px] text-slate-500">${isFr ? 'Récession (mm)' : 'Recession (mm)'}</span>
            <input type="number" min="0" max="15" class="site-recession w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1" value="${site.recession}">
          </label>
        </div>
        <div class="flex items-center gap-3 pt-0.5">
          <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" class="site-bleeding" ${site.bleeding ? 'checked' : ''}> <span>${isFr ? 'Saignement' : 'Bleeding'}</span></label>
          <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" class="site-suppuration" ${site.suppuration ? 'checked' : ''}> <span>${isFr ? 'Suppuration' : 'Suppuration'}</span></label>
        </div>
      </div>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function initPerioChartManager() {
  const modal = document.getElementById('modal-perio-tooth');
  const closeBtn = document.getElementById('btn-close-modal-perio');
  const cancelBtn = document.getElementById('btn-cancel-modal-perio');
  const form = document.getElementById('perio-tooth-form');
  const saveSnapshotBtn = document.getElementById('btn-save-perio-snapshot');
  if (!modal || !form) return;

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const toothId = Number(document.getElementById('form-perio-tooth-id').value);
    const entry = (systemState.perioTeeth || []).find(t => t.toothId === toothId);
    if (!entry) return;

    entry.mobility = Number(document.getElementById('form-perio-mobility').value);
    const furcationVal = document.getElementById('form-perio-furcation').value;
    entry.furcation = furcationVal === 'null' ? null : Number(furcationVal);

    document.querySelectorAll('#perio-sites-container [data-site]').forEach(siteDiv => {
      const key = siteDiv.dataset.site;
      const pocket = Number(siteDiv.querySelector('.site-pocket').value) || 0;
      const recession = Number(siteDiv.querySelector('.site-recession').value) || 0;
      const bleeding = siteDiv.querySelector('.site-bleeding').checked;
      const suppuration = siteDiv.querySelector('.site-suppuration').checked;
      entry.sites[key] = { pocketDepth: pocket, recession, bleeding, suppuration };
    });

    modal.classList.add('hidden');
    renderPerioGrid();
    playClinicalBeep(700, 'sine', 0.1);
  });

  if (saveSnapshotBtn) {
    saveSnapshotBtn.addEventListener('click', async () => {
      const notes = document.getElementById('perio-notes-input')?.value || '';
      const confirmEl = document.getElementById('perio-save-confirmation');
      if (confirmEl) confirmEl.classList.add('hidden');
      try {
        const res = await fetch('/api/perio-charts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teeth: systemState.perioTeeth, notes })
        });
        const data = await res.json();
        if (data.success) {
          playClinicalBeep(880, 'sine', 0.2);
          if (confirmEl) confirmEl.classList.remove('hidden');
          await fetchPerioLatest();
          await fetchPerioHistory();
        } else {
          alert('Error saving perio snapshot: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error saving perio snapshot: ' + err.message);
      }
    });
  }
}

// -----------------------------------------------------------------------------
// Lab Cases Engine (crown & bridge / denture / appliance workflow with a lab)
// -----------------------------------------------------------------------------
function getLabStatusLabel(status, isFr) {
  switch (status) {
    case 'planned': return isFr ? 'Planifié' : 'Planned';
    case 'sent': return isFr ? 'Envoyé' : 'Sent';
    case 'in_lab': return isFr ? 'Au Laboratoire' : 'In Lab';
    case 'returned': return isFr ? 'Retourné' : 'Returned';
    case 'seated': return isFr ? 'Posé' : 'Seated';
    case 'remake': return isFr ? 'À Refaire' : 'Remake';
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

  container.innerHTML = '';
  sorted.forEach(lc => {
    const now = new Date();
    let dueBadge = '';
    if (lc.dueDate && lc.status !== 'seated') {
      const due = new Date(lc.dueDate);
      const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
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
          ${lc.toothId ? `<span class="font-mono font-bold text-xs bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">#${lc.toothId}</span>` : ''}
          <span class="font-semibold text-sm text-slate-900 dark:text-white">${escapeHtml(lc.caseType)}</span>
          ${lc.material ? `<span class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(lc.material)}${lc.shade ? ' • ' + escapeHtml(lc.shade) : ''}</span>` : ''}
          <span class="px-2 py-0.5 rounded border text-[10px] font-semibold labstatus-${lc.status}">${getLabStatusLabel(lc.status, isFr)}</span>
          ${dueBadge}
        </div>
        <div class="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3">
          ${lc.labName ? `<span>${isFr ? 'Labo :' : 'Lab:'} ${escapeHtml(lc.labName)}</span>` : ''}
          ${lc.dueDate ? `<span>${isFr ? 'Échéance :' : 'Due:'} ${new Date(lc.dueDate).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}</span>` : ''}
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
        <button class="btn-delete-labcase p-2 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" title="${isFr ? 'Supprimer' : 'Delete'}">
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
            await fetchLabCases();
          }
        } catch (err) {
          alert('Failed to update lab case status: ' + err.message);
        }
      });
    }

    row.querySelector('.btn-delete-labcase')?.addEventListener('click', async () => {
      const isFr2 = systemState.language === 'fr';
      if (!confirm(isFr2 ? 'Supprimer ce cas de laboratoire ?' : 'Delete this lab case?')) return;
      try {
        await fetch(`/api/lab-cases/${lc.id}`, { method: 'DELETE' });
        await fetchLabCases();
      } catch (err) {
        alert('Failed to delete lab case: ' + err.message);
      }
    });

    container.appendChild(row);
  });
}

function initLabCaseManager() {
  const addBtn = document.getElementById('btn-add-lab-case');
  const modal = document.getElementById('modal-lab-case');
  const closeBtn = document.getElementById('btn-close-modal-labcase');
  const cancelBtn = document.getElementById('btn-cancel-modal-labcase');
  const form = document.getElementById('lab-case-form');
  if (!modal || !form) return;

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      form.reset();
      populateToothSelect(document.getElementById('form-labcase-tooth'));
      modal.classList.remove('hidden');
    });
  }
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
    try {
      const res = await fetch('/api/lab-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        modal.classList.add('hidden');
        playClinicalBeep(880, 'sine', 0.15);
        await fetchLabCases();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error saving lab case: ' + err.message);
    }
  });
}
