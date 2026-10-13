// Moteur de schémas : un corps effilé défini par des angles absolus (0 = droite, 90 = bas,
// -90 = haut, 180 = gauche, y vers le bas), plus des accessoires accrochés à ses articulations.
// Rendu « atlas » : volumes au contour fin, côté éloigné grisé, zone travaillée hachurée en fauve.
// La figure est posée automatiquement sur le sol : on ne règle que les angles.

const NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 240;
const VIEW_H = 140;

const L = { torso: 36, head: 17, thigh: 30, shin: 28, foot: 11, upper: 20, fore: 18 };

const f = (v) => Math.round(v * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const add = (p, a, len) => [p[0] + Math.cos(rad(a)) * len, p[1] + Math.sin(rad(a)) * len];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = (a, b) => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};

// ---------- Volumes ----------
// Un membre est une chaîne de « pastilles » : l'enveloppe de deux cercles (centre, rayon) donne un
// tronçon effilé aux bouts arrondis. Tous les tronçons ont le même sens de tracé : réunis dans un seul
// <path>, ils forment une union sans trait intérieur.

const circlePath = (c, r) => `M${f(c[0] - r)} ${f(c[1])}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

function hull(c0, r0, c1, r1) {
  const dx = c1[0] - c0[0];
  const dy = c1[1] - c0[1];
  const d = Math.hypot(dx, dy);
  if (d <= Math.abs(r0 - r1) + 1e-6) return r0 >= r1 ? circlePath(c0, r0) : circlePath(c1, r1);
  const phi = Math.atan2(dy, dx);
  const alpha = Math.acos((r0 - r1) / d);
  const pt = (c, r, a) => `${f(c[0] + r * Math.cos(a))} ${f(c[1] + r * Math.sin(a))}`;
  const large1 = 2 * alpha > Math.PI ? 1 : 0;
  const large0 = 2 * Math.PI - 2 * alpha > Math.PI ? 1 : 0;
  return `M${pt(c0, r0, phi + alpha)}L${pt(c1, r1, phi + alpha)}A${f(r1)} ${f(r1)} 0 ${large1} 0 ${pt(c1, r1, phi - alpha)}L${pt(c0, r0, phi - alpha)}A${f(r0)} ${f(r0)} 0 ${large0} 0 ${pt(c0, r0, phi + alpha)}Z`;
}

// Articulations, hanche en (0,0). Le côté proche porte les noms simples, le côté éloigné le suffixe « 2 ».
function skeleton(pose) {
  const hip = [0, 0];
  const shoulder = add(hip, pose.torso, L.torso);
  const head = add(shoulder, pose.head ?? pose.torso, L.head);
  const [legA, legB = legA] = pose.legs;
  const [armA, armB = armA] = pose.arms ?? [{ upper: 90, fore: 90 }];
  const leg = (g) => {
    const knee = add(hip, g.thigh, L.thigh);
    const ankle = add(knee, g.shin, L.shin);
    return { knee, ankle, toe: add(ankle, g.foot ?? 0, L.foot) };
  };
  const arm = (g) => {
    const elbow = add(shoulder, g.upper, L.upper);
    return { elbow, hand: add(elbow, g.fore, L.fore) };
  };
  const a = leg(legA);
  const b = leg(legB);
  const c = arm(armA);
  const d = arm(armB);
  return {
    hip, shoulder, head,
    knee: a.knee, ankle: a.ankle, toe: a.toe, knee2: b.knee, ankle2: b.ankle, toe2: b.toe,
    elbow: c.elbow, hand: c.hand, elbow2: d.elbow, hand2: d.hand,
    thigh: lerp(hip, a.knee, 0.5), thigh2: lerp(hip, b.knee, 0.5),
    shin: lerp(a.knee, a.ankle, 0.5), shin2: lerp(b.knee, b.ankle, 0.5),
    lowback: lerp(hip, shoulder, 0.2), belly: lerp(hip, shoulder, 0.35),
    midback: lerp(hip, shoulder, 0.6), upperback: lerp(hip, shoulder, 0.8), chest: lerp(hip, shoulder, 0.9),
  };
}

// Pièces du corps, de l'arrière vers l'avant. segs : [centre0, rayon0, centre1, rayon1].
function legPart(J, k, layer) {
  const [hip, knee, ankle, toe] = [J.hip, J['knee' + k], J['ankle' + k], J['toe' + k]];
  const calf = lerp(knee, ankle, 0.3);
  const u = unit(ankle, toe);
  const heel = [ankle[0] - u[0] * 2.6, ankle[1] - u[1] * 2.6];
  return { id: 'leg' + k, layer, segs: [[hip, 6.8, knee, 4.6], [knee, 4.6, calf, 4.8], [calf, 4.8, ankle, 3], [heel, 3.1, toe, 2.1]] };
}

function armPart(J, k, layer) {
  const [shoulder, elbow, hand] = [J.shoulder, J['elbow' + k], J['hand' + k]];
  const u = unit(elbow, hand);
  const tip = [hand[0] + u[0] * 5.2, hand[1] + u[1] * 5.2];
  return { id: 'arm' + k, layer, segs: [[shoulder, 4, elbow, 3.1], [elbow, 3.1, hand, 2.3], [hand, 2.7, tip, 2]] };
}

function torsoPart(J) {
  const waist = lerp(J.hip, J.shoulder, 0.3);
  const chest = lerp(J.hip, J.shoulder, 0.68);
  const neck = lerp(J.shoulder, J.head, 0.55);
  return { id: 'torso', layer: 'near', segs: [[J.hip, 7.8, waist, 6.6], [waist, 6.6, chest, 8.6], [chest, 8.6, J.shoulder, 6.4], [J.shoulder, 3.1, neck, 2.7]] };
}

function bodyParts(J) {
  return [
    armPart(J, '2', 'far'), legPart(J, '2', 'far'), torsoPart(J),
    { id: 'head', layer: 'near', head: true, segs: [], circle: [J.head, 7.3] },
    legPart(J, '', 'near'), armPart(J, '', 'near'),
  ];
}

const partPath = (part) => part.segs.map(([c0, r0, c1, r1]) => hull(c0, r0, c1, r1)).join('') + (part.circle ? circlePath(...part.circle) : '');

// Distance (au bord du volume) du point p au tronçon le plus proche de la pièce, et sens de ce tronçon.
function nearest(part, p) {
  let best = null;
  for (const [c0, r0, c1, r1] of part.segs) {
    const dx = c1[0] - c0[0];
    const dy = c1[1] - c0[1];
    const t = Math.max(0, Math.min(1, ((p[0] - c0[0]) * dx + (p[1] - c0[1]) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(p[0] - (c0[0] + dx * t), p[1] - (c0[1] + dy * t)) - (r0 + (r1 - r0) * t);
    if (!best || d < best.d) best = { d, ang: Math.atan2(dy, dx) };
  }
  return best;
}

// ---------- Rendu ----------

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  parent?.append(e);
  return e;
}

// Un point de référence : ['hip', dx, dy] (articulation + décalage) ou [x, y] absolu.
function ref(spec, J, facing = 1) {
  if (typeof spec[0] === 'number') return [spec[0], spec[1]];
  const p = J[spec[0]];
  if (!p) throw new Error('articulation inconnue : ' + spec[0]);
  return [p[0] + (spec[1] || 0) * facing, p[1] + (spec[2] || 0)];
}

function arrowHead(parent, from, to) {
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const s = 6.5;
  const p1 = [to[0] - Math.cos(ang - 0.5) * s, to[1] - Math.sin(ang - 0.5) * s];
  const p2 = [to[0] - Math.cos(ang + 0.5) * s, to[1] - Math.sin(ang + 0.5) * s];
  el('polygon', { class: 'arrow-head', points: [to, p1, p2].map((p) => `${f(p[0])},${f(p[1])}`).join(' ') }, parent);
}

let uid = 0;

export function renderPose(pose) {
  const id = `fig${++uid}`;
  const floor = pose.floor ?? 126;
  const top = pose.view === 'top';
  const facing = pose.facing ?? 1;
  const props = pose.props ?? [];
  const roundR = (p) => p.r ?? (p.t === 'roller' ? 9 : 4.5);

  let J = skeleton(pose);
  // Miroir éventuel (la pose est écrite tournée vers la droite).
  if (facing === -1) J = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, [-v[0], v[1]]]));

  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  const grow = (x0, y0, x1, y1) => {
    box.x0 = Math.min(box.x0, x0); box.x1 = Math.max(box.x1, x1);
    box.y0 = Math.min(box.y0, y0); box.y1 = Math.max(box.y1, y1);
  };
  const growCircle = (c, r) => grow(c[0] - r, c[1] - r, c[0] + r, c[1] + r);

  // Étendue du corps et des cercles d'accessoires (balle, rouleau) : ils participent au calage.
  for (const part of bodyParts(J)) {
    for (const [c0, r0, c1, r1] of part.segs) { growCircle(c0, r0); growCircle(c1, r1); }
    if (part.circle) growCircle(...part.circle);
  }
  for (const p of props) if (p.t === 'ball' || p.t === 'roller') growCircle(ref(p.at, J, facing), roundR(p));

  // Pose : on place la figure sur le sol (ou au centre en vue de dessus).
  const ty = top ? -(box.y0 + box.y1) / 2 : floor - (pose.lift ?? 0) - box.y1;
  const tx = -(box.x0 + box.x1) / 2;
  J = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, [v[0] + tx, v[1] + ty]]));
  box.x0 += tx; box.x1 += tx; box.y0 += ty; box.y1 += ty;
  const parts = bodyParts(J);

  // Étendue des accessoires, pour cadrer toute la scène.
  for (const p of props) {
    if (p.t === 'wall') { const x = ref(p.at, J, facing)[0]; grow(x, floor - (p.h ?? 105), x, floor); }
    else if (p.t === 'box') {
      const x = ref(p.at, J, facing)[0];
      const x0 = (p.anchor === 'right') !== (facing === -1) ? x - p.w : x;
      grow(x0, floor - p.h, x0 + p.w, floor);
    } else if (p.t === 'focus') { const [x, y] = ref(p.at, J, facing); const r = p.r ?? 13; grow(x - r, y - r, x + r, y + r); }
    else if (p.t === 'band' || p.t === 'arrow') {
      for (const q of [p.from, p.to]) { const [x, y] = ref(q, J, facing); grow(x - 3, y - 3, x + 3, y + 3); }
    }
  }

  // Cadre : ratio fixe, centré sur la scène, jamais plus serré que 150 unités de large.
  const ratio = VIEW_H / VIEW_W;
  const cw = box.x1 - box.x0;
  const ch = box.y1 - box.y0;
  const vw = Math.max(cw + 28, (ch + 22) / ratio, 150);
  const vh = vw * ratio;
  const vx = (box.x0 + box.x1) / 2 - vw / 2;
  const vy = top ? (box.y0 + box.y1) / 2 - vh / 2 : box.y1 + 9 - vh;
  const figCx = (box.x0 + box.x1) / 2;

  const svg = el('svg', { viewBox: `${f(vx)} ${f(vy)} ${f(vw)} ${f(vh)}`, class: 'fig', role: 'img', 'aria-label': pose.label || '' });
  const gDefs = el('defs', null, svg);
  const gEnv = el('g', null, svg);
  const gBody = el('g', null, svg);
  const gTool = el('g', null, svg);
  const gArrow = el('g', null, svg);

  // ----- Environnement : sol et mur hachurés, boîte -----
  if (!top && pose.floorLine !== false) {
    el('line', { class: 'env', x1: f(vx + 4), x2: f(vx + vw - 4), y1: floor + 0.5, y2: floor + 0.5 }, gEnv);
    let d = '';
    for (let x = vx + 8; x < vx + vw - 6; x += 6.5) d += `M${f(x)} ${floor + 0.5}l-3 3.6`;
    el('path', { class: 'env-tick', d }, gEnv);
  }
  for (const p of props) {
    if (p.t === 'wall') {
      const x = ref(p.at, J, facing)[0];
      const h = p.h ?? 105;
      const dir = x >= figCx ? 1 : -1; // les hachures sont du côté opposé à la figure
      el('line', { class: 'env', x1: f(x), x2: f(x), y1: floor - h, y2: floor }, gEnv);
      let d = '';
      for (let y = floor - h + 4; y < floor - 2; y += 6.5) d += `M${f(x)} ${f(y)}l${dir * 3.6} -3`;
      el('path', { class: 'env-tick', d }, gEnv);
    } else if (p.t === 'box') {
      const x = ref(p.at, J, facing)[0];
      const x0 = (p.anchor === 'right') !== (facing === -1) ? x - p.w : x;
      el('rect', { class: 'env-fill', x: f(x0), y: floor - p.h, width: p.w, height: p.h, rx: 2 }, gEnv);
      el('line', { class: 'env-top', x1: f(x0 + 1.5), x2: f(x0 + p.w - 1.5), y1: floor - p.h + 4, y2: floor - p.h + 4 }, gEnv);
    }
  }

  // ----- Zone travaillée : ellipse allongée dans le sens du segment le plus proche, découpée par le corps -----
  const focus = props.find((p) => p.t === 'focus');
  const lit = new Map(); // pièce -> { c, rx, ry, ang }
  if (focus) {
    const c = ref(focus.at, J, facing);
    const r = focus.r ?? 13;
    const cands = parts.filter((p) => !p.head).map((part) => ({ part, n: nearest(part, c) }));
    // Les pièces que le point touche (au côté proche d'abord) ; à défaut, la plus proche.
    let chosen = cands.filter((x) => x.n.d <= 2.5 && x.part.layer !== 'far');
    if (!chosen.length) chosen = cands.filter((x) => x.n.d <= 2.5);
    if (!chosen.length) chosen = [cands.sort((a, b) => a.n.d - b.n.d)[0]];
    for (const { part, n } of chosen) lit.set(part, { c, rx: r * 1.25, ry: r * 0.78, ang: n.ang });
    const hatch = el('pattern', { id: `${id}-hatch`, width: 2.2, height: 2.2, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, gDefs);
    el('line', { class: 'hatch-line', x1: 0, y1: 0, x2: 0, y2: 2.2 }, hatch);
  }

  // ----- Corps, de l'arrière vers l'avant ; la zone travaillée se dessine juste après sa pièce -----
  for (const part of parts) {
    el('path', { class: part.head ? 'b-head' : `b-${part.layer}`, d: partPath(part) }, gBody);
    const h = lit.get(part);
    if (!h) continue;
    const clipId = `${id}-clip-${part.id}`;
    el('path', { d: partPath(part) }, el('clipPath', { id: clipId }, gDefs));
    const g = el('g', { 'clip-path': `url(#${clipId})` }, gBody);
    const e = { cx: f(h.c[0]), cy: f(h.c[1]), rx: f(h.rx), ry: f(h.ry), transform: `rotate(${f((h.ang * 180) / Math.PI)} ${f(h.c[0])} ${f(h.c[1])})` };
    el('ellipse', { class: 'hl-base', ...e }, g);
    el('ellipse', { class: 'hl-hatch', fill: `url(#${id}-hatch)`, ...e }, g);
    el('ellipse', { class: 'hl-edge', ...e }, g);
  }

  // ----- Accessoires et flèches -----
  for (const p of props) {
    if (p.t === 'ball') {
      const [x, y] = ref(p.at, J, facing);
      const r = roundR(p);
      el('circle', { class: 'ball', cx: f(x), cy: f(y), r }, gTool);
      el('path', { class: 'ball-seam', d: `M${f(x - r * 0.62)} ${f(y - r * 0.5)}q${f(r * 0.7)} ${f(r * 0.5)} 0 ${f(r)}M${f(x + r * 0.62)} ${f(y - r * 0.5)}q${f(-r * 0.7)} ${f(r * 0.5)} 0 ${f(r)}` }, gTool);
    } else if (p.t === 'roller') {
      const [x, y] = ref(p.at, J, facing);
      const r = roundR(p);
      el('circle', { class: 'roller', cx: f(x), cy: f(y), r }, gTool);
      el('circle', { class: 'roller-core', cx: f(x), cy: f(y), r: f(r * 0.36) }, gTool);
    } else if (p.t === 'bar') {
      const a = ref(p.from, J, facing);
      const b = ref(p.to, J, facing);
      el('line', { class: 'bar', x1: f(a[0]), y1: f(a[1]), x2: f(b[0]), y2: f(b[1]), 'stroke-width': p.w ?? 12 }, gTool);
    } else if (p.t === 'band') {
      const a = ref(p.from, J, facing);
      const b = ref(p.to, J, facing);
      el('line', { class: 'band', x1: f(a[0]), y1: f(a[1]), x2: f(b[0]), y2: f(b[1]) }, gTool);
      el('circle', { class: 'band-end', cx: f(b[0]), cy: f(b[1]), r: 2.6 }, gTool);
      el('circle', { class: 'band-loop', cx: f(a[0]), cy: f(a[1]), r: 2.4 }, gTool);
    } else if (p.t === 'arrow') {
      const a = ref(p.from, J, facing);
      const b = ref(p.to, J, facing);
      let via = a;
      let d = `M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`;
      if (p.bend) {
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        via = [(a[0] + b[0]) / 2 - (dy / len) * p.bend, (a[1] + b[1]) / 2 + (dx / len) * p.bend];
        d = `M${f(a[0])},${f(a[1])} Q${f(via[0])},${f(via[1])} ${f(b[0])},${f(b[1])}`;
      }
      el('path', { class: 'arrow', d }, gArrow);
      arrowHead(gArrow, via, b);
    }
  }
  return svg;
}

// Une vignette légendée.
export function renderFrame(frame, index, total) {
  const fig = document.createElement('figure');
  fig.className = 'frame';
  fig.append(renderPose({ ...frame, label: frame.caption }));
  const cap = document.createElement('figcaption');
  cap.textContent = total > 1 ? `${index + 1}. ${frame.caption}` : frame.caption;
  fig.append(cap);
  return fig;
}
