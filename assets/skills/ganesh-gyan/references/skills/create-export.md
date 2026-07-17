# Create Export

Build a CSV/Excel export using Laravel Excel or manual export with proper formatting and streaming.

## Prerequisites

- [ ] Know the data to export (e.g., products, orders, users)
- [ ] Know the export format (CSV, Excel .xlsx)
- [ ] Know the columns to include
- [ ] Know if the export should be immediate or queued
- [ ] Know if the export needs filters

## Step 1 — Install Laravel Excel (for Excel exports)

```bash
composer require maatwebsite/excel
```

## Step 2 — Basic CSV Export (Manual)

```php
<?php

namespace App\Exports;

use App\Models\Product;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\Storage;

class ProductsExport
{
    public function export(string $format = 'csv'): string
    {
        $products = Product::with(['category', 'user'])
            ->orderBy('name')
            ->get();

        if ($format === 'csv') {
            return $this->exportCsv($products);
        }

        return $this->exportExcel($products);
    }

    private function exportCsv($products): string
    {
        $filename = "products-export-" . now()->format('Y-m-d-H-i-s') . ".csv";
        $filepath = "exports/{$filename}";

        $rows = $products->map(fn ($product) => [
            $product->id,
            $product->name,
            $product->slug,
            $product->description,
            $product->price_formatted,
            $product->currency,
            $product->stock,
            $product->is_active ? 'Active' : 'Inactive',
            $product->category?->name ?? 'N/A',
            $product->user?->name ?? 'N/A',
            $product->created_at?->toDateTimeString(),
        ]);

        $header = [
            'ID', 'Name', 'Slug', 'Description', 'Price',
            'Currency', 'Stock', 'Status', 'Category', 'Owner', 'Created At',
        ];

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, $header);

        foreach ($rows as $row) {
            fputcsv($csv, $row);
        }

        rewind($csv);
        $content = stream_get_contents($csv);
        fclose($csv);

        Storage::put($filepath, $content);

        return $filepath;
    }

    private function exportExcel($products): string
    {
        // Use Laravel Excel for Excel format
        $filename = "products-export-" . now()->format('Y-m-d-H-i-s') . ".xlsx";
        $filepath = "exports/{$filename}";

        $data = $products->map(fn ($product) => [
            'ID' => $product->id,
            'Name' => $product->name,
            'Slug' => $product->slug,
            'Description' => $product->description,
            'Price' => $product->price_formatted,
            'Currency' => $product->currency,
            'Stock' => $product->stock,
            'Status' => $product->is_active ? 'Active' : 'Inactive',
            'Category' => $product->category?->name ?? 'N/A',
            'Owner' => $product->user?->name ?? 'N/A',
            'Created At' => $product->created_at?->toDateTimeString(),
        ])->toArray();

        // Using Maatwebsite Excel — wrap the rows in an Export object and store it.
        // (See Step 3 for the recommended dedicated Export-class approach.)
        $export = new class ($data) implements \Maatwebsite\Excel\Concerns\FromArray, \Maatwebsite\Excel\Concerns\WithHeadings {
            public function __construct(private array $rows) {}

            public function array(): array
            {
                return $this->rows;
            }

            public function headings(): array
            {
                return array_keys($this->rows[0] ?? []);
            }
        };

        Excel::store($export, $filepath);

        return $filepath;
    }
}
```

> The `\Maatwebsite\Excel\Writer` "callback" API shown in older snippets does not exist.
> `Storage::put()` returns a `bool`, so passing its result (or a writer object) back into
> storage is invalid. Use `Excel::store(...)` / `Excel::download(...)` with an Export class,
> as below.

## Step 3 — Laravel Excel Export (Recommended)

```php
<?php

namespace App\Exports;

use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductsExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithColumnWidths
{
    public function __construct(
        public ?string $search = null,
        public ?int $categoryId = null,
        public ?bool $isActive = null,
    ) {}

    public function query()
    {
        $query = Product::query()
            ->with(['category', 'user'])
            ->orderBy('name');

        if ($this->search) {
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$this->search}%")
                ->orWhere('description', 'like', "%{$this->search}%"));
        }

        if ($this->categoryId) {
            $query->where('category_id', $this->categoryId);
        }

        if ($this->isActive !== null) {
            $query->where('is_active', $this->isActive);
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'ID',
            'Name',
            'Slug',
            'Description',
            'Price',
            'Currency',
            'Stock',
            'Status',
            'Category',
            'Owner',
            'Created At',
            'Updated At',
        ];
    }

    public function map($product): array
    {
        return [
            $product->id,
            $product->name,
            $product->slug,
            $product->description,
            $product->price_formatted,
            $product->currency,
            $product->stock,
            $product->is_active ? 'Active' : 'Inactive',
            $product->category?->name ?? 'N/A',
            $product->user?->name ?? 'N/A',
            $product->created_at?->format('Y-m-d H:i:s'),
            $product->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            // Style the first row as bold
            'A1' => ['font' => ['bold' => true]],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 8,   // ID
            'B' => 30,  // Name
            'C' => 30,  // Slug
            'D' => 50,  // Description
            'E' => 12,  // Price
            'F' => 8,   // Currency
            'G' => 8,   // Stock
            'H' => 10,  // Status
            'I' => 20,  // Category
            'J' => 20,  // Owner
            'K' => 20,  // Created At
            'L' => 20,  // Updated At
        ];
    }
}
```

## Step 4 — Controller with Export

```php
<?php

namespace App\Http\Controllers\Api;

use App\Exports\ProductsExport;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ExportController extends Controller
{
    use ApiResponses;

    public function exportProducts(Request $request)
    {
        $request->validate([
            'format' => ['sometimes', 'string', Rule::in(['csv', 'xlsx'])],
            'search' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Use input() (a real string) rather than string() (a Stringable) so the
        // `$format === 'csv'` comparison below behaves as expected.
        $format = $request->input('format', 'csv');

        $export = new ProductsExport(
            search: $request->input('search'),
            categoryId: $request->integer('category_id'),
            isActive: $request->boolean('is_active'),
        );

        $filename = "products-export-" . now()->format('Y-m-d-H-i-s') . ".{$format}";

        // Excel::download() streams the file straight to the browser — no need to
        // Storage::put() (which returns a bool) and then Storage::get() that bool.
        $writerType = $format === 'csv'
            ? \Maatwebsite\Excel\Excel::CSV
            : \Maatwebsite\Excel\Excel::XLSX;

        return Excel::download($export, $filename, $writerType);
    }
}
```

## Step 5 — Queued Export (for large datasets)

```php
<?php

namespace App\Jobs;

use App\Exports\ProductsExport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ExportProductsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public string $format = 'csv',
        public array $filters = [],
    ) {}

    public function handle(): void
    {
        $export = new ProductsExport(
            search: $this->filters['search'] ?? null,
            categoryId: $this->filters['category_id'] ?? null,
            isActive: $this->filters['is_active'] ?? null,
        );

        $filename = "products-export-" . now()->format('Y-m-d-H-i-s') . ".{$this->format}";
        $filePath = "exports/{$filename}";

        Excel::store($export, $filePath, 'local', \Maatwebsite\Excel\Excel::CSV);

        // Notify user that export is ready
        $user = \App\Models\User::find($this->userId);
        if ($user) {
            $user->notify(new ExportCompletedNotification($filename));
        }
    }
}
```

## Step 6 — Testing

```bash
# Feature test: CSV export

it('exports products to CSV', function () {
    Product::factory()->count(5)->create();

    $response = $this->getJson('/api/v1/exports/products?format=csv');

    $response->assertOk()
        ->assertHeader('content-type', 'text/csv');
});

# Feature test: Excel export

it('exports products to Excel', function () {
    Product::factory()->count(5)->create();

    $response = $this->getJson('/api/v1/exports/products?format=xlsx');

    $response->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

# Feature test: export with filters

it('exports filtered products', function () {
    Product::factory()->create(['name' => 'Apple']);
    Product::factory()->create(['name' => 'Banana']);

    $response = $this->getJson('/api/v1/exports/products?search=Apple&format=csv');

    $response->assertOk();
});

# Feature test: export is queued for large datasets

it('queues export job for large datasets', function () {
    Product::factory()->count(10000)->create();

    ExportProductsJob::dispatch(auth()->id(), 'csv');

    expect(Job::push(ExportProductsJob::class))->toBeTrue();
});
```

## Pitfalls

- **Not handling large datasets** — Use queued export for datasets over 10k rows
- **Loading all data into memory** — Use `FromQuery` with Laravel Excel to stream
- **Not providing progress feedback** — Notify user when export is ready
- **Missing file cleanup** — Delete exported files after download or after TTL
- **Not validating format parameter** — Use `Rule::in(['csv', 'xlsx'])` for allowed formats
- **Not setting correct headers** — Use proper MIME types for CSV and Excel
- **Not using column widths** — Set column widths for better readability
- **Not including headers** — Always include a header row
- **Missing error handling** — Handle export failures gracefully
- **Not testing exports** — Always test export generates correct data
- **Not providing download URL** — For queued exports, provide a download link
- **Not handling storage permissions** — Ensure export directory is writable
