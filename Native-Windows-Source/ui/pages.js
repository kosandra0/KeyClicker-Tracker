/* KeyClick Tracker pages. Each page returns HTML; `update()` patches live values in place. */
(function () {
  'use strict';
  const { $, $$, state, fmt, f1, esc, api, toast, modal, keyLabel } = KC;

  const I = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.8"/>',
    keyboard: '<rect x="2.5" y="5" width="19" height="14" rx="2.8"/><path d="M6 9h.01M9 9h.01M12 9h.01M15 9h.01M18 9h.01M6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01M8 15.2h8"/>',
    mouse: '<rect x="6.5" y="2.5" width="11" height="19" rx="5.5"/><path d="M12 2.5v6"/>',
    speed: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-5"/><circle cx="12" cy="14" r="1.3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.7-.8 1.7-1.6 0-.9-.6-1.2-.6-2 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3z"/><circle cx="7.6" cy="11" r="1"/><circle cx="10.5" cy="7.3" r="1"/><circle cx="15" cy="7.8" r="1"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    log: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 20h16"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    click: '<path d="M9 4.5 9 14l2.6-2.2 2 4.4 2-.9-2-4.3 3.4-.3z"/><path d="M5.5 6.5 4 5M9 3V1.5M12.6 5l1.2-1.2"/>',
    scroll: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v4M9.5 15l2.5 2 2.5-2"/>',
    sum: '<path d="M18 5H6l6 7-6 7h12"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    flame: '<path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.2.8 2 1.6 2.4C10.5 8.2 11 5.5 12 3z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4M4 5v4h4M4 13a8 8 0 0 0 14 4M20 19v-4h-4"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>', chevR: '<path d="m9 6 6 6-6 6"/>', panel: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>'
  };
  const svg = (n, c = '') => '<svg class="' + c + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[n] || I.info) + '</svg>';
  KC.icon = svg;

  const NAV = [
    ['WORKSPACE'], ['overview', 'Overview', 'grid'], ['keyboard', 'Keyboard', 'keyboard'], ['mouse', 'Mouse', 'mouse'], ['speed', 'Speed', 'speed'], ['history', 'History', 'calendar'],
    ['YOUR DATA'], ['data', 'Data & Backup', 'data'],
    ['PREFERENCES'], ['appearance', 'Appearance', 'palette'], ['settings', 'Settings', 'settings'], ['updates', 'Update Log', 'log'], ['about', 'About', 'info']
  ];
  const TITLES = { overview: 'Overview', keyboard: 'Keyboard', mouse: 'Mouse', speed: 'Speed', history: 'History', data: 'Data & Backup', appearance: 'Appearance', settings: 'Settings', updates: 'Update Log', about: 'About' };
  KC.buildNav = function () {
    $('#nav').innerHTML = '<span class="nav-ind" id="nav-ind"></span>' + NAV.map(n => n.length === 1
      ? '<div class="nav-caption">' + n[0] + '</div>'
      : '<button class="nav-item" data-page="' + n[0] + '" title="' + n[1] + '"><span class="nav-icon">' + svg(n[2]) + '</span><span class="nav-label">' + n[1] + '</span></button>').join('');
    $('#sidebar-toggle').innerHTML = svg('panel');
  };

  const rangeOptions = [['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 days'], ['last30', 'Last 30 days'], ['thisweek', 'This week'], ['lastweek', 'Previous week'], ['thismonth', 'This month'], ['lastmonth', 'Previous month'], ['thisquarter', 'This quarter'], ['lastquarter', 'Previous quarter'], ['thisyear', 'This year'], ['lastyear', 'Previous year'], ['all', 'All time'], ['custom', 'Custom range']];
  const unitOptions = [['hour', 'Hourly'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['yearly', 'Yearly']];
  const sel = (id, opts, cur) => '<select class="select-control" id="' + id + '">' + opts.map(([v, l]) => '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>';
  function rangeControls() {
    let h = sel('range-select', rangeOptions, state.range) + sel('unit-select', unitOptions, state.unit);
    if (state.range === 'custom') h += '<input class="date-control" type="date" id="custom-from" value="' + esc(state.from) + '"><input class="date-control" type="date" id="custom-to" value="' + esc(state.to) + '"><button class="btn" data-act="apply-custom">Apply</button>';
    return h;
  }
  const header = (eyebrow, title, sub, controls) => '<div class="page-header" style="--i:0"><div><div class="eyebrow">' + eyebrow + '</div><div class="page-title">' + title + '</div><div class="page-subtitle">' + sub + '</div></div><div class="header-controls">' + (controls || '') + '</div></div>';
  /* Greeting follows the computer's own regional clock. */
  const greetWord = () => { const h = new Date().getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 21 ? 'Good evening' : 'Good night'; };
  const pad2 = n => String(n).padStart(2, '0');
  function overviewHeader() {
    return '<div class="page-header" style="--i:0"><div class="hero"><div class="greet"><span id="greet-word">' + greetWord() + '</span><span class="greet-comma">,</span><input class="name-input" id="name-input" maxlength="32" placeholder="your name" spellcheck="false" autocomplete="off" value="' + esc(state.settings.user_name) + '" aria-label="Your name"></div>' +
      '<div class="page-title">Your day at a glance</div><div class="page-subtitle">Every key, click and scroll is counted the moment it happens, and only the counts, never what you type.</div></div>' +
      '<div class="hero-side"><button class="clock" id="clock" data-tip="Click to switch between 12-hour and 24-hour time"><span class="clock-time" id="clock-time"></span><span class="clock-date" id="clock-date"></span></button><div class="header-controls">' + rangeControls() + '</div></div></div>';
  }
  let clockOdo = null, clockTimer = 0;
  function tickClock() {
    const d = new Date(), h24 = state.settings.clock_24h;
    let h = d.getHours(), suffix = '';
    if (!h24) { suffix = h < 12 ? ' AM' : ' PM'; h = h % 12 || 12; }
    const t = $('#clock-time'); if (!t) return;
    if (!clockOdo || clockOdo.el !== t) clockOdo = new KCOdo(t);
    clockOdo.set((h24 ? pad2(h) : h) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + suffix, state.settings.animations);
    const dt = $('#clock-date');
    if (dt) { const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').replace(/_/g, ' '); const txt = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) + (tz ? ' · ' + tz : ''); if (dt.textContent !== txt) dt.textContent = txt; }
    const g = $('#greet-word'), w = greetWord(); if (g && g.textContent !== w) { g.classList.remove('swap'); void g.offsetWidth; g.textContent = w; g.classList.add('swap'); }
  }
  const sizeName = el => { el.style.width = Math.max(9, el.value.length + 1) + 'ch'; };
  let nameSaver = 0;
  const S = () => state.stats || { totals: {}, keys: [], mouse: [], scroll: [], series: [], hourOfDay: [], dayOfWeek: [], heatmap: [], rates: {}, streak: {}, today: {}, session: {} };
  const A = () => state.all || S();
  const setHTML = (el, html) => { if (el && el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; } };
  const n0 = v => Number(v) || 0;

  /* ---------- reusable pieces ---------- */
  const statCard = (label, path, sub, icon, color, subId) =>
    '<div class="stat-card" style="--c:' + color + '"><div class="stat-top"><span>' + label + '</span><span class="stat-icon">' + svg(icon) + '</span></div><div class="stat-value"><span data-odo="' + path + '"></span></div><div class="stat-sub" ' + (subId ? 'id="' + subId + '"' : '') + '>' + sub + '</div></div>';

  /* ---------- charts ---------- */
  const CW = 700, CH = 210, PAD = { l: 8, r: 8, t: 14, b: 26 };
  function seriesPoints() {
    let pts = S().series.slice().sort((a, b) => (a.key < b.key ? -1 : 1));
    if (pts.length > 90) {   // merge neighbours so the chart stays readable
      const g = Math.ceil(pts.length / 90), out = [];
      for (let i = 0; i < pts.length; i += g) {
        const c = pts.slice(i, i + g), m = { label: c[0].label, keys: 0, clicks: 0, scrolls: 0, events: 0 };
        c.forEach(p => { m.keys += p.keys; m.clicks += p.clicks; m.scrolls += p.scrolls; m.events += p.events; });
        out.push(m);
      }
      pts = out;
    }
    return pts;
  }
  const shortLabel = s => String(s || '').replace(/\s+\d{4}$/, '').replace(/^Week of /, 'Wk ');
  function drawChart(el) {
    const pts = seriesPoints(), mode = state.chartMode;
    const get = p => mode === 'keys' ? p.keys : mode === 'mouse' ? p.clicks : mode === 'scroll' ? p.scrolls : p.events;
    if (!pts.length) { setHTML(el, '<div class="empty-mini">Nothing recorded in this period yet.<br>Start typing and it will appear here.</div>'); el._n = -1; return; }
    const iw = CW - PAD.l - PAD.r, ih = CH - PAD.t - PAD.b, step = iw / pts.length, bw = Math.max(3, Math.min(30, step * .56));
    const max = Math.max(1, ...pts.map(get));
    if (el._n !== pts.length || el._mode !== mode) {
      el.dataset.h = ''; el._n = pts.length; el._mode = mode;
      const every = Math.ceil(pts.length / 9);
      let h = '<svg viewBox="0 0 ' + CW + ' ' + CH + '" preserveAspectRatio="none">';
      [0, .33, .66, 1].forEach(t => { const y = PAD.t + ih * (1 - t); h += '<line class="chart-gridline" x1="' + PAD.l + '" y1="' + y + '" x2="' + (CW - PAD.r) + '" y2="' + y + '"/>'; });
      pts.forEach((p, i) => { h += '<rect class="chart-bar ' + (mode === 'mouse' ? 'mouse' : mode === 'scroll' ? 'scroll' : 'keys') + '" data-i="' + i + '" x="' + (PAD.l + i * step + (step - bw) / 2) + '" width="' + bw + '" rx="4"/>'; if (i % every === 0) h += '<text class="chart-label" x="' + (PAD.l + i * step + step / 2) + '" y="' + (CH - 7) + '" text-anchor="middle">' + esc(shortLabel(p.label)) + '</text>'; });
      el.innerHTML = h + '</svg><div class="chart-tip"></div>';
      $$('rect', el).forEach(r => { r.style.y = (PAD.t + ih) + 'px'; r.style.height = '0px'; });
      void el.offsetWidth;
    }
    $$('rect', el).forEach((r, i) => { const v = get(pts[i]), h = v ? Math.max(3, v / max * (ih - 6)) : 0; r.style.height = h + 'px'; r.style.y = (PAD.t + ih - h) + 'px'; r.dataset.tip = shortLabel(pts[i].label) + '\n' + fmt(v) + ' ' + (mode === 'keys' ? 'key presses' : mode === 'mouse' ? 'clicks' : mode === 'scroll' ? 'scrolls' : 'events'); });
  }
  function chartPanel(title, hint) {
    const seg = [['events', 'All'], ['keys', 'Keys'], ['mouse', 'Clicks'], ['scroll', 'Scrolls']];
    return '<section class="panel" style="--i:4"><div class="panel-head"><div><div class="panel-title">' + title + '</div><div class="panel-hint">' + hint + '</div></div><div class="segmented" id="chart-mode">' + seg.map(([v, l]) => '<button data-mode="' + v + '" class="' + (state.chartMode === v ? 'active' : '') + '">' + l + '</button>').join('') + '</div></div><div class="chart-area" id="main-chart"></div><div class="legend"><span><i></i>Keys</span><span><i class="l2"></i>Clicks</span><span><i class="l3"></i>Scrolls</span></div></section>';
  }

  /* ---------- heatmap ---------- */
  function heatHTML() {
    let h = '<div class="heat"><span></span>';
    for (let i = 0; i < 24; i++) h += '<span class="hh">' + (i % 3 === 0 ? (i % 12 || 12) + (i < 12 ? 'a' : 'p') : '') + '</span>';
    for (let d = 0; d < 7; d++) { h += '<span class="hl">' + KC.dayNames[d].slice(0, 3) + '</span>'; for (let i = 0; i < 24; i++) h += '<i class="hc" data-d="' + d + '" data-h="' + i + '"></i>'; }
    return h + '</div>';
  }
  function updateHeat(root) {
    const hm = S().heatmap || [];
    const max = Math.max(1, ...hm.flat().map(n0));
    $$('.hc', root).forEach(c => { const v = n0((hm[+c.dataset.d] || [])[+c.dataset.h]); c.style.setProperty('--h', v ? Math.max(14, Math.round(v / max * 88)) : 0); c.dataset.tip = KC.dayNames[+c.dataset.d] + ', ' + KC.hourName(+c.dataset.h) + '\n' + fmt(v) + ' events'; });
  }

  /* ---------- goals / insights / milestones ---------- */
  function ring(label, val, goal, color) {
    const r = 42, c = 2 * Math.PI * r, frac = goal ? Math.min(1, val / goal) : 0;
    return '<div class="goal-item" style="--c:' + color + '"><div class="ring"><svg viewBox="0 0 104 104"><circle class="rt" cx="52" cy="52" r="' + r + '"/><circle class="rf" cx="52" cy="52" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - frac)).toFixed(1) + '"/></svg><div class="rc"><div><b>' + Math.round(frac * 100) + '%</b><span>done</span></div></div></div><div><div class="gt">' + label + '</div><div class="gv">' + fmt(val) + ' of ' + fmt(goal) + '</div></div></div>';
  }
  function goalsHTML() {
    const t = A().today || {}, st = state.settings;
    return '<div class="goal-row">' + ring('Keys today', n0(t.keys), st.goal_keys, 'var(--accent)') + ring('Clicks today', n0(t.clicks), st.goal_clicks, 'var(--accent2)') + '</div>';
  }
  function insightsHTML() {
    const s = S(), a = A(), out = [];
    const t = a.today || {}, tot = s.totals || {};
    const words = Math.round(n0(tot.chars) / 5);
    out.push(['spark', 'Today you have pressed <b>' + fmt(t.keys) + '</b> keys and clicked <b>' + fmt(t.clicks) + '</b> times.', n0(t.keys) ? 'That is about ' + fmt(Math.round(n0(t.keys) * .8 / 5)) + ' words of typing.' : 'A fresh page: nothing yet today.']);
    const hrs = s.hourOfDay || [], bh = hrs.reduce((b, x, i) => (x.keys + x.clicks + x.scrolls > (hrs[b] ? hrs[b].keys + hrs[b].clicks + hrs[b].scrolls : -1) ? i : b), 0);
    if (hrs.length && hrs[bh].keys + hrs[bh].clicks + hrs[bh].scrolls > 0) out.push(['clock', 'Your busiest hour is <b>' + KC.hourName(bh) + '</b>.', 'Plan your deep work around it.']);
    const dows = s.dayOfWeek || [], bd = dows.reduce((b, x, i) => (x.keys + x.clicks > (dows[b] ? dows[b].keys + dows[b].clicks : -1) ? i : b), 0);
    if (dows.length && dows[bd].keys + dows[bd].clicks > 0) out.push(['calendar', '<b>' + KC.dayNames[bd] + '</b> is your most active day of the week.', '']);
    if (s.keys && s.keys.length) { const top = s.keys.slice().sort((x, y) => y.count - x.count)[0], pct = n0(tot.keys) ? Math.round(top.count / tot.keys * 100) : 0; out.push(['keyboard', 'Your favourite key is <b>' + esc(keyLabel(top.id)) + '</b>, ' + pct + '% of all key presses.', '']); }
    const r = s.rates || {};
    if (n0(r.avgWpm)) out.push(['speed', 'Your typing pace averages <b>' + KC.rate(r.avgWpm, 'w', 1) + ' ' + KC.unitLabel('w') + '</b>, with a best minute of ' + KC.rate(r.peakWpm, 'w', 1) + '.', 'Based on ' + fmt(r.typeMinutes) + ' typing minutes.']);
    if (words) out.push(['log', 'You have typed roughly <b>' + fmt(words) + ' words</b> in this period.', 'About ' + fmt(Math.max(1, Math.round(words / 250))) + ' pages of text.']);
    return '<div class="insight-list">' + out.slice(0, 6).map((x, i) => '<div class="insight-row" style="--i:' + i + '"><span class="insight-icon">' + svg(x[0]) + '</span><div><p>' + x[1] + '</p>' + (x[2] ? '<small>' + x[2] + '</small>' : '') + '</div></div>').join('') + '</div>';
  }
  function badgesHTML() {
    const a = A(), tot = a.totals || {}, st = a.streak || {}, pk = (S().rates || {}).peakWpm || 0;
    const list = [
      ['First thousand', 'Press 1,000 keys', tot.keys, 1e3], ['Ten thousand strong', 'Press 10,000 keys', tot.keys, 1e4], ['Hundred thousand', 'Press 100,000 keys', tot.keys, 1e5], ['A million keys', 'Press 1,000,000 keys', tot.keys, 1e6],
      ['Clicker', 'Click 1,000 times', tot.clicks, 1e3], ['Busy fingers', 'Click 10,000 times', tot.clicks, 1e4], ['Click marathon', 'Click 100,000 times', tot.clicks, 1e5],
      ['Three in a row', 'Active 3 days in a row', st.longest, 3], ['A full week', 'Active 7 days in a row', st.longest, 7], ['A whole month', 'Active 30 days in a row', st.longest, 30],
      ['Steady typist', 'Reach 40 WPM in a minute', pk, 40], ['Swift typist', 'Reach 70 WPM in a minute', pk, 70]
    ];
    return '<div class="badges">' + list.map(([n, d, v, g]) => { const f = Math.min(1, n0(v) / g); return '<div class="badge' + (f >= 1 ? ' earned' : '') + '"><b>' + n + '</b><small>' + d + '</small><div class="bar"><i style="width:' + Math.round(f * 100) + '%"></i></div></div>'; }).join('') + '</div>';
  }

  function recordsHTML() {
    const a = A(), r = a.records || {}, top = l => (l || []).slice().sort((x, y) => y.count - x.count)[0];
    const btn = { left: 'Left button', right: 'Right button', middle: 'Middle button', x1: 'Back button', x2: 'Forward button' };
    const dir = { up: 'Scrolling up', down: 'Scrolling down', left: 'Scrolling left', right: 'Scrolling right' };
    const fd = k => (k ? new Date(k + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
    const box = (ic, label, val, sub) => '<div class="rec"><span class="rec-ic">' + svg(ic) + '</span><div class="rec-b"><div class="rec-l">' + label + '</div><div class="rec-v">' + val + '</div><div class="rec-s">' + (sub || '&nbsp;') + '</div></div></div>';
    const none = 'Not enough data yet';
    const tk = top(a.keys), tm = top(a.mouse), ts = top(a.scroll), pd = a.peakDay, w = KC.unitLabel('w'), c = KC.unitLabel('c');
    return box('keyboard', 'Most pressed key', tk ? '<span class="key-chip">' + esc(keyLabel(tk.id)) + '</span>' : '–', tk ? fmt(tk.count) + ' presses' : none) +
      box('click', 'Most used mouse button', tm ? esc(btn[tm.id] || tm.id) : '–', tm ? fmt(tm.count) + ' clicks' : none) +
      box('scroll', 'Most scrolled direction', ts ? esc(dir[ts.id] || ts.id) : '–', ts ? fmt(ts.count) + ' scrolls' : none) +
      box('sum', 'Events made, all time', fmt((a.totals || {}).events), fmt((a.totals || {}).keys) + ' keys · ' + fmt((a.totals || {}).clicks) + ' clicks') +
      box('calendar', 'Busiest day', pd ? fmt(pd.events) + ' events' : '–', pd ? esc(pd.label) : none) +
      box('speed', 'Fastest typing day', n0(r.bestWpmAvg) ? KC.rate(r.bestWpmAvg, 'w', 1) + ' <small>' + w + '</small>' : '–', n0(r.bestWpmAvg) ? 'Average on ' + fd(r.bestWpmDay) : 'Needs a day with 5+ typing minutes') +
      box('flame', 'Best typing minute', n0(r.peakWpm) ? KC.rate(r.peakWpm, 'w', 1) + ' <small>' + w + '</small>' : '–', n0(r.peakWpm) ? fd(r.peakWpmDay) : none) +
      box('speed', 'Fastest clicking day', n0(r.bestCpmAvg) ? KC.rate(r.bestCpmAvg, 'c', 1) + ' <small>' + c + '</small>' : '–', n0(r.bestCpmAvg) ? 'Average on ' + fd(r.bestCpmDay) : 'Needs a day with 5+ clicking minutes') +
      box('flame', 'Best clicking minute', n0(r.peakCpm) ? KC.rate(r.peakCpm, 'c', 1) + ' <small>' + c + '</small>' : '–', n0(r.peakCpm) ? fd(r.peakCpmDay) : none);
  }

  /* ---------- pages ---------- */
  const pages = {};
  let cur = null;

  pages.overview = {
    html() {
      return '<div class="page-wrap">' + overviewHeader() +
        '<div class="grid stats-grid" style="--i:1">' + statCard('Key presses', 'stats.totals.keys', '<span data-sub="words"></span>', 'keyboard', 'var(--accent)', 'sub-keys') + statCard('Mouse clicks', 'stats.totals.clicks', 'Left, right, middle and side buttons', 'click', 'var(--accent2)') + statCard('Scroll events', 'stats.totals.scrolls', '<span id="sub-scroll"></span>', 'scroll', 'var(--green)', 'sub-scroll-wrap') + statCard('All activity', 'stats.totals.events', 'Everything, added together', 'sum', 'var(--amber)') + '</div>' +
        '<div class="speed-row" style="--i:2"><div class="panel speed-big"><div class="unit">Typing speed now</div><div class="num"><span data-odo="live.wpm" data-conv="w"></span><small class="ulab" data-unit="w"></small></div><div class="unit sm"><span data-unitname="w"></span> · last few seconds</div><div class="meter"><i id="m-wpm"></i></div></div>' +
        '<div class="panel speed-big"><div class="unit">Click rate now</div><div class="num"><span data-odo="live.cpm" data-conv="c"></span><small class="ulab" data-unit="c"></small></div><div class="unit sm"><span data-unitname="c"></span> · last few seconds</div><div class="meter"><i id="m-cpm"></i></div></div>' +
        '<div class="panel"><div class="panel-head" style="margin-bottom:6px"><div class="panel-title">Pace in this period</div></div><div class="kv"><div class="k">Overall <span data-unit="w"></span></div><div class="v"><span data-odo="stats.rates.overallWpm" data-dec="1" data-conv="w"></span></div><div class="k">Average <span data-unit="w"></span></div><div class="v"><span data-odo="stats.rates.avgWpm" data-dec="1" data-conv="w"></span></div><div class="k">Overall <span data-unit="c"></span></div><div class="v"><span data-odo="stats.rates.overallCpm" data-dec="1" data-conv="c"></span></div><div class="k">Average <span data-unit="c"></span></div><div class="v"><span data-odo="stats.rates.avgCpm" data-dec="1" data-conv="c"></span></div></div></div></div>' +
        '<div class="section-gap">' + chartPanel('Activity over time', 'Each bar is one ' + ({ hour: 'hour', daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'quarter', yearly: 'year' }[state.unit]) + '. It grows as you work.') + '</div>' +
        '<div class="grid split-grid section-gap" style="--i:5"><section class="panel"><div class="panel-head"><div><div class="panel-title">Daily goals</div><div class="panel-hint">Gentle targets you can change in Settings.</div></div><div class="streak-num" style="--c:var(--amber)"><span data-odo="all.streak.current"></span><small>day streak</small></div></div><div id="goals"></div></section>' +
        '<section class="panel"><div class="panel-head"><div><div class="panel-title">Little observations</div><div class="panel-hint">Noticed from your own numbers.</div></div></div><div id="insights"></div></section></div>' +
        '<section class="panel section-gap" style="--i:6"><div class="panel-head"><div><div class="panel-title">Your weekly rhythm</div><div class="panel-hint">Darker squares mean busier hours.</div></div></div>' + heatHTML() + '</section>' +
        '<section class="panel section-gap" style="--i:7"><div class="panel-head"><div><div class="panel-title">All-time records</div><div class="panel-hint">Your personal bests since you started counting.</div></div></div><div class="records" id="records"></div></section>' +
        '<section class="panel section-gap" style="--i:8"><div class="panel-head"><div><div class="panel-title">Milestones</div><div class="panel-hint">Quiet little celebrations as the totals add up.</div></div></div><div id="badges"></div></section></div>';
    },
    mount(root) {
      const inp = $('#name-input', root); sizeName(inp);
      inp.addEventListener('input', () => { sizeName(inp); clearTimeout(nameSaver); nameSaver = setTimeout(() => KC.saveSettings({ user_name: inp.value.trim() }), 500); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
      $('#clock', root).addEventListener('click', () => { clockOdo = null; $('#clock-time').replaceChildren(); KC.saveSettings({ clock_24h: !state.settings.clock_24h }); tickClock(); });
      clockOdo = null; tickClock(); clearInterval(clockTimer); clockTimer = setInterval(tickClock, 1000);
    },
    unmount() { clearInterval(clockTimer); },
    update(root) {
      drawChart($('#main-chart', root));
      setHTML($('#records', root), recordsHTML());
      setHTML($('#goals', root), goalsHTML());
      setHTML($('#insights', root), insightsHTML());
      setHTML($('#badges', root), badgesHTML());
      updateHeat(root);
      const w = Math.round(n0(S().totals.chars) / 5);
      const sk = $('#sub-keys', root); if (sk) sk.textContent = '≈ ' + fmt(w) + ' words typed';
      const ss = $('#sub-scroll', root); if (ss) ss.textContent = fmt(S().totals.scrollDistance) + ' wheel notches';
      const mw = $('#m-wpm', root); if (mw) mw.style.width = Math.min(100, state.live.wpm / 120 * 100) + '%';
      const mc = $('#m-cpm', root); if (mc) mc.style.width = Math.min(100, state.live.cpm / 120 * 100) + '%';
    }
  };

  const KEYROWS = [
    [['Escape', 'wide'], 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Delete'],
    ['Backquote', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Minus', 'Equal', ['Backspace', 'wide']],
    [['Tab', 'wide'], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'BracketLeft', 'BracketRight', 'Backslash'],
    [['CapsLock', 'wide'], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Semicolon', 'Quote', ['Enter', 'xwide']],
    [['ShiftLeft', 'xwide'], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Comma', 'Period', 'Slash', ['ShiftRight', 'xwide']],
    ['ControlLeft', 'MetaLeft', 'AltLeft', ['Space', 'space'], 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight'],
    ['Insert', 'Home', 'PageUp', 'PageDown', 'End', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight']
  ];
  const LAYOUT = new Set(KEYROWS.flat().map(k => (Array.isArray(k) ? k[0] : k)));
  const keyMap = () => Object.fromEntries(S().keys.map(k => [k.id, k.count]));
  pages.keyboard = {
    html() {
      const rows = KEYROWS.map(r => '<div class="keyboard-row">' + r.map(k => { const id = Array.isArray(k) ? k[0] : k, cls = Array.isArray(k) ? k[1] : ''; return '<div class="keycap ' + cls + '" data-key="' + id + '" title="' + esc(keyLabel(id)) + '"><span>' + esc(keyLabel(id)) + '</span><i class="key-count"></i></div>'; }).join('') + '</div>').join('');
      return '<div class="page-wrap">' + header('KEYBOARD', 'How you type', 'A heat map of the keys you reach for. Press any key and watch it light up.', rangeControls()) +
        '<div class="grid stats-grid" style="--i:1">' + statCard('Key presses', 'stats.totals.keys', 'In this period', 'keyboard', 'var(--accent)') + statCard('Characters typed', 'stats.totals.chars', 'Letters, digits, punctuation, space', 'log', 'var(--accent2)') + statCard('Average <span data-unit="w"></span>', 'stats.rates.avgWpm" data-dec="1" data-conv="w', 'Across your typing minutes', 'speed', 'var(--green)') + statCard('Best minute (<span data-unit="w"></span>)', 'stats.rates.peakWpm" data-dec="1" data-conv="w', 'Your fastest single minute', 'flame', 'var(--amber)') + '</div>' +
        '<section class="panel section-gap" style="--i:2"><div class="panel-head"><div><div class="panel-title">Key heat map</div><div class="panel-hint">Brighter keys were pressed more often.</div></div></div><div class="keyboard-board">' + rows + '</div><div class="legend" id="other-keys"></div></section>' +
        '<section class="panel section-gap" style="--i:3"><div class="panel-head"><div><div class="panel-title">Most used keys</div><div class="panel-hint">Your top fifteen.</div></div></div><div id="top-keys"></div></section></div>';
    },
    update(root) {
      const m = keyMap(), max = Math.max(1, ...Object.values(m));
      $$('.keycap', root).forEach(c => { const n = m[c.dataset.key] || 0; c.classList.toggle('used', n > 0); c.style.setProperty('--heat', (14 + 66 * n / max).toFixed(0) + '%'); $('.key-count', c).textContent = n ? (n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n) : ''; });
      const other = S().keys.filter(k => !LAYOUT.has(k.id)).slice(0, 12);
      setHTML($('#other-keys', root), other.length ? '<span>Other keys:</span>' + other.map(k => '<span>' + esc(keyLabel(k.id)) + ' <b>' + fmt(k.count) + '</b></span>').join('') : '');
      const top = S().keys.slice().sort((a, b) => b.count - a.count).slice(0, 15), tm = top.length ? top[0].count : 1, tot = Math.max(1, n0(S().totals.keys));
      setHTML($('#top-keys', root), top.length ? '<table class="table"><thead><tr><th>Key</th><th class="num">Presses</th><th class="num">Share</th><th style="width:34%">&nbsp;</th></tr></thead><tbody>' + top.map(k => '<tr><td><span class="key-chip">' + esc(keyLabel(k.id)) + '</span></td><td class="num">' + fmt(k.count) + '</td><td class="num">' + (k.count / tot * 100).toFixed(1) + '%</td><td><div class="bar-cell"><i style="width:' + (k.count / tm * 100).toFixed(0) + '%"></i></div></td></tr>').join('') + '</tbody></table>' : '<div class="empty-mini">No key presses in this period yet.</div>');
    },
    onKeys(f, root) { if (f.ki) for (const id in f.ki) { const c = $('.keycap[data-key="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]', root); if (c) { c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); } } }
  };

  pages.mouse = {
    html() {
      const mouse = `<svg viewBox="0 0 120 200"><defs><clipPath id="mclip"><rect x="10" y="6" width="100" height="188" rx="50"/></clipPath></defs>
        <rect class="mbody" x="10" y="6" width="100" height="188" rx="50"/>
        <g clip-path="url(#mclip)"><rect class="mpart" id="mp-left" x="10" y="6" width="49" height="76"/><rect class="mpart" id="mp-right" x="61" y="6" width="49" height="76"/></g>
        <rect class="mpart" id="mp-middle" x="54" y="26" width="12" height="28" rx="6"/>
        <rect class="mpart" id="mp-x1" x="3" y="92" width="9" height="24" rx="4"/><rect class="mpart" id="mp-x2" x="3" y="120" width="9" height="24" rx="4"/></svg>`;
      return '<div class="page-wrap">' + header('MOUSE', 'How you point and click', 'Buttons and scrolling, counted without ever recording where your cursor goes.', rangeControls()) +
        '<div class="grid stats-grid" style="--i:1">' + statCard('Mouse clicks', 'stats.totals.clicks', 'In this period', 'click', 'var(--accent2)') + statCard('Scroll events', 'stats.totals.scrolls', 'Wheel movements', 'scroll', 'var(--green)') + statCard('Average <span data-unit="c"></span>', 'stats.rates.avgCpm" data-dec="1" data-conv="c', 'While you are clicking', 'speed', 'var(--accent)') + statCard('Best minute (<span data-unit="c"></span>)', 'stats.rates.peakCpm" data-dec="1" data-conv="c', 'Your busiest minute of clicking', 'flame', 'var(--amber)') + '</div>' +
        '<div class="grid split-grid section-gap" style="--i:2"><section class="panel"><div class="panel-head"><div><div class="panel-title">Buttons</div><div class="panel-hint">Hover the picture or read the list.</div></div></div><div class="mouse-layout"><div class="mouse-illustration">' + mouse + '</div><div class="mouse-rows" id="mouse-rows"></div></div></section>' +
        '<section class="panel"><div class="panel-head"><div><div class="panel-title">Scrolling</div><div class="panel-hint">Direction of every wheel movement.</div></div></div><div class="mouse-rows" id="scroll-rows"></div></section></div></div>';
    },
    update(root) {
      const m = Object.fromEntries(S().mouse.map(x => [x.id, x.count])), sc = Object.fromEntries(S().scroll.map(x => [x.id, x.count])), max = Math.max(1, ...Object.values(m));
      ['left', 'right', 'middle', 'x1', 'x2'].forEach(id => { const el = $('#mp-' + id, root); if (el) el.style.setProperty('--heat', (m[id] ? 14 + 70 * m[id] / max : 0).toFixed(0) + '%'); });
      const row = (cls, label, v) => '<div class="mouse-row"><span><i class="dot ' + cls + '"></i>' + label + '</span><strong>' + fmt(v) + '</strong></div>';
      setHTML($('#mouse-rows', root), row('', 'Left button', m.left) + row('l2', 'Right button', m.right) + row('l3', 'Middle button', m.middle) + row('l4', 'Back and forward', n0(m.x1) + n0(m.x2)));
      setHTML($('#scroll-rows', root), row('', 'Scroll up', sc.up) + row('l2', 'Scroll down', sc.down) + row('l3', 'Scroll left', sc.left) + row('l4', 'Scroll right', sc.right) + '<div class="mouse-row"><span>Wheel notches in total</span><strong>' + fmt(S().totals.scrollDistance) + '</strong></div>');
    },
    onKeys(f, root) { if (f.mi) for (const id in f.mi) { const el = $('#mp-' + id, root); if (el) { el.classList.remove('hit'); void el.getBoundingClientRect(); el.classList.add('hit'); } } }
  };

  /* ----- speed ----- */
  const ARC = 251.3;
  const gauge = (id, label, path) => '<section class="panel" style="text-align:center"><div class="panel-title" style="margin-bottom:10px">' + label + '</div><div class="gauge"><svg viewBox="0 0 200 112"><defs><linearGradient id="gaugeGrad-' + id + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs><path class="track" d="M 20 100 A 80 80 0 0 1 180 100"/><path class="fill" id="g-' + id + '" style="stroke:url(#gaugeGrad-' + id + ')" d="M 20 100 A 80 80 0 0 1 180 100" stroke-dasharray="' + ARC + '" stroke-dashoffset="' + ARC + '"/></svg><div class="val"><span data-odo="' + path + '"></span></div></div></section>';
  const TEXTS = [
    'The quiet rhythm of a keyboard can be oddly soothing. Each small tap is a thought finding its way onto the page, one letter after another.',
    'Good tools stay out of the way. They count what you do without asking for attention, and they leave your words entirely your own.',
    'A little practice each day adds up. Speed comes from relaxed hands, steady breathing and accuracy first, then pace.',
    'Morning light on the desk, a warm cup nearby, and nowhere to be. Some of the best work begins exactly like this.'
  ];
  const tt = { on: false, t0: 0, text: '', idx: 0, errors: 0, typed: 0, dur: 60, timer: 0 };
  function ttRender() {
    const box = $('#tt-text'); if (!box) return;
    const inp = $('#tt-input'), val = inp.value;
    let h = '';
    for (let i = 0; i < tt.text.length; i++) { const ch = esc(tt.text[i]), c = i < val.length ? (val[i] === tt.text[i] ? 'ok' : 'bad') : i === val.length ? 'cur' : ''; h += '<span class="' + c + '">' + ch + '</span>'; }
    box.innerHTML = h;
    const cur = $('.cur', box); if (cur && cur.offsetTop > 90) box.scrollTop = cur.offsetTop - 50;
  }
  function ttStats(final) {
    const val = $('#tt-input').value, elapsed = Math.max(1, (Date.now() - tt.t0) / 1000);
    let ok = 0; for (let i = 0; i < val.length; i++) if (val[i] === tt.text[i]) ok++;
    const wpm = ok / 5 / (elapsed / 60), acc = val.length ? ok / val.length * 100 : 100;
    $('#tt-wpm').textContent = Math.round(wpm); $('#tt-acc').textContent = Math.round(acc) + '%'; $('#tt-time').textContent = Math.max(0, Math.ceil(tt.dur - elapsed)) + 's';
    if (final) {
      let best = 0; try { best = +localStorage.getItem('kc_tt_best') || 0; if (wpm > best) { localStorage.setItem('kc_tt_best', String(Math.round(wpm))); best = Math.round(wpm); } } catch (e) {}
      $('#tt-best').textContent = Math.round(best);
      toast('Time! ' + Math.round(wpm) + ' WPM at ' + Math.round(acc) + '% accuracy.');
    }
  }
  function ttStart() { tt.text = TEXTS[Math.floor(Math.random() * TEXTS.length)]; tt.on = false; clearInterval(tt.timer); const inp = $('#tt-input'); inp.value = ''; inp.disabled = false; $('#tt-wpm').textContent = '0'; $('#tt-acc').textContent = '100%'; $('#tt-time').textContent = tt.dur + 's'; ttRender(); inp.focus(); }
  pages.speed = {
    html() {
      let best = 0; try { best = +localStorage.getItem('kc_tt_best') || 0; } catch (e) {}
      return '<div class="page-wrap">' + header('SPEED', 'How fast you go', 'Words per minute counts five characters as one word. Clicks per minute is simply how many clicks land in a minute.', rangeControls()) +
        '<div class="grid two-col" style="--i:1">' + gauge('wpm', 'Typing speed now · <span data-unit="w"></span>', 'live.wpm" data-conv="w') + gauge('cpm', 'Click rate now · <span data-unit="c"></span>', 'live.cpm" data-conv="c') + '</div>' +
        '<div class="grid two-col section-gap" style="--i:2"><section class="panel"><div class="panel-head"><div><div class="panel-title">Typing speed (<span data-unit="w"></span>)</div><div class="panel-hint">Overall counts every active minute. Average counts only minutes you were typing.</div></div></div><div class="kv"><div class="k">Overall</div><div class="v"><span data-odo="stats.rates.overallWpm" data-dec="1" data-conv="w"></span></div><div class="k">Average</div><div class="v"><span data-odo="stats.rates.avgWpm" data-dec="1" data-conv="w"></span></div><div class="k">Best minute</div><div class="v"><span data-odo="stats.rates.peakWpm" data-dec="1" data-conv="w"></span></div><div class="k">Typing minutes</div><div class="v"><span data-odo="stats.rates.typeMinutes"></span></div></div></section>' +
        '<section class="panel"><div class="panel-head"><div><div class="panel-title">Click rate (<span data-unit="c"></span>)</div><div class="panel-hint">Counted the same two ways.</div></div></div><div class="kv"><div class="k">Overall</div><div class="v"><span data-odo="stats.rates.overallCpm" data-dec="1" data-conv="c"></span></div><div class="k">Average</div><div class="v"><span data-odo="stats.rates.avgCpm" data-dec="1" data-conv="c"></span></div><div class="k">Best minute</div><div class="v"><span data-odo="stats.rates.peakCpm" data-dec="1" data-conv="c"></span></div><div class="k">Clicking minutes</div><div class="v"><span data-odo="stats.rates.clickMinutes"></span></div></div></section></div>' +
        '<div class="grid two-col section-gap" style="--i:3"><section class="panel"><div class="panel-head"><div><div class="panel-title">This session</div><div class="panel-hint">Since you opened KeyClick Tracker.</div></div></div><div class="kv"><div class="k">Key presses</div><div class="v"><span data-odo="stats.session.keys"></span></div><div class="k">Mouse clicks</div><div class="v"><span data-odo="stats.session.clicks"></span></div><div class="k">Session <span data-unit="w"></span></div><div class="v"><span data-odo="stats.session.wpm" data-dec="1" data-conv="w"></span></div><div class="k">Session <span data-unit="c"></span></div><div class="v"><span data-odo="stats.session.cpm" data-dec="1" data-conv="c"></span></div></div></section>' +
        '<section class="panel"><div class="panel-head"><div><div class="panel-title">How these are measured</div></div></div><p class="muted" style="margin:0;line-height:1.7;font-size:.9em">Minutes are real clock minutes. A minute counts as a <b>typing minute</b> once you type at least 5 characters, and as a <b>clicking minute</b> with at least one click. Speeds are only available from the day you installed this version, because older history was saved by the hour, which is too coarse to time.</p></section></div>' +
        '<section class="panel section-gap" style="--i:4"><div class="panel-head"><div><div class="panel-title">Typing practice</div><div class="panel-hint">A short, friendly test. Your practice keystrokes are counted like any others.</div></div><div class="header-controls"><div class="segmented" id="tt-dur"><button data-d="30" class="' + (tt.dur === 30 ? 'active' : '') + '">30 s</button><button data-d="60" class="' + (tt.dur === 60 ? 'active' : '') + '">60 s</button></div><button class="btn primary" data-act="tt-new">' + svg('refresh') + 'New text</button></div></div>' +
        '<div class="tt-text selectable" id="tt-text"></div><input class="tt-input" id="tt-input" placeholder="Start typing here…" autocomplete="off" spellcheck="false"><div class="tt-stats"><div><b id="tt-wpm">0</b><span>WPM</span></div><div><b id="tt-acc">100%</b><span>Accuracy</span></div><div><b id="tt-time">' + tt.dur + 's</b><span>Time left</span></div><div><b id="tt-best">' + best + '</b><span>Your best</span></div></div></section></div>';
    },
    mount(root) {
      ttStart();
      const inp = $('#tt-input', root);
      inp.addEventListener('input', () => {
        if (!tt.on) { tt.on = true; tt.t0 = Date.now(); tt.timer = setInterval(() => { if (Date.now() - tt.t0 >= tt.dur * 1000) { clearInterval(tt.timer); inp.disabled = true; ttStats(true); } else ttStats(false); }, 250); }
        ttRender(); ttStats(false);
        if (inp.value.length >= tt.text.length) { clearInterval(tt.timer); inp.disabled = true; ttStats(true); }
      });
    },
    update(root) {
      const set = (id, v, max) => { const g = $('#g-' + id, root); if (g) g.style.strokeDashoffset = (ARC * (1 - Math.min(1, v / max))).toFixed(1); };
      set('wpm', state.live.wpm, Math.max(100, n0(S().rates.peakWpm) * 1.1)); set('cpm', state.live.cpm, Math.max(100, n0(S().rates.peakCpm) * 1.1));
    },
    unmount() { clearInterval(tt.timer); }
  };

  /* ----- history ----- */
  const pad = n => String(n).padStart(2, '0');
  async function loadCal() {
    const m = state.calMonth, from = m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-01', last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    try { state.calStats = await api('/api/stats?range=custom&unit=daily&from=' + from + '&to=' + m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-' + pad(last)); } catch (e) { state.calStats = null; }
    pages.history.update($('#content'));
  }
  pages.history = {
    html() {
      return '<div class="page-wrap">' + header('HISTORY', 'Looking back', 'A calendar of your busiest days, and a list for the range you choose.', rangeControls()) +
        '<section class="panel" style="--i:1"><div class="cal-head"><button class="btn" data-act="cal-prev">' + svg('chevL') + '</button><b id="cal-title"></b><button class="btn" data-act="cal-next">' + svg('chevR') + '</button></div><div class="calendar-grid" id="cal"></div></section>' +
        '<section class="panel section-gap" style="--i:2"><div class="panel-head"><div><div class="panel-title">By period</div><div class="panel-hint">Newest first.</div></div></div><div id="history-table"></div></section></div>';
    },
    mount() { loadCal(); },
    update(root) {
      const m = state.calMonth, t = new Date();
      $('#cal-title', root).textContent = m.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const byKey = Object.fromEntries(((state.calStats || {}).series || []).map(p => [p.key, p])), max = Math.max(1, ...Object.values(byKey).map(p => p.events));
      const first = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7, days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      let h = KC.dayNames.map(d => '<div class="cal-dow">' + d.slice(0, 3) + '</div>').join('');
      for (let i = 0; i < first; i++) h += '<div class="cal-day blank"></div>';
      for (let d = 1; d <= days; d++) { const p = byKey[m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-' + pad(d)], ev = p ? p.events : 0, isT = t.getFullYear() === m.getFullYear() && t.getMonth() === m.getMonth() && t.getDate() === d; h += '<div class="cal-day' + (isT ? ' today' : '') + '" style="--h:' + (ev ? Math.max(12, Math.round(ev / max * 80)) : 0) + '" title="' + (p ? fmt(p.keys) + ' keys · ' + fmt(p.clicks) + ' clicks · ' + fmt(p.scrolls) + ' scrolls' : 'No activity') + '"><b>' + d + '</b><span>' + (ev ? fmt(ev) : '') + '</span></div>'; }
      setHTML($('#cal', root), h);
      const rows = S().series.slice().sort((a, b) => (a.key < b.key ? 1 : -1)), mx = Math.max(1, ...rows.map(r => r.events));
      setHTML($('#history-table', root), rows.length ? '<table class="table"><thead><tr><th>Period</th><th class="num">Keys</th><th class="num">Clicks</th><th class="num">Scrolls</th><th class="num">Total</th><th style="width:22%">&nbsp;</th></tr></thead><tbody>' + rows.slice(0, 200).map(r => '<tr><td>' + esc(r.label) + '</td><td class="num">' + fmt(r.keys) + '</td><td class="num">' + fmt(r.clicks) + '</td><td class="num">' + fmt(r.scrolls) + '</td><td class="num">' + fmt(r.events) + '</td><td><div class="bar-cell"><i style="width:' + (r.events / mx * 100).toFixed(0) + '%"></i></div></td></tr>').join('') + '</tbody></table>' : '<div class="empty-mini">No activity in this range.</div>');
    }
  };

  /* ----- data & backup ----- */
  async function saveFile(name, blob) {
    if (window.showSaveFilePicker) {
      try {
        const ext = name.split('.').pop(), h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: ext.toUpperCase() + ' file', accept: { [blob.type.split(';')[0] || 'text/plain']: ['.' + ext] } }] });
        const w = await h.createWritable(); await w.write(blob); await w.close(); return true;
      } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return true;
  }
  async function doExport(format) {
    try {
      const r = await api('/api/export?' + KC.statsQuery({ format }));
      const blob = await r.blob(), cd = r.headers.get('content-disposition') || '', m = /filename=([^;]+)/.exec(cd);
      if (await saveFile(m ? m[1].trim() : 'keyclick-tracker.' + format, blob)) toast('Exported ' + format.toUpperCase() + ' file.');
    } catch (e) { toast('Export failed: ' + e.message); }
  }
  async function doImport(file) {
    if (!file) return;
    const mode = ($('input[name=imode]:checked') || {}).value || 'merge';
    let text; try { text = await file.text(); } catch (e) { toast('Could not read that file.'); return; }
    if (mode === 'replace') {
      const ok = await modal({ title: 'Replace all current data?', body: '<p>Everything currently recorded will be replaced by the contents of <b>' + esc(file.name) + '</b>. A safety backup of your current data is saved first.</p>', actions: [{ label: 'Cancel', value: false }, { label: 'Replace data', value: true, primary: true, danger: true }] });
      if (!ok) return;
    }
    try {
      const r = await api('/api/import?mode=' + mode, { method: 'POST', body: text, headers: { 'Content-Type': 'text/plain' } });
      await KC.resync();
      await modal({ title: 'Import complete', body: '<p>' + (mode === 'replace' ? 'Your data was replaced.' : 'Merged safely. Nothing was double-counted.') + '</p><p>New hours added: <b>' + fmt(r.hoursAdded) + '</b><br>Hours updated: <b>' + fmt(r.hoursUpdated) + '</b><br>Days of speed data applied: <b>' + fmt(r.daysApplied) + '</b><br>Safety backup: <b>' + esc(r.backup || 'none needed') + '</b></p>' });
      pages.data.refreshBackups();
    } catch (e) { modal({ title: 'That file could not be imported', body: '<p>' + esc(e.message) + '</p><p>Nothing was changed.</p>' }); }
  }
  pages.data = {
    html() {
      const fmtCard = (f, t, d) => '<button class="fmt-card" data-export="' + f + '"><span class="fmt-tag">' + t + '</span><b>' + d[0] + '</b><small>' + d[1] + '</small></button>';
      return '<div class="page-wrap">' + header('YOUR DATA', 'Export, import and back up', 'Your history belongs to you. Take a copy, move it to another computer, or restore it.', rangeControls()) +
        '<section class="panel" style="--i:1"><div class="panel-head"><div><div class="panel-title">Export</div><div class="panel-hint">The summary covers the date range above. Every file also carries your full history so it can be restored.</div></div></div><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">' +
        fmtCard('json', 'JSON', ['Full backup', 'Complete and exact. Best for moving to another PC.']) + fmtCard('md', 'MARKDOWN', ['Readable report', 'A tidy write-up with the data tucked in at the end.']) + fmtCard('txt', 'TEXT', ['Plain-text report', 'Opens anywhere. Also restorable.']) + fmtCard('csv', 'CSV', ['Spreadsheet table', 'Totals and key counts for Excel. Report only, not restorable.']) + '</div></section>' +
        '<section class="panel section-gap" style="--i:2"><div class="panel-head"><div><div class="panel-title">Import</div><div class="panel-hint">Choose a .json, .txt or .md file exported from KeyClick Tracker (or an old KeyScope data file).</div></div></div>' +
        '<div class="radio-row"><label class="radio-card"><input type="radio" name="imode" value="merge" checked><span><b>Merge (recommended)</b><small>Adds anything missing and never double-counts, so importing the same file twice is harmless.</small></span></label><label class="radio-card"><input type="radio" name="imode" value="replace"><span><b>Replace</b><small>Swaps your current history for the file. A backup is made first.</small></span></label></div>' +
        '<div class="drop" id="drop">' + svg('upload', '') + '<p style="margin:10px 0 14px">Drop a file here, or</p><button class="btn primary" data-act="pick-file">Choose a file…</button><input type="file" id="file-in" accept=".json,.txt,.md,text/plain,application/json,text/markdown" hidden></div></section>' +
        '<div class="grid split-grid section-gap" style="--i:3"><section class="panel"><div class="panel-head"><div><div class="panel-title">Backups</div><div class="panel-hint">Made automatically before every update, before imports and clears, and once a day.</div></div><div class="header-controls"><button class="btn" data-act="backup-now">' + svg('plus') + 'Back up now</button><button class="btn" data-act="open-folder">' + svg('folder') + 'Open folder</button></div></div><div class="file-list" id="backups"><div class="empty-mini">Loading…</div></div></section>' +
        '<section class="panel"><div class="panel-head"><div><div class="panel-title">Start over</div><div class="panel-hint">Removes all recorded history from this PC. A backup is saved first, so you can undo it.</div></div></div><button class="btn danger" data-act="clear-data">' + svg('trash') + 'Clear all history…</button></section></div></div>';
    },
    mount(root) {
      pages.data.refreshBackups();
      const drop = $('#drop', root), inp = $('#file-in', root);
      inp.onchange = () => { doImport(inp.files[0]); inp.value = ''; };
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => doImport(e.dataTransfer.files[0]));
    },
    async refreshBackups() {
      const box = $('#backups'); if (!box) return;
      try {
        const list = await api('/api/backups');
        box.innerHTML = list.length ? list.slice(0, 12).map(b => '<div class="file-row"><span class="selectable">' + esc(b.name) + '</span><span class="muted">' + (b.size / 1024).toFixed(1) + ' KB · ' + KC.timeAgo(b.modified) + '</span></div>').join('') + (list.length > 12 ? '<div class="file-row muted">… and ' + (list.length - 12) + ' older ones in the folder</div>' : '') : '<div class="empty-mini">No backups yet.</div>';
      } catch (e) { box.innerHTML = '<div class="empty-mini">Could not list backups.</div>'; }
    },
    doExport, doImport
  };

  /* ----- appearance ----- */
  const themePreview = t => '<div class="tp" style="background:' + t[3] + '"><div class="ps" style="background:' + t[4] + '"><i style="background:' + t[10] + '"></i><i style="background:' + t[8] + '"></i><i style="background:' + t[8] + '"></i></div><div class="pm"><div class="pl" style="background:' + t[7] + ';opacity:.7"></div><div class="pc" style="background:' + t[5] + '"><i style="height:40%;background:' + t[10] + '"></i><i style="height:75%;background:' + t[11] + '"></i><i style="height:55%;background:' + t[10] + '"></i><i style="height:90%;background:' + t[11] + '"></i></div></div></div>';
  pages.appearance = {
    html() {
      const st = state.settings, dark = KC_THEMES.filter(t => t[2] === 'dark'), light = KC_THEMES.filter(t => t[2] === 'light');
      const grid = list => '<div class="theme-grid">' + list.map(t => '<button class="theme-card' + (st.theme === t[0] ? ' active' : '') + '" data-theme="' + t[0] + '">' + themePreview(t) + '<div class="tn">' + t[1] + '</div><div class="tm">' + t[2] + '</div></button>').join('') + '</div>';
      return '<div class="page-wrap">' + header('APPEARANCE', 'Make it yours', 'Thirty calm colour themes and fifteen type families. Changes apply instantly and are remembered.', '') +
        '<section class="panel" style="--i:1"><div class="panel-head"><div><div class="panel-title">Dark themes</div><div class="panel-hint">Easy on the eyes at night.</div></div></div>' + grid(dark) + '</section>' +
        '<section class="panel section-gap" style="--i:2"><div class="panel-head"><div><div class="panel-title">Light themes</div><div class="panel-hint">Soft paper tones for daytime.</div></div></div>' + grid(light) + '</section>' +
        '<section class="panel section-gap" style="--i:3"><div class="panel-head"><div><div class="panel-title">Typeface</div><div class="panel-hint">Fonts included with Windows. Nothing is downloaded.</div></div></div><div class="font-grid">' + KC_FONTS.map(f => '<button class="font-card' + (st.font === f[0] ? ' active' : '') + '" data-font="' + f[0] + '" style="font-family:' + f[2].replace(/"/g, "'") + '"><div class="fa">Aa 123</div><div class="fn" style="font-family:inherit">' + f[1] + '</div><div class="fs">Quiet counts, kept private.</div></button>').join('') + '</div></section>' +
        '<section class="panel section-gap" style="--i:4"><div class="panel-head"><div><div class="panel-title">Comfort</div></div></div>' +
        '<div class="setting-row"><div><div class="setting-title">Text size</div><div class="setting-help">Scales the whole interface.</div></div><div class="slider"><input type="range" id="scale" min="85" max="130" step="5" value="' + st.font_scale + '"><output id="scale-out">' + st.font_scale + '%</output></div></div>' +
        '<div class="setting-row"><div><div class="setting-title">Animations and transitions</div><div class="setting-help">Smooth page changes, hover motion and theme fades.</div></div><input type="checkbox" class="switch" id="sw-anim" ' + (st.animations ? 'checked' : '') + '></div>' +
        '<div class="setting-row"><div><div class="setting-title">Sliding digits</div><div class="setting-help">Numbers roll upward as they grow. Turn off for plain, instant numbers.</div></div><input type="checkbox" class="switch" id="sw-live" ' + (st.live_numbers ? 'checked' : '') + '></div></section></div>';
    },
    mount(root) {
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-theme]'), f = e.target.closest('[data-font]');
        if (t) { KC.applyTheme(t.dataset.theme, true); KC.saveSettings({ theme: t.dataset.theme }); $$('.theme-card', root).forEach(c => c.classList.toggle('active', c === t)); }
        if (f) { KC.applyFont(f.dataset.font); KC.saveSettings({ font: f.dataset.font }); $$('.font-card', root).forEach(c => c.classList.toggle('active', c === f)); }
      });
      const sc = $('#scale', root); sc.oninput = () => { KC.applyScale(+sc.value); $('#scale-out', root).textContent = sc.value + '%'; }; sc.onchange = () => KC.saveSettings({ font_scale: +sc.value });
      $('#sw-anim', root).onchange = e => { KC.applyMotion(e.target.checked); KC.saveSettings({ animations: e.target.checked }); };
      $('#sw-live', root).onchange = e => { KC.saveSettings({ live_numbers: e.target.checked }); };
    }
  };

  /* ----- settings ----- */
  pages.settings = {
    html() {
      const st = state.settings, ss = state.status || {}, sw = (id, on) => '<input type="checkbox" class="switch" id="' + id + '" ' + (on ? 'checked' : '') + '>';
      return '<div class="page-wrap">' + header('PREFERENCES', 'Settings', 'A few quiet options. Everything is stored on this PC.', '') +
        '<section class="panel" style="--i:1"><div class="panel-head"><div class="panel-title">Monitoring</div></div>' +
        '<div class="setting-row"><div><div class="setting-title">Record activity</div><div class="setting-help">Turn off to pause counting. The tray icon has the same switch.</div></div>' + sw('s-rec', !ss.paused) + '</div>' +
        '<div class="setting-row"><div><div class="setting-title">Keep running in the tray when closed</div><div class="setting-help">Closing the window hides it and keeps counting. Turn off to quit when the window closes.</div></div>' + sw('s-tray', ss.closeToTray !== false) + '</div>' +
        '<div class="setting-row"><div><div class="setting-title">Start with Windows</div><div class="setting-help">Launch quietly in the tray when you sign in.</div></div>' + sw('s-startup', ss.startup) + '</div>' +
        '<div class="setting-row"><div><div class="setting-title">Floating live box</div><div class="setting-help">A small rounded box with your live speed that stays on top of every window, even while this app sits in the tray. Drag it anywhere, pull its bottom-right corner to resize it, and hover to reveal the ✕ that closes it.</div></div>' + sw('s-overlay', st.overlay_on) + '</div></section>' +
        '<section class="panel section-gap" style="--i:2"><div class="panel-head"><div><div class="panel-title">Measuring units</div><div class="panel-hint">Pick how speed is shown everywhere, including the floating box.</div></div></div>' +
        '<div class="setting-row"><div><div class="setting-title">Typing speed</div><div class="setting-help">Words are counted as five characters each.</div></div>' + sel('u-typing', [['wps', 'WPS · words per second'], ['wpm', 'WPM · words per minute'], ['wph', 'WPH · words per hour']], st.typing_unit) + '</div>' +
        '<div class="setting-row"><div><div class="setting-title">Click rate</div></div>' + sel('u-click', [['cps', 'CPS · clicks per second'], ['cpm', 'CPM · clicks per minute'], ['cph', 'CPH · clicks per hour']], st.click_unit) + '</div></section>' +
        '<section class="panel section-gap" style="--i:2"><div class="panel-head"><div class="panel-title">Daily goals and care</div></div>' +
        '<div class="setting-row"><div><div class="setting-title">Daily key presses goal</div></div><input class="text-input num-input" type="number" min="0" step="500" id="g-keys" value="' + st.goal_keys + '"></div>' +
        '<div class="setting-row"><div><div class="setting-title">Daily clicks goal</div></div><input class="text-input num-input" type="number" min="0" step="100" id="g-clicks" value="' + st.goal_clicks + '"></div>' +
        '<div class="setting-row"><div><div class="setting-title">Break reminder (minutes)</div><div class="setting-help">A gentle tray notice after this many minutes of non-stop activity. Zero turns it off. A five-minute pause counts as a break.</div></div><input class="text-input num-input" type="number" min="0" max="480" step="5" id="g-break" value="' + st.break_minutes + '"></div></section>' +
        '<section class="panel section-gap" style="--i:3"><div class="panel-head"><div class="panel-title">Keyboard shortcuts</div></div><div class="kv"><div class="k">Switch pages</div><div class="v"><kbd>Ctrl</kbd> + <kbd>1</kbd> … <kbd>9</kbd></div><div class="k">Show or hide the sidebar</div><div class="v"><kbd>Ctrl</kbd> + <kbd>B</kbd></div><div class="k">Pause or resume recording</div><div class="v"><kbd>Ctrl</kbd> + <kbd>P</kbd></div><div class="k">Close a dialog</div><div class="v"><kbd>Esc</kbd></div></div></section>' +
        '<section class="panel section-gap" style="--i:4"><div class="panel-head"><div><div class="panel-title">Where your data lives</div><div class="panel-hint selectable">' + esc(ss.dataPath || '') + '</div></div><button class="btn" data-act="open-folder">' + svg('folder') + 'Open folder</button></div></section></div>';
    },
    mount(root) {
      const chk = (id, fn) => { $('#' + id, root).onchange = e => fn(e.target.checked, e.target); };
      chk('s-rec', async on => { await api('/api/status', { method: 'POST', body: JSON.stringify({ paused: !on }) }); KC.refreshStatus(); toast(on ? 'Recording resumed.' : 'Recording paused.'); });
      chk('s-tray', async on => { await KC.saveSettings({ close_to_tray: on }); state.status.closeToTray = on; });
      chk('s-startup', async (on, el) => { try { await api('/api/startup', { method: 'POST', body: JSON.stringify({ enabled: on }) }); toast(on ? 'Will start with Windows.' : 'Will no longer start with Windows.'); } catch (e) { el.checked = !on; toast('Could not change that: ' + e.message); } });
      chk('s-overlay', on => { KC.saveSettings({ overlay_on: on }); toast(on ? 'The floating live box is on.' : 'The floating live box is off.'); });
      $('#u-typing', root).onchange = e => { KC.saveSettings({ typing_unit: e.target.value }); KC.refreshBindings(); toast('Typing speed now shown in ' + KCU.LABEL[e.target.value] + '.'); };
      $('#u-click', root).onchange = e => { KC.saveSettings({ click_unit: e.target.value }); KC.refreshBindings(); toast('Click rate now shown in ' + KCU.LABEL[e.target.value] + '.'); };
      const num = (id, key) => { const el = $('#' + id, root); el.onchange = () => { const v = Math.max(0, Math.round(+el.value || 0)); el.value = v; KC.saveSettings({ [key]: v }).then(() => KC.refreshBindings()); }; };
      num('g-keys', 'goal_keys'); num('g-clicks', 'goal_clicks'); num('g-break', 'break_minutes');
    }
  };

  /* ----- update log & about ----- */
  pages.updates = {
    html() {
      const tag = { new: 'New', improved: 'Improved', fixed: 'Fixed' };
      return '<div class="page-wrap">' + header('WHAT’S NEW', 'Update Log', 'Every release, newest first. Your data is backed up before each update runs.', '') +
        '<section class="panel" style="--i:1">' + KC_CHANGELOG.map(r => '<div class="release"><h3>' + esc(r.title) + ' <span class="tag">' + (/^\d/.test(r.version) ? 'v' : '') + esc(r.version) + '</span></h3><div class="rd">' + esc(r.date) + '</div><div class="ri">' + esc(r.intro) + '</div>' + r.items.map(([k, t]) => '<div class="change"><span class="tag ' + k + '">' + tag[k] + '</span><span>' + esc(t) + '</span></div>').join('') + '</div>').join('') + '</section></div>';
    }
  };
  pages.about = {
    html() {
      const v = (state.status || {}).version || '1.1.0';
      return '<div class="page-wrap"><section class="panel about-hero" style="--i:0"><img src="/ui/logo.png" alt=""><h2>KeyClick Tracker</h2><p>A quiet companion that counts your keys, clicks and scrolls, so you can see the shape of your day. It never records what you type or where your cursor goes.</p><div><span class="badge-pill">Version ' + esc(v) + '</span><span class="badge-pill">Windows 10 / 11</span><span class="badge-pill">100% local</span></div></section>' +
        '<div class="grid two-col section-gap" style="--i:2"><section class="panel"><div class="panel-title" style="margin-bottom:10px">What is recorded</div><p class="muted" style="margin:0;line-height:1.7">Which key (for example “A” or “Space”), which mouse button, scroll direction, and how many times, grouped by hour. Plus a small per-day summary of active minutes for speed figures.</p></section><section class="panel"><div class="panel-title" style="margin-bottom:10px">What is never recorded</div><p class="muted" style="margin:0;line-height:1.7">Typed text, passwords, key sequences, clipboard contents, cursor positions, window titles or screenshots. Nothing leaves your computer.</p></section></div></div>';
    }
  };

  /* ---------- router & events ---------- */
  KC.pages = pages;
  function moveNavIndicator() {
    const a = $('.nav-item.active'), ind = $('#nav-ind');
    if (!a || !ind) return;
    ind.style.height = a.offsetHeight + 'px';
    ind.style.transform = 'translateY(' + a.offsetTop + 'px)';
    ind.classList.add('on');
  }
  KC.moveNavIndicator = moveNavIndicator;
  let navSeq = 0;
  KC.setPage = function (id, keepScroll) {
    if (!pages[id]) id = 'overview';
    const seq = ++navSeq, c = $('#content');
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === id));
    moveNavIndicator();
    $('#crumb-title').textContent = TITLES[id];
    const run = () => {
      if (seq !== navSeq) return;                      // a newer click superseded this one
      if (cur && cur.unmount) cur.unmount();
      state.page = id; cur = pages[id];
      const top = c.scrollTop;
      c.classList.remove('leaving');
      c.innerHTML = cur.html();
      KC.hydrate(c, !keepScroll);
      if (cur.mount) cur.mount(c);
      if (cur.update) cur.update(c);
      c.scrollTop = keepScroll ? top : 0;
      try { sessionStorage.setItem('kc_page', id); } catch (e) {}
    };
    if (!keepScroll && cur && state.settings.animations && c.firstElementChild) { c.classList.add('leaving'); setTimeout(run, 140); } else run();
  };
  KC.onPaint = function () { const c = $('#content'); if (cur && cur.update && c) cur.update(c); };
  KC.onKeys = function (f) { if (cur && cur.onKeys) cur.onKeys(f, $('#content')); };
  const baseResync = KC.resync;
  KC.resync = async function () { await baseResync(); if (state.page === 'history') loadCal(); };

  async function reload(keep) { try { state.stats = await api('/api/stats?' + KC.statsQuery()); } catch (e) { toast('Could not refresh the statistics.'); } KC.setPage(state.page, keep); }

  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.id === 'range-select') { state.range = t.value; if (state.range === 'custom') { const n = new Date(); state.from = n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-01'; state.to = n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); KC.setPage(state.page, true); } else reload(true); }
    if (t.id === 'unit-select') { state.unit = t.value; reload(true); }
  });
  document.addEventListener('click', async e => {
    const b = e.target.closest('button,[data-act],[data-page],[data-export],[data-mode]'); if (!b) return;
    if (b.dataset.page) return KC.setPage(b.dataset.page);
    if (b.dataset.mode) { state.chartMode = b.dataset.mode; $$('#chart-mode button').forEach(x => x.classList.toggle('active', x === b)); drawChart($('#main-chart')); return; }
    if (b.dataset.export) return doExport(b.dataset.export);
    if (b.closest('#tt-dur') && b.dataset.d) { tt.dur = +b.dataset.d; $$('#tt-dur button').forEach(x => x.classList.toggle('active', x === b)); return ttStart(); }
    switch (b.dataset.act) {
      case 'apply-custom': { const f = $('#custom-from').value, t = $('#custom-to').value; if (!f || !t || f > t) return toast('Please choose a valid date range.'); state.from = f; state.to = t; return reload(true); }
      case 'cal-prev': state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() - 1, 1); return loadCal();
      case 'cal-next': state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + 1, 1); return loadCal();
      case 'tt-new': return ttStart();
      case 'pick-file': return $('#file-in').click();
      case 'open-folder': try { await api('/api/openfolder', { method: 'POST' }); } catch (err) { toast('Could not open the folder.'); } return;
      case 'backup-now': try { const r = await api('/api/backups', { method: 'POST' }); toast('Backup saved: ' + r.created); pages.data.refreshBackups(); } catch (err) { toast('Backup failed: ' + err.message); } return;
      case 'clear-data': return KC.clearData();
    }
  });
  KC.clearData = async function () {
    const root = $('#modal-root');
    const result = await new Promise(resolve => {
      root.innerHTML = '<div class="modal"><h3>Clear all history?</h3><p>This removes every recorded count from this PC. A backup is saved first, so you can restore it from Data &amp; Backup.</p><p>Type <b>DELETE</b> to confirm.</p><input class="text-input" id="confirm-in" autocomplete="off" placeholder="DELETE"><div class="actions"><button class="btn" id="c-no">Cancel</button><button class="btn danger" id="c-yes" disabled>Clear history</button></div></div>';
      root.classList.add('open');
      const inp = $('#confirm-in', root), yes = $('#c-yes', root);
      inp.oninput = () => { yes.disabled = inp.value.trim() !== 'DELETE'; };
      $('#c-no', root).onclick = () => resolve(false); yes.onclick = () => resolve(true);
      root.onclick = ev => { if (ev.target === root) resolve(false); };
      KC._closeModal = () => resolve(false);
      setTimeout(() => inp.focus(), 60);
    });
    root.classList.remove('open'); root.innerHTML = '';
    if (!result) return;
    try { const r = await api('/api/data', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) }); await KC.resync(); KC.setPage(state.page, true); toast('History cleared. Backup: ' + r.backup); } catch (err) { toast('Nothing was deleted: ' + err.message); }
  };
})();
