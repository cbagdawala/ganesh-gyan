# Changelog

## 1.3.0 — 2026-08-16

### CLI

- **`init --link` (alias `--symlink`).** Symlinks the project skill folder at the
  global install instead of copying the pack a second time, so many projects
  share one payload and `update --global` refreshes them all at once. Creates
  the global install first when it is missing; rejected together with `--global`.
- **Windows without elevation.** A real directory symlink is attempted first and
  falls back to a junction, then to a plain copy (with a warning) if neither is
  permitted.
- **Link-safe removal.** `uninstall` and `init --force` delete the link itself and
  never recurse through it into the global install; `update` reports linked
  projects and skips them rather than overwriting the link with a copy.
- Install discovery now uses `lstat`, so a dangling link (its global install
  removed) is detected, reported, and cleanable instead of reading as "not
  installed" — and `init --link` re-seeds a global install that has gone missing.

## 1.2.0 — 2026-07-28

### CLI

- **Multi-stack architecture.** One package now hosts multiple intelligence packs:
  `gg13` (bundled) plus registered-but-planned `gg8` (Laravel 8 + webpack/Mix +
  Material), `ggci3` (CodeIgniter 3), `ggci4` (CodeIgniter 4). Each pack has its
  own bin; a new generic `gg` bin picks the stack interactively or via `--stack`.
- New `stacks` command lists packs and their availability.
- `update`/`uninstall` scan all packs; `update` migrates pre-1.2 installs from
  `skills/ganesh-gyan/` to `skills/gg13/`.
- Linter (`npm run lint:skill`) now validates every bundled pack and reports
  stack-over-common overrides.

### gg13 pack

- Skill renamed `ganesh-gyan` → `gg13`; installs to `<assistant>/skills/gg13/`.
- SKILL.md frontmatter now carries a `version` stamp.
- 16 stack-neutral files moved to the shared `assets/common/` layer (prompts,
  PR/release checklists, git/documentation/coding-standards rules, and the
  spacing/empty-states/breadcrumbs/cards/drawers UX patterns). Installs are
  unchanged: common + stack are merged into one self-contained folder.

## 1.1.1 — 2026-07

- Fixed PrimeVue 4 dark-mode option and Tailwind v4 layer order in vue.md.

## 1.1.0 — 2026-07

- Corrected outdated dependency versions.

## 1.0.0

- Initial release: `gg13` CLI installing the Ganesh Gyan skill (Laravel 13 +
  Vue 3.5 + PrimeVue 4 + Sanctum conventions) into 7 AI harnesses.
