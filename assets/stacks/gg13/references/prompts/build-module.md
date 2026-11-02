# Build Module - Master Prompt Template

Use this prompt when you need to generate an entire module (backend + frontend) for the Laravel 13 + Vue 3 + PrimeVue project.

---

## Prompt

```
You are building a new module for a Laravel 13 + Vue 3 + PrimeVue 4 + MySQL + Pest + Sanctum project.

## Module Specification

- **Module Name**: {MODULE_NAME}
- **Feature**: {BRIEF_DESCRIPTION}
- **Routes**: {ROUTES_LIST}
- **Models**: {MODELS_LIST}
- **Relationships**: {RELATIONSHIPS}

## Requirements

1. Build the complete module following the project's conventions.
2. Use the module structure defined in ADR-003 (Modules Structure).
3. Follow the coding standards in `.ai/rules/`.
4. Include Pest tests for all controllers, services, and form requests.
5. Include Vue components for all list, create, edit, and detail views.
6. Generate database migrations with proper indexes and foreign keys.
7. Include Sanctum auth middleware (`auth:sanctum`) on all API routes.
8. Follow the API response format from `.ai/examples/api-response.md`.

## Project Structure

```
app/Modules/{Module}/
├── Http/
│   ├── Controllers/
│   │   └── {Module}Controller.php
│   ├── Requests/
│   │   ├── Store{Entity}Request.php
│   │   └── Update{Entity}Request.php
│   └── Resources/
│       └── {Entity}Resource.php
├── Models/
│   └── {Entity}.php
├── Services/
│   ├── {Entity}Service.php
│   └── {Entity}ServiceInterface.php
├── Policies/
│   └── {Entity}Policy.php
├── Exceptions/
│   └── {CustomException}.php
└── routes/
    └── api.php
resources/js/
├── modules/{module}/
│   ├── components/
│   │   ├── {Module}Listing.vue
│   │   ├── {Entity}Form.vue
│   │   └── {Entity}Detail.vue
│   ├── composables/
│   │   └── use{Entity}.ts
│   ├── stores/
│   │   └── {module}.ts
│   └── types.ts
```

## Coding Rules

### PHP/Laravel
- PSR-12 formatting
- Type-hint everything (return types, parameters)
- Use form requests for validation (Store/Update{Entity}Request)
- Service layer for all business logic (never in controllers)
- Policy-based authorization (never raw `if (! Gate::check())`)
- Eloquent scopes for reusable query filters
- Soft deletes where appropriate
- Database indexes for all foreign keys and filtered columns
- Pest tests with BDD syntax (describe/it blocks)

### Vue/PrimeVue
- `<script setup lang="ts">` composition API
- Typed props with `defineProps<Props>()`
- Typed emits with `defineEmits<Emits>()`
- Reactive state with `reactive()` / `ref()`
- Computed properties for derived state
- PrimeVue components (DataTable, Dialog, Form, Toast, etc.)
- Loading states (skeletons, spinners)
- Error handling with toast notifications
- Empty states with descriptive messages
- Responsive layout (grid system)
- Slots for customizable sections

### Database
- MySQL 8.0+ compatible
- `unsignedBigInteger` for foreign keys
- `unsignedDecimal` for monetary values
- Proper indexes (single + composite + full-text where needed)
- `->comment()` on columns for documentation
- Foreign key constraints with appropriate cascade/restrict rules
- Soft deletes on tables with audit trails
- Timestamps with `->useCurrent()` defaults

### API
- Standardized response format (success/message/data or error/message/errors)
- Pagination with meta + links
- Sanctum auth (`auth:sanctum`) on all routes
- Rate limiting on sensitive endpoints
- Proper HTTP status codes (200, 201, 204, 401, 403, 404, 422, 500)

## Testing Requirements

Write Pest tests covering:
1. Controller: auth check, authorization, CRUD operations, validation errors
2. Service: business logic, edge cases, exception handling
3. Form Request: validation rules (valid/invalid inputs)
4. Model: scopes, relationships, casts
5. Migration: table structure, column types, indexes

## Output

Generate ALL files listed in the project structure above.
Include complete, production-ready code. Do not use TODOs or placeholders.
```

---

## Usage

Replace the `{BRACE_VARS}` with your module details and pass to the AI:

```
Module Name: Warehouse
Feature: Multi-warehouse inventory management with stock transfers between locations
Routes: /api/warehouses, /api/warehouses/{id}, /api/warehouses/{id}/transfer
Models: Warehouse, StockTransfer, WarehouseLocation
Relationships: Warehouse hasMany Locations, WarehouseLocation belongsTo Warehouse, StockTransfer belongsTo Warehouse(from+to)
```

---

## Customization Tips

- **Small module** (1 model, simple CRUD): Generate controller, model, migration, form request, and Vue listing + form only
- **Complex module** (multiple models, workflows): Generate full structure including services, policies, exceptions, and tests
- **Read-only module**: Skip store/update/destroy, generate only listing + detail views
- **Admin-only module**: Add `canManageSettings` policy and gate checks

---

## Checklist for AI Output

- [ ] All PHP files use correct namespaces
- [ ] All Vue files use `<script setup lang="ts">`
- [ ] All migrations have `up()` and `down()` methods
- [ ] All controllers use constructor DI
- [ ] All form requests have `authorize()` and `rules()` methods
- [ ] All services implement their interface
- [ ] All routes are registered and tested
- [ ] All Pest tests use BDD syntax
- [ ] All Vue components handle loading/error/empty states
- [ ] All API responses follow the standardized format
