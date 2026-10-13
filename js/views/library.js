import { h, chipGroup, icon, toast } from '../ui.js';
import { ZONES, REGIONS } from '../data/zones.js';
import { MOBS, SYSTEMS, METHODS, zoneMobs, getMob } from '../data/mobs.js';
import { EQUIPMENT } from '../data/profile.js';
import { renderFrame } from '../diagram.js';
import { loadSettings } from '../settings.js';
import { buildRoutine, defaultSeconds } from '../routine.js';
import * as store from '../store.js';

// Recherche sans accents ni casse : « epaule » trouve « Épaule ».
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
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

const backLink = (href, label) =>
  h('a', { class: 'back-link', href }, icon('chevronLeft', 18), label);

// --- Index : recherche, filtre par région, zones et fiches -------------------------------
function renderIndex(root) {
  let region = 'all';
  let query = '';
  const listBox = h('div', { class: 'section', style: 'gap:20px' });

  function zoneRow(z) {
    const n = zoneMobs(z.id).length;
    const inner = [
      h('span', { class: 'zone-num', 'aria-hidden': 'true' }, z.id),
      h('span', { class: 'zone-text' },
        h('span', { class: 'zone-name' }, z.name),
        h('span', { class: 'zone-covers' }, z.covers),
      ),
      n ? h('span', { class: 'badge accent' }, `${n} fiche${n > 1 ? 's' : ''}`) : h('span', { class: 'badge' }, 'Bientôt'),
      n ? icon('chevronRight', 18) : null,
    ];
    return h('li', null, n
      ? h('a', { class: 'zone-row', href: `#/library/${z.id}` }, inner)
      : h('div', { class: 'zone-row' }, inner));
  }

  function mobRow(m) {
    return h('li', null,
      h('a', { class: 'zone-row', href: `#/library/${m.zone}/${m.id}` },
        h('span', { class: 'zone-num', 'aria-hidden': 'true' }, m.zone),
        h('span', { class: 'zone-text' },
          h('span', { class: 'zone-name' }, m.name),
          h('span', { class: 'zone-covers' }, duration(m)),
        ),
        icon('chevronRight', 18),
      ));
  }

  function paintList() {
    listBox.replaceChildren();
    const q = norm(query.trim());
    let count = 0;

    if (q) {
      const mobs = MOBS.filter((m) => (region === 'all' || ZONES.find((z) => z.id === m.zone)?.region === region)
        && norm(`${m.name} ${m.summary} ${m.improves.join(' ')}`).includes(q))
        // Les fiches dont le nom correspond passent d'abord ; le tri est stable pour le reste.
        .sort((a, b) => Number(norm(b.name).includes(q)) - Number(norm(a.name).includes(q)));
      if (mobs.length) {
        count += mobs.length;
        listBox.append(
          h('section', { class: 'section', style: 'gap:10px' },
            h('h2', { class: 'section-label' }, 'Fiches'),
            h('ul', { class: 'list' }, mobs.map(mobRow)),
          ),
        );
      }
    }

    for (const r of REGIONS) {
      if (region !== 'all' && region !== r.id) continue;
      const zones = ZONES.filter((z) => z.region === r.id && (!q || norm(`${z.name} ${z.covers}`).includes(q)));
      if (!zones.length) continue;
      count += zones.length;
      listBox.append(
        h('section', { class: 'section', style: 'gap:10px' },
          h('h2', { class: 'section-label' }, r.label),
          h('ul', { class: 'list' }, zones.map(zoneRow)),
        ),
      );
    }
    if (!count) listBox.append(h('p', { class: 'empty' }, 'Rien ne correspond à ta recherche.'));
  }

  const input = h('input', { type: 'search', id: 'zone-search', placeholder: 'Zone, muscle, fiche…', autocomplete: 'off' });
  input.addEventListener('input', () => { query = input.value; paintList(); });

  const zonesWithMobs = new Set(MOBS.map((m) => m.zone)).size;
  root.append(
    h('header', { class: 'page-head' },
      h('h1', { class: 'page-title' }, 'Fiches'),
      h('p', { class: 'lead' }, 'Les 13 zones du livre. Chaque fiche a son schéma, sa technique et son test avant/après.'),
    ),
    h('div', { class: 'section', style: 'gap:14px' },
      h('label', { class: 'search', for: 'zone-search' },
        icon('search'),
        h('span', { class: 'visually-hidden' }, 'Rechercher une zone ou une fiche'),
        input,
      ),
      chipGroup({
        options: [{ id: 'all', label: 'Toutes' }, ...REGIONS],
        selected: ['all'],
        multi: false,
        label: 'Filtrer par région',
        className: 'chips solid scroll',
        render: (o) => o.label,
        onChange: (v) => { region = v[0]; paintList(); },
      }),
    ),
    h('p', { class: 'callout info' }, icon('clock', 22),
      h('span', null, h('strong', null, `${MOBS.length} fiches publiées`),
        zonesWithMobs === ZONES.length
          ? ` : au moins une pour chacune des ${ZONES.length} zones. D'autres s'ajouteront.`
          : ` dans ${zonesWithMobs} zones sur ${ZONES.length}. Les autres arrivent zone par zone.`)),
    listBox,
  );

  paintList();
}

// --- Une zone -----------------------------------------------------------------------------
function renderZone(root, zone) {
  root.append(
    h('header', { class: 'page-head' },
      backLink('#/library', 'Toutes les zones'),
      h('span', { class: 'eyebrow' }, `Zone ${zone.id}`),
      h('h1', { class: 'page-title' }, zone.name),
      h('p', { class: 'lead' }, zone.covers),
    ),
    h('ul', { class: 'list' }, zoneMobs(zone.id).map((m) =>
      h('li', null,
        h('a', { class: 'mob-row', href: `#/library/${zone.id}/${m.id}` },
          h('span', { class: 'zone-text' },
            h('span', { class: 'zone-name' }, m.name),
            h('span', { class: 'zone-covers' }, m.summary),
            h('span', { class: 'badges' },
              h('span', { class: 'badge accent' }, duration(m)),
              m.systems.map((s) => h('span', { class: 'badge' }, SYSTEMS[s])),
            ),
          ),
          icon('chevronRight', 18),
        ),
      ),
    )),
  );
}

// --- Une fiche ----------------------------------------------------------------------------
async function renderMob(root, m) {
  const s = await loadSettings();
  const zone = ZONES.find((z) => z.id === m.zone);

  // « Ajouter à ma séance » : la séance devient personnalisée, comme une modification manuelle.
  const addBtn = h('button', { type: 'button', class: 'btn primary' }, icon('plus', 18), 'Ajouter à ma séance');
  async function refreshAdd() {
    const saved = await store.get('routine', null);
    const items = saved?.items ?? buildRoutine(s).items;
    const inside = items.some((it) => it.id === m.id);
    addBtn.disabled = inside;
    addBtn.replaceChildren(icon(inside ? 'check' : 'plus', 18), inside ? 'Dans ta séance' : 'Ajouter à ma séance');
  }
  addBtn.addEventListener('click', async () => {
    const saved = await store.get('routine', null);
    const items = (saved?.items ?? buildRoutine(s).items).map((it) => ({ ...it }));
    if (!items.some((it) => it.id === m.id)) items.push({ id: m.id, seconds: defaultSeconds(m) });
    await store.set('routine', { auto: false, items });
    toast('Ajoutée à ta séance.');
    refreshAdd();
  });

  root.append(
    h('header', { class: 'page-head' },
      backLink(`#/library/${m.zone}`, zone.name),
      h('span', { class: 'eyebrow' }, `Zone ${zone.id} · ${duration(m)}`),
      h('h1', { class: 'page-title sm' }, m.name),
      h('p', { class: 'lead' }, m.summary),
      h('div', { class: 'badges' },
        m.systems.map((x) => h('span', { class: 'badge accent' }, SYSTEMS[x])),
        m.methods.map((x) => h('span', { class: 'badge' }, METHODS[x])),
        m.when === 'after' && h('span', { class: 'badge' }, 'Plutôt après l\'effort'),
      ),
    ),

    h('div', { class: 'frames' }, m.frames.map((f, i) => renderFrame(f, i, m.frames.length))),

    m.caution && h('p', { class: 'callout warn' }, icon('warn'), h('span', null, m.caution)),

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Matériel'),
      m.tools.length
        ? h('ul', { class: 'list' }, m.tools.map((t) => {
            const have = s.equipment.includes(t);
            return h('li', { class: 'row' },
              h('span', { class: `row-icon ${have ? 'ok' : 'warn'}` }, icon(have ? 'check' : 'warn')),
              h('span', { class: 'row-text' },
                h('span', { class: 'row-title' }, equipLabel(t)),
                h('span', { class: 'row-sub' }, have ? 'Dans ta liste' : 'Pas dans ta liste : improvise ou ajoute-le dans Aujourd\'hui'),
              ),
            );
          }))
        : h('p', { class: 'card hint' }, 'Aucun matériel nécessaire.'),
      m.toolsNote && h('p', { class: 'hint' }, m.toolsNote),
    ),

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Comment faire'),
      h('ol', { class: 'card step-list' }, m.steps.map((t) => h('li', null, h('span', null, t)))),
    ),

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Erreurs fréquentes'),
      h('div', { class: 'card' }, h('ul', { class: 'bullets' }, m.faults.map((t) => h('li', null, t)))),
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

    h('div', { class: 'cta-bar' }, addBtn),
  );
  refreshAdd();
}

export { MOBS };
