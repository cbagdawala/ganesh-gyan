# Generate Tests - Prompt Template

Use this prompt when generating Pest test suites for controllers, services, models, or form requests.

---

## Prompt

```
Generate comprehensive Pest tests for the following {TARGET_TYPE} in a Laravel 13 + Vue 3 + PrimeVue 4 + MySQL + Pest + Sanctum project.

## Target

**{TARGET_TYPE}**: {CLASS_OR_FILE_PATH}

**Module**: {MODULE_NAME}

**Feature**: {BRIEF_DESCRIPTION}

## Test Generation Rules

### General Rules

1. Use Pest BDD syntax: `describe()` / `it()` blocks
2. Use `RefreshDatabase` trait for database tests
3. Use factories for test data (never hardcoded values)
4. Use Sanctum auth helpers (`Sanctum::actingAs($user)`) for authenticated tests
5. Cover happy path + error/edge cases
6. Use specific assertions (not just `assertStatus()`)
7. Group related tests in `describe()` blocks
8. Use `beforeEach()` for shared setup
9. Keep tests independent (no test ordering dependencies)
10. Use descriptive test names that explain the behavior

### Controller Tests

For each controller action, test:

1. **Authentication**: Unauthenticated request returns 401
2. **Authorization**: Unauthorized user returns 403
3. **Happy path**: Valid request returns expected response
4. **Validation**: Missing/invalid fields return 422
5. **Authorization check**: User without permission returns 403
6. **Side effects**: Verify DB changes (e.g., record created, status updated)

### Service Tests

For each service method, test:

1. **Happy path**: Method returns expected result
2. **Edge cases**: Empty input, boundary values, null values
3. **Exception cases**: Invalid input throws expected exception
4. **Dependencies**: Verify service interacts correctly with dependencies
5. **Business rules**: Domain constraints are enforced

### Form Request Tests

For each form request, test:

1. **Valid input**: Authorizes and passes validation
2. **Missing required fields**: Fails validation
3. **Wrong types**: Fails with type mismatch
4. **Custom rules**: Custom validation rules work correctly
5. **Authorization**: `authorize()` method logic

### Model Tests

For each model, test:

1. **Fillable attributes**: All expected fields are fillable
2. **Casts**: Values are cast to correct types
3. **Relationships**: Relations return correct model instances
4. **Scopes**: Scopes filter correctly
5. **Mutators**: Accessors return expected values

## Test Structure Template

```php
<?php

use App\Modules\{Module}\Models\{Model};
use App\Modules\{Module}\Services\{Service};
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Shared setup
    $this->user = User::factory()->create();
    $this->{lowercase_service} = new {Service}(
        // inject dependencies
    );
});

describe('{Model}Controller', function () {

    it('returns unauthorized without a Sanctum token', function () {
        $response = $this->getJson('/api/{resource}');
        $response->assertStatus(401);
    });

    it('returns forbidden for non-authorized user', function () {
        $otherUser = User::factory()->create();

        Sanctum::actingAs($otherUser);
        $response = $this->{method}Json('/api/{resource}');

        $response->assertStatus(403);
    });

    it('{behavior_description}', function () {
        // Arrange
        $data = [
            'field1' => 'value1',
            'field2' => 123,
        ];

        // Act
        Sanctum::actingAs($this->user);
        $response = $this->{method}Json('/api/{resource}', $data);

        // Assert
        $response->assertStatus(201)
            ->assertJsonPath('data.field1', 'value1');

        expect({Model}::first())->toHaveAttributes([
            'field1' => 'value1',
            'field2' => 123,
        ]);
    });
});
```

## Specific Test Cases for This Module

Based on the {TARGET_TYPE}, generate tests for:

1. {SPECIFIC_BEHAVIOR_1}
2. {SPECIFIC_BEHAVIOR_2}
3. {SPECIFIC_BEHAVIOR_3}
4. Edge cases: {EDGE_CASES}

## Factory Requirements

Ensure factories exist for all models used in tests. Generate them if needed:

```php
// Database/Factories/{Model}Factory.php
use App\Modules\{Module}\Models\{Model};

return [
    'name' => fn () => fake()->words(2, true),
    'sku' => fn () => strtoupper(fake()->unique()->words(2, true)),
    // ...
];
```

## Output

Generate complete Pest test files. Do not use placeholders or TODOs.
Each file should be self-contained and runnable.
```

---

## Example: Testing a Controller

```
Generate Pest tests for the ProductController in the Products module.

Controller actions:
- GET /api/products (list with pagination, filtering, sorting)
- POST /api/products (create with validation)
- GET /api/products/{id} (show with relationships)
- PATCH /api/products/{id} (update with validation)
- DELETE /api/products/{id} (soft delete)

Product model: name, sku, price, category_id, status, warehouse_id

Generate tests for:
1. All CRUD operations
2. Authentication and authorization
3. Validation error cases
4. Pagination and filtering
5. Soft delete behavior
```

---

## Example: Testing a Service

```
Generate Pest tests for the StockAdjustmentService.

Service methods:
- create(Product, quantity, type, reason, User): StockAdjustment
- bulkCreate(array, User): Collection
- list(array filters, array sort, array pagination): Paginator

Business rules:
- Cannot remove more stock than available
- Stock adjustments create movement records
- Stock adjustments are transactional
- Bulk create validates each item individually

Generate tests for all methods and business rules.
```
