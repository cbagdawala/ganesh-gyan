import { bundledCommonDir, bundledStackDir, bundledStackIds, hasBundledStack } from './assets.mjs';
import { copyDir, removeDir, exists } from './fsops.mjs';
import {
  PLATFORMS,
  STACKS,
  AI_TYPES,
  isValidAI,
  isValidStack,
  resolveSkillDir,
  resolveLegacyDir,
  expandTargets,
} from './platforms.mjs';
import { spinner, added, heading, warn, error } from './logue.mjs';

// Re-copy the bundled payloads (from the installed CLI version) over any existing
// install. Harnesses come from --ai (else every harness that currently has one);
// stacks come from the bin preset (else every bundled stack found installed).
// Pre-1.2 installs at skills/ganesh-gyan are migrated to skills/gg13.
export async function update(opts = {}) {
  const ai = opts.ai;
  if (ai && !isValidAI(ai)) {
    error(`Unknown --ai "${ai}". Valid: ${AI_TYPES.join(', ')}, all`);
    process.exit(1);
  }
  if (opts.stack && !isValidStack(opts.stack)) {
    error(`Unknown stack "${opts.stack}". Valid: ${Object.keys(STACKS).join(', ')}`);
    process.exit(1);
  }

  const global = !!opts.global;
  const harnesses = ai ? expandTargets(ai) : AI_TYPES;
  const stacks = opts.stack
    ? [opts.stack].filter(hasBundledStack)
    : bundledStackIds();

  const targets = [];
  for (const t of harnesses) {
    for (const stack of stacks) {
      const dest = resolveSkillDir(t, stack, { global });
      if (await exists(dest)) targets.push({ t, stack, dest, legacy: null });
    }
    // Pre-1.2 gg13 install under the old "ganesh-gyan" name → migrate.
    if (stacks.includes('gg13')) {
      const legacy = resolveLegacyDir(t, { global });
      const dest = resolveSkillDir(t, 'gg13', { global });
      if ((await exists(legacy)) && !(await exists(dest))) {
        targets.push({ t, stack: 'gg13', dest, legacy });
      }
    }
  }

  if (!targets.length) {
    warn(
      `No existing install to update${global ? ' (global scope)' : ' in this project'}. Run "gg13 init" (or gg init) first.`,
    );
    return;
  }

  const commonSrc = bundledCommonDir();
  const spin = spinner('Updating installed skill(s)…').start();
  try {
    for (const { stack, dest, legacy } of targets) {
      const stackSrc = bundledStackDir(stack);
      if (legacy) await removeDir(legacy);
      await removeDir(dest);
      await copyDir(commonSrc, dest);
      await copyDir(stackSrc, dest);
    }
    spin.succeed('Update complete.');
  } catch (e) {
    spin.fail('Update failed.');
    error(e.message);
    process.exit(1);
  }

  heading('Updated:');
  for (const { t, stack, dest, legacy } of targets) {
    added(`${PLATFORMS[t].label} · ${stack}: ${dest}${legacy ? '  (migrated from skills/ganesh-gyan)' : ''}`);
  }
}
