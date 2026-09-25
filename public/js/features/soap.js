// -----------------------------------------------------------------------------
// SOAP Progress Note Generator
// -----------------------------------------------------------------------------
const SOAP_EXAMPLE_FIELDS = [
  ['soap-input-proc', 'soap.exampleProc'],
  ['soap-input-anesthesia', 'soap.exampleAnesthesia'],
  ['soap-input-materials', 'soap.exampleMaterials'],
  ['soap-input-outcome', 'soap.exampleOutcome']
];
// The worked example is a hint (placeholder), never a value: an example anesthesia or
// material left in a field would end up in a signed medical record.
function showSOAPExampleHints() {
  SOAP_EXAMPLE_FIELDS.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = molarisT(key);
  });
}

// Empties the form and the draft: after signing, and when another chart is opened
// (a draft of the previous patient must never be signed into the new one).
function resetSOAPForm() {
  SOAP_EXAMPLE_FIELDS.forEach(([id]) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const toothSelect = document.getElementById('soap-input-tooth');
  if (toothSelect) toothSelect.value = '';
  const output = document.getElementById('soap-output-area');
  if (output) output.value = '';
  const signBtn = document.getElementById('sign-soap-btn');
  if (signBtn) signBtn.disabled = true;
}

function refreshSOAPToothSelect(toothSelect) {
  const selected = toothSelect.value;
  fillFdiToothSelect(toothSelect);
  toothSelect.value = selected;
}

function initSOAPGenerator() {
  const btn = document.getElementById('generate-soap-btn');
  const copyBtn = document.getElementById('copy-soap-btn');
  const toothSelect = document.getElementById('soap-input-tooth');

  showSOAPExampleHints();
  if (toothSelect) {
    fillFdiToothSelect(toothSelect);
    toothSelect.value = '';
  }

  Molaris.events.on('language-changed', () => {
    showSOAPExampleHints();
    if (toothSelect) refreshSOAPToothSelect(toothSelect);
  });
  // Tooth names are only known once the odontogram has loaded.
  Molaris.events.on('view-shown', ({ view }) => {
    if (view === 'soap' && toothSelect) refreshSOAPToothSelect(toothSelect);
  });

  const output = document.getElementById('soap-output-area');
  const signBtn = document.getElementById('sign-soap-btn');
  const signStatus = document.getElementById('soap-sign-status');
  const syncSignButton = () => { if (signBtn) signBtn.disabled = output.value.trim().length < 20; };
  output?.addEventListener('input', () => { syncSignButton(); if (signStatus) signStatus.textContent = ''; });

  // Generate = an AI DRAFT in the editable box; nothing is saved to the chart.
  if (btn) {
    btn.addEventListener('click', async () => {
      const proc = document.getElementById('soap-input-proc')?.value;
      const toothId = toothSelect?.value;
      const anesthesia = document.getElementById('soap-input-anesthesia')?.value;
      const materials = document.getElementById('soap-input-materials')?.value;
      const details = document.getElementById('soap-input-outcome')?.value;

      output.value = molarisT('soap.generating');
      if (signBtn) signBtn.disabled = true;
      if (signStatus) signStatus.textContent = '';

      try {
        const res = await fetch('/api/generate-soap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            procedure: proc,
            toothId: toothId || undefined,
            anesthesiaUsed: anesthesia,
            materialsUsed: materials,
            details: details,
            language: systemState.language || 'fr'
          })
        });

        const data = await res.json();
        if (data.error) {
          output.value = `${molarisT('soap.error')} ${data.error}`;
        } else {
          output.value = data.soapNote;
          playClinicalBeep(880, 'sine', 0.15);
        }
      } catch (err) {
        output.value = `${molarisT('soap.connectError')} ${err.message}`;
      }
      syncSignButton();
    });
  }

  // Sign = the reviewed text becomes a signed (immutable) note of the open chart.
  signBtn?.addEventListener('click', async () => {
    // Gaps the AI could not fill must be completed or deliberately left before signing.
    const gaps = (output.value.match(/\[\s*(à compléter|to be completed)\s*\]/gi) || []).length;
    if (gaps && !confirm(molarisT('soap.gapsConfirm').replace('{n}', gaps))) return;
    if (!confirm(molarisT('soap.signConfirm'))) return;
    signBtn.disabled = true;
    try {
      await Molaris.api.post('/api/soap/notes', {
        procedure: document.getElementById('soap-input-proc')?.value || molarisT('soap.defaultProcedure'),
        toothId: toothSelect?.value || undefined,
        anesthesiaUsed: document.getElementById('soap-input-anesthesia')?.value || '',
        materialsUsed: document.getElementById('soap-input-materials')?.value || undefined,
        content: output.value
      });
      resetSOAPForm();
      if (signStatus) signStatus.textContent = `✓ ${molarisT('soap.signed')}`;
      playClinicalBeep(880, 'sine', 0.2);
      loadSignedSOAPNotes();
    } catch (err) {
      Molaris.ui.toast(err.message, 'error');
      syncSignButton();
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = output?.value;
      if (text) {
        navigator.clipboard.writeText(text);
        copyBtn.textContent = molarisT('soap.copied');
        setTimeout(() => copyBtn.textContent = molarisT('soap.copyBtn'), 2000);
      }
    });
  }

  Molaris.events.on('patient-changed', () => {
    resetSOAPForm();
    if (signStatus) signStatus.textContent = '';
    loadSignedSOAPNotes();
  });
  Molaris.events.on('view-shown', ({ view }) => { if (view === 'soap') loadSignedSOAPNotes(); });
  Molaris.events.on('language-changed', loadSignedSOAPNotes);
}

// -----------------------------------------------------------------------------
// Signed notes of the open chart: read-only, with addenda (dated corrections).
// -----------------------------------------------------------------------------
async function loadSignedSOAPNotes() {
  const list = document.getElementById('soap-history-list');
  if (!list) return;
  let notes = [];
  try { notes = (await Molaris.api.get('/api/soap/history')).soapNotes || []; } catch (err) { return; }
  if (!notes.length) {
    list.innerHTML = `<p class="text-slate-400">${escapeHtml(molarisT('soap.historyEmpty'))}</p>`;
    return;
  }
  list.innerHTML = notes.map(n => `
    <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="font-semibold text-slate-900 dark:text-white">${escapeHtml(n.procedure)}${n.toothId ? ` · ${escapeHtml(String(fdiForToothId(n.toothId)))}` : ''}</span>
        <span class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(molarisT('soap.signedBy').replace('{author}', n.author || '').replace('{date}', Molaris.format.dateTime(n.timestamp)))}</span>
      </div>
      <pre class="whitespace-pre-wrap font-mono text-[11px] text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto">${escapeHtml(n.content)}</pre>
      ${(n.addenda || []).map(a => `
        <div class="border-l-2 border-amber-400 pl-2 text-[11px]">
          <span class="font-semibold text-amber-700 dark:text-amber-300">${escapeHtml(molarisT('soap.addendumLabel'))} — ${escapeHtml(Molaris.format.dateTime(a.timestamp))}${a.author ? ` · ${escapeHtml(a.author)}` : ''}</span>
          <div class="whitespace-pre-wrap text-slate-700 dark:text-slate-300">${escapeHtml(a.content)}</div>
        </div>`).join('')}
      <button type="button" data-addendum="${escapeHtml(n.id)}" class="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline">${escapeHtml(molarisT('soap.addendumBtn'))}</button>
    </div>`).join('');
  list.querySelectorAll('[data-addendum]').forEach(button => button.addEventListener('click', () => {
    Molaris.ui.modal({
      title: molarisT('soap.addendumBtn'),
      submitLabel: molarisT('soap.addendumSave'),
      bodyHtml: `
        <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1" for="soap-addendum-text">${escapeHtml(molarisT('soap.addendumPrompt'))}</label>
        <textarea id="soap-addendum-text" name="content" rows="5" required maxlength="5000" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"></textarea>`,
      onSubmit: async (form, { close }) => {
        const content = String(form.get('content') || '').trim();
        if (!content) return;
        await Molaris.api.post(`/api/soap/notes/${encodeURIComponent(button.dataset.addendum)}/addenda`, { content });
        close();
        loadSignedSOAPNotes();
      }
    });
  }));
}
