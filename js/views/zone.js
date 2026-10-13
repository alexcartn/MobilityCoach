import { h, icon } from '../ui.js';
import { ZONES, REGIONS } from '../data/zones.js';
import { TESTS } from '../data/tests.js';
import { getMob } from '../data/mobs.js';
import { lineChart, barChart } from '../charts.js';
import { loadAssessments, loadPlan, zoneSeries, zoneDelta, weakSides, daysUntil } from '../assessment.js';
import { loadSessions } from '../sessions.js';
import { loadSettings } from '../settings.js';
import { zoneRoutine, totalSeconds } from '../routine.js';

const fmtLevel = (v) => `${(Math.round(v * 10) / 10).toString().replace('.', ',')}/4`;
const fmtGain = (g) => `${g > 0 ? '+' : ''}${(Math.round(g * 10) / 10).toString().replace('.', ',')} pt`;

function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

// Lundi de la semaine d'une date, à minuit.
function weekStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

// Minutes passées sur la zone pendant les 8 dernières semaines (la dernière : la semaine en cours).
export function weeklyMinutes(sessions, zoneId, now = new Date(), weeks = 8) {
  const out = Array(weeks).fill(0);
  const current = weekStart(now).getTime();
  for (const s of sessions) {
    const diff = Math.round((current - weekStart(new Date(s.at)).getTime()) / (7 * 86400000));
    if (diff < 0 || diff >= weeks) continue;
    const sec = s.items.filter((it) => getMob(it.id)?.zone === zoneId).reduce((n, it) => n + it.seconds, 0);
    out[weeks - 1 - diff] += sec / 60;
  }
  return out.map((v) => Math.round(v));
}

export async function render(root, params = []) {
  root.classList.add('has-bar');
  const zone = ZONES.find((z) => String(z.id) === params[0]);
  if (!zone) { location.hash = '#/progress'; return; }

  const [assessments, sessions, plan, settings] = await Promise.all([loadAssessments(), loadSessions(), loadPlan(), loadSettings()]);
  const last = assessments.at(-1);
  const score = last?.scores[zone.id] ?? null;
  const series = zoneSeries(assessments, zone.id);
  const delta = zoneDelta(assessments, zone.id);
  const region = REGIONS.find((r) => r.id === zone.region)?.label ?? '';

  const mine = sessions.filter((s) => s.items.some((it) => getMob(it.id)?.zone === zone.id));
  const seconds = mine.reduce((n, s) => n + s.items.filter((it) => getMob(it.id)?.zone === zone.id).reduce((m, it) => m + it.seconds, 0), 0);
  const gains = sessions.filter((s) => s.test?.zone === zone.id && s.test.before && s.test.after).map((s) => s.test.after - s.test.before);
  const gain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null;
  const retest = plan?.date ? daysUntil(plan.date) : null;

  let chart = 'score';
  const chartBox = h('div');
  const scoreBtn = h('button', { type: 'button', onClick: () => setChart('score') }, 'Score');
  const timeBtn = h('button', { type: 'button', onClick: () => setChart('time') }, 'Temps');
  const chartTitle = h('h2', { class: 'card-title' });

  function setChart(c) {
    chart = c;
    scoreBtn.setAttribute('aria-pressed', String(c === 'score'));
    timeBtn.setAttribute('aria-pressed', String(c === 'time'));
    chartTitle.textContent = c === 'score' ? 'Évolution du score' : 'Minutes par semaine';
    chartBox.replaceChildren();
    if (c === 'score') {
      if (!series.length) chartBox.append(h('p', { class: 'hint' }, 'Cette zone n\'a pas encore été mesurée. Fais le bilan pour voir ton score.'));
      else chartBox.append(lineChart(series, `Score de la zone : ${series.map((p) => `${p.value} le ${new Date(p.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`).join(', ')}`));
    } else {
      const mins = weeklyMinutes(sessions, zone.id);
      chartBox.append(barChart(mins, `Minutes par semaine sur cette zone, 8 dernières semaines : ${mins.join(', ')}`));
    }
  }

  // Tests qui éclairent cette zone : premier résultat, dernier résultat.
  const zoneTests = TESTS.filter((t) => t.zones.some(([id]) => id === zone.id) && last?.merged?.[t.id]);
  const levelOf = (t, ans) => (t.sides ? (Number.isInteger(ans.l) && Number.isInteger(ans.r) ? (ans.l + ans.r) / 2 : null) : ans.v);
  const testRows = zoneTests.map((t) => {
    const first = assessments.find((a) => a.answers[t.id])?.answers[t.id];
    const now = levelOf(t, last.merged[t.id]);
    const before = first ? levelOf(t, first) : null;
    const changed = before !== null && now !== null && before !== now;
    return h('li', { class: 'test-row' },
      h('span', { class: 'txt' }, h('span', { style: 'font-weight:650' }, t.title), h('span', null, t.sides ? 'Gauche et droite' : 'Les deux côtés')),
      changed ? h('span', { class: 'lv' }, h('small', null, fmtLevel(before)), icon('arrowRight', 14), ' ', fmtLevel(now)) : h('span', { class: 'lv' }, now === null ? '–' : fmtLevel(now)),
    );
  });

  const weak = last ? weakSides(last.merged)[zone.id] : null;
  const items = zoneRoutine(zone.id, settings.equipment);
  const minutes = Math.max(1, Math.round(totalSeconds(items, weak ? { [zone.id]: weak } : {}) / 60));

  root.append(
    h('div', { class: 'flow-head' },
      h('a', { class: 'round-link', href: '#/progress', 'aria-label': 'Retour' }, icon('chevronLeft')),
      h('span', { class: 'eyebrow' }, `Zone ${zone.id} · ${region}`),
    ),

    h('div', { class: 'zone-head' },
      h('div', { class: 'section', style: 'gap:4px' },
        h('h1', { class: 'page-title' }, zone.name),
        h('p', { class: 'lead' }, zone.covers),
      ),
      score !== null
        ? h('div', { class: 'big-score' }, h('b', null, String(score)),
            delta !== 0 ? h('span', { class: 'chip-delta', style: delta < 0 ? 'background:var(--warn-bg);color:var(--warn-ink)' : '' }, `${delta > 0 ? '+' : ''}${delta} depuis le bilan`) : null)
        : null,
    ),

    h('section', { class: 'card chart-card', 'aria-labelledby': 'chart-t' },
      h('div', { class: 'head' },
        h('div', { id: 'chart-t' }, chartTitle),
        h('div', { class: 'segmented small', role: 'group', 'aria-label': 'Type de graphique' }, scoreBtn, timeBtn),
      ),
      chartBox,
    ),

    h('div', { class: 'stat-grid' },
      h('div', { class: 'stat-card' }, h('span', null, 'Temps passé'), h('b', null, seconds ? fmtDuration(seconds) : '0 min')),
      h('div', { class: 'stat-card' }, h('span', null, 'Séances'), h('b', null, String(mine.length))),
      h('div', { class: 'stat-card' }, h('span', null, 'Gain moyen par séance'), h('b', null, gain === null ? '–' : fmtGain(gain))),
      h('a', { class: 'stat-card dark', href: assessments.length ? '#/retest' : '#/bilan' },
        h('span', null, 'Prochain re-test'),
        h('b', null, retest === null ? 'À planifier' : retest < 0 ? 'En retard' : retest === 0 ? 'Aujourd\'hui' : retest === 1 ? 'Demain' : `Dans ${retest} j`)),
    ),

    h('section', { class: 'section', 'aria-labelledby': 'tests-t' },
      h('h2', { id: 'tests-t', class: 'section-title' }, 'Tests de cette zone'),
      testRows.length
        ? h('ul', { class: 'list' }, testRows)
        : h('p', { class: 'card hint' }, 'Aucun test mesuré pour cette zone. Le bilan complet les couvre tous.'),
      weak ? h('p', { class: 'callout info' }, icon('check', 20),
        h('span', null, `Côté ${weak === 'l' ? 'gauche' : 'droit'} plus raide que l'autre : la routine lui donne 30 s de plus.`)) : null,
    ),

    h('div', { class: 'bottom-bar' }, h('div', null,
      items.length
        ? h('a', { class: 'btn primary grow', href: `#/session/${zone.id}` }, icon('play', 18), `Travailler cette zone · ${minutes} min`)
        : h('a', { class: 'btn grow', href: `#/library/${zone.id}` }, 'Voir les fiches'),
    )),
  );
  setChart('score');
}
