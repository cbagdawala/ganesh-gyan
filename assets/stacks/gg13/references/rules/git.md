# Git Conventions

> Builds on `references/principles/git.md` — read it first. This file covers how to apply it on Laravel 13 + Vue 3.5.

Branching, branch naming, commit types, breaking-change footers, the branch
workflow, review guidelines, merge strategies, and tagging all follow the
principles file unchanged. This file adds the Laravel/Vue specifics.

## Commit Scopes

Use the module or layer being changed. On this stack the common scopes are:

- `auth`, `user`, `order`, `product`, `cart`, `payment`, `api`, `vue`, `db`, `test`, `deps`

Use `vue` for cross-cutting frontend changes (layouts, router, shared
components, composables) and `db` for migrations, seeders, and factories that
are not tied to one module.

### Examples

```
feat(auth): add Sanctum SPA session login endpoint

fix(order): resolve race condition in stock deduction

perf(api): add eager loading for user profile queries

refactor(user): extract password reset logic into service class

docs(api): update OpenAPI spec for v1.2 endpoints

test(order): add feature tests for order cancellation flow

chore(deps): update primevue to v4.2.0
```

## Pull Requests / Merge Requirements

### PR Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Documentation
- [ ] Breaking change

## Testing
- [ ] Feature tests added/updated
- [ ] Unit tests added/updated
- [ ] All tests passing (`./vendor/bin/pest`)
- [ ] Frontend build passes (`npm run build`)

## Screenshots (if UI changes)
Attach screenshots or GIFs for Vue component changes.

## Checklist
- [ ] Code follows project conventions
- [ ] Self-reviewed code
- [ ] No sensitive data in code or logs
- [ ] Documentation updated
- [ ] Migration tested (if applicable)
```

### PR Requirements

In addition to the generic requirements (approval, green CI, up to date with
main, no conflicts), every PR must pass these checks locally and in CI:

- All tests passing: `./vendor/bin/pest`
- Frontend build passes: `npm run build`
- No linting errors: `./vendor/bin/pint --test`
- No TypeScript errors: `npm run typecheck` (runs `vue-tsc --noEmit`)

## Code Review: Stack-Specific Checks

On top of the generic review checklist, reviewers on this stack look for:

- N+1 queries (missing eager loading on Eloquent relationships)
- Unnecessary re-renders in Vue components
- Missing caching on expensive queries
- Migrations tested (if the PR includes any)

## Releases

Versioning follows semantic versioning as described in the principles file.
On this stack a **MAJOR** bump typically means removing API endpoints or
changing the Sanctum auth flow, and a **MINOR** bump means new endpoints or
new Vue components.
