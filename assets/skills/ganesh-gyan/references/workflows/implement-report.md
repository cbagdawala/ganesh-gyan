# Create Report

## When to Use

When building a report page with date ranges, filters, charts, data export, and aggregation. Covers complex data querying, filtering, and download functionality.

## Prerequisites

- Laravel 13 backend with data tables
- Vue 3 + PrimeVue installed
- PHP Excel/CSV export library (e.g., Maatwebsite/Laravel-Excel)
- Authentication and authorization

## Step-by-Step Workflow

### 1. Create Report Controller

```bash
php artisan make:controller ReportController
```

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\<ReportName>Export;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'group_by' => 'sometimes|in:day,week,month,quarter',
            'status' => 'sometimes|string',
        ]);

        $query = $this->buildQuery($validated);
        $data = $query->get();
        $aggregated = $this->aggregate($data, $request->get('group_by', 'day'));

        return response()->json([
            'data' => $data,
            'aggregated' => $aggregated,
            'filters' => $validated,
        ]);
    }

    public function export(Request $request)
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'format' => 'sometimes|in:csv,xlsx',
        ]);

        $query = $this->buildQuery($validated);

        return match ($request->get('format', 'csv')) {
            'xlsx' => Excel::download(new <ReportName>Export($query), '<report>.xlsx'),
            default => Excel::download(new <ReportName>Export($query), '<report>.csv'),
        };
    }

    private function buildQuery(array $filters): Builder
    {
        $query = Order::with(['user', 'items.product'])
            ->whereBetween('created_at', [
                Carbon::parse($filters['start_date'])->startOfDay(),
                Carbon::parse($filters['end_date'])->endOfDay(),
            ]);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query;
    }

    private function aggregate(Collection $data, string $groupBy): array
    {
        $grouped = $data->groupBy(function ($item) use ($groupBy) {
            return Carbon::parse($item->created_at)->format(match ($groupBy) {
                'day' => 'Y-m-d',
                'week' => 'Y-W',
                'month' => 'Y-m',
                'quarter' => 'Y-Q[Q]',
                default => 'Y-m-d',
            });
        });

        return $grouped->map(function ($group) {
            return [
                'period' => $group->first()->created_at,
                'count' => $group->count(),
                'total' => $group->sum('total'),
                'average' => $group->avg('total'),
            ];
        })->values()->toArray();
    }
}
```

### 2. Create Export Class

```bash
php artisan make:export <ReportName>Export --model=<Model>
```

Customize the export:
- Add headers
- Format columns
- Add summary rows

### 3. Register Routes

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/reports/<name>', [ReportController::class, 'index']);
    Route::get('/reports/<name>/export', [ReportController::class, 'export']);
});
```

### 4. Create Vue Report Page

```vue
<script setup>
import { ref, computed } from 'vue';
import api from '@/api/client';
import Card from 'primevue/card';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputNumber from 'primevue/inputnumber';

const startDate = ref(null);
const endDate = ref(null);
const groupBy = ref('day');
const status = ref(null);
const data = ref([]);
const aggregated = ref([]);
const loading = ref(false);

const loadReport = async () => {
    loading.value = true;
    const { data: result } = await api.get('/reports/<name>', {
        params: {
            start_date: startDate.value?.toISOString(),
            end_date: endDate.value?.toISOString(),
            group_by: groupBy.value,
            ...(status.value && { status: status.value }),
        },
    });
    data.value = result.data;
    aggregated.value = result.aggregated;
    loading.value = false;
};

const exportReport = async () => {
    const params = new URLSearchParams({
        start_date: startDate.value?.toISOString(),
        end_date: endDate.value?.toISOString(),
        format: 'csv',
    });
    window.location.href = `/api/reports/<name>/export?${params}`;
};
</script>

<template>
    <div>
        <Card>
            <template #title>Filters</template>
            <template #content>
                <div class="flex gap-3">
                    <DatePicker v-model="startDate" placeholder="Start Date" />
                    <DatePicker v-model="endDate" placeholder="End Date" />
                    <Select v-model="groupBy" :options="['day','week','month','quarter']" />
                    <Button label="Generate" @click="loadReport" :disabled="loading" />
                    <Button label="Export CSV" @click="exportReport" class="p-button-success" />
                </div>
            </template>
        </Card>

        <Card class="mt-4">
            <template #content>
                <DataTable :value="data" :loading="loading">
                    <Column field="id" header="ID" />
                    <Column field="total" header="Total" />
                    <Column field="created_at" header="Date" />
                </DataTable>
            </template>
        </Card>
    </div>
</template>
```

## Artisan Commands Reference

```bash
php artisan make:controller ReportController
php artisan make:export <ReportName>Export --model=<Model>
php artisan route:list --path=api/reports
php artisan test --filter=Report
```

## Files to Create

| File | Purpose |
|------|---------|
| `app/Http/Controllers/ReportController.php` | Report logic |
| `app/Exports/<ReportName>Export.php` | CSV/Excel export |
| `resources/js/Pages/Reports/<Name>.vue` | Report UI |
| `routes/api.php` | Report routes |
| `tests/Feature/<ReportName>Test.php` | Report tests |

## Testing

```bash
php artisan test tests/Feature/<ReportName>Test.php
php artisan test --filter=test_report_with_date_range
php artisan test --filter=test_report_export_csv
php artisan test --filter=test_report_with_filters
```

## Verification Checklist

- [ ] Date range filter works correctly
- [ ] Group by aggregation produces correct totals
- [ ] Status filter narrows results
- [ ] CSV export downloads correctly
- [ ] XLSX export downloads correctly
- [ ] Large datasets export without timeout
- [ ] Report loads within acceptable time
- [ ] Unauthorized access returns 401
- [ ] All validation rules enforced
- [ ] All tests pass
