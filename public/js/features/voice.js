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

// -----------------------------------------------------------------------------
// Voice choice. Neural voices sound human: Microsoft Edge ships free "Online (Natural)"
// voices (Denise, Henri, Vivienne…, need internet), Chrome has "Google français".
// The best available one is used unless the doctor picked another (Profil & préférences).
// -----------------------------------------------------------------------------
const VOICE_PREFERENCES = {
  fr: ['Vivienne', 'Denise', 'Remy', 'Rémy', 'Henri', 'Eloise', 'Google français', 'Amélie', 'Thomas', 'Audrey'],
  en: ['Ava', 'Andrew', 'Emma', 'Brian', 'Jenny', 'Aria', 'Guy', 'Google US English', 'Samantha', 'Alex']
};
const VOICE_STORAGE_KEY = 'molaris_voice';

const isNaturalVoice = (v) => /natural|neural|online/i.test(v.name);

function voiceScore(voice, lang) {
  if (!voice.lang.toLowerCase().startsWith(lang)) return -1;
  let score = 0;
  if (isNaturalVoice(voice)) score += 100;
  if (/google/i.test(voice.name)) score += 60;
  const rank = VOICE_PREFERENCES[lang].findIndex(name => voice.name.includes(name));
  if (rank >= 0) score += 40 - rank;
  if (/^(fr-FR|en-US|en-GB)$/i.test(voice.lang)) score += 5; // before fr-CA, fr-BE…
  return score;
}

/** Voices for a UI language, best first. */
function rankedVoices(lang) {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices()
    .filter(v => voiceScore(v, lang) >= 0)
    .sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang));
}

function savedVoiceName(lang) {
  try { return (JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY) || '{}'))[lang] || ''; } catch (e) { return ''; }
}

function saveVoiceName(lang, name) {
  try {
    const saved = JSON.parse(localStorage.getItem(VOICE_STORAGE_KEY) || '{}');
    saved[lang] = name;
    localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(saved));
  } catch (e) { /* storage unavailable: the best voice is used */ }
}

function chosenVoice(lang) {
  const voices = rankedVoices(lang);
  return voices.find(v => v.name === savedVoiceName(lang)) || voices[0] || null;
}

// -----------------------------------------------------------------------------
// Text written for the eye, rewritten for the ear: no markdown symbols or emojis,
// amounts and units said in words, whole sentences only.
// -----------------------------------------------------------------------------
const SPOKEN_ACRONYMS = new Set(['MRONJ', 'ANSM', 'INPDP']);

function speechSentences(markdown, lang, maxChars = 700) {
  const fr = lang === 'fr';
  let t = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*#{1,6}\s*(.+)$/gm, '$1.')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/[*_`~#>|]/g, '')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s*[→⇒←↔]\s*/g, ', ')
    .replace(/\s*[·•]\s*/g, ', ')
    .replace(/\s+—\s+/g, ', ');

  // Money: "1 000,500 DT" -> "1000 dinars 500", "300,000 DT" -> "300 dinars".
  t = t.replace(/(\d{1,3}(?:[\s  ]\d{3})*),(\d{3})\s*(?:DT|TND)\b/g, (m, d, mil) => {
    const dinars = d.replace(/[\s  ]/g, '');
    const millimes = Number(mil);
    if (!millimes) return `${dinars} dinars`;
    return fr ? `${dinars} dinars ${millimes}` : `${dinars} dinars and ${millimes} millimes`;
  }).replace(/(\d)\s*(?:DT|TND)\b/g, '$1 dinars');

  const units = fr
    ? [[/(\d)\s*mg\/kg\b/g, '$1 milligrammes par kilo'], [/(\d)\s*mg\b/g, '$1 milligrammes'], [/(\d)\s*m[lL]\b/g, '$1 millilitres'],
       [/(\d)\s*g\b/g, '$1 grammes'], [/(\d)\s*kg\b/g, '$1 kilos'], [/(\d)\s*mm\b/g, '$1 millimètres'], [/(\d)\s*min\b/g, '$1 minutes'],
       [/(\d)\s*s\b/g, '$1 secondes'], [/(\d)\s*%/g, '$1 pour cent'], [/\bex\.\s*/g, 'par exemple '], [/\bDr\.?\s/g, 'Docteur ']]
    : [[/(\d)\s*mg\/kg\b/g, '$1 milligrams per kilo'], [/(\d)\s*mg\b/g, '$1 milligrams'], [/(\d)\s*m[lL]\b/g, '$1 millilitres'],
       [/(\d)\s*g\b/g, '$1 grams'], [/(\d)\s*kg\b/g, '$1 kilos'], [/(\d)\s*mm\b/g, '$1 millimetres'], [/(\d)\s*min\b/g, '$1 minutes'],
       [/(\d)\s*s\b/g, '$1 seconds'], [/(\d)\s*%/g, '$1 percent'], [/\be\.g\.\s*/g, 'for example '], [/\bDr\.?\s/g, 'Doctor ']];
  for (const [pattern, words] of units) t = t.replace(pattern, words);
  t = t.replace(/\bASA\s+(IV|III|II|I)\b/g, (m, n) => `ASA ${({ I: 1, II: 2, III: 3, IV: 4 })[n]}`);
  // Shouted words ("ALERTE CLINIQUE") are said as words, not spelled; real acronyms stay.
  t = t.replace(/\b[A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ]{5,}\b/g, word => (SPOKEN_ACRONYMS.has(word) ? word : word.toLowerCase()));

  // Each line is a thought: end it like a sentence so the voice pauses.
  const sentences = t.split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => (/[.!?…:;,]$/.test(line) ? line : `${line}.`))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => /[\p{L}\d]/u.test(s));

  // Chairside: read the essential first sentences, never cut one in half.
  const kept = [];
  let length = 0;
  for (const s of sentences) {
    if (kept.length && length + s.length > maxChars) break;
    kept.push(s);
    length += s.length;
  }
  return kept;
}

function speakAdvisorText(text, { force = false } = {}) {
  if ((!systemState.voiceEnabled && !force) || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const lang = systemState.language === 'fr' ? 'fr' : 'en';
  const voice = chosenVoice(lang);
  // One utterance per sentence: natural pauses, and long answers are not cut off
  // (Chromium stops long single utterances of online voices after ~15 s).
  for (const sentence of speechSentences(text, lang)) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = voice ? voice.lang : (lang === 'fr' ? 'fr-FR' : 'en-US');
    if (voice) utterance.voice = voice;
    utterance.rate = voice && isNaturalVoice(voice) ? 1.0 : 0.95;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  }
}

// -----------------------------------------------------------------------------
// Voice picker (Profil & préférences): list, preview, remembered per language.
// -----------------------------------------------------------------------------
function voiceLabel(voice) {
  const short = voice.name.replace(/^Microsoft\s+/, '').replace(/\s*Online\s*\(Natural\)/i, '').replace(/\s*-\s*.+$/, '').trim();
  const region = (voice.lang.split('-')[1] || '').toUpperCase();
  return `${short}${region ? ` (${region})` : ''}${isNaturalVoice(voice) || /google/i.test(voice.name) ? ` — ${molarisT('voice.natural')}` : ''}`;
}

function renderVoicePicker() {
  const select = document.getElementById('voice-select');
  const hint = document.getElementById('voice-hint');
  if (!select) return;
  const lang = systemState.language === 'fr' ? 'fr' : 'en';
  const voices = rankedVoices(lang);
  const current = chosenVoice(lang);
  select.innerHTML = voices.length
    ? voices.map(v => `<option value="${escapeHtml(v.name)}" ${current && v.name === current.name ? 'selected' : ''}>${escapeHtml(voiceLabel(v))}</option>`).join('')
    : `<option value="">${escapeHtml(molarisT('voice.none'))}</option>`;
  if (hint) hint.classList.toggle('hidden', !!(current && (isNaturalVoice(current) || /google/i.test(current.name))));
}

function initVoicePicker() {
  const select = document.getElementById('voice-select');
  const preview = document.getElementById('voice-preview-btn');
  if (!select || !('speechSynthesis' in window)) return;
  renderVoicePicker();
  // Voices arrive asynchronously (and Edge's online voices a bit later).
  speechSynthesis.addEventListener('voiceschanged', renderVoicePicker);
  Molaris.events.on('language-changed', renderVoicePicker);
  select.addEventListener('change', () => {
    saveVoiceName(systemState.language === 'fr' ? 'fr' : 'en', select.value);
    speakAdvisorText(molarisT('voice.sample'), { force: true });
  });
  preview?.addEventListener('click', () => speakAdvisorText(molarisT('voice.sample'), { force: true }));
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
