import { h } from '../ui.js';
import { ZONES } from '../data/zones.js';
import { MOBS, SYSTEMS, METHODS, zoneMobs, getMob } from '../data/mobs.js';
import { EQUIPMENT } from '../data/profile.js';
import { renderFrame } from '../diagram.js';
import { loadSettings } from '../settings.js';

const equipLabel = (id) => EQUIPMENT.find((e) => e.id === id)?.label ?? id;

export function duration(m) {
  const min = m.seconds >= 60 ? `${Math.round(m.seconds / 60)} min` : `${m.seconds} s`;
  return m.perSide ? `${min} par côté` : min;
}

export async function render(root, params = []) {
  const [zoneId, mobId] = params;
  const mob = mobId && getMob(mobId);
  if (mob) return renderMob(root, mob);
  const zone = ZONES.find((z) => String(z.id) === zoneId);
  if (zone) return renderZone(root, zone);
  return renderIndex(root);
}

function renderIndex(root) {
  root.append(
    h('h2', null, 'Fiches par zone'),
    h('p', { class: 'lead' }, 'Les 13 zones du livre. Les fiches arrivent zone par zone, avec schéma, technique et test avant/après.'),
    h('div', { class: 'stack' }, ZONES.map((z) => {
      const n = zoneMobs(z.id).length;
      const body = [
        h('div', { class: 'num', 'aria-hidden': 'true' }, z.id),
        h('div', null,
          h('h3', null, z.name),
          h('p', { class: 'muted small', style: 'margin:0' }, z.covers),
          h('span', { class: 'tag' }, n ? `${n} fiche${n > 1 ? 's' : ''}` : 'Fiches bientôt'),
        ),
      ];
      return n
        ? h('a', { class: 'card zone link', href: `#/library/${z.id}` }, body)
        : h('div', { class: 'card zone' }, body);
    })),
  );
}

function renderZone(root, zone) {
  root.append(
    h('a', { class: 'back', href: '#/library' }, '← Toutes les zones'),
    h('h2', null, `${zone.id}. ${zone.name}`),
    h('p', { class: 'lead' }, zone.covers),
    h('div', { class: 'stack' }, zoneMobs(zone.id).map((m) =>
      h('a', { class: 'card link', href: `#/library/${zone.id}/${m.id}` },
        h('h3', null, m.name),
        h('p', { class: 'small', style: 'margin:0 0 6px' }, m.summary),
        h('div', { class: 'meta' },
          h('span', { class: 'tag' }, duration(m)),
          m.systems.map((s) => h('span', { class: 'tag' }, SYSTEMS[s])),
        ),
      ),
    )),
  );
}

async function renderMob(root, m) {
  const s = await loadSettings();
  const zone = ZONES.find((z) => z.id === m.zone);

  root.append(
    h('a', { class: 'back', href: `#/library/${m.zone}` }, `← ${zone.name}`),
    h('h2', null, m.name),
    h('p', { class: 'lead' }, m.summary),
    h('div', { class: 'meta' },
      h('span', { class: 'tag' }, duration(m)),
      m.systems.map((x) => h('span', { class: 'tag' }, SYSTEMS[x])),
      m.methods.map((x) => h('span', { class: 'tag alt' }, METHODS[x])),
      m.when === 'after' && h('span', { class: 'tag alt' }, 'Plutôt après l\'effort'),
    ),

    h('div', { class: 'frames' }, m.frames.map((f, i) => renderFrame(f, i, m.frames.length))),

    m.caution && h('div', { class: 'card warn small' }, m.caution),

    h('p', { class: 'section-title' }, 'Matériel'),
    h('div', { class: 'card' },
      m.tools.length
        ? h('ul', { class: 'plain' }, m.tools.map((t) => h('li', null,
            equipLabel(t), s.equipment.includes(t) ? ' (dans ta liste)' : ' (pas dans ta liste : improvise ou ajoute-le dans Aujourd\'hui)')))
        : h('p', { class: 'small', style: 'margin:0' }, 'Aucun matériel nécessaire.'),
      m.toolsNote && h('p', { class: 'muted small', style: 'margin:8px 0 0' }, m.toolsNote),
    ),

    h('p', { class: 'section-title' }, 'Comment faire'),
    h('div', { class: 'card' }, h('ol', { class: 'steps' }, m.steps.map((t) => h('li', null, t)))),

    h('p', { class: 'section-title' }, 'Erreurs fréquentes'),
    h('div', { class: 'card' }, h('ul', { class: 'plain' }, m.faults.map((t) => h('li', null, t)))),

    h('p', { class: 'section-title' }, 'Teste avant, reteste après'),
    h('div', { class: 'card accent' },
      h('p', { class: 'small', style: 'margin-top:0' }, 'Fais un test, mobilise, puis refais le même test. Sans amélioration visible, ce n\'était pas la bonne zone.'),
      h('ul', { class: 'plain' }, m.retest.map((t) => h('li', null, t))),
    ),

    h('p', { class: 'section-title' }, 'Ça améliore'),
    h('div', { class: 'card' }, h('ul', { class: 'plain' }, m.improves.map((t) => h('li', null, t)))),
  );
}

export { MOBS };
