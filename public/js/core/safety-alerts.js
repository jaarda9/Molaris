// -----------------------------------------------------------------------------
// Shared Safety Alerts Banner Renderer (critical / warning / info)
// -----------------------------------------------------------------------------
function renderSafetyAlertsInto(containerId, alerts, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const parentCard = opts.parentCardId ? document.getElementById(opts.parentCardId) : null;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (parentCard) parentCard.classList.add('hidden');
    return;
  }

  const isFr = systemState.language === 'fr';
  container.innerHTML = alerts.map(a => {
    const label = a.severity === 'critical' ? (isFr ? 'CRITIQUE' : 'CRITICAL')
      : a.severity === 'warning' ? (isFr ? 'AVERTISSEMENT' : 'WARNING')
      : 'INFO';
    const icon = a.severity === 'info' ? 'ℹ️' : '⚠️';
    return `
      <div class="severity-${a.severity} border rounded-lg px-3 py-2 flex items-start gap-2 text-xs">
        <span class="font-bold whitespace-nowrap">${icon} ${label}:</span>
        <span>${escapeHtml(a.message)}</span>
      </div>
    `;
  }).join('');
  container.classList.remove('hidden');
  if (parentCard) parentCard.classList.remove('hidden');
}

async function fetchActivePatientSafetyAlerts() {
  try {
    const lang = systemState.language || 'en';
    const res = await fetch(`/api/patients/active?language=${lang}`);
    const data = await res.json();
    renderSafetyAlertsInto('safety-alerts-sidebar', data.safetyAlerts, { parentCardId: 'safety-alerts-card' });
    renderSafetyAlertsInto('safety-alerts-anesthesia', data.safetyAlerts);
  } catch (err) {
    console.warn('Failed to fetch active patient safety alerts:', err);
  }
}
