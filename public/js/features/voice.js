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
        speakAdvisorText(molarisT('chat.voiceEnabled'));
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
      micBtn.title = molarisT('chat.micUnsupported');
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
