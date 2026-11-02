# Documentation Standards

> Builds on `references/principles/documentation.md` — read it first. This file covers how to apply it on Laravel 13 + Vue 3.5.

## PHP Documentation (PHPDoc)

All public classes, methods, and properties must have PHPDoc annotations.

### Class Documentation

```php
/**
 * Manages user-related business operations.
 *
 * Handles creation, updating, deactivation, and
 * profile management of user accounts.
 *
 * @author Dev Team
 * @package App\Services
 */
class UserService
{
    // ...
}
```

### Method Documentation

```php
/**
 * Create a new user account.
 *
 * @param CreateUserDto $dto The validated user creation data transfer object.
 * @param User $actor The user performing this action (for audit logging).
 * @return User The created user instance with saved relationships.
 * @throws UniqueConstraintViolationException If the email is already registered.
 * @throws PasswordPolicyException If the password does not meet requirements.
 */
public function create(CreateUserDto $dto, User $actor): User
{
    // ...
}
```

### Parameter and Return Tags

```php
/**
 * Get users matching the given filters.
 *
 * @param array{
 *     search?: string,
 *     role?: \App\Enums\UserRole,
 *     active?: bool,
 *     per_page?: int,
 * } $filters Query filter parameters.
 * @param int $perPage Number of results per page (max 100).
 * @return \Illuminate\Pagination\LengthAwarePaginator<\App\Models\User> Paginated user collection.
 */
public function list(array $filters, int $perPage = 15): LengthAwarePaginator
{
    // ...
}
```

### Property Documentation

```php
class UserService
{
    /** The user repository for data access operations. */
    private readonly UserRepository $repository;

    /** The notification service for sending alerts. */
    private readonly NotificationService $notifications;
}
```

## API Documentation (OpenAPI / Swagger)

### Setup

Use `darkaonline/l5-swagger`, the Laravel wrapper around `zircote/swagger-php`.
It provides the `l5-swagger:generate` Artisan command and publishes the Swagger
UI route (`/api/documentation`) that the raw `swagger-php` library does not:

```bash
composer require darkaonline/l5-swagger
php artisan vendor:publish --provider="L5Swagger\L5SwaggerServiceProvider"
```

### Annotations on Controllers

```php
/**
 * @OA\Tag(name="Users", description="User management endpoints")
 */
class UserController extends Controller
{
    /**
     * List all users.
     *
     * @OA\Get(
     *     path="/api/v1/users",
     *     tags={"Users"},
     *     summary="List users",
     *     description="Returns a paginated list of users with optional filtering.",
     *     security={{"bearerAuth": {}}},
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search by name",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful response",
     *         @OA\JsonContent(
     *             @OA\Property(property="status", type="string", example="success"),
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/User")),
     *             @OA\Property(property="meta", ref="#/components/schemas/PaginationMeta")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(ref="#/components/schemas/Error")
     *     )
     * )
     */
    public function index(): JsonResource
    {
        // ...
    }
}
```

### Generate Documentation

```bash
# Generate OpenAPI spec (l5-swagger)
php artisan l5-swagger:generate

# View in browser
# http://localhost/api/documentation
```

## Vue Component Documentation

### Component Props Documentation

```vue
<script setup lang="ts">
/**
 * Displays a user's profile summary with actions.
 *
 * @example
 * ```vue
 * <template>
 *   <UserProfileCard :user="user" :editable="true" @updated="handleUpdate" />
 * </template>
 * ```
 *
 * @prop {User} user - The user object to display.
 * @prop {boolean} [editable=false] - Whether edit actions should be shown.
 * @prop {boolean} [compact=false] - Whether to use compact layout.
 *
 * @emit {updated} - Emitted when the user is updated.
 * @emit {deleted} - Emitted when the user is deleted.
 * @emit {edit} - Emitted when edit action is triggered.
 */

interface Props {
  user: User
  editable?: boolean
  compact?: boolean
}

interface Emits {
  (e: 'updated', user: User): void
  (e: 'deleted', userId: number): void
  (e: 'edit', userId: number): void
}
</script>
```

### PrimeVue Component Usage Documentation

When using PrimeVue components, document which components and their key props:

```vue
<template>
  <!--
    DataTable with sorting, filtering, and pagination.
    Uses PrimeVue DataTable with virtual scrolling for large datasets.
    Columns are defined via <Column> components with field bindings.
    - sort-mode="single" enables single column sorting
    - paginator-template controls pagination controls layout
  -->
  <DataTable
    :value="items"
    sort-mode="single"
    :paginator="true"
    :rows="20"
    paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
  >
    <Column field="name" header="Name" sortable />
    <Column field="email" header="Email" sortable />
  </DataTable>
</template>
```

## README Updates

When to update the README is covered in the principles file. A Laravel 13 + Vue
project README follows this structure:

### README Structure

```markdown
# Project Name

Brief description of the project.

## Tech Stack

- Laravel 13, Vue 3, PrimeVue 4, MySQL, Laravel Sanctum, Pest

## Prerequisites

- PHP 8.3+
- Node.js 20+
- MySQL 8.0+
- Redis 7.x

## Installation

1. Clone the repository
2. `composer install`
3. `npm install`
4. `cp .env.example .env`
5. `php artisan key:generate`
6. `php artisan migrate --seed`
7. `npm run dev`

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Environment | `local` |
| `SANCTUM_STATEFUL_DOMAINS` | Domains the SPA authenticates from (session cookie) | _(required)_ |
| `SESSION_DRIVER` | Session store backing Sanctum SPA auth | `database` |
| `DB_DATABASE` | Database name | `app_local` |

## Development

- Run tests: `./vendor/bin/pest`
- Run frontend dev server: `npm run dev`
- Format PHP: `./vendor/bin/pint`
- Format JS/Vue: `npx eslint --fix src/`

## API Documentation

View API docs at: `http://localhost/api/documentation`
```

## Changelog Maintenance

Update `CHANGELOG.md` with every release:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- User avatar upload endpoint
- Order status tracking API
- PrimeVue DataTable virtual scrolling support

### Changed
- Updated PrimeVue from v4.0 to v4.2
- Migrated authentication to Laravel Sanctum SPA session cookies

### Fixed
- N+1 query in user list endpoint
- Frontend pagination not resetting on filter change

### Deprecated
- `/api/v0/users` endpoint (use `/api/v1/users`)

## [1.2.0] - 2024-03-15

### Added
- Order cancellation flow
- Email notification for order status changes
```

## Documentation Review

Review documentation at the points listed in the principles file, using this checklist:

### Documentation Checklist

- [ ] PHPDoc on all public methods and classes
- [ ] API endpoints documented with OpenAPI annotations
- [ ] Component props and events documented
- [ ] README reflects current setup and configuration
- [ ] Environment variables documented in README
- [ ] CHANGELOG updated with all changes
- [ ] No outdated code examples in documentation
