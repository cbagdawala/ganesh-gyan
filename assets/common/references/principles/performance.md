# Performance Principles

Stack-neutral principles. Your stack pack's `references/rules/performance.md` shows how to apply them.

## Mindset

1. **Measure before optimizing.** Profile the slow path, find the actual bottleneck, then fix that. Guessing wastes effort and adds complexity where it does not pay.
2. **Fix the biggest cost first.** One query per row in a loop costs more than any micro-optimization in application code.
3. **Re-measure after the change.** Keep the change only if the numbers improved.
4. **Keep monitoring.** Slow-query logs, request timings and queue metrics catch regressions that tests do not.

## Data Access

### Avoid N+1 Queries

Loading a list and then fetching a relation once per row turns one query into N+1. Load related data for the whole set up front.

```
// Bad: one query for the list, one more per row
users = fetch all users
for each user in users:
    print user.profile.bio      // hidden query per user

// Good: two queries in total
users = fetch all users, including profile
```

- Load relations that the response will use, and only those.
- Select only the columns you need, but always include the keys that link related rows.
- Load optional relations conditionally, driven by what the caller asked for.
- Default (always-on) relation loading is for small relations every response needs, never for heavy collections.
- Load missing relations lazily on a single record when a flag requests them, instead of always.

### Push Work to the Database

- Filter, sort, count and aggregate in the query, not in application memory.
- Paginate every list endpoint. Never return an unbounded collection.
- Process large data sets in chunks or streams, not by loading everything at once.
- Use bulk inserts and bulk updates instead of one statement per row.

### Index Deliberately

| Do | Don't |
|---|---|
| Index columns used in WHERE, JOIN and ORDER BY | Index every column "just in case" |
| Index every foreign key | Leave lookup columns unindexed on large tables |
| Use a composite index that matches a common query (equality columns first, then the sort column) | Create several overlapping single-column indexes |
| Add unique indexes for natural keys | Rely on application code alone for uniqueness |
| Check the query plan for slow queries | Assume an index is used |

Every index costs write time and storage, so add one for a real query pattern.

## Caching

### Rules

1. **Cache reads, invalidate on writes.** Never add a cache without a clear invalidation path.
2. **Cache what is expensive and read often:** aggregates, rankings, reference data, rendered lists.
3. **Build keys from every input that changes the result** (ids, filters, page, page size, locale, user scope).
4. **Pick a TTL on purpose.** Short for volatile data, longer for reference data. The TTL is a safety net, not the invalidation strategy.
5. **Group related keys** (tags, prefixes or versioned keys) so one write can invalidate everything it affects.
6. **Never cache per-user or permission-filtered data under a shared key.**

### HTTP Caching

- Public, read-only endpoints may send cache headers (max-age, public).
- Authenticated or personalised responses must not be publicly cacheable.

## Frontend

### Load Less, Later

- Split code per route so each page downloads only what it uses.
- Lazy-load heavy components (charts, editors, large tables, dashboards) that are not needed for the first paint.
- Preload or pre-bundle the few components that are on the critical first view.
- Import library components individually so unused code can be removed from the bundle.
- Split vendor code into stable chunks so it stays cached across deploys.
- Set a bundle size budget and treat warnings as defects.

### Render Less

- Use virtual scrolling for long lists (roughly more than 100 visible rows) or switch to server-side pagination.
- Debounce search and filter inputs before calling the server.
- Avoid recomputing derived values on every render; cache them as computed or memoized values.

## Background Work

- Move slow, non-interactive work (email, exports, imports, third-party calls, heavy recalculation) to a queue.
- Batch items into one job instead of dispatching one job per item.
- Chain jobs that depend on each other so each runs only after the previous succeeds.
- Use separate named queues for different workloads so a flood in one does not starve another.
- Monitor queue depth, throughput and failures; scale workers on evidence.

## Checklist

- [ ] The slow path was measured before and after the change
- [ ] No N+1 queries on list or detail endpoints
- [ ] Only needed relations and columns are loaded
- [ ] Every list endpoint is paginated
- [ ] New query patterns have matching indexes; no speculative indexes
- [ ] Every cache has an invalidation path and a deliberate TTL
- [ ] Cache keys include every input that changes the result
- [ ] Heavy frontend components and routes are lazy-loaded
- [ ] Long lists use virtual scrolling or server-side pagination
- [ ] Slow work runs in batched, monitored background jobs
