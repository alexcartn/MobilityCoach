import { h, toast } from '../ui.js';
import * as store from '../store.js';
import { canInstall, isStandalone, promptInstall, onInstallChange } from '../install.js';
import { VERSION } from '../version.js';

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

  root.append(
    h('h2', null, 'Suivi'),
    h('p', { class: 'lead' }, 'Tes séances et tes tests avant/après apparaîtront ici.'),
    h('div', { class: 'card' },
      h('h3', null, 'Aucune séance pour l\'instant'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'L\'historique, la régularité et les résultats de tests arrivent dans les prochaines étapes.'),
    ),

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
