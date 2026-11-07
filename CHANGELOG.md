# Changelog

## 1.5.2 — 2026-11-07

- **README: new "gg13 layouts" section.** Covers the two layouts (`classic`,
  `d1`), choosing one with a `gg13-layout:` line, switching an existing project,
  and where the layout files are. No pack content changed.

## 1.5.1 — 2026-11-07

- **Donate link.** The README (and so the npm page) shows a PayPal "Donate"
  badge and a Support section; `package.json` has a `funding` entry, so
  `npm fund` lists it; `.github/FUNDING.yml` adds GitHub's Sponsor button.
  No pack content changed.

## 1.5.0 — 2026-11-07

UI layouts become swappable: gg13 now ships two, and each project picks one.

### gg13 pack

- **New `references/layouts/`.** A layout is the shell (layout component,
  sidebar, topbar, navigation), the design values and any page markup that
  differs from the shared blueprints. `layouts/README.md` defines how the active
  layout is chosen (`gg13-layout: <id>` in the project's `CLAUDE.md` /
  `AGENTS.md` → fingerprint → `classic`), the precedence (layout files override
  `design-system/` and `blueprints/`, never the stack conventions) and the
  folder contract.
- **`classic` layout** = the existing look, unchanged: `design-system/colors.md`,
  `typography.md` and `spacing.md` moved to `layouts/classic/`, and the navigation
  section of `design-system/responsive.md` plus the `MainLayout` wiring moved to
  the new `layouts/classic/shell.md`. Projects without a declaration keep
  getting classic.
- **New `d1` layout**, extracted from a production gg13 app and converted to gg13
  conventions (Tailwind CSS 4, `@primeuix/themes`, Sanctum): `meta.layout`
  registry, 220px sidebar + 48px topbar, menu-as-data with permission gating,
  zinc "Noir" preset with a 7-tone status palette, compact 14px density, Inter +
  JetBrains Mono for numbers; components (`StatusChip`, `ListKpi`,
  `DetailField`, `LifecycleStepper`…) and blueprints for listing (`ListPage` +
  `useListPage`), crud-form (`FormPage`), detail-page (`DocumentPanel`) and login.
- **New `workflows/migrate-layout.md`**: switching a project from classic to d1.
- `SKILL.md` resolves the active layout before any UI work and routes to
  `layouts/`; `prompts/improve-ui.md`, `rules/vue.md` and `references/README.md`
  point to it.

## 1.4.0 — 2026-11-02

Groundwork for non-Laravel packs: the common layer is now stack-neutral, and
rules are split into principle (common) and addendum (stack). The installed gg13
pack keeps every file it had (117) and gains 12.

### Common layer

- **New `references/principles/`**: stack-neutral principles for architecture,
  authorization, coding-standards, documentation, git, logging, naming,
  performance, security, testing, validation and UI. Shared by every pack.
- **Prompts and checklists rewritten stack-neutral**: the six `prompts/` and the
  `pull-request` / `release` checklists now point to the stack pack by role.
  gg13 keeps its Laravel/Vue versions as overrides at the same paths.
- **Moved to gg13**: the PrimeVue design-system files (breadcrumbs, cards,
  drawers, empty-states, spacing) and the coding-standards, documentation and
  git rules, all of which were stack-specific.
- **Lint**: `npm run lint:skill` now fails on framework, library or tool names in
  the common layer (Laravel, Vue, PrimeVue, Pest, CodeIgniter, …).

### gg13 pack

- `rules/{architecture,authorization,coding-standards,documentation,git,logging,naming,performance,security,testing,validation}.md`
  are now Laravel 13 + Vue 3.5 addenda: each opens with "Builds on
  `references/principles/<topic>.md`" and drops only generic restatements; all
  stack-specific code, config and conventions stay. `git.md` shrank most
  (190 → 94 lines), since branching and commit rules are now in principles.
- `SKILL.md` and `references/README.md` route to `principles/`.

## 1.3.3 — 2026-11-02

### CLI

- **`/gg13` works in opencode.** opencode does not expose skills as slash
  commands, so `init --ai opencode` now also writes a `commands/<stack>.md` shim
  that loads the skill. `update` refreshes or adds it, and `uninstall` removes it.
  The file is marked `generated_by: ganesh-gyan-cli`, so a user's own command of
  that name is kept unless `--force` is given. Verified on opencode 1.18.4.
- **Duplicate-skill warning.** opencode also discovers `.claude/skills` and
  `.agents/skills`, so `init` for opencode now warns when it will see more than one
  copy of the pack, which makes opencode log `duplicate skill name` and keep the
  first copy it finds (on 1.18.4 a `~/.claude` copy beat the project copy). The
  check also runs when installing for Claude Code or Antigravity after opencode.
- Verified end to end: `opencode run --command gg13 …` calls the `skill` tool with
  `gg13` before answering.
- README: new "opencode notes" section.

## 1.3.2 — 2026-09-28

### gg13 pack

- **`InputNumber` fraction props documented.** `design-system/forms.md` now
  separates three shapes: money (pad with min and max fraction digits of 2), a
  quantity (set only `max-fraction-digits`) and a whole number (set neither).
  It explains why `max-fraction-digits` controls whether `.` can be typed and
  why iOS shows no decimal key when `minFractionDigits` is missing. It also warns
  that `:min-fraction-digits="0"` does not opt out of the padding.
- **App-wide keypad fix.** A scoped global pass-through on `pcInputText` sets
  `inputmode="decimal"` only on fields that accept a fraction. Register it on the
  shared PrimeVue options used by every entry point and by the test harness.
- `skills/create-form.md`: the cents-integer price field drops the misleading
  `:min-fraction-digits="0"`.

## 1.3.1 — 2026-09-24

### gg13 pack

Fixes found by setting up a fresh Laravel 13 app strictly from gg13 guidance.
Verified together: primevue 4.5.5, @primeuix/themes 2.0.3, primeicons 8.0.2,
tailwindcss-primeui 0.6.1, tailwindcss 4.3, vite 8.3, laravel-vite-plugin 3.2,
@vitejs/plugin-vue 6.0, vue 3.5.43, vue-router 5.3, pinia 4.0, typescript 5.9.3,
vue-tsc 3.3.11.

- **`@primevue/themes` → `@primeuix/themes` `^2.0.3`.** The old package is
  deprecated on npm and was only a wrapper around `@primeuix/themes@2.0.3`; the
  API is identical, only the import path changes. 3.x is treated as the PrimeVue 5
  line and is not adopted. `rules/project.md` gains a migration note, including
  why `node_modules/.vite` must be cleared afterwards.
- **Pinned `tailwindcss-primeui` (`^0.6`) and `primeicons` (`^8.0`).** The CSS
  already loaded the plugin and every icon used `pi pi-*`, but neither package
  was listed, so the build failed and icons rendered blank. The app entry now
  imports `primeicons/primeicons.css`; `design-system/icons.md` has a Setup section.
- **`tsconfig.json` targets `resources/js/`.** The example pointed `@/*` and
  `include` at a non-existent `src/`, and lacked `vite/client` types. Added a
  `resources/js/env.d.ts` example for `VITE_*` variables, and file-path comments
  now use Laravel locations.
- **SPA catch-all route documented.** `routes/web.php` now shows the
  segment-anchored `Route::view('/{any?}', 'app')` catch-all, so deep links and
  refreshes reach Vue Router instead of Laravel's 404.
- All blueprint `package.json` snippets carry the new pins and a
  `"typecheck": "vue-tsc --noEmit"` script; the PR/release checklists point at
  `npm run typecheck`.

## 1.3.0 — 2026-08-16

### CLI

- **`init` now asks copy-or-link.** An interactive `init` with no mode flag
  prompts for how the pack should land in the project. The prompt is skipped
  when `--link`, `--copy` or `--global` already decides it, and in a
  non-interactive shell (pipe, CI) it defaults to a copy — so existing scripted
  `init --ai <type>` invocations behave exactly as before.
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
