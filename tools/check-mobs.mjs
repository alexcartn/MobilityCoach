// Contrôle des fiches : node tools/check-mobs.mjs
// À lancer avant de commiter des fiches. Les erreurs (code de sortie 1) sont des fiches que l'app ne saura pas lire
// ou afficher ; les avertissements sont des oublis probables (matériel sans accessoire dessiné, mise en garde absente…).

import { MOBS, SYSTEMS, METHODS, KINDS } from '../js/data/mobs.js';
import { MOTIONS } from '../js/data/motions.js';
import { ZONES } from '../js/data/zones.js';
import { CONTEXTS, SPORTS, EQUIPMENT } from '../js/data/profile.js';
import { skeleton } from '../js/diagram.js';

const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id} : ${msg}`);
const warn = (id, msg) => warnings.push(`${id} : ${msg}`);

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const textList = (id, m, key) => {
  if (!Array.isArray(m[key]) || m[key].length === 0) return err(id, `${key} : une liste non vide est attendue`);
  m[key].forEach((t, i) => { if (!isText(t)) err(id, `${key}[${i}] : texte vide`); });
};
const oneOf = (id, key, values, allowed) => {
  for (const v of values) if (!allowed.includes(v)) err(id, `${key} : « ${v} » inconnu (attendu : ${allowed.join(', ')})`);
};

const ZONE_IDS = ZONES.map((z) => z.id);
const TOOL_IDS = EQUIPMENT.map((e) => e.id);
const PROP_TYPES = ['wall', 'focus', 'arrow', 'band', 'roller', 'box', 'ball', 'bar'];
// Le matériel qui doit se voir sur le schéma (les balles et les bandes ont plusieurs variantes dessinées pareil).
const TOOL_PROP = { ball: 'ball', peanut: 'ball', softball: 'ball', roller: 'roller', band: 'band', dowel: 'bar', box: 'box' };

const seen = new Set();
for (const m of MOBS) {
  const id = m.id ?? '(sans id)';
  if (!/^[a-z0-9_]+$/.test(String(m.id))) err(id, 'id : lettres minuscules, chiffres et _ seulement');
  if (seen.has(m.id)) err(id, 'id en double');
  seen.add(m.id);

  if (!Object.keys(KINDS).includes(m.kind)) err(id, `kind : « ${m.kind} » inconnu (attendu : ${Object.keys(KINDS).join(', ')})`);
  if (!ZONE_IDS.includes(m.zone)) err(id, `zone : ${m.zone} n'existe pas`);
  for (const key of ['name', 'summary', 'cue']) if (!isText(m[key])) err(id, `${key} : texte manquant`);
  if (isText(m.cue) && m.cue.length > 90) warn(id, `cue : ${m.cue.length} signes, lisible à bout de bras en 90 au plus`);

  if (!Array.isArray(m.systems) || m.systems.length === 0) err(id, 'systems : au moins un système');
  else oneOf(id, 'systems', m.systems, Object.keys(SYSTEMS));
  if (!Array.isArray(m.methods) || m.methods.length === 0) err(id, 'methods : au moins une méthode');
  else oneOf(id, 'methods', m.methods, Object.keys(METHODS));

  if (!Array.isArray(m.tools)) err(id, 'tools : une liste est attendue (vide sans matériel)');
  else {
    oneOf(id, 'tools', m.tools, TOOL_IDS);
    if (m.tools.length && !isText(m.toolsNote)) warn(id, 'toolsNote : une phrase sur le matériel est attendue');
  }

  for (const key of ['improves', 'steps', 'faults', 'retest']) textList(id, m, key);
  if (!isText(m.caution)) warn(id, 'caution : mise en garde absente');

  if (!Number.isInteger(m.seconds) || m.seconds < 30 || m.seconds > 600) err(id, `seconds : ${m.seconds} (entier de 30 à 600)`);
  if (typeof m.perSide !== 'boolean') err(id, 'perSide : vrai ou faux');
  if (!['any', 'after'].includes(m.when)) err(id, `when : « ${m.when} » (any ou after)`);

  if (!m.relevance || typeof m.relevance !== 'object') err(id, 'relevance : un objet { contexte: 1 à 3 }');
  else {
    oneOf(id, 'relevance', Object.keys(m.relevance), CONTEXTS.map((c) => c.id));
    for (const [c, v] of Object.entries(m.relevance)) if (![1, 2, 3].includes(v)) err(id, `relevance.${c} : ${v} (1, 2 ou 3)`);
    if (Object.keys(m.relevance).length === 0) err(id, 'relevance : au moins un contexte (sinon la fiche n\'est jamais proposée)');
  }
  if (!Array.isArray(m.sports)) err(id, 'sports : une liste est attendue (vide si aucun)');
  else oneOf(id, 'sports', m.sports, SPORTS.map((s) => s.id));

  // Schémas
  if (!Array.isArray(m.frames) || m.frames.length < 1 || m.frames.length > 2) { err(id, 'frames : 1 ou 2 images'); continue; }
  const drawn = new Set();
  m.frames.forEach((f, i) => {
    const at = `frames[${i}]`;
    if (!isText(f.caption)) err(id, `${at}.caption : légende manquante`);
    if (!isNum(f.torso)) err(id, `${at}.torso : angle manquant`);
    if (!Array.isArray(f.legs) || f.legs.length < 1 || f.legs.length > 2) return err(id, `${at}.legs : 1 ou 2 jambes`);
    f.legs.forEach((g, k) => { if (!isNum(g.thigh) || !isNum(g.shin)) err(id, `${at}.legs[${k}] : thigh et shin sont des angles`); });
    (f.arms ?? []).forEach((g, k) => { if (!isNum(g.upper) || !isNum(g.fore)) err(id, `${at}.arms[${k}] : upper et fore sont des angles`); });
    if (f.view !== undefined && f.view !== 'top') err(id, `${at}.view : « top » ou rien`);
    let J;
    try { J = skeleton(f); } catch (e) { return err(id, `${at} : pose illisible (${e.message})`); }
    for (const [k, p] of (f.props ?? []).entries()) {
      if (!PROP_TYPES.includes(p.t)) { err(id, `${at}.props[${k}] : type « ${p.t} » inconnu`); continue; }
      drawn.add(p.t);
      for (const key of ['at', 'from', 'to']) {
        const r = p[key];
        if (r === undefined) continue;
        if (!Array.isArray(r) || r.length < 2) err(id, `${at}.props[${k}].${key} : [articulation, dx, dy] ou [x, y]`);
        else if (typeof r[0] === 'string' && !J[r[0]]) err(id, `${at}.props[${k}].${key} : articulation « ${r[0]} » inconnue`);
      }
      const needs = { wall: ['at'], focus: ['at'], ball: ['at'], roller: ['at'], box: ['at', 'w', 'h'], band: ['from', 'to'], bar: ['from', 'to'], arrow: ['from', 'to'] }[p.t];
      for (const key of needs) if (p[key] === undefined) err(id, `${at}.props[${k}] (${p.t}) : ${key} manquant`);
    }
  });
  for (const t of m.tools ?? []) {
    const prop = TOOL_PROP[t];
    if (prop && !drawn.has(prop)) warn(id, `schéma : le matériel « ${t} » n'est pas dessiné (accessoire « ${prop} »)`);
  }
  if (!m.frames.some((f) => (f.props ?? []).some((p) => p.t === 'focus'))) warn(id, 'schéma : pas de zone travaillée (accessoire « focus »)');
}

// Mouvements
const KNOWN_MOTION_KEYS = ['period', 'anchor', 'still', 'slide', 'refS', 'end', 'begin', 'hands', 'feet', 'stillEnds', 'rigidArms', 'grip', 'faces'];
const STILL_TYPES = ['roller', 'ball', 'bar', 'box', 'wall'];
for (const [id, mo] of Object.entries(MOTIONS)) {
  const m = MOBS.find((x) => x.id === id);
  if (!m) { err(id, 'mouvement : aucune fiche avec cet id'); continue; }
  for (const k of Object.keys(mo)) if (!KNOWN_MOTION_KEYS.includes(k)) err(id, `mouvement : champ « ${k} » inconnu`);
  if (!isNum(mo.period) || mo.period < 3 || mo.period > 12) err(id, `mouvement.period : ${mo.period} (3 à 12 secondes)`);
  if (!mo.end && !mo.slide && m.frames.length < 2) err(id, 'mouvement : il faut une 2e image sur la fiche, un « end » ou un « slide »');
  for (const t of mo.still ?? []) if (!STILL_TYPES.includes(t)) err(id, `mouvement.still : « ${t} » inconnu`);
  if (mo.slide && !(isNum(mo.slide.angle) && isNum(mo.slide.from) && isNum(mo.slide.to))) err(id, 'mouvement.slide : angle, from et to attendus');
  if (mo.anchor) {
    try { if (!skeleton(m.frames[0])[mo.anchor]) err(id, `mouvement.anchor : articulation « ${mo.anchor} » inconnue`); } catch { /* déjà signalé plus haut */ }
  }
}

// Bilan
const perZone = ZONES.map((z) => `${String(z.id).padStart(2)} ${z.name.padEnd(20)} ${MOBS.filter((m) => m.zone === z.id).length}`);
console.log(`${MOBS.length} fiches, ${Object.keys(MOTIONS).length} animées, ${MOBS.length - Object.keys(MOTIONS).length} fixes\n${perZone.join('\n')}\n`);
for (const w of warnings) console.log(`avertissement  ${w}`);
for (const e of errors) console.log(`ERREUR         ${e}`);
console.log(`\n${errors.length} erreur(s), ${warnings.length} avertissement(s)`);
process.exit(errors.length ? 1 : 0);
