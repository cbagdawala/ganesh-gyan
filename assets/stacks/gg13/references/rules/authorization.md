# Authorization

## Laravel Policies

Every model requiring authorization must have a corresponding Policy class.

### Policy Structure

```php
// app/Policies/OrderPolicy.php
class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        return $user->id === $order->user_id || $user->isAdmin();
    }

    public function update(User $user, Order $order): bool
    {
        if ($order->status !== OrderStatus::Pending) {
            return false;
        }
        return $user->id === $order->user_id || $user->isAdmin();
    }

    public function cancel(User $user, Order $order): bool
    {
        if ($order->shipped_at !== null) {
            return false;
        }
        return $user->id === $order->user_id;
    }

    public function refund(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }

    public function manage(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }
}
```

### Registering Policies

Laravel 13 **auto-discovers** policies by naming convention — an `Order` model
maps to `App\Policies\OrderPolicy` with no registration required. (The
`AuthServiceProvider` and its `$policies` array were removed from the Laravel
11+ skeleton.)

Only register explicitly when a policy does not follow the convention, using
`Gate::policy()` in `AppServiceProvider::boot()`:

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::policy(Order::class, CustomOrderPolicy::class);
}
```

## Gate Definitions

Use Gates for action-based authorization that doesn't map to a specific model:

```php
// In AppServiceProvider::boot()
Gate::define('manage-settings', function (User $user) {
    return $user->isAdmin() || $user->hasPermission('settings:manage');
});

Gate::define('export-data', function (User $user) {
    return $user->isAdmin();
});

Gate::define('access-admin-panel', function (User $user) {
    return $user->hasRole('admin');
});
```

### Using Gates

```php
// In controllers
$this->authorize('manage-settings');

// In Blade (though minimal Blade is used) — there is no gate() helper; use @can
@can('access-admin-panel')
    <a href="/admin">Admin Panel</a>
@endcan

// In Vue (check via API)
const { data: permissions } = await api.get('/auth/permissions')
```

## Role-Based Access Control (Sanctum)

### Setup with spatie/laravel-permission

```php
// Role definitions
enum UserRole: string {
    case Admin = 'admin';
    case Moderator = 'moderator';
    case User = 'user';
}

enum Permission: string {
    // User permissions
    case UserView = 'user:view';
    case UserCreate = 'user:create';
    case UserUpdate = 'user:update';
    case UserDelete = 'user:delete';

    // Order permissions
    case OrderView = 'order:view';
    case OrderCreate = 'order:create';
    case OrderCancel = 'order:cancel';

    // Admin permissions
    case SettingsManage = 'settings:manage';
    case ExportData = 'export:data';
}
```

### Middleware for Role/Permission Checking

Authentication itself is handled by Sanctum's built-in `auth:sanctum`
middleware — there is no need for a custom auth middleware. Add a small
permission-checking middleware on top of it that reads roles/permissions from
the authenticated user (resolved by Sanctum from the session cookie or API
token):

```php
// app/Http/Middleware/CheckPermission.php
class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->can($permission)) {
            return response()->json([
                'status' => 'error',
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'You do not have permission to perform this action.',
                ],
            ], 403);
        }

        return $next($request);
    }
}
```

### Route Usage

```php
// routes/api.php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::middleware(['permission:user:view'])->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
    });

    Route::middleware(['permission:user:create'])->group(function () {
        Route::post('/users', [UserController::class, 'store']);
    });

    Route::middleware(['permission:settings:manage'])->group(function () {
        Route::get('/settings', [SettingsController::class, 'index']);
        Route::patch('/settings', [SettingsController::class, 'update']);
    });
});
```

## API Authorization Flow

```
Request arrives
    │
    ▼
auth:sanctum middleware authenticates (session cookie or API token)
    │
    ▼
CheckPermission middleware checks role/permission
    │
    ├─ Has permission → Proceed to controller
    │
    └─ Missing permission → 403 Forbidden response
```

## Policy in Controllers

```php
public function store(StoreOrderRequest $request): StoreOrderResponse
{
    $this->authorize('create', Order::class);

    $order = $this->orderService->create(
        dto: $request->toDto(),
        user: $request->user(),
    );

    return new StoreOrderResponse($order);
}

public function update(UpdateOrderRequest $request, Order $order): UpdateOrderResponse
{
    $this->authorize('update', $order);

    $updated = $this->orderService->update($order, $request->toDto());

    return new UpdateOrderResponse($updated);
}
```

## Permission Caching

spatie/laravel-permission already caches the permission/role definitions
internally. Do **not** try to prime a per-user cache in a provider's `boot()`
method — `boot()` runs during application bootstrap, before any request user is
resolved, so `auth()->id()` is `null` there. Cache a user's effective
permissions lazily, at the point you actually need them (e.g. in a service or
when building the auth payload for the SPA):

```php
// e.g. in an AuthService, during a request
public function permissionsFor(User $user): array
{
    return Cache::remember("user_permissions:{$user->id}", 3600, function () use ($user) {
        return $user->getAllPermissions()->pluck('name')->toArray();
    });
}
```

Clear the caches when permissions change (spatie's method is
`forgetCachedPermissions()`):

```php
use Spatie\Permission\PermissionRegistrar;

// After updating roles/permissions
Cache::forget("user_permissions:{$userId}");
app(PermissionRegistrar::class)->forgetCachedPermissions();
```

## Frontend Authorization (Vue)

```typescript
// src/composables/useAuthorization.ts
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

export function useAuthorization() {
  const userStore = useUserStore()

  const hasPermission = (permission: string): boolean => {
    return userStore.permissions?.includes(permission) ?? false
  }

  const hasRole = (role: string): boolean => {
    return userStore.user?.roles?.includes(role) ?? false
  }

  const can = computed(() => ({
    viewUser: () => hasPermission('user:view'),
    createUser: () => hasPermission('user:create'),
    updateOrder: () => hasPermission('order:update'),
    cancelOrder: () => hasPermission('order:cancel'),
    manageSettings: () => hasPermission('settings:manage'),
  }))

  return { hasPermission, hasRole, can }
}
```
