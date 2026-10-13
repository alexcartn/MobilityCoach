import { h, toast, icon, chipGroup, download } from '../ui.js';
import * as store from '../store.js';
import { canInstall, isStandalone, promptInstall, onInstallChange } from '../install.js';
import { VERSION } from '../version.js';
import { getTheme, setTheme } from '../theme.js';

let offInstall;

// Réglages : apparence, installation, sauvegarde des données.
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
    download(`supple-leopard-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  }

  async function wipe() {
    if (!confirm('Effacer toutes tes données locales (séances, bilans, réglages) ? Cette action est définitive.')) return;
    await store.clearAll();
    toast('Données effacées.');
  }

  root.append(
    h('header', { class: 'page-head' },
      h('a', { class: 'back-link', href: '#/progress' }, icon('chevronLeft', 18), 'Suivi'),
      h('h1', { class: 'page-title' }, 'Réglages'),
    ),

    h('section', { class: 'section', style: 'gap:10px' },
      h('h2', { class: 'section-label' }, 'Apparence'),
      chipGroup({
        options: [{ id: 'light', label: 'Clair' }, { id: 'dark', label: 'Sombre' }, { id: 'auto', label: 'Automatique' }],
        selected: [getTheme()],
        multi: false,
        label: 'Thème de l\'application',
        className: 'segmented',
        itemClass: '',
        render: (o) => o.label,
        onChange: (v) => setTheme(v[0]),
      }),
      h('p', { class: 'hint' }, 'Clair par défaut. « Automatique » suit le réglage de ton téléphone.'),
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
