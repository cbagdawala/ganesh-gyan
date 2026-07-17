# Create API Endpoint

Build a REST API endpoint with Sanctum authentication, Form Request validation, and standardized response format.

## Prerequisites

- [ ] Model and migration exist
- [ ] Resource class exists (e.g., `ProductResource`)
- [ ] Form Request classes exist (e.g., `StoreProductRequest`, `UpdateProductRequest`)
- [ ] Sanctum authentication is configured (`laravel/sanctum` is bundled with Laravel 13)
- [ ] Know the HTTP methods needed (GET, POST, PUT, PATCH, DELETE)
- [ ] Know the route naming convention (e.g., `products.index`, `products.store`)

## Step 1 — Sanctum Auth Middleware

Sanctum ships with Laravel 13, so the `auth:sanctum` guard is available out of the box — no
middleware alias to register. Laravel 11+ uses the slim skeleton: there is no `app/Http/Kernel.php`.
If you ever need a custom middleware **alias**, register it in `bootstrap/app.php`:

```php
// bootstrap/app.php
use Illuminate\Foundation\Configuration\Middleware;

->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'ensure.token' => \App\Http\Middleware\EnsureValidToken::class,
    ]);
})
```

Issue a token on login and protect routes with the `auth:sanctum` guard:

```php
// routes/api.php — token issuance
Route::post('/login', function (Illuminate\Http\Request $request) {
    $request->validate(['email' => 'required|email', 'password' => 'required']);

    $user = \App\Models\User::where('email', $request->email)->first();

    if (! $user || ! \Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
        throw \Illuminate\Validation\ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    return response()->json([
        'token' => $user->createToken('api')->plainTextToken,
    ]);
});
```

```php
// routes/api.php
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{product}', [ProductController::class, 'show']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::patch('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
});
```

## Step 2 — Standardized Response Format

Create a base response trait:

```php
// app/Traits/ApiResponses.php
namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponses
{
    protected function success(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function error(string $code, string $message, int $status = 400, mixed $details = null): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
            ],
        ], $status);
    }
}
```

## Step 3 — Controller with Sanctum + Form Request

```php
// app/Http/Controllers/Api/ProductController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\IndexProductRequest;
use App\Http\Requests\Api\StoreProductRequest;
use App\Http\Requests\Api\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ProductService;
use App\Traits\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    use ApiResponses;

    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function index(IndexProductRequest $request): AnonymousResourceCollection
    {
        $products = $this->productService->list(
            filters: $request->validated(),
            perPage: $request->integer('per_page', 15),
        );

        return ProductResource::collection($products);
    }

    public function show(int $id): JsonResponse|ProductResource
    {
        $product = $this->productService->findById($id);

        if (! $product) {
            return $this->error('NOT_FOUND', 'Product not found.', 404);
        }

        return new ProductResource($product);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create($request->validated());

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateProductRequest $request, Product $product): ProductResource
    {
        $this->authorize('update', $product);

        $updated = $this->productService->update($product, $request->validated());

        return new ProductResource($updated);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $this->productService->delete($product);

        return $this->success(status: 204);
    }
}
```

## Step 4 — Controller with Action Classes

Alternative approach using Action classes for complex operations:

```php
// app/Http/Controllers/Api/ProductController.php
public function store(StoreProductRequest $request): JsonResponse
{
    $product = app()->call(StoreProduct::class, [
        'request' => $request,
        'data' => $request->validated(),
    ]);

    return (new ProductResource($product))
        ->response()
        ->setStatusCode(201);
}

public function update(UpdateProductRequest $request, Product $product): ProductResource
{
    $this->authorize('update', $product);

    $updated = app()->call(UpdateProduct::class, [
        'request' => $request,
        'product' => $product,
        'data' => $request->validated(),
    ]);

    return new ProductResource($updated);
}
```

## Step 5 — Exception Handling

Laravel 11+ uses the slim skeleton — there is no `app/Exceptions/Handler.php`. Configure API
error responses in `bootstrap/app.php` via `->withExceptions()`:

```php
// bootstrap/app.php
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (AuthenticationException $e, $request) {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => 'error',
                'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Unauthenticated.'],
            ], 401);
        }
    });

    $exceptions->render(function (ModelNotFoundException $e, $request) {
        if ($request->expectsJson()) {
            $model = class_basename($e->getModel());
            return response()->json([
                'status' => 'error',
                'error' => ['code' => 'NOT_FOUND', 'message' => "{$model} not found."],
            ], 404);
        }
    });

    $exceptions->render(function (ValidationException $e, $request) {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => 'error',
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'The given data was invalid.',
                    'details' => $e->errors(),
                ],
            ], 422);
        }
    });

    $exceptions->render(function (AuthorizationException $e, $request) {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => 'error',
                'error' => ['code' => 'FORBIDDEN', 'message' => 'You are not authorized to perform this action.'],
            ], 403);
        }
    });
})
```

## Step 6 — Sanctum Authentication Errors

Sanctum tokens are stateless bearer tokens. An expired or invalid token simply fails the
`auth:sanctum` guard and surfaces as an `AuthenticationException`, which the handler above already
maps to a `401 UNAUTHORIZED` response. Set token expiration with the `expiration` key in
`config/sanctum.php` (minutes); expired tokens are rejected automatically. No JWT-specific
exception classes are required.

## Step 7 — Response Format Examples

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Success",
  "data": {
    "id": 1,
    "name": "Product Name",
    "price_formatted": "10.00"
  }
}
```

**Paginated Response (200):**
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 100,
    "last_page": 7
  }
}
```

**Error Response (422):**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "name": ["The name field is required."]
    }
  }
}
```

**Error Response (401):**
```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthenticated."
  }
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found."
  }
}
```

## Step 8 — Testing

```bash
# Feature test: authenticated endpoint
it('requires authentication', function () {
    $response = $this->getJson('/api/v1/products');

    $response->assertUnauthorized();
});

# Feature test: authenticated user can list
it('authenticated user can list products', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:view');

    $response = $this->actingAs($user)->getJson('/api/v1/products');

    $response->assertOk()
        ->assertJsonStructure(['data', 'meta']);
});

# Feature test: validation errors return 422
it('returns validation errors for invalid data', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'price_cents']);
});

# Feature test: authorization check
it('returns 403 for unauthorized user', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:view');

    $product = Product::factory()->create();

    $response = $this->actingAs($user)->deleteJson("/api/v1/products/{$product->id}");

    $response->assertForbidden();
});

# Feature test: invalid Sanctum token is rejected
it('rejects an invalid bearer token', function () {
    $response = $this->getJson('/api/v1/products', [
        'Authorization' => 'Bearer invalid-token',
    ]);

    $response->assertUnauthorized()
        ->assertJsonPath('error.code', 'UNAUTHORIZED');
});

# Feature test: a valid Sanctum token grants access
it('accepts a valid bearer token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('api')->plainTextToken;

    $response = $this->getJson('/api/v1/products', [
        'Authorization' => "Bearer {$token}",
    ]);

    $response->assertOk();
});
```

## Pitfalls

- **Not wrapping responses consistently** — Always use the same `status`/`error`/`data` structure
- **Configuring exceptions in the wrong place** — Laravel 11+ has no `Handler.php`; use `bootstrap/app.php`
- **Not checking `expectsJson()`** — Differentiate between API and web requests
- **Returning 500 on validation errors** — Form Request returns 422 automatically
- **Not authorizing before mutations** — Always call `$this->authorize()` for update/delete
- **Not including pagination metadata** — Include `meta` object with pagination info
- **Hardcoding error messages** — Use meaningful error codes and messages
- **Forgetting to return 201 for creation** — Use `setStatusCode(201)` on resource response
- **Not handling 204 for deletion** — Return empty response with 204 status
- **Missing route naming** — Always name routes for consistent URL generation
- **Wrong return type on resource actions** — A method returning `ProductResource::collection(...)` returns an `AnonymousResourceCollection`, and `new ProductResource(...)` a `JsonResource` — declare those, not `JsonResponse` (or call `->response()`)
- **Returning raw model in error responses** — Never expose internal model data in errors
