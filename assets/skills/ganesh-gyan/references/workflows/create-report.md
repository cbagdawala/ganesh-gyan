# Create Report

## When to Use

Use this workflow when you need to generate a report that aggregates data across one or more modules. Reports differ from dashboards in that they are typically more detailed, may support export, and are often generated on demand or on a schedule.

## Prerequisites

- Existing modules with data in the database
- Laravel with queue worker configured for async report generation
- Vue 3 SPA with PrimeVue DataTable for display
- Maatwebsite/Excel package installed (for export functionality)

## Step-by-Step Instructions

### Step 1: Define the Report

Before implementing, decide:

1. **Report purpose** — What business question does this answer?
2. **Data sources** — Which tables/models are involved?
3. **Aggregation level** — Daily, weekly, monthly, per-item?
4. **Filters** — Date range, category, status, etc.
5. **Output formats** — On-screen table, PDF, Excel download
6. **Generation method** — Real-time (synchronous) or queued (asynchronous)

### Step 2: Install Excel Package (if exporting)

```bash
composer require maatwebsite/excel
```

### Step 3: Create the Report Service

```php
// app/Services/Report/OrderSummaryReportService.php
class OrderSummaryReportService
{
    public function generate(array $filters): array
    {
        $query = Order::query()
            ->with(['user:id,name,email', 'items.product:id,name', 'items.category:id,name']);

        $this->applyFilters($query, $filters);

        $orders = $query->get();

        return [
            'summary' => $this->computeSummary($orders),
            'by_status' => $this->groupByStatus($orders),
            'by_category' => $this->groupByCategory($orders),
            'by_month' => $this->groupByMonth($orders),
            'detail' => $this->formatDetail($orders),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }
    }

    private function computeSummary(Collection $orders): array
    {
        return [
            'total_orders' => $orders->count(),
            'total_revenue' => $orders->sum('total_cents'),
            'average_order_value' => $orders->avg('total_cents'),
            'total_items' => $orders->flatMap(fn ($o) => $o->items)->count(),
        ];
    }

    private function groupByStatus(Collection $orders): array
    {
        return $orders->groupBy('status')->map(fn ($group) => [
            'count' => $group->count(),
            'revenue' => $group->sum('total_cents'),
        ])->toArray();
    }

    private function groupByCategory(Collection $orders): array
    {
        return $orders
            ->flatMap(fn ($order) => $order->items)
            ->groupBy(fn ($item) => $item->product?->category?->name ?? 'Uncategorized')
            ->map(fn ($items) => [
                'item_count' => $items->count(),
                'revenue' => $items->sum('line_total_cents'),
            ])
            ->toArray();
    }

    private function groupByMonth(Collection $orders): array
    {
        return $orders
            ->groupBy(fn ($order) => $order->created_at?->format('Y-m'))
            ->map(fn ($group) => [
                'month' => $group->first()->created_at?->format('Y-m'),
                'count' => $group->count(),
                'revenue' => $group->sum('total_cents'),
            ])
            ->values()
            ->toArray();
    }

    private function formatDetail(Collection $orders): array
    {
        return $orders->map(fn (Order $order) => [
            'order_id' => $order->id,
            'customer' => $order->user?->name ?? 'Guest',
            'email' => $order->user?->email,
            'status' => $order->status,
            'items_count' => $order->items->count(),
            'total_cents' => $order->total_cents,
            'created_at' => $order->created_at->toIso8601String(),
        ])->toArray();
    }
}
```

### Step 4: Create the Export Class

```php
// app/Exports/OrderSummaryExport.php
class OrderSummaryExport implements FromQuery, WithHeadings, WithStyles, ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly array $filters,
    ) {}

    public function query(): Builder
    {
        $query = Order::query()
            ->with(['user:id,name,email', 'items.product:id,name,sku', 'items.category:id,name'])
            ->orderByDesc('created_at');

        if (! empty($this->filters['date_from'])) {
            $query->whereDate('created_at', '>=', $this->filters['date_from']);
        }
        if (! empty($this->filters['date_to'])) {
            $query->whereDate('created_at', '<=', $this->filters['date_to']);
        }
        if (! empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'Order ID',
            'Customer Name',
            'Customer Email',
            'Status',
            'Items Count',
            'Total (USD)',
            'Order Date',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 12]],
        ];
    }
}
```

### Step 5: Create the Controller

```php
// app/Http/Controllers/Api/ReportController.php
class ReportController extends Controller
{
    public function __construct(
        private readonly OrderSummaryReportService $reportService,
    ) {}

    public function index(ReportFiltersRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $report = $this->reportService->generate($filters);

        return response()->json([
            'status' => 'success',
            'data' => $report,
        ]);
    }

    public function export(ReportFiltersRequest $request): BinaryFileResponse
    {
        $filters = $request->validated();

        return (new OrderSummaryExport($filters))
            ->download('order-summary-report.xlsx');
    }
}
```

### Step 6: Create the Filters Request

```php
// app/Http/Requests/Api/ReportFiltersRequest.php
class ReportFiltersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('export:data');
    }

    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date', 'before_or_equal:date_to'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'status' => ['nullable', 'string', 'in:pending,processing,completed,cancelled'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
```

### Step 7: Register Routes

```php
// routes/api.php
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/reports/order-summary', [ReportController::class, 'index']);
    Route::get('/reports/order-summary/export', [ReportController::class, 'export']);
});
```

### Step 8: Create Vue Types

```typescript
// resources/js/types/report.ts
export interface OrderSummaryReport {
  summary: {
    total_orders: number
    total_revenue: number
    average_order_value: number
    total_items: number
  }
  by_status: Record<string, { count: number; revenue: number }>
  by_category: Record<string, { item_count: number; revenue: number }>
  by_month: Array<{ month: string; count: number; revenue: number }>
  detail: Array<{
    order_id: number
    customer: string
    email: string
    status: string
    items_count: number
    total_cents: number
    created_at: string
  }>
  generated_at: string
}

export interface ReportFilters {
  date_from?: string
  date_to?: string
  status?: string
  user_id?: number
}
```

### Step 9: Create API Service and Store

```typescript
// resources/js/api/services/reportApi.ts
import api from '@/api/client'
import type { OrderSummaryReport, ReportFilters } from '@/types/report'

export async function fetchReport(filters: ReportFilters = {}): Promise<OrderSummaryReport> {
  const response = await api.get<{ data: OrderSummaryReport }>('/reports/order-summary', { params: filters })
  return response.data.data
}

export function downloadReportExcel(filters: ReportFilters = {}): void {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.append(k, String(v))
  })
  window.open(`/api/v1/reports/order-summary/export?${params.toString()}`, '_blank')
}
```

```typescript
// resources/js/stores/report.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchReport } from '@/api/services/reportApi'
import type { OrderSummaryReport, ReportFilters } from '@/types/report'

export const useReportStore = defineStore('report', () => {
  const report = ref<OrderSummaryReport | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(filters: ReportFilters = {}): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      report.value = await fetchReport(filters)
    } catch (e) {
      error.value = 'Failed to load report'
    } finally {
      isLoading.value = false
    }
  }

  return { report, isLoading, error, load }
})
```

### Step 10: Create the Report Page

```vue
<!-- resources/js/pages/reports/OrderSummaryReportPage.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useReportStore } from '@/stores/report'
import { downloadReportExcel } from '@/api/services/reportApi'
import type { ReportFilters } from '@/types/report'

definePage({ name: 'reports.order-summary' })

const toast = useToast()
const reportStore = useReportStore()
const filters = ref<ReportFilters>({
  date_from: '',
  date_to: '',
  status: '',
})

onMounted(() => reportStore.load(filters.value))

function handleGenerate() {
  reportStore.load(filters.value)
}

function handleExport() {
  downloadReportExcel(filters.value)
  toast.add({ severity: 'success', summary: 'Export', detail: 'Report download started', life: 3000 })
}
</script>

<template>
  <div class="report-page">
    <div class="flex justify-content-between align-items-center mb-4">
      <h1 class="text-2xl font-bold m-0">Order Summary Report</h1>
      <Button label="Export Excel" icon="pi pi-download" severity="help" @click="handleExport" />
    </div>

    <!-- Filters -->
    <Panel header="Filters" class="mb-4">
      <div class="flex gap-3 align-items-end">
        <div class="field flex-1">
          <label for="date_from">From</label>
          <DatePicker id="date_from" v-model="filters.date_from" show-icon icon-only dateFormat="yy-mm-dd" />
        </div>
        <div class="field flex-1">
          <label for="date_to">To</label>
          <DatePicker id="date_to" v-model="filters.date_to" show-icon icon-only dateFormat="yy-mm-dd" />
        </div>
        <div class="field flex-1">
          <label for="status">Status</label>
          <Select
            id="status"
            v-model="filters.status"
            :options="[{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Completed', value: 'completed' }]"
            placeholder="Select status"
          />
        </div>
        <Button label="Generate" icon="pi pi-refresh" @click="handleGenerate" :disabled="reportStore.isLoading" />
      </div>
    </Panel>

    <Message v-if="reportStore.error" severity="error" :text="reportStore.error" />
    <ProgressBar v-if="reportStore.isLoading" mode="indeterminate" />

    <!-- Summary Cards -->
    <template v-if="reportStore.report">
      <div class="grid mt-4">
        <div class="col-3">
          <Panel>
            <div class="text-center">
              <div class="text-500 text-sm">Total Orders</div>
              <div class="text-3xl font-bold">{{ reportStore.report.summary.total_orders }}</div>
            </div>
          </Panel>
        </div>
        <div class="col-3">
          <Panel>
            <div class="text-center">
              <div class="text-500 text-sm">Total Revenue</div>
              <div class="text-3xl font-bold text-green-600">
                {{ `$${(reportStore.report.summary.total_revenue / 100).toFixed(2)}` }}
              </div>
            </div>
          </Panel>
        </div>
        <div class="col-3">
          <Panel>
            <div class="text-center">
              <div class="text-500 text-sm">Average Order Value</div>
              <div class="text-3xl font-bold">
                {{ `$${(reportStore.report.summary.average_order_value / 100).toFixed(2)}` }}
              </div>
            </div>
          </Panel>
        </div>
        <div class="col-3">
          <Panel>
            <div class="text-center">
              <div class="text-500 text-sm">Total Items</div>
              <div class="text-3xl font-bold">{{ reportStore.report.summary.total_items }}</div>
            </div>
          </Panel>
        </div>
      </div>

      <!-- Detail Table -->
      <Panel header="Order Details" class="mt-4">
        <DataTable :value="reportStore.report.detail" :paginator="true" :rows="25" sort-mode="single">
          <Column field="order_id" header="Order ID" sortable />
          <Column field="customer" header="Customer" sortable />
          <Column field="status" header="Status" sortable>
            <template #body="slotProps">
              <Tag :value="slotProps.data.status" :severity="getStatusSeverity(slotProps.data.status)" />
            </template>
          </Column>
          <Column field="items_count" header="Items" sortable />
          <Column field="total_cents" header="Total" sortable>
            <template #body="slotProps">
              {{ `$${(slotProps.data.total_cents / 100).toFixed(2)}` }}
            </template>
          </Column>
          <Column field="created_at" header="Date" sortable sort-field="created_at" />
        </DataTable>
      </Panel>
    </template>
  </div>
</template>
```

### Step 11: Write Tests

```php
// tests/Feature/Api/ReportTest.php
uses(RefreshDatabase::class);

it('generates order summary report', function () {
    $user = User::factory()->admin()->create();
    Order::factory()->count(5)->create(['total_cents' => 5000]);

    $response = $this->actingAs($user)->getJson('/api/v1/reports/order-summary');

    $response
        ->assertOk()
        ->assertJsonStructure([
            'status',
            'data' => [
                'summary' => ['total_orders', 'total_revenue', 'average_order_value', 'total_items'],
                'by_status',
                'by_category',
                'by_month',
                'detail',
                'generated_at',
            ],
        ]);
});

it('filters report by date range', function () {
    $user = User::factory()->admin()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/reports/order-summary?date_from=2024-01-01&date_to=2024-01-31');

    $response->assertOk();
});

it('returns 403 without export permission', function () {
    $user = User::factory()->user()->create();

    $this->actingAs($user)->getJson('/api/v1/reports/order-summary')
        ->assertForbidden();
});
```

### Step 12: Run Tests and Verify

```bash
./vendor/bin/pest tests/Feature/Api/ReportTest.php
npm run dev
```

## Files Created/Modified

| Layer | Files |
|---|---|
| Backend | Report Service, Export Class, Controller, Filters Request, Routes |
| Frontend Types | `report.ts` |
| Frontend API | `reportApi.ts` |
| Frontend Store | `report.ts` |
| Frontend Page | `OrderSummaryReportPage.vue` |
| Tests | `ReportTest.php` |

## Verification Checklist

- [ ] Report API returns all sections (summary, groupings, detail)
- [ ] Date range filter works correctly
- [ ] Excel export downloads a valid file
- [ ] Filtered report matches database data
- [ ] Permission check blocks unauthorized users
- [ ] Vue page renders filters, summary cards, and table
- [ ] Export triggers file download
- [ ] All Pest tests pass
- [ ] No N+1 queries in report generation
