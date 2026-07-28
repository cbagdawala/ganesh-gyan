# Pull Request Review Checklist

Use this checklist when reviewing a pull request for the Laravel 13 + Vue 3 + PrimeVue project.

---

## Checklist

### General

- [ ] PR title follows convention (e.g., `feat: add warehouse module`, `fix: resolve N+1 query`)
- [ ] PR description explains what and why (not just what code changed)
- [ ] Linked to issue/ticket
- [ ] Branch is up to date with `main`
- [ ] No merge conflicts
- [ ] Small, focused changes (one feature/fix per PR)
- [ ] Screenshot/GIF included for UI changes

### Code Review

#### Architecture

- [ ] Code follows module structure (ADR-003)
- [ ] Business logic in services, not controllers
- [ ] No fat controllers or god services
- [ ] Dependency injection used (constructor injection)
- [ ] Interfaces defined for service contracts
- [ ] New code doesn't break existing architecture

#### Security

- [ ] `auth:sanctum` on all new protected API routes
- [ ] Authorization policies enforced
- [ ] No raw SQL or `DB::raw()` without review
- [ ] File uploads validated (type, size, scan)
- [ ] No hardcoded secrets or credentials
- [ ] CSRF protection considered
- [ ] Input sanitized for XSS prevention
- [ ] Rate limiting on sensitive endpoints

#### Database

- [ ] Migrations created (not raw SQL)
- [ ] Proper column types used
- [ ] Foreign keys defined
- [ ] Indexes added for new queries
- [ ] Migrations backward compatible (additive only)
- [ ] Soft deletes where appropriate
- [ ] No data loss risk in migrations

#### Laravel

- [ ] PSR-12 formatting applied
- [ ] Type hints on all methods
- [ ] Form requests for validation
- [ ] Eloquent used instead of raw queries
- [ ] No `dd()`/`dump()`/`var_dump()`
- [ ] Proper error handling with custom exceptions
- [ ] Events/Listeners for side effects
- [ ] Jobs for long-running operations
- [ ] No unused imports or dead code

#### Vue 3 / PrimeVue

- [ ] `<script setup lang="ts">` used
- [ ] Props and emits typed
- [ ] Loading states present
- [ ] Error states handled
- [ ] Empty states shown
- [ ] Responsive design
- [ ] Accessibility considered (ARIA, keyboard nav)
- [ ] No `console.log` or `debugger`
- [ ] PrimeVue components used correctly

#### Testing (Pest)

- [ ] Tests included for new code
- [ ] Tests cover happy path + error cases
- [ ] Tests use factories (no hardcoded data)
- [ ] Tests use `RefreshDatabase` trait
- [ ] All tests passing
- [ ] Test names are descriptive
- [ ] No skipped tests without explanation

### Performance

- [ ] No N+1 queries introduced
- [ ] Pagination on list endpoints
- [ ] Proper indexes for new queries
- [ ] No unnecessary database calls
- [ ] Caching considered for expensive queries
- [ ] Response size appropriate
- [ ] Heavy operations moved to queues

### Documentation

- [ ] API documentation updated
- [ ] Route descriptions present
- [ ] PHPDoc on public methods
- [ ] Migration comments explain decisions
- [ ] Changelog updated

### Breaking Changes

- [ ] Breaking changes clearly documented
- [ ] Migration from old behavior documented
- [ ] API version bumped (if applicable)
- [ ] Frontend backward compatibility maintained
- [ ] Database changes are additive

### CI/CD

- [ ] CI pipeline passes
- [ ] Linting passes (`pint`, `eslint`)
- [ ] Type checking passes
- [ ] Tests pass on CI
- [ ] No new warnings

---

## Review Verdict

Choose one:

- **APPROVE** - Code is ready to merge
- **REQUEST CHANGES** - Specific changes needed before merge
- **COMMENT** - Questions or suggestions, no blocking issues

### Required Changes

List any changes that MUST be made:

1. {CHANGE_1}
2. {CHANGE_2}

### Suggestions (Optional)

List improvements that are nice to have but not blocking:

1. {SUGGESTION_1}
2. {SUGGESTION_2}

### Positive Feedback

Highlight what was done well:

1. {PRAISE_1}
2. {PRAISE_2}

---

## Reviewer Notes

- Review with fresh eyes if possible
- Focus on security, correctness, and maintainability
- Don't nitpick style (let linters handle that)
- Consider the "why" behind changes
- Suggest improvements, don't just criticize
- Acknowledge good work and clean code
