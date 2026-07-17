# Good Controller Example

A well-structured resource controller for a Laravel 13 project using Pest, Laravel Sanctum auth, PrimeVue frontend, and MySQL.

---

## Context

- **Framework**: Laravel 13
- **Auth**: Laravel Sanctum
- **Testing**: Pest
- **Database**: MySQL
- **Frontend**: Vue 3 + PrimeVue

---

## Controller

```php
<?php

namespace App\Modules\Products\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Products\Http\Requests\StoreProductRequest;
use App\Modules\Products\Http\Requests\UpdateProductRequest;
use App\Modules\Products\Models\Product;
use App\Modules\Products\Services\ProductService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    // Laravel 11+/13's base `Illuminate\Routing\Controller` no longer pulls in
    // AuthorizesRequests, so `$this->authorize()` is undefined unless this trait
    // is used (or the app base controller that uses it is extended).
    use AuthorizesRequests;

    public function __construct(
        protected ProductService $service,
    ) {}

    /**
     * Display a paginated, filtered, sorted list of products.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $products = $this->service->list(
            filters: [
                'search'   => $request->input('search'),
                'category' => $request->input('category'),
                'status'   => $request->input('status'),
                'warehouse_id' => $request->input('warehouse_id'),
            ],
            sort: [
                'field' => $request->string('sort_by', 'created_at')->value(),
                'direction' => $request->string('sort_dir', 'asc')->value(),
            ],
            pagination: [
                'page'  => $request->integer('page', 1),
                'perPage' => $request->integer('per_page', 15),
            ],
        );

        return response()->success('Products retrieved successfully', $products);
    }

    /**
     * Store a newly created product.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        $product = $this->service->create(
            data: $request->validated(),
            user: $request->user(),
        );

        return response()->created('Product created successfully', $product);
    }

    /**
     * Display a single product.
     */
    public function show(Product $product): JsonResponse
    {
        $this->authorize('view', $product);

        $product->load(['category', 'warehouse', 'images']);

        return response()->success('Product retrieved successfully', $product);
    }

    /**
     * Update the specified product.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $product = $this->service->update(
            product: $product,
            data: $request->validated(),
        );

        return response()->success('Product updated successfully', $product);
    }

    /**
     * Remove the specified product.
     */
    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $this->service->delete($product);

        return response()->noContent();
    }

    /**
     * Bulk destroy products.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $this->authorize('deleteAny', Product::class);

        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:products,id',
        ]);

        $deleted = $this->service->bulkDelete($validated['ids']);

        return response()->success('Products deleted successfully', ['deleted_count' => $deleted]);
    }

    /**
     * Toggle product status (active/inactive).
     */
    public function toggleStatus(Product $product, Request $request): JsonResponse
    {
        $this->authorize('update', $product);

        $product = $this->service->toggleStatus($product);

        return response()->success('Product status updated', $product);
    }
}
```

---

## Key Patterns

| Pattern | Why |
|---------|-----|
| Constructor DI for service | Inverts dependency; easy to mock in Pest tests |
| `Store*Request` / `Update*Request` | Form Requests separate validation from controller |
| `authorize()` before every action | Enforces policy checks consistently |
| `response()->success()` / `response()->created()` | Standardized JSON envelope |
| `$request->string('x', 'default')->value()` | Laravel 11+ safe casting with defaults |
| `$request->integer('x', 1)` | Type-safe pagination params |
| `bulkDestroy` as separate action | Bulk ops don't fit RESTful show/update/destroy pattern |
| `authorized` checks on model instances | Gates accept `$request->user()` and the model |

---

## Pest Tests

```php
<?php

use App\Modules\Products\Models\Product;
use App\Modules\Products\Services\ProductService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

describe('ProductController', function () {

    it('returns unauthorized without a Sanctum token', function () {
        $response = $this->getJson('/api/products');
        $response->assertStatus(401);
    });

    it('returns paginated products for authorized user', function () {
        $user = User::factory()->create();
        Product::factory()->count(20)->create();

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/products?page=1&per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('data.data.0.name', fn ($name) => is_string($name))
            ->assertJsonStructure([
                'success', 'message', 'data' => ['data' => [], 'meta' => [], 'links' => []],
            ]);
    });

    it('filters products by category', function () {
        $user = User::factory()->create();
        $electronics = \App\Modules\Categories\Models\Category::factory()->create(['name' => 'Electronics']);
        Product::factory()->count(3)->create(['category_id' => $electronics->id]);
        Product::factory()->count(2)->create(['category_id' => null]);

        Sanctum::actingAs($user);
        $response = $this->getJson("/api/products?category={$electronics->id}");

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data.data');
    });

    it('sorts products by name ascending', function () {
        $user = User::factory()->create();
        Product::factory()->sequence(
            ['name' => 'Zebra'],
            ['name' => 'Apple'],
            ['name' => 'Mango'],
        )->create();

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/products?sort_by=name&sort_dir=asc');

        $response->assertStatus(200)
            ->assertJsonPath('data.data.0.name', 'Apple');
    });

    it('stores a product with validation', function () {
        $user = User::factory()->create();
        $data = [
            'name' => 'Test Product',
            'sku' => 'TP-001',
            'price' => 29.99,
            'category_id' => 1,
        ];

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/products', $data);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Test Product');
    });

    it('rejects store request with validation errors', function () {
        $user = User::factory()->create();

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/products', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'sku']);
    });

    it('authorizes user before storing product', function () {
        $user = User::factory()->guest()->create();

        Sanctum::actingAs($user);
        $response = $this->postJson('/api/products', [
                'name' => 'Unauthorized',
                'sku' => 'UN-001',
                'price' => 0,
            ]);

        $response->assertStatus(403);
    });
});
```

---

## Service Contract

```php
<?php

namespace App\Modules\Products\Services;

use App\Modules\Products\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ProductServiceInterface
{
    public function list(
        array $filters = [],
        array $sort = ['field' => 'created_at', 'direction' => 'asc'],
        array $pagination = ['page' => 1, 'perPage' => 15],
    ): LengthAwarePaginator;

    public function create(array $data, User $user): Product;

    public function update(Product $product, array $data): Product;

    public function delete(Product $product): void;

    public function bulkDelete(array $ids): int;

    public function toggleStatus(Product $product): Product;
}
```
