// Petits utilitaires DOM : pas de innerHTML, tout passe par des noeuds texte.

// Typographie française : espace insécable avant « : ; ? ! » et dans les guillemets, pour qu'un signe ne passe jamais seul à la ligne.
export const fr = (t) => String(t).replace(/ ([:;?!»])/g, '\u00A0$1').replace(/« /g, '«\u00A0');

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(fr(c)));
  }
  return el;
}

// Icônes au trait (24×24). Chaque entrée : liste de tracés SVG.
export const ICONS = {
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  chevronDown: ['M6 9l6 6 6-6'],
  arrowRight: ['M5 12h14M13 6l6 6-6 6'],
  warn: ['M12 4l9 16H3zM12 10v4M12 17h.01'],
  clock: ['M12 7v5l3 2', 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z'],
  search: ['M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.2-4.2'],
  sport: ['M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11'],
  back: ['M12 3v18M9 5.5h6M8.5 9.5h7M8.5 13.5h7M9 17.5h6'],
  sitting: ['M7 3v9h10V3M5.5 12h13v3h-13zM7.5 15v6M16.5 15v6'],
  travel: ['M5 16v-5l2-5h10l2 5v5M3.5 11h17M3.5 16h17v3h-17zM7.5 13.5h1M15.5 13.5h1'],
  retest: ['M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4'],
  zones: ['M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM9 4v16M15 4v16'],
  phone: ['M9.5 2.5h5A2.5 2.5 0 0 1 17 5v14a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 19V5a2.5 2.5 0 0 1 2.5-2.5zM12 7v7M9 11l3 3 3-3'],
  shield: ['M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z', 'M8.5 12l2.5 2.5 4.5-5'],
  shieldOff: ['M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6zM12 8v4.5M12 15.5h.01'],
  download: ['M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14'],
  upload: ['M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19h14'],
  trash: ['M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13'],
  up: ['M12 19V5M6 11l6-6 6 6'],
  down: ['M12 5v14M6 13l6 6 6-6'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12M18 6L6 18'],
  play: ['M8 5.5v13l11-6.5z'],
  pause: ['M8 5v14M16 5v14'],
  skip: ['M5 5.5v13l9-6.5zM18 5v14'],
  flame: ['M12 3c2 3 5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 1.5 1.5 2 2 2 0-2.5 0-4.5 1-6.5z'],
  sliders: ['M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5'],
};

const SVG_NS = 'http://www.w3.org/2000/svg';
export function icon(name, size = 20, extraClass = '') {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', ('ic ' + extraClass).trim());
  for (const d of ICONS[name] || []) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    s.append(p);
  }
  return s;
}

// Groupe de boutons à bascule. Les ids sont comparés en chaîne ; onChange reçoit les ids d'origine.
// className : classe du conteneur (chips, segmented, tiles…) ; itemClass : classe de chaque bouton ;
// render(o) : contenu du bouton (par défaut une coche + le libellé).
export function chipGroup({ options, selected = [], multi = true, label, onChange,
  className = 'chips', itemClass = 'chip', render }) {
  let sel = new Set(selected.map(String));
  const wrap = h('div', { class: className, role: 'group', 'aria-label': label });
  const content = render || ((o) => [icon('check', 16), o.label]);
  for (const o of options) {
    const b = h('button', { type: 'button', class: itemClass, 'aria-pressed': String(sel.has(String(o.id))) }, content(o));
    b.dataset.id = String(o.id);
    b.addEventListener('click', () => {
      const key = String(o.id);
      if (multi) sel.has(key) ? sel.delete(key) : sel.add(key);
      else sel = new Set([key]);
      for (const x of wrap.children) x.setAttribute('aria-pressed', String(sel.has(x.dataset.id)));
      onChange(options.filter((opt) => sel.has(String(opt.id))).map((opt) => opt.id));
    });
    wrap.append(b);
  }
  return wrap;
}

// Télécharge un contenu texte comme un fichier (sauvegarde JSON, rappel agenda .ics).
export function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

let toastTimer;
export function toast(message, { action, duration = 4000 } = {}) {
  const t = document.getElementById('toast');
  t.replaceChildren(h('span', null, message));
  if (action) t.append(h('button', { type: 'button', class: 'toast-btn', onClick: action.onClick }, action.label));
  t.hidden = false;
  clearTimeout(toastTimer);
  if (!action) toastTimer = setTimeout(() => { t.hidden = true; }, duration);
}

export function hideToast() {
  document.getElementById('toast').hidden = true;
}
