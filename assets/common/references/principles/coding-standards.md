# Coding Standards Principles

Stack-neutral principles. Your stack pack's `references/rules/coding-standards.md` shows how to apply them.

## Core Principles

- **SOLID** — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY** — Do Not Repeat Yourself
- **KISS** — Keep It Simple, Stupid
- **YAGNI** — You Aren't Gonna Need It

### Applying SOLID

| Principle | In practice |
|---|---|
| Single Responsibility | A class, function, or file has one reason to change |
| Open/Closed | Extend behaviour by adding code (new class, new strategy), not by editing stable code |
| Liskov Substitution | A subtype must work anywhere its parent type is expected, without surprises |
| Interface Segregation | Prefer several small, focused interfaces over one large one |
| Dependency Inversion | Depend on abstractions; receive collaborators through the constructor instead of creating them |

### DRY, KISS, YAGNI in practice

- Extract shared logic once it is repeated a **third** time, or the moment a rule must stay identical in two places (validation, pricing, permissions).
- Do not DRY up code that only looks similar. Two pieces of code that change for different reasons should stay separate.
- Choose the simplest design that meets today's requirement. Clever code is a cost every future reader pays.
- Do not build configuration, extension points, or abstractions for needs nobody has asked for.

## Layering and Responsibilities

Keep each layer thin and focused. A typical web application splits work like this:

| Layer | Responsibility |
|---|---|
| Entry point (controller, handler, route) | Parse the request, delegate, return a response |
| Validation | Input rules and messages, nothing else |
| Authorization | Who may do what to which record |
| Service / action | Business logic and orchestration |
| Data access (model, repository) | Reading and writing persistent data |
| Background job | One asynchronous task |
| Event | One domain event; listeners react to it |
| Presentation / transformer | Shape data for the client |

- Entry points never contain business logic or queries.
- Business logic never reads request or session state directly; pass it the values it needs.
- Side effects (email, notifications, cache invalidation) are triggered from the service layer or by events, not scattered through entry points.

## Function and File Size

- A function should do one thing and fit on one screen. Aim for under **20 lines**; treat **40** as a hard signal to split.
- Keep parameter lists short (three or fewer). Group related parameters into a data object.
- Return early to avoid deep nesting. More than **three** levels of indentation is a smell.
- One class or component per file.
- Keep source files under roughly **300 lines** and UI component files under roughly **200 lines**. Extract helpers, services, or reusable logic once a file grows past that.

```
// Bad — nested conditions
function process(order):
    if order is not null:
        if order.isPaid:
            if order.items not empty:
                ship(order)

// Good — guard clauses
function process(order):
    if order is null: return
    if not order.isPaid: return
    if order.items is empty: return
    ship(order)
```

## Naming

- Names describe intent, not implementation: `activeCustomers`, not `list2`.
- Booleans read as questions: `isActive`, `hasAccess`, `canEdit`.
- Functions start with a verb: `calculateTotal`, `sendInvoice`.
- Avoid abbreviations except universally understood ones (`id`, `url`, `api`).
- Follow the naming conventions of your stack consistently (see the stack's `naming.md`).

## Types and Contracts

- Declare types for parameters and return values wherever the language allows.
- Prefer a specific type (or a small union) over a catch-all "any" type.
- Use enumerations for fixed sets of states instead of magic strings or numbers.
- Use immutable data objects to pass validated input between layers.

## Comments

- Code explains **what**; comments explain **why**.
- Write a comment when the reason is not obvious: a business rule, a workaround, a performance trade-off, a link to an issue.
- Do not comment out code. Delete it; version control remembers.
- Keep comments true. An outdated comment is worse than none.
- Public APIs (classes, functions, components used by others) carry doc comments. See `documentation.md`.

```
// Bad — restates the code
// increment counter
counter = counter + 1

// Good — explains the reason
// The payment gateway counts retries from 1, not 0
attempt = attempt + 1
```

## Error Handling

- Fail fast: validate input at the boundary and reject bad data before it reaches business logic.
- Throw or return specific errors (`OrderNotFound`, `InsufficientStock`), not generic ones.
- Never swallow an error silently. Either handle it meaningfully, or let it propagate.
- Catch errors at the level that can do something useful about them (retry, fall back, show a message).
- Log enough context to debug (identifiers, operation) and never log secrets, passwords, tokens, or personal data.
- Show users a clear, safe message; keep stack traces and internals out of responses.
- Use transactions so that a failure halfway through a multi-step write leaves no partial data.

## Imports and Dependencies

- Group imports: external libraries first, then internal modules.
- Prefer named imports where the language supports them.
- Use the project's path alias for internal modules instead of deep relative paths.
- Add a new third-party dependency only when it clearly beats writing the code, and it is maintained.

## Consistency

- Follow the existing patterns in the codebase, even where you would personally choose differently. Propose changes to a convention separately.
- Let automated formatters and linters settle style questions. Do not argue formatting in review.
- Leave the code a little better than you found it, but keep unrelated refactors out of feature changes.
