# ADR-001: Use Service Layer Pattern

| Field | Value |
|-------|-------|
| **Date** | 2026-07-16 |
| **Status** | Accepted |
| **Deciders** | Lead Developer, Architecture Team |
| **Technical Sponsors** | Backend Team |

---

## Context

The application is a Laravel 13 + Vue 3 SaaS platform managing inventory, products, warehouses, and users. Multiple developers will work on the same codebase, and the business logic is complex (stock calculations, transfer validations, audit logging, permission checks).

Controllers are receiving increasing amounts of business logic, making them hard to test, prone to duplication, and difficult to refactor. The team needs a clear pattern to separate concerns between HTTP handling and domain logic.

## Decision

We adopt the **Service Layer Pattern** as the primary mechanism for organizing business logic.

### Structure

```
app/Modules/{Module}/
├── Http/Controllers/
│   └── {Entity}Controller.php      # Thin orchestrator only
├── Services/
│   ├── {Entity}Service.php           # Business logic
│   └── {Entity}ServiceInterface.php  # Contract for testing
├── Models/
│   └── {Entity}.php                  # Data + scopes + relationships
├── Http/Requests/
│   ├── Store{Entity}Request.php      # Validation
│   └── Update{Entity}Request.php     # Validation
├── Policies/
│   └── {Entity}Policy.php            # Authorization
└── Exceptions/
    └── {Custom}Exception.php         # Domain errors
```

### Controller Role

Controllers are **thin orchestrators**:
- Accept request (via Form Request)
- Call service method(s)
- Return standardized response

Controllers contain **zero** business logic:
- No `if` statements for domain rules
- No direct database queries (except simple `find()`)
- No manual validation

```php
// CONTROLLER - thin orchestrator
public function store(StoreProductRequest $request): JsonResponse
{
    $this->authorize('create', Product::class);

    $product = $this->service->create(
        data: $request->validated(),
        user: $request->user(),
    );

    return response()->created('Product created', $product);
}
```

### Service Role

Services contain **all** business logic:
- Domain rules (stock calculations, transfer validations)
- Transaction management
- Side effects (audit logs, notifications via events)
- Data preparation and transformation

```php
// SERVICE - business logic
public function create(array $data, User $user): Product
{
    return DB::transaction(function () use ($data, $user) {
        $product = Product::create($data);
        $this->auditLog->log($product, 'created', $user);
        return $product;
    });
}
```

### Why an Interface

Every service has an interface (`ServiceInterface.php`). This is required because:

1. **Testability**: Controllers can be tested with mocked services
2. **Decoupling**: Switching implementations doesn't affect consumers
3. **Clarity**: The interface documents the service's public contract
4. **Flexibility**: Allows different implementations (e.g., cached service)

```php
// SERVICE INTERFACE
interface ProductServiceInterface
{
    public function list(array $filters, array $sort, array $pagination): LengthAwarePaginator;
    public function create(array $data, User $user): Product;
    public function update(Product $product, array $data): Product;
    public function delete(Product $product): void;
}
```

### Alternative Considered

**Option A: Direct Eloquent in Controllers (Anemic Model)**
- Rejected because business logic scatters across controllers, making it hard to find and reuse

**Option B: Fat Models (Rich Domain Model)**
- Rejected because Laravel models tend to accumulate responsibilities; harder to test in isolation

**Option C: Action Classes (One method per class)**
- Considered but rejected because it creates too many files for simple operations; services provide a better balance

**Option D: Use Case Objects**
- Considered but rejected because it adds another abstraction layer on top of services; redundant complexity

### Consequences

#### Positive
- Business logic is centralized and testable
- Controllers stay thin and focused on HTTP
- Services can be reused across controllers, jobs, and commands
- Clear separation of concerns
- Easier to write unit tests for business rules
- Interface allows mocking in tests

#### Negative
- More files per module (controller, service, interface, request, policy)
- Slight learning curve for new developers
- Risk of "god services" if single-responsibility not enforced

#### Mitigations
- Enforce single-responsibility via code reviews
- Use the module checklist (.ai/checklists/module.md)
- Keep services focused (one service per aggregate root)
- Extract small actions into separate classes when service grows > 300 lines

### Enforcement

1. **Code reviews**: Flag any business logic in controllers
2. **Static analysis**: Custom Pint rule to detect `DB::table()` in controllers
3. **IDE inspections**: Laravel Idea plugin highlights fat controllers
4. **Pest tests**: Service tests verify business logic in isolation

### Examples

See `.ai/examples/good-controller.md` and `.ai/examples/good-service.md` for reference implementations.
