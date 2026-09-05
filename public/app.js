// M.O.L.A.R.I.S — Senior Dental Advisor & Chairside Assistant Engine

let systemState = {
  activeTab: 'advisor',
  voiceEnabled: true,
  numberingSystem: 'universal', // 'universal' | 'fdi'
  selectedTooth: null,
  teethData: [],
  anesthetics: [],
  selectedDrugId: 'lido_100k',
  deliveredCarpules: 0,
  preferences: null,
  activePatient: null,
  chatHistory: []
};

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
  initNavigation();
  initChairsideTimer();
  initSpeechSynthesis();
  initSpeechRecognition();
  initQuickPrompts();
  initAnesthesiaCalculator();
  initVisionUploader();
  initSOAPGenerator();
  initPreferencesForm();

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
      document.getElementById('header-patient-id').textContent = data.activePatient.chartId;
      document.getElementById('header-patient-asa').textContent = `${data.activePatient.asaStatus} (${data.activePatient.cardiacRisk ? 'Cardiac Risk' : 'Standard'})`;
      document.getElementById('header-patient-weight').textContent = `${data.activePatient.weightKg} kg`;
      
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

// -----------------------------------------------------------------------------
// Navigation Tabs
// -----------------------------------------------------------------------------
function initNavigation() {
  const tabs = [
    { id: 'nav-tab-advisor', view: 'view-advisor' },
    { id: 'nav-tab-odontogram', view: 'view-odontogram' },
    { id: 'nav-tab-anesthesia', view: 'view-anesthesia' },
    { id: 'nav-tab-vision', view: 'view-vision' },
    { id: 'nav-tab-protocols', view: 'view-protocols' },
    { id: 'nav-tab-soap', view: 'view-soap' },
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
  
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Alex')));
  if (naturalVoice) utterance.voice = naturalVoice;

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
  recognition.lang = 'en-US';

  let isListening = false;

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
        conversationHistory: systemState.chatHistory
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      removeMessage(typingId);

      if (data.error) {
        appendMessage('molaris', `⚠️ Clinical Advisor Alert: ${data.error}`);
      } else {
        appendMessage('molaris', data.reply);
        systemState.chatHistory.push({ role: 'user', content: query });
        systemState.chatHistory.push({ role: 'model', content: data.reply });
        speakAdvisorText(data.reply);
      }
    } catch (err) {
      removeMessage(typingId);
      appendMessage('molaris', `⚠️ Communication failure with clinical engine. ${err.message}`);
    }
  });
}

function appendMessage(sender, text) {
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
    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
        M
      </div>
      <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 text-sm max-w-[85%] border border-slate-200 dark:border-slate-700 space-y-2 leading-relaxed text-slate-800 dark:text-slate-100">
        <div class="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-1.5">
          <span class="font-bold text-teal-700 dark:text-teal-400">M.O.L.A.R.I.S SENIOR ADVISOR</span>
          <button onclick="navigator.clipboard.writeText(this.closest('.space-y-2').innerText)" class="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Copy</button>
        </div>
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
      <span>Reviewing clinical evidence and patient history...</span>
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
      chatMessages.innerHTML = `
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">M</div>
          <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-xs text-slate-600 dark:text-slate-300">
            Feed cleared. M.O.L.A.R.I.S is ready for your next chairside consultation.
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
    <span class="text-[9px] uppercase tracking-wider font-semibold opacity-70 truncate w-full">${tooth.status}</span>
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
  numberEl.textContent = `#${tooth.id}`;
  nameEl.textContent = tooth.name;
  fdiEl.textContent = `FDI Notation: ${tooth.fdi} • Arch: ${tooth.arch.toUpperCase()} • Type: ${tooth.type.toUpperCase()}`;
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
    nameSpan.textContent = `Tooth #${tooth.id} (${tooth.name})`;
    statusSpan.textContent = `[${tooth.status.toUpperCase()}]`;
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
        carpulesGiven: systemState.deliveredCarpules
      })
    });

    const data = await res.json();
    document.getElementById('calc-limiting-factor').textContent = `Limiting Factor: ${data.limitingFactor}`;
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
function renderProtocolsList(protocols) {
  const container = document.getElementById('protocols-list-container');
  if (!container) return;
  container.innerHTML = '';

  protocols.forEach(protocol => {
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
          Ask Advisor
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
      chatInput.value = `Senior guidance requested on protocol: "${title}". What are your top chairside pearls, troubleshooting tips, and common pitfalls?`;
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
            details: details
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
