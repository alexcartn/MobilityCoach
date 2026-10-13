import { h, chipGroup } from '../ui.js';
import { CONTEXTS, SPORTS, EQUIPMENT, DURATIONS } from '../data/profile.js';
import { loadSettings, saveSettings } from '../settings.js';
import { MOBS } from '../data/mobs.js';
import { duration } from './library.js';

export async function render(root) {
  let s = await loadSettings();
  const save = (patch) => { s = { ...s, ...patch }; saveSettings(s); paintDynamic(); };

  const sportsBox = h('div');
  const adviceBox = h('div');
  const mobsBox = h('div');

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
    if (!active.length) {
      adviceBox.append(h('p', { class: 'muted' }, 'Choisis au moins un contexte pour afficher des conseils adaptés.'));
    }

    // Fiches utiles pour les contextes actifs, avec le matériel déclaré.
    mobsBox.replaceChildren();
    const matching = MOBS.filter((m) => m.contexts.some((c) => s.contexts.includes(c)));
    const usable = matching.filter((m) => m.tools.every((t) => s.equipment.includes(t)));
    if (active.length) {
      mobsBox.append(
        h('p', { class: 'section-title' }, 'Fiches à essayer'),
        usable.length
          ? h('div', { class: 'stack' }, usable.map((m) =>
              h('a', { class: 'card link', href: `#/library/${m.zone}/${m.id}` },
                h('h3', null, m.name),
                h('p', { class: 'muted small', style: 'margin:0' }, duration(m)),
              )))
          : h('p', { class: 'muted' }, 'Aucune fiche pour ce matériel : coche ce que tu as à disposition.'),
        matching.length > usable.length
          ? h('p', { class: 'muted small', style: 'margin-top:8px' }, `${matching.length - usable.length} autre(s) fiche(s) demandent du matériel que tu n'as pas coché.`)
          : null,
      );
    }
  }

  root.append(
    h('h2', null, 'Aujourd\'hui'),
    h('p', { class: 'lead' }, 'Dis-moi ce qui compte aujourd\'hui, la routine s\'adaptera.'),

    h('p', { class: 'section-title' }, 'Mon contexte'),
    chipGroup({
      options: CONTEXTS.map((c) => ({ id: c.id, label: c.label })),
      selected: s.contexts,
      label: 'Contextes actifs',
      onChange: (v) => save({ contexts: v }),
    }),
    sportsBox,

    h('p', { class: 'section-title' }, 'Temps disponible'),
    chipGroup({
      options: DURATIONS,
      selected: [s.duration],
      multi: false,
      label: 'Durée de la séance',
      onChange: (v) => save({ duration: v[0] }),
    }),
    h('p', { class: 'muted small', style: 'margin-top:8px' },
      'Le livre vise 15 à 20 minutes par jour, qu\'on peut répartir en petites doses.'),

    h('p', { class: 'section-title' }, 'Matériel à disposition'),
    chipGroup({
      options: EQUIPMENT,
      selected: s.equipment,
      label: 'Matériel',
      onChange: (v) => save({ equipment: v }),
    }),

    h('p', { class: 'section-title' }, 'Conseils du moment'),
    adviceBox,
    mobsBox,

    h('div', { class: 'card accent', style: 'margin-top:20px' },
      h('h3', null, 'Ma séance du jour'),
      h('p', { class: 'small', style: 'margin:0' },
        'La génération de routine arrive à la prochaine étape. Elle combinera tes contextes, ton temps et ton matériel : 3 zones maximum, au moins 2 minutes par position.'),
    ),
  );

  paintDynamic();
}
