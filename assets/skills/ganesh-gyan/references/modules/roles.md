# Roles Module Definition

## Tables

### `roles`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | BigIncrements | PK | Primary key |
| name | string(255) | NOT NULL, UNIQUE | Role name (e.g., admin, user) |
| guard_name | string(255) | NOT NULL, DEFAULT 'web' | Auth guard name |
| created_at | timestamp | NULLABLE | Auto-managed |
| updated_at | timestamp | NULLABLE | Auto-managed |

### `role_permissions`

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| role_id | unsignedBigInteger | NOT NULL, FK → roles.id | Role |
| permission_id | unsignedBigInteger | NOT NULL, FK → permissions.id | Permission |

## Fields

### Role Validation Rules

| Field | Rules |
|-------|-------|
| name | required|string|min:2|max:255|unique:roles,name |
| guard_name | required|string|max:255 |

### Permission Assignment Rules

| Field | Rules |
|-------|-------|
| permissions | required|array|min:1 |
| permissions.* | exists:permissions,id |

## Relationships

| Relation | Type | Model |
|----------|------|-------|
| permissions | BelongsToMany | App\Models\Permission (pivot: role_permissions) |
| users | HasMany | App\Models\User |

## Permissions

| Permission | Description |
|------------|-------------|
| view_role | Can view roles |
| create_role | Can create new roles |
| update_role | Can update role details |
| delete_role | Can delete roles |

## Routes

| Method | URI | Controller@Action |
|--------|-----|-------------------|
| GET | /roles | RoleController@index |
| GET | /roles/create | RoleController@create |
| POST | /roles | RoleController@store |
| GET | /roles/{id} | RoleController@show |
| GET | /roles/{id}/edit | RoleController@edit |
| PUT/PATCH | /roles/{id} | RoleController@update |
| DELETE | /roles/{id} | RoleController@destroy |
| POST | /roles/{id}/permissions | PermissionController@attach |
| DELETE | /roles/{id}/permissions/{permission_id} | PermissionController@detach |

All routes are protected with the `auth:sanctum` middleware. Only super_admin can manage roles.

## Vue Pages

| Page | Component | Path |
|------|-----------|------|
| RoleListing.vue | Resource listing with DataTable, filters, pagination | resources/js/Pages/roles/RoleListing.vue |
| RoleForm.vue | Create/edit form with form validation | resources/js/Pages/roles/RoleForm.vue |
| PermissionManagement.vue | Permission assignment interface with checkboxes/toggle | resources/js/Pages/roles/PermissionManagement.vue |

## Filters

| Filter | Type | Description |
|--------|------|-------------|
| search | text | Search by role name |

## Columns (RoleListing)

| Column | Label | Sortable | Searchable | Width |
|--------|-------|----------|------------|-------|
| name | Name | Yes | Yes | 180px |
| guard_name | Guard | Yes | No | 100px |
| users_count | Users | Yes | No | 90px |
| permissions | Permissions | No | No | 200px |
| actions | Actions | No | No | 150px |

Permissions column displays a truncated list or badge count with tooltip for full list.
