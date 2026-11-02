# Generate Tests - Prompt Template

Use this prompt when generating test suites for endpoints, services, models, or validation rules. The test runner, helpers and file layout come from your stack pack's `references/rules/testing.md`.

---

## Prompt

```
Generate comprehensive tests for the following {TARGET_TYPE} in this project.
Use the project's test runner and follow `references/principles/testing.md`
and the stack pack's `references/rules/testing.md`.

## Target

**{TARGET_TYPE}**: {CLASS_OR_FILE_PATH}

**Module**: {MODULE_NAME}

**Feature**: {BRIEF_DESCRIPTION}

## Test Generation Rules

### General Rules

1. Use the test runner's grouping syntax (describe/it, test classes, or equivalent)
2. Reset the database to a clean state for every database test
3. Use factories / fixtures / builders for test data (never hardcoded rows)
4. Use the test runner's authentication helper to act as a user for authenticated tests
5. Cover happy path + error/edge cases
6. Use specific assertions (not just the status code)
7. Group related tests together
8. Use a shared setup hook for common arrangement
9. Keep tests independent (no test ordering dependencies)
10. Use descriptive test names that explain the behavior

### Endpoint Tests

For each endpoint / controller action, test:

1. **Authentication**: Unauthenticated request returns 401
2. **Authorization**: Unauthorized user returns 403
3. **Happy path**: Valid request returns expected response
4. **Validation**: Missing/invalid fields return 422
5. **Permission check**: User without the specific permission returns 403
6. **Side effects**: Verify persisted changes (e.g., record created, status updated)

### Service Tests

For each service method, test:

1. **Happy path**: Method returns expected result
2. **Edge cases**: Empty input, boundary values, null values
3. **Exception cases**: Invalid input raises the expected exception
4. **Dependencies**: Verify the service interacts correctly with its collaborators
5. **Business rules**: Domain constraints are enforced

### Validation Tests

For each validation rule set, test:

1. **Valid input**: Authorizes and passes validation
2. **Missing required fields**: Fails validation
3. **Wrong types**: Fails with type mismatch
4. **Custom rules**: Custom validation rules work correctly
5. **Authorization**: Any authorization logic attached to the request

### Model Tests

For each model, test:

1. **Mass-assignable attributes**: All expected fields can be set, protected ones cannot
2. **Type conversion**: Values are converted to the correct types
3. **Relationships**: Relations return the correct related records
4. **Query filters / scopes**: Filters return the correct subset
5. **Computed attributes**: Accessors / derived values return expected values

## Test Structure Template

Translate this pseudocode into the stack's test syntax:

    setup (runs before each test):
        reset database
        user = create user via factory
        service = construct {Service} with its dependencies

    group "{Entity} endpoints":

        test "returns 401 without authentication":
            response = GET /api/{resource}
            assert response.status == 401

        test "returns 403 for a user without permission":
            other = create user via factory
            act as other
            response = {METHOD} /api/{resource}
            assert response.status == 403

        test "{behavior_description}":
            # Arrange
            data = { field1: "value1", field2: 123 }
            # Act
            act as user
            response = {METHOD} /api/{resource} with data
            # Assert
            assert response.status == 201
            assert response.json.data.field1 == "value1"
            assert stored {Entity} has field1 == "value1" and field2 == 123

## Specific Test Cases for This Module

Based on the {TARGET_TYPE}, generate tests for:

1. {SPECIFIC_BEHAVIOR_1}
2. {SPECIFIC_BEHAVIOR_2}
3. {SPECIFIC_BEHAVIOR_3}
4. Edge cases: {EDGE_CASES}

## Factory Requirements

Ensure a factory / fixture exists for every entity used in tests. Generate
missing ones in the location the stack pack prescribes. Each should produce
realistic, unique values, for example:

    {Entity} factory:
        name = random words (2)
        sku  = unique uppercase random words (2)
        ...

## Output

Generate complete test files in the stack's test syntax. Do not use
placeholders or TODOs. Each file should be self-contained and runnable.
```

---

## Example: Testing an Endpoint Group

```
Generate tests for the product endpoints in the Products module.

Endpoints:
- GET /api/products (list with pagination, filtering, sorting)
- POST /api/products (create with validation)
- GET /api/products/{id} (show with relationships)
- PATCH /api/products/{id} (update with validation)
- DELETE /api/products/{id} (soft delete)

Product fields: name, sku, price, category_id, status, warehouse_id

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
Generate tests for the StockAdjustmentService.

Service methods:
- create(product, quantity, type, reason, user) -> StockAdjustment
- bulkCreate(items, user) -> list of StockAdjustment
- list(filters, sort, pagination) -> paginated result

Business rules:
- Cannot remove more stock than available
- Stock adjustments create movement records
- Stock adjustments are transactional
- Bulk create validates each item individually

Generate tests for all methods and business rules.
```
