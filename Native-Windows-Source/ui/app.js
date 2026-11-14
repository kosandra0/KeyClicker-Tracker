/* KeyClick Tracker boot sequence. */
(function () {
  'use strict';
  const { $, $$, state, api, toast } = KC;

  function applyCollapsed() {
    $('#sidebar').classList.toggle('collapsed', state.collapsed);
    try { localStorage.setItem('kc_collapsed', state.collapsed ? '1' : '0'); } catch (e) {}
  }

  async function togglePause() {
    const paused = !(state.status && state.status.paused);
    try { await api('/api/status', { method: 'POST', body: JSON.stringify({ paused }) }); await KC.refreshStatus(); toast(paused ? 'Recording paused.' : 'Recording resumed.'); if (state.page === 'settings') KC.setPage('settings', true); } catch (e) { toast('Could not change recording: ' + e.message); }
  }

  async function boot() {
    KC.buildNav();
    KC.wireWindow();
    applyCollapsed();
    $('#sidebar-toggle').onclick = () => { state.collapsed = !state.collapsed; applyCollapsed(); };
    $('#pause-top').onclick = togglePause;
    KC.hydrate($('#titlebar'), false);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('#modal-root').classList.contains('open') && KC._closeModal) { KC._closeModal(); return; }
      if (!e.ctrlKey || e.altKey || e.shiftKey) return;
      const ids = ['overview', 'keyboard', 'mouse', 'speed', 'history', 'data', 'appearance', 'settings', 'updates'];
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); KC.setPage(ids[+e.key - 1]); }
      else if (e.key.toLowerCase() === 'b') { e.preventDefault(); state.collapsed = !state.collapsed; applyCollapsed(); }
      else if (e.key.toLowerCase() === 'p') { e.preventDefault(); togglePause(); }
    });

    // settings first so the saved theme, font and size apply before the first real paint
    try {
      const r = await api('/api/settings');
      Object.assign(state.settings, r.settings);
    } catch (e) { console.error(e); }
    KC.applyTheme(state.settings.theme, false);
    KC.applyFont(state.settings.font);
    KC.applyScale(state.settings.font_scale);
    KC.applyMotion(state.settings.animations);

    await KC.refreshStatus();
    $('#side-version').textContent = 'v' + ((state.status && state.status.version) || '2.0');
    try {
      const [s, a] = await Promise.all([api('/api/stats?' + KC.statsQuery()), api('/api/stats?range=all&unit=daily')]);
      state.stats = s; state.all = a;
    } catch (e) { toast('Could not load your statistics yet.'); }

    let start = 'overview';
    try { start = sessionStorage.getItem('kc_page') || 'overview'; } catch (e) {}
    KC.setPage(start);
    KC.wireFx();
    KC.refreshBindings();
    window.addEventListener('resize', () => KC.moveNavIndicator());
    setTimeout(KC.moveNavIndicator, 400);
    KC.startLive();
    setInterval(KC.refreshStatus, 10000);

    // Tell the native window the first frame is ready so it can appear without a white flash.
    requestAnimationFrame(() => requestAnimationFrame(() => { if (typeof window.kcReady === 'function') window.kcReady(); }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
