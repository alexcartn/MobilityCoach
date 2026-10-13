// Thème : clair par défaut, sombre ou automatique (suit le téléphone) au choix.
// La valeur est aussi gardée dans localStorage pour être appliquée avant le premier affichage
// (le script en tête de index.html la lit), sans flash de la mauvaise couleur.

import { loadSettings, saveSettings } from './settings.js';

const KEY = 'sl-theme';
const COLORS = { light: '#f5f1e8', dark: '#14110e' };
const THEMES = ['light', 'dark', 'auto'];
let current = 'light';

export function applyTheme(theme) {
  current = THEMES.includes(theme) ? theme : 'light';
  document.documentElement.setAttribute('data-theme', current);
  const dark = current === 'dark' || (current === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.getElementById('theme-color')?.setAttribute('content', dark ? COLORS.dark : COLORS.light);
  try { localStorage.setItem(KEY, current); } catch { /* stockage indisponible : tant pis */ }
}

export async function initTheme() {
  const s = await loadSettings();
  applyTheme(s.theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (current === 'auto') applyTheme('auto'); });
}

export async function setTheme(theme) {
  applyTheme(theme); // immédiat : l'enregistrement en base vient ensuite
  const s = await loadSettings();
  await saveSettings({ ...s, theme });
}

export const getTheme = () => current;
