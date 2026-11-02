# Logging Conventions

> Builds on `references/principles/logging.md` — read it first. This file covers how to apply it on Laravel 13 + Vue 3.5.

## Laravel Log Channels

### Configuration

```php
// config/logging.php
return [
    'channels' => [
        'stack' => [
            'driver' => 'stack',
            'channels' => ['daily', 'api'],
            'ignore_exceptions' => false,
        ],
        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/app.log'),
            'level' => 'info',
            'days' => 14,
            'permission' => 0664,
        ],
        'api' => [
            'driver' => 'daily',
            'path' => storage_path('logs/api.log'),
            'level' => 'info',
            'days' => 30,
        ],
        'error' => [
            'driver' => 'daily',
            'path' => storage_path('logs/error.log'),
            'level' => 'error',
            'days' => 30,
        ],
        'queue' => [
            'driver' => 'daily',
            'path' => storage_path('logs/queue.log'),
            'level' => 'warning',
            'days' => 14,
        ],
    ],
];
```

## Structured Logging

Use structured (JSON) logging for API and service logs:

```php
use Illuminate\Support\Facades\Log;

// Good — structured context
Log::info('User logged in', [
    'user_id' => $user->id,
    'ip_address' => $request->ip(),
    'user_agent' => $request->userAgent(),
    'method' => 'POST',
    'path' => '/api/v1/auth/login',
]);

// Good — with context for error tracking
Log::error('Payment processing failed', [
    'order_id' => $order->id,
    'user_id' => $order->user_id,
    'amount' => $order->total_cents,
    'currency' => $order->currency,
    'gateway' => 'stripe',
    'error_code' => $e->getCode(),
    'exception' => $e->getMessage(),
]);

// Bad — unstructured string logging
Log::info("User {$user->id} logged in from {$request->ip()}");
```

## Log Levels

Laravel exposes all eight levels from the principles table as
`Log::debug()`, `Log::info()`, `Log::notice()`, `Log::warning()`,
`Log::error()`, `Log::critical()`, `Log::alert()` and `Log::emergency()`.
Target a specific channel with `Log::channel('api')->info(...)`.

## Sensitive Data Masking

Use `$hidden` on models and mask values in log context:

```php
// Models — hide sensitive attributes
class User extends Authenticatable
{
    protected $hidden = [
        'password',
        'remember_token',
        'email_verified_at',
    ];
}

// Logging — mask sensitive values
Log::info('User created', [
    'user_id' => $user->id,
    'name' => $user->name,
    'email' => '***' . str_replace('@', ' at ', substr($user->email, -10)),
    'password_set' => true, // Boolean flag, not the actual password
]);
```

### Custom Log Processor

```php
// app/Providers/LoggingServiceProvider.php
class LoggingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        Log::macro('maskSensitive', function (string $message, array $context): void {
            $sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'credit_card'];

            foreach ($context as $key => $value) {
                if (in_array(strtolower($key), $sensitiveKeys, true)) {
                    $context[$key] = '***MASKED***';
                }
            }

            Log::channel('daily')->info($message, $context);
        });
    }
}
```

## API Request Logging

```php
// app/Http/Middleware/ApiLoggingMiddleware.php
class ApiLoggingMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        Log::channel('api')->info('API request', [
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $response->status(),
            'duration_ms' => $this->getDuration($request),
            'user_id' => auth()->id(),
            'request_id' => $request->header('X-Request-Id'),
        ]);

        return $response;
    }

    private function getDuration(Request $request): float
    {
        return round((microtime(true) - LARAVEL_START) * 1000, 2);
    }
}
```

### Log Slow Requests

```php
class PerformanceMonitoringMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        $response = $next($request);

        $duration = (microtime(true) - $startTime) * 1000;

        if ($duration > 1000) {
            Log::warning('Slow API request', [
                'method' => $request->method(),
                'path' => $request->fullUrl(),
                'duration_ms' => round($duration, 2),
                'user_id' => auth()->id(),
            ]);
        }

        return $response;
    }
}
```

## Error Tracking Integration

### Laravel Telescope (Development)

Enable Telescope for development and staging:

```php
// app/Providers/TelescopeServiceProvider.php
public function boot(): void
{
    if ($this->app->environment('local', 'staging')) {
        Telescope::start();
    }
}
```

### Error Reporting (Production)

The minimum log level is set on the logging channel via the `LOG_LEVEL` env
var (consumed by `config/logging.php`), **not** in `config/app.php`:

```env
# .env — messages below this level are ignored by the stack channel
LOG_LEVEL=error   # use 'debug' locally, 'error' in production
```

```php
// config/logging.php — the stack/single/daily channels read LOG_LEVEL
'level' => env('LOG_LEVEL', 'debug'),
```

Laravel 11+ removed the `App\Exceptions\Handler` class. Register exception
reporting/rendering callbacks in `bootstrap/app.php` via `withExceptions()`.
Type-hint `Throwable` (not `Exception`), since PHP errors also implement it:

```php
// bootstrap/app.php
use Illuminate\Foundation\Configuration\Exceptions;
use Sentry\Laravel\Integration;
use Throwable;

->withExceptions(function (Exceptions $exceptions): void {
    $exceptions->report(function (Throwable $e): void {
        if (app()->environment('production')) {
            Integration::identifyUser([
                'id' => auth()->id(),
                'email' => auth()->user()?->email,
            ]);

            Integration::captureUnhandledException($e);
        }
    });
})
```

> Tip: the Sentry Laravel SDK wires this reporting up automatically via
> `Integration::handles()` when installed, so the manual `report()` callback is
> only needed for custom behavior.

## Log Rotation

```php
// config/logging.php
'daily' => [
    'driver' => 'daily',
    'days' => 14, // Rotate after 14 days
],
```

## Practical Example

```php
class OrderService
{
    public function create(CreateOrderDto $dto): Order
    {
        try {
            Log::info('Creating order', [
                'user_id' => $dto->user_id,
                'items_count' => count($dto->items),
                'total_cents' => $dto->total_cents,
            ]);

            $order = Order::create($dto->toArray());

            Log::info('Order created successfully', [
                'order_id' => $order->id,
                'user_id' => $order->user_id,
            ]);

            return $order;
        } catch (\Exception $e) {
            Log::error('Failed to create order', [
                'user_id' => $dto->user_id,
                'error' => $e->getMessage(),
                'exception_class' => get_class($e),
            ]);

            throw new OrderCreationException('Failed to create order', 0, $e);
        }
    }
}
```
