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
