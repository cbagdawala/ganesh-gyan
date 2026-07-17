# Good Migration Example

A well-structured database migration demonstrating indexes, foreign keys, soft deletes, and MySQL best practices.

---

## Context

- **Framework**: Laravel 13
- **Database**: MySQL 8.0+
- **Testing**: Pest
- **Module**: Inventory (Stock Adjustments + Audit Logs)

---

## Migration: `create_stock_adjustments_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stock_adjustments', function (Blueprint $table) {
            // Primary key
            $table->id();

            // Foreign keys with cascading
            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete(); // Prevent delete if adjustments exist

            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->cascadeOnDelete();

            $table->foreignId('adjusted_by')
                ->constrained('users')
                ->restrictOnDelete();

            // Core data
            $table->enum('type', ['in', 'out', 'transfer_in', 'transfer_out'])
                ->comment('Type of stock adjustment');

            $table->unsignedBigInteger('quantity')
                ->comment('Absolute quantity adjusted (always positive)');

            $table->unsignedDecimal('value', 12, 2)
                ->default(0)
                ->comment('Total value at cost (quantity * cost_price)');

            $table->string('reason', 500)
                ->nullable()
                ->comment('Optional reason for the adjustment');

            $table->timestamp('adjusted_at')
                ->useCurrent()
                ->comment('When the adjustment was performed');

            // Soft deletes (for audit trail + recovery)
            $table->softDeletes();

            // Timestamps
            $table->timestamps();

            // --- Indexes ---

            // Fast lookup by product
            $table->index('product_id', 'stock_adjustments_product_idx');

            // Fast lookup by warehouse
            $table->index('warehouse_id', 'stock_adjustments_warehouse_idx');

            // Filter adjustments by type
            $table->index('type', 'stock_adjustments_type_idx');

            // Date range queries for reports
            $table->index('adjusted_at', 'stock_adjustments_adjusted_at_idx');

            // Composite: filtered reports by warehouse + date range
            $table->index(['warehouse_id', 'adjusted_at'], 'stock_adjustments_wh_date_idx');

            // Composite: product + type for quick type-specific totals
            $table->index(['product_id', 'type'], 'stock_adjustments_product_type_idx');

            // Full-text search on reason (for admin search)
            $table->fullText('reason', 'stock_adjustments_reason_ft_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
    }
};
```

---

## Migration: `create_stock_movements_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            // Foreign keys
            $table->foreignId('product_id')
                ->constrained('products')
                ->restrictOnDelete();

            $table->foreignId('warehouse_id')
                ->constrained('warehouses')
                ->cascadeOnDelete();

            $table->foreignId('moved_by')
                ->constrained('users')
                ->restrictOnDelete();

            // Movement data
            // bigInteger is signed by default (there is no signedBigInteger() on Blueprint).
            $table->bigInteger('quantity')
                ->comment('Positive for in, negative for out');

            $table->enum('type', ['in', 'out', 'transfer_in', 'transfer_out', 'adjustment'])
                ->comment('Source of the movement');

            // Polymorphic reference to the source record
            $table->string('reference_type', 100)
                ->nullable()
                ->comment('Class name of the source (e.g., StockAdjustment)');

            $table->unsignedBigInteger('reference_id')
                ->nullable()
                ->comment('ID of the source record');

            $table->index(['reference_type', 'reference_id'], 'stock_movements_polymorphic_idx');

            $table->text('notes')
                ->nullable();

            // When the movement occurred (StockAdjustmentService writes `moved_at => now()`).
            $table->timestamp('moved_at')
                ->useCurrent()
                ->comment('When the stock movement occurred');

            // Soft deletes
            $table->softDeletes();

            // Timestamps
            $table->timestamps();

            // Indexes
            $table->index('product_id', 'stock_movements_product_idx');
            $table->index('warehouse_id', 'stock_movements_warehouse_idx');
            $table->index(['warehouse_id', 'moved_at'], 'stock_movements_wh_time_idx');
            $table->index('type', 'stock_movements_type_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
```

---

## Migration: `create_audit_logs_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->nullOnDelete(); // Allow logs without a user (system actions)

            $table->string('action', 100)
                ->comment('Action performed (e.g., product.created, stock.out)');

            $table->string('subject_type', 100)
                ->comment('Eloquent model class (e.g., App\\Modules\\Products\\Models\\Product)');

            $table->unsignedBigInteger('subject_id')
                ->comment('ID of the affected model');

            // Polymorphic subject
            $table->index(['subject_type', 'subject_id'], 'audit_logs_subject_idx');

            // JSON for structured audit data
            $table->json('old_values')
                ->nullable()
                ->comment('Values before the change');

            $table->json('new_values')
                ->nullable()
                ->comment('Values after the change');

            $table->json('meta')
                ->nullable()
                ->comment('Additional metadata (IP, user agent, batch ID)');

            $table->string('ip_address', 45)
                ->nullable()
                ->comment('IPv4 or IPv6');

            $table->softDeletes();
            $table->timestamps();

            // Sort audit logs chronologically, then by user
            $table->index(['created_at', 'user_id'], 'audit_logs_created_user_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
```

---

## Migration: `add_stock_indexes_to_products_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds composite and functional indexes to the products table
     * for common query patterns: filtering by category, searching by name/SKU,
     * and bulk stock operations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // SKU must be unique (enforced at DB level)
            $table->string('sku', 50)->unique()->change();

            // Composite index: filter by category + sort by name
            $table->index(['category_id', 'name'], 'products_category_name_idx');

            // Composite index: filter by category + sort by stock
            $table->index(['category_id', 'stock_quantity'], 'products_category_stock_idx');

            // Composite index: warehouse + status for listing
            $table->index(['warehouse_id', 'status'], 'products_warehouse_status_idx');

            // Full-text search on name and description
            $table->fullText(['name', 'description'], 'products_search_ft_idx');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_category_name_idx');
            $table->dropIndex('products_category_stock_idx');
            $table->dropIndex('products_warehouse_status_idx');
            $table->dropIndex('products_search_ft_idx');
        });
    }
};
```

---

## Model with Soft Deletes

```php
<?php

namespace App\Modules\Inventory\Models;

use App\Models\User;
use App\Modules\Products\Models\Product;
use App\Modules\Warehouses\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockAdjustment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'product_id', 'warehouse_id', 'adjusted_by',
        'type', 'quantity', 'value', 'reason', 'adjusted_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'value' => 'decimal:2',
        'adjusted_at' => 'datetime',
    ];

    // --- Relationships ---
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function adjustedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }

    // --- Scopes ---
    public function scopeType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeDateRange(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('adjusted_at', [$from, $to]);
    }

    public function scopeByWarehouse(Builder $query, int $warehouseId): Builder
    {
        return $query->where('warehouse_id', $warehouseId);
    }
}
```

---

## Key Patterns

| Pattern | Why |
|---------|-----|
| `->comment()` on every column | Self-documenting schema; visible in `SHOW CREATE TABLE` |
| `->nullable()` on optional text | Prevents NOT NULL constraint failures |
| `->useCurrent()` on timestamps | Default to NOW() at DB level |
| `->unsignedBigInteger()` | Prevents negative IDs; matches foreign keys |
| `->decimal(12, 2)` | Exact precision for monetary values (no float) |
| `->restrictOnDelete()` | Prevents accidental cascade deletes of referenced records |
| `->cascadeOnDelete()` | Clean up dependent records when parent is deleted |
| `->nullOnDelete()` | Keep audit logs even if user is deleted |
| Explicit index names | `table_column_idx` format; visible in `EXPLAIN` output |
| Composite indexes for common query patterns | Single index scan for multi-column WHERE clauses |
| `fullText` for search columns | Efficient text search with `MATCH() AGAINST()` |
| Polymorphic indexes on `[type, id]` | Single index for both sides of the polymorphic relation |
| `->change()` with `unique()` | Altering existing column to add unique constraint |
| Separate migration for adding indexes | Non-destructive; can be deployed without downtime |
| `SoftDeletes` trait | Soft delete support for recoverable data |
| Scopes on model | Reusable query filters (`scopeType`, `scopeDateRange`) |

---

## Pest Test for Migration

```php
<?php

use Illuminate\Support\Facades\Schema;

it('creates the stock_adjustments table with all expected columns', function () {
    Schema::create('stock_adjustments_test', function ($table) {
        $table->id();
        $table->foreignId('product_id')->constrained('products');
    });

    $columns = Schema::getColumnListing('stock_adjustments_test');

    expect($columns)->toContain('id', 'product_id', 'warehouse_id', 'adjusted_by')
        ->and($columns)->not->toContain('deleted_at'); // We're not testing SoftDeletes here

    Schema::dropIfExists('stock_adjustments_test');
});

it('creates stock_movements with polymorphic columns', function () {
    Schema::create('stock_movements_test', function ($table) {
        $table->id();
        $table->string('reference_type', 100)->nullable();
        $table->unsignedBigInteger('reference_id')->nullable();
    });

    // Schema::getColumnType() returns the database type name as a string
    // (e.g. 'varchar', 'bigint'), not an array.
    $referenceType = Schema::getColumnType('stock_movements_test', 'reference_type');
    $referenceId = Schema::getColumnType('stock_movements_test', 'reference_id');

    expect($referenceType)->toBe('varchar')
        ->and($referenceId)->toBe('bigint');

    Schema::dropIfExists('stock_movements_test');
});
```
