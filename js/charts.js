// Petits graphiques SVG sans dépendance : courbe de score et barres de minutes.

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, String(v));
  parent?.append(e);
  return e;
}

const fmtDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
export const shortDate = (iso) => fmtDay.format(new Date(iso));

function text(parent, x, y, str, attrs = {}) {
  const t = svgEl('text', { x, y, ...attrs }, parent);
  t.textContent = str;
  return t;
}

// Score 0-100 dans le temps. points : [{ at, value }]
export function lineChart(points, label) {
  const svg = svgEl('svg', { viewBox: '0 0 320 150', width: '100%', role: 'img', 'aria-label': label, class: 'chart' });
  for (const [y, cls, lab] of [[20, 'grid', '100'], [70, 'grid', '50'], [120, 'axis', '']]) {
    svgEl('line', { x1: 24, x2: 320, y1: y, y2: y, class: cls }, svg);
    if (lab) text(svg, 0, y + 4, lab, { class: 'chart-t' });
  }
  const n = points.length;
  const xs = points.map((_, i) => (n === 1 ? 170 : 48 + (252 * i) / (n - 1)));
  const ys = points.map((p) => 120 - Math.max(0, Math.min(100, p.value)));
  if (n > 1) svgEl('polyline', { points: xs.map((x, i) => `${x},${ys[i]}`).join(' '), class: 'chart-line' }, svg);
  points.forEach((p, i) => {
    const last = i === n - 1;
    svgEl('circle', { cx: xs[i], cy: ys[i], r: last ? 6 : 5, class: last ? 'chart-dot last' : 'chart-dot' }, svg);
    if (n <= 5 || i === 0 || last) text(svg, xs[i], ys[i] - 14, String(Math.round(p.value)), { class: 'chart-v', 'text-anchor': 'middle' });
    if (n <= 5 || i === 0 || last) text(svg, xs[i], 140, shortDate(p.at), { class: 'chart-t', 'text-anchor': 'middle' });
  });
  return svg;
}

// Minutes par semaine, de la plus ancienne à la semaine en cours. values : nombres.
export function barChart(values, label) {
  const svg = svgEl('svg', { viewBox: '0 0 320 150', width: '100%', role: 'img', 'aria-label': label, class: 'chart' });
  svgEl('line', { x1: 0, x2: 320, y1: 120, y2: 120, class: 'axis' }, svg);
  const max = Math.max(1, ...values);
  const slot = 320 / values.length;
  const w = Math.min(26, slot - 8);
  values.forEach((v, i) => {
    const h = Math.round((v / max) * 90);
    const x = slot * i + (slot - w) / 2;
    // Une semaine sans séance garde un trait de 3 px : on voit qu'elle existe, sans chiffre.
    const barH = Math.max(h, 3);
    svgEl('rect', { x, y: 120 - barH, width: w, height: barH, rx: 3, class: i === values.length - 1 ? 'cbar last' : 'cbar' }, svg);
    if (v) text(svg, x + w / 2, 120 - barH - 6, String(v), { class: 'chart-v', 'text-anchor': 'middle' });
  });
  text(svg, 4, 140, `Il y a ${values.length - 1} sem.`, { class: 'chart-t', 'text-anchor': 'start' });
  text(svg, 316, 140, 'Cette sem.', { class: 'chart-t', 'text-anchor': 'end' });
  return svg;
}
