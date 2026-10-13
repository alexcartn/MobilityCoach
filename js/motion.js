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

function mixPose(a, b, s) {
  const arms = (p) => p.arms ?? [{ upper: 90, fore: 90 }];
  return {
    ...a,
    torso: lerpN(a.torso, b.torso, s),
    head: lerpN(a.head ?? a.torso, b.head ?? b.torso, s),
    legs: a.legs.map((g, i) => ({
      thigh: lerpN(g.thigh, b.legs[i].thigh, s), shin: lerpN(g.shin, b.legs[i].shin, s), foot: lerpN(g.foot ?? 0, b.legs[i].foot ?? 0, s),
    })),
    arms: arms(a).map((g, i) => ({ upper: lerpN(g.upper, arms(b)[i].upper, s), fore: lerpN(g.fore, arms(b)[i].fore, s) })),
  };
}

// Articulation (coude ou genou) entre S et H pour des os de longueurs l1 et l2. Elle ne se plie que dans le sens
// de l'anatomie : les poses sont écrites pour une personne tournée vers la droite, vue de côté (le miroir est
// appliqué au dessin). Le coude se plie vers l'avant, l'avant-bras tourne dans le sens inverse des aiguilles
// d'une montre par rapport au bras (flex = -1) ; le genou se plie vers l'arrière, le tibia tourne dans le sens
// des aiguilles d'une montre par rapport à la cuisse (flex = +1). Jamais d'hyperextension.
const ELBOW = -1;
const KNEE = 1;
function twoBone(S, H, l1, l2, flex) {
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
  return Math.sign(turn(e)) === flex ? e : at(-1);
}

const unionBox = (a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });

// spec : { frames: [poseA, poseB], period, anchor?, slide?: { angle, from, to }, hands?, feet?, still?: [types],
//          stillEnds?: { band: ['to'] }, refS? }
// hands : true (les mains restent posées, le coude se plie) ou 'forearm' (l'avant-bras reste posé aussi : le bras pivote
// autour du coude, comme sur un rouleau avec appui sur les avant-bras).
export function makeAnimation(spec, facing = 1) {
  const [kfA, kfB] = spec.frames;
  const refS = spec.refS ?? 0;
  const anchorAt = spec.anchor ? skeleton(mixPose(kfA, kfB, refS))[spec.anchor] : null;
  const slideVec = (s) => {
    if (!spec.slide) return [0, 0];
    const a = (spec.slide.angle * Math.PI) / 180;
    const d = lerpN(spec.slide.from, spec.slide.to, s);
    return [Math.cos(a) * d, Math.sin(a) * d];
  };

  // Articulations au temps s (angles, ancre, glissement), avant de poser mains et pieds.
  function base(s) {
    const pose = mixPose(kfA, kfB, s);
    const J = skeleton(pose);
    const d = anchorAt ? [anchorAt[0] - J[spec.anchor][0], anchorAt[1] - J[spec.anchor][1]] : [0, 0];
    const v = slideVec(s);
    return { pose, J: shiftPts(J, [d[0] + v[0], d[1] + v[1]]) };
  }

  const J0 = base(refS).J; // l'état de référence : là où se posent les mains, les pieds, le rouleau et le mur
  const ks = ['', '2'];
  const hands = spec.hands ? ks.map((k) => ({ k, H: J0['hand' + k], E: J0['elbow' + k] })) : null;
  const feet = spec.feet ? ks.map((k) => ({ k, A: J0['ankle' + k] })) : null;

  function solve(s) {
    const { pose, J } = base(s);
    for (const { k, H, E } of hands ?? []) {
      J['elbow' + k] = spec.hands === 'forearm' ? E : twoBone(J.shoulder, H, L.upper, L.fore, ELBOW);
      J['hand' + k] = H;
    }
    for (const { k, A } of feet ?? []) {
      const toe = [J['toe' + k][0] - J['ankle' + k][0], J['toe' + k][1] - J['ankle' + k][1]]; // le pied garde son angle
      const knee = twoBone(J.hip, A, L.thigh, L.shin, KNEE);
      J['knee' + k] = knee;
      J['ankle' + k] = A;
      J['toe' + k] = [A[0] + toe[0], A[1] + toe[1]];
      J['thigh' + k] = mid(J.hip, knee);
      J['shin' + k] = mid(knee, A);
    }
    return { pose, J };
  }

  // Les accessoires qui ne bougent pas sont fixés dans le repère monde, une fois pour toutes (miroir compris).
  const still = new Set(spec.still ?? []);
  const mx = (pt) => (facing === -1 ? [-pt[0], pt[1]] : pt);
  const baseProps = (kfA.props ?? []).map((p) => {
    if (still.has(p.t) && p.at) return { ...p, at: mx(ref(p.at, J0, 1)) };
    if (p.t === 'band' && spec.stillEnds?.band?.includes('to')) return { ...p, to: mx(ref(p.to, J0, 1)) };
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
  return { draw, period: spec.period, joints: (s) => solve(s).J };
}

// La spécification complète d'une fiche : ses images, plus ce que dit js/data/motions.js.
export function motionSpec(mob) {
  const m = MOTIONS[mob.id];
  if (!m) return null;
  const a = mob.frames[0];
  const b = m.end ? { ...a, ...m.end } : (mob.frames[1] ?? a);
  return { ...m, frames: [a, b] };
}
export const hasMotion = (mob) => !!MOTIONS[mob.id];

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Monte le schéma d'une fiche dans `host`. Sans mouvement défini, c'est l'image fixe d'avant.
// setPlaying(true) lance la boucle ; setPlaying(false) fige sur l'image en cours (pas de saut en arrière).
// Sans { force }, la boucle ne démarre pas si l'appareil demande de réduire les animations (lancement automatique) ;
// avec { force }, c'est une demande de la personne et on joue.
export function mountFigure(host, mob, { facing = 1, label = mob.name } = {}) {
  const spec = motionSpec(mob);
  if (!spec) {
    host.replaceChildren(renderPose({ ...mob.frames[0], facing, label }));
    return { animated: false, isPlaying: () => false, setPlaying() {}, destroy() {} };
  }
  const anim = makeAnimation(spec, facing);
  // Au repos : la pose de départ, avec sa flèche, dans le cadre du mouvement (pas de saut au démarrage).
  host.replaceChildren(anim.draw(0, label, true));
  let raf = 0;
  let playing = false;
  let t = 0;
  let last = 0;
  const frame = (now) => {
    t += Math.min((now - last) / 1000, 0.1); // un onglet en veille ne fait pas sauter l'animation
    last = now;
    host.replaceChildren(anim.draw(wave((t / anim.period) % 1), label));
    raf = requestAnimationFrame(frame);
  };
  return {
    animated: true,
    isPlaying: () => playing,
    setPlaying(on, { force = false } = {}) {
      if (on === playing) return;
      if (on && reduceMotion() && !force) return;
      playing = on;
      cancelAnimationFrame(raf);
      if (on) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    destroy() { playing = false; cancelAnimationFrame(raf); },
  };
}
