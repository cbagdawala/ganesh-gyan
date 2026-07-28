# Create Policy

Build an authorization policy for a model using Laravel's Gate and Policy system.

## Prerequisites

- [ ] Model exists (e.g., `Product`)
- [ ] User model exists with roles/permissions (e.g., `User` with Spatie permissions)
- [ ] Know the actions users can perform (view, create, update, delete, restore, forceDelete)
- [ ] Know if ownership matters (e.g., only owner can edit/delete their own)
- [ ] Know if roles matter (e.g., only admins can force delete)

## Step 1 — Generate Policy

```bash
php artisan make:policy ProductPolicy --model=Product
```

## Step 2 — Full Policy Implementation

```php
<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Determine whether the user can view any products.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('product:view');
    }

    /**
     * Determine whether the user can view the product.
     */
    public function view(User $user, Product $product): bool
    {
        return $user->can('product:view');
    }

    /**
     * Determine whether the user can create products.
     */
    public function create(User $user): bool
    {
        return $user->can('product:create');
    }

    /**
     * Determine whether the user can update the product.
     * Owners can edit their own products. Staff can edit any.
     */
    public function update(User $user, Product $product): bool
    {
        return $user->id === $product->user_id
            || $user->can('product:update');
    }

    /**
     * Determine whether the user can delete the product.
     * Owners can soft delete their own. Staff can delete any.
     */
    public function delete(User $user, Product $product): bool
    {
        return $user->id === $product->user_id
            || $user->can('product:delete');
    }

    /**
     * Determine whether the user can restore the product.
     * Only staff can restore deleted products.
     */
    public function restore(User $user, Product $product): bool
    {
        return $user->can('product:delete');
    }

    /**
     * Determine whether the user can permanently delete the product.
     * Only admins can force delete.
     */
    public function forceDelete(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }
}
```

## Step 3 — Register Policy

Laravel 13 **auto-discovers** policies: a `ProductPolicy` in `app/Policies` is automatically
mapped to `App\Models\Product` by naming convention — no registration required. The old
`AuthServiceProvider` with its `$policies` array no longer exists in the slim skeleton.

You only need to register a policy explicitly when it breaks the naming convention (e.g. a
differently named policy or model in a non-standard namespace). Do that in
`AppServiceProvider::boot()` with the `Gate::policy()` method:

```php
// app/Providers/AppServiceProvider.php
namespace App\Providers;

use App\Models\Product;
use App\Policies\ProductPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Only needed if auto-discovery can't resolve the policy by convention.
        Gate::policy(Product::class, ProductPolicy::class);
    }
}
```

## Step 4 — Policy with Role-Based Logic

For role-based authorization:

```php
<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'editor', 'viewer']);
    }

    public function view(User $user, Product $product): bool
    {
        return $user->hasAnyRole(['admin', 'editor', 'viewer']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'editor']);
    }

    public function update(User $user, Product $product): bool
    {
        return $user->hasAnyRole(['admin', 'editor'])
            || ($user->id === $product->user_id && $user->hasRole('contributor'));
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->hasAnyRole(['admin', 'editor'])
            || ($user->id === $product->user_id && $user->hasRole('contributor'));
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->hasAnyRole(['admin', 'editor']);
    }

    public function forceDelete(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }
}
```

## Step 5 — Policy with Ownership Check

For models with ownership:

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
        if ($user->isAdmin()) {
            return true;
        }

        return $user->id === $product->user_id;
    }

    public function create(User $user): bool
    {
        return $user->can('product:create');
    }

    public function update(User $user, Product $product): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->id === $product->user_id;
    }

    public function delete(User $user, Product $product): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->id === $product->user_id;
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, Product $product): bool
    {
        return $user->isAdmin();
    }
}
```

## Step 6 — Using Policy in Controller

```php
// In controller methods
public function update(UpdateProductRequest $request, Product $product): JsonResponse
{
    $this->authorize('update', $product);
    // ...
}

public function destroy(Product $product): JsonResponse
{
    $this->authorize('delete', $product);
    // ...
}

public function restore(int $id): JsonResponse
{
    $product = Product::withTrashed()->findOrFail($id);
    $this->authorize('restore', $product);
    // ...
}

public function forceDestroy(int $id): JsonResponse
{
    $product = Product::withTrashed()->findOrFail($id);
    $this->authorize('forceDelete', $product);
    // ...
}
```

## Step 7 — Using Policy in Blade / Vue

```php
// Blade
@can('update', $product)
    <a href="/products/{{ $product->id }}/edit">Edit</a>
@endcan

@cannot('delete', $product)
    <span>Not authorized</span>
@endcannot
```

```typescript
// Vue (using a helper)
function can(action: string, resource: Product): boolean {
  // Check via API or pass permissions from backend
  return true // replace with actual permission check
}
```

## Step 8 — Testing

```bash
# Feature test: policy authorization

it('allows admin to view any product', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:view');

    $product = Product::factory()->create();

    expect($user->can('view', $product))->toBeTrue();
});

it('allows owner to update own product', function () {
    $user = User::factory()->create();

    $product = Product::factory()->create(['user_id' => $user->id]);

    expect($user->can('update', $product))->toBeTrue();
});

it('prevents non-owner from updating product', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    $product = Product::factory()->create(['user_id' => $user1->id]);

    expect($user2->can('update', $product))->toBeFalse();
});

it('allows admin to force delete any product', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $product = Product::factory()->create();

    expect($user->can('forceDelete', $product))->toBeTrue();
});

it('prevents non-admin from force deleting', function () {
    $user = User::factory()->create(['role' => 'editor']);

    $product = Product::factory()->create();

    expect($user->can('forceDelete', $product))->toBeFalse();
});

it('allows staff to restore products', function () {
    $user = User::factory()->create(['role' => 'editor']);

    $product = Product::factory()->create();

    expect($user->can('restore', $product))->toBeTrue();
});

it('prevents non-staff from restoring', function () {
    $user = User::factory()->create(['role' => 'viewer']);

    $product = Product::factory()->create();

    expect($user->can('restore', $product))->toBeFalse();
});
```

## Pitfalls

- **Breaking policy auto-discovery** — Laravel 13 auto-discovers `App\Policies\{Model}Policy`; if you deviate from the naming/namespace convention, register explicitly with `Gate::policy()` in `AppServiceProvider::boot()` (there is no `AuthServiceProvider`/`$policies` array anymore)
- **Missing `viewAny` method** — Always include for listing pages
- **Not checking ownership** — If users own resources, check `user_id` match
- **Hardcoding roles in policy** — Use permissions or role methods for flexibility
- **Not testing all policy methods** — Test every policy method with different user types
- **Forgetting `forceDelete`** — Always include for soft-deletable models
- **Not handling admin override** — Admins should bypass ownership checks
- **Missing policy in controller** — Call `$this->authorize()` in mutation methods
- **Using `can()` instead of policy** — Don't check permissions directly; use policy
- **Not testing authorization failures** — Always test 403 responses
