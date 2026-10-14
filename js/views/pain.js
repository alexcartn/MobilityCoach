import { h, icon } from '../ui.js';
import { ZONES } from '../data/zones.js';
import { getMob } from '../data/mobs.js';
import { EQUIPMENT } from '../data/profile.js';
import { loadSettings } from '../settings.js';
import { painRoutine, PAIN_ROLES, totalSeconds } from '../routine.js';
import { duration } from './library.js';
import { coversLine } from '../equip.js';
import { loadAssessments, weakSides } from '../assessment.js';

const ROLE_LABEL = { center: 'Sur la douleur', up: 'Amont', down: 'Aval' };
const ROLE_HELP = {
  center: 'Au centre de la séance, et ce qui prend le plus de temps.',
  up: 'Les tissus au-dessus, vers le tronc, tirent sur la zone.',
  down: 'Les tissus en dessous, vers les extrémités, aussi.',
};
const equipLabel = (id) => EQUIPMENT.find((e) => e.id === id)?.label ?? id;

// #/pain/10 : « J'ai mal au genou » : la zone au centre, puis ce qui est au-dessus et en dessous.
export async function render(root, params = []) {
  root.classList.add('has-bar');
  const zone = ZONES.find((z) => String(z.id) === params[0]);
  if (!zone) { location.hash = '#/library'; return; }

  const [settings, assessments] = await Promise.all([loadSettings(), loadAssessments()]);
  const last = assessments.at(-1);
  const weak = last ? weakSides(last.merged) : {};
  const { items, zones } = painRoutine(zone.id, settings.equipment, { budget: settings.duration * 60, scores: last?.scores ?? null });
  const minutes = Math.max(1, Math.round(totalSeconds(items, weak) / 60));
  const missing = [...new Set(items.flatMap((it) => getMob(it.id).tools).filter((t) => !settings.equipment.includes(t)))];

  const groups = PAIN_ROLES.filter((r) => zones[r]).map((role) => {
    const z = ZONES.find((x) => x.id === zones[role]);
    const rows = items.filter((it) => it.role === role);
    return h('section', { class: 'section', style: 'gap:var(--space-xs)', 'aria-labelledby': `pain-${role}` },
      h('div', null,
        h('span', { class: 'section-label', id: `pain-${role}` }, ROLE_LABEL[role]),
        h('h2', { class: 'section-title' }, z.name),
        h('p', { class: 'hint' }, ROLE_HELP[role]),
      ),
      h('ul', { class: 'list' }, rows.map((it) => {
        const m = getMob(it.id);
        return h('li', { class: 'act-row' },
          h('a', { class: 'act-main', href: `#/library/${m.zone}/${m.id}` },
            h('span', { class: 'zone-name' }, m.name),
            coversLine(duration(m), m.tools),
          ),
          h('a', { class: 'play-btn', href: `#/session/mob/${m.id}`, 'aria-label': `Faire seulement : ${m.name}` }, icon('play', 18)),
        );
      })),
    );
  });

  root.append(...[
    h('header', { class: 'page-head' },
      h('a', { class: 'back-link', href: `#/library/${zone.id}` }, icon('chevronLeft', 18), zone.name),
      h('span', { class: 'eyebrow' }, 'J\'ai mal ici'),
      h('h1', { class: 'page-title sm' }, `Plan pour : ${zone.name.toLowerCase()}`),
      h('p', { class: 'lead' }, 'Ne t\'acharne pas sur le point douloureux : mobilise aussi les tissus au-dessus et en dessous, qui tirent dessus. Compte environ 2 minutes par position et par côté.'),
    ),
    h('p', { class: 'callout warn' }, icon('warn'),
      h('span', null, 'Douleur vive, qui irradie, engourdissement ou suite à un choc : avis médical avant de mobiliser. Inconfort accepté, douleur brûlante non.')),
    ...groups,
    missing.length ? h('p', { class: 'hint' }, `Matériel qui manque dans ta liste : ${missing.map(equipLabel).join(', ')}. Improvise ou ajuste ta liste dans Aujourd'hui.`) : null,
    h('div', { class: 'bottom-bar' }, h('div', null,
      h('a', { class: 'btn primary big grow', href: `#/session/pain/${zone.id}` }, icon('play', 18), `Démarrer · ${minutes} min`),
    )),
  ].filter(Boolean));
}
