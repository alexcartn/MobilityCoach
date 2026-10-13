// Moteur de schémas : un bonhomme filaire défini par des angles absolus (0 = droite, 90 = bas,
// -90 = haut, 180 = gauche, y vers le bas), plus des accessoires accrochés à ses articulations.
// La figure est posée automatiquement sur le sol : on ne règle que les angles.

const NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 240;
const VIEW_H = 140;

const L = { torso: 36, head: 17, headR: 7.5, thigh: 30, shin: 28, foot: 11, upper: 20, fore: 18 };
const W = { torso: 11, neck: 4, thigh: 9, shin: 7, foot: 6, upper: 6, fore: 5 };

const rad = (d) => (d * Math.PI) / 180;
const add = (p, a, len) => [p[0] + Math.cos(rad(a)) * len, p[1] + Math.sin(rad(a)) * len];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function solveLeg(hip, g) {
  const knee = add(hip, g.thigh, L.thigh);
  const ankle = add(knee, g.shin, L.shin);
  const toe = add(ankle, g.foot ?? 0, L.foot);
  return { knee, ankle, toe };
}

function solveArm(shoulder, g) {
  const elbow = add(shoulder, g.upper, L.upper);
  const hand = add(elbow, g.fore, L.fore);
  return { elbow, hand };
}

// Calcule toutes les articulations et les segments à dessiner, hanche en (0,0).
function solve(pose) {
  const hip = [0, 0];
  const shoulder = add(hip, pose.torso, L.torso);
  const headC = add(shoulder, pose.head ?? pose.torso, L.head);
  const [legA, legB = legA] = pose.legs;
  const [armA, armB = armA] = pose.arms ?? [{ upper: 90, fore: 90 }];
  const a = solveLeg(hip, legA);
  const b = solveLeg(hip, legB);
  const c = solveArm(shoulder, armA);
  const d = solveArm(shoulder, armB);

  const J = {
    hip, shoulder, head: headC,
    knee: a.knee, ankle: a.ankle, toe: a.toe,
    knee2: b.knee, ankle2: b.ankle, toe2: b.toe,
    elbow: c.elbow, hand: c.hand, elbow2: d.elbow, hand2: d.hand,
    thigh: lerp(hip, a.knee, 0.5), thigh2: lerp(hip, b.knee, 0.5),
    shin: lerp(a.knee, a.ankle, 0.5), shin2: lerp(b.knee, b.ankle, 0.5),
    lowback: lerp(hip, shoulder, 0.2), belly: lerp(hip, shoulder, 0.35),
    midback: lerp(hip, shoulder, 0.6), upperback: lerp(hip, shoulder, 0.8),
    chest: lerp(hip, shoulder, 0.9),
  };

  const seg = (layer, cls, w, ...pts) => ({ layer, cls, w, pts });
  const segs = [
    seg('far', 'limb', W.upper, shoulder, d.elbow), seg('far', 'limb', W.fore, d.elbow, d.hand),
    seg('far', 'limb', W.thigh, hip, b.knee), seg('far', 'limb', W.shin, b.knee, b.ankle), seg('far', 'limb', W.foot, b.ankle, b.toe),
    seg('body', 'limb', W.torso, hip, shoulder), seg('body', 'limb', W.neck, shoulder, headC),
    seg('near', 'limb', W.thigh, hip, a.knee), seg('near', 'limb', W.shin, a.knee, a.ankle), seg('near', 'limb', W.foot, a.ankle, a.toe),
    seg('near', 'limb', W.upper, shoulder, c.elbow), seg('near', 'limb', W.fore, c.elbow, c.hand),
  ];
  return { J, segs, headC };
}

const mirrorPt = (p) => [-p[0], p[1]];

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
  const s = 6;
  const p1 = [to[0] - Math.cos(ang - 0.5) * s, to[1] - Math.sin(ang - 0.5) * s];
  const p2 = [to[0] - Math.cos(ang + 0.5) * s, to[1] - Math.sin(ang + 0.5) * s];
  el('polygon', { class: 'arrow-head', points: [to, p1, p2].map((p) => p.join(',')).join(' ') }, parent);
}

export function renderPose(pose) {
  const floor = pose.floor ?? 126;
  const top = pose.view === 'top';
  const facing = pose.facing ?? 1;
  const props = pose.props ?? [];

  const solved = solve(pose);
  let J = solved.J;
  let segs = solved.segs;
  // Miroir éventuel (la pose est écrite tournée vers la droite).
  if (facing === -1) {
    J = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, mirrorPt(v)]));
    segs = segs.map((s) => ({ ...s, pts: s.pts.map(mirrorPt) }));
  }

  // Cercles d'accessoires qui touchent le sol (balle, rouleau) : ils participent au calage.
  const roundR = (p) => p.r ?? (p.t === 'roller' ? 9 : 4.5);
  const rounds = props.filter((p) => p.t === 'ball' || p.t === 'roller').map((p) => ({ c: ref(p.at, J, facing), r: roundR(p) }));

  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  const grow = (x0, y0, x1, y1) => {
    box.x0 = Math.min(box.x0, x0); box.x1 = Math.max(box.x1, x1);
    box.y0 = Math.min(box.y0, y0); box.y1 = Math.max(box.y1, y1);
  };
  for (const s of segs) for (const p of s.pts) grow(p[0] - s.w / 2, p[1] - s.w / 2, p[0] + s.w / 2, p[1] + s.w / 2);
  grow(J.head[0] - L.headR, J.head[1] - L.headR, J.head[0] + L.headR, J.head[1] + L.headR);
  for (const r of rounds) grow(r.c[0] - r.r, r.c[1] - r.r, r.c[0] + r.r, r.c[1] + r.r);

  // Pose : on place la figure sur le sol (ou au centre en vue de dessus).
  const ty = top ? -(box.y0 + box.y1) / 2 : floor - (pose.lift ?? 0) - box.y1;
  const tx = -(box.x0 + box.x1) / 2;
  const T = (p) => [p[0] + tx, p[1] + ty];
  J = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, T(v)]));
  segs = segs.map((s) => ({ ...s, pts: s.pts.map(T) }));
  const hc = J.head;
  box.x0 += tx; box.x1 += tx; box.y0 += ty; box.y1 += ty;

  // Étendue des accessoires, pour cadrer toute la scène.
  for (const p of props) {
    if (p.t === 'wall') { const x = ref(p.at, J, facing)[0]; grow(x, floor - (p.h ?? 105), x, floor); }
    else if (p.t === 'box') {
      const x = ref(p.at, J, facing)[0];
      const x0 = (p.anchor === 'right') !== (facing === -1) ? x - p.w : x;
      grow(x0, floor - p.h, x0 + p.w, floor);
    } else if (p.t === 'focus') { const [x, y] = ref(p.at, J, facing); grow(x - (p.r ?? 13), y - (p.r ?? 13), x + (p.r ?? 13), y + (p.r ?? 13)); }
    else if (p.t === 'band' || p.t === 'arrow') {
      for (const q of [p.from, p.to]) { const [x, y] = ref(q, J, facing); grow(x - 3, y - 3, x + 3, y + 3); }
    }
  }

  // Cadre : ratio fixe, centré sur la scène, jamais plus serré que 150 unités de large.
  const ratio = VIEW_H / VIEW_W;
  const cw = box.x1 - box.x0, ch = box.y1 - box.y0;
  const vw = Math.max(cw + 28, (ch + 22) / ratio, 150);
  const vh = vw * ratio;
  const vx = (box.x0 + box.x1) / 2 - vw / 2;
  const vy = top ? (box.y0 + box.y1) / 2 - vh / 2 : box.y1 + 9 - vh;

  const svg = el('svg', { viewBox: `${vx} ${vy} ${vw} ${vh}`, class: 'fig', role: 'img', 'aria-label': pose.label || '' });
  const gEnv = el('g', null, svg);
  const gFocus = el('g', null, svg);
  const gFar = el('g', { class: 'far' }, svg);
  const gBody = el('g', null, svg);
  const gTool = el('g', null, svg);
  const gArrow = el('g', null, svg);

  if (!top && pose.floorLine !== false) {
    el('line', { class: 'env', x1: vx + 4, x2: vx + vw - 4, y1: floor + 0.5, y2: floor + 0.5 }, gEnv);
  }

  for (const p of props) {
    if (p.t === 'wall') {
      const [x] = ref(p.at, J, facing);
      el('line', { class: 'env wall', x1: x, x2: x, y1: floor - (p.h ?? 105), y2: floor }, gEnv);
    } else if (p.t === 'box') {
      const [x] = ref(p.at, J, facing);
      const x0 = (p.anchor === 'right') !== (facing === -1) ? x - p.w : x;
      el('rect', { class: 'env-fill', x: x0, y: floor - p.h, width: p.w, height: p.h, rx: 2 }, gEnv);
    } else if (p.t === 'focus') {
      const [x, y] = ref(p.at, J, facing);
      el('circle', { class: 'focus', cx: x, cy: y, r: p.r ?? 13 }, gFocus);
    }
  }

  for (const s of segs) {
    el('polyline', {
      class: s.cls, 'stroke-width': s.w,
      points: s.pts.map((p) => p.join(',')).join(' '),
    }, s.layer === 'far' ? gFar : gBody);
    // La tête se dessine juste après le cou : les membres proches passent devant.
    if (s.layer === 'body' && s.w === W.neck) el('circle', { class: 'head', cx: hc[0], cy: hc[1], r: L.headR }, gBody);
  }

  for (const p of props) {
    if (p.t === 'ball' || p.t === 'roller') {
      const [x, y] = ref(p.at, J, facing);
      el('circle', { class: p.t === 'roller' ? 'roller' : 'tool', cx: x, cy: y, r: roundR(p) }, gTool);
    } else if (p.t === 'band') {
      const a = ref(p.from, J, facing);
      const b = ref(p.to, J, facing);
      el('line', { class: 'band', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, gTool);
      el('circle', { class: 'tool', cx: b[0], cy: b[1], r: 2.8 }, gTool);
    } else if (p.t === 'arrow') {
      const a = ref(p.from, J, facing);
      const b = ref(p.to, J, facing);
      if (p.bend) {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const c = [mx - (dy / len) * p.bend, my + (dx / len) * p.bend];
        el('path', { class: 'arrow', d: `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}` }, gArrow);
        arrowHead(gArrow, c, b);
      } else {
        el('line', { class: 'arrow', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, gArrow);
        arrowHead(gArrow, a, b);
      }
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
