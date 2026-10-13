// Bilan de mobilité : calcul des scores par zone, profil, priorités, asymétrie, historique.
// Un résultat de test va de 0 à 4. Un score de zone va de 0 à 100 (moyenne pondérée des tests qui la concernent).

import * as store from './store.js';
import { TESTS, getTest, PROFILE_GROUPS, BALANCED_PROFILE } from './data/tests.js';
import { ZONES } from './data/zones.js';

const KEY = 'assessments';
const PLAN_KEY = 'retestPlan';
const DRAFT_KEY = 'bilanDraft';

// Réponse à un test : { v } pour un test bilatéral, { l, r } pour un test à gauche et à droite.
export function testLevel(test, ans) {
  if (!ans) return null;
  if (!test.sides) return Number.isInteger(ans.v) ? ans.v : null;
  const vals = [ans.l, ans.r].filter(Number.isInteger);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export const isAnswered = (test, ans) => (test.sides ? Number.isInteger(ans?.l) && Number.isInteger(ans?.r) : Number.isInteger(ans?.v));

// Score 0-100 par zone, null si aucun test ne l'a mesurée.
export function zoneScores(answers) {
  const out = {};
  for (const z of ZONES) {
    let sum = 0;
    let weights = 0;
    for (const t of TESTS) {
      const w = t.zones.find(([id]) => id === z.id)?.[1];
      const lvl = testLevel(t, answers?.[t.id]);
      if (w && lvl !== null) { sum += (lvl / 4) * 100 * w; weights += w; }
    }
    out[z.id] = weights ? Math.round(sum / weights) : null;
  }
  return out;
}

export function globalScore(scores) {
  const vals = Object.values(scores).filter((v) => v !== null && v !== undefined);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

// Niveau de couleur de la silhouette : 0 (0-24), 1 (25-49), 2 (50-74), 3 (75 et plus).
export const bucket = (score) => (score === null || score === undefined ? 'none' : score < 25 ? 0 : score < 50 ? 1 : score < 75 ? 2 : 3);

export const zoneName = (id) => ZONES.find((z) => z.id === id)?.name ?? `Zone ${id}`;

// Zones à travailler d'abord : les moins bien notées.
export function priorities(scores, n = 3) {
  return ZONES.filter((z) => scores[z.id] !== null && scores[z.id] !== undefined)
    .sort((a, b) => scores[a.id] - scores[b.id] || a.id - b.id)
    .slice(0, n)
    .map((z) => ({ id: z.id, name: z.name, score: scores[z.id] }));
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Profil : nom, texte d'explication, zones qui freinent.
export function profile(scores) {
  const measured = Object.values(scores).filter((v) => v !== null && v !== undefined);
  if (!measured.length) return null;
  const total = mean(measured);
  const groups = PROFILE_GROUPS
    .map((g) => ({ ...g, avg: mean(g.zones.map((z) => scores[z]).filter((v) => v !== null && v !== undefined)) }))
    .filter((g) => !Number.isNaN(g.avg))
    .sort((a, b) => a.avg - b.avg);
  const weakest = groups[0];
  const strongest = groups[groups.length - 1];
  const prios = priorities(scores, 3).map((p) => p.name.toLowerCase());
  if (total >= 72 && weakest.avg >= 60) {
    return { name: BALANCED_PROFILE, text: 'Tes zones sont toutes bien mobiles. Ta routine entretient et vise les points les plus faibles.' };
  }
  const list = prios.length > 1 ? `${prios.slice(0, -1).join(', ')} puis ${prios.at(-1)}` : prios[0];
  const tail = strongest && strongest !== weakest ? ` Le plus à l'aise : ${strongest.label}.` : '';
  return {
    name: weakest.name,
    text: `Ce qui te freine le plus : ${list}.${tail} Ta routine commencera par là.`,
  };
}

// Côté à renforcer par zone : si un test à gauche et à droite diffère d'au moins un niveau.
// Retourne { zoneId: 'l' | 'r' }.
export function weakSides(answers) {
  const out = {};
  for (const t of TESTS) {
    const a = answers?.[t.id];
    if (!t.sides || !a || !Number.isInteger(a.l) || !Number.isInteger(a.r) || a.l === a.r) continue;
    const side = a.l < a.r ? 'l' : 'r';
    for (const [zone] of t.zones) if (!out[zone]) out[zone] = side;
  }
  return out;
}

// Tests à refaire en re-test ciblé : ceux qui éclairent le mieux les zones prioritaires.
export function pickTargetTests(scores, n = 3) {
  const prios = priorities(scores, 3);
  const ranked = TESTS.map((t) => ({
    id: t.id,
    value: prios.reduce((s, p) => s + (t.zones.find(([z]) => z === p.id)?.[1] ?? 0) * (100 - p.score), 0),
  })).sort((a, b) => b.value - a.value);
  return ranked.filter((r) => r.value > 0).slice(0, n).map((r) => r.id);
}

export const totalMinutes = (testIds) => testIds.reduce((s, id) => s + (getTest(id)?.minutes ?? 1), 0);

// --- Historique ----------------------------------------------------------------------------

export const loadAssessments = () => store.get(KEY, []);
export const loadPlan = () => store.get(PLAN_KEY, null);
export const savePlan = (plan) => store.set(PLAN_KEY, plan);
export const loadDraft = () => store.get(DRAFT_KEY, null);
export const saveDraft = (draft) => store.set(DRAFT_KEY, draft);
export const clearDraft = () => store.set(DRAFT_KEY, null);

// Ajoute un bilan ou un re-test. Les réponses des tests non refaits sont conservées.
export async function addAssessment({ type, answers, at = new Date().toISOString() }) {
  const all = await loadAssessments();
  const previous = all.at(-1);
  const merged = { ...(previous?.merged ?? {}), ...answers };
  const measured = ZONES.filter((z) => TESTS.some((t) => answers[t.id] && t.zones.some(([id]) => id === z.id))).map((z) => z.id);
  const rec = { at, type, answers, merged, scores: zoneScores(merged), measured };
  rec.global = globalScore(rec.scores);
  all.push(rec);
  await store.set(KEY, all);
  // Le prochain re-test se cale sur la cadence choisie.
  const plan = await loadPlan();
  if (plan?.cadence) {
    const next = new Date(at);
    next.setDate(next.getDate() + plan.cadence * 7);
    await savePlan({ ...plan, date: toDateKey(next) });
  }
  return rec;
}

// Score d'une zone à chaque mesure : [{ at, value }]
export function zoneSeries(assessments, zoneId) {
  return assessments
    .filter((a) => a.measured?.includes(zoneId) && a.scores[zoneId] !== null)
    .map((a) => ({ at: a.at, value: a.scores[zoneId] }));
}

export function globalSeries(assessments) {
  return assessments.filter((a) => a.global !== null && a.global !== undefined).map((a) => ({ at: a.at, value: a.global }));
}

// Gain d'une zone depuis le premier bilan.
export function zoneDelta(assessments, zoneId) {
  const s = zoneSeries(assessments, zoneId);
  return s.length >= 2 ? s.at(-1).value - s[0].value : 0;
}

export function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const fromDateKey = (key) => new Date(`${key}T08:00:00`);

export function daysUntil(key, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = fromDateKey(key);
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bb - a) / 86400000);
}
