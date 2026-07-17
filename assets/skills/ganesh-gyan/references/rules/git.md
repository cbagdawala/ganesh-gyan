# Git Conventions

## Branching Strategy

Use **trunk-based development** with short-lived feature branches:

```
main (protected, production-ready)
├── feature/add-user-avatar
├── feature/order-tracking
├── bugfix/fix-login-redirect
├── hotfix/security-patch-cve-2024-001
└── release/v2.0.0
```

### Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/{description}` | `feature/add-user-avatar` |
| Bugfix | `bugfix/{description}` | `bugfix/fix-login-redirect` |
| Hotfix | `hotfix/{description}` | `hotfix/security-patch-cve-2024-001` |
| Refactor | `refactor/{description}` | `refactor/extract-user-service` |
| Documentation | `docs/{description}` | `docs/update-api-endpoints` |
| Chore | `chore/{description}` | `chore/update-dependencies` |

## Commit Message Conventions (Conventional Commits)

Format: `<type>(<scope>): <description>`

### Types

| Type | Description |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code refactoring (no feature or fix) |
| `style` | Formatting, missing semi colons, etc. |
| `docs` | Documentation only changes |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `ci` | CI/CD configuration changes |
| `build` | Build system or external dependency changes |

### Scope

The scope is the area of the codebase being affected:

- `auth`, `user`, `order`, `product`, `cart`, `payment`, `api`, `vue`, `db`, `test`

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

### Breaking Changes

Append `!` after the type/scope and include `BREAKING CHANGE:` footer:

```
feat(api)!: remove deprecated v0 endpoints

BREAKING CHANGE: The /api/v0/* routes have been removed.
Migrate to /api/v1/* endpoints before upgrading.
```

## Branch Workflow

### Creating a Branch

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/add-user-avatar
```

### Before Pushing

```bash
git add .
git commit -m "feat(user): add avatar upload component"
git push origin feature/add-user-avatar
```

### Keeping Branch Updated

```bash
# Rebase on main before pushing (before PR)
git fetch origin
git rebase origin/main

# Force push after rebase
git push --force-with-lease origin feature/add-user-avatar
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

- At least 1 approval from a team member
- All CI checks passing (tests, lint, build)
- Branch is up to date with main
- No merge conflicts
- All tests passing: `./vendor/bin/pest`
- Frontend build passes: `npm run build`
- No linting errors: `./vendor/bin/pint --test`
- No TypeScript errors: `npx vue-tsc --noEmit`

## Code Review Guidelines

### Reviewers Should Check

- Correctness: Does the code do what it says?
- Security: Any sensitive data leaks, injection risks, or auth bypasses?
- Performance: N+1 queries, unnecessary re-renders, missing caching?
- Readability: Is the code clear and self-documenting?
- Test coverage: Are tests adequate? Edge cases covered?
- Conventions: Does it follow project standards (naming, patterns)?

### Review Comments

- Be specific: reference exact lines
- Explain the "why" behind suggestions
- Use questions for suggestions: "Have you considered...?"
- Approve when confident, request changes with clear reasoning
- Address all requested changes before re-requesting review

## Merge Strategies

- **Squash merge** for feature branches (clean history on main)
- **Merge commit** for hotfixes and release branches
- Never force-push to `main`

## Tags and Releases

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
git tag -a v1.2.0 -m "v1.2.0: Add order tracking feature"
git push origin v1.2.0
```

- **MAJOR**: Breaking changes (remove endpoints, change auth flow)
- **MINOR**: New features (add endpoints, add components)
- **PATCH**: Bug fixes and hotfixes
