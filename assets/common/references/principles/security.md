# Security Principles

Stack-neutral principles. Your stack pack's `references/rules/security.md` shows how to apply them.

## Threat Model

Assume every request is hostile until proven otherwise. The main threats for a
typical web application with a browser client and an HTTP API are:

| Threat | What goes wrong | Primary defence |
|---|---|---|
| Credential theft (XSS) | Script on the page reads a token and sends it away | Keep credentials out of script-readable storage |
| Cross-site request forgery | Another site makes the browser send an authenticated request | Anti-forgery token + `SameSite` cookies |
| Injection (SQL, command, path) | User input is executed as code or a query | Parameter binding; never concatenate input |
| Cross-site scripting | User content is rendered as markup or script | Escape on output; sanitize any raw HTML |
| Brute force / abuse | Unlimited login, reset or upload attempts | Rate limiting per IP and per identity |
| Malicious uploads | Executable, oversized or misnamed files | Allow-list type, cap size, generate the name |
| Cross-origin data access | Untrusted origins call the API with credentials | Explicit CORS allow-list |
| Secret leakage | Keys committed, logged or shared across environments | Secrets out of the repository, per environment |

## Authentication and Credentials

- For a first-party browser client, prefer a **server session in an
  `httpOnly`, `Secure`, `SameSite` cookie**. Credentials that never touch
  script cannot be exfiltrated by XSS.
- **Never store auth tokens in `localStorage` or `sessionStorage`.** Any script
  on the page can read them.
- Use bearer tokens only for clients that cannot use cookies (mobile apps,
  third-party integrations). Store them in the platform's secure storage
  (OS keychain / keystore), never in web storage.
- Scope tokens to the **minimum abilities** they need, give them an expiry
  where practical, and revoke them on logout.
- Rotate credentials and invalidate all sessions after a security incident.
- Hash passwords with the platform's vetted adaptive hashing (bcrypt / argon2).
  Never roll your own hashing, never store or log plaintext passwords.

## Cross-Site Request Forgery

- Any authentication that the browser attaches automatically (cookies) needs
  CSRF protection on every state-changing request.
- Use the synchronizer or double-submit token pattern: the server issues a
  token, the client echoes it in a header or form field, the server verifies it.
- Pure bearer-token requests are not sent automatically by the browser and do
  not need CSRF tokens.
- Never perform state changes on `GET`.

## Injection

- **Always** use the data-access layer's parameter binding. Never build a query
  by concatenating or interpolating user input.

```text
GOOD: query("SELECT * FROM users WHERE email = ?", [email])
BAD:  query("SELECT * FROM users WHERE email = '" + email + "'")
```

- Raw query fragments are acceptable only with bound placeholders.
- Column names, sort directions and table names cannot be bound; map them
  through an allow-list instead of passing input through.
- The same rule applies to shell commands, file paths and template engines:
  never let input become code or a path segment unchecked.

## Cross-Site Scripting

- Rely on the view layer's **automatic output escaping**. Do not bypass it.
- Rendering raw HTML is an exception: only with content sanitized by a
  vetted HTML sanitizer using a strict tag and attribute allow-list.
- Escaping happens on **output**, in the context it is rendered in (HTML,
  attribute, URL, script). Do not "pre-escape" data before storing it.
- Back escaping with a Content Security Policy as defence in depth.

## Input Handling

- Frameworks generally do **not** sanitize input; they store what they receive.
  Validate every field explicitly (see `validation.md`).
- **Reject** unexpected shapes rather than trying to clean them.
- Normalize where meaning matters (trim, case-fold emails, slugify URL parts).

## File Uploads

- Allow-list file types by **detected MIME type** (content), not by the
  client-supplied extension or `Content-Type` header.
- Enforce a maximum size, and dimensions for images where relevant.
- **Never trust the client filename.** Generate a random name server-side to
  prevent path traversal, overwrites and collisions.
- Store uploads outside the executable web root, or on storage that never
  executes them. Serve private files through an authorized endpoint.

## Rate Limiting

- Rate-limit every public API, keyed by user when authenticated and by IP
  otherwise.
- Apply **stricter** limits to sensitive endpoints: login, registration,
  password reset, OTP verification and uploads.
- Key authentication limits by the targeted identity (e.g. email) as well as
  IP, to slow credential stuffing against one account.
- Return `429 Too Many Requests` with a retry hint.

## Cross-Origin Resource Sharing

- Allow-list explicit origins per environment, read from configuration.
- Never combine a wildcard origin with credentials.
- Enable credentials only when the browser client really sends cookies.

## Security Headers

Send these on every response (or at the reverse proxy):

| Header | Value / purpose |
|---|---|
| `Content-Security-Policy` | Restrict script, style and image sources; tighten over time |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` (or CSP `frame-ancestors`) to prevent clickjacking |
| `X-XSS-Protection` | `0`; the legacy filter is deprecated and can cause vulnerabilities |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Disable unused features (camera, microphone, geolocation) |
| `Strict-Transport-Security` | Force HTTPS in production |

## Secrets and Environments

- **Never commit environment or secret files** to version control.
- Use different secrets per environment; never reuse production keys elsewhere.
- Rotate application keys and credentials periodically, knowing that rotating an
  encryption key invalidates sessions and data encrypted with it.
- Use a secrets manager in production.
- Fail CI/CD when required configuration is missing.

## Checklist

- [ ] Browser auth uses `httpOnly` + `Secure` + `SameSite` cookies; no tokens in web storage
- [ ] CSRF protection on all cookie-authenticated mutating requests
- [ ] All queries parameterized; dynamic identifiers allow-listed
- [ ] No raw HTML rendering without a sanitizer
- [ ] Every input validated server-side
- [ ] Uploads: MIME allow-list, size cap, generated filename, non-executable storage
- [ ] Rate limits on API and stricter limits on auth / reset / upload
- [ ] CORS origins explicit; no wildcard with credentials
- [ ] Security headers set
- [ ] Passwords hashed with a vetted adaptive algorithm
- [ ] No secrets in the repository; per-environment secrets
