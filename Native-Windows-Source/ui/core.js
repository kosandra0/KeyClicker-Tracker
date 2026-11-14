/* KeyClick Tracker core: state, API, live feed, theming, window controls. */
(function () {
  'use strict';
  const KC = (window.KC = {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  KC.$ = $; KC.$$ = $$;

  /* ---------- token & state ---------- */
  const params = new URLSearchParams(location.search);
  let token = params.get('token') || '';
  try {
    if (token) { sessionStorage.setItem('kc_token', token); history.replaceState(null, '', location.pathname); }
    else token = sessionStorage.getItem('kc_token') || '';
  } catch (e) {}
  KC.token = token;

  KC.state = {
    page: 'overview', range: 'last7', unit: 'daily', from: '', to: '', chartMode: 'events',
    stats: null, all: null, status: null,
    settings: { theme: 'classic', font: 'segoe', font_scale: 100, animations: true, live_numbers: true, goal_keys: 8000, goal_clicks: 1500, break_minutes: 0, user_name: '', clock_24h: false, typing_unit: 'wpm', click_unit: 'cpm', overlay_on: false },
    live: { wpm: 0, cpm: 0, kpm: 0 },
    xp: { level: 1, title: 'Newcomer', pct: 0, events: 0, next: 60 },
    collapsed: false, calMonth: new Date(), calStats: null
  };
  const state = KC.state;
  try { state.collapsed = localStorage.getItem('kc_collapsed') === '1'; } catch (e) {}

  /* ---------- formatting ---------- */
  KC.fmt = n => Math.round(Number(n || 0)).toLocaleString('en-US');
  KC.f1 = n => (Number(n) || 0).toFixed(1);
  KC.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const keyLabels = { Space: 'Space', Backspace: 'Backspace', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', ShiftLeft: 'Shift', ShiftRight: 'Shift', AltLeft: 'Alt', AltRight: 'Alt', MetaLeft: 'Win', MetaRight: 'Win', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Escape: 'Esc', CapsLock: 'Caps', PageUp: 'PgUp', PageDown: 'PgDn', BracketLeft: '[', BracketRight: ']', Backquote: '`', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Minus: '-', Equal: '=', ContextMenu: 'Menu', Delete: 'Del', Insert: 'Ins' };
  KC.keyLabel = id => keyLabels[id] || String(id).replace('Numpad', 'Num ');
  KC.timeAgo = iso => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' days ago';
  };
  KC.hourName = h => (h % 12 || 12) + (h < 12 ? ' AM' : ' PM');
  KC.dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /* ---------- API ---------- */
  KC.api = async function (path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {}, { 'X-KeyScope-Token': token });
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(path, Object.assign({}, opts, { headers, cache: 'no-store' }));
    if (!r.ok) throw new Error((await r.text().catch(() => '')) || 'Request failed (' + r.status + ')');
    if (r.status === 204) return null;
    return (r.headers.get('content-type') || '').includes('application/json') ? r.json() : r;
  };
  KC.statsQuery = (over = {}) => {
    const q = new URLSearchParams({ range: state.range, unit: state.unit });
    if (state.range === 'custom') { q.set('from', state.from); q.set('to', state.to); }
    for (const k in over) q.set(k, over[k]);
    return q.toString();
  };

  /* ---------- toast & modal ---------- */
  KC.toast = function (msg) {
    const n = document.createElement('div');
    n.className = 'toast'; n.textContent = msg; $('#toasts').append(n);
    setTimeout(() => { n.classList.add('out'); setTimeout(() => n.remove(), 320); }, 3400);
  };
  KC.modal = function ({ title, body, actions }) {
    return new Promise(resolve => {
      const root = $('#modal-root');
      root.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3>' + KC.esc(title) + '</h3><div class="mbody">' + body + '</div><div class="actions"></div></div>';
      const bar = $('.actions', root);
      const close = v => { root.classList.remove('open'); root.innerHTML = ''; resolve(v); };
      (actions || [{ label: 'OK', value: true, primary: true }]).forEach(a => {
        const b = document.createElement('button');
        b.className = 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '');
        b.textContent = a.label;
        b.onclick = () => close(a.value);
        bar.append(b);
      });
      root.onclick = e => { if (e.target === root) close(null); };
      KC._closeModal = () => close(null);
      root.classList.add('open');
      const first = $('input,textarea', root) || $('.btn.primary', root);
      if (first) setTimeout(() => first.focus(), 60);
    });
  };

  /* ---------- theme & fonts ---------- */
  const cssVars = t => ({ '--bg': t[3], '--side': t[4], '--panel': t[5], '--panel2': t[6], '--ink': t[7], '--muted': t[8], '--line': t[9], '--accent': t[10], '--accent2': t[11] });
  KC.applyTheme = function (id, animate) {
    const t = KC_THEMES.find(x => x[0] === id) || KC_THEMES[0];
    const root = document.documentElement;
    if (animate && state.settings.animations) { root.classList.add('theming'); clearTimeout(KC._tt); KC._tt = setTimeout(() => root.classList.remove('theming'), 600); }
    const vars = cssVars(t);
    for (const k in vars) root.style.setProperty(k, vars[k]);
    root.classList.toggle('light', t[2] === 'light');
    state.settings.theme = t[0];
    savePrefs();
  };
  KC.applyFont = function (id) {
    const f = KC_FONTS.find(x => x[0] === id) || KC_FONTS[0];
    document.documentElement.style.setProperty('--font', f[2]);
    // these faces draw old-style (uneven) numerals, which look ragged in rolling counters
    document.documentElement.classList.toggle('num-lining', ['georgia', 'constantia', 'candara', 'corbel', 'palatino'].includes(f[0]));
    state.settings.font = f[0];
    savePrefs();
  };
  KC.applyScale = function (pct) {
    state.settings.font_scale = pct;
    document.documentElement.style.setProperty('--scale', pct / 100);
  };
  KC.applyMotion = function (on) {
    state.settings.animations = on;
    document.documentElement.classList.toggle('no-anim', !on);
    savePrefs();
  };
  function savePrefs() {
    try {
      const t = KC_THEMES.find(x => x[0] === state.settings.theme) || KC_THEMES[0];
      const f = KC_FONTS.find(x => x[0] === state.settings.font) || KC_FONTS[0];
      localStorage.setItem('kc_prefs', JSON.stringify({ vars: cssVars(t), mode: t[2], font: f[2], anim: state.settings.animations }));
    } catch (e) {}
  }
  KC.saveSettings = async function (patch) {
    Object.assign(state.settings, patch);
    try {
      const r = await KC.api('/api/settings', { method: 'POST', body: JSON.stringify(patch) });
      if (r && r.settings) Object.assign(state.settings, r.settings);
      if (r && 'close_to_tray' in r) state.closeToTray = r.close_to_tray;
    } catch (e) { KC.toast('Could not save that setting: ' + e.message); }
  };

  /* ---------- odometer bindings ---------- */
  const odos = new WeakMap();
  const getPath = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
  const unitOf = k => (k === 'w' ? state.settings.typing_unit : state.settings.click_unit) || (k === 'w' ? 'wpm' : 'cpm');
  KC.unitLabel = k => KCU.LABEL[unitOf(k)];
  KC.unitName = k => KCU.NAME[unitOf(k)];
  KC.rate = (perMin, k, base) => KCU.format(perMin, unitOf(k), base || 0);
  function display(el) {
    const v = getPath(el.dataset.odo);
    if (v == null) return '–';
    if (el.dataset.conv) return KCU.format(v, unitOf(el.dataset.conv), +el.dataset.dec || 0);
    const dec = +el.dataset.dec || 0;
    return dec ? Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : KC.fmt(v);
  }
  const animOK = () => state.settings.animations && state.settings.live_numbers;
  KC.hydrate = function (root, intro) {
    $$('[data-odo]', root).forEach(el => {
      let o = odos.get(el);
      if (!o) { o = new KCOdo(el); odos.set(el, o); if (intro && animOK()) { o.set(el.dataset.conv ? KCU.format(0, unitOf(el.dataset.conv), +el.dataset.dec || 0) : el.dataset.dec ? '0.' + '0'.repeat(+el.dataset.dec) : '0', false); requestAnimationFrame(() => o.set(display(el), true)); return; } }
      o.set(display(el), animOK());
    });
  };
  /* Experience level: level L needs 60 * (L-1)^2 recorded events. */
  const RANKS = [[100, 'Legend'], [75, 'Grandmaster'], [50, 'Master'], [35, 'Expert'], [20, 'Skilled'], [10, 'Regular'], [5, 'Apprentice'], [1, 'Newcomer']];
  KC.computeXP = function () {
    const ev = state.all && state.all.totals ? state.all.totals.events : 0;
    const level = Math.floor(Math.sqrt(ev / 60)) + 1, lo = 60 * (level - 1) ** 2, hi = 60 * level ** 2;
    state.xp = { level, title: RANKS.find(r => level >= r[0])[1], pct: Math.min(100, (ev - lo) / (hi - lo) * 100), events: ev, next: hi, lo };
    const fill = $('#xp-fill'); if (fill) fill.style.width = state.xp.pct.toFixed(1) + '%';
    const t = $('#xp-title'); if (t) t.textContent = state.xp.title;
    const chip = $('#xp-chip'); if (chip) chip.dataset.tip = state.xp.title + ' · level ' + level + '\n' + KC.fmt(ev) + ' events made\n' + KC.fmt(hi - ev) + ' more to reach level ' + (level + 1);
  };
  KC.refreshBindings = function () {
    KC.computeXP();
    $$('[data-unit]').forEach(el => { el.textContent = KC.unitLabel(el.dataset.unit); });
    $$('[data-unitname]').forEach(el => { el.textContent = KC.unitName(el.dataset.unitname); });
    $$('[data-odo]').forEach(el => { const o = odos.get(el); if (o) o.set(display(el), animOK()); });
    $$('[data-text]').forEach(el => { const v = getPath(el.dataset.text); el.textContent = el.dataset.fmt === 'dec' ? KC.f1(v) : KC.fmt(v); });
    KC.onPaint && KC.onPaint();
  };

  /* ---------- live feed ---------- */
  let paintQueued = false, resyncTimer = 0, es = null, wasDown = false;
  KC.schedulePaint = function () {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(() => { paintQueued = false; KC.refreshBindings(); });
  };
  function bump(list, ids) {
    if (!ids) return;
    for (const id in ids) {
      const it = list.find(x => x.id === id);
      if (it) it.count += ids[id]; else list.push({ id, count: ids[id] });
    }
  }
  function seriesKey(d, unit) {
    const p = n => String(n).padStart(2, '0');
    const ymd = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    switch (unit) {
      case 'hour': return ymd + 'T' + p(d.getHours());
      case 'monthly': return d.getFullYear() + '-' + p(d.getMonth() + 1);
      case 'yearly': return String(d.getFullYear());
      case 'quarterly': return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
      case 'weekly': { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); }
      default: return ymd;
    }
  }
  function seriesLabel(d, unit) {
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    switch (unit) {
      case 'hour': return M[d.getMonth()] + ' ' + d.getDate() + ' · ' + KC.hourName(d.getHours());
      case 'monthly': return M[d.getMonth()] + ' ' + d.getFullYear();
      case 'yearly': return String(d.getFullYear());
      case 'quarterly': return 'Q' + (Math.floor(d.getMonth() / 3) + 1) + ' ' + d.getFullYear();
      case 'weekly': { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); return 'Week of ' + M[x.getMonth()] + ' ' + x.getDate(); }
      default: return D[d.getDay()] + ', ' + M[d.getMonth()] + ' ' + d.getDate();
    }
  }
  function applyDelta(S, f, now, isRange) {
    const t = S.totals;
    t.keys += f.k || 0; t.clicks += f.c || 0; t.scrolls += f.s || 0;
    t.events += (f.k || 0) + (f.c || 0) + (f.s || 0); t.chars = (t.chars || 0) + (f.ch || 0); t.scrollDistance += f.u || 0;
    bump(S.keys, f.ki); bump(S.mouse, f.mi); bump(S.scroll, f.si);
    if (isRange) {
      const key = seriesKey(now, S.unit);
      let p = S.series.find(x => x.key === key);
      if (!p) { p = { key, label: seriesLabel(now, S.unit), keys: 0, clicks: 0, scrolls: 0, events: 0 }; S.series.push(p); }
      p.keys += f.k || 0; p.clicks += f.c || 0; p.scrolls += f.s || 0; p.events += (f.k || 0) + (f.c || 0) + (f.s || 0);
    }
    const h = S.hourOfDay[now.getHours()], d = S.dayOfWeek[(now.getDay() + 6) % 7];
    for (const b of [h, d]) { b.keys += f.k || 0; b.clicks += f.c || 0; b.scrolls += f.s || 0; }
    S.heatmap[(now.getDay() + 6) % 7][now.getHours()] += (f.k || 0) + (f.c || 0) + (f.s || 0);
  }
  function onFrame(f) {
    state.live = { wpm: f.wpm || 0, cpm: f.cpm || 0, kpm: f.kpm || 0 };
    $('#live-chip').classList.toggle('active', (f.wpm || 0) + (f.cpm || 0) > 0);
    const any = (f.k || 0) + (f.c || 0) + (f.s || 0);
    if (any) {
      const now = new Date();
      if (state.stats && state.stats.includesNow) applyDelta(state.stats, f, now, true);
      if (state.all) { applyDelta(state.all, f, now, false); state.all.today.keys += f.k || 0; state.all.today.clicks += f.c || 0; }
      if (state.stats) { state.stats.session.keys += f.k || 0; state.stats.session.clicks += f.c || 0; state.stats.session.scrolls += f.s || 0; }
      KC.onKeys && KC.onKeys(f);
      clearTimeout(resyncTimer);
      resyncTimer = setTimeout(KC.resync, 2500);   // quietly reconcile with the server once input pauses
    }
    KC.schedulePaint();
  }
  KC.startLive = function () {
    if (es) es.close();
    es = new EventSource('/api/live?token=' + encodeURIComponent(token));
    es.onmessage = e => { try { onFrame(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    es.onerror = () => { wasDown = true; $('#status-text').textContent = 'Reconnecting…'; };
    es.onopen = () => { if (wasDown) { wasDown = false; KC.refreshStatus(); KC.resync(); } };
  };
  KC.resync = async function () {
    try {
      const [s, a] = await Promise.all([KC.api('/api/stats?' + KC.statsQuery()), KC.api('/api/stats?range=all&unit=daily')]);
      state.stats = s; state.all = a;
      KC.refreshBindings();
    } catch (e) { console.error(e); }
  };
  KC.refreshStatus = async function () {
    try {
      state.status = await KC.api('/api/status');
      const st = state.status, pill = $('#status-pill');
      pill.className = 'status-pill ' + (st.paused ? 'paused' : st.agentConnected ? 'active' : '');
      $('#status-text').textContent = st.paused ? 'Paused' : st.agentConnected ? 'Recording' : 'Hooks unavailable';
      $('#pause-label').textContent = st.paused ? 'Resume' : 'Pause';
      $('#pause-icon').innerHTML = '<svg viewBox="0 0 24 24">' + (st.paused ? '<path d="m8 5 12 7-12 7z"/>' : '<path d="M8 5v14M16 5v14"/>') + '</svg>';
    } catch (e) { $('#status-text').textContent = 'Offline'; }
  };

  /* ---------- window controls (native frameless window) ---------- */
  KC.wireWindow = function () {
    const call = (fn, ...a) => { if (typeof window[fn] === 'function') window[fn](...a); };
    $('#tl-min').onclick = () => call('kcMinimize');
    $('#tl-max').onclick = () => call('kcMaximize');
    $('#tl-close').onclick = () => call('kcClose');
    document.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const edge = e.target.closest && e.target.closest('[data-edge]');
      if (edge) { e.preventDefault(); call('kcResize', edge.dataset.edge); return; }
      const drag = e.target.closest && e.target.closest('[data-drag]');
      if (drag && !e.target.closest('button,select,input,textarea,a,.traffic,.pause-top,.live-chip,.status-pill')) { call('kcDrag'); }
    });
    $('#titlebar').addEventListener('dblclick', e => { if (!e.target.closest('button,select,input,.traffic')) call('kcMaximize'); });
    window.addEventListener('dragover', e => e.preventDefault());   // never let a dropped file navigate the window
    window.addEventListener('drop', e => { if (!e.target.closest || !e.target.closest('.drop')) e.preventDefault(); });
  };

  /* ---------- themed tooltip (replaces the Windows default title box) ---------- */
  KC.wireFx = function () {
    const tip = $('#tip');
    let target = null;
    const place = e => {
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let x = e.clientX + 14, y = e.clientY + 18;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14;
      if (y + h > innerHeight - 8) y = e.clientY - h - 14;
      tip.style.transform = 'translate(' + Math.max(8, x) + 'px,' + Math.max(8, y) + 'px)';
    };
    document.addEventListener('mouseover', e => {
      const el = e.target.closest && e.target.closest('[title],[data-tip]');
      if (!el || el === target) return;
      if (el.hasAttribute('title')) { el.dataset.tip = el.getAttribute('title'); el.removeAttribute('title'); }  // stop the native box
      if (!el.dataset.tip) return;
      target = el; tip.textContent = el.dataset.tip; tip.classList.add('show'); place(e);
    });
    document.addEventListener('mousemove', e => { if (target) place(e); });
    document.addEventListener('mouseout', e => {
      if (target && (!e.relatedTarget || !target.contains(e.relatedTarget))) { target = null; tip.classList.remove('show'); }
    });
    document.addEventListener('scroll', () => { target = null; tip.classList.remove('show'); }, true);

    // soft ripple on buttons and cards
    document.addEventListener('pointerdown', e => {
      if (!state.settings.animations) return;
      const el = e.target.closest && e.target.closest('.btn,.nav-item,.fmt-card,.theme-card,.font-card,.segmented button,.pause-top,.icon-btn,.clock');
      if (!el) return;
      const r = el.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2;
      const d = document.createElement('span');
      d.className = 'ripple';
      d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
      el.append(d);
      setTimeout(() => d.remove(), 650);
    });
  };

  KC.overlayClosed = function () {      // called by the native side when the live box is closed with its X
    state.settings.overlay_on = false;
    const sw = $('#s-overlay'); if (sw) sw.checked = false;
    KC.toast('Live box closed. You can turn it back on in Settings.');
  };
})();
