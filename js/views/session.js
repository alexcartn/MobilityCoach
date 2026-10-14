import { h, icon } from '../ui.js';
import { getMob } from '../data/mobs.js';
import { mountFigure } from '../motion.js';
import * as store from '../store.js';
import { loadSettings, saveSettings } from '../settings.js';
import { stepsFor, fmtSeconds, zoneRoutine, painRoutine, defaultSeconds } from '../routine.js';
import { BRACE } from '../data/rules.js';
import { logSession, updateLastSession } from '../sessions.js';
import { loadAssessments, weakSides } from '../assessment.js';
import { getTest, ZONE_TEST } from '../data/tests.js';
import { getProtocol, resolveProtocol } from '../data/protocols.js';

let teardown = null;
export function cleanup() { teardown?.(); teardown = null; }

const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const SIDE_LABELS = ['Côté gauche', 'Côté droit'];

// #/session : la séance du jour. #/session/7 : séance ciblée sur la zone 7 ; #/session/mob/couch : une seule fiche ;
// #/session/pain/10 : « J'ai mal ici » (zone, amont, aval) ; #/session/protocol/wake : une séance prête (js/data/protocols.js).
// Ces séances ne touchent pas à la séance du jour.
// Un « /library » en fin d'adresse : retour à la zone à la fin.
// L'écran tient dans la fenêtre : minuteur en haut, schéma au milieu, barre d'action fixe en bas (Démarrer toujours sous le pouce).
// La technique, le gainage, le son, la voix et l'enchaînement sont dans une fenêtre « Technique ».
// Par défaut (réglage `flow`), une seule pression sur « Démarrer » : ensuite tout s'enchaîne seul, téléphone posé au loin :
// compte à rebours « Prépare-toi » avant chaque fiche, changement de côté, bips, vibration et voix. Sans `flow`, chaque
// fiche attend ton appui sur « Démarrer » ; seul le changement de côté (5 s) s'enchaîne seul.
const ROLE_TEXT = { center: 'Sur la douleur', up: 'Amont', down: 'Aval' };

export async function render(root, params = []) {
  const [settings, assessments] = await Promise.all([loadSettings(), loadAssessments()]);
  const single = params[0] === 'mob' ? getMob(params[1]) : null;
  const pain = params[0] === 'pain' ? Number(params[1]) || null : null;
  const protocol = params[0] === 'protocol' ? getProtocol(params[1]) : null;
  const zoneId = single || pain || protocol ? null : Number(params[0]) || null;
  const routine = single
    ? { items: [{ id: single.id, seconds: defaultSeconds(single) }] }
    : protocol
      ? { items: resolveProtocol(protocol, settings.equipment) }
      : pain
      ? { items: painRoutine(pain, settings.equipment, { budget: settings.duration * 60, scores: assessments.at(-1)?.scores ?? null }).items }
      : zoneId
        ? { items: zoneRoutine(zoneId, settings.equipment) }
        : await store.get('routine', null);
  const fromLibrary = !!single || !!pain || !!protocol || params[1] === 'library';
  const backHref = single ? `#/library/${single.zone}/${single.id}` : protocol ? `#/protocol/${protocol.id}` : pain ? `#/pain/${pain}` : fromLibrary ? `#/library/${zoneId}` : '#/today';
  if (!routine?.items?.length) {
    location.hash = '#/today';
    return;
  }
  const weak = weakSides(assessments.at(-1)?.merged ?? {});
  let flow = settings.flow !== false; // l'enchaînement automatique est la règle ; on peut le couper avant de démarrer
  let steps = stepsFor(routine.items, weak, { flow });
  let total = steps.reduce((n, s) => n + s.seconds, 0);
  root.classList.add('has-bar');

  // Test rapide avant/après sur la zone de la première fiche (note de 1 à 5, facultative).
  const testZone = getMob(routine.items[0].id).zone;
  const quickTest = getTest(ZONE_TEST[testZone]);
  let before = null;

  let i = 0;
  let running = false;
  let started = false;
  let finished = false;
  let ready = true; // avant le premier appui sur « Démarrer » (et, sans enchaînement, au début de chaque fiche)
  let endAt = 0;
  let left = steps[0].seconds * 1000;
  let lastShown = null;
  const worked = {}; // id -> secondes réellement travaillées

  // --- Son, vibration, écran allumé -------------------------------------------------
  let audio;
  const beep = (freq = 880, ms = 120) => {
    if (!settings.sound) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + ms / 1000);
    } catch { /* pas de son : tant pis */ }
  };
  const buzz = (pattern) => { if (settings.vibrate) navigator.vibrate?.(pattern); };
  // La voix annonce la suite : téléphone posé au loin, on sait quoi faire sans regarder l'écran.
  const say = (text) => {
    if (!settings.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      speechSynthesis.speak(u);
    } catch { /* pas de voix : les bips restent */ }
  };

  let wake = null;
  const acquireWake = async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch { wake = null; } };
  const releaseWake = () => { wake?.release?.().catch(() => {}); wake = null; };
  const onVisible = () => { if (!document.hidden && started && !finished) acquireWake(); };
  document.addEventListener('visibilitychange', onVisible);

  // --- Interface --------------------------------------------------------------------
  const closeBtn = h('button', { type: 'button', class: 'round-btn', 'aria-label': 'Arrêter la séance' }, icon('close'));
  const infoBtn = h('button', { type: 'button', class: 'round-btn', 'aria-label': 'Technique et réglages' }, icon('info'));
  const counter = h('b');
  const remain = h('span');
  const segs = h('div', { class: 'segs', 'aria-hidden': 'true', style: `grid-template-columns: repeat(${routine.items.length}, minmax(0, 1fr))` },
    routine.items.map(() => h('span')));
  const status = h('p', { class: 's-status', role: 'status' });
  const timer = h('div', { class: 'timer', 'aria-hidden': 'true' });
  const barFill = h('span');
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Avancement de la position' }, barFill);
  const title = h('h1', { class: 's-title' });
  const tags = h('div', { class: 'badges s-tags' });
  const figure = h('div', { class: 's-fig' });
  let fig = null; // le schéma de la fiche en cours : il s'anime en permanence
  const cue = h('p', { class: 's-cue' });
  const techBtn = h('button', { type: 'button', class: 'btn ghost-link s-tech' }, 'Voir la technique');
  const nextLine = h('p', { class: 's-next' });
  const testBox = h('div');
  const prefs = h('div', { class: 'chips' });
  const flowBox = h('div', { class: 'section', style: 'gap:var(--space-xs)' });
  const sheetBody = h('div', { class: 'sheet-body' });
  const sheet = h('dialog', { class: 'sheet', 'aria-labelledby': 'sh-t' }, sheetBody);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // un appui sur le fond ferme
  const mainBtn = h('button', { type: 'button', class: 'btn primary big s-go' }, 'Démarrer');
  const plusBtn = h('button', { type: 'button', class: 'btn' }, '+30 s');
  const skipBtn = h('button', { type: 'button', class: 'btn' }, 'Passer');
  const view = h('div', { class: 'session live' });

  function scale(current, onPick, label) {
    return h('div', { class: 'scale compact', role: 'group', 'aria-label': label },
      [1, 2, 3, 4, 5].map((v) => h('button', { type: 'button', 'aria-pressed': String(current === v), onClick: () => onPick(v) }, String(v))));
  }

  // Test avant : une ligne, tant que la séance n'a pas démarré.
  function paintBefore() {
    testBox.replaceChildren();
    if (started || !quickTest) return;
    testBox.append(
      h('section', { class: 's-test', 'aria-label': `Avant : ${quickTest.title}` },
        h('div', { class: 'head' }, h('b', null, `Avant : ${quickTest.title}`), h('span', { class: 'hint' }, '1 limité · 5 facile · facultatif')),
        scale(before, (v) => { before = v; paintBefore(); }, 'Note de la position, de 1 à 5'),
      ),
    );
  }

  function paintPrefs() {
    prefs.replaceChildren(
      ...[['sound', 'Son'], ['vibrate', 'Vibration'], ['voice', 'Voix']].map(([key, label]) =>
        h('button', {
          type: 'button', class: 'chip quiet', 'aria-pressed': String(!!settings[key]),
          onClick: () => { settings[key] = !settings[key]; saveSettings(settings); paintPrefs(); },
        }, label)),
    );
    flowBox.replaceChildren(...[
      h('h3', { class: 'section-label' }, 'Enchaînement'),
      h('div', { class: 'chips' },
        h('button', {
          type: 'button', class: 'chip quiet', 'aria-pressed': String(flow), disabled: started,
          onClick: () => setFlow(!flow),
        }, 'Enchaînement auto')),
      h('p', { class: 'hint' }, flow
        ? 'Les fiches et les côtés s\'enchaînent seuls : pose ton téléphone, le son et la voix te guident.'
        : 'Chaque fiche attend ton appui sur « Démarrer ».'),
      started ? h('p', { class: 'hint' }, 'À choisir avant de démarrer.') : null,
    ].filter(Boolean)); // replaceChildren natif écrirait « null » pour une valeur vide
  }

  // Avant de démarrer seulement : les étapes sont recalculées depuis le début.
  function setFlow(on) {
    if (started) return;
    flow = on;
    settings.flow = on;
    saveSettings(settings);
    steps = stepsFor(routine.items, weak, { flow });
    total = steps.reduce((n, s) => n + s.seconds, 0);
    i = 0;
    left = steps[0].seconds * 1000;
    ready = true;
    lastShown = null;
    paintPrefs();
    paintStep();
    paintTime();
  }

  // La fenêtre « Technique » : les étapes, la mise en garde, le gainage, le son et la vibration.
  function paintSheet(m) {
    sheetBody.replaceChildren(...[
      h('div', { class: 'sheet-head' },
        h('h2', { id: 'sh-t' }, m.name),
        h('button', { type: 'button', class: 'round-btn', 'aria-label': 'Fermer', onClick: () => sheet.close() }, icon('close'))),
      h('section', { class: 'section', style: 'gap:var(--space-xs)' },
        h('h3', { class: 'section-label' }, 'Technique'),
        h('ol', { class: 'step-list' }, m.steps.map((t) => h('li', null, h('span', null, t))))),
      m.caution ? h('p', { class: 'callout warn' }, icon('warn'), h('span', null, m.caution)) : null,
      h('details', { class: 'sheet-fold' },
        h('summary', null, h('span', null, BRACE.title), icon('chevronDown', 20, 'chev')),
        h('p', { class: 'hint' }, BRACE.intro),
        h('ol', null, BRACE.steps.map((b) => h('li', null, h('b', null, `${b.name} : `), b.text)))),
      h('section', { class: 'section', style: 'gap:var(--space-xs)' },
        h('h3', { class: 'section-label' }, 'Pendant la séance'),
        h('p', { class: 'hint' }, 'Visage détendu, respiration calme. Inconfort oui, douleur vive non. Tant que ça s\'améliore, tu peux rester plus longtemps : +30 s.'),
        prefs),
      flowBox,
    ].filter(Boolean));
  }

  function paintStep() {
    const st = steps[i];
    const m = getMob(st.id);
    const sideLabel = m.perSide ? SIDE_LABELS[st.side] : '';
    const role = routine.items[st.mobIndex].role;
    title.textContent = m.name;
    tags.replaceChildren(...[
      sideLabel && h('span', { class: 'badge accent' }, sideLabel),
      st.bonus ? h('span', { class: 'badge' }, `+${st.bonus} s · côté plus raide`) : null,
      role ? h('span', { class: 'badge' }, ROLE_TEXT[role]) : null,
    ].filter(Boolean));
    fig?.destroy();
    fig = mountFigure(figure, m, { facing: st.side === 1 ? -1 : 1, label: m.name });
    cue.textContent = m.cue;
    counter.textContent = `Fiche ${st.mobIndex + 1} sur ${routine.items.length}`;
    [...segs.children].forEach((seg, n) => { seg.className = n < st.mobIndex ? 'done' : n === st.mobIndex ? 'cur' : ''; });
    paintSheet(m);
  }

  function paintTime() {
    const st = steps[i];
    const blockMs = st.seconds * 1000;
    timer.textContent = mmss(Math.ceil(left / 1000));
    barFill.style.transform = `scaleX(${Math.min(1, Math.max(0, 1 - left / blockMs))})`;
    const doneMs = steps.slice(0, i).reduce((n, x) => n + x.seconds * 1000, 0) + blockMs - left;
    remain.textContent = `reste ${Math.max(1, Math.ceil((total * 1000 - doneMs) / 60000))} min`;
    const state = ready ? 'ready' : st.kind === 'setup' ? 'setup' : st.kind === 'prep' ? 'switch' : running ? 'run' : 'pause';
    status.dataset.state = state;
    status.textContent = {
      ready: flow ? 'Prêt ? Tout s\'enchaîne seul' : started ? 'Fiche suivante : prêt ?' : 'Prêt ?',
      setup: 'Prépare-toi',
      switch: `Change de côté : ${SIDE_LABELS[st.side].toLowerCase()}`,
      run: 'En cours',
      pause: 'En pause',
    }[state];
    mainBtn.textContent = ready ? 'Démarrer' : running ? 'Pause' : 'Reprendre';
    skipBtn.textContent = i === steps.length - 1 ? 'Terminer' : 'Passer';
    techBtn.hidden = !ready; // avant de démarrer, on peut relire la technique ; en cours, seul le minuteur compte
    // En cours : la suite en une ligne, lisible de loin.
    const next = routine.items[st.mobIndex + 1];
    nextLine.hidden = ready || state === 'setup';
    nextLine.textContent = next ? `Ensuite : ${getMob(next.id).name}` : 'Dernière fiche';
  }

  // --- Logique du minuteur ------------------------------------------------------------
  function recordWork() {
    const st = steps[i];
    if (st.kind !== 'work') return;
    worked[st.id] = (worked[st.id] || 0) + (st.seconds * 1000 - left) / 1000;
  }

  function go(n, signal = true) {
    i = n;
    left = steps[n].seconds * 1000;
    // Enchaînement : seul le tout début attend ton appui. Sinon, chaque nouvelle fiche attend ton « Démarrer ».
    ready = flow ? n === 0 && !started : steps[n].kind === 'work' && steps[n].side === 0;
    if (ready) running = false;
    else if (running) endAt = Date.now() + left;
    lastShown = null;
    paintStep();
    paintTime();
    if (signal) {
      const st = steps[n];
      beep(st.kind === 'work' ? 988 : 660, 220);
      buzz(st.kind === 'work' ? [200] : [80, 60, 80]);
      const m = getMob(st.id);
      if (st.kind === 'setup') say(`${m.name}${m.perSide ? `, ${SIDE_LABELS[st.side].toLowerCase()}` : ''}`);
      else if (st.kind === 'prep') say(`Change de côté, ${SIDE_LABELS[st.side].toLowerCase()}`);
    }
  }

  function advance() {
    recordWork();
    if (i + 1 < steps.length) go(i + 1);
    else finish(false);
  }

  const tick = setInterval(() => {
    if (!running) return;
    left = Math.max(0, endAt - Date.now());
    const secs = Math.ceil(left / 1000);
    if (secs !== lastShown) {
      lastShown = secs;
      paintTime();
      if (secs > 0 && secs <= 3) beep(660, 80);
    }
    if (left <= 0) advance();
  }, 200);

  function start() {
    started = true;
    ready = false;
    running = true;
    endAt = Date.now() + left;
    acquireWake();
    beep(988, 200);
    if (flow) say(`${getMob(steps[0].id).name}${getMob(steps[0].id).perSide ? `, ${SIDE_LABELS[steps[0].side].toLowerCase()}` : ''}. Pose ton téléphone et prends la position.`);
    paintBefore();
    paintPrefs();
    paintTime();
  }

  mainBtn.addEventListener('click', () => {
    if (ready) return start();
    if (running) {
      left = Math.max(0, endAt - Date.now());
      running = false;
    } else {
      running = true;
      endAt = Date.now() + left;
      acquireWake();
    }
    paintTime();
  });

  plusBtn.addEventListener('click', () => {
    steps[i].seconds += 30;
    total += 30;
    left += 30000;
    if (running) endAt += 30000;
    paintTime();
  });

  skipBtn.addEventListener('click', () => {
    const wasReady = ready;
    if (!started) { started = true; paintBefore(); paintPrefs(); }
    if (wasReady) { // fiche pas encore commencée : on la saute en entier
      const next = steps.findIndex((x) => x.mobIndex > steps[i].mobIndex);
      if (next < 0) return finish(false);
      if (flow) { running = true; acquireWake(); } // l'enchaînement continue sur la fiche suivante
      return go(next);
    }
    advance();
  });

  closeBtn.addEventListener('click', () => {
    if (!started) { location.hash = backHref; return; }
    if (confirm('Arrêter la séance ? Le temps déjà travaillé sera enregistré.')) {
      recordWork();
      finish(true);
    }
  });

  const openSheet = () => (sheet.showModal ? sheet.showModal() : sheet.setAttribute('open', ''));
  infoBtn.addEventListener('click', openSheet);
  techBtn.addEventListener('click', openSheet);

  async function finish(stopped) {
    if (finished) return;
    finished = true;
    running = false;
    fig?.destroy();
    clearInterval(tick);
    releaseWake();
    const items = Object.entries(worked)
      .map(([id, seconds]) => ({ id, seconds: Math.round(seconds) }))
      .filter((it) => it.seconds >= 10);
    const seconds = items.reduce((n, it) => n + it.seconds, 0);
    const logged = seconds >= 30;
    if (logged) {
      await logSession({
        at: new Date().toISOString(), seconds, items, contexts: settings.contexts,
        kind: single ? 'mob' : protocol ? 'protocol' : pain ? 'pain' : zoneId ? 'zone' : 'daily',
        ...(quickTest && before ? { test: { id: quickTest.id, zone: testZone, before } } : {}),
      });
    }
    const afterBox = h('div');
    function paintAfter(after) {
      afterBox.replaceChildren();
      if (!logged || !quickTest) return;
      const gain = before && after ? after - before : null;
      afterBox.append(
        h('section', { class: 'card test-card', 'aria-labelledby': 'ta-t' },
          h('div', { class: 'head' }, h('h2', { id: 'ta-t' }, `Après : ${quickTest.title}`), h('span', { class: 'hint' }, 'Facultatif')),
          scale(after ?? null, async (v) => {
            await updateLastSession({ test: { id: quickTest.id, zone: testZone, before, after: v } });
            paintAfter(v);
          }, 'Note de la position, de 1 à 5'),
          h('div', { class: 'scale-labels' }, h('span', null, 'Très limité'), h('span', null, 'Facile')),
          gain !== null
            ? h('p', { class: 'strong', role: 'status' }, gain > 0 ? `+${gain} point${gain > 1 ? 's' : ''} par rapport au test avant.` : gain === 0 ? 'Même note qu\'avant : continue, ça demande souvent plusieurs séances.' : `${gain} point${gain < -1 ? 's' : ''} par rapport au test avant.`)
            : after ? h('p', { class: 'hint', role: 'status' }, 'Note enregistrée.') : null,
        ),
      );
    }
    paintAfter(null);
    if (!stopped) { beep(1175, 400); buzz([300, 100, 300]); say('Séance terminée'); }
    root.replaceChildren(
      h('div', { class: 'session done' },
        h('header', { class: 'page-head' },
          h('span', { class: 'eyebrow' }, 'Séance'),
          h('h1', { class: 'page-title' }, stopped ? 'Séance arrêtée' : 'Séance terminée'),
        ),
        h('div', { class: 'card accent' },
          h('p', { class: 'strong' }, seconds >= 30 ? `${fmtSeconds(Math.round(seconds / 10) * 10)} de travail enregistrées.` : 'Trop court pour être enregistré.'),
          h('ul', { class: 'bullets' }, items.map((it) => h('li', null, `${getMob(it.id).name} : ${fmtSeconds(it.seconds)}`))),
        ),
        afterBox,
        h('div', { class: 'card' },
          h('h3', null, 'Reteste'),
          h('p', { class: 'small' }, 'Refais le test de la position que tu voulais améliorer : as-tu gagné en amplitude ou en stabilité ? Sans changement visible, la zone n\'était peut-être pas la bonne.'),
        ),
        h('div', { class: 'btn-row stretch' },
          h('a', { class: 'btn primary big', href: backHref }, single ? 'Retour à la fiche' : protocol ? 'Retour à la séance' : pain ? 'Retour au plan' : fromLibrary ? 'Retour à la zone' : 'Retour'),
          h('a', { class: 'btn big', href: '#/progress' }, 'Mon suivi'),
        ),
      ),
    );
  }

  teardown = () => {
    fig?.destroy();
    clearInterval(tick);
    releaseWake();
    if (sheet.open) sheet.close();
    document.removeEventListener('visibilitychange', onVisible);
    audio?.close?.().catch(() => {});
    try { speechSynthesis?.cancel(); } catch { /* rien à couper */ }
  };

  view.append(
    h('div', { class: 's-top' },
      closeBtn,
      h('div', { class: 's-prog' }, h('div', { class: 'meta-line' }, counter, remain), segs),
      infoBtn),
    h('section', { class: 'hero s-timer', 'aria-label': 'Minuteur' }, status, timer, bar),
    h('section', { class: 's-stage' }, title, tags, figure, cue, techBtn, nextLine, testBox),
    sheet,
  );
  root.append(view, h('div', { class: 'bottom-bar session-bar' }, h('div', null, plusBtn, mainBtn, skipBtn)));
  paintPrefs();
  paintBefore();
  paintStep();
  paintTime();
}
