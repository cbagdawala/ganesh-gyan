# Inventory Module Definition

## Table

`inventory`

## Fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | BigIncrements | PK | Primary key |
| product_id | unsignedBigInteger | NOT NULL, FK → products.id | Product this record tracks |
| warehouse_id | unsignedBigInteger | NOT NULL, FK → warehouses.id | Warehouse location |
| quantity | integer | NOT NULL, DEFAULT 0 | Current stock quantity |
| min_quantity | integer | NOT NULL, DEFAULT 0 | Minimum stock threshold (reorder level) |
| max_quantity | integer | NULLABLE | Maximum stock capacity (nullable = unlimited) |
| created_at | timestamp | NULLABLE | Auto-managed |
| updated_at | timestamp | NULLABLE | Auto-managed |

### Validation Rules

| Field | Rules |
|-------|-------|
| product_id | required|exists:products,id |
| warehouse_id | required|exists:warehouses,id |
| quantity | required|integer|min:0 |
| min_quantity | required|integer|min:0 |
| max_quantity | nullable|integer|min:0|gt:min_quantity |

## Relationships

| Relation | Type | Model |
|----------|------|-------|
| product | BelongsTo | App\Models\Product |
| warehouse | BelongsTo | App\Models\Warehouse |
| movements | HasMany | App\Models\InventoryMovement |

## Permissions

| Permission | Description |
|------------|-------------|
| view_inventory | Can view inventory records |
| create_inventory | Can create new inventory records |
| update_inventory | Can update inventory quantities |
| delete_inventory | Can delete inventory records |

## Routes

| Method | URI | Controller@Action |
|--------|-----|-------------------|
| GET | /inventory | InventoryController@index |
| GET | /inventory/{id} | InventoryController@show |

Inventory is managed via Product detail/edit forms; no separate create/update/delete routes.

## Vue Pages

| Page | Component | Path |
|------|-----------|------|
| InventoryListing.vue | Resource listing with DataTable, filters, pagination | resources/js/Pages/inventory/InventoryListing.vue |
| InventoryDetail.vue | Read-only detail view with movement history | resources/js/Pages/inventory/InventoryDetail.vue |

## Filters

| Filter | Type | Description |
|--------|------|-------------|
| product | select | Filter by product (async search) |
| warehouse | select | Filter by warehouse (async search) |
| status | select | Filter by stock status (in_stock/low_stock/out_of_stock) |

Status is derived from `quantity`, `min_quantity`, and `max_quantity` on the backend.

## Columns (InventoryListing)

| Column | Label | Sortable | Searchable | Width |
|--------|-------|----------|------------|-------|
| product | Product Name | Yes | Yes | 180px |
| warehouse | Warehouse Name | Yes | Yes | 150px |
| quantity | Current Qty | Yes | No | 90px |
| min_quantity | Min Qty | Yes | No | 90px |
| status | Stock Status | Yes | No | 120px |
| actions | Actions | No | No | 120px |
