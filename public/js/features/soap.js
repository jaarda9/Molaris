// -----------------------------------------------------------------------------
// SOAP Progress Note Generator
// -----------------------------------------------------------------------------
const SOAP_EXAMPLE_FIELDS = [
  ['soap-input-proc', 'soap.exampleProc'],
  ['soap-input-anesthesia', 'soap.exampleAnesthesia'],
  ['soap-input-materials', 'soap.exampleMaterials'],
  ['soap-input-outcome', 'soap.exampleOutcome']
];
const SOAP_EXAMPLE_TOOTH_ID = 30; // FDI 46 (internal ids are Universal)

// Pre-fills a worked example in the UI language, and swaps it on a language
// change as long as the doctor has not typed over it.
function fillSOAPExample(previousLang) {
  SOAP_EXAMPLE_FIELDS.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const untouched = el.value === '' || (previousLang && el.value === molarisT(key, previousLang));
    if (untouched) el.value = molarisT(key);
  });
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

  fillSOAPExample();
  if (toothSelect) {
    fillFdiToothSelect(toothSelect);
    toothSelect.value = String(SOAP_EXAMPLE_TOOTH_ID);
  }

  let currentLang = systemState.language;
  Molaris.events.on('language-changed', ({ language }) => {
    fillSOAPExample(currentLang);
    currentLang = language;
    if (toothSelect) refreshSOAPToothSelect(toothSelect);
  });
  // Tooth names are only known once the odontogram has loaded.
  Molaris.events.on('view-shown', ({ view }) => {
    if (view === 'soap' && toothSelect) refreshSOAPToothSelect(toothSelect);
  });

  if (btn) {
    btn.addEventListener('click', async () => {
      const proc = document.getElementById('soap-input-proc')?.value;
      const toothId = toothSelect?.value;
      const anesthesia = document.getElementById('soap-input-anesthesia')?.value;
      const materials = document.getElementById('soap-input-materials')?.value;
      const details = document.getElementById('soap-input-outcome')?.value;

      const output = document.getElementById('soap-output-area');
      output.textContent = molarisT('soap.generating');

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
          output.textContent = `${molarisT('soap.error')} ${data.error}`;
        } else {
          output.textContent = data.soapNote;
          playClinicalBeep(880, 'sine', 0.15);
        }
      } catch (err) {
        output.textContent = `${molarisT('soap.connectError')} ${err.message}`;
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = document.getElementById('soap-output-area')?.textContent;
      if (text) {
        navigator.clipboard.writeText(text);
        copyBtn.textContent = molarisT('soap.copied');
        setTimeout(() => copyBtn.textContent = molarisT('soap.copyBtn'), 2000);
      }
    });
  }
}
