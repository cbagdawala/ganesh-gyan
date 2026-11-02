# Logging Principles

Stack-neutral principles. Your stack pack's `references/rules/logging.md` shows how to apply them.

## Purpose

Logs exist to answer three questions after the fact: **what happened, to whom,
and why did it fail?** Log for the engineer debugging production at 2 a.m.,
not for the developer writing the code today.

## Structured Logging

- Log a **short, constant message** plus a **structured context** (key-value
  pairs, JSON in production). Never interpolate values into the message.

```text
GOOD: log.info("User logged in", { user_id: 42, ip_address: "203.0.113.5", path: "/api/v1/auth/login" })
BAD:  log.info("User 42 logged in from 203.0.113.5")
```

- Constant messages can be searched, grouped and alerted on; interpolated ones
  cannot.
- Use consistent snake_case keys across the codebase: `user_id`, `order_id`,
  `request_id`, `duration_ms`, `error_code`, `exception_class`.
- Always include identifiers needed to trace the event (entity ids, user id,
  request/correlation id), never whole objects.

## Log Levels

| Level | When to Use | Example |
|---|---|---|
| `debug` | Development only, verbose tracing | Query details, loop iterations, variable dumps |
| `info` | Normal operations, significant events | User login, order created, job dispatched |
| `notice` | Normal but notable events | Cache miss, config change, rate limit reached |
| `warning` | Unexpected but handled situations | Deprecated API used, slow query detected, retry attempted |
| `error` | Error conditions that need attention | API call failed, validation exception, service unavailable |
| `critical` | Critical conditions requiring immediate attention | Database connection lost, auth service down, disk full |
| `alert` | Action must be taken immediately | Token leak detected, security breach, data corruption |
| `emergency` | System is unusable | Complete application failure, catastrophic error |

- Set the minimum level **per environment through configuration**: `debug`
  locally, `info` or higher in staging, `error` (or `warning`) in production.
- Do not log expected business outcomes (a failed validation, a `404`) as
  `error`; they are not faults.

## Sensitive Data

**Never log secrets or personal data in clear text.** This includes:

- Passwords, password hashes, remember/session tokens, API keys, secrets
- Payment card data, bank details, government identifiers
- Full email addresses, phone numbers and addresses unless required (mask them)
- Full request bodies and authorization headers

Rules:

- Log a boolean flag instead of a value (`password_set: true`).
- Mask partially when a value is needed for support (`***@example.com`).
- Centralize masking: a processor or helper that redacts known sensitive keys
  (`password`, `token`, `secret`, `api_key`, `credit_card`) so individual call
  sites cannot forget.
- Hide sensitive attributes at the model / serialization layer too, so they never
  reach logs or responses by accident.

## Channels and Separation

- Separate logs by concern so each can have its own level and retention:
  application, API access, errors, background jobs.
- Rotate log files (daily) and keep a **bounded retention** (e.g. 14 days for
  application logs, 30 days for API and error logs) to prevent disk exhaustion.
- In containerized or cloud deployments, prefer writing to stdout / a log
  shipper over local files.

## Request Logging

Log one line per API request, after the response is produced, with:

| Key | Purpose |
|---|---|
| `method`, `path` | What was called |
| `status` | Outcome |
| `duration_ms` | Performance |
| `user_id` | Who (null for guests) |
| `request_id` | Correlates with errors and client reports |

- Propagate a request/correlation id from an incoming header or generate one,
  and include it in every log line and in error responses.
- Log **slow requests** (e.g. over 1000 ms) at `warning` with the same context.

## Exceptions and Error Tracking

- When catching an exception: log it with context, then **rethrow or wrap** it
  (preserving the original as the cause). Never swallow it silently.
- Log the exception class and message, not secrets carried in its payload.
- Report unhandled exceptions centrally (one global handler), not ad hoc in
  every catch block.
- Send production errors to an **error-tracking service** with the user id and
  request id attached, and use a request-inspection tool only in local and
  staging environments.

## Service-Layer Pattern

```text
create(dto):
    log.info("Creating order", { user_id, items_count, total_cents })
    try:
        order = repository.create(dto)
        log.info("Order created successfully", { order_id, user_id })
        return order
    catch error:
        log.error("Failed to create order", { user_id, error: error.message, exception_class })
        throw OrderCreationError("Failed to create order", cause = error)
```

## Checklist

- [ ] Constant messages with structured context; no interpolation
- [ ] Consistent snake_case context keys with entity and request ids
- [ ] Correct level for each event; minimum level set per environment
- [ ] No passwords, tokens, secrets or unmasked personal data in logs
- [ ] Central masking of sensitive keys
- [ ] Separate channels with rotation and bounded retention
- [ ] One request log line with method, path, status, duration, user and request id
- [ ] Slow requests logged at `warning`
- [ ] Exceptions logged with context and rethrown or wrapped, never swallowed
- [ ] Production errors reported to an error-tracking service
