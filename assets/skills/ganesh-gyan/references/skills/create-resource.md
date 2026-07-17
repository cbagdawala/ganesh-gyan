# Create Resource Controller

Build a full CRUD resource controller with authorization, service layer integration, and proper HTTP status codes.

## Prerequisites

- [ ] Model, migration, and table exist
- [ ] Form Request classes exist (e.g., `StoreProductRequest`, `UpdateProductRequest`, `IndexProductRequest`)
- [ ] Resource class exists (e.g., `ProductResource`)
- [ ] Service class exists (e.g., `ProductService`)
- [ ] Policy exists (e.g., `ProductPolicy`)
- [ ] Know the HTTP methods: index, show, store, update, destroy
- [ ] Know soft delete behavior (if applicable)

## Step 1 — Controller Skeleton

```bash
php artisan make:controller Api/ProductController --resource
```

## Step 2 — Full Resource Controller

```php
<?php

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
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    use ApiResponses;

    public function __construct(
        private readonly ProductService $productService,
    ) {}

    /**
     * List all products with filtering, sorting, and pagination.
     */
    public function index(IndexProductRequest $request): AnonymousResourceCollection
    {
        $products = $this->productService->list(
            filters: $request->validated(),
            perPage: $request->integer('per_page', 15),
        );

        return ProductResource::collection($products);
    }

    /**
     * Show a single product with eager-loaded relationships.
     */
    public function show(int $id): JsonResponse|ProductResource
    {
        $product = $this->productService->findById($id);

        if (! $product) {
            return $this->error('NOT_FOUND', 'Product not found.', 404);
        }

        return new ProductResource($product);
    }

    /**
     * Store a new product.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create($request->validated());

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Update an existing product.
     */
    public function update(UpdateProductRequest $request, Product $product): ProductResource
    {
        $this->authorize('update', $product);

        $updated = $this->productService->update($product, $request->validated());

        return new ProductResource($updated);
    }

    /**
     * Delete a product (soft delete).
     */
    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $this->productService->delete($product);

        return $this->success(status: 204);
    }

    /**
     * Restore a deleted product.
     */
    public function restore(int $id): ProductResource
    {
        $product = Product::withTrashed()->findOrFail($id);

        $this->authorize('restore', $product);

        $product->restore();

        return new ProductResource($product->fresh());
    }

    /**
     * Force delete a product permanently.
     */
    public function forceDestroy(int $id): JsonResponse
    {
        $product = Product::withTrashed()->findOrFail($id);

        $this->authorize('forceDelete', $product);

        $this->productService->forceDelete($product);

        return $this->success(status: 204);
    }
}
```

## Step 3 — Routes

```php
// routes/api.php
use App\Http\Controllers\Api\ProductController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::get('/products/{product}', [ProductController::class, 'show'])->name('products.show');
    Route::post('/products', [ProductController::class, 'store'])->name('products.store');
    Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::patch('/products/{product}', [ProductController::class, 'update'])->name('products.update.patch');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
    Route::patch('/products/{product}/restore', [ProductController::class, 'restore'])->name('products.restore');
    Route::delete('/products/{product}/force', [ProductController::class, 'forceDestroy'])->name('products.force-destroy');
});
```

## Step 4 — Controller with Action Classes

For complex controllers, delegate to Action classes:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\IndexProductRequest;
use App\Http\Resources\ProductResource;
use App\Services\ProductService;
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
        $product = app()->call(StoreProduct::class, [
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
            'product' => $product,
            'data' => $request->validated(),
        ]);

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

## Step 5 — Service Integration

The controller delegates to the service:

```php
// app/Services/ProductService.php
class ProductService
{
    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Product::query();

        if (! empty($filters['search'])) {
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$filters['search']}%")
                ->orWhere('description', 'like', "%{$filters['search']}%"));
        }

        $sort = $filters['sort'] ?? 'created_at';
        $order = $filters['order'] ?? 'desc';
        $query->orderBy($sort, $order);

        return $query->paginate($perPage);
    }

    public function findById(int $id): ?Product
    {
        return Product::with(['category', 'user'])->find($id);
    }

    public function create(array $data): Product
    {
        $data['user_id'] = auth()->id();

        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        return Product::create($data);
    }

    public function update(Product $product, array $data): Product
    {
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $product->update($data);

        return $product->fresh();
    }

    public function delete(Product $product): void
    {
        $product->delete();
    }

    public function forceDelete(Product $product): void
    {
        $product->forceDelete();
    }
}
```

## Step 6 — Testing

```bash
# Feature tests for the resource controller

it('lists products with pagination', function () {
    Product::factory()->count(20)->create();

    $response = $this->getJson('/api/v1/products?per_page=15');

    $response->assertOk()
        ->assertJsonPath('meta.per_page', 15)
        ->assertJsonCount(15, 'data');
});

it('shows a single product', function () {
    $product = Product::factory()->create();

    $response = $this->getJson("/api/v1/products/{$product->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $product->id);
});

it('returns 404 for non-existent product', function () {
    $response = $this->getJson('/api/v1/products/999999');

    $response->assertNotFound();
});

it('creates a new product', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Test Product',
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => 10,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Test Product');
});

it('updates a product', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:update');

    $product = Product::factory()->create(['name' => 'Original']);

    $response = $this->actingAs($user)->putJson("/api/v1/products/{$product->id}", [
        'name' => 'Updated',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Updated');
});

it('deletes a product', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:delete');

    $product = Product::factory()->create();

    $response = $this->actingAs($user)->deleteJson("/api/v1/products/{$product->id}");

    $response->assertNoContent();
    $this->assertSoftDeleted('products', ['id' => $product->id]);
});

it('prevents unauthorized users from updating', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:view');

    $product = Product::factory()->create();

    $response = $this->actingAs($user)->putJson("/api/v1/products/{$product->id}", [
        'name' => 'Hacked',
    ]);

    $response->assertForbidden();
});

it('validates store request', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'price_cents', 'currency', 'stock']);
});
```

## Pitfalls

- **Not using service layer in controller** — Keep controllers thin; delegate to service
- **Missing authorization checks** — Always call `authorize()` before mutations
- **Not using proper HTTP status codes** — 201 for create, 204 for delete, 422 for validation
- **Returning raw models** — Always wrap in Resource class
- **Hardcoding filter logic in controller** — Move to service or scope methods
- **Not handling soft deletes** — Include `restore` and `forceDestroy` for soft-deletable models
- **Missing route names** — Always name routes for consistent URL generation
- **Not including pagination metadata** — Ensure Resource collection includes `meta`
- **Mixing concerns in controller** — Don't put business logic in controller
- **Not testing authorization** — Always test 403 responses for unauthorized users
- **Not testing validation** — Test 422 responses with invalid data
- **Not testing 404 for missing resources** — Test that missing resources return proper errors
