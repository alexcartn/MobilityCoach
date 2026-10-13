// Petits graphiques SVG sans dépendance : courbe de score, barres de minutes, tendance globale.

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
    svgEl('line', { x1: 0, x2: 320, y1: y, y2: y, class: cls }, svg);
    if (lab) text(svg, 0, y - 5, lab, { class: 'chart-t' });
  }
  const n = points.length;
  const xs = points.map((_, i) => (n === 1 ? 160 : 24 + (272 * i) / (n - 1)));
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
    svgEl('rect', { x, y: 120 - h, width: w, height: Math.max(h, v ? 3 : 0), rx: 6, class: i === values.length - 1 ? 'bar last' : 'bar' }, svg);
    text(svg, x + w / 2, 120 - h - 6, String(v), { class: 'chart-v', 'text-anchor': 'middle' });
  });
  text(svg, 4, 140, `Il y a ${values.length - 1} sem.`, { class: 'chart-t', 'text-anchor': 'start' });
  text(svg, 316, 140, 'Cette sem.', { class: 'chart-t', 'text-anchor': 'end' });
  return svg;
}

// Tendance du score global (carte sombre). points : [{ at, value }]
export function trendChart(points, label) {
  const svg = svgEl('svg', { viewBox: '0 0 310 70', width: '100%', role: 'img', 'aria-label': label, class: 'chart trend' });
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals) - 6;
  const hi = Math.max(...vals) + 6;
  const n = points.length;
  const xs = points.map((_, i) => (n === 1 ? 155 : 8 + (294 * i) / (n - 1)));
  const ys = points.map((p) => 52 - ((p.value - lo) / (hi - lo || 1)) * 28);
  if (n > 1) svgEl('polyline', { points: xs.map((x, i) => `${x},${ys[i]}`).join(' '), class: 'trend-line' }, svg);
  points.forEach((p, i) => {
    const last = i === n - 1;
    svgEl('circle', { cx: xs[i], cy: ys[i], r: last ? 5.5 : 4.5, class: last ? 'trend-dot last' : 'trend-dot' }, svg);
  });
  text(svg, xs[0], 68, n > 1 ? `Bilan · ${Math.round(vals[0])}` : `Bilan · ${Math.round(vals[0])}`, { class: 'trend-t' });
  if (n > 1) text(svg, xs[n - 1], 12, String(Math.round(vals[n - 1])), { class: 'trend-v', 'text-anchor': 'end' });
  return svg;
}
