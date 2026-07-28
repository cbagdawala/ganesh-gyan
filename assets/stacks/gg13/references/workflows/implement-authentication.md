# Implement Authentication (Sanctum)

## When to Use

When implementing SPA authentication with Laravel Sanctum: cookie-based session auth, login/logout endpoints, Vue HTTP client, protected routes, and API middleware.

## Prerequisites

- Laravel 13 project with database configured
- User model exists
- Vue 3 + PrimeVue installed
- Router configured with navigation guards

## Step-by-Step Workflow

### 1. Install Sanctum

Laravel 11+ installs Sanctum and the `routes/api.php` file via the API scaffolding command:

```bash
php artisan install:api
```

This publishes Sanctum's migration and configuration. Run migrations if you have not already:

```bash
php artisan migrate
```

### 2. Update User Model

In `app/Models/User.php`, use Sanctum's `HasApiTokens` trait. No JWT contract is required.

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
}
```

### 3. Configure Stateful (SPA) Authentication

For a first-party Vue SPA served from the same top-level domain, use Sanctum's cookie-based session auth. Configure the stateful domains and CORS so the browser sends the session and `XSRF-TOKEN` cookies.

In `.env`:

```
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173,127.0.0.1,127.0.0.1:8000
SESSION_DOMAIN=localhost
SESSION_DRIVER=cookie
```

In `config/cors.php`, allow credentials and expose the Sanctum cookie route:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
'supports_credentials' => true,
```

Sanctum's `EnsureFrontendRequestsAreStateful` middleware is enabled for the `api` group automatically by `install:api` in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->statefulApi();
})
```

### 4. Create Auth Controller

```bash
php artisan make:controller AuthController
```

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        // Rotate the session ID to prevent session fixation.
        $request->session()->regenerate();

        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Successfully logged out']);
    }
}
```

> For a mobile client or third-party consumer instead of a first-party SPA, issue a personal access token with `$user->createToken('name')->plainTextToken` and authenticate requests with the `Authorization: Bearer <token>` header. The `auth:sanctum` guard accepts both cookie sessions and bearer tokens.

### 5. Register API Routes

The SPA login/logout endpoints live on the stateful `web` middleware group (so a session cookie can be issued); protected API routes use `auth:sanctum`. In `routes/api.php`:

```php
use App\Http\Controllers\AuthController;

// Stateful auth endpoints (session cookie issued via web middleware).
Route::middleware('web')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    // Protected resource routes...
});
```

### 6. Create the Axios Client

Configure one shared axios instance with `withCredentials` so the session and CSRF cookies travel with every request. Axios automatically reads the `XSRF-TOKEN` cookie and sends it back as the `X-XSRF-TOKEN` header.

```js
// resources/js/api/client.js
import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    withCredentials: true,
    withXSRFToken: true, // required by axios 1.x to send the X-XSRF-TOKEN header
});

export default api;

// Call this once before the first authenticating request to prime the CSRF cookie.
export async function initCsrf() {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true });
}
```

### 7. Create Vue Auth Composable

```js
// resources/js/composables/useAuth.js
import { ref, computed } from 'vue';
import api, { initCsrf } from '@/api/client';

const user = ref(null);

export function useAuth() {
    const isAuthenticated = computed(() => !!user.value);

    const login = async (email, password) => {
        await initCsrf();
        const { data } = await api.post('/login', { email, password });
        user.value = data.user;
        return data;
    };

    const fetchUser = async () => {
        const { data } = await api.get('/me');
        user.value = data;
        return data;
    };

    const logout = async () => {
        await api.post('/logout');
        user.value = null;
    };

    return { isAuthenticated, user, login, logout, fetchUser };
}
```

### 8. Handle 401 Responses

```js
// resources/js/bootstrap.js or axios setup
import api from '@/api/client';

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Session expired or user not authenticated: send them to login.
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
```

### 9. Create Vue Router Guard

With cookie auth there is no token in `localStorage`; the guard checks the reactive auth state (hydrated on app boot by calling `fetchUser()`).

```js
// resources/js/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '@/composables/useAuth';

const routes = [
    {
        path: '/login',
        name: 'login',
        component: () => import('@/Pages/Auth/Login.vue'),
        meta: { guest: true },
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/Pages/Dashboard.vue'),
        meta: { guard: true },
    },
];

const router = createRouter({ routes, history: createWebHistory() });

router.beforeEach((to) => {
    const { isAuthenticated } = useAuth();
    if (to.meta.guard && !isAuthenticated.value) {
        return { name: 'login', query: { redirect: to.fullPath } };
    }
    if (to.meta.guest && isAuthenticated.value) {
        return { name: 'dashboard' };
    }
});

export default router;
```

### 10. Create Login Page

```vue
<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';

const router = useRouter();
const route = useRoute();
const { login } = useAuth();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
    loading.value = true;
    error.value = '';
    try {
        await login(email.value, password.value);
        const redirect = route.query.redirect || '/dashboard';
        router.push(redirect);
    } catch (e) {
        error.value = e.response?.data?.message || 'Invalid credentials';
    }
    loading.value = false;
};
</script>

<template>
    <div class="login-page">
        <Card>
            <template #title>Sign In</template>
            <template #content>
                <Message v-if="error" severity="error" :text="error" />
                <form @submit.prevent="handleLogin">
                    <FloatLabel>
                        <InputText id="email" v-model="email" type="email" required />
                        <label for="email">Email</label>
                    </FloatLabel>
                    <FloatLabel>
                        <Password v-model="password" toggleMask required />
                        <label>Password</label>
                    </FloatLabel>
                    <Button label="Sign In" :disabled="loading" type="submit" />
                </form>
            </template>
        </Card>
    </div>
</template>
```

## Artisan Commands Reference

```bash
php artisan install:api
php artisan migrate
php artisan make:controller AuthController
php artisan route:list --path=api
php artisan test --filter=Auth
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `app/Models/User.php` | HasApiTokens trait |
| `app/Http/Controllers/AuthController.php` | Login/logout/me |
| `bootstrap/app.php` | Stateful API middleware |
| `config/cors.php` | Allow credentials for SPA |
| `routes/api.php` | Auth routes |
| `resources/js/api/client.js` | Axios client (withCredentials) |
| `resources/js/composables/useAuth.js` | Auth state management |
| `resources/js/bootstrap.js` | 401 interceptor |
| `resources/js/router/index.js` | Route guards |
| `resources/js/Pages/Auth/Login.vue` | Login UI |
| `tests/Feature/Auth/LoginTest.php` | Auth tests |
| `tests/Feature/Auth/LogoutTest.php` | Logout tests |

## Testing

```bash
php artisan test tests/Feature/Auth/
php artisan test --filter=test_login_with_valid_credentials
php artisan test --filter=test_login_with_invalid_credentials
php artisan test --filter=test_logout_invalidates_session
php artisan test --filter=test_protected_routes_return_401
```

## Verification Checklist

- [ ] Login authenticates and returns user data
- [ ] Invalid credentials return 422 with message
- [ ] Session cookie issued on login
- [ ] CSRF cookie primed before login (`/sanctum/csrf-cookie`)
- [ ] Logout invalidates the session
- [ ] Protected routes return 401 without a session
- [ ] Protected routes work with a valid session
- [ ] Vue login form submits and redirects
- [ ] Axios sends credentials and X-XSRF-TOKEN header
- [ ] Router guards redirect unauthenticated users
- [ ] All tests pass
