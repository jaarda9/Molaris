// -----------------------------------------------------------------------------
// Local Anesthetic Calculator Engine
// -----------------------------------------------------------------------------
async function fetchAnestheticsAndProtocols() {
  try {
    const res = await fetch('/api/anesthetics');
    const data = await res.json();
    systemState.anesthetics = data.anesthetics;
    renderAnestheticDrugOptions(data.anesthetics);
    renderProtocolsList(data.protocols);
    recalculateLA();
  } catch (err) {
    console.error(err);
  }
}

// French decimal comma in FR (11,1 carpules), dot in EN.
function formatDecimal(value) {
  return systemState.language === 'fr' ? String(value).replace('.', ',') : String(value);
}

function renderAnestheticDrugOptions(drugs) {
  const container = document.getElementById('anesthetic-drug-options');
  if (!container) return;
  container.innerHTML = '';

  drugs.forEach((drug, index) => {
    const isSelected = drug.id === systemState.selectedDrugId;
    const card = document.createElement('div');
    card.className = `cursor-pointer p-3 rounded-xl border text-xs transition ${
      isSelected
        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:border-teal-500'
        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
    }`;
    card.id = `drug-card-${drug.id}`;

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <span class="font-bold text-slate-900 dark:text-white">${escapeHtml(drug.name)}</span>
        <span class="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-semibold">${formatDecimal(drug.mgPerCartridge)} mg</span>
      </div>
      <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        ${escapeHtml(drug.vasoconstrictor)} &bull; ${escapeHtml(molarisT('la.maxLabel'))} ${formatDecimal(drug.maxDoseMgKg)} mg/kg
      </div>
    `;

    card.addEventListener('click', () => {
      systemState.selectedDrugId = drug.id;
      renderAnestheticDrugOptions(drugs);
      recalculateLA();
    });

    container.appendChild(card);
  });
}

function initAnesthesiaCalculator() {
  const weightInput = document.getElementById('calc-weight-input');
  const weightSlider = document.getElementById('calc-weight-slider');
  const cardiacToggle = document.getElementById('calc-cardiac-toggle');
  const minusBtn = document.getElementById('btn-carpule-minus');
  const plusBtn = document.getElementById('btn-carpule-plus');

  if (weightInput && weightSlider) {
    weightInput.addEventListener('input', () => {
      weightSlider.value = weightInput.value;
      recalculateLA();
    });
    weightSlider.addEventListener('input', () => {
      weightInput.value = weightSlider.value;
      recalculateLA();
    });
  }

  if (cardiacToggle) {
    cardiacToggle.addEventListener('change', () => {
      recalculateLA();
    });
  }

  if (minusBtn && plusBtn) {
    minusBtn.addEventListener('click', () => {
      if (systemState.deliveredCarpules > 0) {
        systemState.deliveredCarpules = Math.round((systemState.deliveredCarpules - 0.5) * 10) / 10;
        document.getElementById('calc-delivered-carpules').textContent = systemState.deliveredCarpules;
        recalculateLA();
      }
    });
    plusBtn.addEventListener('click', () => {
      systemState.deliveredCarpules = Math.round((systemState.deliveredCarpules + 0.5) * 10) / 10;
      document.getElementById('calc-delivered-carpules').textContent = systemState.deliveredCarpules;
      recalculateLA();
    });
  }
}

async function recalculateLA() {
  const weight = Number(document.getElementById('calc-weight-input')?.value) || 70;
  const isCardiac = !!document.getElementById('calc-cardiac-toggle')?.checked;

  try {
    const res = await fetch('/api/calc-la', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drugId: systemState.selectedDrugId,
        weightKg: weight,
        isCardiacRisk: isCardiac,
        carpulesGiven: systemState.deliveredCarpules,
        language: systemState.language || 'en'
      })
    });

    const data = await res.json();
    const isFr = systemState.language === 'fr';
    document.getElementById('calc-limiting-factor').textContent = `${isFr ? 'Facteur limitant :' : 'Limiting Factor:'} ${data.limitingFactor}`;
    document.getElementById('calc-res-max-carpules').textContent = `${formatDecimal(data.safeMaxCarpules)} ${molarisT('la.carpulesUnit')}`;
    document.getElementById('calc-res-max-mg').textContent = `${data.allowedMaxMg} mg`;
    document.getElementById('calc-res-remaining').textContent = `${formatDecimal(data.remainingCarpules)}`;

    const loggedEl = document.getElementById('calc-logged-today');
    if (loggedEl) {
      const logged = (data.loggedToday || []).map(d => `${formatDecimal(d.carpules)} × ${d.drugName}`).join(' + ');
      loggedEl.textContent = logged ? `${molarisT('la.form.loggedToday')} ${logged}` : '';
      loggedEl.classList.toggle('hidden', !logged);
    }
    const warningBanner = document.getElementById('calc-warning-banner');
    const warningText = document.getElementById('calc-warning-text');
    if (data.warning) {
      warningBanner.classList.remove('hidden');
      warningText.textContent = data.warning;
    } else {
      warningBanner.classList.add('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}
