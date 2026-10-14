# Supple Leopard

PWA de coaching mobilité, inspirée de *Becoming a Supple Leopard* (Kelly Starrett). Français, hors ligne, données locales sans compte.

App en ligne : https://alexcartn.github.io/MobilityCoach/

## Développement

Aucun build : JavaScript natif, servi tel quel par GitHub Pages depuis `master` (racine).

```
python3 -m http.server 8000      # puis http://localhost:8000
node tools/check-mobs.mjs        # contrôle les fiches (champs, matériel, schémas, mouvements) : à lancer après chaque ajout
node tools/stamp.mjs             # AVANT chaque commit : met à jour la version du cache hors ligne
python3 tools/make-icons.py      # régénère les icônes (Pillow)
```

Sans `node tools/stamp.mjs`, les téléphones gardent l'ancienne version en cache.

## Contenu

Une fiche est un objet dans `js/data/mobs-*.js` (champs : voir `tools/check-mobs.mjs`), avec 1 ou 2 poses de schéma et, si elle bouge, une entrée dans `js/data/motions.js`. Son `kind` vaut `mobilize` (par défaut), `stretch` ou `activate`. Les séances prêtes à lancer (Réveil, Avant la course, Récupération, Bureau) sont dans `js/data/protocols.js` : une liste d'emplacements, chacun avec des variantes selon le matériel.

La séance du jour est calculée par `buildRoutine` (`js/routine.js`) d'après le contexte, les sports, la durée, le matériel et le dernier bilan. Elle tourne d'un jour à l'autre : la première moitié des fiches (les mieux notées) reste fixe, le reste est tiré selon la date parmi les fiches presque aussi pertinentes (`ROTATION_MARGIN`). Le tirage ne dépend que de la date locale : le même jour redonne la même séance. Une séance modifiée à la main n'est plus recalculée.

Les textes sont des reformulations. Le livre (epub, pdf) ne doit jamais être commité : `.gitignore` le bloque.

## Polices

Bricolage Grotesque et Instrument Sans, auto-hébergées dans `fonts/` (licence SIL OFL) : l'app reste entièrement hors ligne.
