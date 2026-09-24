// -----------------------------------------------------------------------------
// Chairside timer, started by the assistant ("lance un minuteur de 20 secondes").
// No permanent widget: a small countdown pill appears bottom-right while it runs.
// -----------------------------------------------------------------------------
let timerInterval = null;
let timerSecondsRemaining = 0;
let timerHideTimeout = null;

function initChairsideTimer() {
  window.startChairsideTimer = startChairsideTimer;
}

function chairsideTimerPill() {
  let pill = document.getElementById('chairside-timer-pill');
  if (pill) return pill;
  pill = document.createElement('div');
  pill.id = 'chairside-timer-pill';
  pill.setAttribute('role', 'timer');
  pill.setAttribute('aria-live', 'polite');
  pill.className = 'hidden fixed bottom-5 right-5 z-50 flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 shadow-lg';
  pill.innerHTML = `
    <svg class="w-4 h-4 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    <span id="chairside-timer-display" class="font-mono font-bold text-lg text-teal-700 dark:text-teal-300">00:00</span>
    <button id="chairside-timer-stop" type="button" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"></button>`;
  document.body.appendChild(pill);
  pill.querySelector('#chairside-timer-stop').addEventListener('click', stopChairsideTimer);
  return pill;
}

function renderChairsideTimer() {
  const pill = chairsideTimerPill();
  const mins = Math.floor(timerSecondsRemaining / 60);
  const secs = timerSecondsRemaining % 60;
  pill.querySelector('#chairside-timer-display').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  pill.querySelector('#chairside-timer-stop').textContent = molarisT('timer.stop');
}

function startChairsideTimer(seconds) {
  clearInterval(timerInterval);
  clearTimeout(timerHideTimeout);
  timerSecondsRemaining = Math.max(1, Math.round(Number(seconds) || 0));
  renderChairsideTimer();
  chairsideTimerPill().classList.remove('hidden');
  playClinicalBeep(520, 'sine', 0.1);

  timerInterval = setInterval(() => {
    timerSecondsRemaining--;
    renderChairsideTimer();
    if (timerSecondsRemaining <= 0) {
      clearInterval(timerInterval);
      playClinicalBeep(880, 'sine', 0.4);
      setTimeout(() => playClinicalBeep(1046.5, 'sine', 0.4), 200);
      timerHideTimeout = setTimeout(() => chairsideTimerPill().classList.add('hidden'), 2500);
    }
  }, 1000);
}

function stopChairsideTimer() {
  clearInterval(timerInterval);
  clearTimeout(timerHideTimeout);
  timerSecondsRemaining = 0;
  chairsideTimerPill().classList.add('hidden');
}
