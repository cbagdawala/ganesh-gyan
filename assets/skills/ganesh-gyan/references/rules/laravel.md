# Laravel Conventions

## Controllers

Controllers must be thin. They only handle HTTP concerns:

- Accept validated form requests (not raw `Request`)
- Delegate all logic to services or action classes
- Return API resources, response objects, or errors
- No business logic, no direct model queries, no direct validation

```php
// Good — thin controller
class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
    ) {}

    public function index(IndexOrderRequest $request): JsonResource
    {
        $orders = $this->orderService->listPaginated(
            filters: $request->validated(),
            pagination: $request->validated('per_page', 15),
        );

        return OrderResource::collection($orders);
    }

    public function store(StoreOrderRequest $request): StoreOrderResponse
    {
        $order = $this->orderService->create(
            dto: $request->toDto(),
            user: $request->user(),
        );

        return new StoreOrderResponse($order);
    }
}
```

```php
// Bad — fat controller
public function store(Request $request)
{
    $validated = $request->validate([
        'product_id' => 'required|exists:products,id',
        'quantity' => 'required|integer|min:1|max:999',
    ]);

    $product = Product::find($validated['product_id']);
    if ($product->stock < $validated['quantity']) {
        return response()->json(['error' => 'Insufficient stock'], 422);
    }

    $order = Order::create([
        'user_id' => auth()->id(),
        'product_id' => $validated['product_id'],
        'quantity' => $validated['quantity'],
    ]);

    $product->decrement('stock', $validated['quantity']);
    event(new OrderPlaced($order));

    return response()->json($order, 201);
}
```

## Form Requests

All API endpoints must use Form Request classes for validation. Never validate in controllers.

```php
class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Gate checks happen in the controller via policy
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'shipping_address_id' => ['nullable', 'integer', 'exists:addresses,id,user_id,' . auth()->id()],
            'coupon_code' => ['nullable', 'string', 'max:64', 'exists:coupons,code,active,1'],
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.max' => 'Maximum order quantity is 999 units.',
            'shipping_address_id.exists' => 'The selected shipping address is not valid.',
        ];
    }

    public function toDto(): StoreOrderDto
    {
        return StoreOrderDto::fromRequest($this);
    }
}
```

### Custom Validation Rules

Place in `app/Rules/`:

```php
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidCouponCode implements ValidationRule
{
    public function __construct(
        private readonly CouponRepository $couponRepo,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $coupon = $this->couponRepo->findByCode($value);

        if (! ($coupon?->isActive() ?? false)) {
            $fail('The :attribute is not a valid or active coupon.');
        }
    }
}
```

## Policies

Every model that requires authorization must have a corresponding Policy.

```php
class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        return $user->id === $order->user_id || $user->isAdmin();
    }

    public function update(User $user, Order $order): bool
    {
        if ($order->status !== OrderStatus::Pending) {
            return false;
        }
        return $user->id === $order->user_id || $user->isAdmin();
    }

    public function cancel(User $user, Order $order): bool
    {
        if ($order->shipped_at !== null) {
            return false;
        }
        return $user->id === $order->user_id;
    }

    public function refund(User $user, Order $order): bool
    {
        return $user->isAdmin();
    }
}
```

Laravel 13 **auto-discovers** policies: a `Post` model resolves to
`App\Policies\PostPolicy` by convention, so no registration is needed in the
common case (the `AuthServiceProvider` was removed from the Laravel 11+
skeleton). When a policy does not follow the naming convention, register it
explicitly with `Gate::policy()` in `AppServiceProvider::boot()`:

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::policy(Order::class, OrderPolicy::class);
    Gate::policy(Product::class, ProductPolicy::class);
    Gate::policy(Cart::class, CartPolicy::class);
}
```

Use in controllers:

```php
public function store(StoreOrderRequest $request): StoreOrderResponse
{
    $this->authorize('create', Order::class);

    $order = $this->orderService->create(
        dto: $request->toDto(),
        user: $request->user(),
    );

    return new StoreOrderResponse($order);
}
```

## Eloquent Models

### Relationships

Define all relationships explicitly with typed returns:

```php
class User extends Authenticatable
{
    use HasApiTokens, SoftDeletes;

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class)->orderByDesc('created_at');
    }

    public function address(): HasOne
    {
        return $this->hasOne(Address::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('deleted_at')->where('is_active', true);
    }

    public function scopeWithOrders(Builder $query): Builder
    {
        return $query->has('orders');
    }
}
```

### Attributes and Casts

Use `casts()` for type casting and enums:

```php
protected function casts(): array
{
    return [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'role' => UserRole::class,
        'settings' => 'array',
        'metadata' => 'json',
        'price_cents' => 'integer',
    ];
}
```

### Accessors and Mutators

The Laravel 13 idiom is a method returning an
`Illuminate\Database\Eloquent\Casts\Attribute` instance (not the legacy
`getXxxAttribute()` methods):

```php
use Illuminate\Database\Eloquent\Casts\Attribute;

class Order extends Model
{
    protected function formattedTotal(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes): string =>
                Money::parse($attributes['total_cents'])->format('en_US'),
        );
    }

    protected function shortStatus(): Attribute
    {
        return Attribute::make(
            get: fn (): string => $this->status?->value ?? 'unknown',
        );
    }
}
```

## Migrations

### Conventions

- Name migrations descriptively: `2024_01_01_000001_create_users_table.php`
- Use `Schema::create()` for new tables, `Schema::table()` for additions
- Always add foreign keys with cascading where appropriate
- Add indexes on columns used in WHERE, JOIN, or ORDER BY clauses
- Use `unsignedBigInteger` for foreign keys
- Add `soft_deletes` to tables with deletable records
- Use timestamps (created_at, updated_at) on every table

```php
Schema::create('orders', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->constrained()->cascadeOnDelete();
    $table->unsignedInteger('quantity')->default(1);
    $table->unsignedBigInteger('total_cents');
    $table->string('status', 20)->default(OrderStatus::Pending->value);
    $table->string('tracking_number', 100)->nullable()->index();
    $table->text('notes')->nullable();
    $table->softDeletes();
    $table->timestamps();
});
```

### Updates

- Create new migration files for changes (never modify existing migrations)
- Use `Schema::rename()`, `Schema::dropColumns()`, `Blueprint::addColumn()` for changes

## Jobs and Queues

```php
class ProcessOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly int $orderId,
    ) {}

    public function handle(
        OrderService $orderService,
        InventoryService $inventoryService,
    ): void {
        $order = Order::with('items.product')->findOrFail($this->orderId);

        $inventoryService->reserve($order->items);

        $orderService->process($order);

        event(new OrderProcessed($order));
    }
}
```

### When to Use Jobs

- Sending emails or notifications
- Generating reports or PDFs
- Processing large datasets
- Calling external APIs with potential latency
- Complex business operations that benefit from async processing

### Rate Limiting Jobs

Control retries with the `$tries`/`$backoff` properties and a `retryUntil()`
method, and throttle throughput with `Redis::throttle()` (or the
`Illuminate\Queue\Middleware\RateLimited` middleware). Set the queue when
dispatching, not in the constructor:

```php
use DateTime;
use Illuminate\Support\Facades\Redis;

class ProcessOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30; // seconds between retries

    public function __construct(
        public readonly int $orderId,
    ) {}

    public function retryUntil(): DateTime
    {
        return now()->addMinutes(5);
    }

    public function handle(): void
    {
        Redis::throttle('process-orders')
            ->allow(10)->every(60)
            ->then(
                fn () => $this->process(),
                fn () => $this->release(10), // rate limit hit — retry later
            );
    }
}

// Dispatch onto a specific queue at call time:
ProcessOrderJob::dispatch($orderId)->onQueue('orders');
```

## Events and Listeners

```php
// Event
class OrderShipped
{
    public function __construct(
        public readonly Order $order,
    ) {}
}

// Listener
class SendOrderShippedNotification
{
    public function handle(OrderShipped $event): void
    {
        $order = $event->order;
        Notification::send($order->user, new OrderShippedNotification($order));
    }
}

// Dispatch
OrderShipped::dispatch($order)->onQueue('notifications');
```

## Configuration

- All configurable values go in `.env` or config files
- Use `env('KEY', 'default')` only in config files
- Never use `env()` outside of `config/` files (it caches after first call)
- Provide sensible defaults in `config/` files

```php
// config/services.php
return [
    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
    ],
];

// .env
STRIPE_KEY=sk_test_...
STRIPE_SECRET=sk_test_...
```

## Artisan Commands

Custom commands for recurring tasks:

```php
class ExpireStaleInvitationsCommand extends Command
{
    protected $signature = 'invitations:expire';
    protected $description = 'Expire invitations that have passed their acceptance window';

    public function handle(): int
    {
        $expired = Invitation::where('expires_at', '<', now())
            ->whereNull('accepted_at')
            ->delete();

        $this->info("Expired {$expired} stale invitations.");
        return Command::SUCCESS;
    }
}
```

Register the schedule in `routes/console.php` using the `Schedule` facade —
Laravel 11+ removed the console kernel and its `schedule()` method:

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;

Schedule::command('invitations:expire')->dailyAt('02:00');
Schedule::command('inventory:reconcile')->daily();

// Sanctum's own maintenance command, when using API tokens:
Schedule::command('sanctum:prune-expired --hours=24')->daily();
```

## Response Handling

Use dedicated response classes instead of `response()->json()`:

```php
class StoreUserResponse implements Responsable
{
    public function __construct(
        private readonly User $user,
    ) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => (new UserResource($this->user))->toArray($request),
            ],
        ], 201);
    }
}
```

For the SPA, authentication is via Sanctum's session cookie, so no token is
returned in the body. When issuing an API token for a mobile/third-party
client, add `'token' => $user->createToken('mobile')->plainTextToken` and use
`token_type => 'Bearer'`; Sanctum plain-text tokens do not carry a TTL unless
you configure `sanctum.expiration`.

## API Endpoints

- Prefix all API routes with `/api/`
- Use resourceful route naming: `users.index`, `orders.store`, etc.
- Use route model binding for single-resource routes
- Version API routes under `/api/v1/`

```php
// routes/api.php
Route::prefix('v1')->group(function () {
    Route::apiResource('users', UserController::class)->only(['index', 'show', 'update']);
    Route::post('users', [UserController::class, 'store']);

    Route::get('orders', [OrderController::class, 'index']);
    Route::post('orders', [OrderController::class, 'store']);
    Route::get('orders/{order}', [OrderController::class, 'show']);
});
```
