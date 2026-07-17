# Create Action

Build an Action class for a single responsibility operation following the single responsibility principle.

## Prerequisites

- [ ] Model and migration exist
- [ ] Know the specific operation this action performs (e.g., `StoreProduct`, `UpdateProduct`, `DeleteProduct`)
- [ ] Know what data the action needs as input
- [ ] Know what the action returns

## Step 1 — Generate Action

> Note: `make:action` is **not** a built-in Artisan command. Create the files under
> `app/Actions` by hand, or add a custom stub/generator package that registers a
> `make:action` command before running these.

```bash
php artisan make:action StoreProduct
php artisan make:action UpdateProduct
php artisan make:action DeleteProduct
```

## Step 2 — Store Action

```php
<?php

namespace App\Actions;

use App\Dtos\StoreProductDto;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Support\Str;

class StoreProduct
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function handle(StoreProductDto $dto): Product
    {
        $data = $dto->toArray();

        // Auto-generate slug if not provided
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($dto->name);
        }

        $product = $this->productService->create($data);

        // Sync tags after creation
        if ($dto->tags) {
            $product->tags()->syncByName($dto->tags);
        }

        return $product;
    }
}
```

## Step 3 — DTO for Clean Data Transfer

```php
<?php

namespace App\Dtos;

use Illuminate\Http\Request;

readonly class StoreProductDto
{
    public function __construct(
        public string $name,
        public ?string $slug,
        public ?string $description,
        public int $priceCents,
        public string $currency,
        public int $stock,
        public ?int $categoryId,
        public bool $isActive = true,
        public ?array $tags = null,
        public ?array $images = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            name: $request->input('name'),
            slug: $request->input('slug'),
            description: $request->input('description'),
            priceCents: $request->integer('price_cents'),
            currency: $request->input('currency'),
            stock: $request->integer('stock'),
            categoryId: $request->integer('category_id'),
            isActive: $request->boolean('is_active', true),
            tags: $request->array('tags'),
            images: $request->array('images'),
        );
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price_cents' => $this->priceCents,
            'currency' => $this->currency,
            'stock' => $this->stock,
            'category_id' => $this->categoryId,
            'is_active' => $this->isActive,
        ];
    }
}
```

## Step 4 — Update Action

```php
<?php

namespace App\Actions;

use App\Dtos\UpdateProductDto;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Support\Str;

class UpdateProduct
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function handle(Product $product, UpdateProductDto $dto): Product
    {
        $data = $dto->toArray();

        // Auto-generate slug if name changed and slug not provided
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        // Remove slug if it didn't change
        if (isset($data['slug']) && $data['slug'] === $product->slug) {
            unset($data['slug']);
        }

        // Handle image deletion
        if ($dto->deleteImages) {
            foreach ($dto->deleteImages as $imageId) {
                $product->images()->where('id', $imageId)->delete();
            }
        }

        $updated = $this->productService->update($product, $data);

        // Sync tags if provided
        if ($dto->tags) {
            $updated->tags()->syncByName($dto->tags);
        }

        return $updated->fresh(['tags']);
    }
}
```

## Step 5 — Delete Action

```php
<?php

namespace App\Actions;

use App\Models\Product;
use App\Services\ProductService;

class DeleteProduct
{
    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function handle(Product $product): void
    {
        $this->productService->delete($product);
    }

    public function forceDelete(Product $product): void
    {
        $this->productService->forceDelete($product);
    }
}
```

## Step 6 — Using Actions in Controller

```php
// app/Http/Controllers/Api/ProductController.php
public function store(StoreProductRequest $request): JsonResponse
{
    $dto = StoreProductDto::fromRequest($request);

    $product = app()->call(StoreProduct::class, [
        'dto' => $dto,
    ]);

    return (new ProductResource($product))
        ->response()
        ->setStatusCode(201);
}

public function update(UpdateProductRequest $request, Product $product): JsonResponse
{
    $this->authorize('update', $product);

    $dto = UpdateProductDto::fromRequest($request);

    $updated = app()->call(UpdateProduct::class, [
        'product' => $product,
        'dto' => $dto,
    ]);

    return new ProductResource($updated);
}

public function destroy(Product $product): JsonResponse
{
    $this->authorize('delete', $product);

    app()->call(DeleteProduct::class, [
        'product' => $product,
    ]);

    return $this->success(status: 204);
}
```

## Step 7 — Testing

```bash
# Feature test: store action

it('creates a product via the store action', function () {
    $dto = new StoreProductDto(
        name: 'Test Product',
        priceCents: 1000,
        currency: 'USD',
        stock: 5,
    );

    $product = app()->call(StoreProduct::class, ['dto' => $dto]);

    expect($product->name)->toBe('Test Product')
        ->and($product->slug)->toBe('test-product')
        ->and($product->price_cents)->toBe(1000);
});

it('uses provided slug', function () {
    $dto = new StoreProductDto(
        name: 'Test Product',
        slug: 'custom-slug',
        priceCents: 1000,
        currency: 'USD',
        stock: 5,
    );

    $product = app()->call(StoreProduct::class, ['dto' => $dto]);

    expect($product->slug)->toBe('custom-slug');
});

# Feature test: update action

it('updates a product via the update action', function () {
    $product = Product::factory()->create(['name' => 'Old Name']);

    $dto = new UpdateProductDto(
        name: 'New Name',
    );

    $updated = app()->call(UpdateProduct::class, [
        'product' => $product,
        'dto' => $dto,
    ]);

    expect($updated->name)->toBe('New Name');
});

# Feature test: delete action

it('deletes a product via the delete action', function () {
    $product = Product::factory()->create();

    app()->call(DeleteProduct::class, ['product' => $product]);

    expect($product->refresh()->trashed())->toBeTrue();
});
```

## Pitfalls

- **Putting too much logic in action** — Keep each action focused on one operation
- **Returning Resource from action** — Actions return models/DTOs; Resource wraps for API
- **Mixing HTTP concerns in action** — Don't access `$request` directly; use DTO
- **Not using DTOs** — Pass structured data via DTO, not raw arrays
- **Hardcoding service in action** — Use DI to inject services
- **Not testing actions** — Test each action independently
- **Duplicating logic across actions** — Share logic in service layer
- **Not handling slug generation** — Use `Str::slug()` in store action
- **Not syncing tags after create** — Handle tag sync in the action
- **Not calling fresh after update** — Always `fresh()` to get latest state
- **Mixing multiple concerns in one action** — One action = one responsibility
- **Not providing force delete** — Include both soft delete and force delete methods
