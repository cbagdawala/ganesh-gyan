# Architecture

## Overview

The application follows a **layered architecture** with Laravel handling the API/backend and Vue 3 SPA handling the frontend presentation layer.

```
┌─────────────────────────────────────────────────────────┐
│  Vue 3 SPA (PrimeVue, Pinia, Vue Router, Axios)         │
│  ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │
│  │ Components│ │ Views    │ │ Stores   │ │Composables│ │
│  └─────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘ │
│        └──────────────┴─────────────┴─────────────┘       │
└────────────────────────────────────┬─────────────────────┘
                                     │ REST API (JSON)
                                     │ Sanctum session cookie (SPA)
┌────────────────────────────────────┴─────────────────────┐
│  Laravel 13 API Backend                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐     │
│  │Controllers│──▶│Services │──▶│ Repositories/    │     │
│  │ (thin)   │   │(business)│   │ Eloquent Models  │     │
│  └──────────┘   └──────────┘   └──────────────────┘     │
│       │                │                                    │
│  Form Requests      Actions                              │
│  Middleware          Jobs                                │
│  Policies            Events                              │
│  Resources           Listeners                           │
└──────────────────────────────────────────────────────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
  MySQL      Redis      Queue
 (Eloquent) (Cache)   (Jobs)
```

## Layers

### 1. Presentation Layer (Laravel HTTP)

Controllers are thin. They only:
- Accept Form Request (validated input)
- Delegate to a Service or Action class
- Return an API Resource or error response

```php
class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(IndexUserRequest $request): JsonResource
    {
        $users = $this->userService->list($request->validated());
        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request): StoreUserResponse
    {
        $result = $this->userService->create($request->toDto());
        return new StoreUserResponse($result);
    }
}
```

### 2. Service / Action Layer (Business Logic)

Services contain business logic. For single discrete actions, use Action classes in the `Actions/` directory.

```php
class CreateUserAction
{
    public function __construct(
        private readonly UserRepository $repository,
        private readonly PasswordHasher $hasher,
        private readonly NotificationService $notifications,
    ) {}

    public function execute(CreateUserDto $dto): User
    {
        $user = $this->repository->create([
            'name' => $dto->name,
            'email' => $dto->email,
            'password' => $this->hasher->hash($dto->password),
        ]);

        event(new UserCreated($user));
        return $user;
    }
}
```

### 3. Data Access Layer (Eloquent Models)

Models define relationships, scopes, and accessors. Heavy query logic belongs in Repository classes or Query Scopes.

```php
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'password', 'role',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('deleted_at');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
```

### 4. API Resource Layer

Transform models into JSON responses. Never return raw models to the controller.

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role?->value,
            'avatar_url' => $this->avatar_url,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

## Authentication Flow (Laravel Sanctum — SPA Cookie Session)

The Vue SPA authenticates against the Laravel API using Sanctum's stateful,
cookie-based session guard. No tokens are stored in JavaScript — the session
lives in an `httpOnly` cookie the browser sends automatically.

```
┌────────┐   GET /sanctum/csrf-cookie   ┌──────────────────────┐
│  Vue   │─────────────────────────────▶│ Laravel (sets        │
│  SPA   │◀─────────────────────────────│ XSRF-TOKEN cookie)   │
└────────┘                              └──────────────────────┘

┌────────┐   POST /login (credentials)  ┌──────────────────────┐
│  Vue   │─────────────────────────────▶│  Laravel Auth API    │
│  SPA   │◀─────────────────────────────│  (starts session,    │
│        │   Set-Cookie: session (httpOnly)  issues session)   │
└────────┘                              └──────────────────────┘

┌────────┐  Cookie: session + X-XSRF-TOKEN  ┌──────────────────┐
│  Vue   │─────────────────────────────────▶│ Laravel API      │
│  SPA   │                                  │ auth:sanctum     │
│        │◀─────────────────────────────────│ (stateful guard) │
└────────┘         JSON Response            └──────────────────┘
```

- The SPA first calls `GET /sanctum/csrf-cookie` to obtain the `XSRF-TOKEN`
  cookie, then logs in via a session-based `POST /login`.
- Subsequent requests are authenticated by the `httpOnly` session cookie the
  browser sends automatically; the `X-XSRF-TOKEN` header guards against CSRF.
- Enable the stateful SPA middleware in `bootstrap/app.php` via
  `$middleware->statefulApi();` and protect routes with `auth:sanctum`.
- For non-SPA clients (mobile, third parties), Sanctum falls back to API
  tokens issued via `HasApiTokens` and sent as a `Bearer` header.

## Blade Shell (SPA Entry Point)

Blade templates serve only as the SPA shell. The actual UI is rendered by Vue.

```html
{{-- resources/views/app.blade.php --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.ts'])
</head>
<body>
    <div id="app" data-initial-user='@json(auth()->user())'>
        {{-- Vue SPA mounts here --}}
    </div>
</body>
</html>
```

`routes/web.php` returns this view for every non-API path via a catch-all
(`Route::view('/{any?}', 'app')->where('any', '^(?!(api|sanctum|up)(/|$)).*$')`),
so deep links and refreshes reach Vue Router — see "SPA Web Route" in
`rules/laravel.md`.

## Database Layer

- Eloquent ORM with relationships
- Query Builder for complex queries
- Repository pattern for complex data access
- Query Scopes for reusable model filtering

## Directory Structure Conventions

```
project/
├── app/
│   ├── Actions/           # Single-purpose action classes
│   ├── Console/
│   │   └── Commands/
│   ├── Dtos/              # Data Transfer Objects (readonly classes)
│   ├── Enums/             # PHP 8.1+ enums
│   ├── Events/            # Domain events
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/       # API controllers (prefix: /api/)
│   │   │   └── Web/       # Web controllers (if any)
│   │   ├── Middleware/
│   │   ├── Requests/
│   │   │   ├── Api/       # API form requests
│   │   │   └── Web/       # Web form requests
│   │   ├── Resources/     # API resource transformers
│   │   └── Responses/     # Standardized response classes
│   ├── Jobs/              # Queue job classes
│   ├── Listeners/         # Event listeners
│   ├── Models/            # Eloquent models
│   │   ├── Concerns/      # Shared model traits (e.g., HasUuid)
│   │   └── Observers/     # Model observers
│   ├── Policies/          # Authorization policies
│   ├── Providers/         # Service providers
│   ├── Repositories/      # Data access repositories
│   ├── Rules/             # Custom validation rules
│   ├── Services/          # Business logic services
│   └── Traits/            # Reusable traits
├── bootstrap/
├── config/
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── lang/
├── public/
├── resources/
│   ├── css/
│   ├── js/
│   │   ├── api/           # Axios service layer
│   │   ├── components/    # Vue components
│   │   ├── composables/   # Vue composables (composables)
│   │   ├── layouts/       # Vue layouts
│   │   ├── pages/         # Route views
│   │   ├── router/        # Vue Router config
│   │   ├── stores/        # Pinia stores
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions
│   │   └── app.ts         # SPA entry point
│   └── views/             # Blade templates (SPA shell only)
├── routes/
│   ├── api.php            # API routes
│   └── web.php            # Web routes
├── storage/
├── tests/
│   ├── Feature/
│   ├── Unit/
│   ├── Pest.php           # Pest configuration
│   ├── TestCase.php       # Base test case
│   └── helpers/           # Test helpers
├── composer.json
├── package.json
├── phpunit.xml
└── vite.config.ts
```

## Request Flow

```
Vue Component
  └── dispatches action (Pinia store)
      └── calls API service (Axios, withCredentials)
          └── sends Sanctum session cookie + X-XSRF-TOKEN header
              └── Laravel route
                  └── auth:sanctum middleware (stateful SPA guard)
                  └── Form request validation
                  └── Controller → Service/Action
                      └── Repository/Model
                          └── Database
                              └── Response
                                  └── API Resource
                                      └── JSON to Vue
                                          └── Update store/state
                                              └── Re-render component
```
