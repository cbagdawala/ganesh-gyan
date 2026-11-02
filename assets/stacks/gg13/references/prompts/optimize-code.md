# Optimize Code - Prompt Template

Use this prompt when you need to analyze and optimize existing code for performance, readability, or maintainability.

---

## Prompt

```
You are optimizing code for a Laravel 13 + Vue 3 + PrimeVue 4 + MySQL + Pest + Sanctum project.

## Optimization Target

**Files/Module to optimize:** {FILE_OR_MODULE_PATH}

**Current behavior:** {DESCRIPTION_OF_CURRENT_BEHAVIOR}

**Specific concerns:**
- [ ] Slow database queries (N+1, missing indexes)
- [ ] Excessive API response size
- [ ] Unnecessary re-renders in Vue components
- [ ] Memory leaks or large payloads
- [ ] Cold start / boot time
- [ ] Code maintainability / readability

## Optimization Checklist

### Database Optimization

1. **N+1 Query Analysis**
   - Check all list/detail endpoints for lazy-loaded relationships
   - Add `with()` eager loading where relationships are accessed in loops
   - Use `withCount()` for counting related models
   - Use `withSum()`, `withAvg()`, `withMin()`, `withMax()` for aggregates

2. **Query Optimization**
   - Replace subqueries with joins where appropriate
   - Use `select()` to fetch only needed columns
   - Add missing indexes for filtered/sorted columns
   - Use `chunk()` or `cursor()` for large dataset processing
   - Replace `get()` with `first()`, `find()`, or `findOrFail()` when expecting single record

3. **Index Strategy**
   - Review `EXPLAIN` output for slow queries
   - Add composite indexes for multi-column WHERE clauses
   - Use covering indexes where the query only reads indexed columns
   - Remove unused indexes (they slow down writes)

### API Response Optimization

1. **Response Size**
   - Use resource classes to control which fields are exposed
   - Remove unnecessary nested includes from list responses
   - Use `whenLoaded()` to conditionally include relationships
   - Paginate responses instead of returning all records

2. **Caching**
   - Cache expensive queries with `Cache::remember()`
   - Use tag-based cache invalidation for related data
   - Set appropriate TTLs (short for user data, long for reference data)
   - Use `Cache::tags()` for batch invalidation

### Vue Component Optimization

1. **Rendering**
   - Use `v-memo` for expensive list items that rarely change
   - Use `computed()` instead of methods for derived data
   - Lazy-load heavy components with `defineAsyncComponent()`
   - Use virtual scrolling (`DataTable` virtual mode) for large lists

2. **State Management**
   - Keep state local where possible (avoid Pinia for component-only state)
   - Use `shallowRef()` for large objects that don't need deep reactivity
   - Debounce search inputs before API calls
   - Cancel pending API requests on component unmount

3. **Bundle Size**
   - Import PrimeVue components individually (not all of them)
   - Use tree-shaking compatible imports
   - Lazy load route-based component chunks

### Laravel-Specific Optimization

1. **Application Boot**
   - Remove unused service providers
   - Use lazy service providers where possible
   - Cache config, routes, and views in production (`php artisan config:cache`)

2. **Eloquent**
   - Use `select()` to limit columns in list queries
   - Use `value()` instead of `first()->column` for single column fetches
   - Use `firstOrCreate()` / `updateOrCreate()` for upsert patterns
   - Avoid `fresh()` in loops; use eager loading instead
   - Use `tap()` for side-effect chains

3. **Jobs & Queues**
   - Move heavy operations to Jobs (notifications, emails, file processing)
   - Use batch jobs for related operations
   - Set appropriate timeouts and retry counts

### Code Quality Optimization

1. **DRY**
   - Extract repeated logic into service methods or helpers
   - Use form request classes for shared validation
   - Use Blade components / Vue composables for repeated UI patterns

2. **Readability**
   - Rename unclear variables/methods
   - Extract long methods into well-named smaller methods
   - Add PHPDoc comments for public interfaces
   - Remove dead code and unused imports

## Output Format

For each optimization found, provide:

### [Optimization #X]: {TITLE}

**File**: `{file_path}:{line_number}`

**Current Code**:
```php
{PROBLEMATIC_CODE}
```

**Optimized Code**:
```php
{OPTIMIZED_CODE}
```

**Impact**: {PERFORMANCE_IMPROVEMENT_DESCRIPTION}
**Risk**: LOW / MEDIUM / HIGH
```

---

## Performance Audit (Full Module)

Use this when doing a comprehensive performance review:

```
Perform a performance audit of the {MODULE_NAME} module.

Check for:
1. N+1 queries in all controllers and services
2. Missing database indexes
3. Unoptimized Eloquent queries
4. Vue component re-rendering issues
5. API response size inefficiencies
6. Missing caching opportunities
7. Unnecessary database round trips
8. Memory-heavy operations

For each issue found:
- Show the current code
- Show the optimized code
- Estimate the impact (query count reduction, ms saved, etc.)
- Rate priority: P0 (critical), P1 (important), P2 (nice to have)
```
