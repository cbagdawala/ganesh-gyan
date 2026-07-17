# User Module Definition

## Table

`users`

## Fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | BigIncrements | PK | Primary key |
| name | string(255) | NOT NULL | Display name |
| email | string(254) | NOT NULL, UNIQUE | Unique email address |
| email_verified_at | timestamp | NULLABLE | Auto-managed |
| password | string(255) | NOT NULL | Hashed with bcrypt |
| avatar | string(500) | NULLABLE | Avatar image URL |
| phone | string(30) | NULLABLE | Contact phone number |
| role_id | unsignedBigInteger | NULLABLE, FK → roles.id | Assigned role |
| status | enum('active','inactive','suspended') | NOT NULL, DEFAULT 'active' | Account status |
| last_login_at | timestamp | NULLABLE | Timestamp of last login |
| created_at | timestamp | NULLABLE | Auto-managed |
| updated_at | timestamp | NULLABLE | Auto-managed |

### Validation Rules

| Field | Rules |
|-------|-------|
| name | required|string|min:2|max:255 |
| email | required|email|max:254|unique:users,email |
| password | required|string|min:8|confirmed (create only) |
| avatar | nullable|file|mimes:jpeg,png,webp|max:2048 |
| phone | nullable|string|max:30|regex:/^[\+]?[\d\s\-()]+$/ |
| role_id | nullable|exists:roles,id |
| status | required|string|in:active,inactive,suspended |

## Relationships

| Relation | Type | Model |
|----------|------|-------|
| role | BelongsTo | App\Models\Role |
| orders | HasMany | App\Models\Order |
| activityLogs | HasMany | App\Models\ActivityLog |

## Permissions

| Permission | Description |
|------------|-------------|
| view_user | Can view users |
| create_user | Can create new users |
| update_user | Can update user details |
| delete_user | Can delete users (admin/super_admin only) |

Delete permission requires role check: only users with super_admin or admin role can delete.

## Routes

| Method | URI | Controller@Action |
|--------|-----|-------------------|
| GET | /users | UserController@index |
| GET | /users/create | UserController@create |
| POST | /users | UserController@store |
| GET | /users/{id} | UserController@show |
| GET | /users/{id}/edit | UserController@edit |
| PUT/PATCH | /users/{id} | UserController@update |
| DELETE | /users/{id} | UserController@destroy |

All routes are protected with the `auth:sanctum` middleware. Delete routes require admin/super_admin role.

## Vue Pages

| Page | Component | Path |
|------|-----------|------|
| UserListing.vue | Resource listing with DataTable, filters, pagination | resources/js/Pages/users/UserListing.vue |
| UserForm.vue | Create/edit form with form validation | resources/js/Pages/users/UserForm.vue |
| UserDetail.vue | Read-only detail view | resources/js/Pages/users/UserDetail.vue |

## Filters

| Filter | Type | Description |
|--------|------|-------------|
| search | text | Search by name, email |
| role | select | Filter by role (async search) |
| status | select | Filter by account status (active/inactive/suspended) |

## Columns (UserListing)

| Column | Label | Sortable | Searchable | Width |
|--------|-------|----------|------------|-------|
| name | Name | Yes | Yes | 180px |
| email | Email | Yes | Yes | 220px |
| role | Role | Yes | No | 120px |
| status | Status | Yes | No | 120px |
| last_login_at | Last Login | Yes | No | 150px |
| actions | Actions | No | No | 150px |
