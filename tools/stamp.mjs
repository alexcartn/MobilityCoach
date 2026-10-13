// À lancer avant chaque commit : node tools/stamp.mjs
// Calcule une empreinte des fichiers de l'app, met à jour sw.js (version + liste à précacher)
// et js/version.js. Sans ça, les téléphones garderaient l'ancienne version en cache.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'tools', 'node_modules']);
const SKIP_FILES = new Set(['sw.js', 'js/version.js', 'README.md', '.gitignore', '.nojekyll']);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return SKIP_DIRS.has(name) ? [] : walk(full);
    return [relative(root, full).split(sep).join('/')];
  });
}

const files = walk(root).filter((f) => !SKIP_FILES.has(f)).sort();

const hash = createHash('sha1');
for (const f of files) hash.update(f).update(readFileSync(join(root, f)));
const version = hash.digest('hex').slice(0, 10);

// js/version.js fait partie des fichiers précachés mais pas de l'empreinte (il la contient).
const assets = ['./', ...files, 'js/version.js'].sort();

const swPath = join(root, 'sw.js');
const sw = readFileSync(swPath, 'utf8').replace(
  /\/\/ <stamp>[\s\S]*?\/\/ <\/stamp>/,
  `// <stamp>\nconst VERSION = '${version}';\nconst ASSETS = ${JSON.stringify(assets, null, 2)};\n// </stamp>`,
);
writeFileSync(swPath, sw);
writeFileSync(join(root, 'js/version.js'), `export const VERSION = '${version}';\n`);

console.log(`version ${version}, ${assets.length} fichiers précachés`);
