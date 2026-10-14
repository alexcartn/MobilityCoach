// Génération et découpage d'une séance, selon les règles du livre :
// douleur d'abord, puis positions à améliorer, puis défaire la journée ; 3 zones maximum ;
// environ 2 minutes par position et par côté.

import { MOBS, getMob } from './data/mobs.js';
import { ZONES } from './data/zones.js';

// Temps pour se mettre en place entre deux fiches. Il entre dans les durées annoncées ; en séance, c'est un vrai compte à
// rebours quand les fiches s'enchaînent seules (la première fiche en laisse un peu plus, le temps de poser le téléphone).
export const SETUP_SECONDS = 10;
export const FIRST_SETUP_SECONDS = 15;
export const SWITCH_SECONDS = 5;
export const DEFAULT_SECONDS = 120;
export const MIN_SECONDS = 30;
export const MAX_ZONES = 3;

// Ordre des phases : la douleur passe en premier, défaire la journée en dernier.
const PHASES = ['back', 'sport', 'sitting', 'travel'];

export const sidesOf = (m) => (m.perSide ? 2 : 1);
export const defaultSeconds = (m) => Math.min(m.seconds, DEFAULT_SECONDS);
// Dose minimale du livre : 2 minutes par position (sauf une fiche plus courte par nature).
export const minSecondsFor = (m) => Math.min(DEFAULT_SECONDS, m.seconds);

// Durée d'une fiche dans la séance : temps par position x côtés + mise en place + changement de côté.
export const WEAK_SIDE_BONUS = 30;

// weak : { zoneId: 'l' | 'r' } (côté le plus raide d'après le bilan) : ce côté reçoit 30 s de plus.
export function itemSeconds(item, weak = {}) {
  const m = getMob(item.id);
  const bonus = m.perSide && weak[m.zone] ? WEAK_SIDE_BONUS : 0;
  return item.seconds * sidesOf(m) + bonus + SETUP_SECONDS + (m.perSide ? SWITCH_SECONDS : 0);
}

export const totalSeconds = (items, weak = {}) => items.reduce((n, it) => n + itemSeconds(it, weak), 0);
export const zonesOf = (items) => new Set(items.map((it) => getMob(it.id).zone));

// Les zones les moins mobiles d'après le bilan passent en premier.
const needBoost = (score) => (score === null || score === undefined ? 0 : score < 25 ? 2 : score < 50 ? 1.5 : score < 65 ? 0.7 : 0);

// Rotation : la moitié des fiches (les mieux notées) restent d'un jour à l'autre ; l'autre moitié est tirée, selon la date,
// parmi les fiches presque aussi pertinentes (à ROTATION_MARGIN points du meilleur score du contexte).
export const ROTATION_MARGIN = 1;

// Numéro du jour (heure locale) : change à minuit, identique toute la journée.
export const dayIndex = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

// Petit générateur pseudo-aléatoire à graine : le même jour redonne toujours le même tirage.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mélange la tête d'une file (les fiches proches du meilleur score) : le reste garde son ordre.
function shuffleHead(queue, scoreOf, day, salt) {
  if (queue.length < 2) return queue;
  const top = scoreOf(queue[0]);
  const n = queue.findIndex((m) => scoreOf(m) < top - ROTATION_MARGIN);
  const head = queue.slice(0, n === -1 ? queue.length : n);
  const rand = seeded(day * 7919 + salt * 104729);
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  return [...head, ...queue.slice(head.length)];
}

// settings : durée, contextes, sports, matériel. zoneScores : scores 0-100 du dernier bilan.
// { day } : numéro du jour de la rotation (par défaut aujourd'hui) ; le même jour redonne toujours la même séance.
export function buildRoutine(settings, zoneScores = null, { day = dayIndex() } = {}) {
  const budget = settings.duration * 60;
  const wanted = PHASES.filter((c) => settings.contexts.includes(c));
  const hasScores = !!zoneScores && Object.values(zoneScores).some((v) => v !== null && v !== undefined);
  // Sans contexte mais avec un bilan : la séance suit les zones à travailler.
  const byNeed = wanted.length === 0 && hasScores;
  const fallback = wanted.length === 0 && !byNeed;
  const active = byNeed ? ['need'] : fallback ? ['sitting'] : wanted;
  const have = new Set(settings.equipment);
  const usable = MOBS.filter((m) => m.tools.every((t) => have.has(t)));

  const score = (m, c) => {
    if (c === 'need') {
      const z = zoneScores[m.zone];
      return z === null || z === undefined ? 0.1 : 4 - z / 25 + Math.max(...Object.values(m.relevance)) * 0.1;
    }
    const base = m.relevance[c] ?? 0;
    if (!base) return 0;
    return base + (c === 'sport' && m.sports?.some((s) => settings.sports.includes(s)) ? 1 : 0)
      + (hasScores ? needBoost(zoneScores[m.zone]) : 0);
  };
  const ranked = Object.fromEntries(active.map((c) => [
    c,
    usable
      .filter((m) => score(m, c) > 0)
      .sort((a, b) => score(b, c) - score(a, c) || MOBS.indexOf(a) - MOBS.indexOf(b)),
  ]));

  const cost = (m) => itemSeconds({ id: m.id, seconds: defaultSeconds(m) });
  // Remplit la séance : un tour par contexte (deux fiches pour la douleur), jusqu'à ce que plus rien ne rentre.
  // `chosen` peut déjà contenir des fiches imposées (les piliers).
  function fill(queues, chosen = []) {
    const picked = chosen.slice();
    const zones = new Set(picked.map((it) => getMob(it.id).zone));
    let used = picked.reduce((n, it) => n + cost(getMob(it.id)), 0);
    let added = true;
    while (added) {
      added = false;
      for (const c of active) {
        // La douleur prend la plus grosse part de la séance.
        for (let k = 0; k < (c === 'back' || c === 'need' ? 2 : 1); k++) {
          const m = queues[c].find((x) =>
            !picked.some((y) => y.id === x.id)
            && (zones.has(x.zone) || zones.size < MAX_ZONES)
            && used + cost(x) <= budget);
          if (!m) break;
          picked.push({ id: m.id, seconds: defaultSeconds(m), phase: c === 'need' ? -1 : PHASES.indexOf(c) });
          zones.add(m.zone);
          used += cost(m);
          added = true;
        }
      }
    }
    return picked;
  }

  // 1. La séance de référence (sans rotation) ; sa première moitié devient les piliers fixes.
  const reference = fill(ranked);
  // Une séance d'une seule fiche n'a pas de pilier : elle tourne parmi les mieux notées.
  const pillars = reference.slice(0, reference.length <= 1 ? 0 : Math.ceil(reference.length / 2));
  // 2. Le reste est complété avec des files mélangées selon le jour.
  const rotated = Object.fromEntries(active.map((c, i) => [
    c,
    shuffleHead(ranked[c], (m) => score(m, c), day, i + 1),
  ]));
  const chosen = fill(rotated, pillars);
  chosen.sort((a, b) => a.phase - b.phase); // tri stable : l'ordre de choix est conservé dans une phase
  return { items: chosen.map(({ id, seconds }) => ({ id, seconds })), fallback };
}

// Découpe une séance en étapes pour le minuteur : un temps de travail par côté, et 5 s pour changer de côté.
// flow : les fiches s'enchaînent seules, chacune précédée d'un compte à rebours « Prépare-toi ».
// Sinon, une fiche qui commence (côté 0) attend que tu appuies sur « Démarrer ».
export function stepsFor(items, weak = {}, { flow = false } = {}) {
  const steps = [];
  items.forEach((it, mobIndex) => {
    const m = getMob(it.id);
    const weakSide = m.perSide ? weak[m.zone] : null; // 'l' | 'r' | undefined
    if (flow) steps.push({ kind: 'setup', id: m.id, label: 'Prépare-toi', seconds: mobIndex === 0 ? FIRST_SETUP_SECONDS : SETUP_SECONDS, mobIndex, side: 0 });
    for (let side = 0; side < sidesOf(m); side++) {
      if (side > 0) steps.push({ kind: 'prep', id: m.id, label: 'Change de côté', seconds: SWITCH_SECONDS, mobIndex, side });
      const bonus = (weakSide === 'l' && side === 0) || (weakSide === 'r' && side === 1) ? WEAK_SIDE_BONUS : 0;
      steps.push({ kind: 'work', id: m.id, seconds: it.seconds + bonus, mobIndex, side, bonus });
    }
  });
  return steps;
}

export function fmtSeconds(sec) {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

// Séance ciblée sur une zone : 2 à 3 fiches de la zone, environ 8 minutes au plus.
export function zoneRoutine(zoneId, equipment = [], budget = 480) {
  const have = new Set(equipment);
  const all = MOBS.filter((m) => m.zone === zoneId);
  const usable = all.filter((m) => m.tools.every((t) => have.has(t)));
  const pool = (usable.length ? usable : all)
    .slice()
    .sort((a, b) => Math.max(...Object.values(b.relevance)) - Math.max(...Object.values(a.relevance)));
  const items = [];
  let used = 0;
  for (const m of pool) {
    const cost = itemSeconds({ id: m.id, seconds: defaultSeconds(m) });
    if (used + cost > budget && items.length) continue;
    items.push({ id: m.id, seconds: defaultSeconds(m) });
    used += cost;
    if (items.length === 3) break;
  }
  return items;
}

// Séance « J'ai mal ici » : approche amont-aval du livre. La zone douloureuse est au centre,
// puis une zone en amont (vers le tronc) et une en aval (vers les extrémités), 3 zones au plus.
// scores : { zoneId: 0-100 } du dernier bilan, pour préférer le voisin le moins mobile.
export const PAIN_ROLES = ['center', 'up', 'down'];
export function painRoutine(zoneId, equipment = [], { budget = 900, scores = null } = {}) {
  const zone = ZONES.find((z) => z.id === zoneId);
  const have = new Set(equipment);
  const ranked = (z) => {
    const all = MOBS.filter((m) => m.zone === z);
    const usable = all.filter((m) => m.tools.every((t) => have.has(t)));
    return (usable.length ? usable : all).slice()
      .sort((a, b) => Math.max(...Object.values(b.relevance)) - Math.max(...Object.values(a.relevance)));
  };
  const choose = (ids) => {
    const withMobs = ids.filter((z) => MOBS.some((m) => m.zone === z));
    if (!withMobs.length) return null;
    if (!scores) return withMobs[0];
    // Le voisin le moins mobile d'abord ; à égalité, l'ordre de la carte.
    return withMobs.slice().sort((a, b) => (scores[a] ?? 50) - (scores[b] ?? 50))[0];
  };
  const zones = { center: zoneId, up: choose(zone.up), down: choose(zone.down) };
  const queues = Object.fromEntries(PAIN_ROLES.map((r) => [r, zones[r] ? ranked(zones[r]) : []]));
  const cost = (m) => itemSeconds({ id: m.id, seconds: defaultSeconds(m) });
  const items = [];
  let used = 0;
  // Un tour par rôle : la douleur d'abord, puis l'amont, puis l'aval ; un second tour s'il reste du temps.
  for (let round = 0; round < 2; round++) {
    for (const role of PAIN_ROLES) {
      const m = queues[role][round];
      if (!m || used + cost(m) > budget) continue;
      items.push({ id: m.id, seconds: defaultSeconds(m), role });
      used += cost(m);
    }
  }
  items.sort((a, b) => PAIN_ROLES.indexOf(a.role) - PAIN_ROLES.indexOf(b.role));
  return { items, zones };
}
