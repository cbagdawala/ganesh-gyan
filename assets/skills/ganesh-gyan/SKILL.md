---
name: ganesh-gyan
description: >-
  Use when building or modifying a Laravel 13 + Vue 3.5 + PrimeVue 4 + Sanctum
  application that follows the Divaa conventions — creating CRUD modules, API
  resources, the service layer, form requests, policies, jobs/events, migrations,
  Pest tests, or PrimeVue 4 UI (listings, forms, dashboards, dialogs). Routes the
  request to the matching rule, blueprint, workflow, skill guide, design-system,
  example, checklist, or ADR under references/. Also covers Sanctum auth, spatie
  permissions, import/export, search, soft-delete, and audit logging.
  Triggers: "/ganesh-gyan", "follow gg13", "build a module", "create a
  CRUD/listing/form/dashboard", "add an API endpoint/resource", "add a migration",
  "write Pest tests", "PrimeVue 4 component".
---

# Ganesh Gyan — Laravel 13 + Vue 3.5 + PrimeVue 4 conventions

A complete, opinionated knowledge base for building applications on this exact stack.
Everything lives under `references/` and is loaded **on demand** — read only the file(s)
that match the task, not the whole corpus.

## Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13 (PHP 8.3+, slim skeleton — no `Http/Kernel.php` / `Exceptions/Handler.php` / `AuthServiceProvider`) |
| Frontend | Vue 3.5 + Vite 8 (Composition API, TypeScript) |
| UI | PrimeVue 4 (Tailwind CSS 4, CSS-first `@theme`) |
| Auth | Laravel Sanctum — httpOnly cookie session for the web SPA; personal access tokens for mobile |
| Database | MySQL 8+ |
| State / Router / HTTP | Pinia 4 · Vue Router 5 · Axios (`withCredentials`) |
| Testing | Pest 4 |
| Architecture | MVC + Service Layer; Blade serves the SPA shell |

## How to use this skill

1. **Ground yourself in `references/rules/`** — coding standards, architecture, Laravel/Vue conventions, security. Read the specific rule for the area you're touching.
2. **Follow a `references/blueprints/` template** when building a page/component.
3. **Follow a `references/skills/` guide** to generate a specific artifact (controller, resource, policy, job…).
4. **Follow a `references/workflows/` process** for end-to-end features.
5. **Match `references/design-system/`** for any PrimeVue 4 UI.
6. **Verify with `references/checklists/`** before calling work done.
7. **Consult `references/decisions/` (ADRs)** for the "why" behind choices (esp. ADR-002 = Sanctum).

> Convention guardrails: Sanctum (never `tymon/jwt-auth`) with `auth:sanctum`; Laravel 11+ slim skeleton (register middleware/exceptions/providers in `bootstrap/app.php` / `bootstrap/providers.php`, policies auto-discovered); PrimeVue 4 component names (`Select`, `DatePicker`, `Textarea`, `Tabs`, `Drawer`, `Popover`) and default imports; snake_case JSON API; no tokens in `localStorage`.

## Quick reference — task → file

| Task | Read |
|---|---|
| New module from scratch | `references/workflows/create-new-module.md` |
| Implement full CRUD | `references/workflows/implement-crud.md` |
| Add a field to a resource | `references/workflows/add-new-field.md` |
| Sanctum authentication | `references/workflows/implement-authentication.md` · `references/decisions/ADR-002-authentication.md` |
| Roles / permissions | `references/workflows/implement-permissions.md` |
| File upload | `references/workflows/implement-file-upload.md` |
| Import / export | `references/workflows/implement-import-export.md` |
| Search | `references/workflows/implement-search.md` |
| Soft delete · audit log | `references/workflows/implement-soft-delete.md` · `references/workflows/implement-audit-log.md` |
| Dashboard · reports | `references/workflows/create-dashboard.md` · `references/workflows/create-report.md` |
| Optimize performance | `references/workflows/optimize-performance.md` |
| Refactor · bug fix · review · release | `references/workflows/refactor-module.md` · `bug-fixing.md` · `code-review.md` · `release-checklist.md` |

### Generate a single artifact — `references/skills/`
`create-module`, `create-listing`, `create-form`, `create-modal`, `create-dashboard`, `create-detail-page`, `create-api`, `create-resource`, `create-form-request`, `create-policy`, `create-service`, `create-action`, `create-job`, `create-event`, `create-listener`, `create-mail`, `create-notification`, `create-export`, `create-import`, `create-report`, `create-widget`, `create-chart`, `create-filter`, `create-search` → `references/skills/<name>.md`

### Build a page/component — `references/blueprints/`
`listing`, `crud-form`, `modal-form`, `detail-page`, `dashboard`, `wizard`, `settings-page`, `reports`, `login`, `profile`, `timeline` → `references/blueprints/<name>.md`

### Foundational rules — `references/rules/`
`project`, `coding-standards`, `architecture`, `laravel`, `vue`, `api`, `database`, `naming`, `validation`, `authorization`, `testing`, `performance`, `security`, `logging`, `git`, `documentation` → `references/rules/<name>.md`

### PrimeVue 4 UI — `references/design-system/`
`colors`, `typography`, `spacing`, `icons`, `buttons`, `cards`, `forms`, `tables`, `badges`, `alerts`, `dialogs`, `drawers`, `tabs`, `charts`, `breadcrumbs`, `loading`, `empty-states`, `responsive` → `references/design-system/<name>.md`

### Reference implementations — `references/examples/`
`good-controller`, `good-service`, `good-component`, `good-form`, `api-response`, `migration` → `references/examples/<name>.md`

### Checklists — `references/checklists/`
`module`, `api`, `vue-component`, `migration`, `release`, `pull-request` → `references/checklists/<name>.md`

### Existing domain modules — `references/modules/`
`products`, `inventory`, `warehouses`, `users`, `roles` → `references/modules/<name>.md`

### Reusable prompts — `references/prompts/`
`build-module`, `review-code`, `optimize-code`, `generate-tests`, `improve-ui`, `write-documentation` → `references/prompts/<name>.md`

### Architecture Decision Records — `references/decisions/`
`ADR-001-service-layer`, `ADR-002-authentication`, `ADR-003-module-structure`, `ADR-004-api-format` → `references/decisions/<name>.md`

---

When a request maps to one of the rows above, open that file first and follow it. For anything spanning multiple areas (e.g. "build a products module"), start with the workflow, then pull in the referenced blueprint/skill/design-system files as you reach each step.
