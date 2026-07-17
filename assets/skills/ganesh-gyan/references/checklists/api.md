# API Endpoint Checklist

Use this checklist when implementing or reviewing a new API endpoint.

---

## Checklist

### Routing

- [ ] Route registered in module routes file
- [ ] Routes grouped under correct prefix (e.g., `/api/{module}`)
- [ ] Routes wrapped in `Route::middleware('auth:sanctum')`
- [ ] Rate limiting applied (`RateLimiter::for()`)
- [ ] Routes use named routes (`name: 'products.index'`)
- [ ] No routes directly under `api.php` (use module routes)

### Authentication & Authorization

- [ ] Sanctum middleware active on route (`auth:sanctum`)
- [ ] `authorize()` called in controller action
- [ ] Policy class exists for the model
- [ ] Policy covers all actions (viewAny, view, create, update, delete)
- [ ] Guest users cannot access the endpoint
- [ ] Non-admin users restricted appropriately
- [ ] Authorization tested in Pest (`assertStatus(403)`)

### Request Handling

- [ ] Form Request class used (Store/Update)
- [ ] Request validation rules defined
- [ ] Custom validation rules extracted if complex
- [ ] File uploads validated (type, size, dimensions)
- [ ] Enum rules for fixed-value fields
- [ ] Numeric fields use `numeric`/`integer`/`decimal` rules
- [ ] Strings use `string`, `max`, `min` rules
- [ ] Arrays use `array`, `min`, `max` rules
- [ ] Nested data uses dot notation rules (`items.*.name`)
- [ ] `authorize()` in Form Request for object-level checks

### Controller

- [ ] Constructor DI for service
- [ ] No business logic in controller
- [ ] Controller delegates to service
- [ ] Proper HTTP status code returned:
  - List/Show: `200`
  - Create: `201`
  - Delete: `204`
  - Validation: `422`
  - Auth error: `401`
  - Authorization error: `403`
  - Not found: `404`
- [ ] No `return response()->json([...])` directly (use the ApiResponse helper)
- [ ] Response matches standardized format

### Response

- [ ] Standard format: `{ success, message, data }` or `{ success, message, errors }`
- [ ] Pagination includes `meta` (current_page, last_page, per_page, total, from, to)
- [ ] Pagination includes `links` (first, last, prev, next)
- [ ] Data keys are snake_case (matches the API contract: ADR-004, api-response, migrations)
- [ ] Timestamps in ISO 8601 format
- [ ] Nullable fields use `null` (not empty string)
- [ ] Relationships included only when loaded (use `whenLoaded()`)
- [ ] Sensitive fields excluded (password, token, etc.)

### Error Handling

- [ ] Validation errors return field names: `{ errors: { field: ["message"] } }`
- [ ] Authorization errors return clear message
- [ ] Not found returns 404 with message
- [ ] Server errors return generic message (not stack traces)
- [ ] Custom exceptions handled by global handler
- [ ] Exception logged before returning error response
- [ ] Error responses tested in Pest

### Performance

- [ ] List endpoint paginates (no unbounded queries)
- [ ] `select()` limits columns to needed fields
- [ ] `with()` eager loads relationships (no N+1)
- [ ] `withCount()` / `withSum()` for aggregate counts
- [ ] Sorting field validated (allowlisted)
- [ ] Sort direction validated (asc/desc only)
- [ ] Filter values sanitized
- [ ] `per_page` capped at 100 (or configured max)
- [ ] Heavy queries cached with `Cache::remember()`
- [ ] `chunk()` used for bulk operations
- [ ] Response size minimized

### Security

- [ ] No raw SQL (use Eloquent or Query Builder)
- [ ] Parameterized queries only
- [ ] File uploads scanned for malware (if applicable)
- [ ] File size limits enforced
- [ ] Image dimensions validated
- [ ] CSV/Excel imports sanitized
- [ ] CORS configured for frontend origin
- [ ] No sensitive data in logs
- [ ] IP address not exposed in responses
- [ ] Rate limiting on write endpoints

### Testing (Pest)

- [ ] Test: unauthenticated returns 401
- [ ] Test: unauthorized returns 403
- [ ] Test: valid request returns correct status + data
- [ ] Test: invalid request returns 422 with validation errors
- [ ] Test: not found returns 404
- [ ] Test: side effects verified (DB changes, events fired)
- [ ] Test: pagination returns correct structure
- [ ] Test: filtering works correctly
- [ ] Test: sorting works correctly
- [ ] Tests use factories (no hardcoded data)
- [ ] Tests use `RefreshDatabase` trait
- [ ] Tests are independent (no ordering dependencies)

### Documentation

- [ ] Route description/commented
- [ ] Request parameters documented
- [ ] Response schema documented
- [ ] Error responses documented
- [ ] Rate limit documented
- [ ] API documentation updated (if applicable)

---

## Quick Validation

Run these before submitting:

```bash
# Run Pest tests
./vendor/bin/pest --filter="{Module}Controller"

# Check for N+1 queries (Laravel Debugbar or Telescope)
# Access list endpoint, verify no N+1 in query log

# Check response format
curl -H "Authorization: Bearer {token}" http://localhost/api/{endpoint} | jq .

# Verify pagination
curl -H "Authorization: Bearer {token}" "http://localhost/api/{endpoint}?page=1&per_page=5" | jq '.data.meta'

# Check validation
curl -X POST -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{}' http://localhost/api/{endpoint} | jq .
```
