import { h, icon } from '../ui.js';
import { ZONES } from '../data/zones.js';
import { getMob } from '../data/mobs.js';
import { lineChart } from '../charts.js';
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
  let progressLine = '';
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
  let zonesBlock = [];
  if (!last) {
    assessmentBlock = [
      h('section', { class: 'section', style: 'gap:var(--space-md)' },
        h('div', { class: 'section', style: 'gap:var(--space-xs)' },
          h('span', { class: 'eyebrow' }, 'Score de mobilité'),
          h('h2', { class: 'page-title sm' }, 'Ton point de départ'),
          h('p', { class: 'lead' }, '8 tests, environ 15 minutes. Tu obtiens un score par zone, la silhouette de ta mobilité et une routine qui commence par ce qui te freine.'),
        ),
        h('a', { class: 'btn primary big', href: '#/bilan' }, icon('play', 18), 'Commencer le bilan'),
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
    progressLine = series.length > 1 ? `${progressing} zone${progressing > 1 ? 's' : ''} sur ${measured.length} en progrès depuis le bilan` : '';

    assessmentBlock = [
      h('section', { class: 'section', 'aria-labelledby': 'sc-t' },
        h('div', { class: 'score-head' },
          h('span', { class: 'eyebrow', id: 'sc-t' }, 'Score de mobilité'),
          h('div', { class: 'big-num' }, h('b', null, String(last.global)), h('span', null, '/ 100')),
          h('p', { class: 'delta-line' },
            gain !== null && gain !== 0 ? [h('span', { class: gain > 0 ? 'up' : 'down' }, `${gain > 0 ? '+' : ''}${gain} ${since(series[0].at, series.at(-1).at)}`), ' · '] : null,
            prof.name),
        ),
        lineChart(series, `Score global : ${series.map((p) => p.value).join(', ')}`),
        h('a', { class: 'text-link', href: '#/profil' }, 'Voir ma silhouette et mon profil', icon('arrowRight', 18)),
      ),

      plan?.date
        ? h('a', { class: 'banner', href: '#/retest' },
            h('span', { class: 'cal-icon' }, h('small', null, MONTHS.format(d).replace('.', '')), h('b', null, String(d.getDate()))),
            h('span', { class: 'txt' },
              h('b', null, days < 0 ? 'Re-test en retard' : days === 0 ? 'Re-test aujourd\'hui' : days === 1 ? 'Re-test demain' : `Re-test dans ${days} jours`),
              h('span', null, planIds ? `${planIds.length} tests · ${prios.join(' et ')} · ${totalMinutes(planIds)} min` : `Bilan complet · ${totalMinutes(['squat', 'overhead', 'reachback', 'wrist', 'hinge', 'couch', 'kneeflex', 'ankle'])} min`)),
            icon('chevronRight', 18))
        : h('a', { class: 'banner', href: '#/retest' },
            h('span', { class: 'cal-icon' }, icon('clock', 24)),
            h('span', { class: 'txt' }, h('b', null, 'Planifier mon re-test'), h('span', null, 'Pour voir ce qui a changé')),
            icon('chevronRight', 18)),
    ];
    zonesBlock = [
      h('section', { class: 'section', style: 'gap:var(--space-xs)', 'aria-labelledby': 'zones-t' },
        h('div', { class: 'section-head' },
          h('h2', { id: 'zones-t', class: 'section-title' }, 'Zone par zone'),
          h('div', { class: 'segmented small', role: 'group', 'aria-label': 'Trier les zones' }, prioBtn, gainBtn),
        ),
        progressLine ? h('p', { class: 'hint' }, progressLine) : null,
        h('div', { style: 'margin-top:var(--space-xs)' }, zonesBox),
      ),
    ];
  }

  const weekSection =
      h('section', { class: 'section', 'aria-labelledby': 'week-t' },
        h('div', { class: 'section-head' },
          h('h2', { id: 'week-t', class: 'section-title' }, 'Cette semaine'),
          h('span', { class: 'hint' }, `${week.filter((x) => x.done).length} jour${week.filter((x) => x.done).length > 1 ? 's' : ''} sur 7 · ${Math.round(st.weekSeconds / 60)} min`),
        ),
        weekStrip(week),
      );

  root.append(
    h('header', { class: 'page-head suivi-head' },
      h('h1', { class: 'page-title' }, 'Suivi'),
      h('div', { class: 'right' },
        h('span', { class: 'streak' }, icon('flame', 18), `${st.streak} jour${st.streak > 1 ? 's' : ''} d'affilée`),
        h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': 'Réglages' }, icon('sliders')),
      ),
    ),
    ...assessmentBlock,
    weekSection,
    ...zonesBlock,

    sessions.length
      ? h('section', { class: 'section', style: 'gap:var(--space-xs)' },
          h('div', { class: 'section-head' },
            h('h2', { class: 'section-title' }, 'Dernières séances'),
            h('span', { class: 'hint' }, `${sessions.length} au total`)),
          h('ul', { class: 'list', style: 'margin-top:var(--space-xs)' }, history.map((e) =>
            h('li', { class: 'row' },
              h('span', { class: 'row-text' },
                h('span', { class: 'row-title' }, when(e.at)),
                h('span', { class: 'row-sub' }, e.items.map((it) => getMob(it.id)?.name ?? it.id).join(', ')),
              ),
              h('span', { class: 'hint' }, fmtSeconds(Math.round(e.seconds / 10) * 10)),
            ))),
        )
      : h('section', { class: 'section', style: 'gap:var(--space-xs)' },
          h('h2', { class: 'section-title' }, 'Aucune séance pour l\'instant'),
          h('p', { class: 'hint' }, 'Lance une séance depuis Aujourd\'hui : elle apparaîtra ici.'),
          h('a', { class: 'btn primary', href: '#/today', style: 'align-self:flex-start;margin-top:var(--space-xs)' }, 'Préparer ma séance')),
  );
  if (last) setSort('prio');
}
