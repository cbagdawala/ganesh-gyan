# Naming Conventions

## PHP

| Element | Convention | Example |
|---|---|---|
| Class names | PascalCase | `UserService`, `CreateOrderAction`, `OrderResource` |
| Method names | camelCase | `findUserById()`, `createOrder()` |
| Property names | camelCase | `$userName`, `$orderItems` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `API_VERSION` |
| Namespace | PascalCase (PSR-4) | `App\\Services\\OrderService` |
| File names | Match class name | `UserService.php`, `CreateOrderAction.php` |

## Vue

| Element | Convention | Example |
|---|---|---|
| Component names | PascalCase | `UserProfileCard.vue`, `DataTable.vue` |
| Component file names | PascalCase | `UserProfileCard.vue`, `UserListPage.vue` |
| Composable functions | `use` prefix, camelCase | `usePagination()`, `useDebounce()` |
| Router names | kebab-case or dot notation | `users.create`, `dashboard` |
| Route path | kebab-case | `/users/create`, `/orders/:id/edit` |
| CSS class names | kebab-case or BEM | `.user-card__name`, `.form-input--error` |
| Computed properties | descriptive adjective/noun | `isLoading`, `hasPermission`, `displayName` |
| Ref names | descriptive noun | `users`, `searchTerm`, `isValid` |

## Database

| Element | Convention | Example |
|---|---|---|
| Table names | snake_case plural | `users`, `order_items`, `role_user` |
| Column names | snake_case | `first_name`, `created_at`, `user_id` |
| Foreign keys | `model_id` snake_case | `user_id`, `product_id`, `order_id` |
| Pivot tables | alphabetically sorted model names | `role_user` (not `user_role`) |
| Indexes | `idx_{table}_{columns}` | `idx_users_email`, `idx_orders_user_status` |
| Unique indexes | `uniq_{table}_{columns}` | `uniq_users_email` |
| Boolean columns | `is_` prefix or verb prefix | `is_active`, `has_paid` |
| Timestamps | `created_at`, `updated_at`, `deleted_at` | — |
| JSON columns | descriptive plural | `settings`, `metadata`, `preferences` |

## Routes

| Element | Convention | Example |
|---|---|---|
| Route names | dot notation, kebab-case segments | `users.index`, `orders.store` |
| Route paths | kebab-case | `/api/v1/users`, `/api/v1/orders/{id}` |
| Controller methods | resourceful names | `index`, `show`, `store`, `update`, `destroy` |

```php
// Route naming
Route::get('/users', [UserController::class, 'index'])->name('users.index');
Route::post('/users', [UserController::class, 'store'])->name('users.store');
Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
```

## Environment Variables

All `.env` variables use UPPER_SNAKE_CASE:

```
APP_NAME=LaraApp
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=app_local
DB_USERNAME=root
DB_PASSWORD=secret

SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DRIVER=database
SESSION_LIFETIME=120

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

## CSS / Styles

Use Tailwind utility classes where possible. For complex custom styles, use BEM naming:

```css
/* BEM example */
.user-card { }
.user-card__header { }
.user-card__body { }
.user-card__footer { }
.user-card--compact { }
.user-card--error { }
.user-card__button--edit { }
.user-card__button--delete { }
```

## File Naming

| Type | Convention | Example |
|---|---|---|
| PHP files | Match class name | `UserController.php`, `OrderPolicy.php` |
| Migration files | Timestamp + description | `2024_01_15_103000_create_orders_table.php` |
| Seeder files | Descriptive PascalCase | `DatabaseSeeder.php`, `UsersTableSeeder.php` |
| Test files | Descriptive, `Test` suffix | `UserTest.php`, `OrderServiceTest.php` |
| Config files | snake_case | `auth.php`, `sanctum.php` |
| JS/Ts files | camelCase or kebab-case | `apiClient.ts`, `useAuth.ts` |
| Vue components | PascalCase | `UserProfileCard.vue` |

## API Endpoints

| Element | Convention | Example |
|---|---|---|
| Resource names | plural, kebab-case | `/users`, `/order-items`, `/product-categories` |
| Nested resources | slash notation | `/users/{id}/orders` |
| Action endpoints | verb-noun | `/orders/{id}/cancel`, `/users/{id}/activate` |
| Search/filter | query params, kebab-case | `?search=john&sort=name&order=asc` |
