# Migrate Layout (classic → d1)

## When to Use

When an existing gg13 project switches from the `classic` layout to `d1` (see
`../layouts/README.md`). The backend, API, services, policies and tests do not
change; only the app shell, design values and page markup do.

## Prerequisites

- The project currently resolves to `classic` (no `gg13-layout:` line, or `gg13-layout: classic`).
- Frontend tests and `vue-tsc` pass before you start, so regressions are visible.
- You have read `../layouts/d1/shell.md`, `../layouts/d1/colors.md` and the d1 blueprints for the pages you will touch.

## Step-by-Step Workflow

### 1. Declare the target, then work behind it

Add `gg13-layout: d1` to the project's agent instructions file (`CLAUDE.md` /
`AGENTS.md`) **in the same branch** as the migration, so every later step and
session reads the d1 files. Never run a project half on each layout on `main`.

### 2. Design values first

1. Replace the classic PrimeVue preset with the d1 preset (`../layouts/d1/colors.md`).
2. Replace the classic color/type/spacing tokens in `resources/css/app.css` with the d1 tokens (`../layouts/d1/colors.md`, `typography.md`, `spacing.md`), including the status palette.
3. Switch the dark-mode selector to the d1 one and update the composable that toggles it.
4. Load the d1 fonts in the Blade shell.
5. d1 uses a compact root font size: check any component sized in fixed `px` or `rem` assumptions (charts, custom widgets) after the switch.

### 3. Replace the shell

1. Add the d1 layout registry and layouts (`../layouts/d1/shell.md`): default, auth, public, error.
2. Move routes from a nested `MainLayout` parent to flat routes with `meta: { title, layout }`. Keep route names and permission slugs unchanged, so guards, links and tests keep working.
3. Replace `Sidebar`/`Header` with `AppSidebar`/`AppTopbar`, and the hard-coded nav with the menu-as-data model (`../layouts/d1/navigation.md`). The menu's permission slugs must equal the routes' slugs.
4. Delete the classic `MainLayout.vue` and shell components once no route uses them.

### 4. Migrate pages one module at a time

For each module, in this order:

| Page | Classic blueprint | d1 blueprint |
|---|---|---|
| Login / auth | `../blueprints/login.md` | `../layouts/d1/blueprints/login.md` |
| Listing | `../blueprints/listing.md` | `../layouts/d1/blueprints/listing.md` |
| Create / edit form | `../blueprints/crud-form.md` | `../layouts/d1/blueprints/crud-form.md` |
| Detail page | `../blueprints/detail-page.md` | `../layouts/d1/blueprints/detail-page.md` |

- Keep the service module and API calls; adapt only the composable/props wiring the d1 blueprint shows.
- Replace ad-hoc status `Tag`s with `StatusChip` (`../layouts/d1/components.md`).
- Pages with no d1 blueprint (dashboard, wizard, settings, reports, timeline) keep the shared blueprint's structure, restyled with d1 tokens and the `.card` / `.page-header` globals.

### 5. Verify

- [ ] `vue-tsc --noEmit` and frontend tests pass; Pest suite unchanged and green.
- [ ] Every menu entry opens its page; no two entries share a route name.
- [ ] Users without a permission see neither the menu entry nor the route (403 page).
- [ ] Light and dark mode checked on shell, list, form and detail pages.
- [ ] Sidebar collapse (desktop) and drawer (below the d1 breakpoint) work; topbar search works on mobile.
- [ ] No raw hex colors or leftover classic tokens (`--color-primary-*`) in components.
- [ ] Run `../checklists/vue-component.md` on each migrated page.

## Rollback

The migration touches frontend files only. Revert the branch (or the
`gg13-layout:` line plus the frontend commits) to return to classic; no database
or API change needs undoing.
