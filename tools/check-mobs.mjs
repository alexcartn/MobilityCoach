// Contrôle des fiches : node tools/check-mobs.mjs
// À lancer avant de commiter des fiches. Les erreurs (code de sortie 1) sont des fiches que l'app ne saura pas lire
// ou afficher ; les avertissements sont des oublis probables (matériel sans accessoire dessiné, mise en garde absente…).

import { MOBS, SYSTEMS, METHODS, KINDS } from '../js/data/mobs.js';
import { MOTIONS } from '../js/data/motions.js';
import { TESTS } from '../js/data/tests.js';
import { ZONES } from '../js/data/zones.js';
import { CONTEXTS, SPORTS, EQUIPMENT } from '../js/data/profile.js';
import { skeleton } from '../js/diagram.js';
import { PROTOCOLS, resolveProtocol } from '../js/data/protocols.js';
import { totalSeconds, MIN_SECONDS } from '../js/routine.js';

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
const TOOL_PROP = { ball: ['ball'], peanut: ['ball'], softball: ['ball'], roller: ['roller', 'bar'], band: ['band'], dowel: ['bar'], box: ['box'] }; // un rouleau vu du dessus est un tube

// Appuis : la figure est posée sur son point le plus bas. Si les mains ou les coudes touchent le sol, un genou à plat
// (tibia horizontal sous la hanche) ou un pied posé doit le toucher aussi, sinon il flotte. Sans accessoire (balle, rouleau,
// boîte), c'est un défaut de dessin ; avec, c'est souvent voulu (un tibia posé sur un rouleau) et on ne signale rien.
const rad = (d) => (d * Math.PI) / 180;
const flatAngle = (a) => Math.abs(Math.sin(rad(a))) < 0.38;
function floatingSupports(f) {
  const J = skeleton(f);
  const [legA, legB = legA] = f.legs;
  const [armA, armB = armA] = f.arms ?? [{ upper: 90, fore: 90 }];
  const cand = [];
  for (const [k, g] of [['', legA], ['2', legB]]) {
    const ankle = J['ankle' + k], toe = J['toe' + k], knee = J['knee' + k];
    const heel = [ankle[0] - Math.cos(rad(g.foot ?? 0)) * 2.6, ankle[1] - Math.sin(rad(g.foot ?? 0)) * 2.6];
    cand.push({ n: `genou${k}`, y: knee[1] + 4.6, flat: flatAngle(g.shin) && knee[1] - J.hip[1] > 14 });
    cand.push({ n: `pied${k}`, y: Math.max(heel[1] + 3.1, toe[1] + 2.1), flat: flatAngle(g.foot ?? 0) && ankle[1] - knee[1] > 8 && Math.abs(g.shin - 90) < 70 });
  }
  for (const [k, g] of [['', armA], ['2', armB]]) {
    cand.push({ n: `main${k}`, y: J['hand' + k][1] + Math.sin(rad(g.fore)) * 5.2 + 2.2, support: true });
    cand.push({ n: `coude${k}`, y: J['elbow' + k][1] + 3.1, support: true });
  }
  cand.push({ n: 'hanche', y: J.hip[1] + 7.8, support: true });
  const floor = Math.max(...cand.map((c) => c.y));
  if (!cand.some((c) => c.support && floor - c.y <= 1.5)) return [];
  return cand.filter((c) => c.flat && floor - c.y > 3.5).map((c) => `${c.n} flotte de ${(floor - c.y).toFixed(1)}`);
}

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
    if (f.view !== 'top' && !(f.props ?? []).some((p) => ['ball', 'roller', 'bar', 'box'].includes(p.t))) {
      for (const msg of floatingSupports(f)) warn(id, `${at} : ${msg} unités au-dessus du sol alors que les mains ou le bassin posent (revoir les angles)`);
    }
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
    const props = TOOL_PROP[t];
    if (props && !props.some((x) => drawn.has(x))) warn(id, `schéma : le matériel « ${t} » n'est pas dessiné (accessoire « ${props.join('» ou «')} »)`);
  }
  if (!m.frames.some((f) => (f.props ?? []).some((p) => p.t === 'focus'))) warn(id, 'schéma : pas de zone travaillée (accessoire « focus »)');
}

// Tests du bilan : même contrôle des appuis
for (const t of TESTS) {
  for (const msg of floatingSupports(t.frame)) warn(`test ${t.id}`, `${msg} unités au-dessus du sol alors que les mains ou le bassin posent (revoir les angles)`);
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

// Protocoles : fiches connues, durées valides, dernière variante de chaque emplacement sans matériel
const protoSeen = new Set();
const protoLines = [];
for (const p of PROTOCOLS) {
  if (protoSeen.has(p.id)) err(p.id, 'protocole : id en double');
  protoSeen.add(p.id);
  if (!isText(p.name) || !isText(p.blurb) || !isText(p.when)) err(p.id, 'protocole : name, when et blurb sont attendus');
  p.slots.forEach((slot, k) => {
    const at = `protocole.slots[${k}]`;
    if (!Number.isInteger(slot.seconds) || slot.seconds < MIN_SECONDS || slot.seconds > 300) err(p.id, `${at}.seconds : ${slot.seconds} (entier de ${MIN_SECONDS} à 300)`);
    for (const id of slot.ids) if (!MOBS.some((m) => m.id === id)) err(p.id, `${at} : fiche « ${id} » inconnue`);
    const last = MOBS.find((m) => m.id === slot.ids.at(-1));
    if (last?.tools.length) err(p.id, `${at} : la dernière variante (« ${last.id} ») demande du matériel`);
  });
  const bare = resolveProtocol(p, []);
  const full = resolveProtocol(p, EQUIPMENT.map((e) => e.id));
  protoLines.push(`${p.id.padEnd(8)} ${String(Math.round(totalSeconds(bare) / 60)).padStart(2)} min sans matériel, ${String(Math.round(totalSeconds(full) / 60)).padStart(2)} min avec tout (${full.length} fiches)`);
}

// Bilan
const perZone = ZONES.map((z) => `${String(z.id).padStart(2)} ${z.name.padEnd(20)} ${MOBS.filter((m) => m.zone === z.id).length}`);
console.log(`${MOBS.length} fiches, ${Object.keys(MOTIONS).length} animées, ${MOBS.length - Object.keys(MOTIONS).length} fixes\n${perZone.join('\n')}\n\nProtocoles\n${protoLines.join('\n')}\n`);
for (const w of warnings) console.log(`avertissement  ${w}`);
for (const e of errors) console.log(`ERREUR         ${e}`);
console.log(`\n${errors.length} erreur(s), ${warnings.length} avertissement(s)`);
process.exit(errors.length ? 1 : 0);
