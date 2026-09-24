# Create New Module

## When to Use

When you need to create a new resource/module end-to-end in the Laravel + Vue + PrimeVue application. This covers the full stack from database schema through to a working CRUD page.

## Prerequisites

- Existing project with Laravel 13 backend and Vue 3 frontend
- Database migration system configured (MySQL)
- PrimeVue installed and configured in Vue app
- Pest installed and working
- Sanctum authentication already set up

## Step-by-Step Workflow

### 1. Create Database Migration

```bash
php artisan make:migration create_<snake_case_resource>_table --create=<table_name>
```

Define columns in the migration with appropriate types, indexes, and foreign keys. Add `soft_deletes()` if the resource should support soft deletes.

### 2. Create Eloquent Model

```bash
php artisan make:model <PascalCaseResource> -m
```

- Set `$fillable` array with all user-assignable attributes
- Define `$casts` for date/time/boolean fields
- Define `$hidden` for sensitive fields
- Define relationships (`hasMany`, `belongsTo`, etc.)
- Define any scopes or accessors

### 3. Create Resource Controller

```bash
php artisan make:controller <PascalCaseResource>Controller -r
```

Implement standard CRUD methods:
- `index()` - list with pagination, filters
- `store()` - validation + create
- `show()` - detail with relationships
- `update()` - validation + update
- `destroy()` - delete (soft or hard)

### 4. Create Form Request Validation

```bash
php artisan make:request Store<PascalCaseResource>Request
php artisan make:request Update<PascalCaseResource>Request
```

Define validation rules in `rules()` method. Use appropriate Laravel validation rules with custom messages.

### 5. Define API Routes

Add to `routes/api.php`:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('resources', <PascalCaseResource>Controller::class);
    Route::delete('resources/{id}/force', [ResourceController::class, 'forceDelete']);
});
```

### 6. Create Resource Model (JSON API)

```bash
php artisan make:resource <PascalCaseResource>
php artisan make:resource <PascalCaseResource>Collection
```

- Use Fractal-style or direct array transformation
- Include relationships
- Handle pagination wrapper

### 7. Create Vue Page Component

```bash
# In resources/js/Pages/
mkdir -p resources/js/Pages/<ResourceName>
```

Create `List.vue`, `Create.vue`, `Edit.vue`, `Show.vue` using PrimeVue components:
- DataTable with sorting, filtering, pagination
- Dialog/Drawer for create/edit forms
- ConfirmDialog for delete confirmation
- InputText, InputNumber, Select, DatePicker for form fields

### 8. Create Policy

```bash
php artisan make:policy <PascalCaseResource>Policy --model=<PascalCaseResource>
```

Define policies:
- `viewAny` - list all
- `view` - view detail
- `create` - create new
- `update` - update existing
- `delete` - delete

### 9. Register Policy

The Laravel 11+ slim skeleton has no `AuthServiceProvider`. Laravel auto-discovers a `<PascalCaseResource>Policy` that sits alongside the `<PascalCaseResource>` model, so no manual registration is usually needed. If the policy lives elsewhere or is named differently, register it in `App\Providers\AppServiceProvider::boot()`:

```php
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::policy(<PascalCaseResource>::class, <PascalCaseResource>Policy::class);
}
```

### 10. Create Pest Tests

```bash
php artisan make:test <PascalCaseResource>Test --pest
php artisan make:test <PascalCaseResource>ApiTest --pest
```

Write tests for:
- CRUD operations via API
- Authorization checks
- Validation error responses
- Soft delete behavior (if applicable)

## Artisan Commands Reference

```bash
php artisan make:migration create_<table>_table --create=<table>
php artisan make:model <Model> -m
php artisan make:controller <Controller> -r
php artisan make:request <Name>Request
php artisan make:resource <Name>
php artisan make:policy <Name>Policy --model=<Model>
php artisan make:test <Name>Test --pest
php artisan migrate
php artisan route:list --path=api
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `database/migrations/*_<table>_table.php` | Schema definition |
| `app/Models/<Model>.php` | Eloquent model |
| `app/Http/Controllers/<Model>Controller.php` | API controller |
| `app/Http/Requests/Store<Model>Request.php` | Create validation |
| `app/Http/Requests/Update<Model>Request.php` | Update validation |
| `app/Http/Resources/<Model>Resource.php` | JSON transformation |
| `app/Http/Resources/<Model>Collection.php` | Collection transformation |
| `app/Policies/<Model>Policy.php` | Authorization policy |
| `routes/api.php` | Route registration |
| `resources/js/Pages/<Model>/List.vue` | List page |
| `resources/js/Pages/<Model>/Create.vue` | Create form |
| `resources/js/Pages/<Model>/Edit.vue` | Edit form |
| `resources/js/Pages/<Model>/Show.vue` | Detail view |
| `tests/Feature/<Model>Test.php` | Unit tests |
| `tests/Feature/<Model>ApiTest.php` | API tests |
| `app/Providers/AppServiceProvider.php` | Policy registration (only if not auto-discovered) |

## Testing

Run tests after implementation:

```bash
# Run all tests for the new module
php artisan test --filter=<Model>

# Run specific test file
php artisan test tests/Feature/<Model>Test.php

# Run with coverage
php artisan test --coverage
```

## Verification Checklist

- [ ] Migration runs without errors (`php artisan migrate`)
- [ ] Model passes fillable/casts
- [ ] Controller methods return expected status codes
- [ ] API routes registered correctly (`php artisan route:list`)
- [ ] Validation rules enforced via Pest tests
- [ ] Authorization enforced via policy tests
- [ ] Vue components render without errors
- [ ] CRUD operations work end-to-end in browser
- [ ] All tests pass (`php artisan test`)
- [ ] No PHP lint errors (`php -l` on all created files)
- [ ] No ESLint errors in Vue files; `npm run typecheck` passes
