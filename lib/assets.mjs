// Resolve the bundled payloads that ship inside the npm tarball.
//
// Layout: assets/common/  — stack-neutral intelligence, merged into every install
//         assets/stacks/<id>/ — one folder per stack pack (SKILL.md + references/)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { STACK_IDS } from './platforms.mjs';

const here = dirname(fileURLToPath(import.meta.url)); // .../lib

// Dual candidates so it works whether lib/ sits one or two levels below the
// package root (mirrors the reference CLI's tolerance for different builds).
const ROOTS = [join(here, '..', 'assets'), join(here, '..', '..', 'assets')];

function assetsRoot() {
  const found = ROOTS.find(existsSync);
  if (!found) {
    throw new Error(
      'Bundled skill assets not found. Try reinstalling: npm i -g ganesh-gyan-cli',
    );
  }
  return found;
}

/** Stack-neutral layer copied first into every install. */
export function bundledCommonDir() {
  return join(assetsRoot(), 'common');
}

/** True when this CLI version ships the payload for a stack. */
export function hasBundledStack(stack) {
  return existsSync(join(assetsRoot(), 'stacks', stack));
}

/** Registered stacks whose payload actually ships in this release. */
export function bundledStackIds() {
  return STACK_IDS.filter(hasBundledStack);
}

/** Payload folder for one stack; throws if this release doesn't bundle it. */
export function bundledStackDir(stack) {
  const dir = join(assetsRoot(), 'stacks', stack);
  if (!existsSync(dir)) {
    throw new Error(
      `The "${stack}" intelligence pack is not bundled in this CLI version yet.`,
    );
  }
  return dir;
}
