import prompts from 'prompts';
import { removeDir, lexists, isLink, linkTarget } from './fsops.mjs';
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
import { resolveCommandFile, isOurCommand } from './commands.mjs';

// Scan every known install location — all registered stacks (bundled or not,
// so packs installed by an older/newer CLI are still found) plus the pre-1.2
// "ganesh-gyan" dir — list them, confirm, remove. Scanning uses lexists so a
// dangling link (global install already gone) is still found and cleanable;
// removeDir deletes a link itself, never the global payload behind it.
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

  const found = async (t, name, dest) =>
    (await lexists(dest))
      ? [{ t, name, dest, link: (await isLink(dest)) ? await linkTarget(dest) : null }]
      : [];

  const present = [];
  for (const t of harnesses) {
    for (const stack of stacks) {
      present.push(...(await found(t, stack, resolveSkillDir(t, stack, { global }))));
    }
    if (!opts.stack || opts.stack === 'gg13') {
      present.push(...(await found(t, LEGACY_SKILL_NAME, resolveLegacyDir(t, { global }))));
    }
    // opencode `/<stack>` shims — only files this CLI wrote.
    for (const stack of stacks) {
      const file = resolveCommandFile(t, stack, { global });
      if (file && (await isOurCommand(file))) {
        present.push({ t, name: `/${stack} command`, dest: file, link: null });
      }
    }
  }

  if (!present.length) {
    warn(`No install found${global ? ' (global scope)' : ' in this project'}.`);
    return;
  }

  const links = present.filter((p) => p.link);

  heading('Found:');
  for (const { t, name, dest, link } of present) {
    console.log(`  • ${PLATFORMS[t].label} · ${name}: ${dest}${link ? `  → ${link}` : ''}`);
  }
  if (links.length) {
    warn(`\n${links.length} of these are links — only the link is removed, the global install stays.`);
  }
  if (global) {
    warn('\nRemoving a global install leaves any project linked to it with a dangling link.');
  }

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
  for (const { t, name, dest, link } of present) {
    await removeDir(dest);
    removed(`${PLATFORMS[t].label} · ${name}: ${dest}${link ? '  (link only)' : ''}`);
  }
  console.log('\nUninstalled.');
}
