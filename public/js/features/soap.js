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
