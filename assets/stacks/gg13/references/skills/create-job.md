# Create Job

Build a queueable job class for offloading heavy or async operations.

## Prerequisites

- [ ] Know what operation needs to be queued (e.g., sending email, generating report, processing upload)
- [ ] Know the data the job needs to process
- [ ] Know if the job should be retried on failure
- [ ] Know the queue name (e.g., `default`, `high`, `emails`)
- [ ] Know if the job needs to be dispatched immediately or delayed

## Step 1 — Generate Job

```bash
php artisan make:job ProcessProductUpload
php artisan make:job SendWelcomeEmail
php artisan make:job GenerateMonthlyReport
```

## Step 2 — Basic Job Implementation

```php
<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessProductUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $maxExceptions = 3;
    public int $tries = 3;
    public ?int $backoff = 60;

    public function __construct(
        public string $filePath,
        public int $userId,
    ) {}

    public function handle(): void
    {
        $user = User::find($this->userId);

        if (! $user) {
            Log::error('User not found for product upload', [
                'userId' => $this->userId,
                'filePath' => $this->filePath,
            ]);
            return;
        }

        $this->validateFile();
        $this->processRows();
        $this->notifyUser($user);
    }

    private function validateFile(): void
    {
        if (! file_exists($this->filePath)) {
            throw new \RuntimeException("Upload file not found: {$this->filePath}");
        }

        $extension = pathinfo($this->filePath, PATHINFO_EXTENSION);
        if (! in_array(strtolower($extension), ['csv', 'xlsx', 'xls'])) {
            throw new \RuntimeException("Invalid file type: {$extension}");
        }
    }

    private function processRows(): void
    {
        $rows = $this->parseFile();
        $created = 0;
        $failed = 0;

        foreach ($rows as $index => $row) {
            try {
                $product = Product::create([
                    'name' => $row['name'],
                    'price_cents' => (int) $row['price'],
                    'stock' => (int) $row['stock'],
                    'user_id' => $this->userId,
                ]);
                $created++;
            } catch (\Exception $e) {
                $failed++;
                Log::error("Failed to create product row {$index}", [
                    'error' => $e->getMessage(),
                    'row' => $row,
                ]);
            }
        }

        Log::info('Product upload completed', [
            'created' => $created,
            'failed' => $failed,
            'total' => count($rows),
        ]);
    }

    private function parseFile(): array
    {
        // Implementation depends on file type
        // Use Laravel Excel for xlsx, or manual CSV parsing
        return [];
    }

    private function notifyUser(User $user): void
    {
        // Could dispatch another job or send notification
        $user->notify(new ProductUploadComplete($this->filePath));
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Product upload job failed', [
            'userId' => $this->userId,
            'filePath' => $this->filePath,
            'error' => $exception->getMessage(),
        ]);

        // Optionally notify the user about the failure
    }
}
```

## Step 3 — Job with Retry Logic

```php
<?php

namespace App\Jobs;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncProductInventory implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;
    public int $maxExceptions = 3;
    public int $tries = 3;
    /** @var list<int> Per-retry backoff in seconds (30s, then 60s, then 120s). */
    public array $backoff = [30, 60, 120];

    public function __construct(
        public int $productId,
    ) {}

    public function handle(): void
    {
        $product = Product::findOrFail($this->productId);

        // Call external inventory API
        $inventoryData = $this->fetchFromExternalApi($product->sku);

        $product->update([
            'stock' => $inventoryData['available'],
            'last_synced_at' => now(),
        ]);
    }

    private function fetchFromExternalApi(string $sku): array
    {
        $response = Http::timeout(30)->get("https://api.inventory.example.com/products/{$sku}");

        if (! $response->successful()) {
            throw new \RuntimeException("External API returned status {$response->status()}");
        }

        return $response->json();
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Inventory sync failed after retries', [
            'productId' => $this->productId,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

## Step 4 — Job with Chain

```php
// Dispatch a chain of jobs
ProcessProductUpload::dispatch($filePath, $userId)
    ->chain([
        GenerateProductReport::dispatch($userId),
        NotifyAdmin::dispatch($userId),
    ]);
```

## Step 5 — Dispatching Jobs

```php
// Dispatch immediately
ProcessProductUpload::dispatch($filePath, $userId);

// Dispatch to specific queue
ProcessProductUpload::dispatch($filePath, $userId)->onQueue('high');

// Dispatch with delay
ProcessProductUpload::dispatch($filePath, $userId)->delay(60); // 1 minute delay

// Dispatch with chain
ProcessProductUpload::dispatch($filePath, $userId)
    ->chain([
        GenerateProductReport::dispatch(),
        NotifyAdmin::dispatch($userId),
    ]);

// Dispatch in controller
class ProductController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $file = $request->file('file');
        $path = $file->store('uploads');

        ProcessProductUpload::dispatch($path, auth()->id())->onQueue('high');

        return $this->success(message: 'Upload started. You will be notified when complete.');
    }
}
```

## Step 6 — Testing

```bash
# Feature test: job dispatches
it('dispatches a process upload job', function () {
    $user = User::factory()->create();

    ProcessProductUpload::dispatch('/path/to/file.csv', $user->id);

    expect(Job::push(ProcessProductUpload::class))->toBeTrue();
});

# Unit test: job validates file
it('throws exception for missing file', function () {
    $job = new ProcessProductUpload('/nonexistent/file.csv', 1);

    $this->expectException(\RuntimeException::class);
    $job->handle();
});

# Unit test: job validates file type
it('throws exception for invalid file type', function () {
    $job = new ProcessProductUpload('/path/to/file.pdf', 1);

    $this->expectException(\RuntimeException::class);
    $job->handle();
});

# Feature test: job processes rows
it('creates products from CSV rows', function () {
    $user = User::factory()->create();

    ProcessProductUpload::dispatch('/path/to/file.csv', $user->id);

    ProcessProductUpload::flush();

    expect(Product::count())->toBeGreaterThan(0);
});

# Feature test: job handles failures gracefully
it('logs errors for failed rows', function () {
    $user = User::factory()->create();

    ProcessProductUpload::dispatch('/path/to/file.csv', $user->id);

    ProcessProductUpload::flush();

    expect(Log::hasErrorMessages())->toBeTrue();
});
```

## Pitfalls

- **Not implementing `ShouldQueue`** — Without this, the job runs synchronously
- **Not serializing models** — Use `SerializesModels` trait to avoid serializing full models
- **Not handling failures** — Always implement `failed()` method for logging/alerts
- **Missing timeout** — Set appropriate timeout for long-running jobs
- **Not using backoff** — Use exponential backoff for retry logic
- **Dispatching in a loop** — Use `dispatchSync()` for small batches, not loops (`dispatchNow()` is the old name)
- **Not checking for dependencies** — Verify user/file exist before processing
- **Not logging errors** — Always log failures for debugging
- **Hardcoding queue name** — Use `dispatch(...)->onQueue('high')` for specific queues
- **Not testing jobs** — Test job behavior independently of HTTP layer
- **Using `sleep()` in handle** — Don't block the queue; use proper delays
- **Not using chain for dependent jobs** — Use `->chain()` for sequential jobs
- **Missing unique constraint on dispatch** — Use `ShouldBeUnique` to prevent duplicates
- **Not handling network failures** — Use HTTP client with timeout and retry
