// -----------------------------------------------------------------------------
// X-rays: the patient's radiograph file (stored in the database, with the dentist's
// interpretation and, when asked, the AI second reading), plus teaching samples that are
// analysed but never stored.
// -----------------------------------------------------------------------------
const xrayState = {
  file: null,        // the new image being added (File)
  isSample: false,   // the new image is a teaching drawing
  list: [],          // the open patient's X-rays
  selectedId: null,  // X-ray shown in the reading panel
  sampleReading: ''  // AI reading of a teaching sample (not stored)
};

const XRAY_TOOTH_OPTIONS = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
  55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const xrayPatientId = () => (window.systemState && systemState.activePatient ? systemState.activePatient.id : null);
const xrayDay = (iso) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
const xrayKindLabel = (kind) => molarisT(`vision.kind.${kind}`);
const xrayIsToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

function initVisionUploader() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  if (!dropZone || !fileInput) return;

  fillXrayToothSelect();
  resetNewXrayForm();

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-teal-500'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-teal-500'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-teal-500');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) chooseXrayFile(e.dataTransfer.files[0], false);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files && fileInput.files[0]) chooseXrayFile(fileInput.files[0], false); });
  document.getElementById('remove-image-btn')?.addEventListener('click', clearXrayFile);

  document.querySelectorAll('.sample-case-btn').forEach(btn => btn.addEventListener('click', () => loadSampleDentalImage(btn.dataset.case)));
  document.getElementById('save-xray-btn')?.addEventListener('click', () => saveNewXray(false));
  document.getElementById('run-vision-btn')?.addEventListener('click', () => (xrayState.isSample ? analyzeSample() : saveNewXray(true)));
  document.getElementById('copy-vision-btn')?.addEventListener('click', copyXrayReading);

  Molaris.events.on('patient-changed', () => { resetNewXrayForm(); xrayState.selectedId = null; xrayState.sampleReading = ''; loadXrays(); });
  Molaris.events.on('view-shown', ({ view }) => { if (view === 'vision') loadXrays(); });
  Molaris.events.on('language-changed', () => { fillXrayToothSelect(); renderXrayGallery(); renderXrayReading(); syncNewXrayButtons(); });
  loadXrays();
}

function fillXrayToothSelect() {
  const select = document.getElementById('xray-tooth');
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(molarisT('vision.toothNone'))}</option>` +
    XRAY_TOOTH_OPTIONS.map(n => `<option value="${n}">${n}</option>`).join('');
  select.value = current;
}

function chooseXrayFile(file, isSample) {
  xrayState.file = file;
  xrayState.isSample = isSample;
  const preview = document.getElementById('image-preview');
  const reader = new FileReader();
  reader.onload = (e) => { preview.src = e.target.result; };
  reader.readAsDataURL(file);
  document.getElementById('preview-container').classList.remove('hidden');
  document.getElementById('drop-zone').classList.add('hidden');
  document.getElementById('sample-note').classList.toggle('hidden', !isSample);
  syncNewXrayButtons();
}

function clearXrayFile() {
  xrayState.file = null;
  xrayState.isSample = false;
  const input = document.getElementById('file-input');
  if (input) input.value = '';
  document.getElementById('preview-container')?.classList.add('hidden');
  document.getElementById('drop-zone')?.classList.remove('hidden');
  document.getElementById('sample-note')?.classList.add('hidden');
  syncNewXrayButtons();
}

function resetNewXrayForm() {
  clearXrayFile();
  const date = document.getElementById('xray-date');
  if (date) { date.value = Molaris.format.isoDate(); date.max = Molaris.format.isoDate(); }
  ['xray-interpretation', 'vision-query-input'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const tooth = document.getElementById('xray-tooth');
  if (tooth) tooth.value = '';
}

// A teaching sample can be analysed, never saved to a patient.
function syncNewXrayButtons() {
  const save = document.getElementById('save-xray-btn');
  const run = document.getElementById('run-vision-btn');
  if (save) save.classList.toggle('hidden', xrayState.isSample);
  if (run) run.textContent = molarisT(xrayState.isSample ? 'vision.analyzeSampleBtn' : 'vision.saveAnalyzeBtn');
}

async function loadXrays() {
  const patientId = xrayPatientId();
  const who = document.getElementById('xray-file-patient');
  if (who) who.textContent = systemState.activePatient ? `${systemState.activePatient.name} (${systemState.activePatient.chartId})` : '';
  if (!patientId) { xrayState.list = []; renderXrayGallery(); renderXrayReading(); return; }
  try {
    xrayState.list = (await Molaris.api.get(`/api/patients/${encodeURIComponent(patientId)}/xrays`)).xrays || [];
  } catch (err) {
    xrayState.list = [];
    Molaris.ui.toast(err.message, 'error');
  }
  if (xrayState.selectedId && !xrayState.list.some(x => x.id === xrayState.selectedId)) xrayState.selectedId = null;
  renderXrayGallery();
  renderXrayReading();
}

function renderXrayGallery() {
  const gallery = document.getElementById('xray-gallery');
  const count = document.getElementById('xray-count');
  if (!gallery) return;
  if (count) count.textContent = molarisT('vision.count').replace('{n}', xrayState.list.length);
  if (!xrayState.list.length) {
    gallery.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-slate-400">${escapeHtml(molarisT('vision.empty'))}</p>`;
    return;
  }
  gallery.innerHTML = xrayState.list.map(x => `
    <button type="button" data-xray="${escapeHtml(x.id)}" class="text-left rounded-xl border ${x.id === xrayState.selectedId ? 'border-teal-500 ring-2 ring-teal-500/30' : 'border-slate-200 dark:border-slate-800 hover:border-teal-400'} overflow-hidden bg-slate-50 dark:bg-slate-800/40">
      <div class="h-24 bg-black flex items-center justify-center overflow-hidden">
        <img src="/api/xrays/${encodeURIComponent(x.id)}/image" alt="" loading="lazy" class="object-contain max-h-24 w-full">
      </div>
      <div class="p-2 space-y-0.5">
        <div class="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">${escapeHtml(xrayKindLabel(x.kind))}${x.toothFdi ? ` · ${escapeHtml(x.toothFdi)}` : ''}</div>
        <div class="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <span class="font-mono">${escapeHtml(xrayDay(x.takenOn))}</span>
          ${x.interpretation ? `<span class="px-1 rounded bg-slate-200 dark:bg-slate-700">${escapeHtml(molarisT('vision.dentistLabel'))}</span>` : ''}
          ${x.aiAnalysis ? `<span class="px-1 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">${escapeHtml(molarisT('vision.hasAi'))}</span>` : ''}
        </div>
      </div>
    </button>`).join('');
  gallery.querySelectorAll('[data-xray]').forEach(btn => btn.addEventListener('click', () => {
    xrayState.selectedId = btn.dataset.xray;
    xrayState.sampleReading = '';
    renderXrayGallery();
    renderXrayReading();
  }));
}

function renderXrayReading() {
  const area = document.getElementById('vision-output-area');
  const copyBtn = document.getElementById('copy-vision-btn');
  if (!area) return;
  if (xrayState.sampleReading) {
    area.innerHTML = `<div class="markdown-content">${formatMarkdown(xrayState.sampleReading)}</div>`;
    copyBtn?.classList.remove('hidden');
    return;
  }
  const x = xrayState.list.find(item => item.id === xrayState.selectedId);
  if (!x) {
    area.innerHTML = `<p class="text-center py-16 text-slate-400">${escapeHtml(molarisT(xrayPatientId() ? 'vision.selectPrompt' : 'vision.noPatient'))}</p>`;
    copyBtn?.classList.add('hidden');
    return;
  }
  copyBtn?.classList.toggle('hidden', !(x.interpretation || x.aiAnalysis));
  const imageUrl = `/api/xrays/${encodeURIComponent(x.id)}/image`;
  area.innerHTML = `
    <div class="flex flex-wrap items-start gap-4">
      <a href="${imageUrl}" target="_blank" rel="noopener" title="${escapeHtml(molarisT('vision.openFull'))}" class="block w-full sm:w-64 shrink-0 rounded-xl overflow-hidden bg-black">
        <img src="${imageUrl}" alt="" class="object-contain max-h-56 w-full">
      </a>
      <div class="flex-1 min-w-[12rem] space-y-1">
        <div class="text-sm font-bold text-slate-900 dark:text-white">${escapeHtml(xrayKindLabel(x.kind))}${x.toothFdi ? ` · ${escapeHtml(x.toothFdi)}` : ''}</div>
        <div class="text-slate-500 dark:text-slate-400">${escapeHtml(xrayDay(x.takenOn))}${x.filename ? ` · ${escapeHtml(x.filename)}` : ''}</div>
        <a href="${imageUrl}" target="_blank" rel="noopener" class="inline-block text-teal-700 dark:text-teal-300 hover:underline">${escapeHtml(molarisT('vision.openFull'))} ↗</a>
        ${xrayIsToday(x.createdAt) ? `<div><button type="button" data-xray-delete class="text-rose-600 dark:text-rose-400 hover:underline">${escapeHtml(molarisT('vision.deleteBtn'))}</button></div>` : ''}
      </div>
    </div>
    <div class="space-y-1.5">
      <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(molarisT('vision.dentistTitle'))}</div>
      <textarea data-xray-interpretation rows="3" maxlength="10000" placeholder="${escapeHtml(molarisT('vision.interpretationPlaceholder'))}" class="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2">${escapeHtml(x.interpretation || '')}</textarea>
      <button type="button" data-xray-save class="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-semibold">${escapeHtml(molarisT('vision.saveInterpretation'))}</button>
    </div>
    <div class="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">${escapeHtml(molarisT('vision.aiTitle'))}</div>
        ${x.aiAt ? `<span class="text-[10px] text-slate-400">${escapeHtml(molarisT('vision.aiAt').replace('{date}', Molaris.format.dateTime(x.aiAt)))}</span>` : ''}
      </div>
      ${x.aiAnalysis
        ? `<div class="markdown-content">${formatMarkdown(x.aiAnalysis)}</div>`
        : `<p class="text-slate-400">${escapeHtml(molarisT('vision.aiNone'))}</p>`}
      <div class="flex flex-wrap gap-2 pt-1">
        <input data-xray-question type="text" maxlength="1000" placeholder="${escapeHtml(molarisT('vision.questionPlaceholder'))}" class="flex-1 min-w-[12rem] text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2">
        <button type="button" data-xray-analyze class="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-semibold">${escapeHtml(molarisT(x.aiAnalysis ? 'vision.aiRerun' : 'vision.aiRun'))}</button>
      </div>
    </div>`;

  area.querySelector('[data-xray-save]').addEventListener('click', async () => {
    try {
      await Molaris.api.put(`/api/xrays/${encodeURIComponent(x.id)}`, { interpretation: area.querySelector('[data-xray-interpretation]').value });
      Molaris.ui.toast(molarisT('vision.interpretationSaved'));
      await loadXrays();
    } catch (err) { Molaris.ui.toast(err.message, 'error'); }
  });
  area.querySelector('[data-xray-analyze]').addEventListener('click', (e) => analyzeStoredXray(x.id, area.querySelector('[data-xray-question]').value, e.currentTarget));
  area.querySelector('[data-xray-delete]')?.addEventListener('click', async () => {
    if (!confirm(molarisT('vision.deleteConfirm'))) return;
    try {
      await Molaris.api.del(`/api/xrays/${encodeURIComponent(x.id)}`);
      xrayState.selectedId = null;
      await loadXrays();
    } catch (err) { Molaris.ui.toast(err.message, 'error'); }
  });
}

function showXrayBusy() {
  const area = document.getElementById('vision-output-area');
  if (area) area.innerHTML = `<div class="flex items-center justify-center py-16 space-x-3 text-teal-600"><span class="w-3 h-3 rounded-full bg-teal-500 animate-ping"></span><span class="font-semibold text-sm">${escapeHtml(molarisT('vision.analyzing'))}</span></div>`;
}

async function analyzeStoredXray(id, question, button) {
  if (button) button.disabled = true;
  showXrayBusy();
  try {
    await Molaris.api.post(`/api/xrays/${encodeURIComponent(id)}/analyze`, { query: question || undefined, language: systemState.language || 'fr' });
    playClinicalBeep(880, 'sine', 0.2);
  } catch (err) {
    Molaris.ui.toast(`${molarisT('vision.error')} ${err.message}`, 'error');
  }
  await loadXrays();
}

// Saves the new image in the open patient's file; `analyze` then asks the AI for a reading.
async function saveNewXray(analyze) {
  const patientId = xrayPatientId();
  if (!patientId) return Molaris.ui.toast(molarisT('vision.noPatient'), 'error');
  if (!xrayState.file) return alert(molarisT('vision.noImage'));
  const buttons = [document.getElementById('save-xray-btn'), document.getElementById('run-vision-btn')];
  buttons.forEach(b => { if (b) b.disabled = true; });
  try {
    const form = new FormData();
    form.append('image', xrayState.file);
    form.append('kind', document.getElementById('xray-kind').value);
    form.append('takenOn', document.getElementById('xray-date').value || Molaris.format.isoDate());
    form.append('toothFdi', document.getElementById('xray-tooth').value);
    form.append('interpretation', document.getElementById('xray-interpretation').value);
    const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/xrays`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const question = document.getElementById('vision-query-input').value;
    xrayState.selectedId = data.xray.id;
    xrayState.sampleReading = '';
    resetNewXrayForm();
    Molaris.ui.toast(molarisT('vision.saved'));
    if (analyze) await analyzeStoredXray(data.xray.id, question);
    else await loadXrays();
  } catch (err) {
    Molaris.ui.toast(err.message, 'error');
  } finally {
    buttons.forEach(b => { if (b) b.disabled = false; });
  }
}

// A teaching drawing: read by the AI (labelled as a drawing), shown, never stored.
async function analyzeSample() {
  if (!xrayState.file) return;
  showXrayBusy();
  try {
    const form = new FormData();
    form.append('image', xrayState.file);
    form.append('query', document.getElementById('vision-query-input').value.trim());
    form.append('language', systemState.language || 'fr');
    form.append('sample', '1');
    const res = await fetch('/api/analyze-image', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    xrayState.sampleReading = data.analysis || '';
    xrayState.selectedId = null;
    renderXrayGallery();
    renderXrayReading();
  } catch (err) {
    xrayState.sampleReading = '';
    renderXrayReading();
    Molaris.ui.toast(`${molarisT('vision.error')} ${err.message}`, 'error');
  }
}

function copyXrayReading() {
  const btn = document.getElementById('copy-vision-btn');
  const x = xrayState.list.find(item => item.id === xrayState.selectedId);
  const text = xrayState.sampleReading
    || [x?.interpretation ? `${molarisT('vision.dentistTitle')} :\n${x.interpretation}` : '', x?.aiAnalysis ? `${molarisT('vision.aiTitle')} :\n${x.aiAnalysis}` : ''].filter(Boolean).join('\n\n');
  if (!text) return;
  navigator.clipboard.writeText(text);
  btn.textContent = molarisT('vision.copied');
  setTimeout(() => { btn.textContent = molarisT('vision.copyBtn'); }, 2000);
}

// Schematic teaching drawings (not radiographs): for demonstrations only, never stored.
function loadSampleDentalImage(caseType) {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f171e';
  ctx.fillRect(0, 0, 600, 400);
  ctx.fillStyle = '#1c2833';
  ctx.fillRect(0, 180, 600, 220);
  ctx.fillStyle = '#d5dbdb';
  ctx.strokeStyle = '#f4f6f7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(180, 80, 240, 120, [30, 30, 5, 5]);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(190, 200); ctx.lineTo(220, 340); ctx.lineTo(260, 340); ctx.lineTo(270, 200);
  ctx.moveTo(330, 200); ctx.lineTo(340, 335); ctx.lineTo(380, 335); ctx.lineTo(410, 200);
  ctx.fill();
  ctx.fillStyle = '#0f171e';
  ctx.beginPath();
  ctx.roundRect(230, 130, 140, 50, [10]);
  ctx.rect(235, 180, 15, 140);
  ctx.rect(350, 180, 15, 135);
  ctx.fill();
  ctx.fillStyle = '#05080b';
  ctx.beginPath();
  if (caseType === 'periapical') {
    ctx.arc(330, 110, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0e14';
    ctx.beginPath();
    ctx.arc(240, 350, 30, 0, Math.PI * 2);
  } else {
    ctx.arc(415, 120, 20, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = '#566573';
  ctx.font = '14px monospace';
  ctx.fillText(molarisT(caseType === 'periapical' ? 'vision.sampleWatermarkA' : 'vision.sampleWatermarkB'), 20, 30);
  canvas.toBlob((blob) => chooseXrayFile(new File([blob], `${caseType}-exemple.png`, { type: 'image/png' }), true));
}
