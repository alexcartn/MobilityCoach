import * as store from './store.js';

export const DEFAULTS = {
  contexts: [],
  sports: [],
  duration: 15,
  equipment: ['ball', 'roller', 'band', 'box'],
  sound: true,
  vibrate: true,
  voice: true, // courtes phrases parlées : position suivante, changement de côté
  soundTheme: 'bol', // style des sons : bol, cloche ou bois (js/sound.js)
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
