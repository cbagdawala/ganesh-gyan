# Blueprint: Login

## Overview

Sanctum stateful (cookie-session) auth flow with PrimeVue form, remember me checkbox, forgot password, error handling, and redirect to previous page or dashboard. The browser SPA authenticates against the `web` session guard — the session lives in an httpOnly cookie, so no token is ever stored in JavaScript-readable storage.

---

## 1. Auth Controller

```php
// app/Http/Controllers/Api/V1/AuthController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AuthController extends BaseController
{
    /**
     * Login with email and password. Establishes a Sanctum stateful
     * session (httpOnly cookie) — no token is returned to the browser.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (! Auth::attempt($credentials, $request->boolean('remember_me'))) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $user = $request->user();

        if ($user->is_deactivated) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        // Prevent session fixation on privilege change.
        $request->session()->regenerate();

        $user->updateLastLogin();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar ? Storage::url($user->avatar) : null,
            ],
        ]);
    }

    /**
     * Register a new user and log them in against the session guard.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => Hash::make($request->validated('password')),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ], 201);
    }

    /**
     * Send password reset email.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->only('email'));

        // Always return the same neutral 200 response regardless of whether the
        // email matched an account, to prevent account enumeration.
        return response()->json([
            'message' => 'If an account exists with that email, a reset link has been sent.',
        ]);
    }

    /**
     * Reset password with token.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password has been reset successfully.',
            ]);
        }

        return response()->json([
            'message' => 'Invalid or expired reset token.',
        ], 422);
    }

    /**
     * Logout: end the session and rotate the CSRF token.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * Return the currently authenticated user (used by the SPA on boot
     * to restore auth state from the session cookie).
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar ? Storage::url($user->avatar) : null,
            ],
        ]);
    }
}
```

---

## 2. Form Requests

```php
// app/Http/Requests/Auth/LoginRequest.php
namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email',
            'password' => 'required|string',
            'remember_me' => 'sometimes|boolean',
        ];
    }
}
```

```php
// app/Http/Requests/Auth/ForgotPasswordRequest.php
namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // No `exists:users,email` rule here: validating existence would let an
        // attacker enumerate registered accounts and contradicts the neutral
        // "If an account exists…" response. Existence is checked (silently) by
        // the password broker instead.
        return [
            'email' => 'required|email',
        ];
    }
}
```

```php
// app/Http/Requests/Auth/ResetPasswordRequest.php
namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password as PasswordRule;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => 'required|string',
            'email' => 'required|email|exists:users,email',
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
        ];
    }
}
```

```php
// app/Http/Requests/Auth/RegisterRequest.php
namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password as PasswordRule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
        ];
    }
}
```

---

## 3. User Model

```php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'avatar', 'is_deactivated'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_deactivated' => 'boolean',
        ];
    }

    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }
}
```

---

## 4. Login Vue Page

```vue
<!-- resources/js/Pages/Auth/Login.vue -->
<template>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <img src="/images/logo.svg" alt="Logo" class="logo" />
                <h2>Welcome Back</h2>
                <p class="text-muted">Sign in to your account</p>
            </div>

            <!-- General error -->
            <Message
                v-if="generalError"
                severity="error"
                class="mb-3"
            >
                {{ generalError }}
            </Message>

            <form @submit.prevent="handleLogin" novalidate>
                <div class="mb-3">
                    <FloatLabel>
                        <InputText
                            id="email"
                            type="email"
                            v-model="form.email"
                            :class="{ 'p-invalid': errors.email }"
                            placeholder="Email"
                            autocomplete="email"
                        />
                        <label for="email">Email</label>
                    </FloatLabel>
                    <Message v-if="errors.email" severity="error" size="small">{{ errors.email[0] }}</Message>
                </div>

                <div class="mb-3">
                    <FloatLabel>
                        <Password
                            id="password"
                            v-model="form.password"
                            :class="{ 'p-invalid': errors.password }"
                            :feedback="false"
                            toggleMask
                            placeholder="Password"
                            autocomplete="current-password"
                        />
                        <label for="password">Password</label>
                    </FloatLabel>
                    <Message v-if="errors.password" severity="error" size="small">{{ errors.password[0] }}</Message>
                </div>

                <div class="mb-4 d-flex justify-content-between align-items-center">
                    <Checkbox
                        v-model="form.remember_me"
                        inputId="remember"
                        :binary="true"
                    />
                    <label for="remember" class="mr-2">Remember me</label>
                    <Button
                        label="Forgot Password?"
                        text
                        size="small"
                        @click="showForgotPassword = true"
                    />
                </div>

                <Button
                    label="Sign In"
                    icon="pi pi-sign-in"
                    :loading="loading"
                    :disabled="loading"
                    class="w-full"
                    type="submit"
                />
            </form>

            <div class="login-footer mt-4">
                <p class="text-muted">
                    Don't have an account?
                    <router-link to="/register" class="text-primary">Sign up</router-link>
                </p>
            </div>
        </div>

        <!-- Forgot Password Dialog -->
        <Dialog
            v-model:visible="showForgotPassword"
            modal
            header="Forgot Password"
            :style="{ width: '30rem' }"
        >
            <p>Enter your email address and we'll send you a link to reset your password.</p>

            <Message v-if="forgotError" severity="error" class="mb-3">{{ forgotError }}</Message>
            <Message v-if="forgotSuccess" severity="success" class="mb-3">{{ forgotSuccess }}</Message>

            <form @submit.prevent="handleForgotPassword" novalidate>
                <div class="mb-3">
                    <FloatLabel>
                        <InputText
                            id="forgot-email"
                            type="email"
                            v-model="forgotForm.email"
                            :class="{ 'p-invalid': forgotErrors.email }"
                            placeholder="Email"
                        />
                        <label for="forgot-email">Email</label>
                    </FloatLabel>
                    <Message v-if="forgotErrors.email" severity="error" size="small">{{ forgotErrors.email[0] }}</Message>
                </div>

                <div class="d-flex justify-content-end gap-2">
                    <Button label="Cancel" text @click="showForgotPassword = false" />
                    <Button
                        label="Send Reset Link"
                        :loading="forgotLoading"
                        :disabled="forgotLoading"
                        @click="handleForgotPassword"
                    />
                </div>
            </form>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import axios from 'axios';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import FloatLabel from 'primevue/floatlabel';
import Message from 'primevue/message';
import Dialog from 'primevue/dialog';

interface LoginForm {
    email: string;
    password: string;
    remember_me: boolean;
}

const loading = ref(false);
const generalError = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});

const form = reactive<LoginForm>({
    email: '',
    password: '',
    remember_me: false,
});

const showForgotPassword = ref(false);
const forgotLoading = ref(false);
const forgotSuccess = ref<string | null>(null);
const forgotError = ref<string | null>(null);
const forgotErrors = ref<Record<string, string[]>>({});
const forgotForm = reactive({ email: '' });

const handleLogin = async () => {
    loading.value = true;
    generalError.value = null;
    errors.value = {};

    try {
        // Sanctum stateful SPA auth: prime the CSRF cookie, then authenticate.
        // The server establishes a session stored in an httpOnly cookie — no
        // token is ever kept in localStorage (which is readable by any XSS).
        // `axios.defaults.withCredentials = true` must be set globally so the
        // XSRF-TOKEN and session cookies are sent. The login endpoint should
        // authenticate the web/session guard (Auth::attempt + regenerate)
        // rather than return a bearer token to the browser.
        await axios.get('/sanctum/csrf-cookie');
        await axios.post('/api/login', form);

        // Redirect to intended URL or dashboard.
        const params = new URLSearchParams(window.location.search);
        window.location.assign(params.get('redirect') ?? '/dashboard');
    } catch (error: any) {
        const status = error.response?.status;
        if (status === 422) {
            errors.value = error.response.data.errors ?? {};
        } else if (status === 401) {
            generalError.value = error.response.data?.message ?? 'Invalid credentials.';
        } else if (status === 403) {
            generalError.value = error.response.data?.message ?? 'Your account cannot sign in.';
        } else {
            generalError.value = 'An unexpected error occurred.';
        }
    } finally {
        loading.value = false;
    }
};

const handleForgotPassword = async () => {
    forgotLoading.value = true;
    forgotError.value = null;
    forgotSuccess.value = null;
    forgotErrors.value = {};

    try {
        await axios.post('/api/forgot-password', { email: forgotForm.email });
        forgotSuccess.value = 'If an account exists with that email, a reset link has been sent.';
        forgotForm.email = '';
    } catch (error: any) {
        if (error.response?.status === 422) {
            forgotErrors.value = error.response.data.errors;
        } else {
            forgotError.value = 'Failed to send reset email. Please try again.';
        }
    } finally {
        forgotLoading.value = false;
    }
};
</script>

<style scoped>
.login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-ground);
    padding: 1rem;
}

.login-card {
    background: var(--surface-card);
    border-radius: 12px;
    padding: 2rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.login-header {
    text-align: center;
    margin-bottom: 2rem;
}

.login-header .logo {
    max-width: 120px;
    margin-bottom: 1rem;
}

.login-header h2 {
    margin: 0;
    font-size: 1.5rem;
}

.login-footer {
    text-align: center;
}
</style>
```

---

## 5. Routes

```php
// routes/api.php
use App\Http\Controllers\Api\V1\AuthController;

// Guest endpoints. The SPA calls GET /sanctum/csrf-cookie first so these
// stateful POSTs carry a valid XSRF-TOKEN header.
Route::post('/login', [AuthController::class, 'login'])->name('login')->middleware('throttle:6,1');
Route::post('/register', [AuthController::class, 'register'])->name('register');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.reset');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me'])->name('user');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});
```

---

## 6. Pest Tests

```php
// tests/Feature/Api/AuthTest.php
use App\Models\User;

describe('Authentication', function () {
    describe('POST /api/login', function () {
        it('logs in with valid credentials', function () {
            $user = User::factory()->create(['password' => bcrypt('password')]);

            $response = $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'password',
            ]);

            $response->assertStatus(200)
                ->assertJsonStructure(['user'])
                ->assertJsonPath('user.email', $user->email);

            $this->assertAuthenticatedAs($user);
        });

        it('returns 401 for invalid credentials', function () {
            User::factory()->create(['password' => bcrypt('password')]);

            $this->postJson('/api/login', [
                'email' => 'user@example.com',
                'password' => 'wrong-password',
            ])->assertStatus(401)
                ->assertJsonPath('message', 'Invalid credentials.');
        });

        it('validates required fields', function () {
            $this->postJson('/api/login', [])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['email', 'password']);
        });

        it('blocks deactivated users', function () {
            $user = User::factory()->create([
                'password' => bcrypt('password'),
                'is_deactivated' => true,
            ]);

            $this->postJson('/api/login', [
                'email' => $user->email,
                'password' => 'password',
            ])->assertStatus(403)
                ->assertJsonPath('message', 'Your account has been deactivated.');
        });
    });

    describe('POST /api/register', function () {
        it('registers a new user', function () {
            $response = $this->postJson('/api/register', [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ]);

            $response->assertStatus(201)
                ->assertJsonPath('user.name', 'New User')
                ->assertJsonPath('user.email', 'new@example.com');

            expect(User::where('email', 'new@example.com')->first())
                ->name->toBe('New User');
        });

        it('validates password strength', function () {
            $this->postJson('/api/register', [
                'name' => 'New User',
                'email' => 'new@example.com',
                'password' => 'weak',
                'password_confirmation' => 'weak',
            ])->assertStatus(422)
                ->assertJsonValidationErrors('password');
        });

        it('rejects duplicate email', function () {
            User::factory()->create(['email' => 'existing@example.com']);

            $this->postJson('/api/register', [
                'name' => 'Another User',
                'email' => 'existing@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ])->assertStatus(422)
                ->assertJsonValidationErrors('email');
        });
    });

    describe('POST /api/forgot-password', function () {
        $neutralMessage = 'If an account exists with that email, a reset link has been sent.';

        it('sends reset link for existing email', function () use ($neutralMessage) {
            $user = User::factory()->create(['email' => 'existing@example.com']);

            $this->postJson('/api/forgot-password', ['email' => $user->email])
                ->assertStatus(200)
                ->assertJsonPath('message', $neutralMessage);
        });

        it('returns the same neutral response for a non-existing email', function () use ($neutralMessage) {
            // No account enumeration: unknown emails get the identical 200
            // response, not a 422 "does not exist" validation error.
            $this->postJson('/api/forgot-password', ['email' => 'nonexistent@example.com'])
                ->assertStatus(200)
                ->assertJsonPath('message', $neutralMessage);
        });
    });

    describe('POST /api/logout', function () {
        it('logs out authenticated user', function () {
            $user = User::factory()->create();

            $this->actingAs($user)
                ->postJson('/api/logout')
                ->assertStatus(200)
                ->assertJsonPath('message', 'Logged out.');

            $this->assertGuest();
        });

        it('returns 401 when not authenticated', function () {
            $this->postJson('/api/logout')->assertStatus(401);
        });
    });
});
```

---

## 7. Sanctum Configuration

Sanctum ships with Laravel and is wired up by `php artisan install:api`. For the
stateful (cookie-session) SPA flow, configure the environment — there is no
`config/jwt.php` and no secret/TTL to manage:

```env
# .env
SANCTUM_STATEFUL_DOMAINS=app.example.com,localhost:5173
SESSION_DOMAIN=.example.com
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

```php
// bootstrap/app.php — enable Sanctum's stateful middleware for the 'api' group
->withMiddleware(function (Middleware $middleware) {
    $middleware->statefulApi();
})
```

The SPA must send credentials so the session and XSRF cookies travel with each
request: set `axios.defaults.withCredentials = true` and
`axios.defaults.withXSRFToken = true` (or configure the shared axios client).

---

## 8. Vue Dependencies

```json
{
    "dependencies": {
        "primevue": "^4.2.0",
        "@primevue/themes": "^4.2.0",
        "vue": "^3.5.0",
        "vue-router": "^4.4.0",
        "pinia": "^3.0.0",
        "axios": "^1.7.0"
    }
}
```
