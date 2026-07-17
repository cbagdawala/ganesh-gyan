// Resolve the bundled skill payload that ships inside the npm tarball.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { SKILL_NAME } from './platforms.mjs';

const here = dirname(fileURLToPath(import.meta.url)); // .../lib

// Dual candidates so it works whether lib/ sits one or two levels below the
// package root (mirrors the reference CLI's tolerance for different builds).
const CANDIDATES = [
  join(here, '..', 'assets', 'skills', SKILL_NAME),
  join(here, '..', '..', 'assets', 'skills', SKILL_NAME),
];

export function bundledSkillDir() {
  const found = CANDIDATES.find(existsSync);
  if (!found) {
    throw new Error(
      'Bundled skill assets not found. Try reinstalling: npm i -g ganesh-gyan-cli',
    );
  }
  return found;
}
