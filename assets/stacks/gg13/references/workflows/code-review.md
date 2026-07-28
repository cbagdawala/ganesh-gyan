# Code Review

## When to Use

Before merging code, after implementing features, or when reviewing someone else's work. Covers security, performance, correctness, testing, and naming conventions.

## Prerequisites

- Code changes ready for review (branch, PR, or local changes)
- Understanding of project standards and conventions

## Step-by-Step Review Checklist

### 1. Security Review

- [ ] No hardcoded secrets, API keys, or passwords
- [ ] Input validation on all user inputs
- [ ] SQL injection prevented (using Eloquent/parameterized queries)
- [ ] XSS prevention (escaped output in Vue templates)
- [ ] CSRF tokens present for state-changing requests
- [ ] Authorization enforced on all protected routes
- [ ] Rate limiting on login/auth endpoints
- [ ] File upload validation (type, size, path traversal)
- [ ] No sensitive data in logs
- [ ] HTTPS enforced in production
- [ ] Sanctum auth enforced (`auth:sanctum`); stateful SPA requests validated via session + CSRF
- [ ] CORS configured correctly for API
- [ ] No mass assignment vulnerabilities (fillable defined)
- [ ] Password hashing used (bcrypt/argon2)

### 2. Performance Review

- [ ] No N+1 queries (use eager loading)
- [ ] Database indexes on filtered/sorted columns
- [ ] Pagination on list endpoints
- [ ] Caching used for expensive repeated queries
- [ ] No heavy operations in request handlers (use queues)
- [ ] Select only needed columns
- [ ] Proper use of `chunk()` for large datasets
- [ ] No `dd()` or `dump()` in production code
- [ ] Image optimization / lazy loading
- [ ] API response size reasonable

### 3. Correctness Review

- [ ] Business logic matches requirements
- [ ] Edge cases handled (empty input, null values, large data)
- [ ] Error handling with proper HTTP status codes
- [ ] Validation rules comprehensive
- [ ] Transactions used for multi-step operations
- [ ] Soft delete behavior correct (if applicable)
- [ ] Date/time handling consistent (UTC)
- [ ] File operations safe (no overwrites without backup)
- [ ] Idempotent operations where possible

### 4. Testing Review

- [ ] Unit tests for business logic
- [ ] Feature tests for API endpoints
- [ ] Tests cover happy path and error cases
- [ ] Tests are isolated (no shared state)
- [ ] Tests use factories instead of hardcoded data
- [ ] Tests run independently
- [ ] No skipped tests without justification
- [ ] Test coverage > 80% for new code
- [ ] Pest tests follow convention

### 5. Code Quality & Naming

- [ ] Variables and methods descriptive
- [ ] Single Responsibility Principle followed
- [ ] No dead code or commented-out blocks
- [ ] Consistent indentation and formatting
- [ ] PSR-12 compliance for PHP
- [ ] ESLint/Prettier compliance for Vue/JS
- [ ] No magic numbers (use named constants)
- [ ] Proper use of type hints
- [ ] Return types declared
- [ ] PHPDoc on public methods
- [ ] Vue component naming follows convention

### 6. Architecture Review

- [ ] Follows project directory structure
- [ ] Proper separation of concerns
- [ ] Services for business logic
- [ ] Controllers only handle HTTP layer
- [ ] Policies for authorization
- [ ] Form Requests for validation
- [ ] Resources for API transformation
- [ ] Queue jobs for heavy operations

## Review Commands

```bash
# Check for common issues
rg -n "dd\(" app/          # Find dd() calls
rg -n "die\(" app/         # Find die() calls
rg -n "password" app/      # Find hardcoded passwords
rg -n "apiKey" app/        # Find hardcoded API keys

# Run linter
php artisan lint
npx eslint resources/js/
npm run lint

# Check code style
composer run lint
npm run format:check
```

## Artisan Commands Reference

```bash
# Run tests
php artisan test
php artisan test --coverage

# Lint PHP
php artisan lint

# Format check
composer run format:check
npm run lint

# Security scan
composer require tightenco/laravel-debugbar --dev
php artisan debugbar:clear
```

## Review Output Template

```markdown
## Code Review Summary

### Security
- [ ] All checks passed / Issues found: ...

### Performance
- [ ] All checks passed / Issues found: ...

### Correctness
- [ ] All checks passed / Issues found: ...

### Testing
- [ ] All checks passed / Issues found: ...

### Code Quality
- [ ] All checks passed / Issues found: ...

### Changes Requested
1. ...
2. ...

### Approved
- [ ] Ready to merge / Needs changes
```

## Verification Checklist

- [ ] All security items checked
- [ ] All performance items checked
- [ ] All correctness items checked
- [ ] All testing items checked
- [ ] All code quality items checked
- [ ] Review documented
- [ ] Changes requested communicated
- [ ] Tests passing after review
