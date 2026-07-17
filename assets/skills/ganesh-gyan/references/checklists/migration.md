# Migration Checklist

Use this checklist when creating or reviewing database migrations.

---

## Checklist

### Structure

- [ ] Migration file in `database/migrations/` with timestamp prefix
- [ ] `up()` method creates the schema
- [ ] `down()` method drops or reverses the schema
- [ ] Migration runs without errors (`php artisan migrate`)
- [ ] Migration rolls back without errors (`php artisan migrate:rollback`)

### Column Types

- [ ] `id()` for primary key
- [ ] `foreignId()` for foreign keys (matches `users.id` type)
- [ ] `unsignedBigInteger()` for all ID columns
- [ ] `unsignedDecimal(p, q)` for monetary values
- [ ] `string(size)` with appropriate size limits
- [ ] `text()` for long text (no arbitrary char limits)
- [ ] `boolean()` for true/false (not tinyInteger)
- [ ] `json()` for structured data
- [ ] `enum(values)` for fixed-value fields
- [ ] `timestamp()` with `useCurrent()` for defaults
- [ ] `softDeletes()` where appropriate
- [ ] `timestamps()` for created_at / updated_at
- [ ] No `float` or `double` (use `decimal` for precision)
- [ ] No `integer()` for IDs (use `bigInteger` / `foreignId`)

### Foreign Keys

- [ ] `->constrained('table')` on all foreign keys
- [ ] Cascade rules appropriate:
  - `cascadeOnDelete()` for dependent records (e.g., order_items -> orders)
  - `restrictOnDelete()` for referenced records (e.g., products -> stock_adjustments)
  - `nullOnDelete()` for optional references (e.g., audit_logs -> users)
- [ ] Cascade rules tested (deleting parent cascades correctly)
- [ ] No circular cascade paths

### Indexes

- [ ] Index on every foreign key column
- [ ] Index on filtered columns
- [ ] Index on sorted columns
- [ ] Composite index for multi-column WHERE clauses
- [ ] Full-text index for search columns
- [ ] Unique index on columns that must be unique (SKU, email, etc.)
- [ ] Index names follow `{table}_{column}_idx` format
- [ ] No duplicate or overlapping indexes
- [ ] Composite indexes ordered by selectivity (most selective first)

### Comments

- [ ] `->comment()` on every column explaining its purpose
- [ ] Migration file has docblock explaining the table's purpose
- [ ] Column comments visible in `SHOW CREATE TABLE {table}`
- [ ] Enum values documented in comment

### Relationships

- [ ] Polymorphic relations have indexed `[type, id]` columns
- [ ] Many-to-many pivot tables have composite unique index on foreign keys
- [ ] Pivot table columns match convention (`{singular}_id`)
- [ ] Morph columns named correctly (`{name}_type`, `{name}_id`)

### Data Integrity

- [ ] NOT NULL where data is required
- [ ] DEFAULT values set where appropriate
- [ ] `->useCurrent()` on timestamps for auto-default
- [ ] `->useCurrentOnUpdate()` for updated_at
- [ ] Enum columns restricted to valid values
- [ ] Numeric columns have appropriate min/max (if enforceable)
- [ ] String columns have length limits to prevent abuse

### Soft Deletes

- [ ] `SoftDeletes` trait on model
- [ ] `deleted_at` column included in migration
- [ ] Soft deletes tested (trashed records not in normal queries)
- [ ] `withTrashed()` used where needed
- [ ] `forceDelete()` for permanent removal
- [ ] Soft deletes NOT used on:
  - Audit logs (need permanent record)
  - Pivot tables (usually)
  - Reference/master data (categories, roles)

### Testing

- [ ] Migration runs in Pest test (`RefreshDatabase` trait)
- [ ] Table exists after migration
- [ ] Columns have correct types
- [ ] Foreign keys exist
- [ ] Indexes exist
- [ ] Default values work
- [ ] `down()` properly drops table

### Naming Conventions

- [ ] Table names are plural (e.g., `products`, not `product`)
- [ ] Column names are snake_case (e.g., `created_at`, not `createdAt`)
- [ ] Foreign keys: `{singular}_id` (e.g., `product_id`)
- [ ] Pivot tables: alphabetical `{singular1}_{singular2}` (e.g., `role_user`)
- [ ] Morph columns: `{name}_type`, `{name}_id`
- [ ] Boolean columns: `is_{adjective}` or `has_{noun}`
- [ ] Timestamp columns: `{action}_at` (e.g., `adjusted_at`)
- [ ] JSON columns: `{name}_data` or `{name}_meta`

### MySQL-Specific

- [ ] Compatible with MySQL 8.0+
- [ ] No PostgreSQL-specific features
- [ ] String columns use `utf8mb4` charset
- [ ] Full-text indexes use `InnoDB` (MySQL 5.6+)
- [ ] No `ENUM` for columns that may change (use lookup table instead)
- [ ] Text search uses `FULLTEXT` index

### Performance

- [ ] Index count reasonable (not over-indexed, slows writes)
- [ ] No indexes on columns with low cardinality (unless filtered often)
- [ ] Wide indexes avoided (MySQL 767-byte limit for non-utf8mb4)
- [ ] `VARCHAR(255)` used only where needed (use shorter for known max length)
- [ ] `TEXT` for content, `VARCHAR` for identifiers

### Rollback Safety

- [ ] `down()` method properly reverses `up()`
- [ ] Drop indexes before dropping columns
- [ ] Drop foreign keys before dropping tables
- [ ] `Schema::dropIfExists()` used in down()
- [ ] Migration can be rolled back in any order

---

## Quick Validation

```bash
# Run migrations
php artisan migrate --force

# Check for errors
php artisan migrate:status

# Rollback and re-run
php artisan migrate:rollback --step=1
php artisan migrate

# Check table structure
php artisan tinker
>>> Schema::getColumnListing('products');
>>> Schema::getIndexes('products');

# In Pest test
it('creates the table correctly', function () {
    Schema::create('test_products', function ($table) {
        $table->id();
        $table->string('name');
    });

    expect(Schema::hasTable('test_products'))->toBeTrue();
});
```
