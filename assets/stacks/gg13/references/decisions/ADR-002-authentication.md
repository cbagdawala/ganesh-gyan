# ADR-002: Sanctum Authentication for SPA

| Field | Value |
|-------|-------|
| **Date** | 2026-07-16 |
| **Status** | Accepted |
| **Deciders** | Lead Developer, Security Team |
| **Technical Sponsors** | Backend Team, Frontend Team |

---

## Context

The application is a single-page application (Vue 3) that communicates with a Laravel 13 API. We need authentication that:
- Works for the first-party web SPA and a potential future mobile app
- Supports secure, revocable credentials
- Integrates with Vue 3 routing guards
- Provides role/permission-based authorization (via `spatie/laravel-permission`)
- Ships with the framework so it tracks Laravel releases without a third-party maintenance risk

## Decision

We use **Laravel Sanctum** (bundled with Laravel 13) for authentication. Sanctum supports two modes, and we use both depending on the client:

1. **Cookie-based SPA session auth** — for the first-party web SPA served from the same top-level domain as the API. The session lives in an **httpOnly, `Secure`, `SameSite` cookie** that JavaScript cannot read, which removes the XSS token-exfiltration risk. This is the **default and recommended** path for the web app.
2. **Personal access tokens (Bearer)** — for mobile/desktop or cross-origin clients that cannot use cookies. `$user->createToken(...)->plainTextToken` issues a token sent as `Authorization: Bearer {token}`; tokens are hashed at rest and individually revocable.

> Note: `tymon/jwt-auth` was considered and rejected — it is a third-party package that has historically lagged Laravel releases, and stateless JWTs cannot be revoked server-side without extra infrastructure. Sanctum is first-party and gives us revocable credentials out of the box.

### Architecture — SPA cookie mode (web, recommended)

```
┌─────────────────────┐         ┌──────────────────────────┐
│   Vue 3 SPA         │         │   Laravel 13 API         │
│                     │ cookie  │  auth:sanctum guard      │
│  axios              │──────▶  │  resolves session user   │
│  withCredentials    │         │  from httpOnly cookie    │
└─────────────────────┘         └──────────────────────────┘
         │  GET /sanctum/csrf-cookie      │
         │───────────────────────────────▶│  sets XSRF-TOKEN cookie
         │  POST /login { email, password}│
         │───────────────────────────────▶│  starts session, sets
         │                                │  httpOnly session cookie
```

### Token Flow — API token mode (mobile / third-party)

```
1. Client POSTs credentials to /api/login
2. Server validates credentials
3. Server returns $user->createToken('device-name')->plainTextToken
4. Client stores the token in secure device storage (Keychain / Keystore)
5. Client sends Authorization: Bearer {token} on every request
6. auth:sanctum resolves the user from the hashed token
7. Logout: $request->user()->currentAccessToken()->delete()
```

### Configuration

```env
# .env — SPA cookie mode
SANCTUM_STATEFUL_DOMAINS=app.example.com,localhost:5173
SESSION_DOMAIN=.example.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

Sanctum is registered in `bootstrap/app.php` (Laravel 11+ slim skeleton) — there is no `app/Http/Kernel.php`:

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->statefulApi(); // Sanctum SPA middleware for the 'api' group
})
```

### Laravel Side — User model

```php
// app/Models/User.php
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // No JWTSubject contract needed — Sanctum handles identity.
}
```

```php
// app/Http/Controllers/Auth/LoginController.php — token mode
public function login(LoginRequest $request): JsonResponse
{
    $user = User::where('email', $request->email)->first();

    if (! $user || ! Hash::check($request->password, $user->password)) {
        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    return response()->json([
        'token' => $user->createToken($request->device_name ?? 'spa')->plainTextToken,
        'user'  => new UserResource($user),
    ]);
}
```

### Vue 3 Side — SPA cookie mode (recommended)

```ts
// resources/js/utils/api.ts — cookie mode: no token in JS, browser sends the httpOnly cookie
import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,          // send session + XSRF cookies
    withXSRFToken: true,            // echo XSRF-TOKEN as X-XSRF-TOKEN header
    headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const authStore = useAuthStore()
            authStore.logout()
            window.location.href = '/login'
        }
        return Promise.reject(error)
    },
)

export default api
```

```ts
// resources/js/stores/auth.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const loading = ref(false)

    async function login(email: string, password: string) {
        loading.value = true
        try {
            await api.get('/sanctum/csrf-cookie')        // prime the XSRF cookie
            await api.post('/login', { email, password }) // starts the session
            const { data } = await api.get('/api/user')   // fetch the authed user
            user.value = data.data
            return true
        } finally {
            loading.value = false
        }
    }

    async function logout() {
        await api.post('/logout')
        user.value = null
    }

    return { user, loading, login, logout }
})
```

```ts
// resources/js/router/guards.ts
router.beforeEach((to) => {
    const authStore = useAuthStore()
    if (to.meta.requiresAuth && !authStore.user) {
        return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.meta.guest && authStore.user) {
        return { name: 'dashboard' }
    }
    return true
})
```

> For the API-token (mobile) path, the token is kept in secure device storage and attached via a request interceptor as `Authorization: Bearer {token}` — never in browser `localStorage`.

### Security Measures

| Measure | Implementation |
|---------|---------------|
| Web SPA storage | httpOnly, `Secure`, `SameSite=lax` session cookie — unreadable by JS (no XSS exfiltration) |
| Mobile token storage | OS secure storage (Keychain / Keystore); never `localStorage` |
| Token at rest | Sanctum stores a SHA-256 hash of each personal access token |
| Revocation | Delete the session or the specific `personal_access_tokens` row |
| Transport | HTTPS only |
| CSRF | Handled by Sanctum's stateful middleware + `X-XSRF-TOKEN` for cookie mode |
| Rate limiting | Login endpoint throttled (`throttle:6,1`) |
| CORS | `supports_credentials => true`, restricted to the frontend origin |

### Alternatives Considered

**Option A: `tymon/jwt-auth` (stateless JWT)**
- Rejected: third-party package that lags Laravel releases; stateless tokens are not server-side revocable without extra infrastructure; token-in-`localStorage` is XSS-exfiltratable.

**Option B: Laravel Passport (OAuth 2.0)**
- Rejected as overkill for a single first-party app; Passport is warranted only when issuing tokens to third-party OAuth clients.

**Option C: Session-based with manual CSRF**
- Effectively what Sanctum's SPA mode provides, but Sanctum packages the CSRF/cookie handling and adds token mode for mobile. Chosen via Sanctum rather than hand-rolled.

### Consequences

#### Positive
- First-party, ships with Laravel 13 — no third-party maintenance risk.
- Web SPA uses httpOnly cookies → no token readable by JavaScript.
- Personal access tokens are individually revocable and hashed at rest.
- One package covers both web-cookie and mobile-token clients.

#### Negative
- SPA cookie mode requires the API and SPA to share a top-level domain (or correct CORS + `SameSite` config).
- Two auth modes to document (cookie for web, token for mobile).

#### Mitigations
- `SANCTUM_STATEFUL_DOMAINS` / `SESSION_DOMAIN` documented per environment.
- Login endpoint rate-limited; sensitive actions require password re-entry.

### Enforcement

1. **Middleware**: `auth:sanctum` applied to all protected routes.
2. **Pest tests**: 401 without auth, 403 for unauthorized users; use `Sanctum::actingAs($user)` in tests.
3. **Code review**: no tokens written to `localStorage`; no `tymon`/`JWTSubject` references.
4. **Security audit**: periodic review of token scopes and stateful domains.

### Examples

See `.ai/examples/good-controller.md` for Sanctum-protected endpoints.
