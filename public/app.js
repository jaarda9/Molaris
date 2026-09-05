
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
  initJarvisHudAndTelemetry();

  await fetchPatients();
  await fetchSystemStatus();
  await fetchOdontogram();
  await fetchAnestheticsAndProtocols();
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
    { id: 'nav-tab-system', view: 'view-system' },
    { id: 'nav-tab-preferences', view: 'view-preferences' },
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

      if (t.view === 'view-system') {
        fetchTelemetry();
      }
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

        // Execute autonomous client actions triggered by M.O.L.A.R.I.S JARVIS action engine
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
  return text
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

const saveNoteBtn = document.getElementById('save-tooth-note-btn');
if (saveNoteBtn) {
  saveNoteBtn.addEventListener('click', async () => {
    if (!systemState.selectedTooth) return;
    const notes = document.getElementById('detail-tooth-notes').value;
    systemState.selectedTooth.notes = notes;

    try {
      await fetch('/api/odontogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothId: systemState.selectedTooth.id,
          notes
        })
      });
      playClinicalBeep(700, 'sine', 0.1);
    } catch (e) {
      console.error(e);
    }
  });
}

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
          outputArea.innerHTML = `<div class="markdown-content">${formatMarkdown(data.analysis)}</div>`;
          statusChip.classList.remove('hidden');
          copyBtn.classList.remove('hidden');
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
// Autonomous JARVIS Action Dispatcher (M.O.L.A.R.I.S Action Engine)
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

    case 'SYSTEM_TELEMETRY':
    case 'TELEMETRY':
      const sysTab = document.getElementById('nav-tab-system');
      if (sysTab) sysTab.click();
      fetchTelemetry();
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
    if (data.patient) {
      systemState.activePatient = data.patient;
      updateActivePatientHeaderUI(data.patient);
      renderPatientsGrid();
      await fetchOdontogram();
      
      // Update LA calculator
      const calcWeightInput = document.getElementById('calc-weight-input');
      const calcWeightSlider = document.getElementById('calc-weight-slider');
      if (calcWeightInput && calcWeightSlider) {
        calcWeightInput.value = data.patient.weightKg || 70;
        calcWeightSlider.value = data.patient.weightKg || 70;
      }
      const calcCardiac = document.getElementById('calc-cardiac-toggle');
      if (calcCardiac) calcCardiac.checked = !!data.patient.cardiacRisk;
      
      // Reset delivered carpules to match patient's log
      const totalCarpules = (data.patient.anesthesiaLog || []).reduce((sum, item) => sum + (Number(item.carpules) || 0), 0);
      systemState.deliveredCarpules = totalCarpules;
      const calcDelivered = document.getElementById('calc-delivered-carpules');
      if (calcDelivered) calcDelivered.textContent = totalCarpules;
      
      recalculateLA();
      playClinicalBeep(659.25, 'sine', 0.15);

      // Add feedback notification in chat
      const isFr = systemState.language === 'fr';
      const notificationMsg = isFr
        ? `Contexte opératoire basculé sur le patient **${data.patient.name}** (${data.patient.chartId}). Chargement de l'odontogramme 32 dents, alertes médicales et référence ASA ${data.patient.asaStatus}.`
        : `Operatory context switched to patient **${data.patient.name}** (${data.patient.chartId}). Loaded 32-tooth odontogram, medical alerts, and ASA ${data.patient.asaStatus} baseline.`;
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
// Mark LII Telemetry & Real-Time Audio Reactive Waveform HUD
// -----------------------------------------------------------------------------
let telemetryPollInterval = null;

function initJarvisHudAndTelemetry() {
  initJarvisWaveformCanvas();

  // Chairside autonomous macro buttons
  document.querySelectorAll('.macro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (!cmd) return;
      document.getElementById('nav-tab-advisor')?.click();
      chatInput.value = cmd;
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  // Test action button
  const testActionBtn = document.getElementById('btn-test-action');
  if (testActionBtn) {
    testActionBtn.addEventListener('click', () => {
      // Iron Man Mark LII 4-tone powerup sequence
      playClinicalBeep(523.25, 'sine', 0.1);
      setTimeout(() => playClinicalBeep(659.25, 'sine', 0.1), 100);
      setTimeout(() => playClinicalBeep(783.99, 'sine', 0.1), 200);
      setTimeout(() => playClinicalBeep(1046.50, 'sine', 0.25), 300);

      // Trigger 5-second test timer
      if (typeof window.startChairsideTimer === 'function') {
        window.startChairsideTimer(5);
      }
    });
  }

  // Periodic telemetry polling
  fetchTelemetry();
  telemetryPollInterval = setInterval(fetchTelemetry, 5000);
}

async function fetchTelemetry() {
  try {
    const res = await fetch('/api/system/telemetry');
    const data = await res.json();

    const heapEl = document.getElementById('telemetry-heap');
    const rssEl = document.getElementById('telemetry-rss');
    const freeRamEl = document.getElementById('telemetry-freeram');
    const totalRamEl = document.getElementById('telemetry-totalram');
    const uptimeEl = document.getElementById('telemetry-uptime');
    const platformEl = document.getElementById('telemetry-platform');
    const patientsEl = document.getElementById('telemetry-patients');
    const chartEl = document.getElementById('telemetry-active-chart');

    if (heapEl) heapEl.textContent = `${data.heapUsedMb} MB`;
    if (rssEl) rssEl.textContent = `${data.rssMb}`;
    if (freeRamEl) freeRamEl.textContent = `${data.systemFreeRamMb} MB Free`;
    if (totalRamEl) totalRamEl.textContent = `${data.systemTotalRamMb}`;
    if (uptimeEl) uptimeEl.textContent = data.uptimeFormatted || '0h 0m 0s';
    if (platformEl) platformEl.textContent = `${data.platform} (${data.arch})`;
    if (patientsEl) patientsEl.textContent = `${data.patientCount} Patients`;
    if (chartEl) chartEl.textContent = data.activePatientChart || 'None';
  } catch (err) {
    console.warn('Telemetry fetch error:', err);
  }
}

function initJarvisWaveformCanvas() {
  const canvas = document.getElementById('jarvis-waveform-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let phase = 0;

  function draw() {
    requestAnimationFrame(draw);

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Grid lines for Mark LII HUD look
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Dynamic amplitude based on speaking or microphone activity
    const isSpeaking = window.speechSynthesis && window.speechSynthesis.speaking;
    const isActive = isSpeaking || isListening;
    const amplitude = isActive ? 28 : 10;
    const frequency = isActive ? 0.04 : 0.015;
    const speed = isActive ? 0.12 : 0.04;

    phase += speed;

    // Glowing main wave
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const taper = Math.sin((x / width) * Math.PI); // Pin edges to zero
      const y = centerY + Math.sin(x * frequency + phase) * amplitude * taper + Math.sin(x * frequency * 2.5 - phase * 1.5) * (amplitude * 0.4) * taper;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Harmonic companion wave
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#0d9488';
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const taper = Math.sin((x / width) * Math.PI);
      const y = centerY + Math.sin(x * frequency * 1.8 - phase) * (amplitude * 0.7) * taper;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  draw();
}
