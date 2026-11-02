# AI Project Rules

This directory contains the complete AI ruleset for the **Laravel 13 + Vue 3 + PrimeVue 4 + MySQL + Pest + Sanctum** project.

## Stack Overview

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 13 (PHP 8.3+) |
| Frontend | Vue 3.5 + Vite 8 (Composition API, TypeScript) |
| UI Library | PrimeVue 4 (Tailwind CSS 4) |
| Database | MySQL |
| Auth | Laravel Sanctum (httpOnly cookie session for the SPA; personal access tokens for mobile) |
| Testing | Pest 4 |
| State Management | Pinia 4 |
| Router | Vue Router |
| HTTP Client | Axios (`withCredentials` for Sanctum cookies) |
| Architecture | MVC + Service Layer, Blade serves SPA shell |

## Directory Structure

```
.ai/
├── README.md                       # You are here
│
├── principles/                     # Stack-neutral principles (shared by every pack)
│   ├── architecture.md · authorization.md · coding-standards.md
│   ├── documentation.md · git.md · logging.md · naming.md
│   └── performance.md · security.md · testing.md · validation.md · ui.md
│
├── rules/                          # Laravel 13 + Vue 3.5 rules (addenda to principles/)
│   ├── project.md                  # Tech stack and project overview
│   ├── coding-standards.md         # SOLID, DRY, KISS, YAGNI
│   ├── architecture.md             # Overall architecture
│   ├── laravel.md                  # Laravel conventions
│   ├── vue.md                      # Vue 3 conventions
│   ├── api.md                      # API response standards
│   ├── database.md                 # Database rules
│   ├── naming.md                   # Naming conventions
│   ├── validation.md               # Validation standards
│   ├── authorization.md            # Policies & permissions
│   ├── testing.md                  # Pest standards
│   ├── performance.md              # Optimization rules
│   ├── security.md                 # Security practices
│   ├── logging.md                  # Logging conventions
│   ├── git.md                      # Branching & commits
│   └── documentation.md            # Documentation expectations
│
├── design-system/                  # UI design system tokens
│   ├── colors.md
│   ├── typography.md
│   ├── spacing.md
│   ├── icons.md
│   ├── buttons.md
│   ├── cards.md
│   ├── forms.md
│   ├── tables.md
│   ├── badges.md
│   ├── alerts.md
│   ├── dialogs.md
│   ├── drawers.md
│   ├── tabs.md
│   ├── charts.md
│   ├── breadcrumbs.md
│   ├── loading.md
│   ├── empty-states.md
│   └── responsive.md
│
├── blueprints/                     # Page/component templates
│   ├── listing.md
│   ├── crud-form.md
│   ├── modal-form.md
│   ├── detail-page.md
│   ├── dashboard.md
│   ├── wizard.md
│   ├── settings-page.md
│   ├── reports.md
│   ├── login.md
│   ├── profile.md
│   └── timeline.md
│
├── skills/                         # Code generation guides
│   ├── create-module.md
│   ├── create-listing.md
│   ├── create-form.md
│   ├── create-modal.md
│   ├── create-dashboard.md
│   ├── create-detail-page.md
│   ├── create-api.md
│   ├── create-resource.md
│   ├── create-form-request.md
│   ├── create-policy.md
│   ├── create-service.md
│   ├── create-action.md
│   ├── create-job.md
│   ├── create-event.md
│   ├── create-listener.md
│   ├── create-mail.md
│   ├── create-notification.md
│   ├── create-export.md
│   ├── create-import.md
│   ├── create-report.md
│   ├── create-widget.md
│   ├── create-chart.md
│   ├── create-filter.md
│   └── create-search.md
│
├── workflows/                      # End-to-end processes
│   ├── create-new-module.md
│   ├── add-new-field.md
│   ├── implement-crud.md
│   ├── create-dashboard.md
│   ├── create-report.md
│   ├── implement-authentication.md
│   ├── implement-permissions.md
│   ├── implement-file-upload.md
│   ├── implement-import-export.md
│   ├── implement-search.md
│   ├── implement-soft-delete.md
│   ├── implement-audit-log.md
│   ├── optimize-performance.md
│   ├── refactor-module.md
│   ├── bug-fixing.md
│   ├── code-review.md
│   ├── release-checklist.md
│   └── documentation-update.md
│
├── modules/                        # Existing module definitions
│   ├── products.md
│   ├── inventory.md
│   ├── warehouses.md
│   ├── users.md
│   ├── roles.md
│   └── ...
│
├── examples/                       # Reference code examples
│   ├── good-controller.md
│   ├── good-service.md
│   ├── good-component.md
│   ├── good-form.md
│   ├── api-response.md
│   └── migration.md
│
├── prompts/                        # Reusable AI prompts
│   ├── build-module.md
│   ├── review-code.md
│   ├── optimize-code.md
│   ├── generate-tests.md
│   ├── improve-ui.md
│   └── write-documentation.md
│
├── checklists/                     # Verification checklists
│   ├── module.md
│   ├── api.md
│   ├── vue-component.md
│   ├── migration.md
│   ├── release.md
│   └── pull-request.md
│
└── decisions/                      # Architecture Decision Records
    ├── ADR-001-service-layer.md
    ├── ADR-002-authentication.md
    ├── ADR-003-module-structure.md
    └── ADR-004-api-format.md
```

## How to Use

1. **Start with principles/ + rules/** - `principles/<topic>.md` states the stack-neutral rule; `rules/<topic>.md` shows how to apply it on this stack (read both for security, authorization, validation, logging, performance, testing, naming, architecture, coding-standards, documentation, git)
2. **Use blueprints/** - Follow templates when creating new pages/components
3. **Use skills/** - Follow step-by-step guides when generating specific code artifacts
4. **Use workflows/** - Follow end-to-end processes for complex features
5. **Reference examples/** - Look at reference implementations for patterns
6. **Use checklists/** - Verify completeness before marking work done
7. **Read decisions/** - Understand architectural choices and their rationale

## Quick Reference

| Task | Use |
|------|-----|
| New module from scratch | `workflows/create-new-module.md` |
| Add a field to existing resource | `workflows/add-new-field.md` |
| Create a CRUD | `workflows/implement-crud.md` |
| Implement Sanctum auth | `workflows/implement-authentication.md` |
| Add file upload | `workflows/implement-file-upload.md` |
| Fix a bug | `workflows/bug-fixing.md` |
| Review code | `workflows/code-review.md` |
| Prepare release | `workflows/release-checklist.md` |
