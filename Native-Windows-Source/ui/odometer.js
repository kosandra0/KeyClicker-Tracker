/* Sliding-digit odometer. Each digit is a vertical strip that rolls to its new
   value, so a counter climbs as keys are pressed instead of jumping.
   Usage: const o = new KCOdo(element); o.set('12,345', animate) */
(function () {
  const STRIP = 30;               // three copies of 0-9 so a 9→0 roll keeps moving upward
  const SETTLE = 20;              // re-centre the strip once it has travelled this far

  function digitCell(initial) {
    const el = document.createElement('span');
    el.className = 'od';
    const strip = document.createElement('span');
    strip.className = 'od-strip';
    for (let i = 0; i < STRIP; i++) {
      const d = document.createElement('span');
      d.textContent = i % 10;
      strip.appendChild(d);
    }
    el.appendChild(strip);
    const cell = { type: 'digit', el, strip, pos: initial, shown: initial };
    place(cell, false);
    strip.addEventListener('transitionend', () => settle(cell));
    return cell;
  }

  function place(cell, animate, delay) {
    const s = cell.strip.style;
    s.transitionDuration = animate ? '' : '0ms';
    s.transitionDelay = animate && delay ? delay + 'ms' : '0ms';
    s.transform = 'translateY(calc(' + (-cell.pos) + ' * var(--lh)))';
    cell.shown = cell.pos;
  }

  // Quietly move a strip back to the first copy of the digits after it has rolled.
  function settle(cell) {
    if (cell.pos >= 10) {
      cell.pos %= 10;
      cell.strip.style.transitionDuration = '0ms';
      cell.strip.style.transitionDelay = '0ms';
      cell.strip.style.transform = 'translateY(calc(' + (-cell.pos) + ' * var(--lh)))';
    }
  }

  function setDigit(cell, value, animate, delay) {
    const cur = ((cell.pos % 10) + 10) % 10;
    if (cur === value && animate) return;
    if (!animate) { cell.pos = value; place(cell, false); return; }
    const step = (value - cur + 10) % 10;       // always roll forward
    cell.pos += step;
    if (cell.pos >= SETTLE) {                    // too far from the origin: jump back first
      cell.pos = cell.pos % 10;
      place(cell, false);
      cell.pos += step;
      void cell.el.offsetWidth;
    }
    place(cell, true, delay);
  }

  function KCOdo(el) {
    this.el = el;
    this.cells = [];             // index 0 = right-most character
    this.text = '';
    el.classList.add('odo');
  }

  KCOdo.prototype.set = function (text, animate) {
    text = String(text);
    if (text === this.text) return;
    const old = this.text;
    this.text = text;
    this.el.setAttribute('aria-label', text);
    const chars = Array.from(text);
    const n = chars.length;
    const cells = this.cells;
    let structural = false;
    const bigJump = animate && Math.abs((parseFloat(text.replace(/,/g, '')) || 0) - (parseFloat(old.replace(/,/g, '')) || 0)) > 9;
    for (let i = 0; i < n; i++) {
      const ch = chars[n - 1 - i];
      const isDigit = ch >= '0' && ch <= '9';
      let c = cells[i];
      if (!c || (c.type === 'digit') !== isDigit) {
        const fresh = isDigit ? digitCell(0) : { type: 'text', el: Object.assign(document.createElement('span'), { className: 'od-sep' }) };
        fresh.el.dataset.fresh = '1';
        if (c) { c.el.replaceWith(fresh.el); }
        cells[i] = c = fresh;
        structural = true;
        if (!c.entering && i >= (old ? Array.from(old).length : 0)) {
          c.el.classList.add('od-enter');           // new leading digit grows in
          requestAnimationFrame(() => requestAnimationFrame(() => c.el.classList.remove('od-enter')));
        }
      }
      if (isDigit) setDigit(c, +ch, animate, bigJump ? Math.min(i * 28, 220) : 0);
      else if (c.el.textContent !== ch) c.el.textContent = ch;
    }
    if (cells.length > n) {
      for (let i = n; i < cells.length; i++) cells[i].el.remove();
      cells.length = n;
      structural = true;
    }
    if (structural) {
      const frag = document.createDocumentFragment();
      for (let i = n - 1; i >= 0; i--) frag.appendChild(cells[i].el);
      this.el.replaceChildren(frag);
    }
  };

  window.KCOdo = KCOdo;
})();
