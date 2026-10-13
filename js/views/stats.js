import { h, icon, download } from '../ui.js';
import { ZONES, REGIONS } from '../data/zones.js';
import { getMob } from '../data/mobs.js';
import { lineChart, barChart } from '../charts.js';
import { loadSessions, dayKey } from '../sessions.js';
import { loadAssessments, loadPlan, daysUntil } from '../assessment.js';
import * as S from '../stats.js';

const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fmtMonthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const WEEKDAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
const comma = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');

// Écart lisible avec la période précédente : « +3 », « −12 min », « = ».
function delta(now, before, fmt = (v) => String(v)) {
  const d = now - before;
  if (d === 0) return { text: '=', cls: '' };
  return { text: `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}`, cls: d > 0 ? 'up' : 'down' };
}

// #/stats : le mois, les 3 derniers mois ou tout l'historique.
export async function render(root) {
  const [sessions, assessments, plan] = await Promise.all([loadSessions(), loadAssessments(), loadPlan()]);
  const now = new Date();
  let kind = 'month';
  let anchor = S.startOfMonth(now);
  let selectedDay = null;

  const content = h('div', { class: 'section', style: 'gap:var(--space-xl)' });
  const monthLabel = h('span', { class: 'label', 'aria-live': 'polite' });
  const prevBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mois précédent', onClick: () => { anchor = S.addMonths(anchor, -1); selectedDay = null; paint(); } }, icon('chevronLeft', 20));
  const nextBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Mois suivant', onClick: () => { anchor = S.addMonths(anchor, 1); selectedDay = null; paint(); } }, icon('chevronRight', 20));
  const nav = h('div', { class: 'period-nav' }, prevBtn, monthLabel, nextBtn);
  const seg = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Période' });

  const PERIODS = [['month', 'Mois'], ['quarter', '3 mois'], ['all', 'Tout']];
  for (const [id, label] of PERIODS) {
    seg.append(h('button', { type: 'button', 'data-kind': id, onClick: () => { kind = id; selectedDay = null; paint(); } }, label));
  }

  function paint() {
    for (const b of seg.children) b.setAttribute('aria-pressed', String(b.dataset.kind === kind));
    const p = S.period(kind, { anchor, now, sessions });
    nav.style.display = kind === 'month' ? '' : 'none';
    monthLabel.textContent = p.label;
    nextBtn.disabled = S.addMonths(anchor, 1) > S.startOfMonth(now);
    prevBtn.disabled = !sessions.length || S.addMonths(anchor, -1) < S.addMonths(S.startOfMonth(new Date(Math.min(...sessions.map((s) => new Date(s.at).getTime())))), -1);
    content.replaceChildren(...build(p).filter(Boolean));
  }

  // --- Sections ------------------------------------------------------------------------------
  function build(p) {
    if (!sessions.length) {
      return [h('section', { class: 'section', style: 'gap:var(--space-xs)' },
        h('h2', { class: 'section-title' }, 'Pas encore de séance'),
        h('p', { class: 'hint' }, 'Tes statistiques apparaissent dès ta première séance : temps passé, régularité, zones travaillées.'),
        h('a', { class: 'btn primary', href: '#/today', style: 'align-self:flex-start;margin-top:var(--space-xs)' }, 'Préparer ma séance'))];
    }

    const cur = S.summary(sessions, p.from, p.to, now);
    const inProgress = p.to > now && p.from <= now;
    return [
      summarySection(p, cur, inProgress),
      regularitySection(p),
      barsSection(p),
      zonesSection(p),
      neglectedSection(p),
      scoreSection(p),
      gainsSection(p),
      habitsSection(p),
      recordsSection(),
      h('section', { class: 'section', style: 'gap:var(--space-xs)' },
        h('button', { type: 'button', class: 'btn', style: 'align-self:flex-start', onClick: () => download(`supple-leopard-seances-${dayKey(now)}.csv`, S.sessionsCsv(sessions), 'text/csv') }, icon('download', 18), 'Exporter mes séances (CSV)'),
        h('p', { class: 'hint' }, 'Un fichier lisible dans un tableur : une ligne par séance.')),
    ];
  }

  function summarySection(p, cur, inProgress) {
    let prevText = null;
    let before = null;
    if (p.prev) {
      // Mois en cours : on compare à la même date du mois d'avant, pour ne pas se comparer à un mois entier.
      const span = Math.max(1, S.daysBetween(p.from, p.to > now ? S.addDays(S.startOfDay(now), 1) : p.to));
      const prevTo = new Date(Math.min(p.prev.to.getTime(), S.addDays(p.prev.from, span).getTime()));
      before = S.summary(sessions, p.prev.from, prevTo, now);
      prevText = inProgress && kind === 'month' ? `à la même date en ${p.prev.label}` : `en ${p.prev.label}`;
    }
    const cmp = (now2, before2, fmt) => (before && before.count ? delta(now2, before2, fmt) : null);
    const row = (label, value, d) => h('li', null,
      h('span', { class: 'k' }, label),
      h('span', { class: 'v' }, value, d ? h('small', { class: `delta-mini ${d.cls}` }, d.text) : null));
    return h('section', { class: 'section', 'aria-labelledby': 'st-sum' },
      h('h2', { id: 'st-sum', class: 'section-title' }, kind === 'month' ? 'Le mois en chiffres' : kind === 'quarter' ? 'Ces 3 mois' : 'Depuis le début'),
      h('ul', { class: 'list kv' },
        row('Séances', String(cur.count), cmp(cur.count, before?.count, (v) => String(v))),
        row('Temps de mobilité', S.fmtDuration(cur.seconds), cmp(cur.seconds, before?.seconds, (v) => S.fmtDuration(v))),
        row('Jours actifs', `${cur.activeDays} / ${cur.elapsedDays}`, cmp(cur.activeDays, before?.activeDays, (v) => String(v))),
        row('Durée moyenne', cur.count ? S.fmtDuration(cur.avgSeconds) : '–', null),
      ),
      prevText && before && before.count ? h('p', { class: 'hint' }, `Comparé à ${prevText}.`) : null,
    );
  }

  // Repères de mois sous la grille en semaines : un nom à la première colonne de chaque mois (le jeudi de la semaine, ou son dernier jour dans une semaine coupée).
  function monthMarks(cells) {
    const cols = cells.length / 7;
    const marks = [];
    let lastMonth = -1;
    let lastCol = -9;
    for (let c = 0; c < cols; c++) {
      const col = cells.slice(c * 7, c * 7 + 7).filter((x) => x.inside);
      const d = (col[3] ?? col.at(-1) ?? cells[c * 7]).date;
      if (d.getMonth() === lastMonth) continue;
      lastMonth = d.getMonth();
      if (c - lastCol < 3 || c > cols - 3) continue;
      lastCol = c;
      marks.push(h('span', { style: `grid-column:${c + 1}` }, fmtMonthShort.format(d).replace('.', '')));
    }
    return h('div', { class: 'heat-months', 'aria-hidden': 'true', style: `grid-template-columns: repeat(${cols}, minmax(0, 1fr))` }, ...marks);
  }

  function regularitySection(p) {
    const showKind = kind === 'month' ? 'month' : 'weeks';
    const from = kind === 'all' ? S.maxDate(p.from, S.addDays(S.startOfWeek(now), -25 * 7)) : p.from;
    const cells = S.heatCells(sessions, from, p.to);
    const totals = S.dayTotals(sessions, from, p.to);
    if (!selectedDay || !totals[selectedDay]) selectedDay = Object.keys(totals).sort().at(-1) ?? null;

    const detail = h('div', { class: 'day-detail', 'aria-live': 'polite' });
    const grid = h('div', { class: `heat ${showKind}`, style: showKind === 'weeks' ? `grid-template-columns: repeat(${cells.length / 7}, minmax(0, 1fr))` : null, role: 'group', 'aria-label': 'Jours avec séance' });

    function paintDetail() {
      detail.replaceChildren();
      const day = selectedDay ? totals[selectedDay] : null;
      if (!day) { detail.append(h('p', { class: 'hint' }, 'Touche un jour pour voir ce que tu as fait.')); return; }
      const d = new Date(`${selectedDay}T12:00:00`);
      const names = [...new Set(day.sessions.flatMap((s) => (s.items ?? []).map((it) => getMob(it.id)?.name ?? it.id)))];
      detail.append(
        h('h3', { class: 'detail-title' }, cap(fmtDay.format(d))),
        h('p', { class: 'small' }, `${plural(day.count, 'séance', 'séances')} · ${S.fmtDuration(day.seconds)}`),
        names.length ? h('p', { class: 'hint' }, names.join(', ')) : null,
      );
    }

    for (const c of cells) {
      const isFuture = c.date > now;
      grid.append(h('button', {
        type: 'button',
        class: `heat-cell l${c.level}${c.inside ? '' : ' outside'}${isFuture ? ' future' : ''}`,
        'aria-pressed': String(c.key === selectedDay),
        'aria-label': `${fmtDay.format(c.date)} : ${c.seconds ? S.fmtDuration(c.seconds) : 'pas de séance'}`,
        disabled: !c.inside || isFuture,
        'data-key': c.key,
        onClick: () => {
          selectedDay = c.key;
          for (const b of grid.querySelectorAll('.heat-cell')) b.setAttribute('aria-pressed', String(b.dataset.key === selectedDay));
          paintDetail();
        },
      }, showKind === 'month' ? String(c.date.getDate()) : null));
    }
    paintDetail();

    return h('section', { class: 'section', 'aria-labelledby': 'st-reg' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'st-reg', class: 'section-title' }, 'Régularité'),
        h('span', { class: 'hint' }, kind === 'all' ? '6 derniers mois' : `${S.summary(sessions, p.from, p.to, now).activeDays} jours actifs`)),
      showKind === 'month' ? h('div', { class: 'heat-dow', 'aria-hidden': 'true' }, ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l) => h('span', null, l))) : null,
      grid,
      showKind === 'weeks' ? monthMarks(cells) : null,
      h('div', { class: 'heat-legend' },
        h('span', null, 'Moins'),
        ['l0', 'l1', 'l2', 'l3'].map((c) => h('i', { class: c })),
        h('span', null, 'Plus'),
        h('span', { class: 'hint', style: 'margin-left:auto' }, 'Paliers : 10 et 20 min')),
      detail,
    );
  }

  function barsSection(p) {
    const unit = kind === 'all' ? 'month' : 'week';
    let bs = S.buckets(sessions, p.from, p.to, unit);
    if (kind === 'all') bs = bs.slice(-12);
    const values = bs.map((b) => Math.round(b.seconds / 60));
    if (!values.some((v) => v)) return null;
    const labels = bs.map((b) => (unit === 'week' ? String(b.from.getDate()) : cap(fmtMonthShort.format(b.from)).replace('.', '')));
    const every = values.length > 8 ? 2 : 1;
    return h('section', { class: 'section', 'aria-labelledby': 'st-bars' },
      h('h2', { id: 'st-bars', class: 'section-title' }, unit === 'week' ? 'Minutes par semaine' : 'Minutes par mois'),
      barChart(values, `${unit === 'week' ? 'Minutes par semaine' : 'Minutes par mois'} : ${values.join(', ')}`, { labels, labelEvery: every, highlight: p.to > now ? values.length - 1 : -1 }),
      unit === 'week' ? h('p', { class: 'hint' }, 'Chaque barre commence le lundi : le chiffre sous la barre est le jour du mois.') : null,
    );
  }

  function zonesSection(p) {
    const totals = S.zoneTotals(sessions, p.from, p.to);
    const rows = ZONES.filter((z) => totals[z.id]).sort((a, b) => totals[b.id] - totals[a.id]);
    if (!rows.length) return null;
    const max = totals[rows[0].id];
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    const regionSecs = Object.fromEntries(REGIONS.map((r) => [r.id, ZONES.filter((z) => z.region === r.id).reduce((n, z) => n + (totals[z.id] ?? 0), 0)]));
    return h('section', { class: 'section', style: 'gap:var(--space-xs)', 'aria-labelledby': 'st-zones' },
      h('h2', { id: 'st-zones', class: 'section-title' }, 'Où tu as travaillé'),
      h('p', { class: 'hint' }, REGIONS.map((r) => `${r.label} ${Math.round((regionSecs[r.id] / sum) * 100)} %`).join(' · ')),
      h('ul', { class: 'list', style: 'margin-top:var(--space-xs)' }, rows.slice(0, 8).map((z) =>
        h('li', null, h('a', { class: 'score-row', href: `#/library/${z.id}` },
          h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(z.id)),
          h('span', { class: 'sr-main' },
            h('span', { class: 'sr-top' }, h('span', null, z.name), h('b', null, S.fmtDuration(totals[z.id]))),
            h('span', { class: 'meter' }, h('span', { style: `width:${Math.max(4, Math.round((totals[z.id] / max) * 100))}%` })),
          ),
          icon('chevronRight', 18))))),
      rows.length > 8 ? h('p', { class: 'hint' }, `Et ${rows.length - 8} autres zones.`) : null,
    );
  }

  function neglectedSection(p) {
    const last = assessments.at(-1);
    if (!last) return null;
    const totals = S.zoneTotals(sessions, p.from, p.to);
    const days = Math.max(1, S.elapsedDays(p.from, p.to, now));
    // Seuil proportionnel : 4 minutes sur un mois, davantage sur une période plus longue.
    const minSeconds = Math.max(240, Math.round((days / 30) * 240));
    const list = S.neglectedZones(totals, last.scores, { minSeconds });
    return h('section', { class: 'section', style: 'gap:var(--space-xs)', 'aria-labelledby': 'st-neg' },
      h('h2', { id: 'st-neg', class: 'section-title' }, 'À reprendre'),
      list.length
        ? [
            h('p', { class: 'hint' }, 'Score faible au dernier bilan et peu de temps passé dessus sur la période.'),
            h('ul', { class: 'list', style: 'margin-top:var(--space-xs)' }, list.map((z) =>
              h('li', null, h('a', { class: 'score-row', href: `#/library/${z.id}` },
                h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(z.id)),
                h('span', { class: 'sr-main' },
                  h('span', { class: 'sr-top' }, h('span', null, z.name), h('b', null, String(z.score))),
                  h('span', { class: 'hint' }, z.seconds ? `${S.fmtDuration(z.seconds)} sur la période` : 'Aucune séance sur la période')),
                icon('chevronRight', 18))))),
          ]
        : h('p', { class: 'hint' }, 'Tes zones les moins mobiles reçoivent du temps : rien à signaler.'),
    );
  }

  function scoreSection(p) {
    if (!assessments.length) {
      return h('section', { class: 'section', style: 'gap:var(--space-xs)' },
        h('h2', { class: 'section-title' }, 'Score de mobilité'),
        h('p', { class: 'hint' }, 'Fais le bilan pour suivre ton score par zone, mois après mois.'),
        h('a', { class: 'text-link', href: '#/bilan' }, 'Commencer le bilan', icon('arrowRight', 18)));
    }
    const sp = S.scoreProgress(assessments, p.from, p.to);
    const last = assessments.at(-1);
    const next = plan?.date ? daysUntil(plan.date) : null;
    const nextText = next === null ? null : next < 0 ? 'Re-test en retard' : next === 0 ? 'Re-test aujourd\'hui' : next === 1 ? 'Re-test demain' : `Prochain re-test dans ${next} jours`;
    return h('section', { class: 'section', 'aria-labelledby': 'st-score' },
      h('h2', { id: 'st-score', class: 'section-title' }, 'Score de mobilité'),
      sp.series.length >= 2
        ? [
            h('p', { class: 'delta-line' },
              sp.globalDelta !== null && sp.globalDelta !== 0 ? [h('span', { class: sp.globalDelta > 0 ? 'up' : 'down' }, `${sp.globalDelta > 0 ? '+' : '−'}${Math.abs(sp.globalDelta)} points`), ' sur la période'] : 'Score stable sur la période'),
            lineChart(sp.series, `Score global : ${sp.series.map((s2) => s2.value).join(', ')}`),
          ]
        : h('p', { class: 'hint' }, sp.count ? 'Un seul bilan sur la période : il en faut deux pour voir une évolution.' : `Pas de bilan sur la période. Dernier score connu : ${last.global} sur 100.`),
      sp.zones.length ? [
        h('h3', { class: 'section-label', style: 'margin-top:var(--space-xs)' }, 'Zone par zone'),
        h('ul', { class: 'list' }, [...sp.zones.slice(0, 3), ...sp.zones.slice(-2).filter((z) => z.delta < 0 && !sp.zones.slice(0, 3).includes(z))].map((z) =>
          h('li', null, h('a', { class: 'score-row', href: `#/zone/${z.id}` },
            h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(z.id)),
            h('span', { class: 'sr-main' }, h('span', { class: 'sr-top' }, h('span', null, z.name), h('b', null, `${z.from} → ${z.to}`))),
            h('span', { class: `delta${z.delta === 0 ? ' flat' : z.delta < 0 ? ' neg' : ''}` }, z.delta === 0 ? '=' : `${z.delta > 0 ? '+' : '−'}${Math.abs(z.delta)}`))))),
      ] : null,
      nextText ? h('a', { class: 'text-link', href: '#/retest' }, nextText, icon('arrowRight', 18)) : h('a', { class: 'text-link', href: '#/retest' }, 'Planifier mon re-test', icon('arrowRight', 18)),
    );
  }

  function gainsSection(p) {
    const g = S.testGains(sessions, p.from, p.to);
    return h('section', { class: 'section', style: 'gap:var(--space-xs)', 'aria-labelledby': 'st-gain' },
      h('h2', { id: 'st-gain', class: 'section-title' }, 'Effet des séances'),
      g.count
        ? [
            h('p', { class: 'delta-line' }, h('span', { class: g.average > 0 ? 'up' : g.average < 0 ? 'down' : '' }, `${g.average > 0 ? '+' : g.average < 0 ? '−' : ''}${comma(Math.abs(g.average))} point`), ` en moyenne par séance, sur ${plural(g.count, 'test', 'tests')}. ${g.improved} fois mieux qu'avant.`),
            h('ul', { class: 'list', style: 'margin-top:var(--space-xs)' }, g.zones.slice(0, 4).map((z) =>
              h('li', { class: 'row' },
                h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(z.zone)),
                h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, ZONES.find((x) => x.id === z.zone)?.name ?? `Zone ${z.zone}`), h('span', { class: 'row-sub' }, plural(z.count, 'séance notée', 'séances notées'))),
                h('b', { class: z.average >= 0 ? 'up' : 'down', style: 'font-variant-numeric:tabular-nums' }, `${z.average >= 0 ? '+' : '−'}${comma(Math.abs(z.average))}`)))),
          ]
        : h('p', { class: 'hint' }, 'Note ta position de 1 à 5 avant et après la séance : tu verras ici ce que chaque séance change.'),
    );
  }

  function habitsSection(p) {
    const hb = S.habits(sessions, p.from, p.to);
    const total = hb.weekday.reduce((a, b) => a + b, 0);
    if (!total) return null;
    const best = hb.weekday.indexOf(Math.max(...hb.weekday));
    const mins = hb.weekday.map((s) => Math.round(s / 60));
    const tot = hb.moment.morning + hb.moment.afternoon + hb.moment.evening;
    const top = Object.entries(hb.moment).sort((a, b) => b[1] - a[1])[0];
    const momentName = { morning: 'le matin', afternoon: 'l\'après-midi', evening: 'le soir' }[top[0]];
    return h('section', { class: 'section', 'aria-labelledby': 'st-habits' },
      h('h2', { id: 'st-habits', class: 'section-title' }, 'Tes habitudes'),
      barChart(mins, `Minutes par jour de la semaine : ${mins.map((m, i) => `${WEEKDAYS[i]} ${m}`).join(', ')}`, { labels: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], highlight: best }),
      h('p', { class: 'small' }, `Ton meilleur jour : ${WEEKDAYS[best]}. Tu mobilises surtout ${momentName} (${Math.round((top[1] / tot) * 100)} % du temps).`),
    );
  }

  function recordsSection() {
    const r = S.records(sessions);
    if (!r) return null;
    const st = S.streaks(sessions, now);
    return h('section', { class: 'section', 'aria-labelledby': 'st-rec' },
      h('h2', { id: 'st-rec', class: 'section-title' }, 'Records'),
      h('ul', { class: 'list kv' },
        h('li', null, h('span', { class: 'k' }, 'Série en cours'), h('span', { class: 'v' }, plural(st.current, 'jour', 'jours'))),
        h('li', null, h('span', { class: 'k' }, 'Meilleure série'), h('span', { class: 'v' }, plural(st.longest, 'jour', 'jours'))),
        h('li', null, h('span', { class: 'k' }, 'Séance la plus longue'), h('span', { class: 'v' }, S.fmtDuration(r.longestSession))),
        h('li', null, h('span', { class: 'k' }, 'Meilleure semaine'), h('span', { class: 'v' }, S.fmtDuration(r.bestWeek))),
        h('li', null, h('span', { class: 'k' }, 'Meilleur mois'), h('span', { class: 'v' }, S.fmtDuration(r.bestMonth))),
        h('li', null, h('span', { class: 'k' }, 'Au total'), h('span', { class: 'v' }, `${r.sessions} · ${S.fmtDuration(r.seconds)}`)),
      ),
    );
  }

  root.append(
    h('header', { class: 'page-head' },
      h('a', { class: 'back-link', href: '#/progress' }, icon('chevronLeft', 18), 'Suivi'),
      h('h1', { class: 'page-title' }, 'Statistiques'),
    ),
    h('div', { class: 'section', style: 'gap:var(--space-sm)' }, seg, nav),
    content,
  );
  paint();
}
