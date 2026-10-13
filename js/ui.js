// Petits utilitaires DOM : pas de innerHTML, tout passe par des noeuds texte.

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
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

// Groupe de pastilles. Les ids sont comparés en chaîne ; onChange reçoit les ids d'origine.
export function chipGroup({ options, selected = [], multi = true, label, onChange }) {
  let sel = new Set(selected.map(String));
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': label });
  for (const o of options) {
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(sel.has(String(o.id))) }, o.label);
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
