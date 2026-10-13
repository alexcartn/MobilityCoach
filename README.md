# Supple Leopard

PWA de coaching mobilité, inspirée de *Becoming a Supple Leopard* (Kelly Starrett). Français, hors ligne, données locales sans compte.

App en ligne : https://alexcartn.github.io/MobilityCoach/

## Développement

Aucun build : JavaScript natif, servi tel quel par GitHub Pages depuis `master` (racine).

```
python3 -m http.server 8000      # puis http://localhost:8000
node tools/stamp.mjs             # AVANT chaque commit : met à jour la version du cache hors ligne
python3 tools/make-icons.py      # régénère les icônes (Pillow)
```

Sans `node tools/stamp.mjs`, les téléphones gardent l'ancienne version en cache.

## Contenu

Les textes sont des reformulations. Le livre (epub, pdf) ne doit jamais être commité : `.gitignore` le bloque.
