import { h, icon } from '../ui.js';
import { renderBody } from '../body.js';
import { loadAssessments, profile, priorities } from '../assessment.js';

const CIRC = 2 * Math.PI * 40;

export async function render(root) {
  const all = await loadAssessments();
  const rec = all.at(-1);
  if (!rec) { location.hash = '#/bilan'; return; }
  const prev = all.at(-2);
  const prof = profile(rec.scores);
  const prios = priorities(rec.scores, 3);
  const nTests = Object.keys(rec.answers).length;
  const gain = prev && prev.global !== null ? rec.global - prev.global : null;
  const goZone = (id) => { location.hash = `#/zone/${id}`; };

  const ring = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 96 96');
    svg.setAttribute('width', '96');
    svg.setAttribute('height', '96');
    svg.setAttribute('aria-hidden', 'true');
    for (const cls of ['ring-track', 'ring-fill']) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '48'); c.setAttribute('cy', '48'); c.setAttribute('r', '40');
      c.setAttribute('class', cls);
      if (cls === 'ring-fill') {
        c.setAttribute('stroke-dasharray', String(CIRC));
        c.setAttribute('stroke-dashoffset', String(CIRC * (1 - rec.global / 100)));
        c.setAttribute('transform', 'rotate(-90 48 48)');
      }
      svg.append(c);
    }
    return svg;
  })();

  root.append(
    h('header', { class: 'page-head' },
      h('a', { class: 'back-link', href: '#/progress' }, icon('chevronLeft', 18), 'Suivi'),
      h('span', { class: 'eyebrow' }, `${prev ? 'Re-test terminé' : 'Bilan terminé'} · ${nTests} test${nTests > 1 ? 's' : ''}`),
      h('h1', { class: 'page-title' }, 'Ton profil'),
    ),

    h('section', { class: 'hero', 'aria-labelledby': 'prof-t' },
      h('div', { class: 'hero-score' },
        h('div', { class: 'score-ring' }, ring, h('div', { class: 'val' }, h('b', null, String(rec.global)), h('span', null, '/ 100'))),
        h('div', null,
          h('span', { class: 'hero-label' }, 'Profil'),
          h('h2', { id: 'prof-t', style: 'margin-top:4px' }, prof.name),
          gain !== null && gain !== 0 ? h('span', { class: 'chip-delta', style: gain < 0 ? 'background:var(--warn-bg);color:var(--warn-ink)' : '' }, `${gain > 0 ? '+' : ''}${gain} depuis le dernier test`) : null,
        ),
      ),
      h('p', null, prof.text),
    ),

    h('section', { class: 'card section', 'aria-labelledby': 'map-t' },
      h('h2', { id: 'map-t', class: 'section-title' }, 'Ton corps, zone par zone'),
      h('div', { class: 'bodies' },
        h('figure', null, renderBody('front', rec.scores, { onZone: goZone }), h('figcaption', null, 'Face')),
        h('figure', null, renderBody('back', rec.scores, { onZone: goZone }), h('figcaption', null, 'Dos')),
      ),
      h('div', { class: 'legend' },
        h('span', null, h('i', { class: 'l0' }), '0 à 24'),
        h('span', null, h('i', { class: 'l1' }), '25 à 49'),
        h('span', null, h('i', { class: 'l2' }), '50 à 74'),
        h('span', null, h('i', { class: 'l3' }), '75 et plus'),
      ),
      h('p', { class: 'hint' }, 'Plus une zone est foncée, plus elle est mobile. Touche une zone pour voir le détail. Gris : pas encore mesurée.'),
    ),

    h('section', { class: 'section', 'aria-labelledby': 'prio-t' },
      h('h2', { id: 'prio-t', class: 'section-title' }, `Tes ${prios.length} priorités`),
      h('ul', { class: 'list' }, prios.map((p) =>
        h('li', null,
          h('a', { class: 'score-row', href: `#/zone/${p.id}` },
            h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(p.id)),
            h('span', { class: 'sr-main' },
              h('span', { class: 'sr-top' }, h('span', null, p.name), h('b', null, String(p.score))),
              h('span', { class: 'meter' }, h('span', { style: `width:${p.score}%` })),
            ),
            icon('chevronRight', 18),
          ),
        ))),
    ),

    h('div', { class: 'section', style: 'gap:10px' },
      h('a', { class: 'btn primary big', href: '#/today' }, icon('play', 18), prev ? 'Voir ma séance' : 'Voir ma première séance'),
      h('a', { class: 'btn big', href: '#/retest' }, icon('clock', 18), 'Planifier mon re-test'),
    ),
  );
}
