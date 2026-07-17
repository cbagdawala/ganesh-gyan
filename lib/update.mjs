import { bundledSkillDir } from './assets.mjs';
import { copyDir, removeDir, exists } from './fsops.mjs';
import {
  PLATFORMS,
  AI_TYPES,
  isValidAI,
  resolveSkillDir,
  expandTargets,
} from './platforms.mjs';
import { spinner, added, heading, warn, error } from './logue.mjs';

// Re-copy the bundled skill (from the installed CLI version) over any existing
// install. Targets come from --ai, else every harness that currently has one.
export async function update(opts = {}) {
  const ai = opts.ai;
  if (ai && !isValidAI(ai)) {
    error(`Unknown --ai "${ai}". Valid: ${AI_TYPES.join(', ')}, all`);
    process.exit(1);
  }

  const global = !!opts.global;
  const candidates = ai ? expandTargets(ai) : AI_TYPES;

  const targets = [];
  for (const t of candidates) {
    const dest = resolveSkillDir(t, { global });
    if (await exists(dest)) targets.push({ t, dest });
  }

  if (!targets.length) {
    warn(
      `No existing Ganesh Gyan install to update${global ? ' (global scope)' : ' in this project'}. Run "gg13 init" first.`,
    );
    return;
  }

  const src = bundledSkillDir();
  const spin = spinner('Updating the Ganesh Gyan skill…').start();
  try {
    for (const { dest } of targets) {
      await removeDir(dest);
      await copyDir(src, dest);
    }
    spin.succeed('Ganesh Gyan updated.');
  } catch (e) {
    spin.fail('Update failed.');
    error(e.message);
    process.exit(1);
  }

  heading('Updated:');
  for (const { t, dest } of targets) added(`${PLATFORMS[t].label}: ${dest}`);
}
