/* Measuring units shared by the main window and the live overlay.
   The server always works in "per minute"; this converts for display only. */
window.KCU = {
  FACTOR: { wps: 1 / 60, wpm: 1, wph: 60, cps: 1 / 60, cpm: 1, cph: 60 },
  LABEL: { wps: 'WPS', wpm: 'WPM', wph: 'WPH', cps: 'CPS', cpm: 'CPM', cph: 'CPH' },
  NAME: { wps: 'words per second', wpm: 'words per minute', wph: 'words per hour', cps: 'clicks per second', cpm: 'clicks per minute', cph: 'clicks per hour' },
  /* perMinute value -> value in `unit` */
  convert(perMin, unit) { return (Number(perMin) || 0) * (this.FACTOR[unit] || 1); },
  /* decimals to show: `base` is what a per-minute value would use */
  decimals(unit, base) { return unit.endsWith('s') ? base + 1 + (base ? 1 : 0) : unit.endsWith('h') ? 0 : base; },
  format(perMin, unit, base) {
    const d = this.decimals(unit, base || 0);
    return this.convert(perMin, unit).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
};
