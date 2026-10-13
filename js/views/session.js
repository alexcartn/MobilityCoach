import { h, icon } from '../ui.js';
import { getMob } from '../data/mobs.js';
import { renderPose } from '../diagram.js';
import * as store from '../store.js';
import { loadSettings, saveSettings } from '../settings.js';
import { stepsFor, fmtSeconds, zoneRoutine, painRoutine, defaultSeconds } from '../routine.js';
import { BRACE } from '../data/rules.js';
import { logSession, updateLastSession } from '../sessions.js';
import { loadAssessments, weakSides } from '../assessment.js';
import { getTest, ZONE_TEST } from '../data/tests.js';

let teardown = null;
export function cleanup() { teardown?.(); teardown = null; }

const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const SIDE_LABELS = ['Côté gauche', 'Côté droit'];

// #/session : la séance du jour. #/session/7 : séance ciblée sur la zone 7 ; #/session/mob/couch : une seule fiche ;
// #/session/pain/10 : « J'ai mal ici » (zone, amont, aval). Ces séances ne touchent pas à la séance du jour.
// Un « /library » en fin d'adresse : retour aux fiches à la fin.
const ROLE_TEXT = { center: 'sur la douleur', up: 'amont', down: 'aval' };

export async function render(root, params = []) {
  const [settings, assessments] = await Promise.all([loadSettings(), loadAssessments()]);
  const single = params[0] === 'mob' ? getMob(params[1]) : null;
  const pain = params[0] === 'pain' ? Number(params[1]) || null : null;
  const zoneId = single || pain ? null : Number(params[0]) || null;
  const routine = single
    ? { items: [{ id: single.id, seconds: defaultSeconds(single) }] }
    : pain
      ? { items: painRoutine(pain, settings.equipment, { budget: settings.duration * 60, scores: assessments.at(-1)?.scores ?? null }).items }
      : zoneId
        ? { items: zoneRoutine(zoneId, settings.equipment) }
        : await store.get('routine', null);
  const fromLibrary = !!single || !!pain || params[1] === 'library';
  const backHref = single ? `#/library/${single.zone}/${single.id}` : pain ? `#/pain/${pain}` : fromLibrary ? `#/library/${zoneId}` : '#/today';
  if (!routine?.items?.length) {
    location.hash = '#/today';
    return;
  }
  const weak = weakSides(assessments.at(-1)?.merged ?? {});
  const steps = stepsFor(routine.items, weak);
  let total = steps.reduce((n, s) => n + s.seconds, 0);

  // Test rapide avant/après sur la zone de la première fiche (note de 1 à 5, facultative).
  const testZone = getMob(routine.items[0].id).zone;
  const quickTest = getTest(ZONE_TEST[testZone]);
  let before = null;

  let i = 0;
  let running = false;
  let started = false;
  let finished = false;
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

  let wake = null;
  const acquireWake = async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch { wake = null; } };
  const releaseWake = () => { wake?.release?.().catch(() => {}); wake = null; };
  const onVisible = () => { if (!document.hidden && running) acquireWake(); };
  document.addEventListener('visibilitychange', onVisible);

  // --- Interface --------------------------------------------------------------------
  const kicker = h('p', { class: 'kicker' });
  const title = h('h1', { class: 'session-title' });
  const timer = h('div', { class: 'timer', 'aria-live': 'off' });
  const barFill = h('span');
  const bar = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Avancement de la séance' }, barFill);
  const counter = h('p', { class: 'counter-line' });
  const figure = h('div', { class: 'session-fig' });
  const cue = h('p', { class: 'cue' });
  const technique = h('div');
  const mainBtn = h('button', { type: 'button', class: 'btn primary big' }, 'Démarrer');
  const plusBtn = h('button', { type: 'button', class: 'btn big' }, '+30 s');
  const skipBtn = h('button', { type: 'button', class: 'btn big' }, 'Passer');
  const stopBtn = h('button', { type: 'button', class: 'btn danger' }, 'Arrêter');
  const view = h('div', { class: 'session' });
  const prefs = h('div', { class: 'chips center' });
  const testBox = h('div');

  function scale(current, onPick, label) {
    return h('div', { class: 'scale', role: 'group', 'aria-label': label },
      [1, 2, 3, 4, 5].map((v) => h('button', { type: 'button', 'aria-pressed': String(current === v), onClick: () => onPick(v) }, String(v))));
  }

  // Test avant : visible tant que la séance n'a pas démarré.
  function paintBefore() {
    testBox.replaceChildren();
    if (started || !quickTest) return;
    testBox.append(
      h('section', { class: 'card test-card', 'aria-labelledby': 'tb-t' },
        h('div', { class: 'head' }, h('h2', { id: 'tb-t' }, `Avant : ${quickTest.title}`), h('span', { class: 'hint' }, 'Facultatif')),
        h('p', { class: 'small', style: 'color:var(--text-2)' }, quickTest.intro),
        scale(before, (v) => { before = v; paintBefore(); }, 'Note de la position, de 1 à 5'),
        h('div', { class: 'scale-labels' }, h('span', null, 'Très limité'), h('span', null, 'Facile')),
      ),
    );
  }

  function paintPrefs() {
    prefs.replaceChildren(
      ...[['sound', 'Son'], ['vibrate', 'Vibration']].map(([key, label]) =>
        h('button', {
          type: 'button', class: 'chip quiet', 'aria-pressed': String(!!settings[key]),
          onClick: () => { settings[key] = !settings[key]; saveSettings(settings); paintPrefs(); },
        }, label)),
    );
  }

  function paintStep() {
    const st = steps[i];
    const m = getMob(st.id);
    const sideLabel = m.perSide ? SIDE_LABELS[st.side] : '';
    const bonus = m.perSide && ((weak[m.zone] === 'l' && st.side === 0) || (weak[m.zone] === 'r' && st.side === 1)) ? ' · +30 s, côté plus raide' : '';
    kicker.textContent = !started ? 'Prêt ?' : st.kind === 'prep' ? st.label : ((sideLabel + bonus) || 'En cours');
    title.textContent = m.name;
    figure.replaceChildren(renderPose({ ...m.frames[0], facing: st.side === 1 ? -1 : 1, label: m.name }));
    cue.textContent = st.kind === 'prep'
      ? `${sideLabel ? sideLabel + ' : ' : ''}${m.cue}`
      : m.cue;
    technique.replaceChildren(
      h('div', { class: 'list acc flat' },
        h('details', null,
          h('summary', null,
            h('span', { class: 'acc-title' }, 'Voir la technique'),
            icon('chevronDown', 20, 'chev'),
          ),
          h('div', { class: 'acc-body' },
            h('ol', null, m.steps.map((t) => h('li', null, t))),
            m.caution && h('p', { class: 'note' }, m.caution),
          ),
        ),
        h('details', null,
          h('summary', null,
            h('span', { class: 'acc-title' }, BRACE.title),
            icon('chevronDown', 20, 'chev'),
          ),
          h('div', { class: 'acc-body' },
            h('p', null, BRACE.intro),
            h('ol', null, BRACE.steps.map((b) => h('li', null, h('b', null, `${b.name} : `), b.text))),
          ),
        ),
      ),
    );
    const role = routine.items[st.mobIndex].role;
    counter.textContent = `Fiche ${st.mobIndex + 1} sur ${routine.items.length}${role ? ` · ${ROLE_TEXT[role]}` : ''}`;
  }

  function paintTime() {
    const secs = Math.ceil(left / 1000);
    timer.textContent = mmss(secs);
    const before = steps.slice(0, i).reduce((n, s) => n + s.seconds * 1000, 0);
    const done = before + steps[i].seconds * 1000 - left;
    barFill.style.transform = `scaleX(${Math.min(1, done / (total * 1000))})`;
    bar.setAttribute('aria-valuenow', String(Math.round((done / (total * 1000)) * 100)));
    mainBtn.textContent = !started ? 'Démarrer' : running ? 'Pause' : 'Reprendre';
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
    if (running) endAt = Date.now() + left;
    lastShown = null;
    paintStep();
    paintTime();
    if (signal) {
      beep(steps[n].kind === 'work' ? 988 : 660, 220);
      buzz(steps[n].kind === 'work' ? [200] : [80, 60, 80]);
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
    paintBefore();
    running = true;
    endAt = Date.now() + left;
    acquireWake();
    beep(988, 200);
    paintStep();
    paintTime();
  }

  mainBtn.addEventListener('click', () => {
    if (!started) return start();
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
    if (!started) { started = true; paintBefore(); }
    advance();
  });

  stopBtn.addEventListener('click', () => {
    if (!started || confirm('Arrêter la séance ? Le temps déjà travaillé sera enregistré.')) {
      recordWork();
      finish(true);
    }
  });

  async function finish(stopped) {
    if (finished) return;
    finished = true;
    running = false;
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
        kind: single ? 'mob' : pain ? 'pain' : zoneId ? 'zone' : 'daily',
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
    if (!stopped) { beep(1175, 400); buzz([300, 100, 300]); }
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
          h('a', { class: 'btn primary big', href: backHref }, single ? 'Retour à la fiche' : pain ? 'Retour au plan' : fromLibrary ? 'Retour aux fiches' : 'Retour'),
          h('a', { class: 'btn big', href: '#/progress' }, 'Mon suivi'),
        ),
      ),
    );
  }

  teardown = () => {
    clearInterval(tick);
    releaseWake();
    document.removeEventListener('visibilitychange', onVisible);
    audio?.close?.().catch(() => {});
  };

  view.append(
    h('section', { class: 'hero session-hero', 'aria-label': 'Minuteur' },
      kicker, title, timer, bar, counter,
    ),
    figure,
    cue,
    h('p', { class: 'hint reminder' }, 'Visage détendu, respiration calme. Inconfort oui, douleur vive non.'),
    testBox,
    h('div', { class: 'btn-row stretch' }, mainBtn, plusBtn, skipBtn),
    h('p', { class: 'hint reminder' }, 'Tant que ça s\'améliore, tu peux rester plus longtemps, jusqu\'à 10 minutes.'),
    prefs,
    h('div', { class: 'btn-row center' }, stopBtn),
    technique,
  );
  root.append(view);
  paintPrefs();
  paintBefore();
  paintStep();
  paintTime();
}

