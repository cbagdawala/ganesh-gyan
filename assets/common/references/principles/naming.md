# Naming Principles

Stack-neutral principles. Your stack pack's `references/rules/naming.md` shows how to apply them.

## Rules of Thumb

1. **Name for the reader.** A name should say what something is or does without reading its body.
2. **Be consistent.** Follow the convention already used in the codebase and the language; one style per element type.
3. **Use domain words.** Prefer the business term (`invoice`, `shipment`) over generic ones (`data`, `item`, `info`, `manager`).
4. **No unclear abbreviations.** `customerAddress`, not `custAddr`. Widely known acronyms (`id`, `url`, `api`) are fine.
5. **Match name to kind:**
   - Classes and components: nouns (`OrderService`, `UserProfileCard`)
   - Single-purpose action classes: verb + noun (`CreateOrderAction`)
   - Methods and functions: verbs (`createOrder`, `findUserById`)
   - Booleans: `is`, `has`, `can`, `should` prefix (`isActive`, `hasPaid`)
   - Collections: plural nouns (`users`, `orderItems`)
6. **Keep file name and primary type name identical,** so files can be found by type name.
7. **Rename when meaning changes.** A misleading name is worse than a long one.

## Casing by Element

| Element | Convention | Example |
|---|---|---|
| Classes, types, UI components | PascalCase | `UserService`, `UserProfileCard` |
| Methods, functions, variables, properties | camelCase (or the language's standard) | `findUserById`, `searchTerm` |
| Constants and environment variables | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `APP_ENV` |
| Database tables | snake_case, plural | `users`, `order_items` |
| Database columns | snake_case | `first_name`, `created_at` |
| URL paths | kebab-case, plural resources | `/order-items`, `/users/{id}` |
| Query parameters | consistent snake_case or kebab-case | `?search=john&sort=name&order=asc` |
| CSS classes | kebab-case, BEM for custom blocks | `.user-card__name`, `.user-card--compact` |

## Database

- Foreign keys: singular related name + `_id` (`user_id`).
- Join (pivot) tables: both singular names in alphabetical order (`role_user`, not `user_role`).
- Booleans: `is_` or `has_` prefix (`is_active`, `has_paid`).
- Timestamps: `created_at`, `updated_at`, and `deleted_at` for soft deletes.
- Indexes: predictable names (`idx_{table}_{columns}`, `uniq_{table}_{columns}`).
- JSON columns: descriptive nouns (`settings`, `metadata`).

## API and Routes

- Resources are plural nouns; nest to show ownership (`/users/{id}/orders`).
- Use standard resource actions (list, show, create, update, delete) before inventing new ones.
- Non-CRUD actions are verb endpoints on the resource (`/orders/{id}/cancel`).
- Route names use dot notation (`users.index`, `orders.store`).
- Version the API in the path (`/api/v1/...`).

## Tests

Name test files after the unit under test plus a consistent suffix, and write test names as behaviour sentences (see `principles/testing.md`).

## Don't

- Mix casing styles for the same kind of element.
- Use type names in variable names (`userArray`, `strName`).
- Use negated booleans (`isNotActive`); use the positive form.
- Reuse one name for different concepts in different modules.
