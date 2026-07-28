# ADR-003: Module Structure Convention

| Field | Value |
|-------|-------|
| **Date** | 2026-07-16 |
| **Status** | Accepted |
| **Deciders** | Lead Developer, Architecture Team |
| **Technical Sponsors** | Full Stack Team |

---

## Context

The application manages multiple domains (Products, Inventory, Warehouses, Users, Roles, etc.). Without a consistent structure, developers place files in different locations, making it hard to:
- Find code for a given feature
- Onboard new developers
- Apply project-wide patterns consistently
- Generate code with AI tools (prompts reference specific paths)

Flat directory structures (`app/Http/Controllers/`, `app/Models/`) become unwieldy as the project grows.

## Decision

We adopt a **Module-Based Architecture** where each domain is a self-contained module under `app/Modules/{ModuleName}/`.

### Directory Structure

```
app/
├── Modules/
│   └── Products/
│       ├── Http/
│       │   ├── Controllers/
│       │   │   └── ProductController.php
│       │   ├── Requests/
│       │   │   ├── StoreProductRequest.php
│       │   │   └── UpdateProductRequest.php
│       │   └── Resources/
│       │       └── ProductResource.php
│       ├── Models/
│       │   └── Product.php
│       ├── Services/
│       │   ├── ProductService.php
│       │   └── ProductServiceInterface.php
│       ├── Policies/
│       │   └── ProductPolicy.php
│       ├── Exceptions/
│       │   └── ProductNotFoundException.php
│       ├── Observers/
│       │   └── ProductObserver.php
│       ├── Jobs/
│       │   └── ProcessProductImage.php
│       ├── Events/
│       │   └── ProductCreated.php
│       ├── Listeners/
│       │   └── SendProductNotification.php
│       └── routes/
│           └── api.php
│
resources/
└── js/
    └── modules/
        └── products/
            ├── components/
            │   ├── ProductListing.vue
            │   ├── ProductForm.vue
            │   └── ProductDetail.vue
            ├── composables/
            │   └── useProduct.ts
            ├── stores/
            │   └── products.ts
            └── types.ts
```

### Routing Convention

Each module registers its own routes:

```php
// app/Modules/Products/routes/api.php
use App\Modules\Products\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index'])->name('products.index');
    Route::post('/', [ProductController::class, 'store'])->name('products.store');
    Route::get('/{product}', [ProductController::class, 'show'])->name('products.show');
    Route::patch('/{product}', [ProductController::class, 'update'])->name('products.update');
    Route::delete('/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
});
```

Routes are grouped and registered from a ServiceProvider:

```php
// app/Providers/ModuleServiceProvider.php
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class ModuleServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadModuleRoutes();
    }

    protected function loadModuleRoutes(): void
    {
        $modules = glob(app_path('Modules/*/routes/api.php'));
        foreach ($modules as $file) {
            Route::middleware('api')->group($file);
        }
    }
}
```

### Naming Convention

| Element | Convention | Example |
|---------|-----------|---------|
| Module directory | PascalCase | `Products`, `StockInventory` |
| Controller | PascalCase + `Controller` suffix | `ProductController` |
| Model | PascalCase, singular | `Product`, `StockAdjustment` |
| Service | PascalCase + `Service` suffix | `ProductService` |
| Service interface | PascalCase + `ServiceInterface` suffix | `ProductServiceInterface` |
| Form request | PascalCase + `Store`/`Update` prefix | `StoreProductRequest` |
| Policy | PascalCase + `Policy` suffix | `ProductPolicy` |
| Exception | PascalCase + `Exception` suffix | `ProductNotFoundException` |
| Job | PascalCase + verb prefix | `ProcessProductImage` |
| Event | PascalCase + past tense | `ProductCreated`, `ProductUpdated` |
| Listener | PascalCase + verb suffix | `SendProductNotification` |
| Vue component | PascalCase + descriptive suffix | `ProductListing`, `ProductForm` |
| Vue store | camelCase + domain | `products.ts` |
| Vue composable | `use` prefix | `useProduct.ts` |
| Types file | descriptive noun | `product.ts`, `stock.ts` |
| Migration | snake_case with verb | `create_products_table`, `add_stock_quantity_to_products` |

### Module Registration

Modules are registered via the module directory scan. Each module may have:
- Its own routes file
- Its own migrations (via `migrations/` subdirectory)
- Its own service provider (optional, for module-specific registrations)

```php
// Optional: app/Modules/Products/Providers/ProductsServiceProvider.php
namespace App\Modules\Products\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\Products\Models\Product;
use App\Modules\Products\Policies\ProductPolicy;

class ProductsServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Register policy
        \Gate::policy(Product::class, ProductPolicy::class);

        // Register observer (optional)
        Product::observe(ProductObserver::class);
    }
}
```

Register all module providers in `bootstrap/providers.php` (Laravel 11+ replaced the
`config/app.php` `providers` array with this file):

```php
// bootstrap/providers.php
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\ModuleServiceProvider::class,
    App\Modules\Products\Providers\ProductsServiceProvider::class,
    App\Modules\Inventory\Providers\InventoryServiceProvider::class,
    // ...
];
```

### Cross-Module Communication

Modules should remain loosely coupled. Use these patterns:

1. **Events/Listeners**: Module A fires an event; Module B listens
2. **Service interfaces**: Module A depends on an interface from Module B
3. **API calls**: For truly independent services, call via HTTP
4. **Shared packages**: Common utilities go in `app/Services/` or `app/Contracts/`

### Migration Convention

Module migrations go in `database/migrations/` with the standard timestamp prefix. No module-specific migration directories (Laravel convention).

```
database/migrations/
├── 2026_07_16_000001_create_products_table.php
├── 2026_07_16_000002_create_categories_table.php
├── 2026_07_16_000003_create_warehouses_table.php
└── 2026_07_16_000004_create_stock_adjustments_table.php
```

### Testing Convention

Tests go alongside the module:

```
tests/
└── Modules/
    └── Products/
        ├── Http/
        │   ├── Controllers/
        │   │   └── ProductControllerTest.php
        │   └── Requests/
        │       └── StoreProductRequestTest.php
        ├── Services/
        │   └── ProductServiceTest.php
        ├── Models/
        │   └── ProductTest.php
        └── Factories/
            └── ProductFactory.php
```

### Alternative Considered

**Option A: Layered Architecture (Controllers, Models, Services at root)**
```
app/
├── Http/Controllers/
├── Models/
├── Services/
```
- Rejected: Becomes unwieldy with 50+ controllers and models; hard to find related code

**Option B: Feature Folders (all files for a feature together)**
- Considered but rejected: Laravel's conventions (controllers, models, migrations) expect specific locations; deviating causes friction with artisan commands

**Option C: Plugin System**
- Considered but rejected: Over-engineered for current scale; adds bootstrapping complexity

### Consequences

#### Positive
- Clear module boundaries; easy to find all code for a feature
- New developers can navigate by module name
- AI tools can generate code into predictable paths
- Modules can be developed independently
- Easy to add/remove modules
- Consistent structure across the team

#### Negative
- More directory nesting (deeper paths)
- Slight overhead for cross-module references
- File count per module can be high (controller, service, interface, request, policy, etc.)

#### Mitigations
- Use IDE search (Go to File) to bypass deep paths
- Module providers handle cross-module registrations
- Use the `.ai/skills/create-*` skills to generate files in correct locations
- Keep small modules lean (skip Observers/Jobs if not needed)

### Enforcement

1. **Module checklist** (.ai/checklists/module.md) ensures all module files are created
2. **Code review** verifies files are in correct module directory
3. **AI prompts** reference module paths for code generation
4. **Pest tests** organized by module in `tests/Modules/`

### Examples

See `.ai/blueprints/` for module blueprints and `.ai/skills/create-*` for generation skills.
