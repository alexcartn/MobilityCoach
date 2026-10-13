import { h, toast } from '../ui.js';
import * as store from '../store.js';
import { canInstall, isStandalone, promptInstall, onInstallChange } from '../install.js';
import { VERSION } from '../version.js';
import { getMob } from '../data/mobs.js';
import { loadSessions, stats } from '../sessions.js';
import { fmtSeconds } from '../routine.js';

let offInstall;

export async function render(root) {
  const installBox = h('div');
  const persistBox = h('p', { class: 'muted small' });

  function paintInstall() {
    installBox.replaceChildren();
    if (isStandalone()) {
      installBox.append(h('p', { class: 'muted small', style: 'margin:0' }, 'Application installée.'));
    } else if (canInstall()) {
      installBox.append(h('button', { type: 'button', class: 'btn primary', onClick: promptInstall }, 'Installer l\'application'));
    } else {
      installBox.append(h('p', { class: 'muted small', style: 'margin:0' },
        'Pour installer : menu ⋮ de Chrome, puis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».'));
    }
  }
  offInstall?.();
  offInstall = onInstallChange(paintInstall);
  paintInstall();

  const persisted = await store.requestPersistence();
  persistBox.textContent = persisted
    ? 'Stockage protégé : le navigateur ne purgera pas tes données automatiquement.'
    : 'Stockage non garanti : pense à exporter tes données de temps en temps.';

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
  const dayName = (d) => d.toLocaleDateString('fr-FR', { weekday: 'narrow' });
  const when = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  const history = sessions.slice(-5).reverse();
  root.append(
    h('h2', null, 'Suivi'),
    h('p', { class: 'lead' }, 'Le livre insiste : pas de jour off, même court.'),
    h('div', { class: 'card' },
      h('div', { class: 'week', role: 'img', 'aria-label': `${st.last7.filter((d) => d.done).length} jours mobilisés sur les 7 derniers` },
        st.last7.map((d) => h('div', { class: `day${d.done ? ' done' : ''}` },
          h('span', { class: 'dot' }),
          h('span', { class: 'muted small' }, dayName(d.date))))),
      h('div', { class: 'stats' },
        h('div', null, h('strong', null, String(st.streak)), h('span', { class: 'muted small' }, st.streak > 1 ? ' jours d\'affilée' : ' jour d\'affilée')),
        h('div', null, h('strong', null, String(st.weekCount)), h('span', { class: 'muted small' }, ' séances sur 7 jours')),
        h('div', null, h('strong', null, String(Math.round(st.weekSeconds / 60))), h('span', { class: 'muted small' }, ' min sur 7 jours')),
      ),
    ),
    history.length
      ? h('div', { class: 'card' },
          h('h3', null, 'Dernières séances'),
          h('ul', { class: 'plain' }, history.map((e) => h('li', null,
            `${when(e.at)} : ${fmtSeconds(Math.round(e.seconds / 10) * 10)}`,
            h('span', { class: 'muted small' }, ` (${e.items.map((it) => getMob(it.id)?.name ?? it.id).join(', ')})`)))))
      : h('div', { class: 'card' },
          h('h3', null, 'Aucune séance pour l\'instant'),
          h('p', { class: 'muted small', style: 'margin:0' }, 'Lance une séance depuis Aujourd\'hui : elle apparaîtra ici.')),

    h('p', { class: 'section-title' }, 'Application'),
    h('div', { class: 'card' }, installBox),

    h('p', { class: 'section-title' }, 'Mes données'),
    h('div', { class: 'card stack' },
      h('p', { class: 'small', style: 'margin:0' }, 'Tout reste sur ce téléphone : aucun compte, aucun serveur.'),
      persistBox,
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', onClick: exportData }, 'Exporter'),
        h('button', { type: 'button', class: 'btn', onClick: () => fileInput.click() }, 'Importer'),
        h('button', { type: 'button', class: 'btn danger', onClick: wipe }, 'Tout effacer'),
      ),
      fileInput,
    ),

    h('p', { class: 'section-title' }, 'À propos'),
    h('div', { class: 'card warn' },
      h('p', { class: 'small', style: 'margin:0' },
        'Cette application est un outil d\'entraînement, pas un avis médical. Douleur vive, qui irradie, engourdissement ou suite à un choc : consulte un professionnel de santé.'),
    ),
    h('p', { class: 'muted small', style: 'margin-top:12px' },
      'Inspirée de Becoming a Supple Leopard (Kelly Starrett et Glen Cordoza). Contenus reformulés, non affiliés. Version ' + VERSION + '.'),
  );
}
