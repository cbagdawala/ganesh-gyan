# Validation Principles

Stack-neutral principles. Your stack pack's `references/rules/validation.md` shows how to apply them.

## Why Validate Twice

| Layer | Purpose | Trust level |
|---|---|---|
| Server | Integrity and security: the only validation that counts | Authoritative |
| Client | Fast feedback and better UX | Enhancement only; easily bypassed |

- **Always** validate on the server. Any client can send any payload.
- **Always** validate on the client too, for usability, but never rely on it.
- Keep both sets of rules in step: same required fields, lengths, formats and
  allowed values.

## Where Validation Lives

- Validate in a **dedicated request-validation layer** (request object, schema,
  validator class), never inline in controllers or handlers.
- One validation definition per endpoint (create and update usually differ).
- Pair validation with the authorization check for the same request, so a
  handler only ever receives authorized, valid input.
- Pass validated data onwards as a typed object (DTO), not the raw request.

## Rules of Thumb

- **Validate every field** that the endpoint accepts. Ignore or reject anything
  else; never mass-assign unvalidated input.
- **Reject, don't repair.** Fail on unexpected shapes instead of silently
  cleaning them.
- Declare **type, presence and bounds** for every field: required/nullable,
  type, min/max length or value, format.
- Put a maximum on every string, array and file, even when the database would
  accept more.
- Restrict enumerated values to the central enum definition, not a hand-copied
  list.
- Check uniqueness and existence against the data store, scoped correctly (for
  updates, ignore the current record; for multi-tenant data, scope to the
  tenant).
- Use the framework's built-in rules first; write a **custom rule** only for
  reusable business validation, and keep it small and testable.
- Use a vetted password-strength rule (minimum length, mixed case, numbers,
  symbols, optionally breached-password checks) rather than ad-hoc regexes.
- Validate files by detected type, size and dimensions (see `security.md`).
- Provide **human-readable messages** for any rule whose default message is
  unclear.

## Error Response Format

Every validation failure returns HTTP `422` with one standard envelope:

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "email": ["The email has already been taken."],
      "password": [
        "The password must contain at least one uppercase letter.",
        "The password must contain at least one number."
      ]
    },
    "reference": "req_abc123"
  }
}
```

- `details` maps each field name to an **array** of messages.
- `reference` correlates the response with server logs.
- Never leak internals (queries, stack traces) in validation messages.

## Field-Level vs Form-Level Errors

| Kind | When | Key in `details` |
|---|---|---|
| Field-level | One field is invalid (most common) | The field name, e.g. `email` |
| Form-level | The combination is invalid, not any single field | `__form` |
| Non-field context | Failure belongs to a concept, not an input | A descriptive key, e.g. `credentials` |

Example form-level error:

```json
{ "details": { "__form": ["The selected combination of coupon and product is not valid."] } }
```

For authentication failures, use one generic message ("The provided email or
password is incorrect.") so the response does not reveal which part was wrong.

## Client-Side Validation

- Define form rules as a **schema** in one place per form, and derive the form's
  data type from it where the language allows.
- Show errors next to the field they belong to, after the user has interacted
  with it or on submit.
- Disable the submit action while a request is in flight.
- **Map server `422` errors back onto the form**: each `details` key to its
  field, `__form` and non-field keys to a form-level message. Server errors
  must never be silently dropped.

## Do / Don't

| Do | Don't |
|---|---|
| Validate in a dedicated layer per endpoint | Validate inside controllers |
| Bound every string, array and file | Accept unbounded input |
| Return the standard `422` envelope | Invent per-endpoint error shapes |
| Mirror rules on the client for UX | Treat client validation as security |
| Show server errors on the matching field | Show only a generic toast for `422` |

## Checklist

- [ ] Server-side validation for every endpoint that accepts input
- [ ] Every field has presence, type and bounds
- [ ] Enum values come from the central definition
- [ ] Unique/exists checks scoped correctly for update and tenancy
- [ ] Custom rules are reusable, small and tested
- [ ] Clear messages for non-obvious rules
- [ ] `422` responses follow the standard envelope, with `__form` for form-level errors
- [ ] Client schema mirrors the server rules
- [ ] Server `422` errors are mapped onto the form fields
