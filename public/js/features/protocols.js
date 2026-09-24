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
          ${isFr ? 'Demander au conseiller' : 'Ask Advisor'}
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
