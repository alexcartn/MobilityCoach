import { h } from '../ui.js';
import { ZONES } from '../data/zones.js';

export async function render(root) {
  root.append(
    h('h2', null, 'Fiches par zone'),
    h('p', { class: 'lead' }, 'Les 13 zones du livre. Les fiches de mobilisation (avec schéma, technique et test avant/après) arrivent zone par zone.'),
    h('div', { class: 'stack' }, ZONES.map((z) =>
      h('div', { class: 'card zone' },
        h('div', { class: 'num', 'aria-hidden': 'true' }, z.id),
        h('div', null,
          h('h3', null, z.name),
          h('p', { class: 'muted small', style: 'margin:0' }, z.covers),
          h('span', { class: 'tag' }, 'Fiches bientôt'),
        ),
      ),
    )),
  );
}
