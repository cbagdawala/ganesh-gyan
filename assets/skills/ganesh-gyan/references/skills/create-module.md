# Create Module

Generate a complete Laravel module with backend structure (controller, service, form request, policy, resource, migration, model, factory, routes) and frontend structure (listing page, create/edit page, API service, router entry).

## Prerequisites

- [ ] Know the module name (e.g., `Product`, `Category`, `Order`)
- [ ] Know the module's singular and plural form (e.g., `product` / `products`)
- [ ] Know the table name (plural snake_case, e.g., `products`)
- [ ] Know the database columns needed
- [ ] Know which permissions the module needs (e.g., `product:view`, `product:create`)

## Step 1 — Generate Migration

```bash
php artisan make:migration create_products_table --create=products
```

Create `database/migrations/{timestamp}_create_products_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('price_cents');
            $table->string('currency', 3)->default('USD');
            $table->unsignedInteger('stock')->default(0);
            $table->unsignedBigInteger('category_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index('slug');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
```

## Step 2 — Generate Model

```bash
php artisan make:model Product -mcf
```

Edit `app/Models/Product.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price_cents',
        'currency',
        'stock',
        'category_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_cents' => 'integer',
            'stock' => 'integer',
            'is_active' => 'boolean',
            'category_id' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeWithOrders($query)
    {
        return $query->has('orderItems');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
```

## Step 3 — Generate Factory

```bash
php artisan make:factory ProductFactory --model=Product
```

Edit `database/factories/ProductFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'user_id' => User::factory(),
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->paragraph(),
            'price_cents' => fake()->numberBetween(500, 50000),
            'currency' => 'USD',
            'stock' => fake()->numberBetween(0, 500),
            'category_id' => null,
            'is_active' => fake()->boolean(80),
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['is_active' => true]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function outOfStock(): static
    {
        return $this->state(fn () => ['stock' => 0]);
    }
}
```

## Step 4 — Generate Resource

```bash
php artisan make:resource ProductResource
```

Edit `app/Http/Resources/ProductResource.php`:

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price_cents' => $this->price_cents,
            'price_formatted' => number_format($this->price_cents / 100, 2),
            'currency' => $this->currency,
            'stock' => $this->stock,
            'is_active' => $this->is_active,
            'category_id' => $this->category_id,
            'user_id' => $this->user_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

## Step 5 — Generate Form Requests

```bash
php artisan make:request Api/StoreProductRequest
php artisan make:request Api/UpdateProductRequest
php artisan make:request Api/IndexProductRequest
```

`app/Http/Requests/Api/StoreProductRequest.php`:

```php
<?php

namespace App\Http\Requests\Api;

use App\Rules\UniqueSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('product:create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products', 'slug')],
            'description' => ['nullable', 'string', 'max:5000'],
            'price_cents' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', Rule::in(['USD', 'EUR', 'GBP'])],
            'stock' => ['required', 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'price_cents.min' => 'Price must be greater than zero.',
            'stock.min' => 'Stock cannot be negative.',
        ];
    }
}
```

`app/Http/Requests/Api/UpdateProductRequest.php`:

```php
<?php

namespace App\Http\Requests\Api;

use App\Rules\UniqueSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('product:update');
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($this->route('product'))],
            'description' => ['nullable', 'string', 'max:5000'],
            'price_cents' => ['sometimes', 'integer', 'min:1'],
            'currency' => ['sometimes', 'string', Rule::in(['USD', 'EUR', 'GBP'])],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
```

`app/Http/Requests/Api/IndexProductRequest.php`:

```php
<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort' => ['sometimes', 'string', Rule::in(['name', 'price_cents', 'stock', 'created_at'])],
            'order' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'filter_active' => ['sometimes', 'boolean'],
            'filter_category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'filter_min_price' => ['sometimes', 'integer', 'min:0'],
            'filter_max_price' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
```

## Step 6 — Generate Policy

```bash
php artisan make:policy ProductPolicy --model=Product
```

Edit `app/Policies/ProductPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('product:view');
    }

    public function view(User $user, Product $product): bool
    {
        return $user->can('product:view');
    }

    public function create(User $user): bool
    {
        return $user->can('product:create');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->id === $product->user_id || $user->can('product:update');
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->id === $product->user_id || $user->can('product:delete');
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->can('product:delete');
    }

    public function forceDelete(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }
}
```

Laravel 13 auto-discovers `App\Policies\ProductPolicy` for `App\Models\Product` by naming
convention, so **no registration is needed**. There is no `AuthServiceProvider`/`$policies`
array in the slim skeleton. Only register explicitly (for non-conventional names) in
`AppServiceProvider::boot()`:

```php
// app/Providers/AppServiceProvider.php
use App\Models\Product;
use App\Policies\ProductPolicy;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::policy(Product::class, ProductPolicy::class);
}
```

## Step 7 — Generate Service

> Note: `make:service` is **not** a built-in Artisan command. Either create
> `app/Services/ProductService.php` by hand, or add a custom stub/generator package
> (e.g. register your own `make:service` command) before running this.

```bash
php artisan make:service ProductService
```

Edit `app/Services/ProductService.php`:

```php
<?php

namespace App\Services;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class ProductService
{
    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Product::query();

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
        }

        if (! empty($filters['filter_active'])) {
            $query->active();
        }

        if (! empty($filters['filter_category_id'])) {
            $query->where('category_id', $filters['filter_category_id']);
        }

        if (! empty($filters['filter_min_price'])) {
            $query->where('price_cents', '>=', $filters['filter_min_price']);
        }

        if (! empty($filters['filter_max_price'])) {
            $query->where('price_cents', '<=', $filters['filter_max_price']);
        }

        $sort = $filters['sort'] ?? 'created_at';
        $order = $filters['order'] ?? 'desc';
        $query->orderBy($sort, $order);

        return $query->paginate($filters['per_page'] ?? 15);
    }

    public function findById(int $id): ?Product
    {
        return Product::with(['category', 'user'])->find($id);
    }

    public function create(array $data): Product
    {
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
}
```

## Step 8 — Generate Controller

```bash
php artisan make:controller Api/ProductController --resource
```

Edit `app/Http/Controllers/Api/ProductController.php`:

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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
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
            return response()->json([
                'status' => 'error',
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => 'Product not found.',
                ],
            ], 404);
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

        return response()->json(null, 204);
    }
}
```

## Step 9 — Add Routes

Edit `routes/api.php`:

```php
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::get('/products/{product}', [ProductController::class, 'show'])->name('products.show');
    Route::post('/products', [ProductController::class, 'store'])->name('products.store');
    Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::patch('/products/{product}', [ProductController::class, 'update'])->name('products.update.patch');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
});
```

## Step 10 — Run Migration

```bash
php artisan migrate
```

## Step 11 — Frontend Structure

### Create API Service

Create `resources/js/api/services/productApi.ts`:

```typescript
import api from '@/api/client'
import type { Product } from '@/types/product'
import type { PaginatedResponse } from '@/types/api'

export async function fetchProducts(params: Record<string, string>): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>('/products', { params })
  return response.data
}

export async function fetchProduct(id: number): Promise<Product> {
  const response = await api.get<{ data: Product }>(`/products/${id}`)
  return response.data.data
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const response = await api.post<{ data: Product }>('/products', data)
  return response.data.data
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product> {
  const response = await api.patch<{ data: Product }>(`/products/${id}`, data)
  return response.data.data
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`)
}
```

### Create TypeScript Types

Create `resources/js/types/product.ts`:

```typescript
export interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  price_cents: number
  price_formatted: string
  currency: string
  stock: number
  is_active: boolean
  category_id: number | null
  user_id: number
  created_at: string
  updated_at: string
}
```

### Create Vue Router Entry

Edit `resources/js/router/index.ts` and add the product routes.

### Create Vue Pages

Create:
- `resources/js/pages/products/ProductListPage.vue` — listing page
- `resources/js/pages/products/ProductCreatePage.vue` — create form
- `resources/js/pages/products/ProductEditPage.vue` — edit form
- `resources/js/pages/products/ProductDetailPage.vue` — detail view

## Testing

```bash
# Run feature tests for the product module
./vendor/bin/pest tests/Feature/Api/ProductTest.php

# Run unit tests for the service
./vendor/bin/pest tests/Unit/Services/ProductServiceTest.php
```

## Pitfalls

- **Forgetting soft deletes in migration** — Always add `$table->softDeletes()` for resources that can be deleted
- **Missing indexes** — Add indexes on foreign keys and commonly filtered columns
- **Breaking policy auto-discovery** — Laravel 13 auto-discovers `{Model}Policy` by convention; register explicitly with `Gate::policy()` in `AppServiceProvider::boot()` only when the name/namespace deviates (there is no `AuthServiceProvider`/`$policies` array)
- **Returning raw models** — Always wrap models in a Resource class; never return `$model->toArray()` from controllers
- **Hardcoding filter values** — Use Form Request validation for filter parameters with `Rule::in()`
- **Missing slug generation** — Use `Str::slug()` when slug is not provided
- **N+1 queries** — Use `with()` to eager load relationships in the service layer
- **Not testing authorization** — Always test 401/403 responses in feature tests
