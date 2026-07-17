# Testing Standards (Pest)

## Pest Configuration

Pest is the primary testing framework. PHPUnit is used only as a fallback.

```php
// tests/Pest.php
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');
```

```php
// tests/TestCase.php
abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
}
```

## Test Organization

```
tests/
├── Feature/
│   ├── Api/
│   │   ├── Auth/
│   │   │   ├── LoginTest.php
│   │   │   ├── RegisterTest.php
│   │   │   └── LogoutTest.php
│   │   ├── UserTest.php
│   │   ├── OrderTest.php
│   │   └── ProductTest.php
│   └── Http/
│       └── Middleware/
├── Unit/
│   ├── Services/
│   │   ├── UserServiceTest.php
│   │   └── OrderServiceTest.php
│   └── Actions/
│       ├── CreateUserActionTest.php
│       └── CancelOrderActionTest.php
├── Feature.php       # Feature test helpers
├── Unit.php          # Unit test helpers
└── helpers/
    └── TestHelpers.php
```

## Feature Tests

### API Endpoint Tests

Test API endpoints using Pest's expressive syntax:

```php
// tests/Feature/Api/UserTest.php
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can list users', function () {
    User::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/users');

    $response
        ->assertOk()
        ->assertJsonStructure([
            'status',
            'data' => ['*' => ['id', 'name', 'email', 'role']],
            'meta' => ['current_page', 'last_page', 'per_page', 'total'],
        ])
        ->assertJsonCount(3, 'data');
});

it('can search users by name', function () {
    User::factory()->create(['name' => 'John Doe']);
    User::factory()->create(['name' => 'Jane Smith']);

    $response = $this->getJson('/api/v1/users?search=John');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment(['name' => 'John Doe']);
});

it('returns 401 when not authenticated', function () {
    $response = $this->getJson('/api/v1/users');

    $response
        ->assertUnauthorized()
        ->assertJsonPath('error.code', 'UNAUTHORIZED');
});

it('can filter users by role', function () {
    User::factory()->count(2)->create(['role' => UserRole::Admin]);
    User::factory()->count(2)->create(['role' => UserRole::User]);

    $response = $this->getJson('/api/v1/users?filter_role=admin');

    $response
        ->assertOk()
        ->assertJsonCount(2, 'data');
});
```

### Auth Feature Tests

```php
// tests/Feature/Api/Auth/LoginTest.php
use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('can login with valid credentials', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password123',
    ]);

    // Login returns 200 (it creates no resource) and, for the Sanctum SPA
    // session guard, sets an httpOnly session cookie rather than a token body.
    $response
        ->assertOk()
        ->assertJsonStructure([
            'status',
            'data' => [
                'user' => ['id', 'name', 'email'],
            ],
        ]);

    $this->assertAuthenticatedAs($user);
});

it('cannot login with invalid credentials', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrongpassword',
    ]);

    $response
        ->assertUnauthorized()
        ->assertJsonPath('error.details.credentials', [
            'The provided credentials are incorrect.',
        ]);
});

it('cannot login with unverified email', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
        'email_verified_at' => null,
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password123',
    ]);

    $response
        ->assertUnauthorized()
        ->assertJsonPath('error.details.email', [
            'Email not verified.',
        ]);
});
```

## Unit Tests

### Service/Action Tests

```php
// tests/Unit/Actions/CreateUserActionTest.php
use App\Actions\CreateUserAction;
use App\Dtos\CreateUserDto;
use App\Enums\UserRole;
use App\Events\UserCreated;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

it('creates a user with valid data', function () {
    $dto = CreateUserDto::fromArray([
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'role' => UserRole::User,
    ]);

    $user = app(CreateUserAction::class)->execute($dto);

    expect($user)->toBeInstanceOf(User::class)
        ->and($user->name)->toBe('John Doe')
        ->and($user->email)->toBe('john@example.com')
        ->and($user->role)->toBe(UserRole::User);
});

it('dispatches a UserCreated event', function () {
    Event::fake();

    $dto = CreateUserDto::fromArray([
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password123',
        'role' => UserRole::User,
    ]);

    app(CreateUserAction::class)->execute($dto);

    Event::assertDispatched(UserCreated::class);
});

it('does not create user with duplicate email', function () {
    User::factory()->create(['email' => 'john@example.com']);

    $dto = CreateUserDto::fromArray([
        'name' => 'John 2',
        'email' => 'john@example.com',
        'password' => 'password123',
        'role' => UserRole::User,
    ]);

    expect(fn () => app(CreateUserAction::class)->execute($dto))
        ->toThrow(UniqueConstraintViolationException::class);
});
```

## Test Factories and Seeds

### Factory Usage in Tests

```php
// Simple creation
$user = User::factory()->create();

// With specific attributes
$user = User::factory()->admin()->create(['name' => 'Super Admin']);

// Related records
$order = Order::factory()->shipped()->create([
    'user_id' => $user->id,
]);

// Collections
$users = User::factory()->count(10)->create();

// With associations
$post = Post::factory()
    ->published()
    ->has(Comment::factory()->count(3))
    ->create(['user_id' => $user->id]);
```

## Database Transactions in Tests

Use `RefreshDatabase` trait (Pest-compatible):

```php
uses(RefreshDatabase::class);
```

This wraps each test in a transaction and rolls back after the test, keeping the database clean.

For tests that use queues, use `DatabaseMigrations` instead:

```php
uses(WithFaker::class, DatabaseMigrations::class);
```

## Pest-Specific Helpers

Pest has no `pest()->scenario()` API — parameterize tests with **datasets**
(`->with([...])`) instead:

```php
it('can access public pages', function () {
    $this->getJson('/api/v1/products')
        ->assertOk();
});

// Run the same test body once per dataset value
it('returns validation errors for required fields', function (string $field) {
    $this->postJson('/api/v1/users', [$field => null])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);
})->with(['name', 'email', 'password']);

// Datasets also work with typed values
it('handles each role correctly', function (UserRole $role) {
    $user = User::factory()->create(['role' => $role]);
    // ... test logic
})->with(UserRole::cases());
```

## Mocking External Services

```php
it('sends a welcome email on registration', function () {
    Notification::fake();

    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'John',
        'email' => 'john@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated();

    Notification::assertSentTo(
        User::first(),
        WelcomeEmail::class
    );
});

it('handles payment gateway timeout gracefully', function () {
    PaymentGateway::fake()->timeout();

    $response = $this->postJson('/api/v1/orders', [
        'product_id' => 1,
        'quantity' => 1,
    ]);

    $response
        ->assertInternalServerError()
        ->assertJsonPath('error.code', 'PAYMENT_SERVICE_UNAVAILABLE');
});
```

## Test Naming Conventions

### Feature Tests

Use `it_can_*`, `it_returns_*`, `it_throws_*`, `it_does_not_*` pattern:

```php
it('can list users when authenticated')
it('returns paginated results')
it('throws a UniqueConstraintViolationException when email exists')
it('does not expose password in response')
it('can filter by role')
it('can search by name')
it('returns 401 when token is missing')
it('returns 403 when user lacks permission')
```

### Unit Tests

Use descriptive past-tense or present-tense:

```php
it('creates a user with valid data')
it('hashes the password before saving')
it('dispatches the UserCreated event')
it('validates the DTO before processing')
```

## Assertions

Pest provides expressive assertion helpers:

```php
// HTTP assertions
$response->assertOk()             // 200
$response->assertCreated()        // 201
$response->assertNoContent()      // 204
$response->assertUnauthorized()   // 401
$response->assertForbidden()      // 403
$response->assertNotFound()       // 404
$response->assertUnprocessable()  // 422
$response->assertInternalServerError() // 500

// JSON assertions
$response->assertJsonCount(5, 'data')
$response->assertJsonFragment(['name' => 'John'])
$response->assertJsonMissing(['secret_field' => true])
$response->assertJsonStructure(['data' => ['*' => ['id']]])

// Model assertions
expect($user)->toBeInstanceOf(User::class)
expect($user->name)->toBe('John')
expect($users)->toHaveCount(5)

// Event assertions
Event::assertDispatched(UserCreated::class)
Event::assertNotDispatched(OrderShipped::class)

// Notification assertions
Notification::assertSentTo($user, WelcomeEmail::class)
Notification::assertCount(2)
```

## Coverage

Run tests with coverage:

```bash
./vendor/bin/pest --coverage
```

Aim for >80% coverage on critical paths (auth, billing, data mutations).
