import { h, icon } from '../ui.js';
import { getMob } from '../data/mobs.js';
import { renderPose } from '../diagram.js';
import * as store from '../store.js';
import { loadSettings, saveSettings } from '../settings.js';
import { stepsFor, fmtSeconds } from '../routine.js';
import { logSession } from '../sessions.js';

let teardown = null;
export function cleanup() { teardown?.(); teardown = null; }

const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const SIDE_LABELS = ['Côté gauche', 'Côté droit'];

export async function render(root) {
  const routine = await store.get('routine', null);
  if (!routine?.items?.length) {
    location.hash = '#/today';
    return;
  }
  const settings = await loadSettings();
  const steps = stepsFor(routine.items);
  let total = steps.reduce((n, s) => n + s.seconds, 0);

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

  function paintPrefs() {
    prefs.replaceChildren(
      ...[['sound', 'Son'], ['vibrate', 'Vibration']].map(([key, label]) =>
        h('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(!!settings[key]),
          onClick: () => { settings[key] = !settings[key]; saveSettings(settings); paintPrefs(); },
        }, label)),
    );
  }

  function paintStep() {
    const st = steps[i];
    const m = getMob(st.id);
    const sideLabel = m.perSide ? SIDE_LABELS[st.side] : '';
    kicker.textContent = !started ? 'Prêt ?' : st.kind === 'prep' ? st.label : (sideLabel || 'En cours');
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
      ),
    );
    counter.textContent = `Fiche ${st.mobIndex + 1} sur ${routine.items.length}`;
  }

  function paintTime() {
    const secs = Math.ceil(left / 1000);
    timer.textContent = mmss(secs);
    const before = steps.slice(0, i).reduce((n, s) => n + s.seconds * 1000, 0);
    const done = before + steps[i].seconds * 1000 - left;
    barFill.style.width = `${Math.min(100, (done / (total * 1000)) * 100)}%`;
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
    if (!started) started = true;
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
    if (seconds >= 30) {
      await logSession({ at: new Date().toISOString(), seconds, items, contexts: settings.contexts });
    }
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
        h('div', { class: 'card' },
          h('h3', null, 'Reteste'),
          h('p', { class: 'small' }, 'Refais le test de la position que tu voulais améliorer : as-tu gagné en amplitude ou en stabilité ? Sans changement visible, la zone n\'était peut-être pas la bonne.'),
        ),
        h('div', { class: 'btn-row stretch' },
          h('a', { class: 'btn primary big', href: '#/today' }, 'Retour'),
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
    h('div', { class: 'btn-row stretch' }, mainBtn, plusBtn, skipBtn),
    prefs,
    h('div', { class: 'btn-row center' }, stopBtn),
    technique,
  );
  root.append(view);
  paintPrefs();
  paintStep();
  paintTime();
}

