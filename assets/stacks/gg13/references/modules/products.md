# Product Module Definition

## Table

`products`

## Fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | BigIncrements | PK | Primary key |
| name | string(255) | NOT NULL | Product display name |
| sku | string(50) | NOT NULL, UNIQUE | Stock Keeping Unit |
| description | text | NULLABLE | Long-form product description |
| price | decimal(12,2) | NOT NULL | Selling price in store currency |
| cost_price | decimal(12,2) | NOT NULL | Cost price for margin calculations |
| category_id | unsignedBigInteger | NOT NULL, FK → categories.id | Product category |
| brand_id | unsignedBigInteger | NOT NULL, FK → brands.id | Product brand |
| status | enum('draft','active','archived') | NOT NULL, DEFAULT 'draft' | Product visibility status |
| stock_quantity | integer | NOT NULL, DEFAULT 0 | Aggregate stock across warehouses |
| image | string(500) | NULLABLE | Image/media URL |
| meta_fields | json | NULLABLE | Flexible metadata (key-value pairs) |
| created_at | timestamp | NULLABLE | Auto-managed |
| updated_at | timestamp | NULLABLE | Auto-managed |

### Validation Rules

| Field | Rules |
|-------|-------|
| name | required|string|min:2|max:255 |
| sku | required|string|min:3|max:50|unique:products,sku |
| description | nullable|string|max:65000 |
| price | required|numeric|min:0.01|regex:/^\d+(\.\d{1,2})?$/ |
| cost_price | required|numeric|min:0|regex:/^\d+(\.\d{1,2})?$/ |
| category_id | required|exists:categories,id |
| brand_id | required|exists:brands,id |
| status | required|string|in:active,draft,archived |
| stock_quantity | required|integer|min:0 |
| image | nullable|file|mimes:jpeg,png,webp,gif|max:2048 |
| meta_fields | nullable|array |

## Relationships

| Relation | Type | Model |
|----------|------|-------|
| category | BelongsTo | App\Models\Category |
| brand | BelongsTo | App\Models\Brand |
| inventories | HasMany | App\Models\Inventory |
| inventoryMovements | HasMany | App\Models\InventoryMovement |

## Permissions

| Permission | Description |
|------------|-------------|
| view_product | Can view products |
| create_product | Can create new products |
| update_product | Can update existing products |
| delete_product | Can delete products |
| export_product | Can export product data (CSV/Excel) |

## Routes

| Method | URI | Controller@Action |
|--------|-----|-------------------|
| GET | /products | ProductController@index |
| GET | /products/create | ProductController@create |
| POST | /products | ProductController@store |
| GET | /products/{id} | ProductController@show |
| GET | /products/{id}/edit | ProductController@edit |
| PUT/PATCH | /products/{id} | ProductController@update |
| DELETE | /products/{id} | ProductController@destroy |

All routes are protected with the `auth:sanctum` middleware.

## Vue Pages

| Page | Component | Path |
|------|-----------|------|
| ProductListing.vue | Resource listing with DataTable, filters, pagination | resources/js/Pages/products/ProductListing.vue |
| ProductForm.vue | Create/edit form with form validation | resources/js/Pages/products/ProductForm.vue |
| ProductDetail.vue | Read-only detail view | resources/js/Pages/products/ProductDetail.vue |

## Filters

| Filter | Type | Description |
|--------|------|-------------|
| search | text | Search by name, sku, description |
| category | select | Filter by category (async search) |
| brand | select | Filter by brand (async search) |
| status | select | Filter by status (draft/active/archived) |
| price_min | number | Minimum price threshold |
| price_max | number | Maximum price threshold |

## Columns (ProductListing)

| Column | Label | Sortable | Searchable | Width |
|--------|-------|----------|------------|-------|
| name | Name | Yes | Yes | 200px |
| sku | SKU | Yes | Yes | 120px |
| category | Category Name | Yes | Yes | 120px |
| brand | Brand | Yes | Yes | 120px |
| price | Price | Yes | No | 100px |
| stock_quantity | Stock | Yes | No | 90px |
| status | Status | Yes | No | 100px |
| actions | Actions | No | No | 150px |
