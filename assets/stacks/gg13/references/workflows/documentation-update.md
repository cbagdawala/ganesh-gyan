# Documentation Update

## When to Use

When adding/changing features, updating API endpoints, modifying configurations, or maintaining project documentation. Covers API docs, changelog, README, and code comments.

## Prerequisites

- Feature or change implemented and tested
- Understanding of what was changed
- Access to documentation files

## Step-by-Step Workflow

### 1. Update API Documentation

**For API routes, document:**
- Endpoint URL and HTTP method
- Request parameters (query, body, headers)
- Response format and status codes
- Authentication requirements
- Rate limiting

**Example API documentation:**

```markdown
## Create Resource

`POST /api/resources`

Creates a new resource.

**Authentication:** Required (Sanctum — SPA session cookie, or `Authorization: Bearer <token>` for API clients)

**Request Body:**
| Field   | Type   | Required | Description        |
|---------|--------|----------|--------------------|
| name    | string | Yes      | Resource name      |
| email   | string | Yes      | Resource email     |
| role_id | integer| No       | Assigned role      |

**Response:** `201 Created`
```json
{
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role_id": 2
}
```

**Error Response:** `422 Unprocessable Entity`
```json
{
    "message": "The name field is required.",
    "errors": {
        "name": ["The name field is required."]
    }
}
```
```

### 2. Update CHANGELOG

**Follow Keep a Changelog format:**

```markdown
## [Unreleased]

### Added
- New resource management feature
- Import/export functionality
- Soft delete support
- Audit logging for all resources
- Search with full-text indexing

### Changed
- Improved API response times (30% faster)
- Updated Vue components to use PrimeVue 4
- Refactored authentication middleware

### Fixed
- Fixed pagination on large datasets
- Fixed timezone handling in date fields
- Fixed file upload validation

### Security
- Added rate limiting to auth endpoints
- Improved input sanitization
- Updated dependencies to patch vulnerabilities
```

### 3. Update README

**Sections to maintain:**
- Project description
- Installation instructions
- Configuration
- Available commands
- API endpoints
- Contributing guidelines
- License

**Example README structure:**

```markdown
# Project Name

Laravel 13 + Vue 3 + PrimeVue application.

## Requirements

- PHP >= 8.3
- Composer
- Node.js >= 18
- MySQL >= 8.0
- Redis (optional, for caching)

## Installation

### Backend
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Frontend
```bash
npm install
npm run dev
```

## Available Commands

| Command | Description |
|---------|-------------|
| `php artisan serve` | Start development server |
| `php artisan test` | Run test suite |
| `php artisan queue:work` | Process queue jobs |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |

## API Endpoints

See [API Documentation](./docs/api.md)

## Testing

```bash
php artisan test
php artisan test --coverage
```
```

### 4. Add Code Comments

**Document complex logic:**
```php
/**
 * Calculate the total price including tax and discounts.
 *
 * Applies VAT (21%) if the customer is in the EU,
 * then applies any applicable discounts.
 *
 * @param float $basePrice The base price before tax
 * @param string $customerRegion The customer's region (EU, US, etc.)
 * @param array $discounts Array of discount codes
 * @return float The final calculated price
 */
public function calculatePrice(float $basePrice, string $customerRegion, array $discounts): float
{
    // Apply VAT
    $price = $customerRegion === 'EU' ? $basePrice * 1.21 : $basePrice;

    // Apply discounts
    foreach ($discounts as $discount) {
        if ($discount['type'] === 'percentage') {
            $price -= $price * ($discount['value'] / 100);
        } elseif ($discount['type'] === 'fixed') {
            $price -= $discount['value'];
        }
    }

    // Ensure minimum price of 0
    return max(0, round($price, 2));
}
```

**Comment Vue components:**
```vue
<!--
    <ResourceList>
    Displays a paginated list of resources with search and filter capabilities.
    
    Props:
        - resources: Array of resource items
        - loading: Boolean indicating loading state
    
    Emits:
        - select: When a resource is selected
        - filter: When filters are applied
-->
<script setup>
// ...
</script>
```

### 5. Database Documentation

**Document schema:**
```markdown
## Database Schema

### resources table
| Column    | Type         | Description              |
|-----------|--------------|--------------------------|
| id        | bigint       | Primary key              |
| name      | varchar(255) | Resource name            |
| email     | varchar(255) | Resource email           |
| status    | enum         | active, inactive, pending|
| created_at| timestamp    | Creation timestamp       |
| updated_at| timestamp    | Last update timestamp    |
| deleted_at| timestamp    | Soft delete timestamp    |

### Indexes
- `idx_resources_status_created`: Composite index on status, created_at
- `idx_resources_email`: Unique index on email
```

### 6. Configuration Documentation

**Document environment variables:**
```markdown
## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| APP_NAME | Yes | Laravel | Application name |
| APP_URL | Yes | http://localhost | Application URL |
| DB_CONNECTION | Yes | mysql | Database connection |
| DB_DATABASE | Yes | - | Database name |
| DB_USERNAME | Yes | - | Database username |
| DB_PASSWORD | Yes | - | Database password |
| SANCTUM_STATEFUL_DOMAINS | Yes | localhost | Comma-separated SPA domains that receive stateful (cookie) auth |
| SESSION_DOMAIN | Yes | localhost | Cookie domain shared by the SPA and API |
| CACHE_STORE | No | database | Cache store (renamed from CACHE_DRIVER in Laravel 11+) |
| QUEUE_CONNECTION | No | database | Queue driver |
```

## Artisan Commands Reference

```bash
# Generate API docs (if using swagger)
php artisan swagger:generate

# Generate route list
php artisan route:list --format=json

# Check test coverage
php artisan test --coverage=clover

# View database schema
php artisan schema:dump
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `docs/api.md` | API endpoint documentation |
| `CHANGELOG.md` | Release changelog |
| `README.md` | Project README |
| `docs/database.md` | Database schema documentation |
| `docs/configuration.md` | Configuration documentation |
| `app/Models/*.php` | Code comments |
| `app/Http/Controllers/*.php` | Code comments |
| `resources/js/Pages/*.vue` | Code comments |

## Verification Checklist

- [ ] API documentation matches actual endpoints
- [ ] CHANGELOG reflects all changes in release
- [ ] README installation instructions work
- [ ] Environment variables documented
- [ ] Database schema documented
- [ ] Code comments explain complex logic
- [ ] No outdated documentation
- [ ] All links in documentation work
- [ ] Examples are accurate
- [ ] Contributing guidelines clear
- [ ] License file present
