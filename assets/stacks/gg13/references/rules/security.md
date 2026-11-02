# Security Practices

> Builds on `references/principles/security.md` — read it first. This file covers how to apply it on Laravel 13 + Vue 3.5.

## Authentication Token Security (Laravel Sanctum)

### First-party SPA: session cookies

The Vue SPA authenticates via Sanctum's stateful, cookie-based session guard
(session in an `httpOnly` cookie; never auth tokens in `localStorage`).
Configure the session cookie in `config/session.php`:

```env
# .env
SESSION_DRIVER=database
SESSION_LIFETIME=120          # minutes
SESSION_SECURE_COOKIE=true    # HTTPS only in production
SESSION_SAME_SITE=lax         # 'lax' for same-site SPA; 'none' (+ secure) if cross-site
SESSION_HTTP_ONLY=true        # cookie not exposed to JavaScript
SANCTUM_STATEFUL_DOMAINS=app.example.com
```

- Use the session-cookie SPA guard, not API tokens, for the browser client.
- For issued API tokens, scope abilities minimally, revoke on logout, and
  optionally set `sanctum.expiration`.

### Third-party / mobile: API tokens

Sanctum falls back to a `Bearer` API token when no session cookie is present.
Issue with `$user->createToken('device', ['orders:read'])->plainTextToken` and
store it in the client's secure storage (Keychain / Keystore), never in web
`localStorage`.

## CSRF Protection

Sanctum's stateful SPA guard uses Laravel's session, so CSRF protection **is**
required for the SPA:

- **SPA (session cookie)**: the SPA first calls `GET /sanctum/csrf-cookie` to
  receive the `XSRF-TOKEN` cookie, then sends it back as the `X-XSRF-TOKEN`
  header on every mutating request. Axios does this automatically when
  `withCredentials: true`.
- **Pure token API (mobile/third-party)**: stateless `Bearer` token requests
  are not session-based and are exempt from CSRF.
- **Blade/SSR endpoints**: use the `@csrf` Blade directive.

```php
// bootstrap/app.php — enable the stateful SPA middleware
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})
```

## SQL Injection Prevention

- **Always** use Eloquent ORM or Query Builder — never raw SQL with user input
- Use parameter binding for any raw queries:

```php
// Good — parameterized
$users = DB::select('SELECT * FROM users WHERE email = ?', [$email]);

// Bad — vulnerable to SQL injection
$users = DB::select("SELECT * FROM users WHERE email = '{$email}'");
```

- Eloquent automatically protects against injection:

```php
// Safe — Eloquent uses parameter binding
User::where('email', $request->email)->first();
User::whereRaw('created_at > ?', [now()->subDays(7)])->get();
```

## XSS Prevention in Vue

### Vue Automatically Escapes

Vue interpolations (`{{ }}`) automatically escape HTML:

```vue
<template>
  <!-- Safe — auto-escaped -->
  <p>{{ userInput }}</p>

  <!-- Dangerous — use v-html only with sanitized data -->
  <div v-html="sanitizedContent"></div>
</template>
```

### Sanitize User Content

When `v-html` is necessary, sanitize with a library:

```typescript
import DOMPurify from 'dompurify'

function sanitize(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  })
}
```

## Rate Limiting API Endpoints

```php
// Use Laravel's built-in rate limiting
Route::middleware('throttle:api')->group(function () { ... });

// Custom rate limiters in RouteServiceProvider
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->ip());
});

RateLimiter::for('auth', function (Request $request) {
    return Limit::perMinute(10)->by($request->input('email'));
});
```

### Per-Endpoint Rate Limiting

```php
// routes/api.php
Route::post('auth/login')->middleware('throttle:auth');
Route::post('auth/register')->middleware('throttle:auth');
Route::post('password/reset')->middleware('throttle:password_reset');
Route::post('upload')->middleware('throttle:upload');
```

## Input Sanitization

### Laravel's Built-In Protection

- Laravel does **not** auto-sanitize input. It escapes on **output** (Blade
  `{{ }}` and Vue `{{ }}` both HTML-escape) and uses parameter binding to
  prevent SQL injection — but incoming request data is stored as-is. Validate
  and, where relevant, normalize input yourself.
- Validate every field with Form Requests.
- Use `Str::slug()` for URL-safe strings.
- Rely on Blade's `{{ }}` / Vue's `{{ }}` for output escaping; sanitize HTML
  destined for `v-html` with DOMPurify (see below).

### File Upload Sanitization

```php
class StoreAvatarRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'avatar' => [
                'required',
                'file',
                'mimes:jpeg,png,webp,gif',
                'max:2048', // 2MB
                'dimensions:min_width=100,min_height=100',
            ],
        ];
    }
}
```

```php
// Store the file safely. store($path, $disk) generates a random, hashed
// filename automatically — this prevents path traversal and name collisions.
$path = $request->file('avatar')->store('avatars', 'public');

// If you need a specific name, use storeAs() (never trust the client name):
$name = Str::random(40) . '.' . $request->file('avatar')->extension();
$path = $request->file('avatar')->storeAs('avatars', $name, 'public');
```

## Secure File Uploads

```php
class UploadController extends Controller
{
    public function store(StoreUploadRequest $request): JsonResponse
    {
        $file = $request->file('file');

        // Validate file type by MIME, not extension
        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (! in_array($file->getMimeType(), $allowedMimes)) {
            return $this->error('Invalid file type', 422, code: 'VALIDATION_ERROR');
        }

        // Limit file size
        if ($file->getSize() > 5 * 1024 * 1024) {
            return $this->error('File too large. Maximum is 5MB.', 422);
        }

        // Store with an auto-generated random, hashed name on the public disk.
        // store() takes ($path, $disk) and generates the name itself.
        $path = $file->store('uploads', 'public');

        // If a custom name is required, build it and use storeAs():
        // $name = Str::random(40) . '.' . $file->extension();
        // $path = $file->storeAs('uploads', $name, 'public');

        return response()->json([
            'status' => 'success',
            'data' => ['path' => $path, 'url' => Storage::url($path)],
        ], 201);
    }
}
```

## CORS Configuration

```php
// config/cors.php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', '')),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true, // Sanctum SPA sends the session cookie — credentials required
];
```

```env
# .env
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## Additional Security Measures

### Content Security Policy

```php
// In a middleware or app provider
header('Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: https:;');
```

### Security Headers Middleware

```php
class SecurityHeadersMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        // X-XSS-Protection is deprecated and can introduce vulnerabilities in
        // older browsers; modern guidance is to disable it and rely on CSP.
        $response->headers->set('X-XSS-Protection', '0');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return $response;
    }
}
```

### Password Hashing

Use Laravel's built-in hashing via the `hashed` cast:

```php
// Automatic with $fillable and 'password' => 'hashed' cast
protected function casts(): array
{
    return [
        'password' => 'hashed',
    ];
}
```

### Environment Security

- Never commit `.env`; use different `.env` values per environment
- Rotate `APP_KEY` regularly (note: rotating it invalidates existing encrypted
  session cookies and Sanctum sessions, forcing re-authentication)
- In production, source secrets from a manager (AWS Secrets Manager, HashiCorp
  Vault) rather than a hand-edited `.env`
