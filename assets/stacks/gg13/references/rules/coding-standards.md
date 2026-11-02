# Coding Standards

> Builds on `references/principles/coding-standards.md` — read it first. This file covers how to apply it on Laravel 13 + Vue 3.5.

## PHP Standards

### PSR Compliance

- **PSR-12** — Coding style guide (extended from PSR-2)
- **PSR-4** — Autoloading standard (namespace to directory mapping)
- **PSR-11** — Container interface compliance

### PHP 8.3+ Features

Use modern PHP features where appropriate:

```php
// Named arguments
User::create(name: 'John', email: 'john@example.com');

// Constructor promotion
class UserService {
    public function __construct(
        private UserRepository $repository,
        private NotificationService $notifications,
    ) {}
}

// Readonly properties
class CreateUserCommand {
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
    ) {}
}

// Enums for status/state
enum OrderStatus: string {
    case Pending = 'pending';
    case Processing = 'processing';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}

// Match expressions instead of large switch statements
$role = match($user->role) {
    'admin' => 'Administrator',
    'moderator' => 'Moderator',
    default => 'User',
};

// Typed properties over docblock types
class OrderService {
    private OrderRepository $orderRepository;
    private float $taxRate = 0.1;
}
```

> Note: Laravel has **no** native attribute-based routing (`#[Route(...)]`) and
> no `#[JWTGuard]` attribute — both are invented. Define routes in
> `routes/api.php` / `routes/web.php`, and apply auth with route middleware
> (`->middleware('auth:sanctum')`), not PHP attributes.

### Type Declarations

- Use strict typing: `declare(strict_types=1);` in every PHP file
- Declare return types on all methods
- Declare parameter types where meaningful
- Use `string|int|null` over `mixed` when specific types are known
- Avoid `mixed` unless the type truly varies at runtime

```php
public function findUser(int $id): ?User
public function createUser(CreateUserDto $dto): User
public function deleteOrder(int $id): bool
```

## Vue/JavaScript Standards

### Composition API

Composition API with `<script setup>` is the default. Options API is not encouraged for new components.

```vue
<!-- Preferred -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  userId: number
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'updated', user: User): void
  (e: 'deleted', id: number): void
}>()

const isLoading = ref(false)
const user = ref<User | null>(null)
const errorMessage = ref<string | null>(null)

const displayName = computed(() => user.value?.name ?? 'Unknown')

onMounted(async () => {
  isLoading.value = true
  try {
    const response = await api.get(`/users/${props.userId}`)
    user.value = response.data.data
  } catch (error) {
    errorMessage.value = 'Failed to load user'
  } finally {
    isLoading.value = false
  }
})
</script>
```

### TypeScript in Vue

- Use `<script setup lang="ts">` in all `.vue` files
- Define prop types using TypeScript interfaces or inline type annotations
- Define emit types explicitly
- Use `defineModel()` for two-way binding where appropriate

```typescript
interface User {
  id: number
  name: string
  email: string
  role: UserRole
  created_at: string
}

type UserRole = 'admin' | 'user' | 'moderator'

interface UserCardProps {
  user: User
  showEmail?: boolean
}

interface UserCardEmits {
  (e: 'edit', userId: number): void
  (e: 'remove', userId: number): void
}

const props = withDefaults(defineProps<UserCardProps>(), {
  showEmail: true,
})

const emit = defineEmits<UserCardEmits>()
```

### Imports

- Group imports: Vue/external libraries first, then internal modules
- Use named imports over default imports where possible
- Use the `@/` path alias for all internal imports — in components, service
  files, and utilities alike. Avoid deep relative paths (`../../../`); they are
  brittle and hard to refactor.

```typescript
// Correct ordering
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import api from '@/services/api'
import { formatDateTime } from '@/utils/date'
import type { User } from '@/types/user'
```

## Code Organization

### Directory Structure

```
app/
├── Actions/          # Single-action classes (CreateUserAction, etc.)
├── Console/          # Artisan commands
├── Dtos/             # Data Transfer Objects
├── Enums/            # PHP Enums
├── Events/           # Event classes
├── Http/
│   ├── Controllers/  # Thin controllers
│   ├── Middleware/     # HTTP middleware
│   ├── Requests/       # Form request validation
│   └── Resources/      # API resource transformers
├── Jobs/             # Queue jobs
├── Listeners/        # Event listeners
├── Models/           # Eloquent models
├── Policies/         # Authorization policies
├── Providers/        # Service providers
└── Services/         # Business logic layer
```

### Single Responsibility

How the principle maps onto Laravel classes:

- **Controller**: Parse request, delegate to service, return response
- **Service/Action**: Business logic
- **Repository**: Data access
- **Form Request**: Validation rules
- **Policy**: Authorization logic
- **Job**: One async task
- **Event**: One domain event

```php
// Bad — doing too much in one method
public function store(Request $request)
{
    $validated = $request->validate([...]);
    $user = User::create($validated);
    $token = $user->createToken('web')->plainTextToken; // Sanctum API token
    Notification::send($user, new UserRegistered($user));
    Cache::forget("user-{$user->id}");
    return response()->json(compact('token'));
}

// Good — separated concerns
public function store(CreateUserRequest $request): JsonResource
{
    $user = $this->userService->create($request->toDto());
    $token = $this->authService->generateToken($user);
    return new UserResource($user, $token);
}
```

## File Organization

- One class per file (PHP)
- One component per file (Vue)
- One action/service per file unless it's a small related group
- Keep files under 300 lines; extract helpers into traits, services, or utilities
- Keep component files under 200 lines; extract composables for logic
