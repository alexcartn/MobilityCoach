import { h, icon, toast } from '../ui.js';
import { ZONES } from '../data/zones.js';
import { MOBS, SYSTEMS, METHODS, zoneMobs, getMob } from '../data/mobs.js';
import { EQUIPMENT } from '../data/profile.js';
import { renderFrame } from '../diagram.js';
import { mountFigure, hasMotion } from '../motion.js';
import { renderBody, viewOf, zonesInView } from '../body.js';
import { loadSettings } from '../settings.js';
import { buildRoutine, defaultSeconds, itemSeconds, totalSeconds, zoneRoutine } from '../routine.js';
import * as store from '../store.js';
import { loadAssessments, priorities, weakSides } from '../assessment.js';

// Recherche sans accents ni casse : « epaule » trouve « Épaule ».
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const equipLabel = (id) => EQUIPMENT.find((e) => e.id === id)?.label ?? id;
const minutesOf = (seconds) => Math.max(1, Math.round(seconds / 60));

export function duration(m) {
  const min = m.seconds >= 60 ? `${Math.round(m.seconds / 60)} min` : `${m.seconds} s`;
  return m.perSide ? `${min} par côté` : min;
}

// Schémas animés de la fiche ouverte : arrêtés quand on quitte la page (app.js appelle cleanup).
let figs = [];
export function cleanup() { figs.forEach((f) => f.destroy()); figs = []; }

// Première image d'une fiche qui a un mouvement : le schéma, sa légende et un bouton pour le voir bouger.
// La boucle ne démarre que sur demande : l'écran reste calme.
function motionFrame(m, total) {
  const host = h('div');
  const fig = mountFigure(host, m);
  figs.push(fig);
  const btn = h('button', { type: 'button', class: 'btn small motion-btn' });
  const paint = () => {
    const on = fig.isPlaying();
    btn.setAttribute('aria-pressed', String(on));
    btn.replaceChildren(icon(on ? 'pause' : 'play', 18), on ? 'Pause' : 'Voir le mouvement');
  };
  btn.addEventListener('click', () => { fig.setPlaying(!fig.isPlaying(), { force: true }); paint(); });
  paint();
  const caption = m.frames[0].caption;
  return h('figure', { class: 'frame' }, host, h('figcaption', null, total > 1 ? `1. ${caption}` : caption), h('div', { class: 'motion-bar' }, btn));
}

// #/library : le corps. #/library/7 : le corps avec la zone 7 choisie. #/library/7/couch : une fiche.
export async function render(root, params = []) {
  const [zoneId, mobId] = params;
  const mob = mobId && getMob(mobId);
  if (mob) return renderMob(root, mob);
  return renderIndex(root, Number(zoneId) || null);
}

const backLink = (href, label) =>
  h('a', { class: 'back-link', href }, icon('chevronLeft', 18), label);

// Les fiches utilisables avec ton matériel d'abord, puis celles qui correspondent à tes contextes.
const contextScore = (m, contexts) => contexts.reduce((n, c) => Math.max(n, m.relevance[c] ?? 0), 0);
function rankMobs(zoneId, settings) {
  const have = new Set(settings.equipment);
  const usable = (m) => Number(m.tools.every((t) => have.has(t)));
  return zoneMobs(zoneId).slice().sort((a, b) => usable(b) - usable(a) || contextScore(b, settings.contexts) - contextScore(a, settings.contexts));
}

// --- Index : la silhouette, la zone choisie et ses fiches --------------------------------------
async function renderIndex(root, initialZone) {
  const [settings, assessments] = await Promise.all([loadSettings(), loadAssessments()]);
  const last = assessments.at(-1);
  const scores = last?.scores ?? {};
  const hasScores = Object.values(scores).some((v) => v !== null && v !== undefined);
  const weak = last ? weakSides(last.merged) : {};

  // Sans zone dans l'adresse, on propose d'emblée la zone la moins mobile du dernier bilan.
  let selected = ZONES.some((z) => z.id === initialZone) ? initialZone : (hasScores ? priorities(scores, 1)[0]?.id ?? null : null);
  let view = selected ? viewOf(selected) : 'front';
  let query = '';

  const bodyBox = h('section', { class: 'body-card', 'aria-label': 'Silhouette du corps' });
  const panelBox = h('div', { 'aria-live': 'polite' });
  const browse = h('div', { class: 'section', style: 'gap:14px' }, bodyBox, panelBox);
  const results = h('div', { class: 'section', style: 'gap:20px' });

  function pick(id, refocus) {
    selected = id;
    if (!zonesInView(view).includes(id)) view = viewOf(id);
    history.replaceState(null, '', `#/library/${id}`); // pas de hashchange : on reste sur la même page
    paintBody();
    paintPanel();
    if (refocus) bodyBox.querySelector(refocus === 'list' ? '.zone-pick[aria-pressed="true"]' : '.bz[aria-pressed="true"]')?.focus();
    // On cale le haut de la silhouette en haut de l'écran : on voit la zone choisie et le début de ses actions.
    const top = bodyBox.getBoundingClientRect().top + scrollY - 12;
    if (Math.abs(top - scrollY) > 8) scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function paintBody() {
    const picks = zonesInView(view).map((id) => ZONES.find((z) => z.id === id));
    bodyBox.replaceChildren(...[
      h('div', { class: 'head' },
        h('div', { class: 'segmented small', role: 'group', 'aria-label': 'Face ou dos' },
          [['front', 'Face'], ['back', 'Dos']].map(([id, label]) =>
            h('button', { type: 'button', 'aria-pressed': String(view === id), onClick: () => { view = id; paintBody(); } }, label))),
      ),
      h('div', { class: 'body-grid' },
        renderBody(view, scores, { onZone: (id, keyboard) => pick(id, keyboard ? 'body' : null), selected, role: 'button', width: 140 }),
        h('ul', { class: 'zone-picks' }, picks.map((z) =>
          h('li', null,
            h('button', { type: 'button', class: 'zone-pick', 'aria-pressed': String(z.id === selected), onClick: (e) => pick(z.id, e.detail === 0 ? 'list' : null) },
              h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(z.id)),
              h('span', null, z.name))))),
      ),
      hasScores
        ? h('div', { class: 'legend' },
            h('span', null, h('i', { class: 'l0' }), '0 à 24'), h('span', null, h('i', { class: 'l1' }), '25 à 49'),
            h('span', null, h('i', { class: 'l2' }), '50 à 74'), h('span', null, h('i', { class: 'l3' }), '75 et plus'))
        : null,
      hasScores ? h('p', { class: 'hint' }, 'Couleurs : ton score au dernier bilan. Plus c\'est foncé, plus la zone est mobile.') : null,
    ].filter(Boolean)); // replaceChildren natif écrirait « null » pour les valeurs vides
  }

  function paintPanel() {
    panelBox.replaceChildren();
    const zone = ZONES.find((z) => z.id === selected);
    if (!zone) return;
    const mobs = rankMobs(zone.id, settings);
    const items = zoneRoutine(zone.id, settings.equipment);
    const w = weak[zone.id];
    const minutes = minutesOf(totalSeconds(items, w ? { [zone.id]: w } : {}));
    const score = scores[zone.id];
    const top = hasScores ? priorities(scores, 1)[0]?.id : null;
    const advised = mobs[0] && mobs[0].tools.every((t) => settings.equipment.includes(t)) && contextScore(mobs[0], settings.contexts) > 0 ? mobs[0].id : null;

    panelBox.append(
      h('section', { class: 'zone-panel', 'aria-labelledby': 'zp-t' },
        h('div', { class: 'zone-panel-head' },
          h('div', { class: 'section', style: 'gap:2px' },
            h('span', { class: 'eyebrow' }, zone.id === top ? `Zone ${zone.id} · ta priorité` : `Zone ${zone.id}`),
            h('h2', { id: 'zp-t', class: 'zone-panel-title' }, zone.name),
            h('p', { class: 'zone-covers' }, zone.covers),
          ),
          score !== null && score !== undefined
            ? h('a', { class: 'score-chip', href: `#/zone/${zone.id}`, 'aria-label': `Score ${score} sur 100, voir le suivi de la zone` }, h('b', null, String(score)), h('span', null, '/100'))
            : null,
        ),
        items.length
          ? h('a', { class: 'btn primary big', href: `#/session/${zone.id}/library` }, icon('play', 18), `Séance de ${minutes} min`)
          : null,
        h('a', { class: 'btn', href: `#/pain/${zone.id}` }, 'J\'ai mal ici'),
        w ? h('p', { class: 'hint' }, `Côté ${w === 'l' ? 'gauche' : 'droit'} plus raide d'après ton bilan : la séance lui donne 30 s de plus.`) : null,
        h('h3', { class: 'section-label' }, `${mobs.length} fiche${mobs.length > 1 ? 's' : ''}`),
        h('ul', { class: 'list' }, mobs.map((m) => {
          const missing = m.tools.filter((t) => !settings.equipment.includes(t));
          return h('li', { class: 'act-row' },
            h('a', { class: 'act-main', href: `#/library/${zone.id}/${m.id}` },
              h('span', { class: 'zone-name' }, m.name),
              h('span', { class: 'zone-covers' }, `${duration(m)} · ${m.tools.length ? m.tools.map(equipLabel).join(', ') : 'sans matériel'}`),
              (m.id === advised || missing.length)
                ? h('span', { class: 'badges' },
                    m.id === advised ? h('span', { class: 'badge accent' }, 'Conseillée pour toi') : null,
                    missing.length ? h('span', { class: 'badge' }, 'Matériel à trouver') : null)
                : null,
            ),
            h('a', { class: 'play-btn', href: `#/session/mob/${m.id}`, 'aria-label': `Faire maintenant : ${m.name}` }, icon('play', 18)),
          );
        })),
      ),
    );
  }

  // --- Recherche : remplace le corps par une liste de fiches et de zones ---
  function paintResults() {
    const q = norm(query.trim());
    browse.style.display = q ? 'none' : '';
    results.style.display = q ? '' : 'none';
    results.replaceChildren();
    if (!q) return;
    const mobs = MOBS.filter((m) => norm(`${m.name} ${m.summary} ${m.improves.join(' ')}`).includes(q))
      // Les fiches dont le nom correspond passent d'abord ; le tri est stable pour le reste.
      .sort((a, b) => Number(norm(b.name).includes(q)) - Number(norm(a.name).includes(q)));
    const zones = ZONES.filter((z) => norm(`${z.name} ${z.covers}`).includes(q));
    if (mobs.length) {
      results.append(h('section', { class: 'section', style: 'gap:10px' },
        h('h2', { class: 'section-label' }, 'Fiches'),
        h('ul', { class: 'list' }, mobs.map((m) =>
          h('li', null, h('a', { class: 'zone-row', href: `#/library/${m.zone}/${m.id}` },
            h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(m.zone)),
            h('span', { class: 'zone-text' }, h('span', { class: 'zone-name' }, m.name), h('span', { class: 'zone-covers' }, duration(m))),
            icon('chevronRight', 18)))))));
    }
    if (zones.length) {
      results.append(h('section', { class: 'section', style: 'gap:10px' },
        h('h2', { class: 'section-label' }, 'Zones'),
        h('ul', { class: 'list' }, zones.map((z) =>
          h('li', null, h('a', { class: 'zone-row', href: `#/library/${z.id}` },
            h('span', { class: 'zone-num', 'aria-hidden': 'true' }, String(z.id)),
            h('span', { class: 'zone-text' }, h('span', { class: 'zone-name' }, z.name), h('span', { class: 'zone-covers' }, z.covers)),
            icon('chevronRight', 18)))))));
    }
    if (!mobs.length && !zones.length) results.append(h('p', { class: 'empty' }, 'Rien ne correspond à ta recherche.'));
  }

  const input = h('input', { type: 'search', id: 'zone-search', placeholder: 'Zone, muscle, fiche…', autocomplete: 'off' });
  input.addEventListener('input', () => { query = input.value; paintResults(); });

  root.append(
    h('header', { class: 'page-head' },
      h('h1', { class: 'page-title' }, 'Corps'),
      h('p', { class: 'lead' }, 'Touche la zone qui te gêne, puis lance la séance.'),
    ),
    h('label', { class: 'search', for: 'zone-search' },
      icon('search'),
      h('span', { class: 'visually-hidden' }, 'Rechercher une zone ou une fiche'),
      input,
    ),
    browse,
    results,
  );
  paintBody();
  paintPanel();
  paintResults();
}

// --- Une fiche : où, combien de temps, avec quoi, puis le geste ---------------------------------
async function renderMob(root, m) {
  cleanup();
  root.classList.add('has-bar');
  const [s, assessments] = await Promise.all([loadSettings(), loadAssessments()]);
  const last = assessments.at(-1);
  const weak = last ? weakSides(last.merged) : {};
  const zone = ZONES.find((z) => z.id === m.zone);
  const minutes = minutesOf(itemSeconds({ id: m.id, seconds: defaultSeconds(m) }, weak));
  const others = zoneMobs(m.zone).filter((x) => x.id !== m.id);

  // « Ajouter à ma séance » : la séance devient personnalisée, comme une modification manuelle.
  const addBtn = h('button', { type: 'button', class: 'btn' });
  async function refreshAdd() {
    const saved = await store.get('routine', null);
    const items = saved?.items ?? buildRoutine(s, last?.scores ?? null).items;
    const inside = items.some((it) => it.id === m.id);
    addBtn.disabled = inside;
    addBtn.setAttribute('aria-label', inside ? 'Déjà dans ta séance' : 'Ajouter à ma séance');
    addBtn.replaceChildren(icon(inside ? 'check' : 'plus', 18), inside ? 'Ajoutée' : 'Ajouter');
  }
  addBtn.addEventListener('click', async () => {
    const saved = await store.get('routine', null);
    const items = (saved?.items ?? buildRoutine(s, last?.scores ?? null).items).map((it) => ({ ...it }));
    if (!items.some((it) => it.id === m.id)) items.push({ id: m.id, seconds: defaultSeconds(m) });
    await store.set('routine', { auto: false, items });
    toast('Ajoutée à ta séance.');
    refreshAdd();
  });

  const fact = (label, ...value) => h('div', { class: 'fact' }, h('span', { class: 'fact-label' }, label), h('span', { class: 'fact-value' }, value));

  root.append(...[
    h('header', { class: 'page-head' },
      backLink(`#/library/${m.zone}`, zone.name),
      h('span', { class: 'eyebrow' }, `Zone ${zone.id}`),
      h('h1', { class: 'page-title sm' }, m.name),
      h('p', { class: 'lead' }, m.summary),
    ),

    h('section', { class: 'fact-card', 'aria-label': 'En un coup d\'œil' },
      h('div', { class: 'mini-body' }, renderBody(viewOf(m.zone), {}, { selected: m.zone, mark: 'accent', width: 68, decorative: true })),
      h('div', { class: 'facts' },
        fact('Temps', `${duration(m)} · ${minutes} min avec la mise en place`),
        fact('Matériel', m.tools.length
          ? m.tools.map((t) => {
              const have = s.equipment.includes(t);
              return h('span', { class: `tool ${have ? 'ok' : 'warn'}` }, icon(have ? 'check' : 'warn', 14), equipLabel(t), have ? null : h('span', { class: 'visually-hidden' }, ' (pas dans ta liste)'));
            })
          : 'Aucun'),
        fact('Moment', m.when === 'after' ? 'Plutôt après l\'effort' : 'À tout moment'),
        fact('Agit sur', h('span', { class: 'badges' },
          m.systems.map((x) => h('span', { class: 'badge accent' }, SYSTEMS[x])),
          m.methods.map((x) => h('span', { class: 'badge' }, METHODS[x])))),
      ),
    ),
    m.toolsNote ? h('p', { class: 'hint' }, m.toolsNote) : null,

    h('div', { class: 'frames' }, m.frames.map((f, i) => (i === 0 && hasMotion(m) ? motionFrame(m, m.frames.length) : renderFrame(f, i, m.frames.length)))),

    m.caution ? h('p', { class: 'callout warn' }, icon('warn'), h('span', null, m.caution)) : null,

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Comment faire'),
      h('ol', { class: 'step-list' }, m.steps.map((t) => h('li', null, h('span', null, t)))),
    ),

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Erreurs fréquentes'),
      h('ul', { class: 'bullets' }, m.faults.map((t) => h('li', null, t))),
    ),

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Teste avant, reteste après'),
      h('div', { class: 'card accent' },
        h('p', { class: 'small' }, 'Fais un test, mobilise, puis refais le même test. Sans amélioration visible, ce n\'était pas la bonne zone.'),
        h('ul', { class: 'bullets' }, m.retest.map((t) => h('li', null, t))),
      ),
    ),

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Ça améliore'),
      h('div', { class: 'badges' }, m.improves.map((t) => h('span', { class: 'badge' }, t))),
    ),

    others.length ? h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, `Autres fiches : ${zone.name}`),
      h('ul', { class: 'list' }, others.map((x) =>
        h('li', { class: 'act-row' },
          h('a', { class: 'act-main', href: `#/library/${m.zone}/${x.id}` },
            h('span', { class: 'zone-name' }, x.name),
            h('span', { class: 'zone-covers' }, duration(x))),
          h('a', { class: 'play-btn', href: `#/session/mob/${x.id}`, 'aria-label': `Faire maintenant : ${x.name}` }, icon('play', 18))))),
    ) : null,

    h('div', { class: 'bottom-bar' }, h('div', null,
      addBtn,
      h('a', { class: 'btn primary grow', href: `#/session/mob/${m.id}` }, icon('play', 18), `Lancer · ${minutes} min`),
    )),
  ].filter(Boolean)); // append natif écrirait « null » pour les valeurs vides
  refreshAdd();
}

export { MOBS };
