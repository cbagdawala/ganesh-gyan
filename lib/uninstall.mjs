import prompts from 'prompts';
import { removeDir, exists } from './fsops.mjs';
import {
  PLATFORMS,
  AI_TYPES,
  isValidAI,
  resolveSkillDir,
  expandTargets,
} from './platforms.mjs';
import { removed, warn, error, heading } from './logue.mjs';

export async function uninstall(opts = {}) {
  const ai = opts.ai;
  if (ai && !isValidAI(ai)) {
    error(`Unknown --ai "${ai}". Valid: ${AI_TYPES.join(', ')}, all`);
    process.exit(1);
  }

  const global = !!opts.global;
  const scan = ai ? expandTargets(ai) : AI_TYPES;

  const present = [];
  for (const t of scan) {
    const dest = resolveSkillDir(t, { global });
    if (await exists(dest)) present.push({ t, dest });
  }

  if (!present.length) {
    warn(`No Ganesh Gyan install found${global ? ' (global scope)' : ' in this project'}.`);
    return;
  }

  heading('Found:');
  for (const { t, dest } of present) console.log(`  • ${PLATFORMS[t].label}: ${dest}`);

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
  for (const { t, dest } of present) {
    await removeDir(dest);
    removed(`${PLATFORMS[t].label}: ${dest}`);
  }
  console.log('\nGanesh Gyan uninstalled.');
}
