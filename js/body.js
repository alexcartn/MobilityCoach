// Silhouette du corps (faces avant et arrière) colorée selon le score de chaque zone, dans le même
// langage que les schémas (js/diagram.js) : contour fin à l'encre, zone choisie hachurée.
// Géométrie issue de la maquette ; chaque forme porte le numéro de la zone du livre.

import { bucket, zoneName } from './assessment.js';

const NS = 'http://www.w3.org/2000/svg';

const FRONT = [
  { z: null, tag: 'ellipse', a: { cx: 100, cy: 32, rx: 19, ry: 23 } },
  { z: null, tag: 'rect', a: { x: 91, y: 56, width: 18, height: 16, rx: 6 } },
  { z: 3, tag: 'path', a: { d: 'M66 78 C82 72 118 72 134 78 C140 92 139 108 135 122 C114 128 86 128 65 122 C61 108 60 92 66 78 Z' } },
  { z: 3, tag: 'ellipse', a: { cx: 59, cy: 87, rx: 10, ry: 12 }, mirror: true },
  { z: 5, tag: 'path', a: { d: 'M66 126 C88 132 112 132 134 126 L130 172 C112 177 88 177 70 172 Z' } },
  { z: 7, tag: 'path', a: { d: 'M70 176 C88 181 112 181 130 176 L134 204 C120 211 110 214 100 216 C90 214 80 211 66 204 Z' } },
  { z: null, tag: 'rect', a: { x: 40, y: 98, width: 16, height: 62, rx: 8 }, mirror: true },
  { z: 4, tag: 'rect', a: { x: 36, y: 164, width: 16, height: 66, rx: 8 }, mirror: true },
  { z: null, tag: 'ellipse', a: { cx: 44, cy: 241, rx: 8, ry: 11 }, mirror: true },
  { z: 7, tag: 'path', a: { d: 'M66 208 C74 212 81 214 87 216 L85 296 L72 296 C67 270 64 240 66 208 Z' }, mirror: true },
  { z: 8, tag: 'path', a: { d: 'M90 217 C93 218 96 219 98.5 220 L98 291 L88 296 Z' }, mirror: true },
  { z: 10, tag: 'ellipse', a: { cx: 84, cy: 309, rx: 11.5, ry: 10.5 }, mirror: true },
  { z: 11, tag: 'path', a: { d: 'M74 322 L94 322 C94 340 93 362 91 382 L79 382 C77 362 74 340 74 322 Z' }, mirror: true },
  { z: 13, tag: 'path', a: { d: 'M78 387 L92 387 L95 403 C95 410 70 410 72 403 Z' }, mirror: true },
];

const BACK = [
  { z: null, tag: 'ellipse', a: { cx: 100, cy: 32, rx: 19, ry: 23 } },
  { z: 1, tag: 'path', a: { d: 'M88 56 L112 56 L114 72 C123 79 125 100 121 132 L79 132 C75 100 77 79 86 72 Z' } },
  { z: 2, tag: 'path', a: { d: 'M66 78 C72 74 78 74 82 76 C77 96 75 118 77 150 C71 140 66 124 64 110 C63 98 63 88 66 78 Z' }, mirror: true },
  { z: 2, tag: 'ellipse', a: { cx: 59, cy: 87, rx: 10, ry: 12 }, mirror: true },
  { z: 5, tag: 'path', a: { d: 'M80 136 L120 136 C122 150 125 162 129 173 C112 178 88 178 71 173 C75 162 78 150 80 136 Z' } },
  { z: 6, tag: 'path', a: { d: 'M71 177 C82 179 91 181 98.5 182 L98.5 219 C88 223 75 219 67 209 C66 197 68 186 71 177 Z' }, mirror: true },
  { z: 4, tag: 'rect', a: { x: 40, y: 98, width: 16, height: 62, rx: 8 }, mirror: true },
  { z: 4, tag: 'rect', a: { x: 36, y: 164, width: 16, height: 66, rx: 8 }, mirror: true },
  { z: null, tag: 'ellipse', a: { cx: 44, cy: 241, rx: 8, ry: 11 }, mirror: true },
  { z: 9, tag: 'path', a: { d: 'M67 214 C76 222 90 224 98.5 224 L98 292 L72 296 C67 270 64 240 67 214 Z' }, mirror: true },
  { z: 10, tag: 'ellipse', a: { cx: 84, cy: 309, rx: 11.5, ry: 10.5 }, mirror: true },
  { z: 12, tag: 'path', a: { d: 'M73 322 L95 322 C97 345 94 365 90 382 L80 382 C75 365 71 345 73 322 Z' }, mirror: true },
  { z: 13, tag: 'path', a: { d: 'M78 387 L92 387 L95 403 C95 410 70 410 72 403 Z' }, mirror: true },
];

const MIRROR = 'matrix(-1 0 0 1 200 0)';
let uid = 0;

// Zones visibles sur chaque face, dans l'ordre de la silhouette (de haut en bas).
export const zonesInView = (view) => [...new Set((view === 'back' ? BACK : FRONT).map((p) => p.z).filter((z) => z !== null))].sort((a, b) => a - b);
// Face où la zone est visible : la face avant par défaut, le dos pour les zones qui n'y figurent pas.
export const viewOf = (zoneId) => (zonesInView('front').includes(zoneId) ? 'front' : 'back');

// view : 'front' | 'back' ; scores : { zoneId: 0-100 | null } ; onZone(zoneId, auClavier) rend les zones cliquables.
// selected : zone mise en avant (hachurée) ; mark : 'ink' (hachures à l'encre : sélection dans une carte de scores)
// ou 'accent' (hachures fauves, comme la zone travaillée d'un schéma) ; role : 'link' (navigation) ou 'button' (sélection) ;
// decorative : ignoré par les lecteurs d'écran.
export function renderBody(view, scores, { onZone, width = 130, selected = null, mark = 'ink', role = 'link', decorative = false } = {}) {
  const parts = view === 'back' ? BACK : FRONT;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 420');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(Math.round(width * 2.1)));
  if (decorative) svg.setAttribute('aria-hidden', 'true');
  else {
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', view === 'back' ? 'Silhouette vue de dos' : 'Silhouette vue de face');
  }
  const focusable = new Set();

  // Hachures de la zone choisie : pas et épaisseur calculés pour rester fins à l'écran, quelle que soit la taille.
  const hatchId = `body-hatch-${++uid}`;
  if (selected !== null) {
    const gap = 600 / width;
    const defs = document.createElementNS(NS, 'defs');
    const pat = document.createElementNS(NS, 'pattern');
    for (const [k, v] of Object.entries({ id: hatchId, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' })) pat.setAttribute(k, String(v));
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('width', String(gap)); bg.setAttribute('height', String(gap)); bg.setAttribute('class', `bz-hatch-bg ${mark}`);
    const line = document.createElementNS(NS, 'line');
    for (const [k, v] of Object.entries({ x1: 0, y1: 0, x2: 0, y2: gap })) line.setAttribute(k, String(v));
    line.setAttribute('stroke-width', String(240 / width)); line.setAttribute('class', `bz-hatch-line ${mark}`);
    pat.append(bg, line); defs.append(pat); svg.append(defs);
  }

  for (const p of parts) {
    for (const mirrored of p.mirror ? [false, true] : [false]) {
      const el = document.createElementNS(NS, p.tag);
      for (const [k, v] of Object.entries(p.a)) el.setAttribute(k, String(v));
      if (mirrored) el.setAttribute('transform', MIRROR);
      // 'free' : tête, mains… (papier) ; 'none' : zone pas encore mesurée (gris) ; 0 à 3 : score.
      const level = p.z === null ? 'free' : bucket(scores[p.z]);
      const isSel = p.z !== null && p.z === selected;
      el.setAttribute('class', `bz bz-${level}${isSel ? ' bz-sel' : ''}`);
      if (isSel) el.style.fill = `url(#${hatchId})`;
      if (p.z !== null && onZone) {
        el.dataset.zone = String(p.z);
        el.classList.add('bz-link');
        el.addEventListener('click', () => onZone(p.z, false));
        // Un seul élément focalisable par zone : le premier rencontré.
        if (!focusable.has(p.z)) {
          focusable.add(p.z);
          const s = scores[p.z];
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', role);
          if (role === 'button') el.setAttribute('aria-pressed', String(p.z === selected));
          el.setAttribute('aria-label', `${zoneName(p.z)} : ${s === null || s === undefined ? 'pas encore mesurée' : s + ' sur 100'}`);
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onZone(p.z, true); } });
        }
      }
      svg.append(el);
    }
  }
  return svg;
}
