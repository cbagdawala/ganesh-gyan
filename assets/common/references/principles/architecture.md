# Architecture Principles

Stack-neutral principles. Your stack pack's `references/rules/architecture.md` shows how to apply them.

## Layered Architecture

Split the application into layers with one job each. Each layer calls only the layer below it; dependencies never point upward.

```
Client (browser UI / SPA / server-rendered views)
   │  HTTP (JSON or HTML)
   ▼
Presentation   routes, middleware, controllers, input validation, authorization
   │
   ▼
Business       services, actions, domain events, background jobs
   │
   ▼
Data access    models, repositories, query objects
   │
   ▼
Storage        database, cache, queue, file store
```

Output transformation (resources, presenters, view models) sits between the business result and the HTTP response.

## Layer Responsibilities

| Layer | Does | Does not |
|---|---|---|
| Controller | Receive validated input, check authorization, call one service or action, return a formatted response | Contain business rules, build queries, send email |
| Validation / request object | Validate and normalise input, convert it to a typed data object | Touch the database beyond simple existence/uniqueness rules |
| Service | Hold business logic for a domain area; coordinate models, events and jobs | Read the HTTP request directly or format responses |
| Action | Perform one discrete business operation (`CreateUser`, `CancelOrder`) | Grow into a grab bag of unrelated operations |
| Model | Define fields, relations, casts, simple scopes | Hold workflows or heavy query logic |
| Repository / query object | Encapsulate complex or reused queries | Contain business decisions |
| Resource / presenter | Shape output, hide sensitive fields, format dates and enums | Run queries or business logic |
| Event / listener / job | Handle side effects and slow work asynchronously | Be required for the main request to succeed, unless explicitly synchronous |

## Rules

1. **Thin controllers.** A controller method is a few lines: take validated input, delegate, return a response.
2. **Validate at the edge.** Input is validated before it reaches business code; business code receives typed data objects, not raw request arrays.
3. **Never return raw models.** Always pass data through an output transformer so the response shape is explicit and sensitive fields stay hidden.
4. **Inject dependencies** through constructors rather than creating them inline or reaching for global state. This keeps classes testable.
5. **One place per rule.** A business rule lives in exactly one service or action, not copied across controllers, jobs and commands.
6. **Side effects via events or jobs.** Notifications, audit entries and integrations react to domain events or run in the queue.
7. **Authorization is explicit.** Every action that reads or changes data checks a policy or permission.
8. **Consistent responses.** All endpoints use one success envelope and one error envelope.
9. **Version the API** so clients do not break when contracts change.

## Choosing Service vs Action

- Use an **action** for a single, named operation that may be reused from controllers, jobs, commands and tests.
- Use a **service** for a set of related operations on one domain area (list, find, update, report).
- A service may call actions; actions should not call controllers or read the request.

## Frontend Architecture (SPA)

When the UI is a single-page app talking to a JSON API:

| Part | Responsibility |
|---|---|
| Pages / views | One per route; compose components and connect to state |
| Components | Reusable UI; receive data via inputs, emit events |
| Composables / hooks | Reusable stateful logic (pagination, debounce, forms) |
| Stores | Shared client state and the actions that change it |
| API layer | All HTTP calls in one place; components never call HTTP directly |
| Router | Route definitions, lazy-loaded pages, navigation guards |
| Types | Shared type definitions for API payloads |

Request flow: component → store action → API layer → server route → middleware → validation → controller → service/action → data access → database → output transformer → JSON → store update → re-render.

## Authentication

- Browser SPA on the same site: prefer a server session in an `httpOnly` cookie with CSRF protection. Never store auth tokens where page scripts can read them.
- Non-browser clients (mobile, third parties): use bearer tokens with scopes and expiry.
- Protect every non-public route with the auth middleware; the server is the source of truth for who the user is.

## Directory Structure

- Group code by type at the top level (controllers, services, actions, models, events, jobs, policies, data objects, enums) and by domain within those folders where a module is large.
- Separate API and web controllers and request validators.
- Keep frontend source in its own tree with folders per part (API layer, components, composables, layouts, pages, router, stores, types, utils).
- Mirror the source structure in the test folders.

## Checklist

- [ ] Controller methods only validate, authorize, delegate and respond
- [ ] Business logic lives in a service or action, once
- [ ] Input reaches business code as a typed data object
- [ ] Responses go through an output transformer; no raw models
- [ ] Dependencies are injected
- [ ] Side effects run through events or queued jobs
- [ ] Every data-changing action is authorized
- [ ] Frontend HTTP calls go through the API layer, not components
- [ ] New files are placed in the conventional directory
