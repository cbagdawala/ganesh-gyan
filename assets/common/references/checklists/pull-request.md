# Pull Request Review Checklist

Use this checklist when reviewing a pull request. The stack pack's `references/rules/` supply the exact tools and conventions behind each item.

---

## Checklist

### General

- [ ] PR title follows convention (e.g., `feat: add warehouse module`, `fix: resolve N+1 query`; see `references/principles/git.md`)
- [ ] PR description explains what and why (not just what code changed)
- [ ] Linked to issue/ticket
- [ ] Branch is up to date with `main`
- [ ] No merge conflicts
- [ ] Small, focused changes (one feature/fix per PR)
- [ ] Screenshot/GIF included for UI changes

### Code Review

#### Architecture

- [ ] Code follows the module structure (`references/principles/architecture.md`)
- [ ] Business logic in services, not controllers / handlers
- [ ] No fat controllers or god services
- [ ] Dependency injection used (constructor injection)
- [ ] Interfaces defined for service contracts
- [ ] New code doesn't break existing architecture

#### Security

- [ ] Authentication enforced on all new protected endpoints
- [ ] Authorization policies enforced
- [ ] No raw / string-built SQL without review
- [ ] File uploads validated (type, size, scan)
- [ ] No hardcoded secrets or credentials
- [ ] CSRF protection considered
- [ ] Output escaped for XSS prevention
- [ ] Rate limiting on sensitive endpoints

#### Database

- [ ] Migrations created (not raw SQL)
- [ ] Proper column types used
- [ ] Foreign keys defined
- [ ] Indexes added for new queries
- [ ] Migrations backward compatible (additive only)
- [ ] Soft deletes where appropriate
- [ ] No data loss risk in migrations

#### Backend

- [ ] Stack formatter / code style applied
- [ ] Types declared on all methods where the language allows
- [ ] Dedicated validation units for write actions
- [ ] Data-access layer / query builder used instead of raw queries
- [ ] No debug dumps or leftover debugging output
- [ ] Proper error handling with domain exceptions
- [ ] Events / listeners (or equivalent) for side effects
- [ ] Background jobs for long-running operations
- [ ] No unused imports or dead code

#### Frontend / UI

- [ ] Components follow the stack pack's `references/design-system/`
- [ ] Component inputs and outputs declared (typed where possible)
- [ ] Loading states present
- [ ] Error states handled
- [ ] Empty states shown
- [ ] Responsive design
- [ ] Accessibility considered (ARIA, keyboard nav)
- [ ] No leftover console logging or debugger statements
- [ ] UI component library components used correctly

#### Testing

- [ ] Tests included for new code (per the stack pack's `references/rules/testing.md`)
- [ ] Tests cover happy path + error cases
- [ ] Tests use factories / fixtures (no hardcoded data)
- [ ] Database reset between tests
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
- [ ] Doc comments on public methods
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
- [ ] Linters pass (backend and frontend, as configured in the stack)
- [ ] Type checking / static analysis passes (if the stack uses it)
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
