# Implement Permissions (RBAC)

## When to Use

When implementing Role-Based Access Control: roles, permissions, policies, middleware, and Vue directives.

## Prerequisites

- Laravel 13 with User model
- Sanctum authentication already implemented
- User-Role-Permission tables exist or need to be created

## Step-by-Step Workflow

### 1. Create Permission Migrations

```bash
php artisan make:migration create_permissions_table
php artisan make:migration create_roles_table
php artisan make:migration create_role_user_table
php artisan make:migration create_permission_role_table
```

**Permissions table:**
```php
Schema::create('permissions', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('guard_name')->default('web');
    $table->timestamps();
});
```

**Roles table:**
```php
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('guard_name')->default('web');
    $table->timestamps();
});
```

**Pivot tables:**
```php
// Table name follows Eloquent's convention for belongsToMany(Permission <-> Role):
// singular model names in alphabetical order => `permission_role`.
Schema::create('permission_role', function (Blueprint $table) {
    $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
    $table->foreignId('role_id')->constrained()->cascadeOnDelete();
    $table->primary(['permission_id', 'role_id']);
});

Schema::create('role_user', function (Blueprint $table) {
    $table->foreignId('role_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->primary(['role_id', 'user_id']);
});
```

### 2. Create Models

```bash
php artisan make:model Permission
php artisan make:model Role
```

**Permission model:**
```php
class Permission extends Model
{
    protected $fillable = ['name', 'guard_name'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }
}
```

**Role model:**
```php
class Role extends Model
{
    protected $fillable = ['name', 'guard_name'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->permissions->contains('name', $permission)
            || $this->permissions->contains('id', function ($p) use ($permission) {
                return $p->name === $permission;
            });
    }
}
```

**User model** - add relationship:
```php
public function roles(): BelongsToMany
{
    return $this->belongsToMany(Role::class);
}

public function hasRole(string $role): bool
{
    return $this->roles->contains('name', $role);
}

public function hasPermission(string $permission): bool
{
    return $this->roles->flatMap->permissions->contains('name', $permission)
        || $this->permissions->contains('name', $permission);
}

public function giveRole(string $roleName): void
{
    $role = Role::firstOrCreate(['name' => $roleName]);
    $this->roles()->attach($role);
}

public function revokeRole(string $roleName): void
{
    $role = Role::where('name', $roleName)->first();
    if ($role) {
        $this->roles()->detach($role);
    }
}
```

### 3. Create Policies

```bash
php artisan make:policy <Resource>Policy --model=<Resource>
```

```php
class <Resource>Policy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('view-any-<resource>');
    }

    public function view(User $user, <Resource> $resource): bool
    {
        return $user->hasPermission('view-<resource>');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('create-<resource>');
    }

    public function update(User $user, <Resource> $resource): bool
    {
        return $user->hasPermission('update-<resource>');
    }

    public function delete(User $user, <Resource> $resource): bool
    {
        return $user->hasPermission('delete-<resource>');
    }
}
```

The Laravel 11+ slim skeleton has no `AuthServiceProvider` and no `$policies` array. Laravel auto-discovers a `<Resource>Policy` that sits beside the `<Resource>` model, so usually no registration is needed. If your policy lives elsewhere or the name does not match, register it explicitly with `Gate::policy()` in `App\Providers\AppServiceProvider::boot()`:

```php
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::policy(<Resource>::class, <Resource>Policy::class);
}
```

### 4. Create Middleware

```bash
php artisan make:middleware HasPermission
php artisan make:middleware HasRole
```

**HasPermission middleware:**
```php
class HasPermission
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        if (! $request->user()?->hasPermission($permission)) {
            abort(403, 'Unauthorized');
        }
        return $next($request);
    }
}
```

**HasRole middleware:**
```php
class HasRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        if (! $request->user()?->hasRole($role)) {
            abort(403, 'Unauthorized');
        }
        return $next($request);
    }
}
```

The Laravel 11+ slim skeleton has no `app/Http/Kernel.php`. Register middleware aliases in `bootstrap/app.php`:

```php
use Illuminate\Foundation\Configuration\Middleware;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
        'permission' => \App\Http\Middleware\HasPermission::class,
        'role' => \App\Http\Middleware\HasRole::class,
    ]);
})
```

### 5. Apply Middleware to Routes

```php
Route::middleware(['auth:sanctum', 'permission:view-any-<resource>'])
    ->group(function () {
        Route::apiResource('<resource>', <Resource>Controller::class);
    });

Route::middleware(['auth:sanctum', 'permission:create-<resource>'])
    ->post('/<resource>/create', [...]);

Route::middleware(['auth:sanctum', 'permission:delete-<resource>'])
    ->delete('/<resource>/{id}', [...]);
```

### 6. Create Vue Permission Directives

```js
// resources/js/directives/permission.js
// With Sanctum cookie auth there is no token in localStorage; the authenticated
// user (and its permissions) is hydrated from /api/me and cached under 'user'.
export const vPermission = {
    mounted(el, binding) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const hasPermission = user.permissions?.includes(binding.value) || false;

        if (!hasPermission) {
            el.style.display = 'none';
        }
    },
    updated(el, binding) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const hasPermission = user.permissions?.includes(binding.value) || false;
        el.style.display = hasPermission ? '' : 'none';
    },
};
```

Register in `main.js`:
```js
import { vPermission } from '@/directives/permission';
app.directive('permission', vPermission);
```

### 7. Create Vue Use Permission Composable

```js
// resources/js/composables/usePermission.js
export function usePermission() {
    const user = ref(JSON.parse(localStorage.getItem('user') || '{}'));

    const hasPermission = (permission) => {
        return user.value?.permissions?.includes(permission) || false;
    };

    const hasRole = (role) => {
        return user.value?.roles?.includes(role) || false;
    };

    const can = (permission) => hasPermission(permission);
    const cannot = (permission) => !hasPermission(permission);

    return { user, hasPermission, hasRole, can, cannot };
}
```

### 8. Seed Permissions

```php
// database/seeders/PermissionSeeder.php
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'view-any-<resource>', 'view-<resource>',
            'create-<resource>', 'update-<resource>', 'delete-<resource>',
            'manage-users', 'manage-roles',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->permissions()->attach(Permission::all());

        $user = Role::firstOrCreate(['name' => 'user']);
        $user->permissions()->attach(Permission::whereIn('name', [
            'view-<resource>', 'create-<resource>',
        ])->get());
    }
}
```

## Artisan Commands Reference

```bash
php artisan make:migration create_<table>_table
php artisan make:model <Model>
php artisan make:policy <Resource>Policy --model=<Model>
php artisan make:middleware HasPermission
php artisan make:middleware HasRole
php artisan db:seed --class=PermissionSeeder
php artisan route:list --path=api/<resource>
php artisan test --filter=Permission
```

## Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/*_create_permissions_table.php` | Permissions schema |
| `database/migrations/*_create_roles_table.php` | Roles schema |
| `database/migrations/*_create_role_user_table.php` | User-role pivot |
| `database/migrations/*_create_permission_role_table.php` | Permission-role pivot |
| `app/Models/Permission.php` | Permission model |
| `app/Models/Role.php` | Role model |
| `app/Policies/<Resource>Policy.php` | Resource policy |
| `app/Http/Middleware/HasPermission.php` | Permission middleware |
| `app/Http/Middleware/HasRole.php` | Role middleware |
| `resources/js/directives/permission.js` | v-permission directive |
| `resources/js/composables/usePermission.js` | Permission composable |
| `database/seeders/PermissionSeeder.php` | Default permissions |
| `tests/Feature/PermissionTest.php` | Permission tests |

## Testing

```bash
php artisan db:seed --class=PermissionSeeder
php artisan test tests/Feature/PermissionTest.php
php artisan test --filter=test_admin_has_all_permissions
php artisan test --filter=test_user_limited_permissions
php artisan test --filter=test_middleware_blocks_unauthorized
php artisan test --filter=test_vue_permission_directive
```

## Verification Checklist

- [ ] Permission migration runs without errors
- [ ] Role migration runs without errors
- [ ] Pivot tables populated correctly
- [ ] User can be assigned roles
- [ ] User can be assigned permissions
- [ ] Policy enforces permissions correctly
- [ ] Middleware blocks unauthorized access (403)
- [ ] Admin role has all permissions
- [ ] Vue v-permission directive hides elements
- [ ] Vue composable returns correct permissions
- [ ] All tests pass
