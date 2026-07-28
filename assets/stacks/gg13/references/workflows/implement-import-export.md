# Implement Import/Export (CSV/Excel)

## When to Use

When implementing bulk data import and export: CSV/Excel files, queue jobs for processing, progress tracking, and PrimeVue UI.

## Prerequisites

- Laravel 13 with queue configured
- Vue 3 + PrimeVue installed
- PHP Excel library installed (e.g., `maatwebsite/excel`)

## Step-by-Step Workflow

### 1. Install Excel Package

```bash
composer require maatwebsite/excel
php artisan vendor:publish --provider="Maatwebsite\Excel\ExcelServiceProvider" --tag=config
```

### 2. Create Import Class

```bash
php artisan make:import <Resource>Import --model=<Model>
```

```php
namespace App\Imports;

use App\Models\<Model>;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Throwable;

class <Resource>Import implements ToModel, WithHeadingRow, WithValidation, WithBatchInserts, WithChunkReading, SkipsOnError
{
    use SkipsErrors;

    private int $successCount = 0;
    private array $errors = [];

    public function model(array $row): ?<Model>
    {
        return new <Model>([
            'name' => $row['name'],
            'email' => $row['email'],
            'status' => $row['status'] ?? 'active',
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:models,email',
        ];
    }

    public function batchSize(): int
    {
        return 1000;
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    public function onError(Throwable $throwable): void
    {
        $this->errors[] = $throwable->getMessage();
    }

    public function getSuccessCount(): int
    {
        return $this->successCount;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
```

### 3. Create Export Class

```bash
php artisan make:export <Resource>Export --model=<Model>
```

```php
namespace App\Exports;

use App\Models\<Model>;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\BeforeExport;

class <Resource>Export implements FromQuery, WithHeadings, ShouldAutoSize, WithMapping
{
    private $query;

    public function __construct(Builder $query)
    {
        $this->query = $query;
    }

    public function query()
    {
        return $this->query->select('id', 'name', 'email', 'status', 'created_at');
    }

    public function headings(): array
    {
        return ['ID', 'Name', 'Email', 'Status', 'Created At'];
    }

    public function map($row): array
    {
        return [
            $row->id,
            $row->name,
            $row->email,
            $row->status,
            $row->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
```

### 4. Create Controller

```bash
php artisan make:controller ImportExportController
```

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\<Resource>Import;
use App\Exports\<Resource>Export;

class ImportExportController extends Controller
{
    public function index(Request $request)
    {
        $imports = ImportJob::where('user_id', Auth::id())
            ->latest()
            ->take(20)
            ->get();

        return response()->json($imports);
    }

    public function import(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls|max:10240',
        ]);

        // Store the upload first. A raw UploadedFile cannot be serialized onto a
        // queue, so persist it and hand the job the stored path instead.
        $path = $request->file('file')->store('imports', 'local');

        $job = ImportJob::create([
            'user_id' => Auth::id(),
            'file_name' => $request->file('file')->getClientOriginalName(),
            'status' => 'processing',
            'progress' => 0,
        ]);

        // Queue the import
        dispatch(new ProcessImport($job->id, $path))
            ->onQueue('imports');

        return response()->json(['job_id' => $job->id, 'status' => 'processing'], 202);
    }

    public function export(Request $request)
    {
        $query = <Model>::query();

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $job = ExportJob::create([
            'user_id' => Auth::id(),
            'status' => 'processing',
            'progress' => 0,
        ]);

        dispatch(new ProcessExport($job->id, $query))
            ->onQueue('exports');

        return response()->json(['job_id' => $job->id, 'status' => 'processing'], 202);
    }

    public function downloadExport(string $jobId)
    {
        $job = ExportJob::findOrFail($jobId);

        if ($job->status !== 'completed') {
            abort(404);
        }

        return response()->download($job->file_path);
    }
}
```

### 5. Create Queue Jobs

```bash
php artisan make:job ProcessImport
php artisan make:job ProcessExport
```

**ProcessImport:**
```php
use Maatwebsite\Excel\Validators\ValidationException;

class ProcessImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        private int $jobId,
        private string $filePath,
    ) {}

    public function handle(): void
    {
        $job = ImportJob::findOrFail($this->jobId);
        $job->update(['status' => 'processing', 'progress' => 10]);

        try {
            Excel::import(new <Resource>Import(), $this->filePath, 'local');
            $job->update([
                'status' => 'completed',
                'progress' => 100,
                'rows_processed' => 100,
            ]);
        } catch (ValidationException $e) {
            $job->update(['status' => 'failed', 'error' => $e->getMessage()]);
        }
    }
}
```

**ProcessExport:**
```php
class ProcessExport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        private int $jobId,
        private Builder $query,
    ) {}

    public function handle(): void
    {
        $job = ExportJob::findOrFail($this->jobId);
        $job->update(['status' => 'processing', 'progress' => 10]);

        $path = storage_path("app/exports/export_{$this->jobId}.csv");
        Excel::store(new <Resource>Export($this->query), $path, 'local');

        $job->update([
            'status' => 'completed',
            'progress' => 100,
            'file_path' => $path,
            'file_name' => "export_{$this->jobId}.csv",
        ]);
    }
}
```

### 6. Create Migrations for Job Tracking

```bash
php artisan make:migration create_import_export_jobs_table
```

```php
Schema::create('import_export_jobs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('file_name')->nullable();
    $table->string('status')->default('pending'); // pending, processing, completed, failed
    $table->integer('progress')->default(0);
    $table->string('file_path')->nullable();
    $table->integer('rows_processed')->nullable();
    $table->text('error')->nullable();
    $table->timestamps();
});
```

### 7. Create Vue Import/Export Component

```vue
<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api/client';
import FileUpload from 'primevue/fileupload';
import Button from 'primevue/button';
import Progressbar from 'primevue/progressbar';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

const files = ref([]);
const jobs = ref([]);
const importLoading = ref(false);

const statusSeverity = (status) => ({
    completed: 'success',
    processing: 'info',
    failed: 'danger',
    pending: 'warn',
}[status] || 'info');

const loadJobs = async () => {
    const { data } = await api.get('/import-export');
    jobs.value = data;
};

const startImport = async (event) => {
    importLoading.value = true;
    const formData = new FormData();
    formData.append('file', event.files[0]);

    await api.post('/import-export/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    importLoading.value = false;
    loadJobs();
};

const startExport = async () => {
    await api.post('/import-export/export');
    loadJobs();
};

const downloadExport = async (jobId) => {
    window.location.href = `/api/import-export/export/${jobId}/download`;
};

onMounted(loadJobs);
</script>

<template>
    <div>
        <Card>
            <template #title>Import Data</template>
            <template #content>
                <FileUpload
                    name="file"
                    accept=".csv,.xlsx,.xls"
                    :maxFileSize="10240000"
                    @select="files = $event.files"
                    @upload="startImport"
                    :disabled="importLoading"
                />
            </template>
        </Card>

        <Card class="mt-4">
            <template #title>Export Data</template>
            <template #content>
                <Button label="Start Export" @click="startExport" />
            </template>
        </Card>

        <Card class="mt-4">
            <template #title>Job History</template>
            <template #content>
                <DataTable :value="jobs">
                    <Column field="file_name" header="File" />
                    <Column field="status" header="Status">
                        <template #body="{ data }">
                            <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                        </template>
                    </Column>
                    <Column field="progress" header="Progress">
                        <template #body="{ data }">
                            <Progressbar :value="data.progress" />
                        </template>
                    </Column>
                    <Column header="Actions">
                        <template #body="{ data }">
                            <Button
                                v-if="data.status === 'completed'"
                                label="Download"
                                @click="downloadExport(data.id)"
                            />
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </div>
</template>
```

## Artisan Commands Reference

```bash
composer require maatwebsite/excel
php artisan vendor:publish --provider="Maatwebsite\Excel\ExcelServiceProvider" --tag=config
php artisan make:import <Resource>Import --model=<Model>
php artisan make:export <Resource>Export --model=<Model>
php artisan make:controller ImportExportController
php artisan make:job ProcessImport
php artisan make:job ProcessExport
php artisan make:migration create_import_export_jobs_table
php artisan queue:listen
php artisan queue:work --queue=imports,exports
php artisan test --filter=ImportExport
```

## Files to Create

| File | Purpose |
|------|---------|
| `app/Imports/<Resource>Import.php` | Import logic |
| `app/Exports/<Resource>Export.php` | Export logic |
| `app/Http/Controllers/ImportExportController.php` | Controller |
| `app/Jobs/ProcessImport.php` | Import queue job |
| `app/Jobs/ProcessExport.php` | Export queue job |
| `database/migrations/*_create_import_export_jobs_table.php` | Job tracking |
| `resources/js/Pages/<Resource>/ImportExport.vue` | UI component |
| `routes/api.php` | Import/export routes |
| `tests/Feature/ImportExportTest.php` | Tests |

## Testing

```bash
php artisan test tests/Feature/ImportExportTest.php
php artisan test --filter=test_import_csv_file
php artisan test --filter=test_import_validates_data
php artisan test --filter=test_export_generates_file
php artisan test --filter=test_export_applies_filters
php artisan test --filter=test_job_tracking_updates_status
php artisan test --filter=test_download_completed_export
```

## Verification Checklist

- [ ] Excel package installed and configured
- [ ] Import CSV/Excel file processes correctly
- [ ] Import validates data rows
- [ ] Import skips invalid rows with error reporting
- [ ] Export generates valid CSV/Excel file
- [ ] Export applies filters correctly
- [ ] Queue processes import/export jobs
- [ ] Job progress updates during processing
- [ ] Job status transitions: pending -> processing -> completed/failed
- [ ] Download returns correct file for completed exports
- [ ] Vue component shows upload progress
- [ ] Vue component lists job history
- [ ] All tests pass
