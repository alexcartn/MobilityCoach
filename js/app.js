import { toast, hideToast } from './ui.js';
import * as today from './views/today.js';
import * as library from './views/library.js';
import * as progress from './views/progress.js';
import * as session from './views/session.js';
import * as bilan from './views/bilan.js';
import * as profil from './views/profil.js';
import * as zone from './views/zone.js';
import * as retest from './views/retest.js';
import * as pain from './views/pain.js';
import * as protocol from './views/protocol.js';
import * as stats from './views/stats.js';
import * as settingsView from './views/settings.js';
import { initTheme } from './theme.js';
import './install.js';

const routes = { today, library, progress, session, bilan, profil, zone, retest, pain, protocol, stats, settings: settingsView };
const TITLES = { today: 'Aujourd\'hui', library: 'Corps', progress: 'Suivi', session: 'Séance', bilan: 'Bilan', profil: 'Profil', zone: 'Zone', retest: 'Re-test', pain: 'J\'ai mal ici', protocol: 'Séance prête', stats: 'Statistiques', settings: 'Réglages' };
// Écrans de parcours : pas de barre d'onglets, l'onglet d'origine reste allumé quand elle revient.
const TAB_OF = { session: 'today', bilan: 'progress', profil: 'progress', zone: 'progress', retest: 'progress', pain: 'library', protocol: 'today', stats: 'progress', settings: 'progress' };
const NO_NAV = new Set(['session', 'bilan', 'profil', 'zone', 'retest', 'pain', 'protocol']);

// #/library/7/couch -> { name: 'library', params: ['7', 'couch'] }
function parseHash() {
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return routes[name] ? { name, params: params.map(decodeURIComponent) } : { name: 'today', params: [] };
}

let current = null;

async function render() {
  const { name, params } = parseHash();
  const view = document.getElementById('view');
  current?.cleanup?.(); // arrête le minuteur et libère l'écran quand on quitte la séance
  current = routes[name];
  view.replaceChildren();
  view.className = ''; // les écrans à barre d'action fixe ajoutent leur propre classe
  // Une fiche ouverte est un écran d'action (barre « Faire maintenant ») : pas d'onglets.
  document.body.classList.toggle('no-nav', NO_NAV.has(name) || (name === 'library' && params.length >= 2));
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.route === (TAB_OF[name] ?? name)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  document.title = `${TITLES[name]} · Supple Leopard`;
  await routes[name].render(view, params);
  window.scrollTo(0, 0);
}

initTheme();
window.addEventListener('hashchange', render);
render();

// Service worker : hors ligne et mise à jour proposée à l'utilisateur.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;

  const offerUpdate = (worker) => toast('Nouvelle version disponible.', {
    action: { label: 'Actualiser', onClick: () => { hideToast(); worker.postMessage('SKIP_WAITING'); } },
  });

  navigator.serviceWorker.register('sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
      });
    });
  }).catch(() => { /* hors ligne ou contexte non sécurisé : l'app fonctionne quand même */ });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
}
