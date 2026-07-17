# Ganesh Gyan (`gg13`)

A cross-harness **Agent Skill** that teaches AI coding assistants your **Laravel 13 + Vue 3.5 + PrimeVue 4 + Sanctum** conventions — CRUD modules, API resources, the service layer, migrations, Pest tests, and a full PrimeVue 4 design system — distributed as an npm CLI that installs the skill into **Claude Code**, **opencode**, and other assistants.

Install method mirrors [`ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): a small CLI (`gg13`) copies the bundled skill into each assistant's skills folder.

## Install

```bash
npm install -g ganesh-gyan-cli
```

Then add the skill to your assistant (run inside a project for project scope, or add `--global` for all projects):

```bash
gg13 init --ai claude       # Claude Code   → .claude/skills/ganesh-gyan/
gg13 init --ai opencode     # opencode      → .opencode/skills/ganesh-gyan/
gg13 init --ai claude --global   # → ~/.claude/skills/ganesh-gyan/ (all projects)
gg13 init --ai all          # every supported assistant
gg13 init                   # auto-detect + interactive picker
```

Or without a global install:

```bash
npx ganesh-gyan-cli init --ai claude
```

Restart the assistant, then invoke it by typing `/ganesh-gyan` or just asking, e.g. *"build a products module following gg13"*. The skill's `description` also lets the model trigger it automatically on matching Laravel/Vue/PrimeVue work.

## Supported assistants

`claude` (Claude Code) · `opencode` · `cursor` · `windsurf` · `codex` · `gemini` · `antigravity` — or `all`.

Each install is self-contained: `SKILL.md` plus the full `references/` corpus is copied into `<assistant-dir>/skills/ganesh-gyan/`.

## Update

```bash
npm install -g ganesh-gyan-cli@latest
gg13 update --ai claude       # re-copy the latest bundled skill over an existing install
```

## Uninstall

```bash
gg13 uninstall --ai claude
gg13 uninstall --global
gg13 uninstall               # detect installs in the current project and confirm
```

## What's inside the skill

A thin `SKILL.md` router over a knowledge base of ~116 documents (loaded on demand):

- **rules/** — coding standards, architecture, Laravel/Vue conventions, security, testing
- **blueprints/** — page/component templates (listing, crud-form, dashboard, login…)
- **skills/** — step-by-step generators (create-module, create-api, create-policy…)
- **workflows/** — end-to-end processes (implement-crud, authentication, permissions…)
- **design-system/** — PrimeVue 4 tokens & component guidance
- **examples/**, **checklists/**, **prompts/**, **modules/**, **decisions/** (ADRs)

Conventions baked in: Laravel Sanctum auth, the Laravel 11+ slim skeleton, PrimeVue 4 component names, Vite 8 / Pinia 4 / Vue Router 5 / Pest 4 / Tailwind CSS 4, and snake_case JSON APIs.

## Commands

| Command | Description |
|---|---|
| `gg13 init [--ai <type>] [--global] [--force]` | Install the skill |
| `gg13 update [--ai <type>] [--global]` | Re-copy the bundled skill over an existing install |
| `gg13 uninstall [--ai <type>] [--global]` | Remove the skill |
| `gg13 versions` | Print the CLI version |

## License

MIT © Chintan Bagdawala
