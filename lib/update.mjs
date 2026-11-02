import { bundledCommonDir, bundledStackDir, bundledStackIds, hasBundledStack } from './assets.mjs';
import { copyDir, removeDir, lexists, isLink, linkTarget } from './fsops.mjs';
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
import { writeCommand } from './commands.mjs';

/** Refresh (or add) the opencode `/<stack>` shim for every install found. */
async function refreshCommands(found, global) {
  const done = new Set();
  for (const { t, stack } of found) {
    const key = `${t}:${stack}`;
    if (done.has(key)) continue;
    done.add(key);
    await writeCommand(t, stack, { global });
  }
}

// Re-copy the bundled payloads (from the installed CLI version) over any existing
// install. Harnesses come from --ai (else every harness that currently has one);
// stacks come from the bin preset (else every bundled stack found installed).
// Pre-1.2 installs at skills/ganesh-gyan are migrated to skills/gg13.
// A linked install (project → global) is reported, not rewritten: updating the
// global install is what refreshes it, for every project linked to it at once.
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

  const found = [];
  for (const t of harnesses) {
    for (const stack of stacks) {
      const dest = resolveSkillDir(t, stack, { global });
      if (await lexists(dest)) {
        found.push({
          t,
          stack,
          dest,
          legacy: null,
          link: (await isLink(dest)) ? await linkTarget(dest) : null,
        });
      }
    }
    // Pre-1.2 gg13 install under the old "ganesh-gyan" name → migrate.
    if (stacks.includes('gg13')) {
      const legacy = resolveLegacyDir(t, { global });
      const dest = resolveSkillDir(t, 'gg13', { global });
      if ((await lexists(legacy)) && !(await lexists(dest))) {
        found.push({ t, stack: 'gg13', dest, legacy, link: null });
      }
    }
  }

  const linked = found.filter((f) => f.link);
  const targets = found.filter((f) => !f.link);

  if (!found.length) {
    warn(
      `No existing install to update${global ? ' (global scope)' : ' in this project'}. Run "gg13 init" (or gg init) first.`,
    );
    return;
  }

  await refreshCommands(found, global);

  if (!targets.length) {
    heading('Linked (nothing to rewrite here):');
    for (const { t, stack, dest, link } of linked) {
      console.log(`  • ${PLATFORMS[t].label} · ${stack}: ${dest} → ${link}`);
    }
    warn(`\nUpdate the global install instead: ${stacks[0] ?? 'gg'} update --global`);
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

  if (linked.length) {
    heading('Linked (skipped — update the global install to refresh these):');
    for (const { t, stack, dest, link } of linked) {
      console.log(`  • ${PLATFORMS[t].label} · ${stack}: ${dest} → ${link}`);
    }
    warn(`\n  Run: ${stacks[0] ?? 'gg'} update --global`);
  }
}
