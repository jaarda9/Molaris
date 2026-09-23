// Billing: procedure catalog, quotes (devis), payments/installments, receipts,
// patient balance and daily takings. Renders into #billing-root.
// Money is integer millimes everywhere; see CLAUDE.md for conventions.
(function () {
  const VIEW = 'view-billing';
  const t = (key) => Molaris.i18n.t(key);
  const tnd = (m) => Molaris.format.tnd(m);
  const esc = (v) => escapeHtml(v);

  const METHODS = ['cash', 'cheque', 'card', 'transfer', 'other'];
  // Printed documents are always in French, whatever the UI language.
  const METHOD_FR = { cash: 'Espèces', cheque: 'Chèque', card: 'Carte bancaire', transfer: 'Virement', other: 'Autre' };

  const state = {
    patientId: null,       // billing patient; follows the active patient
    patients: [],
    tab: 'quotes',         // quotes | payments | daily | catalog
    dailyDate: Molaris.format.isoDate(),
    showInactive: false
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm';
  const BTN = 'px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm';
  const BTN2 = 'px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold';
  const LINK = 'px-2 py-1 rounded-lg text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40';
  const LINK_DANGER = 'px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40';
  const INPUT = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-100';
  const LABEL = 'block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1';

  const STATUS_STYLE = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    sent: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    refused: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    expired: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
  };

  /** 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' → '23/09/2026' (+ ' 14:30'), without timezone surprises. */
  function day(value) {
    if (!value) return '';
    const [y, m, d] = String(value).slice(0, 10).split('-');
    const time = String(value).length >= 16 ? ` ${String(value).slice(11, 16)}` : '';
    return `${d}/${m}/${y}${time}`;
  }

  /** '12,500' → 12500; '' → 0 when allowed; otherwise throws a readable error. */
  function parseAmount(raw, { allowZero = true, field } = {}) {
    const text = String(raw ?? '').trim();
    if (text === '' && allowZero) return 0;
    const m = Molaris.format.parseTnd(text);
    if (m === null || (!allowZero && m <= 0)) throw new Error(`${field ? field + ' : ' : ''}${t('billing.invalidAmount')}`);
    return m;
  }

  /** Millimes → value for an input ("125,500"). */
  const amountInput = (m) => Molaris.format.tnd(m || 0).replace(/\s?DT$/, '').replace(/\s/g, '');

  /** Treatment plans use Universal numbering (1-32); quotes use FDI. */
  function universalToFdi(n) {
    n = Number(n);
    if (!Number.isInteger(n) || n < 1 || n > 32) return null;
    if (n <= 8) return 19 - n;        // 1..8   → 18..11
    if (n <= 16) return n + 12;       // 9..16  → 21..28
    if (n <= 24) return 55 - n;       // 17..24 → 38..31
    return n + 16;                    // 25..32 → 41..48
  }

  const patientName = () => {
    const p = state.patients.find(x => x.id === state.patientId);
    return p ? `${p.name} — ${p.chartId}` : '';
  };

  const isActivePatient = () => Molaris.patients.active()?.id === state.patientId;

  function badge(status) {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[status] || ''}">${esc(t('billing.status.' + status))}</span>`;
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  async function render() {
    const root = document.getElementById('billing-root');
    if (!state.patientId) state.patientId = Molaris.patients.active()?.id || null;

    const tabs = ['quotes', 'payments', 'daily', 'catalog'].map(name => `
      <button type="button" data-action="tab" data-tab="${name}"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold ${state.tab === name
          ? 'bg-teal-600 text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">${esc(t('billing.tab.' + name))}</button>`).join('');

    const needsPatient = state.tab === 'quotes' || state.tab === 'payments';
    root.innerHTML = `
      <div class="space-y-4">
        <div class="${CARD} space-y-4">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">${esc(t('billing.title'))}</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">${esc(t('billing.subtitle'))}</p>
            </div>
            <div class="flex items-end gap-2 ${needsPatient ? '' : 'hidden'}">
              <div>
                <label for="billing-patient" class="${LABEL}">${esc(t('billing.patient'))}</label>
                <select id="billing-patient" class="${INPUT} min-w-[16rem]"></select>
              </div>
              <button type="button" data-action="use-active" class="${BTN2} ${isActivePatient() ? 'hidden' : ''}">${esc(t('billing.useActivePatient'))}</button>
            </div>
          </div>
          <div id="billing-summary" class="${needsPatient ? '' : 'hidden'}"></div>
          <div class="flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-800 pt-3">${tabs}</div>
        </div>
        <div id="billing-content"></div>
      </div>`;

    if (needsPatient) {
      state.patients = await Molaris.patients.fillSelect(document.getElementById('billing-patient'), state.patientId);
      if (!state.patients.some(p => p.id === state.patientId)) {
        state.patientId = state.patients[0]?.id || null;
        if (state.patientId) document.getElementById('billing-patient').value = state.patientId;
      }
      await renderSummary();
    }

    const content = document.getElementById('billing-content');
    if (state.tab === 'quotes') await renderQuotes(content);
    else if (state.tab === 'payments') await renderPayments(content);
    else if (state.tab === 'daily') await renderDaily(content);
    else await renderCatalog(content);
  }

  async function renderSummary() {
    const el = document.getElementById('billing-summary');
    if (!el || !state.patientId) return;
    const { balance } = await Molaris.api.get(`/api/patients/${encodeURIComponent(state.patientId)}/balance`);
    const tile = (label, value, tone = 'text-slate-900 dark:text-white', hint = '') => `
      <div class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">${esc(label)}</div>
        <div class="text-lg font-bold font-mono ${tone}">${esc(tnd(value))}</div>
        ${hint ? `<div class="text-[10px] text-slate-400">${esc(hint)}</div>` : ''}
      </div>`;
    el.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${tile(t('billing.summary.quoted'), balance.quotedMillimes)}
        ${tile(t('billing.summary.paidOnQuotes'), balance.paidOnQuotesMillimes, 'text-emerald-700 dark:text-emerald-400')}
        ${tile(t('billing.summary.balanceDue'), balance.balanceDueMillimes,
          balance.balanceDueMillimes > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400')}
        ${tile(t('billing.summary.paidOutside'), balance.paidOutsideQuotesMillimes, 'text-slate-700 dark:text-slate-300', t('billing.summary.paidOutsideHint'))}
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Quotes
  // ---------------------------------------------------------------------------

  async function renderQuotes(content) {
    if (!state.patientId) { content.innerHTML = ''; return; }
    const { quotes } = await Molaris.api.get(`/api/quotes?patientId=${encodeURIComponent(state.patientId)}`);

    const cards = quotes.map(q => {
      const actions = [];
      if (q.status === 'draft') {
        actions.push(`<button type="button" data-action="edit-quote" data-id="${esc(q.id)}" class="${LINK}">${esc(t('billing.edit'))}</button>`);
        actions.push(`<button type="button" data-action="quote-status" data-status="sent" data-id="${esc(q.id)}" class="${LINK}">${esc(t('billing.markSent'))}</button>`);
      }
      if (q.status === 'draft' || q.status === 'sent') {
        actions.push(`<button type="button" data-action="quote-status" data-status="accepted" data-id="${esc(q.id)}" class="${LINK}">${esc(t('billing.markAccepted'))}</button>`);
        actions.push(`<button type="button" data-action="quote-status" data-status="refused" data-id="${esc(q.id)}" class="${LINK_DANGER}">${esc(t('billing.markRefused'))}</button>`);
      }
      if (q.status === 'sent') {
        actions.push(`<button type="button" data-action="quote-status" data-status="expired" data-id="${esc(q.id)}" class="${LINK_DANGER}">${esc(t('billing.markExpired'))}</button>`);
      }
      if (q.status === 'accepted' && q.remainingMillimes > 0) {
        actions.push(`<button type="button" data-action="new-payment" data-quote-id="${esc(q.id)}" class="${LINK}">${esc(t('billing.recordPayment'))}</button>`);
      }
      actions.push(`<button type="button" data-action="print-quote" data-id="${esc(q.id)}" class="${LINK}">${esc(t('billing.print'))}</button>`);
      actions.push(`<button type="button" data-action="duplicate-quote" data-id="${esc(q.id)}" class="${LINK}">${esc(t('billing.duplicate'))}</button>`);

      const lines = q.items.map(i => `
        <tr class="border-t border-slate-100 dark:border-slate-800">
          <td class="py-1.5 text-slate-800 dark:text-slate-200">${esc(i.label)}</td>
          <td class="py-1.5 text-center font-mono text-slate-500">${esc(i.toothFdi ?? '')}</td>
          <td class="py-1.5 text-center font-mono">${esc(i.quantity)}</td>
          <td class="py-1.5 text-right font-mono">${esc(tnd(i.unitPriceMillimes))}</td>
          <td class="py-1.5 text-right font-mono text-slate-500">${i.discountMillimes ? esc('− ' + tnd(i.discountMillimes)) : ''}</td>
          <td class="py-1.5 text-right font-mono font-semibold">${esc(tnd(i.totalMillimes))}</td>
        </tr>`).join('');

      const paidInfo = q.status === 'accepted' ? `
        <span class="text-emerald-700 dark:text-emerald-400">${esc(t('billing.paid'))} ${esc(tnd(q.paidMillimes))}</span>
        <span class="${q.remainingMillimes > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'} font-semibold">${esc(t('billing.remaining'))} ${esc(tnd(q.remainingMillimes))}</span>` : '';

      return `
        <div class="${CARD} space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-slate-900 dark:text-white text-sm">${esc(q.number)}</span>
              ${badge(q.status)}
              ${q.pastValidity ? `<span class="text-[10px] font-semibold text-amber-700 dark:text-amber-400">${esc(t('billing.pastValidity'))}</span>` : ''}
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">
              ${esc(t('billing.issuedOn'))} ${esc(day(q.issuedAt))}${q.validUntil ? ` · ${esc(t('billing.validUntil'))} ${esc(day(q.validUntil))}` : ''}
            </div>
          </div>
          ${lines ? `
            <table class="w-full text-xs">
              <thead class="text-[10px] uppercase text-slate-400"><tr>
                <th class="text-left font-semibold">${esc(t('billing.col.label'))}</th>
                <th class="font-semibold">${esc(t('billing.col.tooth'))}</th>
                <th class="font-semibold">${esc(t('billing.col.qty'))}</th>
                <th class="text-right font-semibold">${esc(t('billing.col.unitPrice'))}</th>
                <th class="text-right font-semibold">${esc(t('billing.col.discount'))}</th>
                <th class="text-right font-semibold">${esc(t('billing.col.amount'))}</th>
              </tr></thead>
              <tbody>${lines}</tbody>
            </table>` : `<p class="text-xs text-slate-400">${esc(t('billing.quoteNoLines'))}</p>`}
          ${q.notes ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-line">${esc(q.notes)}</p>` : ''}
          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
            <div class="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span class="font-bold text-slate-900 dark:text-white">${esc(t('billing.total'))} ${esc(tnd(q.totalMillimes))}</span>
              ${paidInfo}
            </div>
            <div class="flex flex-wrap gap-1">${actions.join('')}</div>
          </div>
        </div>`;
    }).join('');

    content.innerHTML = `
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <button type="button" data-action="new-quote" class="${BTN}">+ ${esc(t('billing.newQuote'))}</button>
          ${isActivePatient() ? `<button type="button" data-action="quote-from-plan" class="${BTN2}">${esc(t('billing.fromPlan'))}</button>` : ''}
        </div>
        ${cards || `<div class="${CARD}"><p class="text-center py-8 text-slate-400 text-xs">${esc(t('billing.noQuotes'))}</p></div>`}
      </div>`;
  }

  /** Opens the quote editor. `quote` = existing draft, or null with optional prefilled `items`. */
  async function openQuoteEditor(quote, prefill = []) {
    const { procedures } = await Molaris.api.get('/api/procedures');
    const byCategory = {};
    for (const p of procedures) (byCategory[p.category || '—'] ||= []).push(p);
    const options = Object.entries(byCategory).map(([cat, list]) => `
      <optgroup label="${esc(cat)}">
        ${list.map(p => `<option value="${esc(p.id)}">${esc(p.labelFr)} — ${esc(tnd(p.defaultPriceMillimes))}</option>`).join('')}
      </optgroup>`).join('');

    const validDefault = quote ? (quote.validUntil || '') : (() => {
      const d = new Date(); d.setDate(d.getDate() + 30); return Molaris.format.isoDate(d);
    })();

    const modal = Molaris.ui.modal({
      title: quote ? `${t('billing.editQuote')} ${quote.number}` : `${t('billing.newQuote')} — ${patientName()}`,
      wide: true,
      submitLabel: t('billing.saveQuote'),
      bodyHtml: `
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex-1 min-w-[14rem]">
            <label class="${LABEL}" for="billing-add-procedure">${esc(t('billing.addFromCatalog'))}</label>
            <select id="billing-add-procedure" class="${INPUT}">
              <option value="">${esc(t('billing.chooseProcedure'))}</option>${options}
            </select>
          </div>
          <button type="button" data-add-free class="${BTN2}">+ ${esc(t('billing.addFreeLine'))}</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="text-[10px] uppercase text-slate-400"><tr>
              <th class="text-left font-semibold py-1">${esc(t('billing.col.label'))}</th>
              <th class="font-semibold w-16">${esc(t('billing.col.toothFdi'))}</th>
              <th class="font-semibold w-14">${esc(t('billing.col.qty'))}</th>
              <th class="font-semibold w-24">${esc(t('billing.col.unitPriceDt'))}</th>
              <th class="font-semibold w-24">${esc(t('billing.col.discountDt'))}</th>
              <th class="text-right font-semibold w-28">${esc(t('billing.col.amount'))}</th>
              <th class="w-6"></th>
            </tr></thead>
            <tbody id="billing-lines"></tbody>
          </table>
        </div>
        <div class="flex justify-end text-sm font-bold font-mono text-slate-900 dark:text-white">
          ${esc(t('billing.total'))}&nbsp;<span id="billing-quote-total">${esc(tnd(0))}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="${LABEL}" for="billing-valid-until">${esc(t('billing.validUntil'))}</label>
            <input id="billing-valid-until" name="validUntil" type="date" class="${INPUT}" value="${esc(validDefault)}">
          </div>
          <div class="md:col-span-2">
            <label class="${LABEL}" for="billing-quote-notes">${esc(t('billing.notes'))}</label>
            <textarea id="billing-quote-notes" name="notes" rows="2" class="${INPUT}">${esc(quote?.notes || '')}</textarea>
          </div>
        </div>`,
      onSubmit: async (form, { close }) => {
        const rows = [...modal.element.querySelectorAll('#billing-lines tr')];
        const items = rows.map((tr, i) => {
          const n = i + 1;
          const get = (name) => tr.querySelector(`[data-field="${name}"]`).value;
          const label = get('label').trim();
          if (!label) throw new Error(`${t('billing.line')} ${n} : ${t('billing.labelRequired')}`);
          const toothRaw = get('tooth').trim();
          const toothFdi = toothRaw === '' ? null : Number(toothRaw);
          const quantity = Number(get('qty'));
          if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`${t('billing.line')} ${n} : ${t('billing.invalidQuantity')}`);
          return {
            procedureId: tr.dataset.procedureId || null,
            label,
            toothFdi,
            quantity,
            unitPriceMillimes: parseAmount(get('price'), { field: `${t('billing.line')} ${n}` }),
            discountMillimes: parseAmount(get('discount'), { field: `${t('billing.line')} ${n}` })
          };
        });
        const body = { validUntil: form.get('validUntil') || null, notes: form.get('notes') || null, items };
        if (quote) await Molaris.api.put(`/api/quotes/${encodeURIComponent(quote.id)}`, body);
        else await Molaris.api.post('/api/quotes', { patientId: state.patientId, ...body });
        close();
        Molaris.ui.toast(t('billing.quoteSaved'));
        refresh();
      }
    });

    const tbody = modal.element.querySelector('#billing-lines');
    const totalEl = modal.element.querySelector('#billing-quote-total');

    function recompute() {
      let total = 0;
      let valid = true;
      for (const tr of tbody.querySelectorAll('tr')) {
        const qty = Number(tr.querySelector('[data-field="qty"]').value);
        const price = Molaris.format.parseTnd(tr.querySelector('[data-field="price"]').value || '0');
        const discountRaw = tr.querySelector('[data-field="discount"]').value;
        const discount = discountRaw.trim() === '' ? 0 : Molaris.format.parseTnd(discountRaw);
        const out = tr.querySelector('[data-line-total]');
        if (!Number.isInteger(qty) || qty < 1 || price === null || discount === null || discount > qty * price) {
          out.textContent = '—';
          valid = false;
          continue;
        }
        const line = qty * price - discount;
        out.textContent = tnd(line);
        total += line;
      }
      totalEl.textContent = valid ? tnd(total) : `${tnd(total)} (${t('billing.checkLines')})`;
    }

    function addLine(item) {
      const tr = document.createElement('tr');
      tr.className = 'border-t border-slate-100 dark:border-slate-800';
      if (item.procedureId) tr.dataset.procedureId = item.procedureId;
      const cell = 'px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg w-full text-slate-800 dark:text-slate-100';
      tr.innerHTML = `
        <td class="py-1 pr-1"><input data-field="label" class="${cell}" value="${esc(item.label || '')}"></td>
        <td class="py-1 pr-1"><input data-field="tooth" inputmode="numeric" class="${cell} text-center" value="${esc(item.toothFdi ?? '')}" placeholder="—"></td>
        <td class="py-1 pr-1"><input data-field="qty" type="number" min="1" max="99" step="1" class="${cell} text-center" value="${esc(item.quantity || 1)}"></td>
        <td class="py-1 pr-1"><input data-field="price" inputmode="decimal" class="${cell} text-right" value="${esc(amountInput(item.unitPriceMillimes))}"></td>
        <td class="py-1 pr-1"><input data-field="discount" inputmode="decimal" class="${cell} text-right" value="${item.discountMillimes ? esc(amountInput(item.discountMillimes)) : ''}" placeholder="0"></td>
        <td class="py-1 text-right font-mono font-semibold" data-line-total></td>
        <td class="py-1 text-right"><button type="button" data-remove class="text-slate-400 hover:text-rose-600 text-base leading-none" title="${esc(t('billing.removeLine'))}">&times;</button></td>`;
      tbody.appendChild(tr);
      recompute();
    }

    tbody.addEventListener('input', recompute);
    tbody.addEventListener('click', (e) => {
      if (e.target.closest('[data-remove]')) { e.target.closest('tr').remove(); recompute(); }
    });
    modal.element.querySelector('[data-add-free]').addEventListener('click', () => addLine({ label: '', quantity: 1, unitPriceMillimes: 0 }));
    const picker = modal.element.querySelector('#billing-add-procedure');
    picker.addEventListener('change', () => {
      const p = procedures.find(x => x.id === picker.value);
      if (p) addLine({ procedureId: p.id, label: p.labelFr, quantity: 1, unitPriceMillimes: p.defaultPriceMillimes });
      picker.value = '';
    });

    const initial = quote ? quote.items : prefill;
    initial.forEach(addLine);
    recompute();
  }

  async function quoteFromPlan() {
    const [{ items }, { procedures }] = await Promise.all([
      Molaris.api.get('/api/treatment-plan'),
      Molaris.api.get('/api/procedures')
    ]);
    const open = (items || []).filter(i => i.status !== 'completed' && i.status !== 'declined');
    if (open.length === 0) { Molaris.ui.toast(t('billing.planEmpty'), 'info'); return; }
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const prefill = open.map(i => {
      const match = procedures.find(p => norm(p.labelFr) === norm(i.procedure));
      const estimate = Number(i.estimatedCost);
      return {
        procedureId: match?.id || null,
        label: match?.labelFr || i.procedure,
        toothFdi: universalToFdi(i.toothId),
        quantity: 1,
        // Catalog price when the act matches; otherwise the plan's estimate read as dinars (to check).
        unitPriceMillimes: match ? match.defaultPriceMillimes : (Number.isFinite(estimate) && estimate > 0 ? Math.round(estimate * 1000) : 0)
      };
    });
    await openQuoteEditor(null, prefill);
    Molaris.ui.toast(t('billing.planImported'), 'info');
  }

  async function printQuote(id) {
    const { quote: q } = await Molaris.api.get(`/api/quotes/${encodeURIComponent(id)}`);
    const rows = q.items.map(i => `
      <tr>
        <td>${esc(i.label)}</td>
        <td class="num">${esc(i.toothFdi ?? '')}</td>
        <td class="num">${esc(i.quantity)}</td>
        <td class="num">${esc(tnd(i.unitPriceMillimes))}</td>
        <td class="num">${i.discountMillimes ? esc(tnd(i.discountMillimes)) : ''}</td>
        <td class="num">${esc(tnd(i.totalMillimes))}</td>
      </tr>`).join('');
    await Molaris.print.document({
      title: `Devis N° ${q.number}`,
      lang: 'fr',
      bodyHtml: `
        <table>
          <tr><th>Patient</th><td>${esc(q.patientName)} <span class="muted">(${esc(q.patientChartId)})</span></td>
              <th>Date</th><td>${esc(day(q.issuedAt))}</td></tr>
        </table>
        <table>
          <thead><tr><th>Désignation</th><th>Dent (FDI)</th><th>Qté</th><th>Prix unitaire</th><th>Remise</th><th>Montant</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><th colspan="5" class="num">Total</th><th class="num">${esc(tnd(q.totalMillimes))}</th></tr></tfoot>
        </table>
        <p>Arrêté le présent devis à la somme de <strong>${esc(q.totalInWords)}</strong>.</p>
        ${q.validUntil ? `<p>Devis valable jusqu'au <strong>${esc(day(q.validUntil))}</strong>.</p>` : ''}
        ${q.notes ? `<p class="muted" style="white-space:pre-line">${esc(q.notes)}</p>` : ''}
        <p class="muted">Montants en dinars tunisiens (DT).</p>
        <div style="display:flex;justify-content:space-between;gap:24px;margin-top:40px;">
          <div style="flex:1;border-top:1px solid #cbd5e1;padding-top:6px;min-height:80px;">Bon pour accord<br><span class="muted">Date et signature du patient</span></div>
          <div style="flex:1;border-top:1px solid #cbd5e1;padding-top:6px;min-height:80px;text-align:end;">Signature et cachet du praticien</div>
        </div>`
    });
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  async function renderPayments(content) {
    if (!state.patientId) { content.innerHTML = ''; return; }
    const { payments } = await Molaris.api.get(`/api/payments?patientId=${encodeURIComponent(state.patientId)}`);
    content.innerHTML = `
      <div class="${CARD} space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">${esc(t('billing.paymentsTitle'))}</h3>
          <button type="button" data-action="new-payment" class="${BTN}">+ ${esc(t('billing.newPayment'))}</button>
        </div>
        ${payments.length ? paymentTable(payments, { showPatient: false }) : `<p class="text-center py-8 text-slate-400 text-xs">${esc(t('billing.noPayments'))}</p>`}
      </div>`;
  }

  function paymentTable(payments, { showPatient }) {
    const rows = payments.map(p => {
      const cancelled = !!p.cancelledAt;
      const strike = cancelled ? 'line-through text-slate-400 dark:text-slate-500' : '';
      return `
        <tr class="border-t border-slate-100 dark:border-slate-800 align-top">
          <td class="py-2 font-mono ${strike}">${esc(showPatient ? p.paidAt.slice(11, 16) : day(p.paidAt))}</td>
          <td class="py-2 font-mono ${strike}">${esc(p.receiptNumber)}</td>
          ${showPatient ? `<td class="py-2"><button type="button" data-action="open-patient" data-patient-id="${esc(p.patientId)}" class="text-left text-teal-700 dark:text-teal-300 hover:underline ${strike}">${esc(p.patientName)}</button></td>` : ''}
          <td class="py-2 ${strike}">${esc(t('billing.method.' + p.method))}${p.reference ? ` <span class="text-slate-400">n° ${esc(p.reference)}</span>` : ''}</td>
          <td class="py-2 font-mono text-slate-500 ${strike}">${esc(p.quoteNumber || '')}</td>
          <td class="py-2 text-right font-mono font-semibold ${strike}">${esc(tnd(p.amountMillimes))}</td>
          <td class="py-2 text-right whitespace-nowrap">
            <button type="button" data-action="print-receipt" data-id="${esc(p.id)}" class="${LINK}">${esc(t('billing.receipt'))}</button>
            ${cancelled ? '' : `<button type="button" data-action="cancel-payment" data-id="${esc(p.id)}" class="${LINK_DANGER}">${esc(t('billing.cancelPayment'))}</button>`}
          </td>
        </tr>
        ${cancelled ? `<tr><td></td><td colspan="${showPatient ? 6 : 5}" class="pb-2 text-[11px] text-rose-700 dark:text-rose-400">${esc(t('billing.cancelledOn'))} ${esc(Molaris.format.dateTime(p.cancelledAt))} — ${esc(p.cancelReason || '')}</td></tr>` : ''}
        ${!cancelled && p.notes ? `<tr><td></td><td colspan="${showPatient ? 6 : 5}" class="pb-2 text-[11px] text-slate-500">${esc(p.notes)}</td></tr>` : ''}`;
    }).join('');
    return `
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="text-[10px] uppercase text-slate-400"><tr>
            <th class="text-left font-semibold">${esc(showPatient ? t('billing.col.time') : t('billing.col.date'))}</th>
            <th class="text-left font-semibold">${esc(t('billing.col.receipt'))}</th>
            ${showPatient ? `<th class="text-left font-semibold">${esc(t('billing.patient'))}</th>` : ''}
            <th class="text-left font-semibold">${esc(t('billing.col.method'))}</th>
            <th class="text-left font-semibold">${esc(t('billing.col.quote'))}</th>
            <th class="text-right font-semibold">${esc(t('billing.col.amount'))}</th>
            <th></th>
          </tr></thead>
          <tbody class="text-slate-800 dark:text-slate-200">${rows}</tbody>
        </table>
      </div>`;
  }

  async function openPaymentForm(quoteId) {
    const { quotes } = await Molaris.api.get(`/api/quotes?patientId=${encodeURIComponent(state.patientId)}`);
    const payable = quotes.filter(q => q.status === 'accepted' && q.remainingMillimes > 0);
    const quoteOptions = `<option value="">${esc(t('billing.noQuoteLink'))}</option>` + payable.map(q =>
      `<option value="${esc(q.id)}" ${q.id === quoteId ? 'selected' : ''}>${esc(q.number)} — ${esc(t('billing.remaining'))} ${esc(tnd(q.remainingMillimes))}</option>`).join('');
    const preset = payable.find(q => q.id === quoteId);

    const modal = Molaris.ui.modal({
      title: `${t('billing.newPayment')} — ${patientName()}`,
      submitLabel: t('billing.savePayment'),
      bodyHtml: `
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="${LABEL}" for="billing-pay-amount">${esc(t('billing.amountDt'))}</label>
            <input id="billing-pay-amount" name="amount" inputmode="decimal" required class="${INPUT} font-mono" placeholder="0,000" value="${preset ? esc(amountInput(preset.remainingMillimes)) : ''}">
          </div>
          <div>
            <label class="${LABEL}" for="billing-pay-date">${esc(t('billing.col.date'))}</label>
            <input id="billing-pay-date" name="paidAt" type="date" required class="${INPUT}" value="${esc(Molaris.format.isoDate())}" max="${esc(Molaris.format.isoDate())}">
          </div>
          <div>
            <label class="${LABEL}" for="billing-pay-method">${esc(t('billing.col.method'))}</label>
            <select id="billing-pay-method" name="method" class="${INPUT}">
              ${METHODS.map(m => `<option value="${m}">${esc(t('billing.method.' + m))}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="${LABEL}" for="billing-pay-reference">${esc(t('billing.reference'))}</label>
            <input id="billing-pay-reference" name="reference" class="${INPUT}" placeholder="${esc(t('billing.referenceHint'))}">
          </div>
          <div class="col-span-2">
            <label class="${LABEL}" for="billing-pay-quote">${esc(t('billing.linkedQuote'))}</label>
            <select id="billing-pay-quote" name="quoteId" class="${INPUT}">${quoteOptions}</select>
          </div>
          <div class="col-span-2">
            <label class="${LABEL}" for="billing-pay-notes">${esc(t('billing.notes'))}</label>
            <input id="billing-pay-notes" name="notes" class="${INPUT}">
          </div>
        </div>
        <p id="billing-pay-words" class="text-[11px] italic text-slate-500 dark:text-slate-400"></p>`,
      onSubmit: async (form, { close }) => {
        const amountMillimes = parseAmount(form.get('amount'), { allowZero: false });
        const { payment } = await Molaris.api.post('/api/payments', {
          patientId: state.patientId,
          quoteId: form.get('quoteId') || null,
          amountMillimes,
          method: form.get('method'),
          reference: form.get('reference') || null,
          paidAt: form.get('paidAt') || undefined,
          notes: form.get('notes') || null
        });
        close();
        Molaris.ui.toast(`${t('billing.paymentSaved')} ${payment.receiptNumber}`);
        refresh();
        if (window.confirm(t('billing.printReceiptNow'))) printReceipt(payment);
      }
    });

    const amountEl = modal.element.querySelector('#billing-pay-amount');
    const hint = modal.element.querySelector('#billing-pay-words');
    const showAmount = () => {
      const m = Molaris.format.parseTnd(amountEl.value);
      hint.textContent = m ? `= ${tnd(m)}` : '';
    };
    amountEl.addEventListener('input', showAmount);
    modal.element.querySelector('#billing-pay-quote').addEventListener('change', (e) => {
      const q = payable.find(x => x.id === e.target.value);
      if (q && !amountEl.value) { amountEl.value = amountInput(q.remainingMillimes); showAmount(); }
    });
    showAmount();
  }

  function openCancelForm(paymentId) {
    Molaris.ui.modal({
      title: t('billing.cancelPaymentTitle'),
      submitLabel: t('billing.confirmCancel'),
      bodyHtml: `
        <p class="text-slate-600 dark:text-slate-400">${esc(t('billing.cancelExplain'))}</p>
        <div>
          <label class="${LABEL}" for="billing-cancel-reason">${esc(t('billing.cancelReason'))}</label>
          <textarea id="billing-cancel-reason" name="reason" rows="2" required minlength="3" class="${INPUT}"></textarea>
        </div>`,
      onSubmit: async (form, { close }) => {
        await Molaris.api.post(`/api/payments/${encodeURIComponent(paymentId)}/cancel`, { reason: form.get('reason') });
        close();
        Molaris.ui.toast(t('billing.paymentCancelled'));
        refresh();
      }
    });
  }

  async function printReceipt(paymentOrId) {
    const p = typeof paymentOrId === 'string'
      ? (await Molaris.api.get(`/api/payments/${encodeURIComponent(paymentOrId)}`)).payment
      : paymentOrId;
    const words = p.amountInWords.charAt(0).toUpperCase() + p.amountInWords.slice(1);
    await Molaris.print.document({
      title: `Reçu N° ${p.receiptNumber}`,
      lang: 'fr',
      bodyHtml: `
        ${p.cancelledAt ? `<p style="border:2px solid #be123c;color:#be123c;padding:8px;text-align:center;font-weight:700;">REÇU ANNULÉ le ${esc(Molaris.format.date(p.cancelledAt))} — Motif : ${esc(p.cancelReason || '')}</p>` : ''}
        <table>
          <tr><th>Date</th><td>${esc(day(p.paidAt))}</td></tr>
          <tr><th>Reçu de</th><td>${esc(p.patientName)} <span class="muted">(${esc(p.patientChartId)})</span></td></tr>
          <tr><th>Montant</th><td><strong>${esc(tnd(p.amountMillimes))}</strong></td></tr>
          <tr><th>Mode de paiement</th><td>${esc(METHOD_FR[p.method] || p.method)}${p.reference ? ` — N° ${esc(p.reference)}` : ''}</td></tr>
          ${p.quoteNumber ? `<tr><th>Au titre du devis</th><td>${esc(p.quoteNumber)}</td></tr>` : ''}
          ${p.notes ? `<tr><th>Objet</th><td>${esc(p.notes)}</td></tr>` : ''}
        </table>
        <p style="margin-top:16px;">Arrêté le présent reçu à la somme de <strong>${esc(p.amountInWords)}</strong>.</p>
        <p class="muted">(${esc(words)} — ${esc(tnd(p.amountMillimes))})</p>
        <div class="signature">Signature et cachet du praticien</div>`
    });
  }

  // ---------------------------------------------------------------------------
  // Daily takings (Encaissements du jour)
  // ---------------------------------------------------------------------------

  async function renderDaily(content) {
    const { daily } = await Molaris.api.get(`/api/payments/daily?date=${encodeURIComponent(state.dailyDate)}`);
    const methodTiles = METHODS.map(m => `
      <div class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">${esc(t('billing.method.' + m))}</div>
        <div class="text-sm font-bold font-mono text-slate-900 dark:text-white">${esc(tnd(daily.byMethod[m] || 0))}</div>
      </div>`).join('');
    content.innerHTML = `
      <div class="${CARD} space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">${esc(t('billing.dailyTitle'))} — ${esc(day(daily.date))}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">${esc(daily.count)} ${esc(t('billing.dailyCount'))}</p>
          </div>
          <div class="flex items-end gap-2">
            <div>
              <label class="${LABEL}" for="billing-daily-date">${esc(t('billing.col.date'))}</label>
              <input id="billing-daily-date" type="date" class="${INPUT}" value="${esc(state.dailyDate)}">
            </div>
            <button type="button" data-action="daily-today" class="${BTN2}">${esc(t('billing.today'))}</button>
            <button type="button" data-action="print-daily" class="${BTN2}">${esc(t('billing.print'))}</button>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div class="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 rounded-xl p-3 col-span-2 md:col-span-1">
            <div class="text-[11px] font-semibold text-teal-700 dark:text-teal-300">${esc(t('billing.total'))}</div>
            <div class="text-lg font-bold font-mono text-teal-800 dark:text-teal-200">${esc(tnd(daily.totalMillimes))}</div>
          </div>
          ${methodTiles}
        </div>
        ${daily.payments.length ? paymentTable(daily.payments, { showPatient: true }) : `<p class="text-center py-8 text-slate-400 text-xs">${esc(t('billing.noPaymentsDay'))}</p>`}
      </div>`;
  }

  async function printDaily() {
    const { daily } = await Molaris.api.get(`/api/payments/daily?date=${encodeURIComponent(state.dailyDate)}`);
    const rows = daily.payments.map(p => `
      <tr style="${p.cancelledAt ? 'text-decoration:line-through;color:#94a3b8;' : ''}">
        <td>${esc(p.paidAt.slice(11, 16))}</td><td>${esc(p.receiptNumber)}</td><td>${esc(p.patientName)}</td>
        <td>${esc(METHOD_FR[p.method])}${p.reference ? ` n° ${esc(p.reference)}` : ''}</td>
        <td class="num">${esc(tnd(p.amountMillimes))}</td>
      </tr>`).join('');
    await Molaris.print.document({
      title: `Encaissements du ${day(daily.date)}`,
      lang: 'fr',
      bodyHtml: `
        <table>
          ${METHODS.map(m => `<tr><th>${esc(METHOD_FR[m])}</th><td class="num">${esc(tnd(daily.byMethod[m]))}</td></tr>`).join('')}
          <tr><th>Total (${esc(daily.count)} règlement${daily.count > 1 ? 's' : ''})</th><td class="num"><strong>${esc(tnd(daily.totalMillimes))}</strong></td></tr>
        </table>
        <table>
          <thead><tr><th>Heure</th><th>Reçu</th><th>Patient</th><th>Mode</th><th>Montant</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="muted">Les règlements barrés ont été annulés et ne sont pas comptés.</p>`
    });
  }

  // ---------------------------------------------------------------------------
  // Catalog (Catalogue des actes)
  // ---------------------------------------------------------------------------

  async function renderCatalog(content) {
    const { procedures } = await Molaris.api.get(`/api/procedures?includeInactive=${state.showInactive}`);
    const rows = procedures.map(p => `
      <tr class="border-t border-slate-100 dark:border-slate-800 ${p.active ? '' : 'opacity-50'}">
        <td class="py-2 text-slate-500">${esc(p.category || '')}</td>
        <td class="py-2 text-slate-800 dark:text-slate-200">${esc(p.labelFr)}${p.labelAr ? ` <span class="text-slate-400" dir="rtl" lang="ar">${esc(p.labelAr)}</span>` : ''}
          ${p.active ? '' : ` <span class="text-[10px] font-semibold text-slate-500">(${esc(t('billing.inactive'))})</span>`}</td>
        <td class="py-2 font-mono text-slate-500">${esc(p.code || '')}</td>
        <td class="py-2 font-mono text-slate-500">${p.cnamKeyLetter ? esc(`${p.cnamKeyLetter} ${p.cnamCoefficient ?? ''}`) : ''}</td>
        <td class="py-2 text-right font-mono">${esc(tnd(p.defaultPriceMillimes))}</td>
        <td class="py-2 text-right whitespace-nowrap">
          <button type="button" data-action="edit-procedure" data-id="${esc(p.id)}" class="${LINK}">${esc(t('billing.edit'))}</button>
          <button type="button" data-action="toggle-procedure" data-id="${esc(p.id)}" data-active="${p.active}" class="${p.active ? LINK_DANGER : LINK}">${esc(p.active ? t('billing.deactivate') : t('billing.reactivate'))}</button>
        </td>
      </tr>`).join('');
    content.innerHTML = `
      <div class="${CARD} space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-bold text-slate-900 dark:text-white">${esc(t('billing.catalogTitle'))}</h3>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <input id="billing-show-inactive" type="checkbox" ${state.showInactive ? 'checked' : ''}> ${esc(t('billing.showInactive'))}
            </label>
            <button type="button" data-action="new-procedure" class="${BTN}">+ ${esc(t('billing.newProcedure'))}</button>
          </div>
        </div>
        <p class="text-[11px] text-amber-700 dark:text-amber-400">${esc(t('billing.catalogPriceNote'))}</p>
        ${rows ? `
          <div class="overflow-x-auto"><table class="w-full text-xs">
            <thead class="text-[10px] uppercase text-slate-400"><tr>
              <th class="text-left font-semibold">${esc(t('billing.col.category'))}</th>
              <th class="text-left font-semibold">${esc(t('billing.col.label'))}</th>
              <th class="text-left font-semibold">${esc(t('billing.col.code'))}</th>
              <th class="text-left font-semibold">CNAM</th>
              <th class="text-right font-semibold">${esc(t('billing.col.price'))}</th>
              <th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table></div>` : `<p class="text-center py-10 text-slate-400 text-xs">${esc(t('billing.catalogEmpty'))}</p>`}
      </div>`;
  }

  function openProcedureForm(p) {
    const field = (name, label, value, attrs = '') => `
      <div>
        <label class="${LABEL}" for="billing-proc-${name}">${esc(label)}</label>
        <input id="billing-proc-${name}" name="${name}" class="${INPUT}" value="${esc(value ?? '')}" ${attrs}>
      </div>`;
    Molaris.ui.modal({
      title: p ? t('billing.editProcedure') : t('billing.newProcedure'),
      bodyHtml: `
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">${field('labelFr', t('billing.labelFr'), p?.labelFr, 'required')}</div>
          <div class="col-span-2">${field('labelAr', t('billing.labelAr'), p?.labelAr, 'dir="rtl" lang="ar"')}</div>
          ${field('category', t('billing.col.category'), p?.category)}
          ${field('price', t('billing.priceDt'), p ? amountInput(p.defaultPriceMillimes) : '', 'inputmode="decimal" required')}
          ${field('code', t('billing.col.code'), p?.code)}
          <div class="grid grid-cols-2 gap-2">
            ${field('cnamKeyLetter', t('billing.cnamLetter'), p?.cnamKeyLetter)}
            ${field('cnamCoefficient', t('billing.cnamCoefficient'), p?.cnamCoefficient, 'inputmode="decimal"')}
          </div>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400">${esc(t('billing.cnamNote'))}</p>`,
      onSubmit: async (form, { close }) => {
        const coefRaw = String(form.get('cnamCoefficient') || '').trim().replace(',', '.');
        const coefficient = coefRaw === '' ? null : Number(coefRaw);
        if (coefficient !== null && !(coefficient > 0)) throw new Error(t('billing.invalidCoefficient'));
        const body = {
          labelFr: String(form.get('labelFr') || ''),
          labelAr: form.get('labelAr') || null,
          category: form.get('category') || null,
          code: form.get('code') || null,
          defaultPriceMillimes: parseAmount(form.get('price'), { allowZero: true }),
          cnamKeyLetter: form.get('cnamKeyLetter') || null,
          cnamCoefficient: coefficient
        };
        if (p) await Molaris.api.put(`/api/procedures/${encodeURIComponent(p.id)}`, body);
        else await Molaris.api.post('/api/procedures', body);
        close();
        Molaris.ui.toast(t('billing.procedureSaved'));
        refresh();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Events (delegated on the root, so re-rendering needs no re-binding)
  // ---------------------------------------------------------------------------

  const fail = (err) => Molaris.ui.toast(err.message, 'error');

  function refresh() {
    render().catch(fail);
  }

  async function onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    switch (btn.dataset.action) {
      case 'tab': state.tab = btn.dataset.tab; return refresh();
      case 'use-active': state.patientId = Molaris.patients.active()?.id || state.patientId; return refresh();
      case 'new-quote': return openQuoteEditor(null);
      case 'quote-from-plan': return quoteFromPlan();
      case 'edit-quote': return openQuoteEditor((await Molaris.api.get(`/api/quotes/${encodeURIComponent(id)}`)).quote);
      case 'quote-status': {
        const status = btn.dataset.status;
        if (!window.confirm(`${t('billing.confirmStatus')} « ${t('billing.status.' + status)} » ?`)) return;
        await Molaris.api.post(`/api/quotes/${encodeURIComponent(id)}/status`, { status });
        Molaris.ui.toast(t('billing.statusUpdated'));
        return refresh();
      }
      case 'duplicate-quote': {
        const { quote } = await Molaris.api.post(`/api/quotes/${encodeURIComponent(id)}/duplicate`);
        Molaris.ui.toast(`${t('billing.duplicated')} ${quote.number}`);
        return refresh();
      }
      case 'print-quote': return printQuote(id);
      case 'new-payment': return openPaymentForm(btn.dataset.quoteId || null);
      case 'cancel-payment': return openCancelForm(id);
      case 'print-receipt': return printReceipt(id);
      case 'open-patient':
        state.patientId = btn.dataset.patientId;
        state.tab = 'payments';
        return refresh();
      case 'daily-today': state.dailyDate = Molaris.format.isoDate(); return refresh();
      case 'print-daily': return printDaily();
      case 'new-procedure': return openProcedureForm(null);
      case 'edit-procedure': {
        const { procedures } = await Molaris.api.get('/api/procedures?includeInactive=true');
        return openProcedureForm(procedures.find(p => p.id === id));
      }
      case 'toggle-procedure':
        await Molaris.api.put(`/api/procedures/${encodeURIComponent(id)}`, { active: btn.dataset.active !== 'true' });
        return refresh();
    }
  }

  function onChange(e) {
    if (e.target.id === 'billing-patient') { state.patientId = e.target.value; refresh(); }
    else if (e.target.id === 'billing-daily-date' && e.target.value) { state.dailyDate = e.target.value; refresh(); }
    else if (e.target.id === 'billing-show-inactive') { state.showInactive = e.target.checked; refresh(); }
  }

  function refreshIfVisible() {
    if (systemState.activeTab === VIEW) refresh();
  }

  const root = document.getElementById('billing-root');
  if (root) {
    root.addEventListener('click', (e) => { Promise.resolve(onClick(e)).catch(fail); });
    root.addEventListener('change', onChange);
  }

  Molaris.events.on('view-shown', ({ view }) => { if (view === VIEW) refreshIfVisible(); });
  Molaris.events.on('language-changed', refreshIfVisible);
  // Billing follows the active patient; picking another patient here lasts until the next switch.
  Molaris.events.on('patient-changed', ({ patient }) => {
    state.patientId = patient?.id || state.patientId;
    refreshIfVisible();
  });

  Molaris.showTab('billing');
})();
