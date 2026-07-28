# Create Mailable

Build a Mailable class for sending emails with templates, attachments, and personalization.

## Prerequisites

- [ ] Know what email to send (e.g., welcome, password reset, order confirmation)
- [ ] Know what data the email needs (e.g., user, order, product)
- [ ] Know the email template format (HTML, plain text, or both)
- [ ] Know if the email needs attachments
- [ ] Know the sender name and reply-to address

## Step 1 — Generate Mailable

```bash
php artisan make:mail ProductCreatedMail
php artisan make:mail OrderConfirmedMail
php artisan make:mail WelcomeMail
```

## Step 2 — Basic Mailable

```php
<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Queue\SerializesModels;

class OrderConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public User $user,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            replyTo: [
                new Address('support@example.com', 'Support Team'),
            ],
            subject: "Order #{$this->order->id} Confirmed",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.order-confirmed',
            with: [
                'order' => $this->order,
                'user' => $this->user,
                'orderUrl' => url("/orders/{$this->order->id}"),
            ],
        );
    }

    public function attachments(): array
    {
        $attachments = [];

        if ($this->order->invoice_path) {
            $attachments[] = [
                'path' => storage_path('app/' . $this->order->invoice_path),
                'as' => "order-{$this->order->id}-invoice.pdf",
                'mime' => 'application/pdf',
            ];
        }

        return $attachments;
    }
}
```

## Step 3 — Mailable with Dynamic Data

```php
<?php

namespace App\Mail;

use App\Models\Product;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Queue\SerializesModels;

class ProductCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Product $product,
        public User $user,
        public string $source = 'web',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), config('mail.from.name')),
            subject: "New Product Added: {$this->product->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.product-created',
            with: [
                'product' => $this->product,
                'user' => $this->user,
                'source' => $this->source,
                'productUrl' => url("/products/{$this->product->slug}"),
            ],
        );
    }
}
```

## Step 4 — Email Template (Blade)

Create `resources/views/emails/order-confirmed.blade.php`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 2rem; }
        .header { text-align: center; margin-bottom: 2rem; }
        .details { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
        .button { display: inline-block; padding: 0.75rem 1.5rem; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
        .footer { text-align: center; margin-top: 2rem; color: #666; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your order, {{ $user->name }}.</p>
        </div>

        <div class="details">
            <h2>Order #{{ $order->id }}</h2>
            <p><strong>Total:</strong> ${{ number_format($order->total_cents / 100, 2) }}</p>
            <p><strong>Status:</strong> {{ ucfirst($order->status) }}</p>
            <p><strong>Items:</strong> {{ $order->items->count() }}</p>
        </div>

        <div style="text-align: center; margin: 2rem 0;">
            <a href="{{ $orderUrl }}" class="button">View Order Details</a>
        </div>

        <div class="footer">
            <p>You received this email because you placed an order.</p>
            <p>&copy; {{ date('Y') }} Your Company. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

## Step 5 — Sending the Email

```php
// Send from controller
use App\Mail\OrderConfirmedMail;
use Illuminate\Support\Facades\Mail;

class OrderController extends Controller
{
    public function confirm(Order $order): JsonResponse
    {
        $this->authorize('update', $order);

        $order->update(['status' => 'confirmed']);

        Mail::to($order->user)->queue(
            new OrderConfirmedMail($order, $order->user)
        );

        return new OrderResource($order->fresh());
    }
}
```

```php
// Send via event
use App\Events\OrderConfirmed;
use Illuminate\Support\Facades\Mail;

class OrderConfirmedListener
{
    public function handle(OrderConfirmed $event): void
    {
        Mail::to($event->order->user)->queue(
            new OrderConfirmedMail($event->order, $event->order->user)
        );
    }
}
```

## Step 6 — Testing

```bash
# Feature test: email is sent

it('sends order confirmed email', function () {
    Mail::fake();

    $user = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $user->id]);

    Mail::assertSent(OrderConfirmedMail::class, function ($mail) use ($order, $user) {
        return $mail->hasTo($user->email)
            && $mail->order->id === $order->id;
    });
});

# Feature test: email has correct subject

it('has the correct subject line', function () {
    Mail::fake();

    $user = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $user->id, 'id' => 42]);

    Mail::assertSent(OrderConfirmedMail::class, function ($mail) {
        return $mail->hasSubject("Order #42 Confirmed");
    });
});

# Feature test: email includes attachment

it('includes invoice as attachment', function () {
    Mail::fake();

    $user = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $user->id, 'invoice_path' => 'invoices/42.pdf']);

    Mail::assertSent(OrderConfirmedMail::class, function ($mail) {
        return count($mail->attachments) > 0;
    });
});

# Feature test: email is queued

it('queues the email', function () {
    Mail::fake();

    $user = User::factory()->create();
    $order = Order::factory()->create(['user_id' => $user->id]);

    Mail::to($user)->queue(new OrderConfirmedMail($order, $user));

    Mail::assertQueued(OrderConfirmedMail::class);
});
```

## Pitfalls

- **Not using Queueable trait** — Always add `Queueable` for email sending
- **Not using SerializesModels** — Use `SerializesModels` to avoid serializing full models
- **Hardcoding email addresses** — Use config values for sender info
- **Missing reply-to address** — Always include reply-to for customer support
- **Not testing emails** — Always test that emails are sent with correct data
- **Sending synchronously** — Use `Mail::queue()` for non-critical emails
- **Missing error handling** — Handle mail failures gracefully
- **Not personalizing emails** — Include user-specific data in the template
- **Not testing with real email** — Use Mail::fake() in tests
- **Forgetting attachments** — Test attachment inclusion in tests
- **Not using Blade templates** — Use Blade for email templates, not raw HTML strings
- **Not handling email formatting** — Ensure templates are mobile-friendly
