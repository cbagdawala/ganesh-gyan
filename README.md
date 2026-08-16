# Ganesh Gyan

Cross-harness **Agent Skills** that teach AI coding assistants your stack conventions,
distributed as one npm CLI (`ganesh-gyan-cli`) with one command per **intelligence pack**:

| Command | Stack | Status |
|---|---|---|
| `gg13` | Laravel 13 + Vue 3.5 + PrimeVue 4 + Sanctum + Pest | ✅ bundled |
| `gg8` | Laravel 8 + webpack (Mix) + Material theme | 🔜 planned |
| `ggci3` | CodeIgniter 3 | 🔜 planned |
| `ggci4` | CodeIgniter 4 | 🔜 planned |
| `gg` | Generic entry — pick a stack interactively or via `--stack` | ✅ |

Each pack is a thin `SKILL.md` router over an on-demand knowledge base (rules,
blueprints, skills, workflows, design system, examples, checklists, ADRs). A shared
**common layer** (git conventions, coding-standards core, prompts, PR/release
checklists, UX patterns) is maintained once and merged into every pack at install
time, so every installed skill is fully self-contained.

Install method mirrors [`ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): the CLI copies the bundled skill into each assistant's skills folder.

## Install

```bash
npm install -g ganesh-gyan-cli
```

Then add a pack to your assistant (run inside a project for project scope, or add `--global` for all projects):

```bash
gg13 init --ai claude       # Claude Code   → .claude/skills/gg13/
gg13 init --ai opencode     # opencode      → .opencode/skills/gg13/
gg13 init --ai claude --global   # → ~/.claude/skills/gg13/ (all projects)
gg13 init --ai claude --link     # → project dir *symlinked* to the global install
gg13 init --ai all          # every supported assistant
gg13 init                   # auto-detect + interactive picker
gg init                     # generic: pick the stack interactively too
```

Or without a global install:

```bash
npx --package=ganesh-gyan-cli gg13 init --ai claude
```

Restart the assistant, then invoke the pack by typing `/gg13` or just asking, e.g. *"build a products module following gg13"*. The skill's `description` also lets the model trigger it automatically on matching work.

## Supported assistants

`claude` (Claude Code) · `opencode` · `cursor` · `windsurf` · `codex` · `gemini` · `antigravity` — or `all`.

Each install is self-contained: `SKILL.md` plus the merged `references/` corpus
(common layer + stack pack, stack file wins on collision) is copied into
`<assistant-dir>/skills/<stack>/`.

## Linked installs (`--link`)

`init --link` makes the project skill folder a **symlink to the global install**
instead of a second copy, so many projects share one pack and a single global
update refreshes all of them:

```bash
gg13 init --ai claude --link     # .claude/skills/gg13 → ~/.claude/skills/gg13
gg13 update --global             # refreshes every linked project at once
```

- If no global install exists yet, `--link` creates one and then links to it.
- `--link` and `--global` are mutually exclusive — the global install *is* the target.
- **Windows:** a real directory symlink needs Developer Mode or an elevated shell;
  otherwise a **junction** is used automatically (no privileges required). If
  neither is possible, `init` falls back to a plain copy and says so.
- Removing a link (`uninstall`, or `init --force`) only deletes the link — the
  global install and every other project linked to it are untouched.
- `update` on a linked project reports the link and skips it, pointing you at
  `update --global`.

Commit-safety note: a symlink inside `.claude/` is committable but resolves only
on machines that have the same global install, so `.gitignore` it (or keep using
plain copies) for repos shared across machines.

## Update

```bash
npm install -g ganesh-gyan-cli@latest
gg13 update --ai claude       # re-copy the latest bundled pack over an existing install
gg13 update --global          # refresh the global install (and every linked project)
```

Updating also migrates pre-1.2 installs from `skills/ganesh-gyan/` to `skills/gg13/`.

## Uninstall

```bash
gg13 uninstall --ai claude
gg13 uninstall --global
gg uninstall                 # detect installs of any pack in the current project and confirm
```

## What's inside a pack

A thin `SKILL.md` router over ~116 documents (loaded on demand). For `gg13`:

- **rules/** — coding standards, architecture, Laravel/Vue conventions, security, testing
- **blueprints/** — page/component templates (listing, crud-form, dashboard, login…)
- **skills/** — step-by-step generators (create-module, create-api, create-policy…)
- **workflows/** — end-to-end processes (implement-crud, authentication, permissions…)
- **design-system/** — PrimeVue 4 tokens & component guidance
- **examples/**, **checklists/**, **prompts/**, **modules/**, **decisions/** (ADRs)

Conventions baked in: Laravel Sanctum auth, the Laravel 11+ slim skeleton, PrimeVue 4 component names, Vite 8 / Pinia 4 / Vue Router 5 / Pest 4 / Tailwind CSS 4, and snake_case JSON APIs.

### Repository layout

```
assets/
  common/      # stack-neutral intelligence, merged into every install
  stacks/
    gg13/      # one folder per stack pack (SKILL.md + references/)
```

New packs launch thin (common layer + core rules + a few workflows) and grow.

## Commands

Every stack bin (`gg13`, `gg8`, `ggci3`, `ggci4`) supports:

| Command | Description |
|---|---|
| `<bin> init [--ai <type>] [--global] [--link] [--force]` | Install the pack (`--link` symlinks the project at the global install) |
| `<bin> update [--ai <type>] [--global]` | Re-copy the bundled pack over an existing install |
| `<bin> uninstall [--ai <type>] [--global]` | Remove the pack |
| `<bin> stacks` | List packs and availability |
| `<bin> versions` | Print the CLI version |

The generic `gg` bin adds `--stack <id>` to `init`/`update`/`uninstall`.

## License

MIT © Chintan Bagdawala
