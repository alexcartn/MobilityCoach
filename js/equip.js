// Icônes du matériel (24×24), dans le langage des schémas : contour fin à l'encre (currentColor),
// objet en fauve plein (balles) ou en fauve pâle (rouleau, bâton, bande, banc).
// Chaque forme : [type, attributs, ton]. ton : 'fill' = fauve, 'soft' = fauve pâle, 'ink' = trait seul.

import { h } from './ui.js';
import { EQUIPMENT } from './data/profile.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPES = {
  // Balle de lacrosse : petite, pleine, deux coutures.
  ball: [
    ['circle', { cx: 12, cy: 12, r: 8 }, 'fill'],
    ['path', { d: 'M8.3 8.2q2.3 3.8 0 7.6M15.7 8.2q-2.3 3.8 0 7.6' }, 'seam'],
  ],
  // Deux balles scotchées : contour unique, ruban au creux.
  peanut: [
    ['path', { d: 'M10.4 6.9h3.2v10.2h-3.2z' }, 'tape'],
    ['path', { d: 'M12 7.98A5.6 5.6 0 1 0 12 16.02A5.6 5.6 0 1 0 12 7.98Z' }, 'fill'],
    ['path', { d: 'M10.4 7v10M13.6 7v10' }, 'ink'],
  ],
  // Grosse balle souple : plus grande, pâle, avec un reflet.
  softball: [
    ['circle', { cx: 12, cy: 12, r: 9.4 }, 'soft'],
    ['path', { d: 'M6.6 10.6a6 6 0 0 1 4.2-4.6' }, 'ink'],
  ],
  // Rouleau : cylindre vu de côté, bout creux à droite.
  roller: [
    ['path', { d: 'M5 7.5h14a2.6 4.5 0 0 1 0 9H5a2.6 4.5 0 0 1 0-9z' }, 'soft'],
    ['ellipse', { cx: 19, cy: 12, rx: 2.6, ry: 4.5 }, 'ink'],
    ['ellipse', { cx: 19, cy: 12, rx: 0.9, ry: 1.6 }, 'ink'],
    ['path', { d: 'M9.5 7.5v9M13.5 7.5v9' }, 'seam'],
  ],
  // Bande élastique : un anneau plat.
  band: [
    ['path', { d: 'M8 6.5h8a5.5 5.5 0 0 1 0 11H8a5.5 5.5 0 0 1 0-11zM8 9.8h8a2.2 2.2 0 0 1 0 4.4H8a2.2 2.2 0 0 1 0-4.4z', 'fill-rule': 'evenodd' }, 'fill'],
  ],
  // Bande de compression : un rouleau de bande qui se déroule.
  voodoo: [
    ['path', { d: 'M8.5 16.5h12.3v3.8H8.5z' }, 'fill'],
    ['circle', { cx: 8.5, cy: 10.5, r: 6 }, 'soft'],
    ['circle', { cx: 8.5, cy: 10.5, r: 2.2 }, 'ink'],
  ],
  // Bâton ou tube : une tige en diagonale.
  dowel: [
    ['rect', { x: 1.8, y: 9.8, width: 20.4, height: 4.4, rx: 2.2, transform: 'rotate(-40 12 12)' }, 'soft'],
    ['path', { d: 'M5 11.1h12', transform: 'rotate(-40 12 12)' }, 'seam'],
  ],
  // Chaise, banc ou boîte : une assise épaisse sur deux pieds.
  box: [
    ['rect', { x: 3.5, y: 8.5, width: 17, height: 4.5, rx: 1.2 }, 'soft'],
    ['path', { d: 'M6.5 13v7.5M17.5 13v7.5M6.5 17.5h11' }, 'ink'],
  ],
};

export const EQUIP_IDS = Object.keys(SHAPES);

export function equipIcon(id, size = 24, extraClass = '') {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', ('eq ' + extraClass).trim());
  for (const [tag, attrs, tone] of SHAPES[id] || []) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    e.setAttribute('class', `eq-${tone}`);
    s.append(e);
  }
  return s;
}

// Sous-titre d'une ligne de liste : la durée, puis une petite icône devant chaque objet.
export function coversLine(text, ids) {
  if (!ids.length) return h('span', { class: 'zone-covers' }, `${text} · sans matériel`);
  return h('span', { class: 'zone-covers with-tools' }, text, ids.map((id) =>
    h('span', { class: 'tool-i' }, equipIcon(id, 16), EQUIPMENT.find((e) => e.id === id)?.label ?? id)));
}
