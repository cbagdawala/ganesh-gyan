# Good Service Example

A well-structured service class demonstrating dependency injection, business logic separation, and testability.

---

## Context

- **Framework**: Laravel 13
- **Testing**: Pest
- **Pattern**: Service layer with dependency injection
- **Module**: Inventory management (stock adjustments)

---

## Service Contract (Interface)

```php
<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Products\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface StockAdjustmentServiceInterface
{
    public function list(
        array $filters = [],
        array $sort = ['field' => 'created_at', 'direction' => 'desc'],
        array $pagination = ['page' => 1, 'perPage' => 15],
    ): LengthAwarePaginator;

    public function create(
        Product $product,
        int $quantity,
        string $type,
        ?string $reason,
        User $user,
    ): StockAdjustment;

    public function bulkCreate(
        array $adjustments, // [['product_id' => x, 'quantity' => y, 'type' => 'in'], ...]
        User $user,
    ): Collection;
}
```

---

## Service Implementation

```php
<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Products\Models\Product;
use App\Modules\Warehouses\Models\Warehouse;
use App\Services\AuditLogService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StockAdjustmentService implements StockAdjustmentServiceInterface
{
    public function __construct(
        protected AuditLogService $auditLog,
    ) {}

    /**
     * List stock adjustments with filtering, sorting, and pagination.
     */
    public function list(
        array $filters = [],
        array $sort = ['field' => 'created_at', 'direction' => 'desc'],
        array $pagination = ['page' => 1, 'perPage' => 15],
    ): LengthAwarePaginator {

        $query = StockAdjustment::query()
            ->with(['product', 'user', 'warehouse'])
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where('reason', 'like', "%{$search}%");
            })
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->when($filters['warehouse_id'] ?? null, fn ($q, $wid) => $q->where('warehouse_id', $wid))
            ->when($filters['date_from'] ?? null, fn ($q, $d) => $q->whereDate('adjusted_at', '>=', $d))
            ->when($filters['date_to'] ?? null, fn ($q, $d) => $q->whereDate('adjusted_at', '<=', $d));

        // Apply sorting
        $sortField = in_array($sort['field'], ['quantity', 'type', 'adjusted_at', 'created_at'])
            ? $sort['field']
            : 'created_at';
        $sortDir = in_array(strtolower($sort['direction']), ['asc', 'desc'])
            ? $sort['direction']
            : 'desc';

        $query->orderBy($sortField, $sortDir);

        return $query->paginate(
            perPage: min($pagination['perPage'], 100), // Cap at 100
            page: max(1, $pagination['page']),
        );
    }

    /**
     * Create a single stock adjustment with validation and stock update.
     * Uses DB transaction to ensure consistency between adjustment + movement records.
     */
    public function create(
        Product $product,
        int $quantity,
        string $type,
        ?string $reason,
        User $user,
    ): StockAdjustment {

        $this->validateAdjustment($type, $quantity, $product);

        return DB::transaction(function () use ($product, $quantity, $type, $reason, $user) {
            // Create the adjustment record
            $adjustment = StockAdjustment::create([
                'product_id' => $product->id,
                'warehouse_id' => $product->warehouse_id,
                'quantity' => abs($quantity),
                'type' => $type,
                'reason' => $reason,
                'adjusted_by' => $user->id,
                'adjusted_at' => now(),
            ]);

            // Create corresponding movement record
            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $product->warehouse_id,
                'quantity' => $quantity,
                'type' => $type,
                'reference_type' => 'stock_adjustment',
                'reference_id' => $adjustment->id,
                'moved_by' => $user->id,
                'moved_at' => now(),
            ]);

            // Update product stock level
            $product->update(['stock_quantity' => $product->stock_quantity + $quantity]);

            // Log the audit trail
            $this->auditLog->log(
                subject: $product,
                action: "stock_{$type}",
                user: $user,
                details: [
                    'quantity' => abs($quantity),
                    'reason' => $reason,
                    'warehouse_id' => $product->warehouse_id,
                ],
            );

            return $adjustment->load(['product', 'user', 'warehouse']);
        });
    }

    /**
     * Bulk create adjustments (e.g., from CSV import).
     */
    public function bulkCreate(array $adjustments, User $user): Collection
    {
        $results = collect();

        DB::transaction(function () use ($adjustments, $user, $results) {
            foreach ($adjustments as $adj) {
                $validator = Validator::make($adj, [
                    'product_id' => 'required|exists:products,id',
                    'quantity' => 'required|integer|min:-999999|max:999999',
                    'type' => 'required|in:in,out,transfer_in,transfer_out',
                    'reason' => 'nullable|string|max:500',
                ]);

                if ($validator->fails()) {
                    $results->push(['error' => $validator->errors(), 'data' => $adj]);
                    continue;
                }

                $product = Product::findOrFail($adj['product_id']);
                $created = $this->create(
                    product: $product,
                    quantity: (int) $adj['quantity'],
                    type: $adj['type'],
                    reason: $adj['reason'] ?? null,
                    user: $user,
                );

                $results->push(['success' => true, 'data' => $created]);
            }
        });

        return $results;
    }

    /**
     * Validate adjustment parameters.
     */
    protected function validateAdjustment(string $type, int $quantity, Product $product): void
    {
        // 'out' adjustments arrive as negative quantities, so compare the
        // absolute amount being removed against the available stock.
        if ($type === 'out' && abs($quantity) > $product->stock_quantity) {
            throw new \App\Exceptions\InsufficientStockException(
                product: $product,
                requested: abs($quantity),
                available: $product->stock_quantity,
            );
        }

        if ($type === 'transfer_out') {
            $destination = Warehouse::find($product->warehouse_id);
            if (!$destination) {
                throw new \App\Exceptions\InvalidWarehouseException('Destination warehouse not found');
            }
        }
    }
}
```

---

## Pest Tests

```php
<?php

use App\Modules\Inventory\Services\StockAdjustmentService;
use App\Modules\Products\Models\Product;
use App\Modules\Warehouses\Models\Warehouse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->warehouse = Warehouse::factory()->create();
    $this->user = User::factory()->create();
    $this->service = new StockAdjustmentService(
        auditLog: app(\App\Services\AuditLogService::class),
    );
});

describe('StockAdjustmentService', function () {

    it('creates a stock in adjustment', function () {
        $product = Product::factory()->create(['warehouse_id' => $this->warehouse->id]);

        $adjustment = $this->service->create(
            product: $product,
            quantity: 50,
            type: 'in',
            reason: 'Initial stock',
            user: $this->user,
        );

        expect($adjustment)->toBeInstanceOf(StockAdjustment::class)
            ->and($adjustment->quantity)->toBe(50)
            ->and($adjustment->type)->toBe('in')
            ->and($product->fresh()->stock_quantity)->toBe(50);
    });

    it('creates a stock out adjustment and reduces quantity', function () {
        $product = Product::factory()->create([
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 100,
        ]);

        $adjustment = $this->service->create(
            product: $product,
            quantity: -30,
            type: 'out',
            reason: 'Sale',
            user: $this->user,
        );

        expect($adjustment->quantity)->toBe(30)
            ->and($product->fresh()->stock_quantity)->toBe(70);
    });

    it('throws insufficient stock exception on negative adjustment exceeding stock', function () {
        $product = Product::factory()->create([
            'warehouse_id' => $this->warehouse->id,
            'stock_quantity' => 10,
        ]);

        expect(fn () => $this->service->create(
            product: $product,
            quantity: -50,
            type: 'out',
            reason: 'Too much',
            user: $this->user,
        ))->toThrow(\App\Exceptions\InsufficientStockException::class);
    });

    it('creates movement and adjustment records in a transaction', function () {
        $product = Product::factory()->create(['warehouse_id' => $this->warehouse->id]);

        $this->service->create(
            product: $product,
            quantity: 25,
            type: 'in',
            reason: 'Test',
            user: $this->user,
        );

        expect(StockMovement::count())->toBe(1)
            ->and(StockAdjustment::count())->toBe(1);
    });

    it('returns paginated results with filters', function () {
        $product = Product::factory()->create(['warehouse_id' => $this->warehouse->id]);
        StockAdjustment::factory()->count(5)->create(['product_id' => $product->id]);
        StockAdjustment::factory()->count(3)->create();

        $result = $this->service->list(
            filters: ['product_id' => $product->id],
            pagination: ['page' => 1, 'perPage' => 10],
        );

        expect($result)->toBeInstanceOf(LengthAwarePaginator::class)
            ->and($result->total())->toBe(5);
    });

    it('caps per_page at 100', function () {
        Product::factory()->count(5)->create(['warehouse_id' => $this->warehouse->id]);

        $result = $this->service->list(
            pagination: ['page' => 1, 'perPage' => 500],
        );

        expect($result->perPage())->toBe(100);
    });
});
```

---

## Key Patterns

| Pattern | Why |
|---------|-----|
| Interface + implementation | Allows mocking in tests; decouples service from consumers |
| `DB::transaction()` | Atomicity: adjustment + movement + stock update must all succeed or fail together |
| Constructor DI (`AuditLogService`) | Testable without touching global state |
| Guarded sort fields | Prevents SQL injection via untrusted sort parameters |
| `min($perPage, 100)` cap | Prevents abuse / memory issues from huge page sizes |
| Custom exception classes | Specific error types (InsufficientStockException) for targeted handling |
| `Validator::make` in bulk | Per-item validation within bulk operations |
| Eager loading in `list()` | `with()` prevents N+1 query problems |
| Factory + `beforeEach` in Pest | Clean test isolation with fresh data per test |

---

## Custom Exception

```php
<?php

namespace App\Exceptions;

use App\Modules\Products\Models\Product;
use Exception;

class InsufficientStockException extends Exception
{
    public function __construct(
        public readonly Product $product,
        public readonly int $requested,
        public readonly int $available,
    ) {
        parent::__construct(
            "Insufficient stock for {$product->name}. Requested: {$requested}, Available: {$available}"
        );
    }
}
```
