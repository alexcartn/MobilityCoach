import * as store from './store.js';

const KEY = 'sessions';

export const loadSessions = () => store.get(KEY, []);

export async function logSession(entry) {
  const all = await loadSessions();
  all.push(entry);
  await store.set(KEY, all);
  return all;
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Régularité : 7 derniers jours, série de jours consécutifs, volume de la semaine glissante.
export function stats(sessions, now = new Date()) {
  const days = new Set(sessions.map((s) => dayKey(new Date(s.at))));

  const last7 = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(now);
    d.setDate(d.getDate() - k);
    last7.push({ date: d, done: days.has(dayKey(d)) });
  }

  // La série reste vivante si tu n'as pas encore mobilisé aujourd'hui.
  let streak = 0;
  const d = new Date(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const week = sessions.filter((s) => new Date(s.at) >= weekStart);
  return {
    last7,
    streak,
    weekCount: week.length,
    weekSeconds: week.reduce((n, s) => n + s.seconds, 0),
  };
}
