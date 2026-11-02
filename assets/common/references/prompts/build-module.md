# Build Module - Master Prompt Template

Use this prompt when you need to generate an entire module (backend + frontend) for the project. The prompt is stack-neutral: the concrete folder layout, class types and commands come from your stack pack.

---

## Prompt

```
You are building a new module for this project. Before writing code, read the
stack pack this project uses (its `references/rules/` and `references/blueprints/`)
and follow it wherever it is more specific than this prompt.

## Module Specification

- **Module Name**: {MODULE_NAME}
- **Feature**: {BRIEF_DESCRIPTION}
- **Routes / Endpoints**: {ROUTES_LIST}
- **Entities**: {ENTITIES_LIST}
- **Relationships**: {RELATIONSHIPS}

## Requirements

1. Build the complete module following the project's conventions.
2. Use the module structure defined in `references/principles/architecture.md`
   and the stack pack's `references/rules/architecture.md`.
3. Follow the coding standards in `references/principles/coding-standards.md`
   and the stack pack's `references/rules/coding-standards.md`.
4. Include automated tests for every endpoint, business-logic unit and
   validation rule set (see `references/principles/testing.md`).
5. Include UI views for list, create, edit and detail screens.
6. Generate database schema changes as versioned migrations with proper
   indexes and foreign keys.
7. Protect every non-public endpoint with the project's authentication
   mechanism and check permissions on every action
   (see `references/principles/authorization.md`).
8. Follow the project's standard API response format.

## Module Layers

Create one unit per layer below, named and placed as the stack pack's
architecture rules dictate:

- Entry point (controller / handler) per resource: orchestration only
- Request validation per write action (create / update)
- Response shaping (resource / transformer / serializer) per entity
- Data model per entity
- Service (business logic) per entity, behind an interface where the stack uses one
- Authorization policy per entity
- Domain exceptions for expected failure cases
- Route / endpoint registration for the module
- UI: listing view, form view, detail view
- UI: reusable state / data-fetching logic for the entity
- UI: shared types or schemas for the entity, if the stack uses them

## Coding Rules

### Backend
- Follow the stack's formatting standard and enforce it with its formatter
- Declare parameter and return types wherever the language allows
- Validate input in a dedicated validation layer, never inline in handlers
- Put all business logic in the service layer (never in controllers / handlers)
- Use policy-based authorization (never ad-hoc permission checks scattered in code)
- Use reusable query filters / scopes for repeated query conditions
- Use soft deletes where records need recovery or an audit trail
- Index every foreign key and every filtered or sorted column

### Frontend
- Use the UI framework's recommended component style
- Declare component inputs and outputs explicitly (typed where possible)
- Derive computed state instead of duplicating it
- Use the UI component library's components (tables, dialogs, forms, toasts)
  before building custom ones
- Show loading states (skeletons, spinners)
- Show errors with toast notifications or inline messages
- Show empty states with descriptive messages and a next action
- Use a responsive layout (grid system)
- Expose extension points (slots / children) for customizable sections

### Database
- Target the project's database engine and version
- Use unsigned integer keys for foreign keys where the engine supports it
- Use exact decimal types for monetary values (never floating point)
- Add proper indexes (single, composite, full-text where needed)
- Comment columns whose purpose is not obvious from the name
- Define foreign key constraints with deliberate cascade / restrict rules
- Use soft deletes on tables with audit trails
- Default timestamps to the current time at the database level

### API
- Standardized response format (success/message/data or error/message/errors)
- Pagination with meta + links
- Authentication on every non-public endpoint
- Rate limiting on sensitive endpoints
- Proper HTTP status codes (200, 201, 204, 401, 403, 404, 422, 500)

## Testing Requirements

Using the project's test runner and conventions (the stack pack's
`references/rules/testing.md`), write tests covering:
1. Endpoints: authentication, authorization, CRUD operations, validation errors
2. Services: business logic, edge cases, exception handling
3. Validation: rules accept valid input and reject invalid input
4. Models: query filters, relationships, type conversions
5. Schema: table structure, column types, indexes

## Output

Generate ALL files listed in the module layers above.
Include complete, production-ready code. Do not use TODOs or placeholders.
```

---

## Usage

Replace the `{BRACE_VARS}` with your module details and pass to the AI:

```
Module Name: Warehouse
Feature: Multi-warehouse inventory management with stock transfers between locations
Routes: /api/warehouses, /api/warehouses/{id}, /api/warehouses/{id}/transfer
Entities: Warehouse, StockTransfer, WarehouseLocation
Relationships: Warehouse has many Locations, WarehouseLocation belongs to Warehouse, StockTransfer belongs to Warehouse (from + to)
```

---

## Customization Tips

- **Small module** (1 entity, simple CRUD): Generate entry point, model, migration, validation, and the listing + form views only
- **Complex module** (multiple entities, workflows): Generate the full structure including services, policies, exceptions, and tests
- **Read-only module**: Skip create/update/delete, generate only listing + detail views
- **Admin-only module**: Add an admin-level permission and enforce it in the policy

---

## Checklist for AI Output

- [ ] All files are placed and named per the stack pack's architecture rules
- [ ] All UI components follow the stack pack's component conventions
- [ ] All migrations are reversible (apply and roll back)
- [ ] All entry points receive dependencies through injection
- [ ] All validation units check authorization and define rules
- [ ] All services implement their contract (where the stack uses one)
- [ ] All routes are registered and tested
- [ ] All tests follow the stack pack's testing conventions
- [ ] All UI components handle loading/error/empty states
- [ ] All API responses follow the standardized format
