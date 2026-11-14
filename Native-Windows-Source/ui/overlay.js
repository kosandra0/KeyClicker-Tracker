/* Live overlay: shows current typing speed and click rate; stays on top of other windows. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search), token = q.get('token') || '';
  try { if (token) sessionStorage.setItem('kc_token', token); } catch (e) {}
  const $ = s => document.querySelector(s);
  const H = { 'X-KeyScope-Token': token };
  const odoW = new KCOdo($('#n-w')), odoC = new KCOdo($('#n-c'));
  let units = { w: 'wpm', c: 'cpm' }, live = { wpm: 0, cpm: 0 };
  const call = (fn, ...a) => { if (typeof window[fn] === 'function') window[fn](...a); };

  function paint() {
    odoW.set(KCU.format(live.wpm, units.w, 0), true);
    odoC.set(KCU.format(live.cpm, units.c, 0), true);
    $('#u-w').textContent = KCU.LABEL[units.w];
    $('#u-c').textContent = KCU.LABEL[units.c];
  }
  async function loadSettings() {
    try {
      const r = await (await fetch('/api/settings', { headers: H, cache: 'no-store' })).json();
      units = { w: r.settings.typing_unit || 'wpm', c: r.settings.click_unit || 'cpm' };
      paint();
    } catch (e) {}
  }
  function connect() {
    const es = new EventSource('/api/live?token=' + encodeURIComponent(token));
    es.onmessage = e => { try { const f = JSON.parse(e.data); live = { wpm: f.wpm || 0, cpm: f.cpm || 0 }; paint(); } catch (err) {} };
    es.onopen = loadSettings;
  }
  const ov = $('#ov');
  ov.addEventListener('mouseenter', () => call('kcOvHover', true));
  ov.addEventListener('mouseleave', () => call('kcOvHover', false));
  ov.addEventListener('mousedown', e => {
    if (e.button !== 0 || e.target.closest('.x,.grip')) return;
    call('kcOvDrag');
  });
  $('#grip').addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); call('kcOvResize'); });
  $('#x').addEventListener('click', e => { e.stopPropagation(); call('kcOvClose'); });
  window.addEventListener('contextmenu', e => e.preventDefault());
  setInterval(loadSettings, 5000);   // picks up unit changes made in the main window
  paint(); loadSettings(); connect();
})();
