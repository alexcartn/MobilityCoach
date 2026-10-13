// Installation de la PWA (Chrome Android : beforeinstallprompt).

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

export const canInstall = () => deferred !== null;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches;

export async function promptInstall() {
  if (!deferred) return;
  deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  notify();
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
