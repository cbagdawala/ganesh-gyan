// Shared commander program. Each bin is a shim that calls run() with its preset
// stack; the generic `gg` bin passes no stack and picks one interactively (or
// via --stack).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { init } from './init.mjs';
import { uninstall } from './uninstall.mjs';
import { update } from './update.mjs';
import { AI_TYPES, STACKS, STACK_IDS } from './platforms.mjs';
import { hasBundledStack } from './assets.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));

export function run({ bin, stack = null }) {
  const program = new Command();

  const what = stack
    ? `the ${stack} skill (${STACKS[stack].label})`
    : 'a Ganesh Gyan intelligence pack';

  program
    .name(bin)
    .description(`Install ${what} into AI coding assistants.`)
    .version(pkg.version, '-v, --version', 'output the version');

  const aiHelp = `target assistant: ${AI_TYPES.join(', ')}, or "all"`;
  const withStack = (opts) => ({ ...opts, stack: stack ?? opts.stack });

  const initCmd = program
    .command('init')
    .description('Install the skill into an assistant (project scope by default)')
    .option('--ai <type>', aiHelp)
    .option('--global', 'install into your home dir (all projects) instead of the current project')
    .option('--force', 'overwrite an existing install')
    .action((opts) => init(withStack(opts)));

  const uninstallCmd = program
    .command('uninstall')
    .description('Remove the installed skill')
    .option('--ai <type>', aiHelp)
    .option('--global', 'target the home-dir (global) install')
    .action((opts) => uninstall(withStack(opts)));

  const updateCmd = program
    .command('update')
    .description('Re-install the bundled skill over existing installs')
    .option('--ai <type>', aiHelp)
    .option('--global', 'target the home-dir (global) install')
    .action((opts) => update(withStack(opts)));

  if (!stack) {
    const stackHelp = `target stack: ${STACK_IDS.join(', ')}`;
    for (const cmd of [initCmd, uninstallCmd, updateCmd]) {
      cmd.option('--stack <id>', stackHelp);
    }
  }

  program
    .command('stacks')
    .description('List the intelligence packs and their availability')
    .action(() => {
      for (const id of STACK_IDS) {
        const state = hasBundledStack(id) ? 'bundled' : 'planned';
        console.log(`  ${id.padEnd(6)} ${state.padEnd(8)} ${STACKS[id].label}`);
      }
    });

  program
    .command('versions')
    .description('Print the installed CLI version')
    .action(() => console.log(`ganesh-gyan-cli v${pkg.version}`));

  program.parseAsync(process.argv);
}
