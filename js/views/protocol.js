import { h, icon } from '../ui.js';
import { getMob } from '../data/mobs.js';
import { getProtocol, resolveProtocol } from '../data/protocols.js';
import { loadSettings } from '../settings.js';
import { totalSeconds, fmtSeconds } from '../routine.js';
import { coversLine } from '../equip.js';
import { loadAssessments, weakSides } from '../assessment.js';

// #/protocol/wake : une séance prête à lancer (Réveil, Avant la course, Récupération, Bureau).
export async function render(root, params = []) {
  root.classList.add('has-bar');
  const protocol = getProtocol(params[0]);
  if (!protocol) { location.hash = '#/today'; return; }

  const [settings, assessments] = await Promise.all([loadSettings(), loadAssessments()]);
  const weak = weakSides(assessments.at(-1)?.merged ?? {});
  const items = resolveProtocol(protocol, settings.equipment);
  const minutes = Math.max(1, Math.round(totalSeconds(items, weak) / 60));
  const tools = [...new Set(items.flatMap((it) => getMob(it.id).tools))];

  root.append(
    h('header', { class: 'page-head' },
      h('a', { class: 'back-link', href: '#/today' }, icon('chevronLeft', 18), 'Aujourd\'hui'),
      h('span', { class: 'eyebrow' }, `Séance prête · ${protocol.when}`),
      h('h1', { class: 'page-title sm' }, protocol.name),
      h('p', { class: 'lead' }, protocol.blurb),
    ),

    h('section', { class: 'section', style: 'gap:var(--space-xs)', 'aria-labelledby': 'proto-list' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'proto-list', class: 'section-label' }, `${items.length} fiches · ${minutes} min`),
        h('span', { class: 'hint' }, tools.length ? 'Selon ton matériel' : 'Sans matériel'),
      ),
      h('ul', { class: 'list' }, items.map((it) => {
        const m = getMob(it.id);
        return h('li', { class: 'act-row' },
          h('a', { class: 'act-main', href: `#/library/${m.zone}/${m.id}` },
            h('span', { class: 'zone-name' }, m.name),
            coversLine(`${fmtSeconds(it.seconds)}${m.perSide ? ' par côté' : ''}`, m.tools),
          ),
          h('a', { class: 'play-btn', href: `#/session/mob/${m.id}`, 'aria-label': `Faire seulement : ${m.name}` }, icon('play', 18)),
        );
      })),
    ),

    h('p', { class: 'hint' }, 'Les fiches s\'adaptent au matériel que tu as coché dans Aujourd\'hui. Le côté le plus raide de ton bilan reçoit 30 s de plus.'),
    h('p', { class: 'callout warn' }, icon('warn'),
      h('span', null, 'Inconfort accepté, douleur vive non. Une douleur qui irradie ou un engourdissement : arrête et demande un avis médical.')),

    h('div', { class: 'bottom-bar' }, h('div', null,
      h('a', { class: 'btn primary big grow', href: `#/session/protocol/${protocol.id}` }, icon('play', 18), `Démarrer · ${minutes} min`),
    )),
  );
}
