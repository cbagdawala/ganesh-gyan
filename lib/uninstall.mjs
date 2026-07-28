import prompts from 'prompts';
import { removeDir, exists } from './fsops.mjs';
import {
  PLATFORMS,
  STACK_IDS,
  LEGACY_SKILL_NAME,
  AI_TYPES,
  isValidAI,
  isValidStack,
  resolveSkillDir,
  resolveLegacyDir,
  expandTargets,
} from './platforms.mjs';
import { removed, warn, error, heading } from './logue.mjs';

// Scan every known install location — all registered stacks (bundled or not,
// so packs installed by an older/newer CLI are still found) plus the pre-1.2
// "ganesh-gyan" dir — list them, confirm, remove.
export async function uninstall(opts = {}) {
  const ai = opts.ai;
  if (ai && !isValidAI(ai)) {
    error(`Unknown --ai "${ai}". Valid: ${AI_TYPES.join(', ')}, all`);
    process.exit(1);
  }
  if (opts.stack && !isValidStack(opts.stack)) {
    error(`Unknown stack "${opts.stack}". Valid: ${STACK_IDS.join(', ')}`);
    process.exit(1);
  }

  const global = !!opts.global;
  const harnesses = ai ? expandTargets(ai) : AI_TYPES;
  const stacks = opts.stack ? [opts.stack] : STACK_IDS;

  const present = [];
  for (const t of harnesses) {
    for (const stack of stacks) {
      const dest = resolveSkillDir(t, stack, { global });
      if (await exists(dest)) present.push({ t, name: stack, dest });
    }
    if (!opts.stack || opts.stack === 'gg13') {
      const legacy = resolveLegacyDir(t, { global });
      if (await exists(legacy)) present.push({ t, name: LEGACY_SKILL_NAME, dest: legacy });
    }
  }

  if (!present.length) {
    warn(`No install found${global ? ' (global scope)' : ' in this project'}.`);
    return;
  }

  heading('Found:');
  for (const { t, name, dest } of present) console.log(`  • ${PLATFORMS[t].label} · ${name}: ${dest}`);

  const confirm = await prompts({
    type: 'confirm',
    name: 'ok',
    message: `Remove ${present.length} install(s)?`,
    initial: false,
  });
  if (!confirm.ok) {
    warn('Cancelled.');
    return;
  }

  heading('Removed:');
  for (const { t, name, dest } of present) {
    await removeDir(dest);
    removed(`${PLATFORMS[t].label} · ${name}: ${dest}`);
  }
  console.log('\nUninstalled.');
}
