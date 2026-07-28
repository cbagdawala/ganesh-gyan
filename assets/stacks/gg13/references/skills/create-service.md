# Create Service

Build a service class for business logic with dependency injection and clean separation of concerns.

## Prerequisites

- [ ] Model exists (e.g., `Product`)
- [ ] Resource class exists (e.g., `ProductResource`)
- [ ] Know the business operations needed (list, create, update, delete)
- [ ] Know any business rules or calculations

## Step 1 — Generate Service

> Note: `make:service` is **not** a built-in Artisan command. Create
> `app/Services/ProductService.php` by hand, or add a custom stub/generator package
> that registers a `make:service` command before running this.

```bash
php artisan make:service ProductService
```

## Step 2 — Full Service Implementation

```php
<?php

namespace App\Services;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class ProductService
{
    public function __construct(
        private readonly ProductRepository $productRepository,
        private readonly CategoryService $categoryService,
    ) {}

    /**
     * List products with filtering, sorting, and pagination.
     */
    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = $this->productRepository->baseQuery();

        // Search
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
        }

        // Status filter
        if (isset($filters['filter_active']) && $filters['filter_active']) {
            $query->active();
        }

        // Category filter
        if (! empty($filters['filter_category_id'])) {
            $query->where('category_id', $filters['filter_category_id']);
        }

        // Price range filter
        if (isset($filters['filter_min_price'])) {
            $query->where('price_cents', '>=', $filters['filter_min_price']);
        }
        if (isset($filters['filter_max_price'])) {
            $query->where('price_cents', '<=', $filters['filter_max_price']);
        }

        // Stock filter
        if (isset($filters['filter_min_stock'])) {
            $query->where('stock', '>=', $filters['filter_min_stock']);
        }
        if (isset($filters['filter_max_stock'])) {
            $query->where('stock', '<=', $filters['filter_max_stock']);
        }

        // Date range filter
        if (isset($filters['filter_created_after'])) {
            $query->where('created_at', '>=', $filters['filter_created_after']);
        }
        if (isset($filters['filter_created_before'])) {
            $query->where('created_at', '<=', $filters['filter_created_before']);
        }

        // Tag filter
        if (! empty($filters['filter_tag'])) {
            $query->whereHas('tags', fn ($q) => $q->where('name', $filters['filter_tag']));
        }

        // Sort
        $sort = $filters['sort'] ?? 'created_at';
        $order = $filters['order'] ?? 'desc';
        $query->orderBy($sort, $order);

        return $query->paginate($perPage);
    }

    /**
     * Find a product by ID with eager loaded relationships.
     */
    public function findById(int $id): ?Product
    {
        return Product::with(['category', 'user', 'tags'])
            ->find($id);
    }

    /**
     * Find a product by slug.
     */
    public function findBySlug(string $slug): ?Product
    {
        return Product::with(['category', 'user'])
            ->where('slug', $slug)
            ->first();
    }

    /**
     * Create a new product.
     */
    public function create(array $data, ?int $userId = null): Product
    {
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        if ($userId) {
            $data['user_id'] = $userId;
        }

        // Ensure category is valid
        if (isset($data['category_id'])) {
            $this->categoryService->ensureExists($data['category_id']);
        }

        $product = Product::create($data);

        // Sync tags if provided
        if (isset($data['tags'])) {
            $product->tags()->syncByName($data['tags']);
        }

        return $product;
    }

    /**
     * Update an existing product.
     */
    public function update(Product $product, array $data): Product
    {
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        // Remove slug from update if it was auto-generated
        if (isset($data['slug']) && $data['slug'] === $product->slug) {
            unset($data['slug']);
        }

        // Handle image updates
        if (isset($data['delete_images'])) {
            foreach ($data['delete_images'] as $imageId) {
                $product->images()->where('id', $imageId)->delete();
            }
        }

        $product->update($data);

        if (isset($data['tags'])) {
            $product->tags()->syncByName($data['tags']);
        }

        return $product->fresh(['category', 'user', 'tags']);
    }

    /**
     * Delete a product (soft delete).
     */
    public function delete(Product $product): void
    {
        $product->delete();
    }

    /**
     * Force delete a product permanently.
     */
    public function forceDelete(Product $product): void
    {
        $product->forceDelete();
    }

    /**
     * Duplicate a product.
     */
    public function duplicate(Product $product): Product
    {
        $data = $product->toArray();
        unset($data['id'], $data['slug'], $data['created_at'], $data['updated_at']);
        $data['name'] = $data['name'] . ' (Copy)';
        $data['slug'] = Str::slug($data['name']);

        $duplicated = Product::create($data);

        // Copy relationships
        $product->tags->each(fn ($tag) => $duplicated->tags()->attach($tag->id));

        return $duplicated->fresh(['tags']);
    }

    /**
     * Get top selling products.
     */
    public function getTopProducts(int $limit = 10): array
    {
        return OrderItem::with('product')
            ->selectRaw('product_id, SUM(quantity) as total_quantity, SUM(total_cents) as total_revenue')
            ->groupBy('product_id')
            ->orderByDesc('total_quantity')
            ->limit($limit)
            ->get()
            ->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product->name,
                'total_quantity' => $item->total_quantity,
                'total_revenue' => $item->total_revenue,
            ])
            ->toArray();
    }
}
```

## Step 3 — Repository Pattern (Optional)

```php
<?php

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

class ProductRepository
{
    public function baseQuery(): Builder
    {
        // With the SoftDeletes trait, the global scope already excludes soft-deleted rows,
        // so no explicit `deleted_at` filter is needed here. (Note: the 2nd arg to
        // whereNotNull() is the boolean connector — "and"/"or" — not a $not flag.)
        // Use ->withTrashed() / ->onlyTrashed() when you deliberately want deleted rows.
        return Product::query()
            ->with(['category', 'user']);
    }

    public function findById(int $id): ?Product
    {
        return Product::with(['category', 'user'])->find($id);
    }

    public function findBySlug(string $slug): ?Product
    {
        return Product::with(['category', 'user'])->where('slug', $slug)->first();
    }
}
```

## Step 4 — Registering Service in Controller

```php
// app/Http/Controllers/Api/ProductController.php
class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function index(IndexProductRequest $request): JsonResponse
    {
        $products = $this->productService->list(
            filters: $request->validated(),
            perPage: $request->integer('per_page', 15),
        );

        return ProductResource::collection($products);
    }
}
```

## Step 5 — Testing

```bash
# Unit test: service list method

it('lists products with search', function () {
    Product::factory()->create(['name' => 'Apple Watch']);
    Product::factory()->create(['name' => 'Banana']);

    $service = app(ProductService::class);

    $result = $service->list(['search' => 'Apple']);

    expect($result->total())->toBe(1)
        ->and($result->first()->name)->toBe('Apple Watch');
});

it('lists products with price range filter', function () {
    Product::factory()->create(['price_cents' => 100]);
    Product::factory()->create(['price_cents' => 5000]);
    Product::factory()->create(['price_cents' => 50000]);

    $service = app(ProductService::class);

    $result = $service->list([
        'filter_min_price' => 1000,
        'filter_max_price' => 10000,
    ]);

    expect($result->total())->toBe(1)
        ->and($result->first()->price_cents)->toBe(5000);
});

it('lists products sorted by name ascending', function () {
    Product::factory()->create(['name' => 'Zebra']);
    Product::factory()->create(['name' => 'Apple']);

    $service = app(ProductService::class);

    $result = $service->list(['sort' => 'name', 'order' => 'asc']);

    expect($result->first()->name)->toBe('Apple')
        ->and($result->last()->name)->toBe('Zebra');
});

# Unit test: service create method

it('auto-generates slug if not provided', function () {
    $service = app(ProductService::class);

    $product = $service->create([
        'name' => 'Test Product',
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => 5,
    ]);

    expect($product->slug)->toBe('test-product');
});

it('uses provided slug if given', function () {
    $service = app(ProductService::class);

    $product = $service->create([
        'name' => 'Test Product',
        'slug' => 'my-custom-slug',
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => 5,
    ]);

    expect($product->slug)->toBe('my-custom-slug');
});

# Unit test: service update method

it('updates product fields', function () {
    $product = Product::factory()->create(['name' => 'Old Name']);

    $service = app(ProductService::class);

    $updated = $service->update($product, ['name' => 'New Name']);

    expect($updated->name)->toBe('New Name');
});

# Unit test: service delete method

it('soft deletes a product', function () {
    $product = Product::factory()->create();

    $service = app(ProductService::class);

    $service->delete($product);

    expect($product->refresh()->trashed())->toBeTrue();
});
```

## Pitfalls

- **Putting validation in service** — Validation belongs in Form Request; service handles business logic
- **Returning Resource from service** — Service returns models; Resource wraps for API output
- **Mixing API logic in service** — Keep service framework-agnostic; don't depend on Request
- **Not handling missing relationships** — Use `withTrashed()` or check for nulls
- **Hardcoding query logic** — Use scopes and repository for reusable queries
- **Not testing service methods** — Always test service logic independently of HTTP layer
- **Returning raw arrays from service** — Return models or typed arrays with clear structure
- **Not handling slug generation** — Use `Str::slug()` when slug is not provided
- **Forgetting to fresh after update** — Call `fresh()` to get latest state after update
- **Not eager loading in findById** — Always `with()` relationships to avoid N+1
- **Not handling tag sync** — Use `syncByName()` for many-to-many tag relationships
- **Missing duplicate functionality** — Provide a `duplicate()` method for common use case
