// Agenda / appointments: day view (one column per chair), week view (Mon–Sat),
// status workflow, waiting room, and WhatsApp reminders. Renders into #agenda-root.
// See CLAUDE.md for conventions.
(function () {
  const VIEW = 'view-agenda';
  const SLOT = 15;                              // minutes per grid row
  const ROW_PX = { day: 22, week: 16 };          // row height per view
  const DURATIONS = [15, 30, 45, 60, 90];
  const STATUSES = ['scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show'];
  const NEXT_STATUS = { scheduled: 'confirmed', confirmed: 'arrived', arrived: 'in_progress', in_progress: 'completed' };
  // Stored in French (the clinic's working language); translated for display only.
  const REASONS = [
    ['Consultation', 'consultation'], ['Détartrage', 'scaling'], ['Soins', 'care'], ['Endodontie', 'endo'],
    ['Extraction', 'extraction'], ['Prothèse', 'prosthesis'], ['Contrôle', 'checkup'], ['Urgence', 'emergency']
  ];

  // Full class strings (Tailwind CDN only generates classes it sees in the DOM).
  const STATUS_STYLE = {
    scheduled: { block: 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-800 dark:text-slate-100', pill: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-slate-300 dark:ring-slate-600', dot: 'bg-slate-400' },
    confirmed: { block: 'bg-sky-50 dark:bg-sky-950/70 border-sky-500 text-sky-950 dark:text-sky-100', pill: 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-200 ring-sky-300 dark:ring-sky-700', dot: 'bg-sky-500' },
    arrived: { block: 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-950 dark:text-amber-100', pill: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-200 ring-amber-300 dark:ring-amber-700', dot: 'bg-amber-500' },
    in_progress: { block: 'bg-violet-50 dark:bg-violet-950/60 border-violet-500 text-violet-950 dark:text-violet-100', pill: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-200 ring-violet-300 dark:ring-violet-700', dot: 'bg-violet-500' },
    completed: { block: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100', pill: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200 ring-emerald-300 dark:ring-emerald-700', dot: 'bg-emerald-500' },
    cancelled: { block: 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 line-through opacity-70', pill: 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700', dot: 'bg-slate-300 dark:bg-slate-600' },
    no_show: { block: 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200 opacity-80', pill: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 ring-rose-300 dark:ring-rose-700', dot: 'bg-rose-500' }
  };

  const BTN = 'px-3 py-2 rounded-xl text-xs font-semibold transition';
  const BTN_PRIMARY = `${BTN} bg-teal-600 hover:bg-teal-700 text-white shadow-sm`;
  const BTN_GHOST = `${BTN} bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200`;
  const INPUT = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500';
  const LABEL = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1';
  const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm';

  const state = {
    view: 'day',
    date: Molaris.format.isoDate(),
    settings: null,          // { hours: { start, end, days }, chairs }
    appointments: [],        // for the visible range
    today: [],               // today's appointments (waiting room)
    nextOpenDay: null,
    nextDayList: [],         // next open day's appointments (reminders)
    loaded: false,
    renderToken: 0
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  const t = (key, vars) => {
    let text = Molaris.i18n.t(key);
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
    return text;
  };
  const esc = (v) => escapeHtml(v);
  const locale = () => (Molaris.isFr() ? 'fr-FR' : 'en-GB');
  const pad = (n) => String(n).padStart(2, '0');

  const parseDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (iso, n) => { const d = parseDate(iso); d.setDate(d.getDate() + n); return Molaris.format.isoDate(d); };
  const weekday = (iso) => parseDate(iso).getDay();
  const mondayOf = (iso) => addDays(iso, -((weekday(iso) + 6) % 7));
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const toHhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const timeOf = (local) => local.slice(11, 16);
  const dateOf = (local) => local.slice(0, 10);
  const nowLocal = () => { const d = new Date(); return `${Molaris.format.isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const duration = (a) => Math.round((new Date(`${a.endAt}:00Z`) - new Date(`${a.startAt}:00Z`)) / 60000);
  const isOpenDay = (iso) => state.settings.hours.days.includes(weekday(iso));
  const isActive = (a) => a.status !== 'cancelled' && a.status !== 'no_show';
  // Arrivé / en cours / terminé / absent describe a visit on its day: never offered for a future day.
  const HAPPENED = ['arrived', 'in_progress', 'completed', 'no_show'];
  const isFutureDay = (a) => a.startAt.slice(0, 10) > Molaris.format.isoDate();
  const statusAllowed = (a, s) => !(HAPPENED.includes(s) && isFutureDay(a));

  const fmtLongDate = (iso) => parseDate(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDayShort = (iso) => parseDate(iso).toLocaleDateString(locale(), { weekday: 'short', day: '2-digit', month: '2-digit' });
  const fmtDayMonth = (iso) => parseDate(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
  const statusLabel = (s) => t(`agenda.status.${s}`);
  const reasonLabel = (r) => {
    const known = REASONS.find(([fr]) => fr.toLowerCase() === String(r || '').toLowerCase());
    return known ? t(`agenda.reason.${known[1]}`) : (r || '');
  };
  const waitText = (fromIso) => {
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(fromIso)) / 60000));
    return minutes < 60 ? t('agenda.waiting.minutes', { n: minutes }) : t('agenda.waiting.hours', { h: Math.floor(minutes / 60), m: minutes % 60 });
  };
  const nextOpenDayAfter = (iso) => {
    let d = iso;
    for (let i = 0; i < 7; i++) { d = addDays(d, 1); if (isOpenDay(d)) return d; }
    return addDays(iso, 1);
  };
  const shiftOpenDay = (iso, step) => {
    let d = iso;
    for (let i = 0; i < 7; i++) { d = addDays(d, step); if (isOpenDay(d)) return d; }
    return addDays(iso, step);
  };

  function findAppointment(id) {
    return state.appointments.find(a => a.id === id) || state.today.find(a => a.id === id) || state.nextDayList.find(a => a.id === id);
  }

  const ICON = {
    chevronLeft: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>',
    chevronRight: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>',
    plus: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>',
    clock: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg>',
    whatsapp: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
    check: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
    folder: '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    arrow: '<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
  function visibleRange() {
    if (state.view === 'week') {
      const from = mondayOf(state.date);
      return { from, to: addDays(from, 6) };
    }
    return { from: state.date, to: state.date };
  }

  async function load() {
    if (!state.settings) state.settings = (await Molaris.api.get('/api/agenda/settings')).settings;
    const today = Molaris.format.isoDate();
    const nextDay = nextOpenDayAfter(today);
    const { from, to } = visibleRange();
    const [visible, panels] = await Promise.all([
      Molaris.api.get(`/api/appointments?from=${from}&to=${to}`),
      Molaris.api.get(`/api/appointments?from=${today}&to=${nextDay}`)
    ]);
    state.appointments = visible.appointments;
    state.today = panels.appointments.filter(a => dateOf(a.startAt) === today);
    state.nextOpenDay = nextDay;
    state.nextDayList = panels.appointments.filter(a => dateOf(a.startAt) === nextDay);
    state.loaded = true;
  }

  async function refresh({ quiet = false } = {}) {
    const token = ++state.renderToken;
    try {
      await load();
      if (token !== state.renderToken) return;   // a newer refresh superseded this one
      render();
    } catch (err) {
      if (!quiet) Molaris.ui.toast(err.message, 'error');
    }
  }

  async function saveStatus(appointment, status) {
    const { appointment: updated } = await Molaris.api.put(`/api/appointments/${appointment.id}`, { status });
    Molaris.ui.toast(t('agenda.toast.status', { name: updated.patientName, status: statusLabel(status) }), 'info');
    await refresh();
    return updated;
  }

  async function sendReminder(appointment) {
    // Open the tab synchronously (inside the click) so pop-up blockers allow it.
    const win = window.open('', '_blank');
    if (!win) { Molaris.ui.toast(t('agenda.toast.popup'), 'error'); return null; }
    try {
      const { link, appointment: updated } = await Molaris.api.post(`/api/appointments/${appointment.id}/reminder`);
      win.opener = null;
      win.location.href = link;
      Molaris.ui.toast(t('agenda.toast.reminder'));
      await refresh();
      return updated;
    } catch (err) {
      win.close();
      Molaris.ui.toast(err.message, 'error');
      return null;
    }
  }

  async function openChart(appointment) {
    closeDetail();
    await Molaris.patients.select(appointment.patientId);
    document.getElementById('nav-tab-odontogram')?.click();
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  function render() {
    const root = document.getElementById('agenda-root');
    if (!root) return;
    const scroller = root.querySelector('[data-scroll]');
    const scrollTop = scroller ? scroller.scrollTop : null;
    const previousKey = root.dataset.renderedFor;
    const key = `${state.view}:${state.date}`;

    root.innerHTML = `
      <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div class="${CARD} !p-0 overflow-hidden">
          ${renderToolbar()}
          ${state.view === 'day' ? renderDay() : renderWeek()}
        </div>
        <div class="space-y-6">
          ${renderWaitingRoom()}
          ${renderReminders()}
          ${renderLegend()}
        </div>
      </div>`;
    root.dataset.renderedFor = key;

    const newScroller = root.querySelector('[data-scroll]');
    if (newScroller) {
      if (scrollTop !== null && previousKey === key) newScroller.scrollTop = scrollTop;
      else scrollToNow(newScroller);
    }
  }

  function scrollToNow(scroller) {
    const line = scroller.querySelector('[data-now-line]');
    const first = scroller.querySelector('[data-apt]');
    const target = line || first;
    if (target) scroller.scrollTop = Math.max(0, target.offsetTop - 120);
  }

  function renderToolbar() {
    const { from, to } = visibleRange();
    const shown = weekDays();
    const title = state.view === 'day'
      ? fmtLongDate(state.date)
      : t('agenda.weekOf', { from: fmtDayMonth(shown[0]), to: fmtLongDate(shown[shown.length - 1]) });
    const active = state.appointments.filter(isActive).length;
    const countText = active === 1 ? t('agenda.count1') : t('agenda.count', { n: active });
    const isToday = state.view === 'day' ? state.date === Molaris.format.isoDate() : from <= Molaris.format.isoDate() && Molaris.format.isoDate() <= to;
    const seg = (view) => `<button type="button" data-action="view" data-view="${view}" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${state.view === view ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}">${esc(t(`agenda.view.${view}`))}</button>`;

    return `
      <div class="flex flex-wrap items-center gap-3 justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div class="min-w-0">
          <h2 class="text-base font-bold text-slate-900 dark:text-white first-letter:uppercase truncate">${esc(title)}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">${esc(countText)} · ${esc(t('agenda.clickToBook'))}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
            <button type="button" data-action="prev" title="${esc(t('agenda.prev'))}" class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700">${ICON.chevronLeft}</button>
            <button type="button" data-action="today" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold ${isToday ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-200'} hover:bg-white dark:hover:bg-slate-700">${esc(t('agenda.today'))}</button>
            <button type="button" data-action="next" title="${esc(t('agenda.next'))}" class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700">${ICON.chevronRight}</button>
          </div>
          <input type="date" data-action="pick-date" value="${esc(state.date)}" class="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 dark:[color-scheme:dark]">
          <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">${seg('day')}${seg('week')}</div>
          <button type="button" data-action="settings" class="${BTN_GHOST} flex items-center gap-1.5">${ICON.clock}<span>${esc(t('agenda.hoursButton'))}</span></button>
          <button type="button" data-action="new" class="${BTN_PRIMARY} flex items-center gap-1.5">${ICON.plus}<span>${esc(t('agenda.new'))}</span></button>
        </div>
      </div>`;
  }

  /** Visible minute range: opening hours, stretched to include any appointment outside them. */
  function gridRange(appointments) {
    let start = toMin(state.settings.hours.start);
    let end = toMin(state.settings.hours.end);
    for (const a of appointments) {
      const s = toMin(timeOf(a.startAt));
      const e = dateOf(a.endAt) > dateOf(a.startAt) ? 24 * 60 : toMin(timeOf(a.endAt));
      start = Math.min(start, Math.floor(s / 60) * 60);
      end = Math.max(end, Math.ceil(e / 60) * 60);
    }
    start = Math.floor(start / SLOT) * SLOT;
    end = Math.ceil(end / SLOT) * SLOT;
    return { start, end, rows: (end - start) / SLOT };
  }

  /** Side-by-side lanes for appointments that overlap in one column (e.g. a cancelled one under its replacement). */
  function layoutLanes(appointments, range) {
    const items = appointments.map(a => {
      const s = toMin(timeOf(a.startAt));
      const e = dateOf(a.endAt) > dateOf(a.startAt) ? 24 * 60 : toMin(timeOf(a.endAt));
      return { a, s: Math.max(s, range.start), e: Math.min(Math.max(e, s + SLOT), range.end) };
    }).sort((x, y) => x.s - y.s || y.e - x.e);

    let cluster = [], clusterEnd = -1, laneEnds = [];
    const flush = () => { cluster.forEach(it => { it.lanes = laneEnds.length; }); cluster = []; laneEnds = []; clusterEnd = -1; };
    for (const it of items) {
      if (cluster.length && it.s >= clusterEnd) flush();
      let lane = laneEnds.findIndex(end => end <= it.s);
      if (lane < 0) { lane = laneEnds.length; laneEnds.push(it.e); } else laneEnds[lane] = it.e;
      it.lane = lane;
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.e);
    }
    flush();
    return items;
  }

  function renderGridLines(range, rowPx, withLabels) {
    let lines = '', labels = '';
    for (let i = 0; i <= range.rows; i++) {
      const min = range.start + i * SLOT;
      const top = i * rowPx;
      const onHour = min % 60 === 0;
      if (i < range.rows) {
        lines += `<div class="absolute inset-x-0 border-t ${onHour ? 'border-slate-200 dark:border-slate-700' : min % 30 === 0 ? 'border-slate-100 dark:border-slate-800' : 'border-slate-100/60 dark:border-slate-800/40 border-dashed'}" style="top:${top}px"></div>`;
      }
      if (withLabels && min % 30 === 0 && i < range.rows) {
        labels += `<div class="absolute right-2 -translate-y-1/2 text-[10px] font-mono ${onHour ? 'text-slate-600 dark:text-slate-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}" style="top:${top}px">${toHhmm(min)}</div>`;
      }
    }
    return { lines, labels };
  }

  function closedBands(range, rowPx) {
    // Shade the parts of the grid outside opening hours (visible only when an appointment stretched the range).
    const open = toMin(state.settings.hours.start), close = toMin(state.settings.hours.end);
    let html = '';
    if (range.start < open) html += `<div class="absolute inset-x-0 bg-slate-100/70 dark:bg-slate-800/40" style="top:0;height:${(open - range.start) / SLOT * rowPx}px"></div>`;
    if (range.end > close) html += `<div class="absolute inset-x-0 bg-slate-100/70 dark:bg-slate-800/40" style="top:${(close - range.start) / SLOT * rowPx}px;bottom:0"></div>`;
    return html;
  }

  function nowLine(dateIso, range, rowPx) {
    const now = nowLocal();
    if (dateOf(now) !== dateIso) return '';
    const min = toMin(timeOf(now));
    if (min < range.start || min > range.end) return '';
    return `<div data-now-line class="absolute inset-x-0 z-30 pointer-events-none" style="top:${(min - range.start) / SLOT * rowPx}px">
      <div class="h-0.5 bg-rose-500"></div><div class="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full bg-rose-500"></div></div>`;
  }

  function renderBlock(item, range, rowPx, compact) {
    const a = item.a;
    const style = STATUS_STYLE[a.status] || STATUS_STYLE.scheduled;
    const top = (item.s - range.start) / SLOT * rowPx;
    const height = Math.max(rowPx, (item.e - item.s) / SLOT * rowPx) - 2;
    const width = 100 / item.lanes;
    const tall = height >= rowPx * 2 - 2;
    const next = statusAllowed(a, NEXT_STATUS[a.status]) ? NEXT_STATUS[a.status] : null;
    const walkIn = !a.patientId;
    const reminder = a.reminderSentAt ? `<span title="${esc(t('agenda.reminders.sent'))}" class="text-emerald-600 dark:text-emerald-400 shrink-0">${ICON.whatsapp}</span>` : '';

    const quick = !compact && next && height >= rowPx - 2 ? `
      <button type="button" data-quick="${esc(a.id)}" data-status="${next}" title="${esc(statusLabel(next))}"
        class="absolute right-1 top-1 hidden group-hover:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 text-[10px] font-semibold text-teal-700 dark:text-teal-300 ring-1 ring-teal-600/30 hover:bg-teal-600 hover:text-white no-underline">
        ${ICON.arrow}<span>${esc(t(`agenda.next.${next}`))}</span></button>` : '';

    return `
      <div data-apt="${esc(a.id)}" title="${esc(`${timeOf(a.startAt)}–${timeOf(a.endAt)} · ${a.patientName} · ${reasonLabel(a.reason)} · ${statusLabel(a.status)}`)}"
        class="group absolute z-10 rounded-lg border-l-4 ${style.block} px-2 ${tall ? 'py-1' : 'py-0.5'} overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:z-20 transition-shadow"
        style="top:${top + 1}px;height:${height}px;left:calc(${item.lane * width}% + 2px);width:calc(${width}% - 4px)">
        <div class="flex items-center gap-1.5 ${compact ? 'text-[10px]' : 'text-[11px]'} leading-tight min-w-0">
          <span class="font-mono font-bold shrink-0 opacity-80">${esc(timeOf(a.startAt))}</span>
          <span class="font-semibold truncate">${esc(a.patientName)}</span>
          ${walkIn && !compact ? `<span class="shrink-0 px-1 rounded bg-white/70 dark:bg-slate-900/60 text-[9px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300 no-underline">${esc(t('agenda.walkInBadge'))}</span>` : ''}
          ${compact ? '' : reminder}
        </div>
        ${tall ? `<div class="text-[10px] leading-tight opacity-75 truncate mt-0.5">${esc([reasonLabel(a.reason), compact ? '' : statusLabel(a.status)].filter(Boolean).join(' · '))}</div>` : ''}
        ${tall && !compact && a.notes && height >= rowPx * 3 ? `<div class="text-[10px] leading-tight opacity-60 truncate">${esc(a.notes)}</div>` : ''}
        ${quick}
      </div>`;
  }

  function dayColumns(appointments) {
    const cols = [...state.settings.chairs];
    const named = new Set(appointments.map(a => a.chair).filter(Boolean));
    for (const chair of named) if (!cols.includes(chair)) cols.push(chair);
    if (!cols.length || appointments.some(a => !a.chair)) cols.push('');
    return cols;
  }

  function renderDay() {
    const rowPx = ROW_PX.day;
    const appointments = state.appointments;
    const range = gridRange(appointments);
    const cols = dayColumns(appointments);
    const { lines, labels } = renderGridLines(range, rowPx, true);
    const height = range.rows * rowPx;
    const showHeaders = cols.length > 1 || cols[0] !== '';
    const closed = !isOpenDay(state.date);

    const headers = showHeaders ? `
      <div class="sticky top-0 z-40 flex bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div class="w-14 shrink-0"></div>
        ${cols.map(chair => {
          const n = appointments.filter(a => (a.chair || '') === chair && isActive(a)).length;
          return `<div class="flex-1 min-w-[140px] px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span class="truncate">${esc(chair || t('agenda.noChair'))}</span><span class="text-[10px] font-semibold text-slate-400">${n}</span></div>`;
        }).join('')}
      </div>` : '';

    const columns = cols.map(chair => {
      const items = layoutLanes(appointments.filter(a => (a.chair || '') === chair), range);
      return `
        <div data-slot-col data-date="${esc(state.date)}" data-chair="${esc(chair)}" class="relative flex-1 min-w-[140px] border-l border-slate-200 dark:border-slate-800 cursor-copy hover:bg-teal-50/30 dark:hover:bg-teal-950/10" style="height:${height}px">
          ${closedBands(range, rowPx)}${lines}
          ${items.map(it => renderBlock(it, range, rowPx, false)).join('')}
          ${nowLine(state.date, range, rowPx)}
        </div>`;
    }).join('');

    const stats = renderDayStats(appointments);
    return `
      ${closed ? `<div class="mx-5 mt-4 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs">${esc(t('agenda.closedDay'))}</div>` : ''}
      ${stats}
      <div data-scroll class="max-h-[72vh] overflow-y-auto overflow-x-auto">
        ${headers}
        <div class="flex ${closed ? 'opacity-60' : ''}">
          <div class="relative w-14 shrink-0" style="height:${height}px">${labels}</div>
          ${columns}
        </div>
      </div>`;
  }

  function renderDayStats(appointments) {
    if (!appointments.length) {
      return `<div class="px-5 pt-4 pb-1 text-xs text-slate-400 dark:text-slate-500">${esc(t('agenda.empty'))}</div>`;
    }
    const counts = {};
    for (const a of appointments) counts[a.status] = (counts[a.status] || 0) + 1;
    return `<div class="px-5 pt-3 pb-2 flex flex-wrap gap-1.5">
      ${STATUSES.filter(s => counts[s]).map(s => `
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 text-[11px] font-semibold ${STATUS_STYLE[s].pill}">
          <span class="w-1.5 h-1.5 rounded-full ${STATUS_STYLE[s].dot}"></span>${esc(statusLabel(s))} <span class="opacity-70">${counts[s]}</span></span>`).join('')}
    </div>`;
  }

  /** Days shown in the week view: open days, plus any closed day that has appointments. */
  function weekDays() {
    const monday = mondayOf(state.date);
    const all = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const days = all.filter(d => isOpenDay(d) || state.appointments.some(a => dateOf(a.startAt) === d));
    return days.length ? days : all;
  }

  function renderWeek() {
    const rowPx = ROW_PX.week;
    const today = Molaris.format.isoDate();
    const days = weekDays();
    const range = gridRange(state.appointments);
    const { lines, labels } = renderGridLines(range, rowPx, true);
    const height = range.rows * rowPx;

    const headers = days.map(d => {
      const n = state.appointments.filter(a => dateOf(a.startAt) === d && isActive(a)).length;
      const isToday = d === today;
      return `<button type="button" data-action="open-day" data-date="${esc(d)}"
        class="flex-1 min-w-[110px] px-2 py-2 text-left border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60">
        <div class="text-xs font-bold first-letter:uppercase ${isToday ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-200'}">${esc(fmtDayShort(d))}</div>
        <div class="text-[10px] text-slate-400">${esc(n === 1 ? t('agenda.count1') : t('agenda.count', { n }))}</div>
      </button>`;
    }).join('');

    const columns = days.map(d => {
      const items = layoutLanes(state.appointments.filter(a => dateOf(a.startAt) === d), range);
      return `
        <div data-slot-col data-date="${esc(d)}" data-chair="" class="relative flex-1 min-w-[110px] border-l border-slate-200 dark:border-slate-800 cursor-copy ${d === today ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''} ${isOpenDay(d) ? '' : 'bg-slate-50 dark:bg-slate-800/30'} hover:bg-teal-50/30 dark:hover:bg-teal-950/10" style="height:${height}px">
          ${closedBands(range, rowPx)}${lines}
          ${items.map(it => renderBlock(it, range, rowPx, true)).join('')}
          ${nowLine(d, range, rowPx)}
        </div>`;
    }).join('');

    return `
      <div data-scroll class="max-h-[72vh] overflow-y-auto overflow-x-auto">
        <div class="sticky top-0 z-40 flex bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div class="w-14 shrink-0"></div>${headers}
        </div>
        <div class="flex">
          <div class="relative w-14 shrink-0" style="height:${height}px">${labels}</div>
          ${columns}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Side panels
  // ---------------------------------------------------------------------------
  function personRow(a, meta, actionsHtml) {
    return `
      <div data-apt="${esc(a.id)}" class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-700 cursor-pointer">
        <span class="w-2 h-2 rounded-full shrink-0 ${STATUS_STYLE[a.status].dot}"></span>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">${esc(a.patientName)}</div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${meta}</div>
        </div>
        ${actionsHtml || ''}
      </div>`;
  }

  const miniButton = (id, status, label, tone = 'teal') => `
    <button type="button" data-quick="${esc(id)}" data-status="${status}"
      class="shrink-0 px-2 py-1 rounded-lg text-[11px] font-semibold ${tone === 'rose' ? 'text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60' : 'bg-teal-600 hover:bg-teal-700 text-white'}">${esc(label)}</button>`;

  function renderWaitingRoom() {
    const now = nowLocal();
    const today = state.today;
    const inChair = today.filter(a => a.status === 'in_progress');
    const waiting = today.filter(a => a.status === 'arrived')
      .sort((x, y) => (x.arrivedAt || x.startAt).localeCompare(y.arrivedAt || y.startAt));
    const expected = today.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
    const late = expected.filter(a => a.startAt < now);
    const next = expected.find(a => a.startAt >= now);

    const chairMeta = (a) => [a.chair, reasonLabel(a.reason), t('agenda.waiting.startedAt', { time: timeOf(a.startAt) })].filter(Boolean).map(esc).join(' · ');
    const waitMeta = (a) => {
      const since = a.arrivedAt ? t('agenda.waiting.since', { time: Molaris.format.time(a.arrivedAt), wait: waitText(a.arrivedAt) }) : '';
      return [esc(t('agenda.waiting.appointmentAt', { time: timeOf(a.startAt) })), since ? `<span class="${a.arrivedAt && Date.now() - Date.parse(a.arrivedAt) > 20 * 60000 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}">${esc(since)}</span>` : ''].filter(Boolean).join(' · ');
    };

    const section = (title, count, body) => `
      <div class="space-y-2">
        <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <span>${esc(title)}</span>${count !== null ? `<span class="px-1.5 rounded-full bg-slate-100 dark:bg-slate-800">${count}</span>` : ''}
        </div>${body}
      </div>`;

    return `
      <div class="${CARD} space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">${esc(t('agenda.waiting.title'))}</h3>
          <span class="text-[11px] text-slate-400 first-letter:uppercase">${esc(fmtDayShort(Molaris.format.isoDate()))}</span>
        </div>
        ${inChair.length ? section(t('agenda.waiting.inChair'), null, inChair.map(a => personRow(a, chairMeta(a), miniButton(a.id, 'completed', t('agenda.waiting.finish')))).join('')) : ''}
        ${section(t('agenda.waiting.waiting'), waiting.length, waiting.length
          ? waiting.map(a => personRow(a, waitMeta(a), miniButton(a.id, 'in_progress', t('agenda.waiting.callIn')))).join('')
          : `<p class="text-xs text-slate-400 dark:text-slate-500 py-1">${esc(t('agenda.waiting.empty'))}</p>`)}
        ${late.length ? section(t('agenda.waiting.late'), late.length, late.map(a => personRow(a,
          [esc(t('agenda.waiting.appointmentAt', { time: timeOf(a.startAt) })), esc(reasonLabel(a.reason))].filter(Boolean).join(' · '),
          `<div class="flex gap-1">${miniButton(a.id, 'no_show', t('agenda.waiting.markNoShow'), 'rose')}${miniButton(a.id, 'arrived', t('agenda.waiting.markArrived'))}</div>`)).join('')) : ''}
        ${section(t('agenda.waiting.nextPatient'), null, next
          ? personRow(next, [timeOf(next.startAt), next.chair, reasonLabel(next.reason)].filter(Boolean).map(esc).join(' · '), miniButton(next.id, 'arrived', t('agenda.waiting.markArrived')))
          : `<p class="text-xs text-slate-400 dark:text-slate-500 py-1">${esc(t('agenda.waiting.noneNext'))}</p>`)}
      </div>`;
  }

  function renderReminders() {
    const list = state.nextDayList.filter(isActive);
    const toSend = list.filter(a => !a.reminderSentAt);
    const sent = list.filter(a => a.reminderSentAt);
    const row = (a) => {
      const meta = [timeOf(a.startAt), reasonLabel(a.reason), a.phone || t('agenda.reminders.noPhone')].filter(Boolean).map(esc).join(' · ');
      const action = a.reminderSentAt
        ? `<span class="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">${ICON.check}${esc(t('agenda.reminders.sent'))}</span>`
        : a.phone
          ? `<button type="button" data-remind="${esc(a.id)}" class="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">${ICON.whatsapp}${esc(t('agenda.reminders.send'))}</button>`
          : `<span class="shrink-0 text-[11px] text-rose-600 dark:text-rose-400">${esc(t('agenda.reminders.noPhone'))}</span>`;
      return personRow(a, meta, action);
    };
    return `
      <div class="${CARD} space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">${esc(t('agenda.reminders.title', { day: parseDate(state.nextOpenDay).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' }) }))}</h3>
          ${list.length ? `<span class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${toSend.length ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'}">${esc(toSend.length ? t('agenda.reminders.toSend', { n: toSend.length }) : t('agenda.reminders.allSent'))}</span>` : ''}
        </div>
        ${list.length ? `<div class="space-y-2">${toSend.map(row).join('')}${sent.map(row).join('')}</div>`
          : `<p class="text-xs text-slate-400 dark:text-slate-500">${esc(t('agenda.reminders.none'))}</p>`}
      </div>`;
  }

  function renderLegend() {
    return `
      <div class="${CARD} !p-4">
        <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">${esc(t('agenda.legend'))}</div>
        <div class="flex flex-wrap gap-1.5">
          ${STATUSES.map(s => `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 text-[11px] font-semibold ${STATUS_STYLE[s].pill}"><span class="w-1.5 h-1.5 rounded-full ${STATUS_STYLE[s].dot}"></span>${esc(statusLabel(s))}</span>`).join('')}
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Appointment detail (one click to change status, open the chart, remind)
  // ---------------------------------------------------------------------------
  let detailOverlay = null;
  let detailId = null;

  function closeDetail() {
    detailOverlay?.remove();
    detailOverlay = null;
    detailId = null;
  }

  function openDetail(appointment) {
    closeDetail();
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4';
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeDetail(); });
    detailOverlay = overlay;
    document.body.appendChild(overlay);
    fillDetail(appointment);
  }

  function fillDetail(a) {
    const overlay = detailOverlay;
    if (!overlay) return;
    detailId = a.id;
    const style = STATUS_STYLE[a.status];
    const row = (label, value) => value ? `
      <div class="flex gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div class="w-24 shrink-0 text-slate-500 dark:text-slate-400">${esc(label)}</div>
        <div class="flex-1 text-slate-800 dark:text-slate-200 whitespace-pre-line break-words">${value}</div>
      </div>` : '';
    const reminderText = a.reminderSentAt
      ? `<span class="text-emerald-600 dark:text-emerald-400">${esc(t('agenda.detail.reminderSent', { when: Molaris.format.dateTime(a.reminderSentAt) }))}</span>`
      : esc(t('agenda.detail.reminderNotSent'));

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-l-8 rounded-t-2xl ${style.block.split(' ').filter(c => c.startsWith('border-') || c.startsWith('dark:border-')).join(' ')}">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-base font-bold text-slate-900 dark:text-white truncate">${esc(a.patientName)}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 first-letter:uppercase">
                ${esc(fmtLongDate(dateOf(a.startAt)))} · <span class="font-mono font-semibold text-slate-700 dark:text-slate-200">${esc(timeOf(a.startAt))}–${esc(timeOf(a.endAt))}</span>
                (${esc(t('agenda.form.minutes', { n: duration(a) }))})${a.chair ? ` · ${esc(a.chair)}` : ''}
              </p>
            </div>
            <button type="button" data-close title="${esc(t('agenda.detail.close'))}" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none">&times;</button>
          </div>
        </div>
        <div class="px-5 pb-5 space-y-4 text-xs">
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">${esc(t('agenda.detail.status'))}</div>
            <div class="flex flex-wrap gap-1.5">
              ${STATUSES.filter(s => s === a.status || statusAllowed(a, s)).map(s => `
                <button type="button" data-set-status="${s}" ${s === a.status ? 'aria-pressed="true"' : ''}
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 transition ${s === a.status ? `${STATUS_STYLE[s].pill} ring-2 shadow-sm` : 'ring-slate-200 dark:ring-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}">
                  <span class="w-1.5 h-1.5 rounded-full ${STATUS_STYLE[s].dot}"></span>${esc(statusLabel(s))}${s === a.status ? ICON.check : ''}
                </button>`).join('')}
            </div>
            ${a.status === 'arrived' && a.arrivedAt ? `<p class="mt-2 text-amber-700 dark:text-amber-300">${esc(t('agenda.detail.arrivedAt', { time: Molaris.format.time(a.arrivedAt) }))} · ${esc(waitText(a.arrivedAt))}</p>` : ''}
          </div>
          <div>
            ${row(t('agenda.detail.chart'), a.chartId ? `<span class="font-mono">${esc(a.chartId)}</span>` : `<span class="text-amber-700 dark:text-amber-300">${esc(t('agenda.detail.noChart'))}</span>`)}
            ${row(t('agenda.detail.phone'), a.phone ? `<span class="font-mono">${esc(a.phone)}</span>` : `<span class="text-slate-400">—</span>`)}
            ${row(t('agenda.detail.reason'), esc(reasonLabel(a.reason)))}
            ${row(t('agenda.detail.notes'), esc(a.notes || ''))}
            ${row(t('agenda.detail.reminder'), reminderText)}
          </div>
          <div class="flex flex-wrap gap-2 pt-1">
            ${a.patientId
              ? `<button type="button" data-detail="chart" class="${BTN_PRIMARY} inline-flex items-center gap-1.5">${ICON.folder}${esc(t('agenda.detail.openChart'))}</button>`
              : `<button type="button" data-detail="create-chart" class="${BTN_PRIMARY} inline-flex items-center gap-1.5">${ICON.folder}${esc(t('agenda.detail.createChart'))}</button>`}
            ${a.phone && isActive(a) && a.status !== 'completed' && new Date(a.startAt) > new Date() ? `<button type="button" data-detail="remind" class="${BTN} bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5">${ICON.whatsapp}${esc(t('agenda.detail.whatsapp'))}</button>` : ''}
            <button type="button" data-detail="edit" class="${BTN_GHOST}">${esc(t('agenda.detail.edit'))}</button>
            <button type="button" data-detail="delete" class="${BTN} ml-auto ${HAPPENED.includes(a.status) ? 'hidden' : ''} text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50">${esc(t('agenda.detail.delete'))}</button>
          </div>
          <p data-delete-hint class="hidden text-[11px] text-slate-500 dark:text-slate-400">${esc(t('agenda.detail.deleteHint'))}</p>
        </div>
      </div>`;

    overlay.querySelector('[data-close]').addEventListener('click', closeDetail);
    overlay.querySelectorAll('[data-set-status]').forEach(btn => btn.addEventListener('click', async () => {
      if (btn.dataset.setStatus === a.status) return;
      btn.disabled = true;
      try {
        fillDetail(await saveStatus(a, btn.dataset.setStatus));
      } catch (err) {
        Molaris.ui.toast(err.message, 'error');
        btn.disabled = false;
      }
    }));
    overlay.querySelector('[data-detail="chart"]')?.addEventListener('click', () => openChart(a).catch(err => Molaris.ui.toast(err.message, 'error')));
    // A caller booked without a chart: create it from their name and phone, then attach this visit to it.
    overlay.querySelector('[data-detail="create-chart"]')?.addEventListener('click', async () => {
      closeDetail();
      const patient = await Molaris.patients.create({ name: a.patientName, phone: a.phone || '', chiefComplaint: a.reason ? reasonLabel(a.reason) : '' });
      if (!patient) return;
      try {
        await Molaris.api.put(`/api/appointments/${a.id}`, { patientId: patient.id });
        Molaris.ui.toast(t('agenda.toast.chartLinked'));
      } catch (err) {
        Molaris.ui.toast(err.message, 'error');
      }
      await refresh();
    });
    overlay.querySelector('[data-detail="remind"]')?.addEventListener('click', async () => {
      const updated = await sendReminder(a);
      if (updated) fillDetail(updated);
    });
    overlay.querySelector('[data-detail="edit"]').addEventListener('click', () => { closeDetail(); openForm(a); });
    const del = overlay.querySelector('[data-detail="delete"]');
    del.addEventListener('click', async () => {
      if (!del.dataset.armed) {
        del.dataset.armed = '1';
        del.textContent = t('agenda.detail.confirmDelete');
        del.classList.add('bg-rose-600', 'text-white', 'hover:bg-rose-700');
        overlay.querySelector('[data-delete-hint]').classList.remove('hidden');
        return;
      }
      try {
        await Molaris.api.del(`/api/appointments/${a.id}`);
        closeDetail();
        Molaris.ui.toast(t('agenda.toast.deleted'));
        await refresh();
      } catch (err) {
        Molaris.ui.toast(err.message, 'error');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Create / edit form
  // ---------------------------------------------------------------------------
  /** First configured chair that is free for [startAt, startAt+minutes) in the loaded data. */
  function freeChair(date, time, minutes) {
    const chairs = state.settings.chairs;
    if (!chairs.length) return '';
    const start = `${date}T${time}`;
    const endMin = toMin(time) + minutes;
    const end = `${date}T${toHhmm(Math.min(endMin, 24 * 60 - 1))}`;
    const pool = [...state.appointments, ...state.today, ...state.nextDayList].filter(isActive);
    return chairs.find(c => !pool.some(a => a.chair === c && a.startAt < end && a.endAt > start)) || chairs[0];
  }

  function timeOptions(selected) {
    const open = toMin(state.settings.hours.start), close = toMin(state.settings.hours.end);
    const from = Math.max(0, Math.floor((open - 60) / 60) * 60), to = Math.min(24 * 60 - SLOT, close + 60);
    const values = [];
    for (let m = from; m <= to; m += SLOT) values.push(toHhmm(m));
    if (selected && !values.includes(selected)) values.push(selected);
    values.sort();
    return values.map(v => {
      const outside = toMin(v) < open || toMin(v) >= close;
      return `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}${outside ? ' ·' : ''}</option>`;
    }).join('');
  }

  function openForm(existing, preset = {}) {
    const isEdit = !!existing;
    const date = existing ? dateOf(existing.startAt) : (preset.date || state.date);
    const time = existing ? timeOf(existing.startAt) : (preset.time || defaultTime(date));
    const minutes = existing ? duration(existing) : 30;
    const chair = existing ? (existing.chair || '') : (preset.chair !== undefined && preset.chair !== '' ? preset.chair : freeChair(date, time, minutes));
    const walkIn = existing ? !existing.patientId : false;
    const durations = DURATIONS.includes(minutes) ? DURATIONS : [...DURATIONS, minutes].sort((x, y) => x - y);
    const chairs = [...state.settings.chairs];
    if (chair && !chairs.includes(chair)) chairs.push(chair);

    const radio = (value, label, checked) => `
      <label class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer border-slate-300 dark:border-slate-700 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 dark:has-[:checked]:bg-teal-950/40">
        <input type="radio" name="mode" value="${value}" ${checked ? 'checked' : ''} class="accent-teal-600">
        <span class="font-semibold text-slate-700 dark:text-slate-200">${esc(label)}</span>
      </label>`;

    const bodyHtml = `
      <div class="flex gap-2">${radio('existing', t('agenda.form.existing'), !walkIn)}${radio('walkin', t('agenda.form.newCaller'), walkIn)}</div>
      <div data-mode="existing" class="${walkIn ? 'hidden' : ''}">
        <label class="${LABEL}">${esc(t('agenda.form.patient'))}</label>
        <select name="patientId" class="${INPUT}"><option>${esc(t('agenda.loading'))}</option></select>
      </div>
      <div data-mode="walkin" class="${walkIn ? '' : 'hidden'} grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="${LABEL}">${esc(t('agenda.form.name'))}</label>
          <input name="patientLabel" maxlength="120" value="${esc(existing?.patientLabel || '')}" placeholder="${esc(t('agenda.form.namePlaceholder'))}" class="${INPUT}"></div>
        <div><label class="${LABEL}">${esc(t('agenda.form.phone'))}</label>
          <input name="patientPhone" type="tel" maxlength="40" value="${esc(existing?.patientPhone || '')}" placeholder="${esc(t('agenda.form.phonePlaceholder'))}" class="${INPUT} font-mono"></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="col-span-2 sm:col-span-1"><label class="${LABEL}">${esc(t('agenda.form.date'))}</label>
          <input name="date" type="date" required value="${esc(date)}" class="${INPUT} dark:[color-scheme:dark]"></div>
        <div><label class="${LABEL}">${esc(t('agenda.form.start'))}</label>
          <select name="time" class="${INPUT} font-mono">${timeOptions(time)}</select></div>
        <div><label class="${LABEL}">${esc(t('agenda.form.duration'))}</label>
          <select name="duration" class="${INPUT}">${durations.map(d => `<option value="${d}" ${d === minutes ? 'selected' : ''}>${esc(t('agenda.form.minutes', { n: d }))}</option>`).join('')}</select></div>
        <div class="col-span-2 sm:col-span-1"><label class="${LABEL}">${esc(t('agenda.form.chair'))}</label>
          <select name="chair" class="${INPUT}">
            <option value="">—</option>
            ${chairs.map(c => `<option value="${esc(c)}" ${c === chair ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select></div>
      </div>
      <div><label class="${LABEL}">${esc(t('agenda.form.reason'))}</label>
        <input name="reason" list="agenda-reasons" maxlength="120" value="${esc(existing?.reason || '')}" placeholder="${esc(t('agenda.form.reasonPlaceholder'))}" class="${INPUT}">
        <datalist id="agenda-reasons">${REASONS.map(([fr, key]) => `<option value="${esc(fr)}">${Molaris.isFr() ? '' : esc(t(`agenda.reason.${key}`))}</option>`).join('')}</datalist>
        <div class="flex flex-wrap gap-1 mt-1.5">${REASONS.map(([fr, key]) => `<button type="button" data-reason="${esc(fr)}" class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-[11px] text-slate-600 dark:text-slate-300">${esc(t(`agenda.reason.${key}`))}</button>`).join('')}</div>
      </div>
      <div><label class="${LABEL}">${esc(t('agenda.form.notes'))}</label>
        <textarea name="notes" rows="2" maxlength="2000" placeholder="${esc(t('agenda.form.notesPlaceholder'))}" class="${INPUT}">${esc(existing?.notes || '')}</textarea></div>`;

    const modal = Molaris.ui.modal({
      title: t(isEdit ? 'agenda.form.editTitle' : 'agenda.form.newTitle'),
      bodyHtml,
      submitLabel: isEdit ? undefined : t('agenda.form.book'),
      async onSubmit(form, { close }) {
        const isWalkIn = form.get('mode') === 'walkin';
        const body = {
          startAt: `${form.get('date')}T${form.get('time')}`,
          durationMinutes: Number(form.get('duration')),
          chair: form.get('chair') || null,
          reason: String(form.get('reason') || '').trim() || null,
          notes: String(form.get('notes') || '').trim() || null
        };
        if (isWalkIn) {
          Object.assign(body, { patientId: null, patientLabel: String(form.get('patientLabel') || '').trim(), patientPhone: String(form.get('patientPhone') || '').trim() });
        } else {
          if (!form.get('patientId')) throw new Error(t('agenda.form.pickPatient'));
          Object.assign(body, { patientId: form.get('patientId'), patientLabel: null, ...(isEdit && !existing.patientId ? { patientPhone: null } : {}) });
        }
        // A 409 (slot taken) throws here: the modal shows the message and stays open.
        const { appointment, warnings = [] } = isEdit
          ? await Molaris.api.put(`/api/appointments/${existing.id}`, body)
          : await Molaris.api.post('/api/appointments', body);
        close();
        Molaris.ui.toast(t(isEdit ? 'agenda.toast.updated' : 'agenda.toast.created'));
        // Saved, but worth knowing (e.g. the lab work is not back before this fitting).
        if (warnings.length) alert(`⚠️ ${warnings.join('\n\n⚠️ ')}`);
        // Jump to the booked day so the secretary sees the result.
        state.date = dateOf(appointment.startAt);
        await refresh();
      }
    });

    const { form } = modal;
    const nameInput = form.querySelector('[name="patientLabel"]');
    const phoneInput = form.querySelector('[name="patientPhone"]');
    const syncMode = () => {
      const mode = form.querySelector('[name="mode"]:checked').value;
      form.querySelectorAll('[data-mode]').forEach(el => el.classList.toggle('hidden', el.dataset.mode !== mode));
      nameInput.required = phoneInput.required = mode === 'walkin';
    };
    form.querySelectorAll('[name="mode"]').forEach(r => r.addEventListener('change', syncMode));
    syncMode();
    form.querySelectorAll('[data-reason]').forEach(b => b.addEventListener('click', () => {
      form.querySelector('[name="reason"]').value = b.dataset.reason;
    }));
    Molaris.patients.fillSelect(form.querySelector('[name="patientId"]'), existing?.patientId || preset.patientId || '', { allowEmpty: true })
      .catch(err => Molaris.ui.toast(err.message, 'error'));
  }

  function defaultTime(date) {
    const open = toMin(state.settings.hours.start);
    if (date !== Molaris.format.isoDate()) return toHhmm(open);
    const d = new Date();
    const next = Math.ceil((d.getHours() * 60 + d.getMinutes()) / SLOT) * SLOT;
    return toHhmm(Math.min(Math.max(open, next), toMin(state.settings.hours.end) - SLOT));
  }

  // ---------------------------------------------------------------------------
  // Opening hours & chairs
  // ---------------------------------------------------------------------------
  function openSettings() {
    const { hours, chairs } = state.settings;
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayName = (n) => new Date(2026, 0, 4 + n).toLocaleDateString(locale(), { weekday: 'short' }); // 2026-01-04 is a Sunday
    Molaris.ui.modal({
      title: t('agenda.settings.title'),
      bodyHtml: `
        <div class="grid grid-cols-2 gap-3">
          <div><label class="${LABEL}">${esc(t('agenda.settings.open'))}</label><input name="start" type="time" step="900" required value="${esc(hours.start)}" class="${INPUT} dark:[color-scheme:dark]"></div>
          <div><label class="${LABEL}">${esc(t('agenda.settings.close'))}</label><input name="end" type="time" step="900" required value="${esc(hours.end)}" class="${INPUT} dark:[color-scheme:dark]"></div>
        </div>
        <div><label class="${LABEL}">${esc(t('agenda.settings.days'))}</label>
          <div class="flex flex-wrap gap-1.5">${dayOrder.map(n => `
            <label class="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer has-[:checked]:bg-teal-600 has-[:checked]:border-teal-600 has-[:checked]:text-white text-slate-600 dark:text-slate-300 font-semibold first-letter:uppercase">
              <input type="checkbox" name="days" value="${n}" class="sr-only" ${hours.days.includes(n) ? 'checked' : ''}>${esc(dayName(n))}</label>`).join('')}
          </div></div>
        <div><label class="${LABEL}">${esc(t('agenda.settings.chairs'))}</label>
          <textarea name="chairs" rows="3" class="${INPUT}" placeholder="${esc(t('agenda.settings.chairsPlaceholder'))}">${esc(chairs.join('\n'))}</textarea>
          <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">${esc(t('agenda.settings.chairsHint'))}</p></div>`,
      async onSubmit(form, { close }) {
        const { settings } = await Molaris.api.put('/api/agenda/settings', {
          hours: { start: form.get('start'), end: form.get('end'), days: form.getAll('days').map(Number) },
          chairs: String(form.get('chairs') || '').split('\n')
        });
        state.settings = settings;
        close();
        Molaris.ui.toast(t('agenda.toast.hoursSaved'));
        await refresh();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  function onRootClick(e) {
    const target = e.target;

    const quick = target.closest('[data-quick]');
    if (quick) {
      e.stopPropagation();
      const a = findAppointment(quick.dataset.quick);
      if (a) { quick.disabled = true; saveStatus(a, quick.dataset.status).catch(err => { Molaris.ui.toast(err.message, 'error'); quick.disabled = false; }); }
      return;
    }
    const remind = target.closest('[data-remind]');
    if (remind) {
      const a = findAppointment(remind.dataset.remind);
      if (a) sendReminder(a);
      return;
    }
    const apt = target.closest('[data-apt]');
    if (apt) {
      const a = findAppointment(apt.dataset.apt);
      if (a) openDetail(a);
      return;
    }
    const action = target.closest('[data-action]');
    if (action) {
      const name = action.dataset.action;
      if (name === 'prev' || name === 'next') {
        const step = name === 'prev' ? -1 : 1;
        state.date = state.view === 'week' ? addDays(state.date, 7 * step) : shiftOpenDay(state.date, step);
        refresh();
      } else if (name === 'today') {
        state.date = Molaris.format.isoDate();
        refresh();
      } else if (name === 'view') {
        state.view = action.dataset.view;
        refresh();
      } else if (name === 'open-day') {
        state.date = action.dataset.date;
        state.view = 'day';
        refresh();
      } else if (name === 'new') {
        openForm(null, {});
      } else if (name === 'settings') {
        openSettings();
      }
      return;
    }
    const col = target.closest('[data-slot-col]');
    if (col) {
      const rowPx = ROW_PX[state.view];
      const range = gridRange(state.appointments);
      const y = e.clientY - col.getBoundingClientRect().top;
      const minute = Math.min(range.end - SLOT, range.start + Math.max(0, Math.floor(y / rowPx)) * SLOT);
      openForm(null, { date: col.dataset.date, time: toHhmm(minute), chair: col.dataset.chair });
    }
  }

  function onRootChange(e) {
    if (e.target.matches('[data-action="pick-date"]') && e.target.value) {
      state.date = e.target.value;
      refresh();
    }
  }

  function isVisible() {
    return systemState.activeTab === VIEW;
  }

  function init() {
    const root = document.getElementById('agenda-root');
    if (!root) return;
    root.addEventListener('click', onRootClick);
    root.addEventListener('change', onRootChange);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

    Molaris.events.on('view-shown', ({ view }) => { if (view === VIEW) refresh(); });
    Molaris.events.on('language-changed', () => {
      if (!isVisible() || !state.loaded) return;
      render();
      const open = detailOverlay && findAppointment(detailId);
      if (open) fillDetail(open);
    });
    // Keep waiting times, the "now" line and other workstations' changes fresh.
    setInterval(() => {
      if (isVisible() && !document.querySelector('.fixed.inset-0.z-50')) refresh({ quiet: true });
    }, 60_000);

    Molaris.showTab('agenda');
  }

  init();
})();
