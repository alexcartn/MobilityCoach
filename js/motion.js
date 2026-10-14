// Mouvement des schémas. Un mouvement relie deux poses (les « images » d'une fiche, ou une pose de départ et
// une pose d'arrivée décrite dans js/data/motions.js) entre lesquelles le corps passe en douceur.
// Quatre règles pour que ça reste crédible :
//  - ancre : une articulation reste clouée au sol (le genou arrière du couch, la hanche du pigeon) ;
//  - mains, pieds : ils restent posés, le coude ou le genou se plie pour suivre (calcul à deux os) ;
//  - décor : le mur, le rouleau, la balle et la boîte ne bougent pas ; le rouleau tourne avec le glissement ;
//  - cadre : un seul cadrage pour tout le mouvement, la figure ne « zoome » jamais.

import { renderPose, frameFor, skeleton, ref, L } from './diagram.js';
import { MOTIONS } from './data/motions.js';

const lerpN = (a, b, t) => a + (b - a) * t;
const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const shiftPts = (J, d) => Object.fromEntries(Object.entries(J).map(([k, v]) => [k, [v[0] + d[0], v[1] + d[1]]]));
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Aller, tenue, retour, tenue : 42 % / 8 % / 42 % / 8 % de la période. Renvoie l'avancement de 0 à 1.
export function wave(p) {
  if (p < 0.42) return ease(p / 0.42);
  if (p < 0.5) return 1;
  if (p < 0.92) return 1 - ease((p - 0.5) / 0.42);
  return 0;
}

function mixPose(a, b, s, rigidArms = false) {
  const arms = (p) => p.arms ?? [{ upper: 90, fore: 90 }];
  const torso = lerpN(a.torso, b.torso, s);
  const turn = rigidArms ? torso - a.torso : 0; // bras croisés ou tendus avec le buste : ils tournent avec lui
  return {
    ...a,
    torso,
    head: lerpN(a.head ?? a.torso, b.head ?? b.torso, s),
    legs: a.legs.map((g, i) => ({
      thigh: lerpN(g.thigh, b.legs[i].thigh, s), shin: lerpN(g.shin, b.legs[i].shin, s), foot: lerpN(g.foot ?? 0, b.legs[i].foot ?? 0, s),
    })),
    arms: arms(a).map((g, i) => ({ upper: lerpN(g.upper, arms(b)[i].upper, s) + turn, fore: lerpN(g.fore, arms(b)[i].fore, s) + turn })),
  };
}

// Articulation (coude ou genou) entre S et H pour des os de longueurs l1 et l2. Elle ne se plie que dans le sens
// de l'anatomie, jamais en hyperextension. Vue de côté, pour une personne tournée vers la droite (le miroir est
// appliqué au dessin) : le coude se plie vers l'avant, l'avant-bras tourne dans le sens inverse des aiguilles
// d'une montre par rapport au bras (flex = -1) ; le genou se plie vers l'arrière, le tibia tourne dans le sens
// des aiguilles d'une montre par rapport à la cuisse (flex = +1). Pour une personne tournée vers la gauche (couchée
// sur le ventre la tête à gauche, par exemple), c'est l'inverse. Vue de dessus (flex = 0), le sens n'est pas
// lisible : on garde le côté de la pose de référence `near`.
const flexOf = (dir) => ({ elbow: -dir, knee: dir });
function twoBone(S, H, l1, l2, flex, near) {
  const dx = H[0] - S[0];
  const dy = H[1] - S[1];
  const len = Math.hypot(dx, dy) || 1;
  const d = Math.min(Math.max(len, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const ux = dx / len;
  const uy = dy / len;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  // Deux solutions, de part et d'autre de la ligne S-H : on garde celle qui plie dans le bon sens.
  const at = (side) => [S[0] + ux * a - uy * h * side, S[1] + uy * a + ux * h * side];
  const turn = (E) => (E[0] - S[0]) * (H[1] - E[1]) - (E[1] - S[1]) * (H[0] - E[0]);
  const e = at(1);
  if (flex === 0) {
    const f = at(-1);
    return Math.hypot(e[0] - near[0], e[1] - near[1]) <= Math.hypot(f[0] - near[0], f[1] - near[1]) ? e : f;
  }
  return Math.sign(turn(e)) === flex ? e : at(-1);
}

// Sens de la personne dans la pose : 1 tournée vers la droite, -1 vers la gauche, 0 vue de dessus. Lu sur les
// articulations franchement pliées (plus de 10°) ; `faces` dans js/data/motions.js corrige un doute.
const wrap = (d) => ((d + 180) % 360 + 360) % 360 - 180;
export function orientation(frame) {
  if (frame.view === 'top') return 0;
  let right = 0;
  let left = 0;
  for (const a of frame.arms ?? []) { const r = wrap(a.fore - a.upper); if (r < -10) right++; else if (r > 10) left++; }
  for (const l of frame.legs) { const r = wrap(l.shin - l.thigh); if (r > 10) right++; else if (r < -10) left++; }
  return left > right ? -1 : 1;
}

const unionBox = (a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });

// spec : { frames: [poseA, poseB], period, rigidArms?, anchor?, slide?: { angle, from, to }, hands?, feet?, still?: [types],
//          stillEnds?: { band: ['to'] }, refS?, grip? }
// grip : nom d'une articulation de la jambe ('knee', 'shin'…) que les mains tiennent en la suivant.
// hands, feet : true (les deux côtés) ou [''] (le côté proche seul, '2' pour l'autre).
// hands : true (les mains restent posées, le coude se plie) ou 'forearm' (l'avant-bras reste posé aussi : le bras pivote
// autour du coude, comme sur un rouleau avec appui sur les avant-bras).
export function makeAnimation(spec, facing = 1) {
  const [kfA, kfB] = spec.frames;
  const refS = spec.refS ?? 0;
  const anchorAt = spec.anchor ? skeleton(mixPose(kfA, kfB, refS, spec.rigidArms))[spec.anchor] : null;
  const slideVec = (s) => {
    if (!spec.slide) return [0, 0];
    const a = (spec.slide.angle * Math.PI) / 180;
    const d = lerpN(spec.slide.from, spec.slide.to, s);
    return [Math.cos(a) * d, Math.sin(a) * d];
  };

  // Articulations au temps s (angles, ancre, glissement), avant de poser mains et pieds.
  function base(s) {
    const pose = mixPose(kfA, kfB, s, spec.rigidArms);
    const J = skeleton(pose);
    const d = anchorAt ? [anchorAt[0] - J[spec.anchor][0], anchorAt[1] - J[spec.anchor][1]] : [0, 0];
    const v = slideVec(s);
    return { pose, J: shiftPts(J, [d[0] + v[0], d[1] + v[1]]) };
  }

  const flex = flexOf(spec.dir ?? 1);
  const J0 = base(refS).J; // l'état de référence : là où se posent les mains, les pieds, le rouleau et le mur
  const ks = ['', '2'];
  const side = (opt) => (Array.isArray(opt) ? ks.filter((k) => opt.includes(k)) : opt ? ks : []); // true : les deux côtés ; [''] : le côté proche seul
  const hands = side(spec.hands).map((k) => ({ k, H: J0['hand' + k], E: J0['elbow' + k] }));
  const feet = side(spec.feet).map((k) => ({ k, A: J0['ankle' + k] }));

  function solve(s) {
    const { pose, J } = base(s);
    for (const { k, H, E } of hands) {
      J['elbow' + k] = spec.hands === 'forearm' ? E : twoBone(J.shoulder, H, L.upper, L.fore, flex.elbow, E);
      J['hand' + k] = H;
    }
    for (const { k, A } of feet) {
      const toe = [J['toe' + k][0] - J['ankle' + k][0], J['toe' + k][1] - J['ankle' + k][1]]; // le pied garde son angle
      const knee = twoBone(J.hip, A, L.thigh, L.shin, flex.knee, J0['knee' + k]);
      J['knee' + k] = knee;
      J['ankle' + k] = A;
      J['toe' + k] = [A[0] + toe[0], A[1] + toe[1]];
      J['thigh' + k] = mid(J.hip, knee);
      J['shin' + k] = mid(knee, A);
    }
    if (spec.grip) { // les mains tiennent une articulation de la jambe (le genou, le tibia) et la suivent
      for (const k of ks) {
        J['elbow' + k] = twoBone(J.shoulder, J[spec.grip], L.upper, L.fore, flex.elbow, J0['elbow' + k]);
        J['hand' + k] = J[spec.grip];
      }
    }
    return { pose, J };
  }

  // Les accessoires qui ne bougent pas sont fixés dans le repère monde, une fois pour toutes (miroir compris).
  const still = new Set(spec.still ?? []);
  const mx = (pt) => (facing === -1 ? [-pt[0], pt[1]] : pt);
  const baseProps = (kfA.props ?? []).map((p) => {
    if (still.has(p.t) && p.at) return { ...p, at: mx(ref(p.at, J0, 1)) };
    if (still.has(p.t) && p.from && p.to) return { ...p, from: mx(ref(p.from, J0, 1)), to: mx(ref(p.to, J0, 1)) }; // un tube vu du dessus
    if (p.t === 'band' && spec.stillEnds?.band?.length) {
      const ends = spec.stillEnds.band;
      return { ...p, ...(ends.includes('from') ? { from: mx(ref(p.from, J0, 1)) } : {}), ...(ends.includes('to') ? { to: mx(ref(p.to, J0, 1)) } : {}) };
    }
    return p;
  });
  const propsAt = (s, arrows) => baseProps
    .filter((p) => arrows || p.t !== 'arrow')
    .map((p) => (p.t === 'roller' && spec.slide
      ? { ...p, spin: ((slideVec(s)[0] - slideVec(refS)[0]) * (facing === -1 ? -1 : 1)) / (p.r ?? 9) }
      : p));

  // Calage au sol sur l'état de référence, puis cadre commun à tout le mouvement.
  const o0 = {};
  { const { pose, J } = solve(refS); renderPose({ ...pose, facing, props: propsAt(refS, true) }, { J, out: o0 }); }
  const T = [o0.tx, o0.ty];
  let U = null;
  for (let i = 0; i <= 24; i++) {
    const s = i / 24;
    const { pose, J } = solve(s);
    const o = {};
    renderPose({ ...pose, facing, props: propsAt(s, true) }, { J, T, out: o });
    U = U ? unionBox(U, o.box) : o.box;
  }
  const cam = frameFor(U);

  // arrows : les flèches des fiches indiquent le sens du mouvement ; elles n'ont plus lieu d'être quand il est joué.
  const draw = (s, label = '', arrows = false) => {
    const { pose, J } = solve(s);
    return renderPose({ ...pose, label, facing, props: propsAt(s, arrows) }, { J, T, cam, noArrows: !arrows });
  };
  // Pour les contrôles : articulations et boîte englobante au temps s.
  const box = (s) => { const { pose, J } = solve(s); const o = {}; renderPose({ ...pose, facing, props: propsAt(s, false) }, { J, T, cam, out: o, noArrows: true }); return o.box; };
  return { draw, period: spec.period, joints: (s) => solve(s).J, box };
}

// La spécification complète d'une fiche ou d'un test du bilan : ses images, plus son mouvement. Une fiche garde son
// mouvement dans js/data/motions.js ; un test le porte lui-même (`motion`) et n'a qu'une image (`frame`) : c'est la pose
// d'arrivée, `begin` décrit le départ.
export function motionSpec(item) {
  const m = item.motion ?? MOTIONS[item.id];
  if (!m) return null;
  const frames = item.frames ?? [item.frame];
  const a = m.begin ? { ...frames[0], ...m.begin } : frames[0];
  const b = m.end ? { ...a, ...m.end } : (frames[1] ?? (m.begin ? frames[0] : a));
  const dir = m.faces ? (m.faces === 'left' ? -1 : 1) : orientation(frames[0]);
  return { ...m, dir, frames: [a, b] };
}
export const hasMotion = (item) => !!(item.motion ?? MOTIONS[item.id]);

// Monte le schéma d'une fiche dans `host`. Le mouvement joue en boucle dès l'affichage : ce n'est pas une option,
// ni dans la séance ni sur la fiche (il ignore donc aussi la demande « réduire les animations » du téléphone).
// Sans mouvement défini dans js/data/motions.js, c'est l'image fixe. destroy() arrête la boucle en quittant l'écran.
export function mountFigure(host, item, { facing = 1, label = item.name ?? item.title } = {}) {
  const spec = motionSpec(item);
  if (!spec) {
    host.replaceChildren(renderPose({ ...(item.frames?.[0] ?? item.frame), facing, label }));
    return { destroy() {} };
  }
  const anim = makeAnimation(spec, facing);
  let t = 0;
  let last = performance.now();
  let raf = 0;
  const frame = (now) => {
    t += Math.min((now - last) / 1000, 0.1); // un onglet en veille ne fait pas sauter l'animation
    last = now;
    host.replaceChildren(anim.draw(wave((t / anim.period) % 1), label));
    raf = requestAnimationFrame(frame);
  };
  host.replaceChildren(anim.draw(0, label)); // première image sans attendre le premier tour de boucle
  raf = requestAnimationFrame(frame);
  return { destroy() { cancelAnimationFrame(raf); } };
}
