# Create Import

Build a data import with validation, error handling, and progress tracking using Laravel Excel or manual CSV import.

## Prerequisites

- [ ] Know the data to import (e.g., products, users, orders)
- [ ] Know the import format (CSV, Excel)
- [ ] Know the validation rules for each column
- [ ] Know if the import should be immediate or queued
- [ ] Know how to handle duplicate entries
- [ ] Know if the import needs to create or update existing records

## Step 1 — Install Laravel Excel

```bash
composer require maatwebsite/excel
```

## Step 2 — Import Class

```php
<?php

namespace App\Imports;

use App\Models\Product;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsOnError as SkipsOnErrorContract;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsOnFailure as SkipsOnFailureContract;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithCustomCsvSettings;
use Maatwebsite\Excel\Concerns\Importable;
use Throwable;

class ProductsImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailureContract
{
    use Importable, SkipsOnFailure;

    public function __construct(
        public int $userId,
    ) {}

    public function model(array $row): ?Product
    {
        // Check if product exists by slug
        $product = Product::where('slug', Str::slug($row['name']))->first();

        if ($product) {
            // Update existing product
            $product->update([
                'name' => $row['name'],
                'description' => $row['description'] ?? $product->description,
                'price_cents' => (int) str_replace(',', '', $row['price']),
                'stock' => (int) $row['stock'],
                'is_active' => filter_var($row['status'], FILTER_VALIDATE_BOOLEAN),
            ]);

            return null; // Already updated
        }

        // Create new product
        return new Product([
            'name' => $row['name'],
            'slug' => Str::slug($row['name']),
            'description' => $row['description'] ?? null,
            'price_cents' => (int) str_replace(',', '', $row['price']),
            'currency' => strtoupper($row['currency'] ?? 'USD'),
            'stock' => (int) $row['stock'],
            'user_id' => $this->userId,
            'is_active' => filter_var($row['status'] ?? 'true', FILTER_VALIDATE_BOOLEAN),
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'currency' => ['required', 'string', 'max:3'],
            'status' => ['nullable', 'boolean'],
        ];
    }

    public function customValidationMessages(): array
    {
        return [
            'name.required' => 'Product name is required in row :row.',
            'price.required' => 'Price is required in row :row.',
            'stock.required' => 'Stock is required in row :row.',
        ];
    }

    /**
     * Handle validation failures — the row number comes from the Failure object,
     * NOT from the Throwable (a Throwable has no getRow() method).
     *
     * @param  \Maatwebsite\Excel\Validators\Failure  ...$failures
     */
    public function onFailure(\Maatwebsite\Excel\Validators\Failure ...$failures): void
    {
        foreach ($failures as $failure) {
            \Log::warning('Product import validation failure', [
                'row' => $failure->row(),
                'attribute' => $failure->attribute(),
                'errors' => $failure->errors(),
                'values' => $failure->values(),
            ]);
        }
    }

    /**
     * Handle non-validation errors. A Throwable carries no row context, so only
     * the message/trace is available here.
     */
    public function onError(\Throwable $throwable): void
    {
        \Log::error('Product import error', [
            'error' => $throwable->getMessage(),
        ]);
    }
}
```

## Step 3 — Import with Validation and Error Reporting

```php
<?php

namespace App\Imports;

use App\Models\Product;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsOnError as SkipsOnErrorContract;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsOnFailure as SkipsOnFailureContract;
use Maatwebsite\Excel\Validators\Failure;
use Throwable;

class ProductsImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailureContract
{
    use Importable, SkipsOnFailure;

    public function __construct(
        public int $userId,
    ) {}

    public function model(array $row): ?Product
    {
        $product = Product::where('slug', Str::slug($row['name']))->first();

        if ($product) {
            $product->update([
                'name' => $row['name'],
                'price_cents' => (int) str_replace(',', '', $row['price']),
                'stock' => (int) $row['stock'],
            ]);
            return null;
        }

        return new Product([
            'name' => $row['name'],
            'slug' => Str::slug($row['name']),
            'price_cents' => (int) str_replace(',', '', $row['price']),
            'stock' => (int) $row['stock'],
            'user_id' => $this->userId,
            'is_active' => true,
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:1'],
            'stock' => ['required', 'integer', 'min:0'],
            'currency' => ['required', 'string', Rule::in(['USD', 'EUR', 'GBP'])],
        ];
    }

    public function onFailure(Failure ...$failures): void
    {
        foreach ($failures as $failure) {
            \Log::warning('Import validation failure', [
                'row' => $failure->row(),
                'attribute' => $failure->attribute(),
                'errors' => $failure->errors(),
                'values' => $failure->values(),
            ]);
        }
    }
}
```

## Step 4 — Controller with Import

```php
<?php

namespace App\Http\Controllers\Api;

use App\Imports\ProductsImport;
use App\Jobs\ProcessImportJob;
use App\Traits\ApiResponses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ImportController extends Controller
{
    use ApiResponses;

    public function importProducts(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,xlsx,xls', 'max:10240'], // 10MB max
        ]);

        $file = $request->file('file');
        $path = $file->store('imports');

        // Dispatch import job
        ProcessImportJob::dispatch(
            userId: auth()->id(),
            filePath: $path,
            importClass: ProductsImport::class,
        );

        return $this->success(message: 'Import started. You will be notified when complete.');
    }
}
```

## Step 5 — Import Job

```php
<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Maatwebsite\Excel\Facades\Excel;

class ProcessImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries = 1;

    public function __construct(
        public int $userId,
        public string $filePath,
        public string $importClass,
    ) {}

    public function handle(): void
    {
        $user = User::find($this->userId);

        if (! $user) {
            \Log::error('User not found for import', ['userId' => $this->userId]);
            return;
        }

        $import = new $this->importClass($this->userId);

        Excel::import($import, $this->filePath);

        // Delete the imported file after processing
        Storage::delete($this->filePath);

        // Notify user of import completion
        $user->notify(new ImportCompletedNotification($this->importClass));
    }
}
```

## Step 6 — Testing

```bash
# Feature test: import validates file

it('validates imported file', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/imports/products', [
        // No file provided
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['file']);
});

# Feature test: import accepts valid file

it('accepts valid CSV file', function () {
    $user = User::factory()->create();

    $file = tmpfile();
    fwrite($file, "name,price,stock,currency,status\nTest Product,1000,10,USD,true\n");
    $fileObject = new \Illuminate\Http\UploadedFile(
        stream_get_meta_data($file)['uri'],
        'test.csv',
        'text/csv',
    );

    $response = $this->actingAs($user)->postJson('/api/v1/imports/products', [
        'file' => $fileObject,
    ]);

    $response->assertOk()
        ->assertJsonPath('status', 'success');
});

# Feature test: import validates row data

it('skips rows with invalid data', function () {
    $user = User::factory()->create();

    $file = tmpfile();
    fwrite($file, "name,price,stock,currency\nInvalid Product,,,-1,USD\n");
    $fileObject = new \Illuminate\Http\UploadedFile(
        stream_get_meta_data($file)['uri'],
        'test.csv',
        'text/csv',
    );

    $response = $this->actingAs($user)->postJson('/api/v1/imports/products', [
        'file' => $fileObject,
    ]);

    $response->assertOk();
});

# Unit test: import creates model

it('creates product from valid row', function () {
    $import = new ProductsImport(auth()->id());

    $product = $import->model([
        'name' => 'Test Product',
        'price' => '1000',
        'stock' => '10',
        'currency' => 'USD',
        'status' => 'true',
    ]);

    expect($product)->not->toBeNull()
        ->and($product->name)->toBe('Test Product')
        ->and($product->price_cents)->toBe(1000);
});

# Unit test: import updates existing product

it('updates existing product by slug', function () {
    $product = Product::factory()->create([
        'name' => 'Original Name',
        'slug' => 'original-name',
    ]);

    $import = new ProductsImport(auth()->id());

    $result = $import->model([
        'name' => 'Original Name',
        'price' => '2000',
        'stock' => '20',
        'currency' => 'USD',
    ]);

    expect($result)->toBeNull();
    expect($product->refresh()->price_cents)->toBe(2000);
});
```

## Pitfalls

- **Not validating imported data** — Always use `WithValidation` to validate rows
- **Loading entire file into memory** — Use `WithChunkReading` for large files
- **Not handling duplicates** — Check for existing records before creating
- **Not using queued import** — Use jobs for large imports to avoid timeouts
- **Not cleaning up uploaded files** — Delete files after import completes
- **Not providing import progress** — Notify user when import starts/finishes
- **Missing error handling** — Implement `onError()` and `onFailure()` methods
- **Not validating file type** — Use `mimes:csv,xlsx,xls` in validation rules
- **Not setting file size limit** — Use `max:10240` (10MB) or appropriate limit
- **Not handling import failures** — Log failures and notify user
- **Not using heading row** — Use `WithHeadingRow` for CSV files with headers
- **Not testing import with sample data** — Always test import with valid and invalid data
- **Missing column mapping** — Ensure column names match expected headers
- **Not handling empty cells** — Use null coalescing for optional fields
