# Code Review - Prompt Template

Use this prompt when reviewing code changes, PRs, or module implementations. Stack-specific conventions come from your stack pack's `references/rules/`.

---

## Prompt

```
You are performing a code review for this project. Review against
`references/principles/` and the stack pack's `references/rules/`; where they
differ, the stack pack wins.

## Review Scope

**Files to review:**
{LIST_OF_FILES}

**Module context:** {MODULE_NAME}

## Review Criteria

Review the code against the following criteria. For each criterion, provide:
1. **Status**: PASS / WARN / FAIL
2. **Location**: File and line reference
3. **Issue**: Clear description of the problem
4. **Suggestion**: How to fix or improve

### 1. Architecture & Structure

- [ ] Follows the module structure (`references/principles/architecture.md`): entry points, services, models, policies, exceptions separated correctly
- [ ] Service layer contains business logic, entry points only orchestrate
- [ ] No fat controllers / handlers (logic should be in services)
- [ ] No god services (services should be single-responsibility)
- [ ] Proper dependency injection (constructor injection, not service locator)
- [ ] Interfaces for services when appropriate

### 2. Security

- [ ] Authentication enforced on all non-public endpoints
- [ ] Policy-based authorization on every action
- [ ] No string-built SQL (use the query builder / parameterized queries)
- [ ] File uploads validated for type, size, and scanned
- [ ] CSRF protection where applicable
- [ ] Output escaped in templates (XSS)
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Rate limiting on sensitive endpoints (auth, password reset, etc.)

### 3. Validation

- [ ] Dedicated validation units used for each write action (create / update)
- [ ] Validation rules are specific and appropriate
- [ ] Custom error messages where helpful
- [ ] File uploads validated for type, size, and dimensions
- [ ] Enumerations used for fixed-value fields
- [ ] Numeric fields validated as integer / decimal with bounds

### 4. Database

- [ ] Migrations use proper column types (unsigned keys, exact decimals, etc.)
- [ ] Foreign keys with appropriate cascade/restrict rules
- [ ] Indexes on foreign keys and frequently filtered columns
- [ ] Composite indexes for multi-column WHERE clauses
- [ ] Soft deletes where appropriate (audit, recovery)
- [ ] Column comments for documentation
- [ ] No N+1 query risks (relationships eager-loaded)
- [ ] Raw queries use parameterized bindings

### 5. Performance

- [ ] Eager loading used instead of lazy loading
- [ ] Pagination on list endpoints (no unbounded queries)
- [ ] Only needed columns selected
- [ ] Chunking for bulk operations
- [ ] Caching where appropriate (with cache invalidation)
- [ ] No N+1 queries in list/detail endpoints
- [ ] Database indexes support common query patterns
- [ ] No unnecessary DB calls in loops

### 6. API Design

- [ ] Standardized response format (success/message/data)
- [ ] Proper HTTP status codes (200, 201, 204, 401, 403, 404, 422, 500)
- [ ] Consistent JSON key naming (per `references/principles/naming.md`)
- [ ] Pagination with meta + links
- [ ] Filter parameters documented
- [ ] Versioned API routes (if applicable)

### 7. Backend Framework Conventions

- [ ] Code style matches the stack's formatter / standard
- [ ] Typed parameters and return values wherever the language allows
- [ ] Safe casting of request input
- [ ] Reusable query filters / scopes used for repeated conditions
- [ ] Factories / fixtures for test data
- [ ] Events / listeners (or equivalent) for side effects (notifications, logging)
- [ ] Background jobs for long-running operations
- [ ] Proper error handling with domain exceptions
- [ ] No debug dumps or leftover debugging output in production code

### 8. Testing

- [ ] Tests follow the stack pack's `references/rules/testing.md`
- [ ] Tests cover happy path + error cases
- [ ] Tests are isolated (database reset between tests)
- [ ] Factory data used in tests (not hardcoded)
- [ ] Assertions are specific, not just the status code
- [ ] Service tests use mocked dependencies where appropriate
- [ ] No assertions on implementation details (test behavior, not structure)

### 9. Frontend / UI

- [ ] Components follow the stack pack's `references/design-system/`
- [ ] Component inputs and outputs declared explicitly (typed where possible)
- [ ] Loading states (skeletons, spinners)
- [ ] Error states (toast notifications, error messages)
- [ ] Empty states with descriptive messages
- [ ] UI component library components used correctly (props, events, extension points)
- [ ] Responsive design (mobile-friendly)
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] No leftover console logging or debugger statements
- [ ] Proper cleanup on component teardown (event listeners, timers)

### 10. Documentation

- [ ] Doc comments on public methods
- [ ] Inline comments for complex logic
- [ ] Route descriptions
- [ ] API response examples documented
- [ ] Migration comments explaining index decisions

## Review Summary

Provide a summary table:

| Category | Status | Issues Found |
|----------|--------|-------------|
| Architecture | | |
| Security | | |
| Validation | | |
| Database | | |
| Performance | | |
| API Design | | |
| Backend Conventions | | |
| Testing | | |
| Frontend / UI | | |
| Documentation | | |

## Actionable Recommendations

List the top 3-5 changes that should be made before merge, in order of priority.
```

---

## Quick Review (Lightweight)

For smaller changes, use this abbreviated version:

```
Review the following files for this project:

{LIST_OF_FILES}

Check for:
1. Security issues (auth, authorization, SQL injection, XSS)
2. Logic errors (wrong conditions, edge cases, race conditions)
3. Performance issues (N+1 queries, unbounded loops, missing indexes)
4. Code quality (naming, structure, consistency with project conventions)

Provide specific file:line references and fix suggestions.
```

---

## Reviewing a PR

```
Review the following PR for this project:

**Branch**: {BRANCH_NAME}
**Base**: main
**Description**: {PR_DESCRIPTION}

Compare against main and review for:
1. All changes are intentional and necessary
2. No regressions in existing functionality
3. New code follows project conventions
4. Tests are included and passing
5. Database changes are migrations (not raw SQL in app code)
6. UI components handle loading/error/empty states

List each change with: APPROVE / REQUEST_CHANGES / COMMENT
```
