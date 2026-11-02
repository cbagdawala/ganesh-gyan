# Git Principles

Stack-neutral principles. Your stack pack's `references/rules/git.md` shows how to apply them.

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

- `main` is always deployable. Nobody pushes to it directly.
- Branches live for days, not weeks. Merge small, merge often.
- Hide unfinished work behind a feature flag rather than keeping a long-lived branch.

### Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/{description}` | `feature/add-user-avatar` |
| Bugfix | `bugfix/{description}` | `bugfix/fix-login-redirect` |
| Hotfix | `hotfix/{description}` | `hotfix/security-patch-cve-2024-001` |
| Refactor | `refactor/{description}` | `refactor/extract-user-service` |
| Documentation | `docs/{description}` | `docs/update-api-endpoints` |
| Chore | `chore/{description}` | `chore/update-dependencies` |
| Release | `release/v{version}` | `release/v2.0.0` |

Use lowercase kebab-case. Add the ticket number when your tracker needs it: `feature/123-order-tracking`.

## Commit Message Conventions (Conventional Commits)

Format: `<type>(<scope>): <description>`

### Types

| Type | Description |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code refactoring (no feature or fix) |
| `style` | Formatting, whitespace, etc. (no logic change) |
| `docs` | Documentation only changes |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `ci` | CI/CD configuration changes |
| `build` | Build system or external dependency changes |

### Scope

The scope is the area of the codebase being affected, usually a module or layer:

- `auth`, `user`, `order`, `product`, `cart`, `payment`, `api`, `ui`, `db`, `test`, `deps`

### Description

- Imperative mood, lowercase, no trailing period: "add", not "added" or "adds".
- At most about 72 characters for the subject line.
- Add a body after a blank line when the *why* is not obvious.
- One logical change per commit. Do not mix a refactor with a feature.

### Examples

```
feat(auth): add password reset via email link

fix(order): resolve race condition in stock deduction

perf(api): batch related-record loading in user profile queries

refactor(user): extract password reset logic into service class

docs(api): update OpenAPI spec for v1.2 endpoints

test(order): add tests for order cancellation flow

chore(deps): update UI component library to the latest minor version
```

### Breaking Changes

Append `!` after the type/scope and include a `BREAKING CHANGE:` footer:

```
feat(api)!: remove deprecated v0 endpoints

BREAKING CHANGE: The /api/v0/* routes have been removed.
Migrate to /api/v1/* endpoints before upgrading.
```

## Branch Workflow

```bash
# Start from an up-to-date main
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/add-user-avatar

# Commit and push
git add <files>
git commit -m "feat(user): add avatar upload"
git push origin feature/add-user-avatar

# Rebase on main before opening or updating a PR
git fetch origin
git rebase origin/main
git push --force-with-lease origin feature/add-user-avatar
```

- Stage files deliberately. Review `git diff --staged` before committing.
- Never commit secrets, environment files, credentials, build output, or dependency folders.
- Use `--force-with-lease`, never plain `--force`, and only on your own branch.

## Pull Requests

### PR Content

Every PR description covers:

- **Description**: what changed and why.
- **Type of change**: feature, bug fix, performance, refactor, documentation, breaking change.
- **Testing**: which tests were added or updated, and confirmation that the full suite and build pass.
- **Screenshots**: for any visible UI change.
- **Checklist**: conventions followed, self-reviewed, no sensitive data, documentation updated, migrations tested.

See `checklists/pull-request.md` for the full checklist.

### PR Size

- Keep PRs small and focused: aim for under **400** changed lines.
- Split large work into a sequence of reviewable PRs.
- Self-review the diff before requesting review.

### PR Requirements

- At least 1 approval from a team member
- All CI checks passing (tests, lint, type checks, build)
- Branch is up to date with main
- No merge conflicts
- No unresolved review comments

## Code Review Guidelines

### Reviewers Should Check

- Correctness: Does the code do what it says?
- Security: Any sensitive data leaks, injection risks, or auth bypasses?
- Performance: Repeated queries in loops, unnecessary re-renders, missing caching?
- Readability: Is the code clear and self-documenting?
- Test coverage: Are tests adequate? Edge cases covered?
- Conventions: Does it follow project standards (naming, patterns)?

### Review Comments

- Be specific: reference exact lines
- Explain the "why" behind suggestions
- Use questions for suggestions: "Have you considered...?"
- Mark optional points clearly (for example, prefix with "nit:")
- Approve when confident, request changes with clear reasoning
- Authors address all requested changes before re-requesting review
- Review the code, not the person

## Merge Strategies

- **Squash merge** for feature branches (clean history on main)
- **Merge commit** for hotfixes and release branches
- Never force-push to `main`
- Delete the branch after merging

## Tags and Releases

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
git tag -a v1.2.0 -m "v1.2.0: Add order tracking feature"
git push origin v1.2.0
```

- **MAJOR**: Breaking changes (remove endpoints, change auth flow)
- **MINOR**: New features (add endpoints, add screens or components)
- **PATCH**: Bug fixes and hotfixes

Update the changelog before tagging. See `checklists/release.md`.
