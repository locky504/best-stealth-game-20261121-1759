// Shadow Vault — a midnight gallery heist (Node 22, standard library only).
//
// The entry is the static game in this directory's game/ folder: plain files a
// desktop browser loads offline (game/index.html and its ES modules, no library
// and no network request). This program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// Serve it locally first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy a directory tree, refusing symlinks (the gate wants plain files). */
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    if (statSync(src, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error(`refusing symlink: ${src}`);
    }
    cpSync(src, join(to, name), { recursive: true });
  }
}

copyTree(join(here, 'game'), join(out, 'game'));
if (existsSync(join(here, 'screenshots'))) {
  copyTree(join(here, 'screenshots'), join(out, 'screenshots'));
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Shadow Vault handed in: game/ + screenshots/ + dossier.json written to ${out}`);
