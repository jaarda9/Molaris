// -----------------------------------------------------------------------------
// Shared Tooth Select Populator (Treatment Plan / Lab Cases)
// -----------------------------------------------------------------------------
function populateToothSelect(selectEl) {
  if (!selectEl) return;
  const firstOption = selectEl.options.length > 0 ? selectEl.options[0].cloneNode(true) : null;
  selectEl.innerHTML = '';
  if (firstOption) selectEl.appendChild(firstOption);

  const teeth = (systemState.teethData && systemState.teethData.length === 32)
    ? systemState.teethData
    : Array.from({ length: 32 }, (_, i) => ({ id: i + 1, name: '' }));

  teeth.slice().sort((a, b) => a.id - b.id).forEach(t => {
    const opt = document.createElement('option');
    opt.value = String(t.id);
    opt.textContent = t.name ? `#${t.id} — ${t.name}` : `#${t.id}`;
    selectEl.appendChild(opt);
  });
}

function isMaxillaryToothId(id) {
  return id >= 1 && id <= 16;
}

function isMolarToothId(id) {
  return [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(id);
}
