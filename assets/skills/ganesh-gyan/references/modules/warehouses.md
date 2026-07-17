# Warehouse Module Definition

## Table

`warehouses`

## Fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | BigIncrements | PK | Primary key |
| name | string(255) | NOT NULL | Warehouse display name |
| code | string(20) | NOT NULL, UNIQUE | Short code for quick reference |
| address | string(500) | NULLABLE | Physical address line 1 |
| city | string(100) | NULLABLE | City |
| state | string(100) | NULLABLE | State / province |
| country | string(2) | NULLABLE | ISO 3166-1 alpha-2 country code |
| zip_code | string(20) | NULLABLE | Postal / ZIP code |
| phone | string(30) | NULLABLE | Contact phone number |
| email | string(254) | NULLABLE | Contact email |
| is_active | boolean | NOT NULL, DEFAULT true | Whether warehouse is operational |
| created_at | timestamp | NULLABLE | Auto-managed |
| updated_at | timestamp | NULLABLE | Auto-managed |

### Validation Rules

| Field | Rules |
|-------|-------|
| name | required|string|min:2|max:255 |
| code | required|string|min:2|max:20|unique:warehouses,code |
| address | nullable|string|max:500 |
| city | nullable|string|max:100 |
| state | nullable|string|max:100 |
| country | nullable|string|size:2|regex:/^[A-Z]{2}$/ |
| zip_code | nullable|string|max:20 |
| phone | nullable|string|max:30|regex:/^[\+]?[\d\s\-()]+$/ |
| email | nullable|email|max:254 |
| is_active | boolean |

## Relationships

| Relation | Type | Model |
|----------|------|-------|
| inventories | HasMany | App\Models\Inventory |
| movements | HasMany | App\Models\InventoryMovement |

## Permissions

| Permission | Description |
|------------|-------------|
| view_warehouse | Can view warehouses |
| create_warehouse | Can create new warehouses |
| update_warehouse | Can update warehouse details |
| delete_warehouse | Can delete warehouses |

## Routes

| Method | URI | Controller@Action |
|--------|-----|-------------------|
| GET | /warehouses | WarehouseController@index |
| GET | /warehouses/create | WarehouseController@create |
| POST | /warehouses | WarehouseController@store |
| GET | /warehouses/{id} | WarehouseController@show |
| GET | /warehouses/{id}/edit | WarehouseController@edit |
| PUT/PATCH | /warehouses/{id} | WarehouseController@update |
| DELETE | /warehouses/{id} | WarehouseController@destroy |

All routes are protected with the `auth:sanctum` middleware.

## Vue Pages

| Page | Component | Path |
|------|-----------|------|
| WarehouseListing.vue | Resource listing with DataTable, filters, pagination | resources/js/Pages/warehouses/WarehouseListing.vue |
| WarehouseForm.vue | Create/edit form with form validation | resources/js/Pages/warehouses/WarehouseForm.vue |
| WarehouseDetail.vue | Read-only detail view | resources/js/Pages/warehouses/WarehouseDetail.vue |

## Filters

| Filter | Type | Description |
|--------|------|-------------|
| search | text | Search by name, code, city |
| city | select | Filter by city (async search) |
| is_active | toggle | Filter active/inactive warehouses |

## Columns (WarehouseListing)

| Column | Label | Sortable | Searchable | Width |
|--------|-------|----------|------------|-------|
| name | Name | Yes | Yes | 200px |
| code | Code | Yes | Yes | 100px |
| city | City | Yes | Yes | 120px |
| country | Country | Yes | Yes | 100px |
| phone | Phone | Yes | No | 150px |
| is_active | Active | Yes | No | 90px |
| actions | Actions | No | No | 150px |
