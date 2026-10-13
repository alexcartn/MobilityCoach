import { h, icon } from '../ui.js';
import { ZONES } from '../data/zones.js';
import { getMob } from '../data/mobs.js';
import { trendChart } from '../charts.js';
import { loadAssessments, loadPlan, globalSeries, zoneDelta, priorities, pickTargetTests, totalMinutes, profile, daysUntil, fromDateKey } from '../assessment.js';
import { loadSessions, stats, dayKey } from '../sessions.js';
import { fmtSeconds } from '../routine.js';

const MONTHS = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

// « en 2 mois », « en 3 semaines », « en 5 j » entre le premier et le dernier bilan.
function since(first, last) {
  const days = Math.max(1, Math.round((new Date(last) - new Date(first)) / 86400000));
  if (days < 14) return `en ${days} j`;
  if (days < 60) return `en ${Math.round(days / 7)} semaines`;
  return `en ${Math.round(days / 30)} mois`;
}

// Lundi à dimanche de la semaine en cours, avec les jours où une séance a été faite.
function weekDays(sessions) {
  const done = new Set(sessions.map((s) => dayKey(new Date(s.at))));
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return 'LMMJVSD'.split('').map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { letter, date: d, isToday: d.toDateString() === today.toDateString(), done: done.has(dayKey(d)) };
  });
}

function weekStrip(days) {
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return h('ol', { class: 'week', 'aria-label': 'Jours de la semaine' }, days.map((d) =>
    h('li', { class: [d.isToday ? 'today' : '', d.done ? 'done' : ''].join(' ').trim() || null },
      h('span', { 'aria-hidden': 'true' }, d.letter),
      h('span', { class: 'day' },
        h('span', { class: 'visually-hidden' }, `${fmt.format(d.date)}${d.isToday ? ', aujourd\'hui' : ''} : ${d.done ? 'séance faite' : 'pas de séance'}`)),
    )));
}

export async function render(root) {
  const [assessments, sessions, plan] = await Promise.all([loadAssessments(), loadSessions(), loadPlan()]);
  const last = assessments.at(-1);
  const st = stats(sessions);
  const week = weekDays(sessions);
  const history = sessions.slice(-5).reverse();
  const when = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  let sort = 'prio';
  const zonesBox = h('ul', { class: 'list' });
  const prioBtn = h('button', { type: 'button', onClick: () => setSort('prio') }, 'À travailler');
  const gainBtn = h('button', { type: 'button', onClick: () => setSort('gain') }, 'Progrès');

  function setSort(s) {
    sort = s;
    prioBtn.setAttribute('aria-pressed', String(s === 'prio'));
    gainBtn.setAttribute('aria-pressed', String(s === 'gain'));
    const rows = ZONES.map((z) => ({ z, score: last.scores[z.id], d: zoneDelta(assessments, z.id) }));
    rows.sort((a, b) => {
      if ((a.score === null) !== (b.score === null)) return a.score === null ? 1 : -1;
      return s === 'prio' ? (a.score ?? 0) - (b.score ?? 0) || a.z.id - b.z.id : b.d - a.d || a.z.id - b.z.id;
    });
    zonesBox.replaceChildren(...rows.map(({ z, score, d }) =>
      h('li', null,
        h('a', { class: 'score-row', href: `#/zone/${z.id}` },
          h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(z.id)),
          h('span', { class: 'sr-main' },
            h('span', { class: 'sr-top' }, h('span', null, z.name), h('b', null, score === null ? '–' : String(score))),
            h('span', { class: 'meter' }, h('span', { style: `width:${score ?? 0}%` })),
          ),
          score === null ? null : h('span', { class: `delta${d === 0 ? ' flat' : d < 0 ? ' neg' : ''}` }, d === 0 ? '=' : `${d > 0 ? '+' : ''}${d}`),
        ))));
  }

  // --- Bloc bilan ---------------------------------------------------------------------------
  let assessmentBlock;
  if (!last) {
    assessmentBlock = [
      h('section', { class: 'hero', style: 'gap:12px' },
        h('span', { class: 'hero-label' }, 'Score de mobilité'),
        h('h2', { style: 'font-size:24px' }, 'Ton point de départ'),
        h('p', null, '8 tests, environ 15 minutes. Tu obtiens un score par zone, la silhouette de ta mobilité et une routine qui commence par ce qui te freine.'),
        h('a', { class: 'btn primary big', href: '#/bilan', style: 'align-self:stretch' }, icon('play', 18), 'Commencer le bilan'),
      ),
    ];
  } else {
    const series = globalSeries(assessments);
    const prof = profile(last.scores);
    const gain = series.length > 1 ? series.at(-1).value - series[0].value : null;
    const measured = ZONES.filter((z) => last.scores[z.id] !== null);
    const progressing = measured.filter((z) => zoneDelta(assessments, z.id) > 0).length;
    const days = plan?.date ? daysUntil(plan.date) : null;
    const d = plan?.date ? fromDateKey(plan.date) : null;
    const planIds = plan ? (plan.type === 'full' ? null : pickTargetTests(last.scores)) : null;
    const prios = priorities(last.scores, 2).map((p) => p.name.toLowerCase());

    assessmentBlock = [
      h('section', { class: 'hero', style: 'gap:12px', 'aria-labelledby': 'sc-t' },
        h('div', { class: 'sc-top', style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px' },
          h('div', null,
            h('span', { class: 'hero-label', id: 'sc-t' }, 'Score de mobilité'),
            h('div', { style: 'display:flex;align-items:baseline;gap:10px;margin-top:2px' },
              h('b', { style: 'font-family:var(--font-display);font-size:48px;font-weight:750;letter-spacing:-.03em;line-height:1' }, String(last.global)),
              gain !== null ? h('span', { style: 'font-size:13px;font-weight:700;color:var(--accent)' }, `${gain > 0 ? '+' : ''}${gain} ${since(series[0].at, series.at(-1).at)}`) : null),
          ),
          h('span', { class: 'hero-tag' }, prof.name),
        ),
        trendChart(series, `Score global : ${series.map((p) => p.value).join(', ')}`),
        h('a', { href: '#/profil', style: 'color:var(--hero-text);font-weight:650;font-size:14px' }, 'Voir mon profil et la silhouette'),
      ),

      plan?.date
        ? h('a', { class: 'banner', href: '#/retest' },
            h('span', { class: 'cal-icon' }, h('small', null, MONTHS.format(d).replace('.', '')), h('b', null, String(d.getDate()))),
            h('span', { class: 'txt' },
              h('b', null, days < 0 ? 'Re-test en retard' : days === 0 ? 'Re-test aujourd\'hui' : days === 1 ? 'Re-test demain' : `Re-test dans ${days} jours`),
              h('span', null, planIds ? `${planIds.length} tests · ${prios.join(' et ')} · ${totalMinutes(planIds)} min` : `Bilan complet · ${totalMinutes(['squat', 'overhead', 'reachback', 'wrist', 'hinge', 'couch', 'kneeflex', 'ankle'])} min`)),
            icon('chevronRight', 18))
        : h('a', { class: 'banner', href: '#/retest' },
            h('span', { class: 'cal-icon' }, icon('clock', 22)),
            h('span', { class: 'txt' }, h('b', null, 'Planifier mon re-test'), h('span', null, 'Pour voir ce qui a changé')),
            icon('chevronRight', 18)),

      h('div', { class: 'stat-grid three' },
        h('div', { class: 'stat-card' }, h('b', null, `${Math.round(st.weekSeconds / 60)} min`), h('span', null, 'sur 7 jours')),
        h('div', { class: 'stat-card' }, h('b', null, String(sessions.length)), h('span', null, sessions.length > 1 ? 'séances' : 'séance')),
        h('div', { class: 'stat-card' }, h('b', null, `${progressing} / ${measured.length}`), h('span', null, 'zones en progrès')),
      ),

      h('section', { class: 'section', style: 'gap:10px', 'aria-labelledby': 'zones-t' },
        h('div', { class: 'section-head' },
          h('h2', { id: 'zones-t', class: 'section-title' }, 'Zone par zone'),
          h('div', { class: 'segmented small', role: 'group', 'aria-label': 'Trier les zones' }, prioBtn, gainBtn),
        ),
        zonesBox,
      ),
    ];
  }

  root.append(
    h('header', { class: 'page-head', style: 'flex-direction:row;align-items:flex-end;justify-content:space-between;gap:12px' },
      h('h1', { class: 'page-title' }, 'Suivi'),
      h('div', { style: 'display:flex;align-items:center;gap:8px' },
        h('span', { class: 'hero-tag', style: 'background:var(--surface);color:var(--text);border:1px solid var(--line);display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 8px;font-size:13px' },
          icon('flame', 18), `${st.streak} jour${st.streak > 1 ? 's' : ''} d'affilée`),
        h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Réglages' }, icon('sliders')),
      ),
    ),
    ...assessmentBlock,

    h('section', { class: 'card section', 'aria-labelledby': 'week-t' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'week-t', style: 'font-family:var(--font-body);font-size:15px;font-weight:700' }, 'Cette semaine'),
        h('span', { class: 'hint' }, `${week.filter((x) => x.done).length} / 7 jours`),
      ),
      weekStrip(week),
    ),

    sessions.length
      ? h('section', { class: 'section', style: 'gap:10px' },
          h('h2', { class: 'section-label' }, 'Dernières séances'),
          h('ul', { class: 'list' }, history.map((e) =>
            h('li', { class: 'row' },
              h('span', { class: 'row-text' },
                h('span', { class: 'row-title' }, when(e.at)),
                h('span', { class: 'row-sub' }, e.items.map((it) => getMob(it.id)?.name ?? it.id).join(', ')),
              ),
              h('span', { class: 'hint' }, fmtSeconds(Math.round(e.seconds / 10) * 10)),
            ))),
        )
      : h('section', { class: 'card' },
          h('h3', null, 'Aucune séance pour l\'instant'),
          h('p', { class: 'hint', style: 'margin-top:4px' }, 'Lance une séance depuis Aujourd\'hui : elle apparaîtra ici.'),
          h('a', { class: 'btn primary', href: '#/today', style: 'margin-top:12px' }, 'Préparer ma séance')),
  );
  if (last) setSort('prio');
}
