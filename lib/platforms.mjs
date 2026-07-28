// Platform (AI harness) + stack registries and skill-path resolution.
//
// Each harness discovers Agent Skills in a `<root>/skills/<name>/SKILL.md` folder.
// `projectBase` is the dir under the current project; `globalBase` is the absolute
// dir under the user's home. Most harnesses use `~/<projectBase>` for global, but a
// few (opencode) keep global skills elsewhere, so `globalBase` can override that.

import { homedir } from 'node:os';
import { join } from 'node:path';

// Pre-1.2 releases installed the single Laravel 13 pack under this name; update
// and uninstall still recognise it so old installs can be migrated to `gg13`.
export const LEGACY_SKILL_NAME = 'ganesh-gyan';

/**
 * Stack registry — one entry per intelligence pack. The pack's payload lives in
 * `assets/stacks/<id>/` and installs to `<harness>/skills/<id>/`; the id doubles
 * as the bin name and the skill name. A registered stack whose payload folder is
 * absent is "planned": its bin exists but `init` refuses with a friendly message.
 */
export const STACKS = {
  gg13:  { label: 'Laravel 13 + Vue 3.5 + PrimeVue 4 + Sanctum' },
  gg8:   { label: 'Laravel 8 + webpack (Mix) + Material theme' },
  ggci3: { label: 'CodeIgniter 3' },
  ggci4: { label: 'CodeIgniter 4' },
};

export const STACK_IDS = Object.keys(STACKS);

export function isValidStack(stack) {
  return STACK_IDS.includes(stack);
}

const HOME = homedir();

/**
 * projectBase — relative dir under the project root (process.cwd()).
 * globalBase   — absolute dir used with --global (defaults to ~/<projectBase>).
 * skillsSub    — sub-directory that holds skill folders (almost always "skills").
 */
export const PLATFORMS = {
  claude:   { label: 'Claude Code',  projectBase: '.claude',      globalBase: join(HOME, '.claude'),                   skillsSub: 'skills' },
  opencode: { label: 'opencode',     projectBase: '.opencode',    globalBase: join(HOME, '.config', 'opencode'),       skillsSub: 'skills' },
  cursor:   { label: 'Cursor',       projectBase: '.cursor',      globalBase: join(HOME, '.cursor'),                   skillsSub: 'skills' },
  windsurf: { label: 'Windsurf',     projectBase: '.windsurf',    globalBase: join(HOME, '.windsurf'),                 skillsSub: 'skills' },
  codex:    { label: 'Codex',        projectBase: '.codex',       globalBase: join(HOME, '.codex'),                    skillsSub: 'skills' },
  gemini:   { label: 'Gemini CLI',   projectBase: '.gemini',      globalBase: join(HOME, '.gemini'),                   skillsSub: 'skills' },
  antigravity: { label: 'Antigravity', projectBase: '.agents',    globalBase: join(HOME, '.agents'),                   skillsSub: 'skills' },
};

export const AI_TYPES = Object.keys(PLATFORMS);

/** Human-friendly list for prompts. */
export function platformChoices() {
  return AI_TYPES.map((value) => ({ title: `${PLATFORMS[value].label} (${value})`, value }));
}

export function isValidAI(ai) {
  return ai === 'all' || AI_TYPES.includes(ai);
}

/** Resolve the absolute skill folder for a harness + stack. */
export function resolveSkillDir(ai, stack, { global = false } = {}) {
  const p = PLATFORMS[ai];
  if (!p) throw new Error(`Unknown AI harness: ${ai}`);
  if (!STACKS[stack]) throw new Error(`Unknown stack: ${stack}`);
  const base = global ? p.globalBase : join(process.cwd(), p.projectBase);
  return join(base, p.skillsSub, stack);
}

/** Pre-1.2 install location of the gg13 pack (skills/ganesh-gyan). */
export function resolveLegacyDir(ai, { global = false } = {}) {
  const p = PLATFORMS[ai];
  if (!p) throw new Error(`Unknown AI harness: ${ai}`);
  const base = global ? p.globalBase : join(process.cwd(), p.projectBase);
  return join(base, p.skillsSub, LEGACY_SKILL_NAME);
}

/** Expand "all" into every concrete harness key. */
export function expandTargets(ai) {
  return ai === 'all' ? [...AI_TYPES] : [ai];
}
