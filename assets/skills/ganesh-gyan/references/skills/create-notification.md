# Create Notification

Build a Notification class for sending in-app, email, and SMS notifications.

## Prerequisites

- [ ] Know the notification type (e.g., `OrderShipped`, `PaymentReceived`, `SystemAlert`)
- [ ] Know the notification channels (database, mail, sms, slack)
- [ ] Know the data the notification needs
- [ ] Know if the notification should be immediate or delayed

## Step 1 — Generate Notification

```bash
php artisan make:notification OrderShippedNotification
php artisan make:notification PaymentReceivedNotification
php artisan make:notification SystemAlertNotification
```

## Step 2 — Database Notification (Primary)

```php
<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class OrderShippedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Order $order,
        public string $trackingNumber,
        public ?string $carrier = null,
    ) {}

    public function via(User $user): array
    {
        return ['database', 'mail'];
    }

    public function toDatabase(User $user): array
    {
        return [
            'type' => 'order_shipped',
            'order_id' => $this->order->id,
            'tracking_number' => $this->trackingNumber,
            'carrier' => $this->carrier,
            'order_url' => URL::to("/orders/{$this->order->id}"),
            'created_at' => now()->toIso8601String(),
        ];
    }

    public function toMail(User $user): MailMessage
    {
        return (new MailMessage)
            ->subject("Order #{$this->order->id} Shipped")
            ->greeting("Hello, {$user->name}!")
            ->line("Your order #{$this->order->id} has been shipped.")
            ->line("Tracking Number: {$this->trackingNumber}")
            ->line("Carrier: {$this->carrier ?? 'Standard Shipping'}")
            ->action('View Order', URL::to("/orders/{$this->order->id}"))
            ->line('Thank you for your purchase!');
    }

    public function toArray(User $user): array
    {
        return [
            'type' => 'order_shipped',
            'order_id' => $this->order->id,
            'tracking_number' => $this->trackingNumber,
            'carrier' => $this->carrier,
        ];
    }
}
```

## Step 3 — Notification with Channels

```php
<?php

namespace App\Notifications;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class PaymentReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Payment $payment,
    ) {}

    public function via(User $user): array
    {
        return ['database', 'mail', 'broadcast'];
    }

    public function toDatabase(User $user): array
    {
        return [
            'type' => 'payment_received',
            'payment_id' => $this->payment->id,
            'amount' => $this->payment->amount,
            'currency' => $this->payment->currency,
            'payment_method' => $this->payment->method,
            'created_at' => now()->toIso8601String(),
        ];
    }

    public function toMail(User $user): MailMessage
    {
        return (new MailMessage)
            ->subject("Payment of \${$this->payment->amount} Received")
            ->greeting("Hello, {$user->name}!")
            ->line("We've received your payment of \${$this->payment->amount}.")
            ->line("Payment Method: {$this->payment->method}")
            ->line("Transaction ID: {$this->payment->transaction_id}")
            ->action('View Payment', URL::to("/payments/{$this->payment->id}"))
            ->line('Thank you!');
    }

    public function toArray(User $user): array
    {
        return [
            'type' => 'payment_received',
            'payment_id' => $this->payment->id,
            'amount' => $this->payment->amount,
            'currency' => $this->payment->currency,
        ];
    }
}
```

## Step 4 — Sending Notifications

```php
// Send to a specific user
use App\Notifications\OrderShippedNotification;

class OrderController extends Controller
{
    public function ship(Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        $order->update([
            'status' => 'shipped',
            'tracking_number' => $request->tracking_number,
        ]);

        $order->user->notify(
            new OrderShippedNotification(
                $order,
                $request->tracking_number,
                $request->carrier,
            )
        );

        return new OrderResource($order->fresh());
    }
}
```

```php
// Send to multiple users immediately (bypasses the queue)
use App\Notifications\SystemAlertNotification;
use Illuminate\Support\Facades\Notification;

Notification::sendNow(
    User::where('role', 'admin')->get(),
    new SystemAlertNotification('System maintenance scheduled.')
);
```

```php
// Send via event
use App\Events\OrderShipped;

class OrderShippedListener
{
    public function handle(OrderShipped $event): void
    {
        $event->order->user->notify(
            new OrderShippedNotification(
                $event->order,
                $event->trackingNumber,
                $event->carrier,
            )
        );
    }
}
```

## Step 5 — Reading Notifications

```php
// In Vue/JS
async function fetchNotifications() {
  const response = await api.get('/notifications')
  return response.data
}

async function markAsRead(notificationId: number) {
  await api.post(`/notifications/${notificationId}/read`)
}

async function markAllAsRead() {
  await api.post('/notifications/read-all')
}
```

```php
// In Laravel controller
public function index(Request $request): JsonResponse
{
    $notifications = $request->user()->notifications()
        ->orderByDesc('created_at')
        ->paginate(20);

    return response()->json($notifications);
}

public function markAsRead(Request $request, int $id): JsonResponse
{
    $notification = $request->user()->notifications()->findOrFail($id);
    $notification->markAsRead();

    return $this->success(message: 'Notification marked as read');
}

public function markAllAsRead(Request $request): JsonResponse
{
    $request->user()->unreadNotifications->markAsRead();

    return $this->success(message: 'All notifications marked as read');
}
```

## Step 6 — Testing

```bash
# Feature test: notification is sent

it('sends order shipped notification', function () {
    Notification::fake();

    $user = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $user->id]);

    $user->notify(new OrderShippedNotification($order, 'TRK123', 'USPS'));

    Notification::assertSentTo(
        $user,
        OrderShippedNotification::class,
        function ($notification) use ($order) {
            return $notification->order->id === $order->id
                && $notification->trackingNumber === 'TRK123';
        }
    );
});

# Feature test: notification uses correct channels

it('sends notification via database and mail', function () {
    $notification = new OrderShippedNotification(
        Order::factory()->make(),
        'TRK123',
    );

    expect($notification->via(User::factory()->make()))
        ->toContain('database', 'mail');
});

# Feature test: notification data is correct

it('stores correct data in database notification', function () {
    $order = Order::factory()->make(['id' => 42]);

    $notification = new OrderShippedNotification($order, 'TRK123', 'USPS');
    $data = $notification->toDatabase(User::factory()->make());

    expect($data['order_id'])->toBe(42)
        ->and($data['tracking_number'])->toBe('TRK123')
        ->and($data['type'])->toBe('order_shipped');
});

# Feature test: mail notification has correct content

it('includes tracking number in mail notification', function () {
    Notification::fake();

    $user = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $user->id]);

    $user->notify(new OrderShippedNotification($order, 'TRK123', 'USPS'));

    Notification::assertSentTo(
        $user,
        OrderShippedNotification::class,
        function ($notification) {
            $message = $notification->toMail($user);
            return str_contains($message->render(), 'TRK123');
        }
    );
});
```

## Pitfalls

- **Not implementing `via()` method** — Must specify notification channels
- **Not returning array from `via()`** — Return array of channel names
- **Missing `toDatabase()` for database notifications** — Required for in-app notifications
- **Not serializing models** — Use IDs in database notifications, not full models
- **Hardcoding notification content** — Use dynamic data from constructor
- **Not testing notifications** — Always test that notifications are sent with correct data
- **Not specifying channels** — Include database channel for in-app notifications
- **Missing `toArray()` method** — Required for broadcast notifications
- **Not using Queueable trait** — Add for async notification sending
- **Not providing action URLs** — Include URLs in mail notifications for user convenience
- **Not handling user not found** — Check user exists before sending notification
- **Not testing with fake notifications** — Use `Notification::fake()` in tests
