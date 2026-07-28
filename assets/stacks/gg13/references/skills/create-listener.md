# Create Listener

Build a listener class that handles events in the application.

## Prerequisites

- [ ] Event class exists (e.g., `ProductCreated`)
- [ ] Know what side effects the listener should perform (e.g., send email, update cache, log)
- [ ] Know if the listener should run synchronously or asynchronously
- [ ] Know if the listener needs to handle multiple events

## Step 1 — Generate Listener

```bash
php artisan make:listener SendProductCreatedEmail
php artisan make:listener UpdateProductSearchIndex
php artisan make:listener LogProductActivity
```

## Step 2 — Listener Implementation

```php
<?php

namespace App\Listeners;

use App\Events\ProductCreated;
use App\Models\SearchIndex;
use App\Notifications\ProductCreatedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class SendProductCreatedEmail implements ShouldQueue
{
    public int $timeout = 60;
    public int $maxExceptions = 2;
    public int $tries = 2;
    public ?int $backoff = 30;

    public function handle(ProductCreated $event): void
    {
        $product = $event->product;
        $user = $product->user;

        Log::info('Product created, sending notification', [
            'productId' => $product->id,
            'userId' => $user->id,
            'source' => $event->source,
        ]);

        Notification::send($user, new ProductCreatedNotification($product));
    }

    public function failed(ProductCreated $event, \Throwable $exception): void
    {
        Log::error('Failed to send product created email', [
            'productId' => $event->product->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

## Step 3 — Listener for Search Index Update

```php
<?php

namespace App\Listeners;

use App\Events\ProductCreated;
use App\Events\ProductUpdated;
use App\Events\ProductDeleted;
use App\Models\SearchIndex;
use Illuminate\Support\Facades\Log;

class UpdateProductSearchIndex
{
    public function handle(ProductCreated|ProductUpdated $event): void
    {
        $product = $event->product;

        SearchIndex::updateOrCreate(
            ['model_type' => get_class($product), 'model_id' => $product->id],
            [
                'title' => $product->name,
                'description' => $product->description,
                'price' => $product->price_cents,
                'stock' => $product->stock,
                'is_active' => $product->is_active,
                'updated_at' => now(),
            ]
        );

        Log::info('Search index updated for product', [
            'productId' => $product->id,
        ]);
    }

    public function handleProductDeleted(ProductDeleted $event): void
    {
        SearchIndex::where('model_type', get_class($event->product))
            ->where('model_id', $event->product->id)
            ->delete();

        Log::info('Search index entry deleted for product', [
            'productId' => $event->product->id,
        ]);
    }
}
```

## Step 4 — Register Listener

Laravel 13 **auto-discovers** listeners by default: any `handle()` (or `__invoke()`) method
type-hinting an event is wired up automatically by scanning `app/Listeners`. There is no
`EventServiceProvider`/`$listen` array in the slim skeleton — for the listeners above,
type-hinting the event in `handle()` is all you need.

> Note: a single method can only be auto-discovered for one event. `UpdateProductSearchIndex`
> handles `ProductCreated|ProductUpdated` via the union type-hint on `handle()`; its
> `handleProductDeleted()` method is **not** auto-discovered and must be registered manually
> (below), or split into its own listener.

If you need explicit or non-conventional mappings, register them in `AppServiceProvider::boot()`
with the `Event` facade:

```php
// app/Providers/AppServiceProvider.php
namespace App\Providers;

use App\Events\ProductDeleted;
use App\Listeners\UpdateProductSearchIndex;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Event::listen(
            ProductDeleted::class,
            [UpdateProductSearchIndex::class, 'handleProductDeleted'],
        );
    }
}
```

You can disable auto-discovery or add discovery paths via `->withEvents()` in
`bootstrap/app.php` if required.

## Step 5 — Using PHP 8 Constructor Promotion

```php
<?php

namespace App\Listeners;

use App\Events\OrderShipped;
use App\Services\NotificationService;
use App\Services\AnalyticsService;

class HandleOrderShipped
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly AnalyticsService $analyticsService,
    ) {}

    public function handle(OrderShipped $event): void
    {
        $this->notificationService->sendShippedNotification(
            $event->user,
            $event->order,
            $event->trackingNumber,
        );

        $this->analyticsService->trackOrderShipped($event->order);
    }
}
```

## Step 6 — Testing

```bash
# Feature test: listener sends notification

it('sends notification when product is created', function () {
    Notification::fake();

    $product = Product::factory()->create();
    $user = $product->user;

    event(new ProductCreated($product));

    Notification::assertSentTo(
        $user,
        ProductCreatedNotification::class
    );
});

# Feature test: listener updates search index

it('updates search index when product is created', function () {
    $product = Product::factory()->create(['name' => 'Test Product']);

    event(new ProductCreated($product));

    expect(SearchIndex::where('model_id', $product->id)->exists())->toBeTrue()
        ->and(SearchIndex::where('model_id', $product->id)->first()->title)->toBe('Test Product');
});

# Feature test: listener removes from search index on delete

it('removes search index entry when product is deleted', function () {
    $product = Product::factory()->create();
    SearchIndex::create([
        'model_type' => get_class($product),
        'model_id' => $product->id,
        'title' => $product->name,
    ]);

    event(new ProductDeleted($product));

    expect(SearchIndex::where('model_id', $product->id)->exists())->toBeFalse();
});

# Feature test: listener is queued

it('dispatches listener to queue', function () {
    $listener = new SendProductCreatedEmail();

    expect($listener)->toBeInstanceOf(ShouldQueue::class);
});
```

## Pitfalls

- **Not implementing ShouldQueue for heavy listeners** — Heavy listeners should be queued
- **Relying on the removed `$listen` array** — Laravel 13 auto-discovers listeners from `handle()` type-hints; only extra methods (e.g. `handleProductDeleted`) need `Event::listen()` in `AppServiceProvider::boot()`
- **Wrong `failed()` signature** — It receives the event first: `failed($event, \Throwable $exception)` — the exception alone leaves `$event` undefined
- **Not handling listener failures** — Implement `failed()` method for logging
- **Tying listeners to specific events** — Use `handle(ProductCreated|ProductUpdated $event)` for polymorphic
- **Not testing listeners** — Always test that listeners perform expected side effects
- **Running heavy work in synchronous listener** — Use ShouldQueue for non-critical tasks
- **Not using constructor injection** — Use DI for dependencies instead of facades
- **Missing timeout on queued listeners** — Set appropriate timeout for queued listeners
- **Not handling exceptions** — Catch and log exceptions in listener
- **Not using event polymorphism** — Support multiple event types with union types
- **Duplicate listeners** — Avoid registering same listener multiple times
- **Not testing failure scenarios** — Test what happens when listener fails
