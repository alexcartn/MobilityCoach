#!/usr/bin/env python3
"""Régénère les phrases parlées de la séance guidée (audio/voice-*.mp3).

Voix : Piper (https://github.com/rhasspy/piper), modèle fr_FR-siwis-medium, jeu de données SIWIS
(Université d'Édimbourg), licence CC BY 4.0. Il faut citer cette source (voir README).

Préparation, hors du dépôt :
  python3 -m venv /tmp/tts && /tmp/tts/bin/pip install piper-tts
  curl -L -o /tmp/fr_FR-siwis-medium.onnx      https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx
  curl -L -o /tmp/fr_FR-siwis-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json
Puis : /tmp/tts/bin/python tools/make-voice.py /tmp/fr_FR-siwis-medium.onnx   (ffmpeg doit être installé)

Les noms des clips sont ceux de CLIPS dans js/sound.js. Ces phrases ne citent jamais le nom d'une fiche : elles restent
valables quand la bibliothèque grandit.
"""
import subprocess, sys, tempfile, wave
from pathlib import Path
from piper import PiperVoice, SynthesisConfig

PHRASES = {
    'first': 'Pose ton téléphone et prends la position.',
    'first_left': 'Pose ton téléphone et prends la position. Côté gauche.',
    'next': 'Position suivante.',
    'next_left': 'Position suivante. Côté gauche.',
    'last': 'Dernière position.',
    'last_left': 'Dernière position. Côté gauche.',
    'switch': 'Change de côté. Côté droit.',
    'done': "C'est terminé. Bien joué.",
}
# Silences de début et de fin coupés, volume ramené à -16 LUFS, mono, mp3 léger.
FILTER = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,'
          'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12,areverse,'
          'loudnorm=I=-16:TP=-1.5:LRA=7,apad=pad_dur=0.05')

model = sys.argv[1]
out = Path(__file__).resolve().parent.parent / 'audio'
out.mkdir(exist_ok=True)
voice = PiperVoice.load(model)
config = SynthesisConfig(length_scale=1.08)  # un peu plus lent : posé, pas pressé
with tempfile.TemporaryDirectory() as tmp:
    for name, text in PHRASES.items():
        wav = Path(tmp) / f'{name}.wav'
        with wave.open(str(wav), 'wb') as w:
            voice.synthesize_wav(text, w, syn_config=config)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-af', FILTER, '-ac', '1', '-ar', '22050',
                        '-c:a', 'libmp3lame', '-b:a', '40k', str(out / f'voice-{name}.mp3')], check=True)
        print(name, 'ok')
