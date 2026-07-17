# Create Form Request

Build a Form Request class for validation rules, authorization, and error messages.

## Prerequisites

- [ ] Know the form fields and their types
- [ ] Know the validation rules for each field
- [ ] Know which fields are required vs optional
- [ ] Know the custom error messages
- [ ] Know which permissions are needed

## Step 1 — Generate Form Request

```bash
php artisan make:request Api/StoreProductRequest
php artisan make:request Api/UpdateProductRequest
php artisan make:request Api/IndexProductRequest
```

## Step 2 — Store Request (Create)

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
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['file', 'mimes:jpeg,png,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Product name is required.',
            'name.min' => 'Product name must be at least :min characters.',
            'price_cents.required' => 'Price is required.',
            'price_cents.min' => 'Price must be greater than zero.',
            'stock.required' => 'Stock is required.',
            'stock.min' => 'Stock cannot be negative.',
            'currency.required' => 'Currency is required.',
            'currency.in' => 'Currency must be one of: :values.',
            'category_id.exists' => 'The selected category does not exist.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'product name',
            'slug' => 'slug',
            'price_cents' => 'price (in cents)',
            'stock' => 'stock quantity',
            'currency' => 'currency code',
            'category_id' => 'category',
            'is_active' => 'active status',
            'tags' => 'tags',
            'images' => 'product images',
        ];
    }
}
```

## Step 3 — Update Request (Edit)

```php
<?php

namespace App\Http\Requests\Api;

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
        $productId = $this->route('product');

        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($productId)],
            'description' => ['nullable', 'string', 'max:5000'],
            'price_cents' => ['sometimes', 'integer', 'min:1'],
            'currency' => ['sometimes', 'string', Rule::in(['USD', 'EUR', 'GBP'])],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'is_active' => ['sometimes', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['file', 'mimes:jpeg,png,webp', 'max:2048'],
            'delete_images' => ['nullable', 'array'],
            'delete_images.*' => ['integer', 'exists:product_images,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.min' => 'Product name must be at least :min characters.',
            'price_cents.min' => 'Price must be greater than zero.',
            'stock.min' => 'Stock cannot be negative.',
        ];
    }
}
```

## Step 4 — Index Request (List/Filter)

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
            'page' => ['sometimes', 'integer', 'min:1'],
            'sort' => ['sometimes', 'string', Rule::in(['name', 'price_cents', 'stock', 'created_at', 'updated_at'])],
            'order' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'filter_active' => ['sometimes', 'boolean'],
            'filter_category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'filter_min_price' => ['sometimes', 'integer', 'min:0'],
            'filter_max_price' => ['sometimes', 'integer', 'min:0'],
            'filter_min_stock' => ['sometimes', 'integer', 'min:0'],
            'filter_max_stock' => ['sometimes', 'integer', 'min:0'],
            'filter_created_after' => ['sometimes', 'date', 'before_or_equal:filter_created_before'],
            'filter_created_before' => ['sometimes', 'date', 'after_or_equal:filter_created_after'],
            'filter_tag' => ['sometimes', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'per_page.max' => 'Maximum of :max items per page allowed.',
            'sort.in' => 'Sort field must be one of: :values.',
            'order.in' => 'Order must be either asc or desc.',
        ];
    }
}
```

## Step 5 — Custom Rule for Unique Slug

```php
<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UniqueSlug implements ValidationRule
{
    public function __construct(
        private ?int $ignoreId = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $query = \App\Models\Product::where('slug', $value);

        if ($this->ignoreId) {
            $query->where('id', '!=', $this->ignoreId);
        }

        if ($query->exists()) {
            $fail('The :attribute has already been taken.');
        }
    }
}
```

## Step 6 — Testing

```bash
# Feature test: validation rules
it('validates required fields on create', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'price_cents', 'currency', 'stock']);
});

it('rejects negative price', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Test',
        'price_cents' => -100,
        'currency' => 'USD',
        'stock' => 5,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['price_cents']);
});

it('rejects negative stock', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Test',
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => -5,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['stock']);
});

it('validates currency is in allowed list', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Test',
        'price_cents' => 1000,
        'currency' => 'XYZ',
        'stock' => 5,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['currency']);
});

it('validates slug uniqueness', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    Product::factory()->create(['slug' => 'test-product']);

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Test',
        'slug' => 'test-product',
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => 5,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);
});

it('allows updating slug for same product', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:update');

    $product = Product::factory()->create(['slug' => 'original-slug']);

    $response = $this->actingAs($user)->putJson("/api/v1/products/{$product->id}", [
        'slug' => 'original-slug',
    ]);

    $response->assertOk();
});

it('validates per_page max', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/products?per_page=200');

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['per_page']);
});

it('validates sort field is allowed', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/products?sort=nonexistent_field');

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['sort']);
});
```

## Pitfalls

- **Not implementing `authorize()`** — Always check permissions in authorize method
- **Missing validation rules for optional fields** — Use `sometimes` rule for optional fields
- **Not providing custom error messages** — Provide clear, user-friendly error messages
- **Not providing custom attribute names** — Use `attributes()` method for readable field names
- **Hardcoding validation rules** — Keep rules in Form Request, not in controller
- **Missing `exists` rule for foreign keys** — Validate foreign key references
- **Not validating file uploads** — Add `mimes`, `max`, and file type rules
- **Missing slug uniqueness rule** — Use `Rule::unique()` for slug fields
- **Not validating sort fields** — Use `Rule::in()` for allowed sort values
- **Not validating per_page max** — Prevent excessive pagination requests
- **Forgetting to test validation errors** — Always test invalid data returns 422
- **Not testing authorization** — Test that unauthorized users get proper errors
