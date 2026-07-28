# Create Event

Build an event class for firing events in the application.

## Prerequisites

- [ ] Know what event to fire (e.g., `ProductCreated`, `OrderShipped`, `UserRegistered`)
- [ ] Know what data the event should carry
- [ ] Know which listeners should handle the event
- [ ] Know if the event should be dispatched synchronously or asynchronously

## Step 1 — Generate Event

```bash
php artisan make:event ProductCreated
php artisan make:event OrderShipped
php artisan make:event UserRegistered
```

## Step 2 — Event Implementation

```php
<?php

namespace App\Events;

use App\Models\Product;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProductCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Product $product,
        public ?string $source = null,
        public array $metadata = [],
    ) {}

    /**
     * Get the event's tags.
     */
    public function tags(): array
    {
        return ['product', 'created', "product:{$this->product->id}"];
    }
}
```

## Step 3 — Event with Multiple Payloads

```php
<?php

namespace App\Events;

use App\Models\Order;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderShipped
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order,
        public User $user,
        public string $trackingNumber,
        public ?string $carrier = null,
    ) {}

    public function tags(): array
    {
        return ['order', 'shipped', "order:{$this->order->id}"];
    }
}
```

## Step 4 — Using the Event

```php
// Dispatch from controller
use App\Events\ProductCreated;

class ProductController extends Controller
{
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create($request->validated());

        ProductCreated::dispatch($product, source: 'web');

        return (new ProductResource($product))
            ->response()
            ->setStatusCode(201);
    }
}
```

```php
// Dispatch from service
use App\Events\OrderShipped;

class OrderService
{
    public function ship(Order $order, string $trackingNumber, string $carrier): Order
    {
        $order->update(['status' => 'shipped', 'tracking_number' => $trackingNumber]);

        OrderShipped::dispatch(
            order: $order,
            user: $order->user,
            trackingNumber: $trackingNumber,
            carrier: $carrier,
        );

        return $order->fresh();
    }
}
```

## Step 5 — Broadcasting (Optional)

```php
// Add to event class
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class ProductCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Product $product,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('products')];
    }

    public function broadcastAs(): string
    {
        return 'product.created';
    }

    public function broadcastWith(): array
    {
        return [
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'source' => 'web',
        ];
    }
}
```

## Step 6 — Testing

```bash
# Feature test: event is dispatched

it('dispatches ProductCreated event when product is created', function () {
    Event::fake([ProductCreated::class]);

    $product = Product::factory()->create();

    Event::assertDispatched(ProductCreated::class, function ($event) use ($product) {
        return $event->product->id === $product->id;
    });
});

# Feature test: event carries correct data

it('carries the correct product data', function () {
    Event::fake([ProductCreated::class]);

    $product = Product::factory()->create(['name' => 'Test']);

    Event::assertDispatched(ProductCreated::class, function ($event) {
        return $event->product->name === 'Test';
    });
});

# Feature test: event with metadata

it('carries metadata in event', function () {
    Event::fake([ProductCreated::class]);

    $product = Product::factory()->create();

    Event::assertDispatched(ProductCreated::class, function ($event) {
        return $event->metadata['source'] === 'api';
    });
});

# Feature test: event tags

it('has correct tags', function () {
    $product = Product::factory()->create(['id' => 42]);

    $event = new ProductCreated($product, source: 'web');

    expect($event->tags())->toContain('product', 'created', 'product:42');
});
```

## Pitfalls

- **Serializing full models** — Use `SerializesModels` to serialize IDs only
- **Not using Dispatchable trait** — Must use `Dispatchable` for events to work
- **Not implementing ShouldQueue for async** — Add `ShouldQueue` for async dispatch
- **Missing InteractsWithSockets** — Required for broadcasting
- **Firing event before persisting** — Always persist before dispatching event
- **Not using event tags** — Tags help with debugging and monitoring
- **Hardcoding event data** — Use constructor with typed properties
- **Not testing events** — Always test that events are dispatched with correct data
- **Broadcasting without authentication** — Implement `broadcastWith()` for broadcastable events
- **Missing source context** — Include source info for debugging (web, api, job)
- **Not using metadata** — Pass additional context via metadata array
- **Firing event in loop** — Avoid firing events in loops; batch them
