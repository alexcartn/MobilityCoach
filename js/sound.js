// Sons de la séance guidée : cloches synthétisées (trois styles) et courtes phrases préenregistrées.
// Tout passe par Web Audio : pas de clic au début ni à la fin d'une note, et le service worker peut servir les fichiers
// depuis le cache (une balise <audio> demanderait des réponses partielles que Safari exige).

export const SOUND_THEMES = [
  { id: 'bol', label: 'Bol' },
  { id: 'cloche', label: 'Cloche' },
  { id: 'bois', label: 'Bois' },
];

// Un timbre : une note de base et ses harmoniques [rapport de fréquence, amplitude, durée du déclin en s].
const TIMBRES = {
  bol: { root: 261.63, attack: 0.012, shimmer: 1.004, partials: [[1, 1, 2.6], [2.76, 0.38, 1.5], [5.4, 0.16, 0.7]] }, // bol chantant : grave, résonant
  cloche: { root: 523.25, attack: 0.004, partials: [[1, 1, 1.9], [2, 0.45, 1.3], [3, 0.22, 0.8], [4.2, 0.1, 0.5]] }, // clair, cristallin
  bois: { root: 392, attack: 0.003, partials: [[1, 1, 0.55], [4, 0.32, 0.16], [9.2, 0.08, 0.07]] }, // marimba : court, doux
};

// Chaque signal est une petite phrase de notes sur une gamme pentatonique : [demi-tons, retard en s, volume, longueur].
const CUES = {
  start: [[0, 0, 1, 1.2], [7, 0.22, 0.9, 1]], // la séance s'ouvre : deux notes qui montent
  setup: [[4, 0, 0.9, 0.8], [7, 0.2, 1, 1]], // prépare-toi : deux notes qui montent
  go: [[0, 0, 1.1, 1.4]], // la position commence : une note grave et longue
  switch: [[7, 0, 0.9, 0.8], [2, 0.22, 0.9, 0.8]], // change de côté : deux notes qui descendent
  tick: [[12, 0, 0.35, 0.25]], // les trois dernières secondes : un toc discret
  end: [[0, 0, 1, 1.3], [4, 0.24, 0.9, 1.1], [7, 0.48, 0.9, 1.1], [12, 0.72, 1, 1.8]], // fin : accord arpégié
};

// Retard conseillé avant d'enchaîner une phrase parlée : le temps que la cloche s'éteigne.
const VOICE_DELAY = { first: 1.4, next: 1.2, last: 1.2, switch: 0.8, done: 2 };
const CLIPS = ['first', 'first_left', 'next', 'next_left', 'last', 'last_left', 'switch', 'done'];
const PEAK = 0.3; // niveau d'une note seule, avant le compresseur

// Joue un signal sur n'importe quel contexte audio (réel ou hors ligne) : voir tools/ et les tests.
export function playCue(ctx, out, name, themeId, at = ctx.currentTime) {
  const timbre = TIMBRES[themeId] ?? TIMBRES.bol;
  for (const [semi, delay, gain, length] of CUES[name] ?? []) strike(ctx, out, at + delay, semi, timbre, gain, length);
}

function strike(ctx, out, t, semi, timbre, gain, length) {
  const f0 = timbre.root * 2 ** (semi / 12);
  for (const [ratio, amp, decay] of timbre.partials) {
    const f = f0 * ratio;
    if (f > 9000) continue;
    const voices = timbre.shimmer && ratio === 1 ? [1, timbre.shimmer] : [1]; // deux battements : le « wah » d'un bol
    const span = decay * length;
    for (const detune of voices) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * detune;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime((amp * gain * PEAK) / voices.length, t + timbre.attack);
      env.gain.setTargetAtTime(0, t + timbre.attack, span / 4); // déclin exponentiel : 2 % du niveau au bout de `span`
      osc.connect(env).connect(out);
      osc.start(t);
      osc.stop(t + timbre.attack + span * 1.6);
    }
  }
}

export function createSound(settings) {
  let ctx = null;
  let master = null;
  let voiceNode = null;
  const bytes = new Map(); // nom -> Promise<ArrayBuffer | null>
  const decoded = new Map(); // nom -> Promise<AudioBuffer | null>

  function ensure() {
    if (ctx) return ctx;
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iPhone : le son passe même en mode silencieux
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createDynamicsCompressor(); // garde un niveau fort sans saturer quand plusieurs notes se superposent
      master.threshold.value = -12;
      master.ratio.value = 5;
      master.attack.value = 0.003;
      master.release.value = 0.25;
      master.connect(ctx.destination);
    } catch {
      ctx = null; // pas de son : la séance continue en silence
    }
    return ctx;
  }

  const fetchClip = (name) => {
    if (!bytes.has(name)) {
      bytes.set(name, fetch(`audio/voice-${name}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null));
    }
    return bytes.get(name);
  };

  function clip(name) {
    if (!decoded.has(name)) {
      decoded.set(name, fetchClip(name).then((buf) => {
        const c = ensure();
        if (!buf || !c) return null;
        return new Promise((resolve) => c.decodeAudioData(buf.slice(0), resolve, () => resolve(null)));
      }));
    }
    return decoded.get(name);
  }

  return {
    // À appeler depuis un appui : les navigateurs n'autorisent le son qu'après un geste.
    unlock() {
      ensure()?.resume?.();
      if (settings.voice) CLIPS.forEach((n) => clip(n));
    },
    resume() { ctx?.resume?.(); },
    cue(name, themeId = settings.soundTheme) {
      if (!settings.sound) return;
      const c = ensure();
      if (!c) return;
      c.resume?.();
      playCue(c, master, name, themeId, c.currentTime + 0.02);
    },
    // Phrase préenregistrée (voir tools/make-voice.py) : `name` est un clip, `delay` laisse la cloche s'éteindre.
    async say(name, delay = VOICE_DELAY[name.replace(/_left$/, '')] ?? 0.9) {
      if (!settings.voice) return;
      const c = ensure();
      if (!c) return;
      c.resume?.();
      const buffer = await clip(name);
      if (!buffer) return;
      try { voiceNode?.stop(); } catch { /* déjà finie */ }
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.connect(master);
      src.start(c.currentTime + delay);
      voiceNode = src;
    },
    destroy() {
      try { voiceNode?.stop(); } catch { /* déjà finie */ }
      ctx?.close?.().catch(() => {});
      ctx = null;
    },
  };
}
