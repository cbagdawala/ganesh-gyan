# Write Documentation - Prompt Template

Use this prompt when generating API documentation, code documentation, or user-facing documentation.

---

## Prompt

```
You are writing documentation for a Laravel 13 + Vue 3 + PrimeVue 4 + MySQL + Pest + Sanctum project.

## Documentation Target

**What to document**: {TARGET_TYPE} ({TARGET_PATH})

**Audience**: {AUDIENCE} (developers, API consumers, end users)

**Documentation type**:
- [ ] API endpoint documentation
- [ ] Code / architecture documentation
- [ ] README / setup guide
- [ ] Changelog / release notes
- [ ] User guide / how-to

## Documentation Standards

### API Documentation Format

For each endpoint, document:

#### `{METHOD} {ROUTE}`

**Summary**: One-line description of what this endpoint does.

**Authentication**: Required / Optional (Sanctum Bearer token)

**Authorization**: Required permission (e.g., `products.viewAny`, `products.create`)

**Request**:
- **Headers**: `Authorization: Bearer {token}`, `Content-Type: application/json`
- **Path Parameters**: `{param_name}` - description (type, required)
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  |-----------|------|---------|-------------|
  | `page` | integer | 1 | Page number for pagination |
  | `per_page` | integer | 15 | Items per page (max 100) |
  | `search` | string | - | Search term |
  | `sort_by` | string | created_at | Field to sort by |
  | `sort_dir` | string | asc | Sort direction (asc/desc) |
- **Request Body** (if applicable):
  ```json
  {
    "field_name": "value",
    "field_name": 123
  }
  ```
  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `field_name` | string | Yes | Description |

**Response** (Success - `200 OK`):
```json
{
    "success": true,
    "message": "Response message",
    "data": {
        "data": [...],
        "meta": {
            "current_page": 1,
            "last_page": 10,
            "per_page": 15,
            "total": 150,
            "from": 1,
            "to": 15
        },
        "links": {
            "first": "...",
            "last": "...",
            "prev": null,
            "next": "..."
        }
    }
}
```

**Response** (Error - `422 Unprocessable Entity`):
```json
{
    "success": false,
    "message": "Validation Error",
    "errors": {
        "field_name": ["Error message"]
    }
}
```

**Response** (Error - `401 Unauthorized`):
```json
{
    "success": false,
    "message": "Unauthenticated."
}
```

**Pest Test Example**:
```php
it('returns paginated products', function () {
    Product::factory()->count(5)->create();

    Sanctum::actingAs($this->user);
    $response = $this->getJson('/api/products');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success', 'message', 'data' => ['data' => [], 'meta' => [], 'links' => []],
        ]);
});
```

### Code Documentation Format

For each class/method, document:

1. **Purpose**: What this class/method does
2. **Usage**: How to use it (code example)
3. **Parameters**: Input parameters with types and descriptions
4. **Returns**: Return type and description
5. **Exceptions**: What exceptions it may throw
6. **Side Effects**: What it modifies (DB, cache, external APIs)
7. **Dependencies**: What it depends on (DI services)

### Architecture Documentation Format

For module/feature documentation:

1. **Overview**: What the module does
2. **Architecture**: Component diagram / flow
3. **Database Schema**: Table structure with relationships
4. **API Endpoints**: All endpoints with descriptions
5. **Key Classes**: Important classes and their roles
6. **Configuration**: Any config or environment variables
7. **Testing**: Test coverage and key test cases

## Output

Generate complete, production-ready documentation.
Use markdown formatting.
Include code examples where helpful.
Keep descriptions concise and actionable.
```

---

## Example: API Documentation

```
Write API documentation for the Products module.

Endpoints:
- GET /api/products (list with pagination)
- POST /api/products (create)
- GET /api/products/{id} (show)
- PATCH /api/products/{id} (update)
- DELETE /api/products/{id} (delete)
- POST /api/products/bulk-delete (bulk delete)
- PATCH /api/products/{id}/status (toggle status)

Product fields: id, name, sku, price, cost_price, category_id, warehouse_id, stock_quantity, status, description, tags, images, created_at, updated_at

Generate a complete API documentation page.
```

---

## Example: Code Documentation

```
Document the StockAdjustmentService for the Inventory module.

Document:
1. Service purpose and responsibilities
2. Each public method with parameters, return type, exceptions
3. Example usage from controller
4. Database operations performed
5. Relationships to other services (AuditLogService, StockMovementService)
6. Business rules enforced
```

---

## Example: Setup Guide

```
Write a setup guide for developers getting started with the project.

Include:
1. Prerequisites (PHP, Node, MySQL, Composer, NPM)
2. Clone and install dependencies
3. Environment configuration (.env.example -> .env)
4. Database setup (migrate, seed)
5. Sanctum configuration
6. Running the development server (backend + frontend)
7. Running tests (Pest)
8. Common troubleshooting
9. Project structure overview
```
