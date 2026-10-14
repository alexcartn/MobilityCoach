import * as store from './store.js';

export const DEFAULTS = {
  contexts: [],
  sports: [],
  duration: 15,
  equipment: ['ball', 'roller', 'band', 'box'],
  sound: true,
  vibrate: true,
  voice: true, // annonce la fiche suivante à voix haute
  flow: true, // les fiches s'enchaînent seules pendant la séance guidée
  theme: 'light',
};

export async function loadSettings() {
  const saved = await store.get('settings', {});
  return { ...DEFAULTS, ...saved };
}

export async function saveSettings(settings) {
  await store.set('settings', settings);
}
