import { h, toast, icon } from '../ui.js';
import * as store from '../store.js';
import { canInstall, isStandalone, promptInstall, onInstallChange } from '../install.js';
import { VERSION } from '../version.js';
import { getMob } from '../data/mobs.js';
import { loadSessions, stats, dayKey } from '../sessions.js';
import { fmtSeconds } from '../routine.js';

let offInstall;

export async function render(root) {
  const installBox = h('div', { class: 'list' });
  const persistBox = h('div', { class: 'row' });

  function paintInstall() {
    installBox.replaceChildren();
    const row = (title, sub, clickable) => {
      const inner = [
        h('span', { class: 'row-icon accent' }, icon('phone')),
        h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, title), h('span', { class: 'row-sub' }, sub)),
        clickable && icon('chevronRight', 18),
      ];
      return clickable
        ? h('button', { type: 'button', class: 'row', onClick: promptInstall }, inner)
        : h('div', { class: 'row' }, inner);
    };
    if (isStandalone()) installBox.append(row('Application installée', 'Disponible hors ligne depuis l\'écran d\'accueil.'));
    else if (canInstall()) installBox.append(row('Installer l\'application', 'Hors ligne, depuis l\'écran d\'accueil', true));
    else installBox.append(row('Installer l\'application', 'Menu ⋮ de Chrome, puis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».'));
  }
  offInstall?.();
  offInstall = onInstallChange(paintInstall);
  paintInstall();

  const persisted = await store.requestPersistence();
  persistBox.append(
    h('span', { class: `row-icon ${persisted ? 'ok' : 'warn'}` }, icon(persisted ? 'shield' : 'shieldOff')),
    h('span', { class: 'row-text' },
      h('span', { class: 'row-title' }, persisted ? 'Stockage protégé' : 'Stockage non garanti'),
      h('span', { class: 'row-sub' }, persisted
        ? 'Tout reste sur ce téléphone : aucun compte, aucun serveur.'
        : 'Tout reste sur ce téléphone. Pense à exporter tes données de temps en temps.'),
    ),
  );

  const fileInput = h('input', { type: 'file', accept: 'application/json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('format');
      await store.importAll(data);
      toast('Données importées. Recharge la page pour tout voir.');
    } catch {
      toast('Fichier illisible : export JSON de cette application attendu.');
    }
    fileInput.value = '';
  });

  async function exportData() {
    const data = await store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `supple-leopard-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function wipe() {
    if (!confirm('Effacer toutes tes données locales ? Cette action est définitive.')) return;
    await store.clearAll();
    toast('Données effacées.');
  }

  const sessions = await loadSessions();
  const st = stats(sessions);
  const week = weekDays(sessions);
  const history = sessions.slice(-5).reverse();
  const when = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  root.append(
    h('header', { class: 'page-head' },
      h('h1', { class: 'page-title' }, 'Suivi'),
      h('p', { class: 'lead' }, 'Ta régularité et tes tests avant/après.'),
    ),

    h('section', { class: 'card section', 'aria-labelledby': 'week-t' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'week-t', style: 'font-family:var(--font-body);font-size:15px;font-weight:700' }, 'Cette semaine'),
        h('span', { class: 'hint' }, `${week.filter((d) => d.done).length} / 7 jours`),
      ),
      weekStrip(week),
      sessions.length
        ? h('div', { class: 'stats' },
            h('div', { class: 'stat' }, h('b', null, String(st.streak)), h('span', null, st.streak > 1 ? 'jours d\'affilée' : 'jour d\'affilée')),
            h('div', { class: 'stat' }, h('b', null, String(st.weekCount)), h('span', null, 'séances sur 7 jours')),
            h('div', { class: 'stat' }, h('b', null, String(Math.round(st.weekSeconds / 60))), h('span', null, 'min sur 7 jours')),
          )
        : null,
    ),

    sessions.length
      ? h('section', { class: 'section', style: 'gap:10px' },
          h('h2', { class: 'section-label' }, 'Dernières séances'),
          h('ul', { class: 'list' }, history.map((e) =>
            h('li', { class: 'row' },
              h('span', { class: 'row-text' },
                h('span', { class: 'row-title' }, when(e.at)),
                h('span', { class: 'row-sub' }, e.items.map((it) => getMob(it.id)?.name ?? it.id).join(', ')),
              ),
              h('span', { class: 'hint' }, fmtSeconds(Math.round(e.seconds / 10) * 10)),
            ))),
        )
      : h('section', { class: 'hero', style: 'gap:12px' },
          h('h2', { style: 'font-size:20px' }, 'Aucune séance pour l\'instant'),
          h('p', null, 'Ton historique et ta régularité s\'afficheront ici dès ta première séance.'),
          h('a', { href: '#/today', class: 'btn primary', style: 'align-self:flex-start' }, 'Préparer ma séance'),
        ),

    h('section', { class: 'section', style: 'gap:10px' },
      h('h2', { class: 'section-label' }, 'Application'),
      installBox,
    ),

    h('section', { class: 'section', style: 'gap:10px' },
      h('h2', { class: 'section-label' }, 'Mes données'),
      h('div', { class: 'list' },
        persistBox,
        h('button', { type: 'button', class: 'row', onClick: exportData },
          h('span', { class: 'row-icon plain' }, icon('download')), h('span', { class: 'row-title' }, 'Exporter mes données')),
        h('button', { type: 'button', class: 'row', onClick: () => fileInput.click() },
          h('span', { class: 'row-icon plain' }, icon('upload')), h('span', { class: 'row-title' }, 'Importer une sauvegarde')),
        h('button', { type: 'button', class: 'row danger', onClick: wipe },
          h('span', { class: 'row-icon plain' }, icon('trash')), h('span', { class: 'row-title' }, 'Tout effacer')),
      ),
      fileInput,
    ),

    h('p', { class: 'callout warn' }, icon('warn'),
      h('span', null, 'Outil d\'entraînement, pas un avis médical. Douleur vive, qui irradie, engourdissement ou suite à un choc : consulte un professionnel de santé.')),
    h('p', { class: 'footnote' },
      'Inspirée de Becoming a Supple Leopard (Kelly Starrett et Glen Cordoza). Contenus reformulés, non affiliés. Version ' + VERSION + '.'),
  );
}

// Lundi à dimanche de la semaine en cours, avec les jours où une séance a été faite.
function weekDays(sessions) {
  const done = new Set(sessions.map((s) => dayKey(new Date(s.at))));
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return 'LMMJVSD'.split('').map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { letter, date: d, isToday: d.toDateString() === today.toDateString(), done: done.has(dayKey(d)) };
  });
}

function weekStrip(days) {
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return h('ol', { class: 'week', 'aria-label': 'Jours de la semaine' }, days.map((d) =>
    h('li', { class: [d.isToday ? 'today' : '', d.done ? 'done' : ''].join(' ').trim() || null },
      h('span', { 'aria-hidden': 'true' }, d.letter),
      h('span', { class: 'day' },
        h('span', { class: 'visually-hidden' }, `${fmt.format(d.date)}${d.isToday ? ', aujourd\'hui' : ''} : ${d.done ? 'séance faite' : 'pas de séance'}`)),
    )));
}
