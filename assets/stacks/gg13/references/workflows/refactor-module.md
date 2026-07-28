# Refactor Module

## When to Use

When improving existing code: extracting services, extracting action classes, simplifying controllers, and improving naming conventions.

## Prerequisites

- Existing module with code that needs refactoring
- All existing tests passing (run `php artisan test` first)
- Clear understanding of the current behavior

## Step-by-Step Workflow

### 1. Assess Current State

**Before refactoring:**
- Run all tests to establish baseline
- Identify code smells:
  - Fat controllers (> 500 lines)
  - God objects (> 300 lines)
  - Duplicate code
  - Deep nesting (> 3 levels)
  - Long methods (> 30 lines)
  - Mixed concerns (DB + business logic + response formatting)

### 2. Extract Service Class

**Identify business logic in controller:**
```php
// BEFORE: Controller with business logic
public function store(StoreRequest $request)
{
    $user = auth()->user();
    $validated = $request->validated();

    // Business logic mixed with controller
    if ($validated['type'] === 'premium') {
        $validated['price'] = 99.99;
        $validated['features'] = ['analytics', 'export', 'support'];
    } else {
        $validated['price'] = 0;
        $validated['features'] = ['basic'];
    }

    $item = Item::create($validated);
    Notification::send($user, new ItemCreatedNotification($item));

    return response()->json($item, 201);
}
```

**Extract to service:**

`make:service` is not a stock Artisan command. Create the class manually at
`app/Services/<Resource>Service.php` (or install a package / custom stub that
adds a `make:service` generator):

```php
namespace App\Services;

use App\Models<Item>;
use App\Notifications\ItemCreatedNotification;

class <Resource>Service
{
    public function create(array $data, User $user): Item
    {
        $price = $this->calculatePrice($data['type'] ?? 'basic');
        $features = $this->getFeatures($data['type'] ?? 'basic');

        $item = Item::create(array_merge($data, [
            'price' => $price,
            'features' => $features,
        ]));

        Notification::send($user, new ItemCreatedNotification($item));

        return $item;
    }

    private function calculatePrice(string $type): float
    {
        return match ($type) {
            'premium' => 99.99,
            'enterprise' => 199.99,
            default => 0,
        };
    }

    private function getFeatures(string $type): array
    {
        return match ($type) {
            'premium' => ['analytics', 'export', 'support'],
            'enterprise' => ['analytics', 'export', 'support', 'priority', 'dedicated'],
            default => ['basic'],
        };
    }
}
```

**Simplify controller:**
```php
public function store(StoreRequest $request, <Resource>Service $service)
{
    $item = $service->create($request->validated(), auth()->user());
    return response()->json($item, 201);
}
```

### 3. Extract Action Class

**For complex workflows:**

`make:action` is not a stock Artisan command either. Create the class manually
at `app/Actions/Create<Resource>Action.php` (or add a custom stub / package that
registers a `make:action` generator):

```php
namespace App\Actions;

use App\Models<Item>;
use App\Models\User;
use App\Services\<Resource>Service;

class Create<Resource>Action
{
    public function __construct(
        private <Resource>Service $service
    ) {}

    public function handle(StoreRequest $request): Item
    {
        $item = $this->service->create(
            $request->validated(),
            $request->user()
        );

        return $item;
    }
}
```

### 4. Improve Naming Conventions

**Rename files to match classes:**
```
Before: ItemController.php -> class ItemController (OK)
Before: ItemsController.php -> class ItemController (Rename to ItemsController or fix class)
Before: item_service.php -> class ItemService (Rename to ItemService.php)
```

**Rename methods to be descriptive:**
```php
// Before
private function process($data) { ... }
private function handle($id) { ... }

// After
private function calculateDiscount($data) { ... }
private function validatePermissions($id) { ... }
```

### 5. Extract Validation Logic

**Move complex validation from controller to Form Request:**
```bash
php artisan make:request ComplexStoreRequest
```

**Custom validation rules:**
```bash
php artisan make:rule PremiumEligibility
```

```php
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PremiumEligibility implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $eligible = User::where('email', $value)
            ->whereHas('orders', fn ($q) => $q->where('total', '>', 1000))
            ->exists();

        if (! $eligible) {
            $fail('The :attribute is not eligible for premium.');
        }
    }
}
```

### 6. Refactoring Checklist

- [ ] All tests passing before refactoring
- [ ] Single Responsibility Principle applied
- [ ] Controller methods < 20 lines
- [ ] Service classes < 100 lines
- [ ] Action classes < 50 lines
- [ ] No business logic in controllers
- [ ] Naming reflects intent
- [ ] Extracted classes follow conventions
- [ ] All existing tests still pass after refactoring
- [ ] No behavior changes

## Artisan Commands Reference

```bash
# make:service and make:action are NOT stock Artisan commands.
# Create app/Services/*.php and app/Actions/*.php manually (or add a custom stub/package).
php artisan make:request <Name>Request
php artisan make:rule <NameRule>
php artisan test
php artisan test --filter=<Resource>
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `app/Services/<Resource>Service.php` | Extracted service |
| `app/Actions/Create<Resource>Action.php` | Extracted action |
| `app/Rules/<Name>Rule.php` | Custom validation rules |
| `app/Http/Controllers/<Resource>Controller.php` | Simplified controller |
| `app/Http/Requests/*Request.php` | Validation rules |
| Tests | Updated if needed |

## Testing

```bash
# Run tests before refactoring
php artisan test

# Make changes

# Run tests after refactoring
php artisan test
```

## Verification Checklist

- [ ] All tests pass (no behavior changes)
- [ ] Controller methods reduced in complexity
- [ ] Business logic moved to services/actions
- [ ] Naming is clear and descriptive
- [ ] File names match class names
- [ ] No duplicate code
- [ ] Code review approved
- [ ] Documentation updated if needed
