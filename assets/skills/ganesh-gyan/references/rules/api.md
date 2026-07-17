# API Response Standards

## Response Format

All API responses follow a consistent JSON envelope structure.

### Success Response

```json
{
  "status": "success",
  "data": { ... },
  "meta": { ... }
}
```

### Single Resource

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "created_at": "2024-01-15T10:30:00.000000Z",
    "updated_at": "2024-01-15T10:30:00.000000Z"
  }
}
```

### Collection Response (Paginated)

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 15,
    "total": 73,
    "from": 1,
    "to": 15
  }
}
```

### Cursor Paginated Response

For infinite scroll / "load more" patterns:

```json
{
  "status": "success",
  "data": [...],
  "meta": {
    "current_cursor": "eyJpZCI6MTV9",
    "next_cursor": "eyJpZCI6MjB9",
    "prev_cursor": "eyJpZCI6MTB9",
    "per_page": 20,
    "has_more_pages": true
  }
}
```

### Authentication Response (Login)

Login uses Laravel Sanctum's stateful SPA guard: a successful `POST /login`
returns **200 OK** (it creates no resource) and establishes an `httpOnly`
session cookie via the response headers. No token is returned in the body for
the first-party SPA.

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin"
    }
  }
}
```

For non-SPA clients (mobile / third-party) that request an API token instead,
the response includes a Sanctum plain-text token:

```json
{
  "status": "success",
  "data": {
    "user": { "id": 1, "name": "John Doe", "email": "john@example.com" },
    "token": "1|abcDEF...plaintext-sanctum-token",
    "token_type": "Bearer"
  }
}
```

## Error Response Format

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "email": [
        "The email has already been taken."
      ],
      "password": [
        "Password must be at least 8 characters."
      ]
    },
    "reference": "req_abc123def456"
  }
}
```

### Error Codes

Standardize error codes across the API:

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Input validation failure |
| `UNAUTHORIZED` | 401 | Missing or invalid session / API token |
| `SESSION_EXPIRED` | 401 | Sanctum session expired; re-authenticate |
| `TOKEN_REVOKED` | 401 | API token has been revoked |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary unavailability |

## HTTP Status Codes

### Success

| Code | Usage |
|---|---|
| 200 OK | Successful GET, PUT, PATCH |
| 201 Created | Successful resource creation |
| 204 No Content | Successful deletion, no response body |

### Client Errors

| Code | Usage |
|---|---|
| 400 Bad Request | Malformed request body |
| 401 Unauthorized | Missing or invalid session / API token |
| 403 Forbidden | Authenticated but not authorized |
| 404 Not Found | Resource does not exist |
| 405 Method Not Allowed | Wrong HTTP method |
| 409 Conflict | Resource conflict (duplicate, state) |
| 422 Unprocessable Entity | Validation errors |
| 429 Too Many Requests | Rate limit exceeded |

### Server Errors

| Code | Usage |
|---|---|
| 500 Internal Server Error | Unexpected error |
| 502 Bad Gateway | Upstream service error |
| 503 Service Unavailable | Maintenance or overload |

## Pagination

### Page-Based Pagination (default)

Use Laravel's built-in `paginate()` method. Controllers return paginated resources directly:

```php
public function index(IndexUserRequest $request): JsonResource
{
    $query = User::query();

    if ($request->boolean('filter_active')) {
        $query->active();
    }

    if ($request->filled('search')) {
        $query->where('name', 'like', "%{$request->string('search')}%");
    }

    $users = $query
        ->orderBy('name')
        ->paginate($request->integer('per_page', 15));

    return UserResource::collection($users);
}
```

### Cursor Pagination (for infinite scroll)

```php
public function index(IndexPostRequest $request): JsonResource
{
    $posts = Post::query()
        ->with('author')
        ->where('published', true)
        ->cursorPaginate($request->integer('per_page', 20));

    return PostResource::collection($posts);
}
```

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 15 | Items per page (max 100) |
| `sort` | string | `created_at` | Sort field |
| `order` | string | `desc` | Sort direction (`asc`/`desc`) |
| `search` | string | — | Search query |
| `filter_*` | various | — | Filter parameters |

## Authentication Handling (Laravel Sanctum)

### First-party SPA (session cookie)

The Vue SPA authenticates with Sanctum's stateful, cookie-based guard — there
is no token in JavaScript to manage.

1. Before logging in, call `GET /sanctum/csrf-cookie` to receive the
   `XSRF-TOKEN` cookie.
2. `POST /api/v1/auth/login` with credentials over an XHR that sends cookies
   (`withCredentials: true`); Laravel starts a session and sets an `httpOnly`
   session cookie.
3. Subsequent requests are authenticated automatically by that cookie; the
   `X-XSRF-TOKEN` header (sent automatically by Axios from the cookie) provides
   CSRF protection.
4. `POST /api/v1/auth/logout` invalidates the session. A 401 response means the
   session expired or is missing — redirect the user to log in again.

Session lifetime is controlled by `config/session.php` (`SESSION_LIFETIME`),
not a token TTL. Enable the stateful middleware in `bootstrap/app.php` with
`$middleware->statefulApi();` and guard routes with `auth:sanctum`.

### Third-party / mobile clients (API token)

Clients that cannot use cookies request a Sanctum personal access token and
send it in the Authorization header:

```
Authorization: Bearer 1|abcDEF...plaintext-sanctum-token
```

- Tokens are issued via `$user->createToken('device-name')->plainTextToken`.
- Tokens do not expire unless `sanctum.expiration` is configured (minutes).
- Revoke on logout with `$request->user()->currentAccessToken()->delete()`.

## Rate Limiting

### API Rate Limits

| Route Group | Limit | Window |
|---|---|---|
| Public (login, register) | 5 requests/minute | 1 minute |
| Authenticated API | 60 requests/minute | 1 minute |
| Auth endpoints | 10 requests/minute | 1 minute |
| Upload endpoints | 10 requests/minute | 1 minute |

### Implementation

```php
// routes/api.php
Route::middleware(['throttle:api'])->group(function () {
    // Standard authenticated routes
});

Route::middleware(['throttle:auth'])->group(function () {
    // Auth endpoints
});
```

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705312800
```

## API Versioning

### Strategy: URL Prefixing

Version the API via URL prefix: `/api/v1/`, `/api/v2/`.

```php
// routes/api.php
Route::prefix('v1')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('register', [AuthController::class, 'register']);
        // Sanctum SPA sessions need no refresh endpoint; logout ends the session
        Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    });

    Route::apiResource('users', UserController::class);
    Route::apiResource('orders', OrderController::class);
});
```

- Major version bumps only on breaking changes
- Maintain v1 for at least 6 months after v2 release
- Deprecation header on sunset routes: `Sunset: Sat, 01 Jun 2025 00:00:00 GMT`

## Response Helper

Use a centralized response helper for consistent formatting:

```php
// app/Http/Responses/ApiResponses.php
trait ApiResponses
{
    protected function success(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $data,
            'message' => $message,
        ], $status);
    }

    protected function error(string $message, int $status, ?array $details = null, string $code = 'INTERNAL_ERROR'): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
                'reference' => request()->header('X-Request-Id', Str::random(12)),
            ],
        ], $status);
    }
}
```
