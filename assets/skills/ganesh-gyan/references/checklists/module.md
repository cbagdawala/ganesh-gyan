# Module Completion Checklist

Use this checklist before marking any module as complete.

---

## Checklist

### Backend

- [ ] **Controllers**
  - [ ] All CRUD endpoints implemented
  - [ ] Constructor dependency injection used
  - [ ] `authorize()` called on every action
  - [ ] Form requests used for validation
  - [ ] Standardized response format (success/message/data)
  - [ ] Proper HTTP status codes (200, 201, 204, 422, 403, 401)
  - [ ] No business logic in controllers (moved to services)
  - [ ] Routes registered in module routes file
  - [ ] Routes prefixed and grouped correctly

- [ ] **Services**
  - [ ] Service interface defined
  - [ ] Business logic extracted from controllers
  - [ ] Dependencies injected via constructor
  - [ ] Methods have return type hints
  - [ ] Complex operations wrapped in `DB::transaction()`
  - [ ] Custom exceptions for domain-specific errors
  - [ ] Service methods are single-responsibility

- [ ] **Models**
  - [ ] `$fillable` or `$guarded` defined
  - [ ] `$casts` defined for all non-string columns
  - [ ] Relationships defined with correct types
  - [ ] Scopes defined for common query patterns
  - [ ] Accessors/mutators defined if needed
  - [ ] `SoftDeletes` trait included where appropriate
  - [ ] Factory defined for test data
  - [ ] Polymorphic relations indexed correctly

- [ ] **Policies**
  - [ ] Policy class created for each model
  - [ ] All actions have policy methods
  - [ ] Policy logic matches authorization rules
  - [ ] Policy auto-discovered by naming convention (or registered via `Gate::policy()` in `AppServiceProvider::boot()` if it deviates) — there is no `AuthServiceProvider` in the Laravel 11+ slim skeleton

- [ ] **Database**
  - [ ] Migrations created with proper column types
  - [ ] Foreign keys defined with correct cascade/restrict
  - [ ] Indexes on foreign keys and filtered columns
  - [ ] Composite indexes for multi-column queries
  - [ ] Column comments for documentation
  - [ ] Soft deletes where appropriate
  - [ ] `down()` methods properly reverse changes
  - [ ] Migrations run without errors (`php artisan migrate`)

- [ ] **Validation**
  - [ ] Form request classes for all create/update endpoints
  - [ ] Validation rules are specific (not generic `required`)
  - [ ] File uploads validated (type, size, dimensions)
  - [ ] Enum rules for fixed-value fields
  - [ ] Custom error messages where helpful

- [ ] **Testing (Pest)**
  - [ ] Controller tests for all endpoints
  - [ ] Service tests for all public methods
  - [ ] Form request tests for validation rules
  - [ ] Model tests for scopes and relationships
  - [ ] Tests use `RefreshDatabase` trait
  - [ ] Tests use factories (no hardcoded data)
  - [ ] Tests cover happy path + error cases
  - [ ] All tests pass (`./vendor/bin/pest`)
  - [ ] Test coverage > 80%

### Frontend

- [ ] **Vue Components**
  - [ ] `<script setup lang="ts">` used
  - [ ] Props typed with interface
  - [ ] Emits typed with interface
  - [ ] Loading states (skeletons, spinners)
  - [ ] Error states (toast notifications)
  - [ ] Empty states (descriptive messages)
  - [ ] PrimeVue components used correctly
  - [ ] Responsive layout (mobile-friendly)
  - [ ] No `console.log` or `debugger` statements

- [ ] **Pinia Stores**
  - [ ] Store defined for module state
  - [ ] Async actions handle loading/error states
  - [ ] State reset on navigation away
  - [ ] TypeScript types for all state

- [ ] **TypeScript**
  - [ ] Types defined for API responses
  - [ ] Types defined for form data
  - [ ] Types defined for component props/params
  - [ ] No `any` types (use proper interfaces)

- [ ] **Navigation**
  - [ ] Routes registered in Vue router
  - [ ] Navigation guards check permissions
  - [ ] Breadcrumbs reflect current location
  - [ ] Back navigation works correctly

### Security

- [ ] `auth:sanctum` middleware on all protected API routes
- [ ] Policy-based authorization on all actions
- [ ] No hardcoded secrets or API keys
- [ ] File uploads validated and sanitized
- [ ] SQL injection protected (Eloquent/Query Builder only)
- [ ] XSS protected (Blade `{{ }}` escaping, not `{!! !!}`)
- [ ] Rate limiting on sensitive endpoints

### Performance

- [ ] No N+1 queries (all relationships eager loaded)
- [ ] Pagination on list endpoints
- [ ] `select()` used to fetch only needed columns
- [ ] Database indexes support common queries
- [ ] Caching where appropriate
- [ ] Heavy operations moved to Jobs
- [ ] API responses minimized (only needed fields)

### Code Quality

- [ ] PSR-12 formatting applied
- [ ] PHPStan/Pint passes with no errors
- [ ] ESLint/Prettier passes on Vue files
- [ ] Consistent naming conventions
- [ ] No dead code or unused imports
- [ ] PHPDoc on public methods
- [ ] Inline comments for complex logic
- [ ] Meaningful variable/method names

### Documentation

- [ ] API endpoints documented
- [ ] Migration comments explain index decisions
- [ ] README updated with new module info
- [ ] Changelog entry for new module
- [ ] Module structure documented

---

## Sign-off

- [ ] All checks passed
- [ ] Code reviewed by peer
- [ ] Tests passing on CI
- [ ] Deployed to staging and verified
- [ ] Product owner approved
