# ADR-004: API Response Format Standard

| Field | Value |
|-------|-------|
| **Date** | 2026-07-16 |
| **Status** | Accepted |
| **Deciders** | Lead Developer, Frontend Team |
| **Technical Sponsors** | Full Stack Team |

---

## Context

The application has a Laravel 13 API backend and a Vue 3 frontend communicating over JSON. Without a standardized response format, different endpoints return inconsistent structures, making it difficult for:
- Frontend developers to handle responses uniformly
- Error handling to be consistent
- API documentation to be accurate
- Testing to be predictable
- Third-party integrations to work reliably

Laravel's default `respondWithResource()` and `resourceCollection()` return inconsistent envelope structures. We need a single, predictable format.

## Decision

We adopt a **Standardized JSON Response Format** with two envelopes: one for success responses and one for error responses.

### Success Response Envelope

```json
{
    "success": true,
    "message": "Human-readable status message",
    "data": {
        // Response payload
    }
}
```

### Error Response Envelope

```json
{
    "success": false,
    "message": "Error description",
    "errors": {
        // Error details (varies by type)
    }
}
```

### Paginated Response Format

List endpoints return data wrapped in a pagination envelope:

```json
{
    "success": true,
    "message": "Products retrieved successfully",
    "data": {
        "data": [
            { "id": 1, "name": "Product 1" }
        ],
        "meta": {
            "current_page": 1,
            "last_page": 10,
            "per_page": 15,
            "total": 150,
            "from": 1,
            "to": 15
        },
        "links": {
            "first": "http://localhost/api/products?page=1",
            "last": "http://localhost/api/products?page=10",
            "prev": null,
            "next": "http://localhost/api/products?page=2"
        }
    }
}
```

### HTTP Status Codes

| Status | When | Method |
|--------|------|--------|
| `200 OK` | Successful GET, or DELETE with a confirmation body | `ApiResponse::success()` / `ApiResponse::deleted()` |
| `201 Created` | Successful POST (resource created) | `ApiResponse::created()` |
| `401 Unauthorized` | Missing or invalid Sanctum token | `ApiResponse::unauthorized()` |
| `403 Forbidden` | Authenticated but policy denies action | `ApiResponse::forbidden()` |
| `404 Not Found` | Resource does not exist | `ApiResponse::notFound()` |
| `422 Unprocessable` | Validation errors | `ApiResponse::validationErrors()` |
| `500 Internal Error` | Unexpected server error | `ApiResponse::error()` |

### Implementation

```php
// app/Http/Resources/Responses/ApiResponse.php
<?php

namespace App\Http\Resources\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    public static function success(string $message = 'Success', mixed $data = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $status);
    }

    public static function created(string $message = 'Created', mixed $data = null): JsonResponse
    {
        return static::success($message, $data, 201);
    }

    public static function deleted(string $message = 'Deleted'): JsonResponse
    {
        // A 204 has no body, so a message would never reach the client.
        // Return 200 with the standard envelope instead.
        return response()->json([
            'success' => true,
            'message' => $message,
        ], 200);
    }

    public static function error(string $message = 'Error', int $status = 500, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors'  => $errors,
        ], $status);
    }

    public static function unauthorized(string $message = 'Unauthorized'): JsonResponse
    {
        return static::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): JsonResponse
    {
        return static::error($message, 403);
    }

    public static function notFound(string $message = 'Not Found'): JsonResponse
    {
        return static::error($message, 404);
    }

    public static function validationErrors(array $errors, string $message = 'Validation Error'): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors'  => $errors,
        ], 422);
    }

    public static function paginated(LengthAwarePaginator $paginator, string $message = 'Success'): JsonResponse
    {
        return static::success($message, [
            'data'    => $paginator->items(),
            'meta'    => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
            'links'   => [
                'first' => $paginator->url(1),
                'last'  => $paginator->url($paginator->lastPage()),
                'prev'  => $paginator->previousPageUrl(),
                'next'  => $paginator->nextPageUrl(),
            ],
        ]);
    }
}
```

### Usage in Controllers

```php
// Index (list with pagination)
public function index(Request $request): JsonResponse
{
    $products = $this->service->list($request->all());
    return response()->paginated($products, 'Products retrieved');
}

// Store (create)
public function store(StoreProductRequest $request): JsonResponse
{
    $product = $this->service->create($request->validated(), $request->user());
    return response()->created('Product created', $product);
}

// Show (single resource)
public function show(Product $product): JsonResponse
{
    $product->load(['category', 'warehouse']);
    return response()->success('Product retrieved', $product);
}

// Update
public function update(UpdateProductRequest $request, Product $product): JsonResponse
{
    $product = $this->service->update($product, $request->validated());
    return response()->success('Product updated', $product);
}

// Destroy
public function destroy(Product $product): JsonResponse
{
    $this->service->delete($product);
    return response()->deleted('Product deleted');
}
```

### Usage in Service Layer

Services throw exceptions for error conditions. Laravel 11+/13 no longer ships an
`app/Exceptions/Handler.php`; exception rendering is registered in `bootstrap/app.php`
via `->withExceptions(...)`. Type-hint `Throwable` (not `Exception`) and scope the
handler to API requests:

```php
// bootstrap/app.php
use App\Http\Resources\Responses\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->render(function (Throwable $e, Request $request) {
        if (! $request->is('api/*')) {
            return null; // fall back to default HTML rendering
        }

        return match (true) {
            $e instanceof ValidationException     => ApiResponse::validationErrors($e->errors()),
            $e instanceof AuthorizationException  => ApiResponse::forbidden($e->getMessage()),
            $e instanceof AuthenticationException => ApiResponse::unauthorized($e->getMessage()),
            $e instanceof ModelNotFoundException  => ApiResponse::notFound('Resource not found'),
            default                               => ApiResponse::error('An unexpected error occurred'),
        };
    });
})
```

> Middleware groups and aliases (formerly in `app/Http/Kernel.php`, also removed in
> Laravel 11+) are likewise configured in `bootstrap/app.php` via `->withMiddleware(...)`.

### Vue 3 Usage

The frontend has a unified response handler:

```ts
// resources/js/utils/api.ts
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })

// Response interceptor: unwrap data
api.interceptors.response.use(
    (response) => {
        const { success, message, data, errors } = response.data
        if (!success && errors) {
            return Promise.reject(new ApiResponseError(message, errors))
        }
        return data
    },
    (error) => {
        if (error.response?.data) {
            const { success, message, errors } = error.response.data
            if (!success) {
                return Promise.reject(new ApiResponseError(message, errors))
            }
        }
        return Promise.reject(error)
    }
)

export class ApiResponseError extends Error {
    constructor(
        public message: string,
        public errors: Record<string, string[]>,
    ) {
        super(message)
    }
}
```

```ts
// Pinia store usage
const data = await api.get('/products', { params })
// data is already unwrapped (no need to check success/message)
products.value = data.data
meta.value = data.meta
```

### Alternative Considered

**Option A: Laravel API Resources (default)**
- Rejected: Inconsistent envelope (sometimes wraps in `data`, sometimes not); different format for collections vs single resources

**Option B: HAL / JSON:API**
- Rejected: Too complex for our use case; verbose; not familiar to team

**Option C: GraphQL**
- Rejected: Overkill for current needs; adds significant infrastructure (Apollo, schema, resolvers); doesn't solve our core problem (standardized REST responses)

**Option D: No standard format (ad-hoc responses)**
- Rejected: Each developer uses different structure; frontend needs per-endpoint handling

### Consequences

#### Positive
- Frontend handles all responses with one pattern
- Consistent error handling across all endpoints
- Easy to document (single format to describe)
- Testing is predictable (same structure every time)
- Third-party integrations can rely on the format
- AI tools generate consistent responses

#### Negative
- Extra wrapper adds some bytes to every response
- Slightly more verbose than Laravel's default
- `success`/`message`/`data` is more than some APIs use

#### Mitigations
- Response size increase is minimal (~20-50 bytes per response)
- `message` is useful for logging and user feedback
- Frontend unwraps automatically via interceptor

### Enforcement

1. **ApiResponse helper**: All responses go through this helper (no direct `response()->json()`)
2. **Exception handler**: Converts exceptions to standardized format
3. **Code review**: Flag any response not using ApiResponse
4. **Pest tests**: Assert response structure on all endpoint tests
5. **Frontend**: Axios interceptor enforces format expectations

### Examples

See `.ai/examples/api-response.md` for complete response format examples and Pest tests.
