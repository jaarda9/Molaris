// -----------------------------------------------------------------------------
// Chairside Timer Widget (Etch 15s, Cure 20s, Custom)
// -----------------------------------------------------------------------------
let timerInterval = null;
let timerSecondsRemaining = 0;

function initChairsideTimer() {
  const display = document.getElementById('timer-display');
  const btn15 = document.getElementById('timer-btn-15');
  const btn20 = document.getElementById('timer-btn-20');
  const btnStop = document.getElementById('timer-btn-stop');

  function updateTimerText() {
    const mins = Math.floor(timerSecondsRemaining / 60);
    const secs = timerSecondsRemaining % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function startTimer(seconds) {
    clearInterval(timerInterval);
    timerSecondsRemaining = seconds;
    updateTimerText();
    btnStop.classList.remove('hidden');
    playClinicalBeep(520, 'sine', 0.1);

    timerInterval = setInterval(() => {
      timerSecondsRemaining--;
      updateTimerText();
      if (timerSecondsRemaining <= 0) {
        clearInterval(timerInterval);
        btnStop.classList.add('hidden');
        // Finish chime
        playClinicalBeep(880, 'sine', 0.4);
        setTimeout(() => playClinicalBeep(1046.5, 'sine', 0.4), 200);
      }
    }, 1000);
  }

  window.startChairsideTimer = startTimer;

  if (btn15) btn15.addEventListener('click', () => startTimer(15));
  if (btn20) btn20.addEventListener('click', () => startTimer(20));
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      clearInterval(timerInterval);
      timerSecondsRemaining = 0;
      updateTimerText();
      btnStop.classList.add('hidden');
    });
  }
}
