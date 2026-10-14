import { h, icon, toast } from '../ui.js';
import { TESTS, getTest } from '../data/tests.js';
import { ZONES } from '../data/zones.js';
import { mountFigure } from '../motion.js';
import { loadAssessments, addAssessment, loadDraft, saveDraft, clearDraft, isAnswered, pickTargetTests, totalMinutes } from '../assessment.js';

// Le schéma animé du test en cours : arrêté quand on change de test ou qu'on quitte l'écran (app.js appelle cleanup).
let fig = null;
export function cleanup() { fig?.destroy(); fig = null; }

// #/bilan : bilan complet (8 tests). #/bilan/target : re-test ciblé sur les zones prioritaires.
export async function render(root, params = []) {
  root.classList.add('has-bar');
  const assessments = await loadAssessments();
  const last = assessments.at(-1);
  const mode = params[0] === 'target' && last ? 'target' : 'full';
  const ids = mode === 'target' ? pickTargetTests(last.scores) : TESTS.map((t) => t.id);
  const tests = ids.map(getTest);
  const closeHref = assessments.length ? '#/progress' : '#/today';

  let answers = {};
  let i = -1; // -1 : écran d'introduction
  const draft = await loadDraft();
  if (draft && draft.mode === mode && draft.ids?.join() === ids.join()) { answers = draft.answers ?? {}; i = Math.max(-1, Math.min(draft.i ?? -1, tests.length - 1)); }
  const resumed = i >= 0;
  let side = 'l';

  const persist = () => saveDraft({ mode, ids, i, answers });
  const title = mode === 'target' ? 'Re-test ciblé' : 'Bilan de mobilité';

  function paintIntro() {
    root.replaceChildren(
      h('div', { class: 'flow-head' },
        h('a', { class: 'round-link', href: closeHref, 'aria-label': 'Quitter' }, icon('close')),
      ),
      h('header', { class: 'page-head' },
        h('span', { class: 'eyebrow' }, mode === 'target' ? 'Sur tes zones prioritaires' : 'Point de départ'),
        h('h1', { class: 'page-title' }, title),
        h('p', { class: 'lead' }, `${tests.length} tests, environ ${totalMinutes(ids)} minutes. Note honnêtement : ce score sert de point de départ, pas de jugement. Tu le referas dans quelques semaines pour voir ce qui change.`),
      ),
      h('ul', { class: 'list' }, tests.map((t, n) =>
        h('li', { class: 'row' },
          h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(n + 1)),
          h('span', { class: 'row-text' },
            h('span', { class: 'row-title' }, t.title),
            h('span', { class: 'row-sub' }, `${t.zones.map(([id]) => ZONES.find((z) => z.id === id).name).slice(0, 2).join(', ')} · ${t.minutes} min${t.sides ? ' · gauche et droite' : ''}`),
          ),
        ))),
      h('p', { class: 'callout info' }, icon('clock', 22),
        h('span', null, 'Prévois un mur, un peu de place au sol et une chaise ou un banc. Un test douloureux : arrête-toi et passe au suivant.')),
      h('div', { class: 'bottom-bar' }, h('div', null,
        h('button', { type: 'button', class: 'btn primary grow', onClick: () => { i = 0; side = 'l'; persist(); paintTest(); } },
          resumed ? 'Reprendre' : 'Commencer'),
      )),
    );
  }

  function paintTest(focusSelected = false) {
    const t = tests[i];
    fig?.destroy();
    const host = h('div');
    fig = mountFigure(host, t, { label: t.title });
    const a = answers[t.id] ?? {};
    const key = t.sides ? side : 'v';
    const current = a[key];
    const answered = isAnswered(t, a);
    const last = i === tests.length - 1;

    const levels = h('div', { class: 'levels', role: 'radiogroup', 'aria-labelledby': 'lv-t' },
      h('h2', { id: 'lv-t', class: 'section-title', style: 'margin-bottom:2px' }, t.sides ? `Où t'arrêtes-tu, côté ${side === 'l' ? 'gauche' : 'droit'} ?` : 'Où t\'arrêtes-tu ?'),
      t.levels.map((text, v) =>
        h('button', {
          type: 'button', class: 'level', role: 'radio', 'aria-checked': String(current === v),
          onClick: () => {
            answers[t.id] = { ...answers[t.id], [key]: v };
            // Test à gauche et à droite : on enchaîne sur l'autre côté s'il reste à noter.
            if (t.sides && !Number.isInteger(answers[t.id][side === 'l' ? 'r' : 'l'])) side = side === 'l' ? 'r' : 'l';
            persist();
            paintTest(true);
          },
        }, h('span', { class: 'dot' }, String(v)), h('span', { style: 'flex:1' }, text))),
    );

    const sides = t.sides
      ? h('div', { class: 'segmented', role: 'group', 'aria-label': 'Côté testé' },
          [['l', 'Côté gauche'], ['r', 'Côté droit']].map(([id, label]) =>
            h('button', {
              type: 'button', 'aria-pressed': String(side === id), 'data-done': String(Number.isInteger(a[id])),
              onClick: () => { side = id; paintTest(); },
            }, label)))
      : null;

    root.replaceChildren(...[
      h('div', { class: 'flow-head' },
        h('a', { class: 'round-link', href: closeHref, 'aria-label': 'Quitter le bilan (ta progression est gardée)' }, icon('close')),
        h('div', { class: 'flow-progress' },
          h('div', { class: 'meta-line' }, h('b', null, title), h('span', null, `Test ${i + 1} sur ${tests.length}`)),
          h('div', { class: 'segs', 'aria-hidden': 'true', style: `grid-template-columns: repeat(${tests.length}, minmax(0, 1fr))` },
            tests.map((_, n) => h('span', { class: n < i ? 'done' : n === i ? 'cur' : null }))),
        ),
      ),
      h('figure', { class: 'frame' }, host, h('figcaption', null, t.frame.caption)),
      h('div', { class: 'section', style: 'gap:8px' },
        h('h1', { class: 'page-title', style: 'font-size:30px' }, t.title),
        h('div', { class: 'badges' }, t.zones.map(([id]) => h('span', { class: 'badge accent' }, `${id} · ${ZONES.find((z) => z.id === id).name}`))),
        h('p', { style: 'color:var(--text-2)' }, t.intro),
      ),
      sides,
      levels,
      i > 0 ? h('button', { type: 'button', class: 'btn ghost-link', style: 'align-self:flex-start', onClick: () => { i -= 1; side = 'l'; persist(); paintTest(); } }, 'Test précédent') : null,
      h('div', { class: 'bottom-bar' }, h('div', null,
        h('button', {
          type: 'button', class: 'btn',
          onClick: () => { delete answers[t.id]; next(); },
        }, 'Passer'),
        h('button', { type: 'button', class: 'btn dark grow', disabled: !answered, onClick: next },
          last ? 'Voir mon profil' : 'Test suivant', icon('arrowRight', 18)),
      )),
    ].filter(Boolean)); // replaceChildren natif écrirait « null » pour les valeurs vides
    if (focusSelected) root.querySelector('.level[aria-checked="true"]')?.focus();
    else window.scrollTo(0, 0);
  }

  async function next() {
    if (i < tests.length - 1) {
      i += 1;
      side = 'l';
      persist();
      paintTest();
      return;
    }
    const done = {};
    for (const t of tests) if (isAnswered(t, answers[t.id])) done[t.id] = answers[t.id];
    await clearDraft();
    if (!Object.keys(done).length) {
      toast('Aucun test noté : rien n\'a été enregistré.');
      location.hash = closeHref;
      return;
    }
    await addAssessment({ type: mode, answers: done });
    location.hash = '#/profil';
  }

  if (i === -1) paintIntro();
  else paintTest();
}
