import { h, chipGroup, icon } from '../ui.js';
import { CONTEXTS, SPORTS, EQUIPMENT, DURATIONS } from '../data/profile.js';
import { loadSettings, saveSettings } from '../settings.js';
import { MOBS, getMob } from '../data/mobs.js';
import { buildRoutine, totalSeconds, zonesOf, defaultSeconds, fmtSeconds, minSecondsFor, MIN_SECONDS, MAX_ZONES, DEFAULT_SECONDS, WEAK_SIDE_BONUS } from '../routine.js';
import { TESTS } from '../data/tests.js';
import { PROTOCOLS, resolveProtocol } from '../data/protocols.js';
import { RULES } from '../data/rules.js';
import { equipIcon } from '../equip.js';
import * as store from '../store.js';
import { loadAssessments, loadPlan, weakSides, daysUntil, fromDateKey, pickTargetTests, totalMinutes } from '../assessment.js';

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

const CONTEXT_ICONS = { sport: 'sport', back: 'back', sitting: 'sitting', travel: 'travel' };

const dateLabel = () => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const validRoutine = (r) => r && Array.isArray(r.items) && r.items.every((it) => getMob(it.id) && it.seconds >= MIN_SECONDS);

export async function render(root) {
  let s = await loadSettings();
  const [assessments, plan] = await Promise.all([loadAssessments(), loadPlan()]);
  const lastAssessment = assessments.at(-1);
  const scores = lastAssessment?.scores ?? null;
  const weak = lastAssessment ? weakSides(lastAssessment.merged) : {};
  let routine = await store.get('routine', null);
  if (!validRoutine(routine) || routine.auto) routine = { auto: true, items: buildRoutine(s, scores).items };
  const persist = () => store.set('routine', { auto: routine.auto, items: routine.items });
  await persist(); // la séance auto doit exister en base pour que l'écran de séance la retrouve

  let tipIndex = 0;
  let editing = false;

  const eqCount = h('span', { class: 'hint' }, `${s.equipment.length} sur ${EQUIPMENT.length}`);
  const heroTitle = h('h2', { id: 'seance-t' });
  const ringValue = h('b');
  const heroTags = h('div', { class: 'hero-tags' });
  const heroList = h('ol', { class: 'hero-list' });
  const heroNote = h('p', { class: 'hero-note' });
  const heroRota = h('p', { class: 'hero-rota' }, 'Une partie de la séance change chaque jour pour varier les positions.');
  const startBtn = h('a', { class: 'btn primary big', role: 'button' }, 'Démarrer la séance');
  const editBtn = h('button', { type: 'button', class: 'btn light', 'aria-expanded': 'false', 'aria-controls': 'edit-panel' }, 'Modifier');
  const editPanel = h('section', { class: 'card edit-panel', id: 'edit-panel', hidden: true, 'aria-label': 'Modifier ma séance' });
  const sportsBox = h('div');
  const protoBox = h('section', { class: 'section', 'aria-labelledby': 'proto-t' });
  const warnBox = h('div');
  const tipBox = h('div');

  // Un réglage change : on met à jour la séance automatique, jamais une séance retouchée à la main.
  function save(patch) {
    s = { ...s, ...patch };
    saveSettings(s);
    if (routine.auto) {
      routine = { auto: true, items: buildRoutine(s, scores).items };
      persist();
    }
    paintDynamic();
  }

  function edit(fn) {
    routine = { auto: false, items: routine.items.map((it) => ({ ...it })) };
    fn(routine.items);
    persist();
    paintHero();
    paintEdit();
  }

  const timeLabel = (it) => `${fmtSeconds(it.seconds)}${getMob(it.id).perSide ? ' par côté' : ''}`;

  function paintHero() {
    const items = routine.items;
    const total = totalSeconds(items, weak);
    heroTitle.textContent = !routine.auto ? 'Ta séance personnalisée' : s.contexts.length || scores ? 'Ta routine sur mesure' : 'Séance de base';
    ringValue.textContent = items.length ? String(Math.max(1, Math.round(total / 60))) : '0';

    heroTags.replaceChildren();
    const active = CONTEXTS.filter((c) => s.contexts.includes(c.id));
    if (!active.length && !scores) heroTags.append(h('span', { class: 'hero-tag placeholder' }, 'Choisis ton contexte ci-dessous'));
    for (const c of active) heroTags.append(h('span', { class: 'hero-tag' }, c.label));
    if (scores) heroTags.append(h('span', { class: 'hero-tag' }, 'Basée sur ton bilan'));
    const n = s.equipment.length;
    heroTags.append(h('span', { class: 'hero-tag' }, n ? `${n} matériel${n > 1 ? 's' : ''}` : 'Sans matériel'));

    heroList.replaceChildren(...items.map((it, idx) => {
      const m = getMob(it.id);
      return h('li', null,
        h('span', { class: 'n', 'aria-hidden': 'true' }, String(idx + 1)),
        h('a', { href: `#/library/${m.zone}/${m.id}` }, m.name),
        h('span', { class: 't' }, timeLabel(it)),
      );
    }));

    const budget = s.duration * 60;
    const notes = [];
    if (!items.length) notes.push('Séance vide : ajoute une fiche ou ajuste tes réglages.');
    if (total > budget + 60) notes.push(`Plus long que ton temps disponible (${s.duration} min).`);
    if (zonesOf(items).size > MAX_ZONES) notes.push(`Au-delà de ${MAX_ZONES} zones par séance, on s'éparpille : garde-en ${MAX_ZONES} au maximum.`);
    if (items.some((it) => it.seconds < DEFAULT_SECONDS && getMob(it.id).seconds >= DEFAULT_SECONDS)) {
      notes.push('Moins de 2 minutes par position : c\'est sous la dose utile, il en faut au moins 2.');
    }
    heroNote.textContent = notes.join(' ');
    heroNote.hidden = notes.length === 0;
    heroRota.hidden = !routine.auto || items.length === 0;

    if (items.length) {
      startBtn.setAttribute('href', '#/session');
      startBtn.removeAttribute('aria-disabled');
      startBtn.classList.remove('disabled');
    } else {
      startBtn.removeAttribute('href');
      startBtn.setAttribute('aria-disabled', 'true');
      startBtn.classList.add('disabled');
    }
  }

  const iconBtn = (name, label, onClick, disabled = false) =>
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, disabled, onClick }, icon(name, 18));

  function paintEdit() {
    const items = routine.items;
    const notIn = MOBS.filter((m) => !items.some((it) => it.id === m.id));
    const select = h('select', { class: 'select', 'aria-label': 'Ajouter une fiche' },
      h('option', { value: '' }, 'Ajouter une fiche…'),
      notIn.map((m) => {
        const missing = m.tools.filter((t) => !s.equipment.includes(t));
        return h('option', { value: m.id }, missing.length ? `${m.name} (matériel manquant)` : m.name);
      }),
    );

    editPanel.replaceChildren(...[
      h('div', { class: 'section-head' },
        h('h3', { class: 'section-title' }, 'Modifier ma séance'),
        !routine.auto && h('button', {
          type: 'button', class: 'btn small',
          onClick: () => { routine = { auto: true, items: buildRoutine(s, scores).items }; persist(); paintHero(); paintEdit(); },
        }, icon('retest', 16), 'Régénérer'),
      ),
      !routine.auto && h('p', { class: 'hint' }, 'Séance personnalisée : tes réglages ne la modifient plus tant que tu ne la régénères pas.'),
      items.length
        ? h('ul', { class: 'edit-list' }, items.map((it, idx) => {
            const m = getMob(it.id);
            return h('li', null,
              h('div', { class: 'edit-main' },
                h('span', { class: 'row-title' }, m.name),
                h('span', { class: 'row-sub' }, timeLabel(it)),
              ),
              h('div', { class: 'edit-ctrl' },
                iconBtn('up', 'Monter', () => edit((l) => { [l[idx - 1], l[idx]] = [l[idx], l[idx - 1]]; }), idx === 0),
                iconBtn('down', 'Descendre', () => edit((l) => { [l[idx + 1], l[idx]] = [l[idx], l[idx + 1]]; }), idx === items.length - 1),
                iconBtn('minus', 'Moins de temps', () => edit((l) => { l[idx].seconds = Math.max(minSecondsFor(m), l[idx].seconds - 30); }), it.seconds <= minSecondsFor(m)),
                iconBtn('plus', 'Plus de temps', () => edit((l) => { l[idx].seconds += 30; })),
                iconBtn('close', 'Retirer', () => edit((l) => { l.splice(idx, 1); })),
              ),
            );
          }))
        : h('p', { class: 'hint' }, 'Aucune fiche pour le moment.'),
      h('div', { class: 'edit-add' },
        select,
        h('button', {
          type: 'button', class: 'btn',
          onClick: () => {
            const m = getMob(select.value);
            if (m) edit((l) => l.push({ id: m.id, seconds: defaultSeconds(m) }));
          },
        }, 'Ajouter'),
      ),
    ].filter(Boolean)); // replaceChildren natif écrirait « false » pour les valeurs vides
  }

  editBtn.addEventListener('click', () => {
    editing = !editing;
    editPanel.hidden = !editing;
    editBtn.setAttribute('aria-expanded', String(editing));
    editBtn.textContent = editing ? 'Terminer' : 'Modifier';
    if (editing) paintEdit();
  });

  function paintTips() {
    // Les conseils de tes contextes d'abord, puis les règles du livre.
    const tips = [
      ...CONTEXTS.filter((c) => s.contexts.includes(c.id)).flatMap((c) => c.tips.map((t) => ({ context: c.label, text: t }))),
      ...RULES.map((r) => ({ context: r.title, text: r.text })),
    ];
    tipBox.replaceChildren();
    tipIndex = Math.min(tipIndex, tips.length - 1);
    const tip = tips[tipIndex];
    const go = (d) => { tipIndex = (tipIndex + d + tips.length) % tips.length; paintTips(); };
    tipBox.append(
      h('article', { class: 'tip', 'aria-live': 'polite' },
        h('span', { class: 'tip-tag' }, tip.context),
        h('p', { class: 'tip-text' }, tip.text),
        h('div', { class: 'tip-foot' },
          h('div', { class: 'dots', 'aria-label': `Conseil ${tipIndex + 1} sur ${tips.length}` },
            tips.map((_, i) => h('span', { class: i === tipIndex ? 'on' : null }))),
          h('div', { class: 'tip-nav' },
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Conseil précédent', disabled: tips.length < 2, onClick: () => go(-1) }, icon('chevronLeft')),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Conseil suivant', disabled: tips.length < 2, onClick: () => go(1) }, icon('chevronRight')),
          ),
        ),
      ),
    );
  }

  function paintDynamic() {
    paintHero();
    if (editing) paintEdit();

    sportsBox.replaceChildren();
    if (s.contexts.includes('sport')) {
      sportsBox.append(
        h('section', { class: 'section' },
          h('h2', { class: 'section-title' }, 'Ton sport'),
          chipGroup({ options: SPORTS, selected: s.sports, label: 'Sport pratiqué', onChange: (v) => save({ sports: v }) }),
        ),
      );
    }

    // Séances prêtes : la durée suit le matériel coché et le côté le plus raide du bilan.
    protoBox.replaceChildren(
      h('div', { class: 'section-head' },
        h('h2', { id: 'proto-t', class: 'section-title' }, 'Séances prêtes'),
        h('span', { class: 'hint' }, 'Selon ton matériel')),
      h('ul', { class: 'list' }, PROTOCOLS.map((p) => {
        const minutes = Math.max(1, Math.round(totalSeconds(resolveProtocol(p, s.equipment), weak) / 60));
        return h('li', { class: 'act-row' },
          h('a', { class: 'act-main', href: `#/protocol/${p.id}` },
            h('span', { class: 'zone-name' }, p.name),
            h('span', { class: 'zone-covers' }, `${minutes} min · ${p.when}`)),
          h('a', { class: 'play-btn', href: `#/session/protocol/${p.id}`, 'aria-label': `Lancer : ${p.name}, ${minutes} minutes` }, icon('play', 18)));
      })),
    );

    warnBox.replaceChildren();
    for (const c of CONTEXTS.filter((x) => x.warning && s.contexts.includes(x.id))) {
      warnBox.append(h('p', { class: 'callout warn' }, icon('warn'), h('span', null, c.warning)));
    }

    paintTips();
  }

  // Pas de bilan : on l'explique en haut de l'écran, c'est lui qui règle la séance sur le corps.
  function bilanPitch() {
    const ids = TESTS.map((t) => t.id);
    const points = [
      'Tes zones les plus raides d\'abord.',
      `Le côté le plus raide gagne ${WEAK_SIDE_BONUS} s.`,
      'Tu mesures tes progrès au re-test.',
    ];
    return h('section', { class: 'card accent pitch', 'aria-labelledby': 'pitch-t' },
      h('span', { class: 'kicker' }, 'Pour commencer'),
      h('h2', { id: 'pitch-t' }, 'Fais ton bilan de mobilité'),
      h('p', null, 'Il règle ta séance sur ton corps, pas seulement sur ton contexte :'),
      h('ol', { class: 'pitch-points' }, points.map((t, i) =>
        h('li', null, h('span', { class: 'n', 'aria-hidden': 'true' }, String(i + 1)), h('span', null, t)))),
      h('a', { class: 'btn dark big', href: '#/bilan' }, `Faire le bilan · ${totalMinutes(ids)} min`, icon('arrowRight', 18)),
      h('p', { class: 'pitch-meta' }, `${ids.length} tests : un mur, de la place au sol, une chaise.`),
    );
  }

  // Bilan fait : re-test proche ou dû, on le rappelle ; sinon une ligne discrète suffit.
  function bilanRow() {
    if (plan?.date) {
      const days = daysUntil(plan.date);
      if (days <= 7) {
        const d = fromDateKey(plan.date);
        const ids = plan.type === 'full' ? null : pickTargetTests(lastAssessment.scores);
        return h('a', { class: 'banner', href: days <= 0 ? (plan.type === 'full' ? '#/bilan' : '#/bilan/target') : '#/retest' },
          h('span', { class: 'cal-icon' }, h('small', null, MONTH.format(d).replace('.', '')), h('b', null, String(d.getDate()))),
          h('span', { class: 'txt' },
            h('b', null, days < 0 ? 'Re-test en retard : on le fait ?' : days === 0 ? 'C\'est le jour du re-test' : days === 1 ? 'Re-test demain' : `Re-test dans ${days} jours`),
            h('span', null, ids ? `${ids.length} tests · ${totalMinutes(ids)} min` : 'Bilan complet · 15 min')),
          icon('chevronRight', 18));
      }
    }
    const d = new Date(lastAssessment.at);
    return h('a', { class: 'quiet-row', href: '#/progress' }, `Bilan du ${d.getDate()} ${MONTH.format(d).replace('.', '')} · voir mes scores`, icon('chevronRight', 16));
  }

  root.append(
    h('div', { class: 'today-top' },
    h('header', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, dateLabel()),
      h('h1', { class: 'page-title' }, 'Aujourd\'hui'),
    ),
    ...(lastAssessment ? [] : [bilanPitch()]), // spread : append natif écrirait « null » pour une valeur vide

    h('section', { class: 'section', style: 'gap:var(--space-xs)', 'aria-labelledby': 'time-t' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'time-t', class: 'section-label' }, 'Temps disponible'),
        h('span', { class: 'hint' }, 'Idéal : 15 à 20 min par jour'),
      ),
      chipGroup({
        options: DURATIONS,
        selected: [s.duration],
        multi: false,
        label: 'Durée de la séance',
        className: 'segmented',
        itemClass: '',
        render: (o) => o.label,
        onChange: (v) => save({ duration: v[0] }),
      }),
    ),
    ),

    h('section', { class: 'hero', 'aria-labelledby': 'seance-t' },
      h('div', { class: 'hero-top' },
        h('div', null,
          h('span', { class: 'hero-label' }, 'Ma séance du jour'),
          heroTitle,
        ),
        h('div', { class: 'hero-dur', role: 'img', 'aria-label': 'Durée de la séance en minutes' }, ringValue, h('span', null, 'min')),
      ),
      heroTags,
      heroList,
      heroRota,
      heroNote,
      h('div', { class: 'hero-actions' }, startBtn, editBtn),
    ),
    editPanel,
    ...(lastAssessment ? [bilanRow()] : []),
    protoBox,

    h('section', { class: 'section' },
      h('div', { class: 'section-head' },
        h('h2', { class: 'section-title' }, 'Mon contexte'),
        h('span', { class: 'hint' }, 'Plusieurs choix'),
      ),
      chipGroup({
        options: CONTEXTS.map((c) => ({ id: c.id, label: c.label })),
        selected: s.contexts,
        label: 'Contextes actifs',
        className: 'chips',
        itemClass: 'chip ctx',
        render: (o) => [icon(CONTEXT_ICONS[o.id], 20), o.label],
        onChange: (v) => { tipIndex = 0; save({ contexts: v }); },
      }),
      warnBox,
      h('a', { class: 'text-link', href: '#/library' }, 'Une douleur précise ? Touche la zone', icon('arrowRight', 18)),
    ),
    sportsBox,

    h('details', { class: 'fold' },
      h('summary', null,
        h('span', { class: 'section-title' }, 'Matériel à disposition'),
        eqCount,
        icon('chevronDown', 20, 'chev')),
      chipGroup({
        options: EQUIPMENT,
        selected: s.equipment,
        label: 'Matériel',
        itemClass: 'chip eq-chip',
        render: (o) => [equipIcon(o.id, 24), o.label],
        onChange: (v) => { eqCount.textContent = `${v.length} sur ${EQUIPMENT.length}`; save({ equipment: v }); },
      }),
    ),

    h('section', { class: 'section' },
      h('h2', { class: 'section-title' }, 'Conseils du moment'),
      tipBox,
    ),
  );

  paintDynamic();
}
