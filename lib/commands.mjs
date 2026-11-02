// Slash-command shims for harnesses whose skills are not slash commands.
//
// opencode loads skills only through its `skill` tool; typing `/gg13` there runs
// a *command*, which lives in `<base>/commands/<name>.md`. So for opencode we
// also drop a tiny command file that tells the model to load the skill, which
// makes `/gg13 <request>` behave as it does in Claude Code.
//
// The file carries a `generated_by` frontmatter marker (opencode ignores unknown
// command keys) so we only ever rewrite or delete a file we created, never a
// user's own command of the same name.
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { PLATFORMS, STACKS } from './platforms.mjs';
import { lexists } from './fsops.mjs';

const MARKER = 'generated_by: ganesh-gyan-cli';

/** Absolute command-file path for a harness + stack, or null if not needed. */
export function resolveCommandFile(ai, stack, { global = false } = {}) {
  const p = PLATFORMS[ai];
  if (!p?.commandsSub) return null;
  const base = global ? p.globalBase : join(process.cwd(), p.projectBase);
  return join(base, p.commandsSub, `${stack}.md`);
}

function commandBody(stack) {
  return [
    '---',
    `description: ${STACKS[stack].label}: load the ${stack} skill and apply it`,
    MARKER,
    '---',
    `Load the \`${stack}\` skill with the skill tool, then follow its conventions for this request:`,
    '',
    '$ARGUMENTS',
    '',
  ].join('\n');
}

/** True when the file exists and was written by this CLI. */
export async function isOurCommand(file) {
  try {
    return (await fs.readFile(file, 'utf8')).includes(MARKER);
  } catch {
    return false;
  }
}

/**
 * Write (or refresh) the command shim. Returns the path written, null when the
 * harness needs none, or { kept: path } when a foreign file of that name exists
 * and `force` is off.
 */
export async function writeCommand(ai, stack, { global = false, force = false } = {}) {
  const file = resolveCommandFile(ai, stack, { global });
  if (!file) return null;
  if ((await lexists(file)) && !force && !(await isOurCommand(file))) return { kept: file };
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, commandBody(stack));
  return file;
}

/** Delete the shim if it is ours. Returns the path removed, or null. */
export async function removeCommand(ai, stack, { global = false } = {}) {
  const file = resolveCommandFile(ai, stack, { global });
  if (!file || !(await isOurCommand(file))) return null;
  await fs.rm(file, { force: true });
  return file;
}
