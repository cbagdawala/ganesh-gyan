# Authorization Principles

Stack-neutral principles. Your stack pack's `references/rules/authorization.md` shows how to apply them.

## Authentication vs Authorization

- **Authentication** answers "who is this?" It resolves a user from a session
  or token and happens once, early in the request pipeline.
- **Authorization** answers "may this user do this action on this resource?"
  It happens on every protected action.
- Never treat "logged in" as "allowed". An authenticated user is still denied by
  default.

## Two Kinds of Checks

| Check | Question | Typical home |
|---|---|---|
| Permission / role check | Does the user hold capability X at all? | Route or endpoint guard |
| Resource policy | May this user act on **this** record, in its current state? | Policy object, called from the controller or handler |

Use both. A route-level permission check cannot know that order 42 belongs to
someone else or has already shipped; only a resource policy can.

## Rules of Thumb

- **Deny by default.** A missing rule means "no".
- **Authorize on the server, always.** Client-side checks only hide UI; they are
  never a security boundary.
- **One policy per resource type** that needs authorization, with one method per
  action (`view`, `create`, `update`, `delete`, plus domain actions such as
  `cancel`, `refund`, `approve`).
- **Policies include state.** An action may be forbidden because of the record's
  state (already shipped, already approved), not only because of who the user
  is.
- **Ownership plus override.** The common shape is "the owner may, or an
  administrator may". Write it explicitly.
- **Use action-based gates** for capabilities not tied to a record (manage
  settings, export data, access the admin area).
- **Check before acting.** Authorize at the top of the handler, before loading
  related data or calling services.
- **Keep authorization out of the service layer's business logic** unless the
  service is the only entry point; the handler authorizes, the service acts.

## Roles and Permissions

- Grant **permissions** to roles and check **permissions** in code, not role
  names. Roles change; capability checks stay stable.
- Name permissions `resource:action` (e.g. `order:view`, `order:cancel`,
  `settings:manage`) and define them in one central enumeration, not as scattered
  string literals.
- Keep the role set small (e.g. admin, moderator, user) and data-driven.
- Seed roles and permissions so every environment has the same baseline.

## Request Flow

```
Request arrives
    │
    ▼
Authenticate (session cookie or bearer token)  ── fails → 401 Unauthorized
    │
    ▼
Permission guard on the route                  ── fails → 403 Forbidden
    │
    ▼
Resource policy in the handler                 ── fails → 403 Forbidden
    │
    ▼
Business logic
```

- `401` means "not authenticated"; `403` means "authenticated but not allowed".
- Return a consistent error envelope with a stable code (e.g. `FORBIDDEN`) and a
  human-readable message. Do not reveal why in detail.
- Consider `404` instead of `403` when merely confirming a record exists would
  leak information.

## Caching Permissions

- Effective permissions may be cached for speed, but **cache lazily, per user,
  during a request**, never at application boot when no user exists.
- Key caches by user id and give them a TTL.
- **Invalidate** the user's cache, and any global role/permission cache, whenever
  roles or permissions change.

## Frontend Authorization

- The client receives the user's effective permissions (and roles) with the
  authenticated user payload.
- Wrap checks in one reusable helper (`hasPermission`, `hasRole`, `can.*`) rather
  than repeating string comparisons in components.
- Use it to show, hide or disable actions and routes. Assume the server will
  still reject anything the user is not allowed to do, and handle `403`
  gracefully.

## Do / Don't

| Do | Don't |
|---|---|
| Authorize every mutating and every sensitive read endpoint | Rely on the UI hiding a button |
| Check permissions, define them centrally | Hard-code role names across the codebase |
| Include record state in policy decisions | Check only "is the user an admin" |
| Invalidate caches on permission change | Cache permissions at boot time |
| Test both the allowed and the denied path | Test only the happy path |

## Checklist

- [ ] Every protected route requires authentication
- [ ] Route-level permission guard where a capability applies
- [ ] Resource policy called in every handler that touches a specific record
- [ ] Policies cover ownership, admin override and record state
- [ ] Permissions named `resource:action` and defined in one place
- [ ] `401` vs `403` used correctly with the standard error envelope
- [ ] Permission caches are per user, lazy and invalidated on change
- [ ] Frontend checks use a shared helper and are never the only guard
- [ ] Tests assert forbidden access returns `403`
