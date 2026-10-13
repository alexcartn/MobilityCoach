import { h, chipGroup } from '../ui.js';
import { CONTEXTS, SPORTS, EQUIPMENT, DURATIONS } from '../data/profile.js';
import { loadSettings, saveSettings } from '../settings.js';
import { MOBS, getMob } from '../data/mobs.js';
import { buildRoutine, totalSeconds, zonesOf, defaultSeconds, fmtSeconds, MIN_SECONDS, MAX_ZONES, DEFAULT_SECONDS } from '../routine.js';
import * as store from '../store.js';

const validRoutine = (r) => r && Array.isArray(r.items) && r.items.every((it) => getMob(it.id) && it.seconds >= MIN_SECONDS);

export async function render(root) {
  let s = await loadSettings();
  let routine = await store.get('routine', null);
  if (!validRoutine(routine) || routine.auto) routine = { auto: true, items: buildRoutine(s).items };

  const persist = () => store.set('routine', { auto: routine.auto, items: routine.items });
  await persist(); // la séance auto doit exister en base pour que l'écran de séance la retrouve

  const sportsBox = h('div');
  const adviceBox = h('div');
  const routineBox = h('div');
  const summaryText = h('span', { class: 'muted small' });
  const settingsBox = h('details', { class: 'card', open: s.contexts.length === 0 });

  function paintSummary() {
    const names = CONTEXTS.filter((c) => s.contexts.includes(c.id)).map((c) => c.label);
    summaryText.textContent = `${names.length ? names.join(', ') : 'Aucun contexte'} · ${s.duration} min`;
  }

  // Un réglage change : on met à jour la séance automatique, pas une séance retouchée à la main.
  function save(patch) {
    s = { ...s, ...patch };
    saveSettings(s);
    if (routine.auto) {
      routine = { auto: true, items: buildRoutine(s).items };
      persist();
    }
    paintAll();
  }

  function edit(fn) {
    routine = { auto: false, items: routine.items.map((it) => ({ ...it })) };
    fn(routine.items);
    persist();
    paintRoutine();
  }

  const iconBtn = (symbol, label, onClick, disabled = false) =>
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, disabled, onClick }, symbol);

  function paintRoutine() {
    routineBox.replaceChildren();
    const items = routine.items;
    const total = totalSeconds(items);
    const budget = s.duration * 60;
    const zones = zonesOf(items).size;
    const short = items.some((it) => it.seconds < DEFAULT_SECONDS && getMob(it.id).seconds >= DEFAULT_SECONDS);
    const notInRoutine = MOBS.filter((m) => !items.some((it) => it.id === m.id));

    const select = h('select', { class: 'select', 'aria-label': 'Ajouter une fiche' },
      h('option', { value: '' }, 'Ajouter une fiche…'),
      notInRoutine.map((m) => {
        const missing = m.tools.filter((t) => !s.equipment.includes(t));
        return h('option', { value: m.id }, missing.length ? `${m.name} (matériel manquant)` : m.name);
      }),
    );

    routineBox.append(
      h('div', { class: 'card' },
        h('div', { class: 'row-between' },
          h('h3', { style: 'margin:0' }, 'Ma séance'),
          h('span', { class: 'muted' }, items.length ? `≈ ${Math.max(1, Math.round(total / 60))} min` : ''),
        ),
        !routine.auto
          ? h('p', { class: 'muted small', style: 'margin:6px 0 0' }, 'Séance personnalisée : tes réglages ne la modifient plus.')
          : s.contexts.length === 0
            ? h('p', { class: 'muted small', style: 'margin:6px 0 0' }, 'Séance de base. Choisis un contexte pour l\'adapter.')
            : null,

        items.length
          ? h('ol', { class: 'routine' }, items.map((it, idx) => {
              const m = getMob(it.id);
              return h('li', null,
                h('div', { class: 'rt-main' },
                  h('a', { class: 'rt-name', href: `#/library/${m.zone}/${m.id}` }, m.name),
                  h('span', { class: 'muted small' }, `${fmtSeconds(it.seconds)}${m.perSide ? ' par côté' : ''}`),
                ),
                h('div', { class: 'rt-ctrl' },
                  iconBtn('↑', 'Monter', () => edit((l) => { [l[idx - 1], l[idx]] = [l[idx], l[idx - 1]]; }), idx === 0),
                  iconBtn('↓', 'Descendre', () => edit((l) => { [l[idx + 1], l[idx]] = [l[idx], l[idx + 1]]; }), idx === items.length - 1),
                  iconBtn('−', 'Moins de temps', () => edit((l) => { l[idx].seconds = Math.max(MIN_SECONDS, l[idx].seconds - 30); }), it.seconds <= MIN_SECONDS),
                  iconBtn('+', 'Plus de temps', () => edit((l) => { l[idx].seconds += 30; })),
                  iconBtn('✕', 'Retirer', () => edit((l) => { l.splice(idx, 1); })),
                ),
              );
            }))
          : h('p', { class: 'muted', style: 'margin:12px 0 0' }, 'Séance vide. Ajoute une fiche ou ajuste tes réglages.'),

        total > budget + 60 && h('p', { class: 'small warn-text' }, `Plus long que ton temps disponible (${s.duration} min).`),
        zones > MAX_ZONES && h('p', { class: 'small muted' }, `Le livre conseille ${MAX_ZONES} zones au maximum par séance.`),
        short && h('p', { class: 'small muted' }, 'Moins de 2 minutes par position : le livre recommande au moins 2 minutes.'),

        h('div', { class: 'row-add' },
          select,
          h('button', {
            type: 'button', class: 'btn',
            onClick: () => {
              const m = getMob(select.value);
              if (m) edit((l) => l.push({ id: m.id, seconds: defaultSeconds(m) }));
            },
          }, 'Ajouter'),
        ),

        h('div', { class: 'btn-row', style: 'margin-top:14px' },
          h('a', { class: `btn primary big${items.length ? '' : ' disabled'}`, href: items.length ? '#/session' : null, role: 'button', 'aria-disabled': items.length ? null : 'true', style: 'flex:1;text-align:center;text-decoration:none;display:inline-flex;align-items:center;justify-content:center' }, 'Démarrer la séance'),
          !routine.auto && h('button', {
            type: 'button', class: 'btn',
            onClick: () => { routine = { auto: true, items: buildRoutine(s).items }; persist(); paintRoutine(); },
          }, 'Régénérer'),
        ),
      ),
    );
  }

  function paintDynamic() {
    sportsBox.replaceChildren();
    if (s.contexts.includes('sport')) {
      sportsBox.append(
        h('p', { class: 'section-title' }, 'Ton sport'),
        chipGroup({ options: SPORTS, selected: s.sports, label: 'Sport pratiqué', onChange: (v) => save({ sports: v }) }),
      );
    }

    adviceBox.replaceChildren();
    const active = CONTEXTS.filter((c) => s.contexts.includes(c.id));
    for (const c of active) {
      adviceBox.append(
        h('div', { class: 'card' },
          h('h3', null, c.label),
          c.warning && h('p', { class: 'card warn small', style: 'margin:0 0 10px' }, c.warning),
          h('ul', { class: 'plain' }, c.tips.map((t) => h('li', null, t))),
        ),
      );
    }
  }

  function paintAll() {
    paintSummary();
    paintDynamic();
    paintRoutine();
  }

  settingsBox.append(
    h('summary', null, h('span', null, 'Régler ma séance'), summaryText),
    h('div', { class: 'body' },
      h('p', { class: 'section-title', style: 'margin-top:0' }, 'Mon contexte'),
      chipGroup({
        options: CONTEXTS.map((c) => ({ id: c.id, label: c.label })),
        selected: s.contexts,
        label: 'Contextes actifs',
        onChange: (v) => save({ contexts: v }),
      }),
      sportsBox,

      h('p', { class: 'section-title' }, 'Temps disponible'),
      chipGroup({
        options: DURATIONS, selected: [s.duration], multi: false, label: 'Durée de la séance',
        onChange: (v) => save({ duration: v[0] }),
      }),
      h('p', { class: 'muted small', style: 'margin-top:8px' },
        'Le livre vise 15 à 20 minutes par jour, qu\'on peut répartir en petites doses.'),

      h('p', { class: 'section-title' }, 'Matériel à disposition'),
      chipGroup({
        options: EQUIPMENT, selected: s.equipment, label: 'Matériel',
        onChange: (v) => save({ equipment: v }),
      }),
    ),
  );

  root.append(
    h('h2', null, 'Aujourd\'hui'),
    h('p', { class: 'lead' }, 'Ta séance se règle sur ton contexte, ton temps et ton matériel. Tu peux la retoucher.'),
    settingsBox,
    h('div', { style: 'margin-top:12px' }, routineBox),
    h('p', { class: 'section-title' }, 'Conseils du moment'),
    adviceBox,
  );

  paintAll();
}
