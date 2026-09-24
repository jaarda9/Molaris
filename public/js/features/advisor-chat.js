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
        appendMessage('molaris', `${molarisT('chat.alertPrefix')} ${data.error}`);
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
      appendMessage('molaris', `${molarisT('chat.commFailure')} ${err.message}`);
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
          <div class="text-[10px] font-semibold text-teal-200 uppercase tracking-wider mb-1">${escapeHtml(molarisT('chat.doctorLabel'))}</div>
          <div>${escapeHtml(text)}</div>
        </div>
      </div>
      <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
        Dr
      </div>
    `;
  } else {
    // An executed command is confirmed by the reply itself ("⚡ …"), so no separate badge.
    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
        M
      </div>
      <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 text-sm max-w-[85%] border border-slate-200 dark:border-slate-700 space-y-2 leading-relaxed text-slate-800 dark:text-slate-100">
        <div class="flex items-center justify-between text-xs border-b border-slate-200 dark:border-slate-700 pb-1.5">
          <span class="font-bold text-teal-700 dark:text-teal-400">${escapeHtml(molarisT('chat.welcomeSender'))}</span>
          <button onclick="navigator.clipboard.writeText(this.closest('.space-y-2').innerText)" class="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">${escapeHtml(molarisT('chat.copy'))}</button>
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
      <span>${escapeHtml(molarisT('chat.typing'))}</span>
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
            ${escapeHtml(molarisT('chat.cleared'))}
          </div>
        </div>
      `;
    });
  }
}
