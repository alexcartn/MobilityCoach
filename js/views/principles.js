import { h, icon } from '../ui.js';
import { PRINCIPLES } from '../data/principles.js';

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const STEP_NAMES = ['Fessiers', 'Côtes', 'Ventre', 'Tête'];

function braceStepper(p) {
  // Chaque étape du livre commence par « Nom : … » : on garde le texte après les deux-points.
  const steps = p.steps.map((t, i) => ({ name: STEP_NAMES[i] || `Étape ${i + 1}`, text: cap(t.replace(/^[^:]+:\s*/, '')) }));
  let cur = 0;
  const counter = h('span', { class: 'counter', 'aria-hidden': 'true' });
  const text = h('p', { class: 'step-text', id: 'brace-panel', role: 'tabpanel', 'aria-live': 'polite' });
  const tabs = steps.map((st, i) =>
    h('button', { type: 'button', role: 'tab', 'aria-controls': 'brace-panel', onClick: () => go(i) }, st.name));

  function go(i) {
    cur = i;
    counter.textContent = `${cur + 1}/${steps.length}`;
    text.textContent = steps[cur].text;
    tabs.forEach((b, j) => {
      b.setAttribute('aria-selected', String(j === cur));
      b.classList.toggle('done', j <= cur);
    });
  }
  go(0);

  return h('section', { class: 'card stepper', 'aria-labelledby': 'brace-t' },
    h('div', { class: 'stepper-head' },
      h('div', null,
        h('span', { class: 'kicker' }, 'À faire avant tout'),
        h('h2', { id: 'brace-t' }, p.title),
      ),
      counter,
    ),
    h('div', { class: 'steps-tabs', role: 'tablist', 'aria-label': 'Étapes du gainage' }, tabs),
    text,
    h('div', { class: 'stepper-foot' },
      h('p', null, p.note),
      h('button', { type: 'button', class: 'round-btn', 'aria-label': 'Étape suivante', onClick: () => go((cur + 1) % steps.length) }, icon('arrowRight')),
    ),
  );
}

export async function render(root) {
  const brace = PRINCIPLES.find((p) => p.id === 'brace');
  const others = PRINCIPLES.filter((p) => p !== brace);

  root.append(
    h('header', { class: 'page-head' },
      h('h1', { class: 'page-title' }, 'Principes'),
      h('p', { class: 'lead' }, 'Les bases du livre, reformulées. Un aide-mémoire : le livre reste la référence.'),
    ),

    brace && braceStepper(brace),

    h('section', { class: 'section', 'aria-labelledby': 'rules-t' },
      h('h2', { id: 'rules-t', class: 'section-title' }, 'Les règles d\'or'),
      h('div', { class: 'rules' },
        h('div', { class: 'rule' }, icon('retest', 22), 'Teste, mobilise, reteste'),
        h('div', { class: 'rule' }, icon('clock', 22), '2 min par position et par côté'),
        h('div', { class: 'rule' }, icon('zones', 22), '3 zones par séance au maximum'),
      ),
    ),

    h('section', { class: 'section', 'aria-labelledby': 'more-t' },
      h('h2', { id: 'more-t', class: 'section-title' }, 'Comprendre'),
      h('div', { class: 'list acc' }, others.map((p, i) =>
        h('details', { open: i === 0 },
          h('summary', null,
            h('span', { class: 'acc-num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
            h('span', { class: 'acc-title' }, p.title),
            icon('chevronDown', 20, 'chev'),
          ),
          h('div', { class: 'acc-body' },
            (p.paragraphs || []).map((t) => h('p', null, t)),
            p.steps && h('ol', null, p.steps.map((t) => h('li', null, t))),
            p.items && h('ul', null, p.items.map((t) => h('li', null, t))),
            p.note && h('p', { class: 'note' }, p.note),
          ),
        ),
      )),
    ),
  );
}
