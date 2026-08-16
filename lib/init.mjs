import prompts from 'prompts';
import { bundledCommonDir, bundledStackDir, bundledStackIds, hasBundledStack } from './assets.mjs';
import { copyDir, removeDir, linkDir, linkTarget, exists, lexists, isLink } from './fsops.mjs';
import {
  PLATFORMS,
  STACKS,
  AI_TYPES,
  isValidAI,
  isValidStack,
  resolveSkillDir,
  expandTargets,
  platformChoices,
} from './platforms.mjs';
import { detectPlatform } from './detect.mjs';
import { spinner, added, chalk, heading, error, warn } from './logue.mjs';

/** Settle on a concrete, bundled stack — from the bin preset or an interactive picker. */
async function resolveStack(preset) {
  if (preset) {
    if (!isValidStack(preset)) {
      error(`Unknown stack "${preset}". Valid: ${Object.keys(STACKS).join(', ')}`);
      process.exit(1);
    }
    if (!hasBundledStack(preset)) {
      error(
        `The ${preset} pack (${STACKS[preset].label}) is not bundled in this CLI version yet.\n` +
          `Available now: ${bundledStackIds().join(', ')}`,
      );
      process.exit(1);
    }
    return preset;
  }

  const bundled = bundledStackIds();
  if (bundled.length === 1) return bundled[0];

  const res = await prompts({
    type: 'select',
    name: 'stack',
    message: 'Install the intelligence pack for which stack?',
    choices: bundled.map((id) => ({ title: `${id} — ${STACKS[id].label}`, value: id })),
  });
  return res.stack ?? null;
}

/**
 * Settle on 'copy' or 'link' — from an explicit flag, or by asking.
 *
 * The prompt only appears when a human is there to answer it: a piped or CI
 * shell falls back to 'copy', so `gg13 init --ai claude` stays as
 * non-interactive as it was before the prompt existed.
 */
async function resolveMode(stack, { link, copy, global }) {
  if (link && copy) {
    error('--link and --copy are contradictory: pick one.');
    process.exit(1);
  }
  if (link) return 'link';
  if (copy) return 'copy';
  // With --global there is nothing to link: this install *is* the link target.
  if (global) return 'copy';
  if (!process.stdin.isTTY) return 'copy';

  const res = await prompts({
    type: 'select',
    name: 'mode',
    message: `How should the ${stack} pack be installed into this project?`,
    choices: [
      {
        title: 'Copy — self-contained, independent of any global install',
        value: 'copy',
      },
      {
        title: 'Link — symlink to the global install, refreshed by "update --global"',
        value: 'link',
      },
    ],
    initial: 0,
  });
  return res.mode ?? null;
}

export async function init(opts = {}) {
  const stack = await resolveStack(opts.stack);
  if (!stack) {
    warn('Cancelled.');
    return;
  }

  let ai = opts.ai;
  if (ai && !isValidAI(ai)) {
    error(`Unknown --ai "${ai}". Valid: ${AI_TYPES.join(', ')}, all`);
    process.exit(1);
  }

  if (!ai) {
    const suggested = detectPlatform();
    const initialIdx = suggested ? AI_TYPES.indexOf(suggested) : 0;
    const res = await prompts({
      type: 'select',
      name: 'ai',
      message: `Install the ${stack} skill for which assistant?`,
      choices: [...platformChoices(), { title: 'All of the above', value: 'all' }],
      initial: initialIdx < 0 ? 0 : initialIdx,
    });
    if (!res.ai) {
      warn('Cancelled.');
      return;
    }
    ai = res.ai;
  }

  const global = !!opts.global;
  const force = !!opts.force;

  if (opts.link && global) {
    error(
      '--link and --global are contradictory: --link points this project at the global\n' +
        'install, so the global install is the link target, not a second place to link.',
    );
    process.exit(1);
  }

  const mode = await resolveMode(stack, { link: opts.link, copy: opts.copy, global });
  if (!mode) {
    warn('Cancelled.');
    return;
  }
  const link = mode === 'link';

  const commonSrc = bundledCommonDir();
  const stackSrc = bundledStackDir(stack);
  const targets = expandTargets(ai);
  const installed = [];
  const linkedUp = [];
  const seeded = [];
  const skipped = [];

  // Two-pass merge: common layer first, then the stack pack on top
  // (a stack file wins on any path collision).
  const copyPack = async (dest) => {
    await copyDir(commonSrc, dest);
    await copyDir(stackSrc, dest);
  };

  const verb = link ? 'Linking' : 'Installing';
  const spin = spinner(`${verb} the ${stack} skill (${STACKS[stack].label})…`).start();
  try {
    for (const t of targets) {
      const dest = resolveSkillDir(t, stack, { global });

      // lexists, not exists: a dangling link is "present" even though it reads as
      // missing, and copying over it would fail.
      if (await lexists(dest)) {
        if (!force) {
          skipped.push({ t, dest, link: (await isLink(dest)) ? await linkTarget(dest) : null });
          continue;
        }
        await removeDir(dest);
      }

      if (!link) {
        await copyPack(dest);
        installed.push({ t, dest });
        continue;
      }

      // Link mode: the project points at the global install, so make sure there
      // is one to point at before creating the link.
      const target = resolveSkillDir(t, stack, { global: true });
      if (!(await exists(target))) {
        await removeDir(target); // clears a dangling link, no-op otherwise
        await copyPack(target);
        seeded.push({ t, dest: target });
      }
      try {
        const flavour = await linkDir(target, dest);
        linkedUp.push({ t, dest, target, flavour });
      } catch (e) {
        // No symlink privilege and no junction either — a copy still works.
        await copyPack(dest);
        installed.push({ t, dest, fallback: e.code || e.message });
      }
    }
    // Report what actually happened, not what was asked for: --link can still
    // end in a copy (no link privilege) or in nothing at all (already present).
    const done = [
      linkedUp.length && `linked ×${linkedUp.length}`,
      installed.length && `installed ×${installed.length}`,
      skipped.length && `skipped ×${skipped.length}`,
    ].filter(Boolean);
    spin.succeed(`${stack}: ${done.join(', ')}.`);
  } catch (e) {
    spin.fail(`${link ? 'Linking' : 'Installation'} failed.`);
    error(e.message);
    process.exit(1);
  }

  if (seeded.length) {
    heading('Global install created (link target):');
    for (const { t, dest } of seeded) added(`${PLATFORMS[t].label}: ${dest}`);
  }
  if (linkedUp.length) {
    heading('Linked:');
    for (const { t, dest, target, flavour } of linkedUp) {
      added(`${PLATFORMS[t].label}: ${dest} → ${target}${flavour === 'junction' ? '  (junction)' : ''}`);
    }
  }
  if (installed.length) {
    heading('Installed:');
    for (const { t, dest, fallback } of installed) {
      added(`${PLATFORMS[t].label}: ${dest}`);
      if (fallback) {
        warn(`    ↳ copied instead of linked (${fallback}). On Windows, enable Developer Mode`);
        warn('      or run in an elevated shell to create links.');
      }
    }
  }
  if (skipped.length) {
    heading('Skipped (already present — pass --force to overwrite):');
    for (const { t, dest, link: current } of skipped) {
      warn(`  • ${PLATFORMS[t].label}: ${dest}${current ? `  (linked → ${current})` : ''}`);
    }
  }
  if (!installed.length && !linkedUp.length) return;

  heading('Next steps:');
  console.log('  1. Restart your AI coding assistant.');
  console.log(
    `  2. Invoke it — type ${chalk.cyan(`/${stack}`)} or ask, e.g. "build a module following ${stack}".`,
  );
  if (linkedUp.length) {
    console.log(
      `  3. Refresh every linked project at once with ${chalk.cyan(`${stack} update --global`)}.`,
    );
  }
}
