// Statistiques de suivi : régularité, temps passé, répartition par zone, effet des séances, score.
// Fonctions pures : elles prennent la liste des séances et des bilans et rendent des nombres, sans toucher au DOM.

import { dayKey } from './sessions.js';
import { getMob } from './data/mobs.js';
import { ZONES } from './data/zones.js';

// --- Dates ------------------------------------------------------------------------------------
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
// Lundi de la semaine de d, à minuit.
export const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
export const maxDate = (a, b) => (a > b ? a : b);
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
const fmtMonthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Durée lisible : « 42 min », « 3 h 05 ».
export function fmtDuration(seconds) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

// --- Périodes -----------------------------------------------------------------------------------
// kind : 'month' (mois de anchor), 'quarter' (le mois en cours et les deux précédents), 'all' (depuis la première séance).
// to est exclusif. prev : la période de même durée juste avant, ou null.
export function period(kind, { anchor = new Date(), now = new Date(), sessions = [] } = {}) {
  const tomorrow = addDays(startOfDay(now), 1);
  if (kind === 'month') {
    const from = startOfMonth(anchor);
    const to = addMonths(from, 1);
    const prevFrom = addMonths(from, -1);
    return { kind, from, to, label: cap(fmtMonthYear.format(from)), prev: { from: prevFrom, to: from, label: fmtMonth.format(prevFrom) } };
  }
  if (kind === 'quarter') {
    const from = addMonths(startOfMonth(now), -2);
    const prevFrom = addMonths(from, -3);
    return { kind, from, to: tomorrow, label: `${cap(fmtMonth.format(from))} à ${fmtMonth.format(now)}`, prev: { from: prevFrom, to: from, label: '3 mois précédents' } };
  }
  const first = sessions.length ? new Date(Math.min(...sessions.map((s) => new Date(s.at).getTime()))) : now;
  return { kind: 'all', from: startOfDay(first), to: tomorrow, label: 'Depuis le début', prev: null };
}

export const inRange = (sessions, from, to) => sessions.filter((s) => { const t = new Date(s.at); return t >= from && t < to; });

// Jours écoulés dans la période (le mois en cours n'est compté que jusqu'à aujourd'hui).
export function elapsedDays(from, to, now = new Date()) {
  const end = new Date(Math.min(to.getTime(), addDays(startOfDay(now), 1).getTime()));
  return Math.max(0, daysBetween(from, end));
}

// --- Totaux -------------------------------------------------------------------------------------
export function summary(sessions, from, to, now = new Date()) {
  const list = inRange(sessions, from, to);
  const seconds = list.reduce((n, s) => n + s.seconds, 0);
  const days = new Set(list.map((s) => dayKey(new Date(s.at))));
  return {
    count: list.length,
    seconds,
    activeDays: days.size,
    elapsedDays: elapsedDays(from, to, now),
    avgSeconds: list.length ? Math.round(seconds / list.length) : 0,
  };
}

// dayKey -> { seconds, count, sessions }
export function dayTotals(sessions, from, to) {
  const out = {};
  for (const s of inRange(sessions, from, to)) {
    const k = dayKey(new Date(s.at));
    const day = (out[k] ??= { seconds: 0, count: 0, sessions: [] });
    day.seconds += s.seconds;
    day.count += 1;
    day.sessions.push(s);
  }
  return out;
}

// Paliers de la carte de régularité : 0 aucune séance, 1 moins de 10 min, 2 de 10 à 19 min, 3 vingt minutes ou plus.
export const heatLevel = (seconds) => (seconds <= 0 ? 0 : seconds < 600 ? 1 : seconds < 1200 ? 2 : 3);

// Cases d'une grille « semaines en colonnes, lundi en haut » couvrant [from, to) : [{ date, key, inside, seconds, level }].
export function heatCells(sessions, from, to) {
  const totals = dayTotals(sessions, from, to);
  const start = startOfWeek(from);
  const cells = [];
  for (let d = start; d < to || d.getDay() !== 1; d = addDays(d, 1)) {
    const key = dayKey(d);
    const inside = d >= from && d < to;
    const seconds = inside ? totals[key]?.seconds ?? 0 : 0;
    cells.push({ date: new Date(d), key, inside, seconds, count: inside ? totals[key]?.count ?? 0 : 0, level: heatLevel(seconds) });
  }
  return cells;
}

// Barres de temps : par semaine (lundi à dimanche) ou par mois, coupées aux bornes de la période. [{ from, to, seconds, count }]
export function buckets(sessions, from, to, unit = 'week') {
  const out = [];
  let cur = unit === 'week' ? startOfWeek(from) : startOfMonth(from);
  while (cur < to) {
    const next = unit === 'week' ? addDays(cur, 7) : addMonths(cur, 1);
    const lo = cur < from ? from : cur;
    const hi = next > to ? to : next;
    const list = inRange(sessions, lo, hi);
    out.push({ from: lo, to: hi, seconds: list.reduce((n, s) => n + s.seconds, 0), count: list.length });
    cur = next;
  }
  return out;
}

// Secondes par zone du livre, d'après les fiches travaillées.
export function zoneTotals(sessions, from, to) {
  const out = {};
  for (const s of inRange(sessions, from, to)) {
    for (const it of s.items ?? []) {
      const z = getMob(it.id)?.zone;
      if (z) out[z] = (out[z] ?? 0) + it.seconds;
    }
  }
  return out;
}

// Zones faibles au dernier bilan qui ont reçu peu de temps : à reprendre en priorité.
export function neglectedZones(zoneSeconds, scores, { minSeconds = 240, maxScore = 60, limit = 3 } = {}) {
  if (!scores) return [];
  return ZONES
    .filter((z) => scores[z.id] !== null && scores[z.id] !== undefined && scores[z.id] < maxScore && (zoneSeconds[z.id] ?? 0) < minSeconds)
    .sort((a, b) => scores[a.id] - scores[b.id] || a.id - b.id)
    .slice(0, limit)
    .map((z) => ({ id: z.id, name: z.name, score: scores[z.id], seconds: zoneSeconds[z.id] ?? 0 }));
}

// Jours de la semaine (lundi en premier) : secondes cumulées. Moment de la journée : matin, après-midi, soir.
export function habits(sessions, from, to) {
  const weekday = Array(7).fill(0);
  const moment = { morning: 0, afternoon: 0, evening: 0 };
  for (const s of inRange(sessions, from, to)) {
    const d = new Date(s.at);
    weekday[(d.getDay() + 6) % 7] += s.seconds;
    moment[d.getHours() < 12 ? 'morning' : d.getHours() < 18 ? 'afternoon' : 'evening'] += s.seconds;
  }
  return { weekday, moment };
}

// --- Effet des séances (test avant / après) ----------------------------------------------------
export function testGains(sessions, from, to) {
  const rows = inRange(sessions, from, to).filter((s) => s.test?.before && s.test?.after).map((s) => ({ zone: s.test.zone, gain: s.test.after - s.test.before }));
  const byZone = {};
  for (const r of rows) (byZone[r.zone] ??= []).push(r.gain);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    count: rows.length,
    average: rows.length ? avg(rows.map((r) => r.gain)) : null,
    improved: rows.filter((r) => r.gain > 0).length,
    zones: Object.entries(byZone).map(([zone, g]) => ({ zone: Number(zone), average: avg(g), count: g.length })).sort((a, b) => b.average - a.average || b.count - a.count),
  };
}

// --- Séries et records ------------------------------------------------------------------------
export function streaks(sessions, now = new Date()) {
  const keys = [...new Set(sessions.map((s) => dayKey(new Date(s.at))))].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    const d = new Date(`${k}T12:00:00`);
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const days = new Set(keys);
  let current = 0;
  const d = startOfDay(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // la série reste vivante tant que la journée n'est pas finie
  while (days.has(dayKey(d))) { current++; d.setDate(d.getDate() - 1); }
  return { current, longest };
}

export function records(sessions) {
  if (!sessions.length) return null;
  const maxOf = (map) => Math.max(...Object.values(map));
  const byWeek = {};
  const byMonth = {};
  for (const s of sessions) {
    const d = new Date(s.at);
    const w = dayKey(startOfWeek(d));
    const m = `${d.getFullYear()}-${d.getMonth()}`;
    byWeek[w] = (byWeek[w] ?? 0) + s.seconds;
    byMonth[m] = (byMonth[m] ?? 0) + s.seconds;
  }
  return {
    sessions: sessions.length,
    seconds: sessions.reduce((n, s) => n + s.seconds, 0),
    longestSession: Math.max(...sessions.map((s) => s.seconds)),
    bestWeek: maxOf(byWeek),
    bestMonth: maxOf(byMonth),
  };
}

// --- Score ----------------------------------------------------------------------------------------
// Bilans de la période, avec le dernier bilan d'avant comme point de départ. Écart global et par zone.
export function scoreProgress(assessments, from, to) {
  const inside = assessments.filter((a) => { const t = new Date(a.at); return t >= from && t < to; });
  const before = assessments.filter((a) => new Date(a.at) < from).at(-1) ?? null;
  const baseline = before ?? inside[0] ?? null;
  const last = inside.at(-1) ?? null;
  const series = [...(before ? [before] : []), ...inside].filter((a) => a.global !== null && a.global !== undefined).map((a) => ({ at: a.at, value: a.global }));
  const zones = [];
  if (baseline && last && baseline !== last) {
    for (const z of ZONES) {
      const a = baseline.scores[z.id];
      const b = last.scores[z.id];
      if (a !== null && a !== undefined && b !== null && b !== undefined) zones.push({ id: z.id, name: z.name, from: a, to: b, delta: b - a });
    }
  }
  return {
    count: inside.length,
    series,
    globalDelta: baseline && last && baseline !== last && baseline.global !== null && last.global !== null ? last.global - baseline.global : null,
    zones: zones.sort((a, b) => b.delta - a.delta || a.id - b.id),
  };
}

// --- Export -----------------------------------------------------------------------------------------
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function sessionsCsv(sessions) {
  const head = ['date', 'heure', 'duree_s', 'zones', 'fiches', 'contextes', 'type', 'test_zone', 'test_avant', 'test_apres'];
  const rows = sessions.map((s) => {
    const d = new Date(s.at);
    const zones = [...new Set((s.items ?? []).map((it) => getMob(it.id)?.zone).filter(Boolean))].join(' ');
    return [dayKey(d), `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, s.seconds, zones,
      (s.items ?? []).map((it) => `${it.id}:${it.seconds}`).join(' '), (s.contexts ?? []).join(' '), s.kind ?? '', s.test?.zone ?? '', s.test?.before ?? '', s.test?.after ?? ''];
  });
  return [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
}
