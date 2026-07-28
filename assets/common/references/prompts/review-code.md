# Code Review - Prompt Template

Use this prompt when reviewing code changes, PRs, or module implementations.

---

## Prompt

```
You are performing a code review for a Laravel 13 + Vue 3 + PrimeVue 4 + MySQL + Pest + Sanctum project.

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

- [ ] Follows module structure (ADR-003): Controllers, Services, Models, Policies, Exceptions separated correctly
- [ ] Service layer contains business logic, controllers only orchestrate
- [ ] No fat controllers (logic should be in services)
- [ ] No God services (services should be single-responsibility)
- [ ] Proper dependency injection (constructor injection, not service locator)
- [ ] Interfaces for services when appropriate

### 2. Security

- [ ] Sanctum auth middleware (`auth:sanctum`) on all API routes
- [ ] Policy-based authorization on all controller actions
- [ ] No raw SQL (use Eloquent/Query Builder)
- [ ] File uploads validated for type, size, and scanned
- [ ] CSRF protection where applicable
- [ ] Input sanitization in Blade templates
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] Rate limiting on sensitive endpoints (auth, password reset, etc.)

### 3. Validation

- [ ] Form Request classes used (Store*/Update*)
- [ ] Validation rules are specific and appropriate
- [ ] Custom error messages where helpful
- [ ] File uploads validated with `mimes`, `max`, `dimensions`
- [ ] Enum types used for fixed-value fields
- [ ] Numeric fields use `numeric`, `integer`, or `decimal` rules

### 4. Database

- [ ] Migrations use proper column types (unsignedBigInteger, decimal, etc.)
- [ ] Foreign keys with appropriate cascade/restrict rules
- [ ] Indexes on foreign keys and frequently filtered columns
- [ ] Composite indexes for multi-column WHERE clauses
- [ ] Soft deletes where appropriate (audit, recovery)
- [ ] Column comments for documentation
- [ ] No N+1 query risks (eager loading with `with()`)
- [ ] Raw queries use parameterized bindings

### 5. Performance

- [ ] Eager loading used instead of lazy loading
- [ ] Pagination on list endpoints (no unbounded queries)
- [ ] `select()` to fetch only needed columns
- [ ] Chunking for bulk operations
- [ ] Caching where appropriate (with cache invalidation)
- [ ] No N+1 queries in list/detail endpoints
- [ ] Database indexes support common query patterns
- [ ] No unnecessary DB calls in loops

### 6. API Design

- [ ] Standardized response format (success/message/data)
- [ ] Proper HTTP status codes (200, 201, 204, 401, 403, 404, 422, 500)
- [ ] Consistent naming (snake_case for JSON keys, per ADR-004)
- [ ] Pagination with meta + links
- [ ] Filter parameters documented
- [ ] Versioned API routes (if applicable)

### 7. Laravel Conventions

- [ ] PSR-12 code style
- [ ] Type-hinted methods (return types + parameter types)
- [ ] Use `string()`, `int()`, `float()`, `bool()` for safe casting
- [ ] Proper use of Eloquent scopes
- [ ] Factories for test data
- [ ] Events/Listeners for side effects (notifications, logging)
- [ ] Jobs for long-running operations
- [ ] Proper error handling with custom exceptions
- [ ] No `dd()`, `dump()`, or `var_dump()` in production code

### 8. Testing (Pest)

- [ ] Tests follow BDD syntax (describe/it blocks)
- [ ] Tests cover happy path + error cases
- [ ] Tests are isolated (RefreshDatabase trait)
- [ ] Factory data used in tests (not hardcoded)
- [ ] Assertions use specific matchers, not just `assertStatus()`
- [ ] Service tests use mocked dependencies where appropriate
- [ ] No assertions on implementation details (test behavior, not structure)

### 9. Vue 3 / PrimeVue

- [ ] `<script setup lang="ts">` composition API
- [ ] Typed props and emits
- [ ] Loading states (skeletons, spinners)
- [ ] Error states (toast notifications, error messages)
- [ ] Empty states with descriptive messages
- [ ] PrimeVue components used correctly (props, events, slots)
- [ ] Responsive design (mobile-friendly)
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] No `console.log` or `debugger` statements
- [ ] Proper cleanup in `onUnmounted` (event listeners, timers)

### 10. Documentation

- [ ] PHPDoc on public methods
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
| Laravel | | |
| Testing | | |
| Vue/PrimeVue | | |
| Documentation | | |

## Actionable Recommendations

List the top 3-5 changes that should be made before merge, in order of priority.
```

---

## Quick Review (Lightweight)

For smaller changes, use this abbreviated version:

```
Review the following files for the Laravel 13 + Vue 3 + PrimeVue project:

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
Review the following PR for the Laravel 13 + Vue 3 + PrimeVue project:

**Branch**: {BRANCH_NAME}
**Base**: main
**Description**: {PR_DESCRIPTION}

Compare against main and review for:
1. All changes are intentional and necessary
2. No regressions in existing functionality
3. New code follows project conventions
4. Tests are included and passing
5. Database changes are migrations (not raw SQL in app code)
6. Vue components handle loading/error/empty states

List each change with: APPROVE / REQUEST_CHANGES / COMMENT
```
