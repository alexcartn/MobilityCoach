import { toast, hideToast } from './ui.js';
import * as today from './views/today.js';
import * as library from './views/library.js';
import * as principles from './views/principles.js';
import * as progress from './views/progress.js';
import * as session from './views/session.js';
import './install.js';

const routes = { today, library, principles, progress, session };
const TITLES = { today: 'Aujourd\'hui', library: 'Fiches', principles: 'Principes', progress: 'Suivi', session: 'Séance' };
const TAB_OF = { session: 'today' }; // la séance garde l'onglet Aujourd'hui allumé

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
  document.body.classList.toggle('in-session', name === 'session');
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.route === (TAB_OF[name] ?? name)) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  document.title = `${TITLES[name]} · Supple Leopard`;
  await routes[name].render(view, params);
  window.scrollTo(0, 0);
}

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
