import prompts from 'prompts';
import { bundledCommonDir, bundledStackDir, bundledStackIds, hasBundledStack } from './assets.mjs';
import { copyDir, removeDir, exists } from './fsops.mjs';
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
  const commonSrc = bundledCommonDir();
  const stackSrc = bundledStackDir(stack);
  const targets = expandTargets(ai);
  const installed = [];
  const skipped = [];

  const spin = spinner(`Installing the ${stack} skill (${STACKS[stack].label})…`).start();
  try {
    for (const t of targets) {
      const dest = resolveSkillDir(t, stack, { global });
      if (await exists(dest)) {
        if (!force) {
          skipped.push({ t, dest });
          continue;
        }
        await removeDir(dest);
      }
      // Two-pass merge: common layer first, then the stack pack on top
      // (a stack file wins on any path collision).
      await copyDir(commonSrc, dest);
      await copyDir(stackSrc, dest);
      installed.push({ t, dest });
    }
    spin.succeed(`${stack} installed.`);
  } catch (e) {
    spin.fail('Installation failed.');
    error(e.message);
    process.exit(1);
  }

  if (installed.length) {
    heading('Installed:');
    for (const { t, dest } of installed) added(`${PLATFORMS[t].label}: ${dest}`);
  }
  if (skipped.length) {
    heading('Skipped (already present — pass --force to overwrite):');
    for (const { t, dest } of skipped) warn(`  • ${PLATFORMS[t].label}: ${dest}`);
  }
  if (!installed.length) return;

  heading('Next steps:');
  console.log('  1. Restart your AI coding assistant.');
  console.log(
    `  2. Invoke it — type ${chalk.cyan(`/${stack}`)} or ask, e.g. "build a module following ${stack}".`,
  );
}
