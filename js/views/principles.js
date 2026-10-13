import { h } from '../ui.js';
import { PRINCIPLES } from '../data/principles.js';

export async function render(root) {
  root.append(
    h('h2', null, 'Principes'),
    h('p', { class: 'lead' }, 'Les bases du livre, reformulées. Il reste la référence : cette page est un aide-mémoire.'),
    ...PRINCIPLES.map((p, i) =>
      h('details', { class: 'card', open: i === 1 },
        h('summary', null, p.title),
        h('div', { class: 'body' },
          (p.paragraphs || []).map((t) => h('p', null, t)),
          p.steps && h('ol', { class: 'steps' }, p.steps.map((t) => h('li', null, t))),
          p.items && h('ul', { class: 'plain' }, p.items.map((t) => h('li', null, t))),
          p.note && h('p', { class: 'muted small', style: 'margin-top:10px' }, p.note),
        ),
      ),
    ),
  );
}
