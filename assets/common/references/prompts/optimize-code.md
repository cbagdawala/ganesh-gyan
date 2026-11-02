# Optimize Code - Prompt Template

Use this prompt when you need to analyze and optimize existing code for performance, readability, or maintainability. Stack-specific techniques (ORM methods, cache APIs, build tooling) live in your stack pack's `references/rules/performance.md`.

---

## Prompt

```
You are optimizing code for this project. Follow
`references/principles/performance.md` and the stack pack's
`references/rules/performance.md`, and use the stack's idiomatic APIs for
each technique below.

## Optimization Target

**Files/Module to optimize:** {FILE_OR_MODULE_PATH}

**Current behavior:** {DESCRIPTION_OF_CURRENT_BEHAVIOR}

**Specific concerns:**
- [ ] Slow database queries (N+1, missing indexes)
- [ ] Excessive API response size
- [ ] Unnecessary re-renders in UI components
- [ ] Memory leaks or large payloads
- [ ] Cold start / boot time
- [ ] Code maintainability / readability

## Optimization Checklist

### Database Optimization

1. **N+1 Query Analysis**
   - Check all list/detail endpoints for lazily loaded relationships
   - Eager-load relationships that are accessed in loops
   - Count related records in the main query instead of per row
   - Compute aggregates (sum, avg, min, max) in the database, not in application loops

2. **Query Optimization**
   - Replace subqueries with joins where appropriate
   - Select only the columns you need
   - Add missing indexes for filtered/sorted columns
   - Process large datasets in chunks or with a streaming cursor
   - Fetch a single record directly when only one is expected (and fail clearly if missing)

3. **Index Strategy**
   - Review the query plan (`EXPLAIN` or equivalent) for slow queries
   - Add composite indexes for multi-column WHERE clauses
   - Use covering indexes where the query only reads indexed columns
   - Remove unused indexes (they slow down writes)

### API Response Optimization

1. **Response Size**
   - Use a response-shaping layer to control which fields are exposed
   - Remove unnecessary nested includes from list responses
   - Include relationships only when they were loaded / requested
   - Paginate responses instead of returning all records

2. **Caching**
   - Cache expensive queries with a read-through cache helper
   - Use tag- or key-prefix-based invalidation for related data
   - Set appropriate TTLs (short for user data, long for reference data)
   - Invalidate related cache entries in batches when the source data changes

### UI Component Optimization

1. **Rendering**
   - Memoize expensive list items that rarely change
   - Use computed / derived values instead of recalculating in templates
   - Lazy-load heavy components
   - Use virtual scrolling for large lists

2. **State Management**
   - Keep state local where possible (avoid a global store for component-only state)
   - Avoid deep reactivity / deep comparison on large objects that do not need it
   - Debounce search inputs before API calls
   - Cancel pending API requests when the component is destroyed

3. **Bundle Size**
   - Import UI library components individually (not the whole library)
   - Use tree-shaking compatible imports
   - Lazy-load route-based chunks

### Framework-Specific Optimization

See the stack pack's `references/rules/performance.md` for concrete commands
and APIs. Typical areas:

1. **Application Boot**
   - Remove unused service registrations / plugins
   - Defer loading of services that most requests do not need
   - Use the framework's production caches (config, routes, views / templates)

2. **Data Access Layer**
   - Limit columns in list queries
   - Fetch a single column value directly instead of loading a full record
   - Use atomic upsert helpers for find-or-create / update-or-create patterns
   - Avoid reloading records inside loops; load them once up front

3. **Background Work**
   - Move heavy operations to background jobs (notifications, emails, file processing)
   - Batch related jobs
   - Set appropriate timeouts and retry counts

### Code Quality Optimization

1. **DRY**
   - Extract repeated logic into service methods or helpers
   - Reuse validation rule sets instead of duplicating them
   - Extract repeated UI patterns into reusable components or shared logic

2. **Readability**
   - Rename unclear variables/methods
   - Extract long methods into well-named smaller methods
   - Add doc comments on public interfaces
   - Remove dead code and unused imports

## Output Format

For each optimization found, provide:

### [Optimization #X]: {TITLE}

**File**: `{file_path}:{line_number}`

**Current Code**:
    {PROBLEMATIC_CODE}

**Optimized Code**:
    {OPTIMIZED_CODE}

**Impact**: {PERFORMANCE_IMPROVEMENT_DESCRIPTION}
**Risk**: LOW / MEDIUM / HIGH
```

---

## Performance Audit (Full Module)

Use this when doing a comprehensive performance review:

```
Perform a performance audit of the {MODULE_NAME} module.

Check for:
1. N+1 queries in all endpoints and services
2. Missing database indexes
3. Unoptimized data-access queries
4. UI component re-rendering issues
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
