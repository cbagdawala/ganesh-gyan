# Create Report

Build a report with aggregations, filters, and chart data using Laravel and PrimeVue.

## Prerequisites

- [ ] Know the report type (e.g., sales, inventory, user activity)
- [ ] Know the time periods available (daily, weekly, monthly, yearly)
- [ ] Know which aggregations to include (totals, averages, counts)
- [ ] Know which charts to display (bar, line, pie)
- [ ] Know which filters to apply (date range, category, status)

## Step 1 — Report Service

```php
<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    public function getSalesReport(
        string $period = '30d',
        ?int $categoryId = null,
        ?int $userId = null,
    ): array {
        $dateRange = $this->getDateRange($period);

        $query = Order::where('status', 'completed')
            ->whereBetween('created_at', $dateRange);

        if ($categoryId) {
            $query->whereHas('items.product', fn ($q) => $q->where('category_id', $categoryId));
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return [
            'summary' => $this->getSummary($query),
            'daily' => $this->getDailyBreakdown($query, $period),
            'byCategory' => $this->getByCategory($query),
            'byProduct' => $this->getByProduct($query, limit: 10),
            'topCustomers' => $this->getTopCustomers($query, limit: 10),
            'dateRange' => [
                'from' => $dateRange[0]->toDateString(),
                'to' => $dateRange[1]->toDateString(),
            ],
        ];
    }

    private function getDateRange(string $period): array
    {
        $ranges = [
            'today' => [Carbon::today(), Carbon::today()],
            '7d' => [Carbon::today()->subDays(6), Carbon::today()],
            '30d' => [Carbon::today()->subDays(29), Carbon::today()],
            '90d' => [Carbon::today()->subDays(89), Carbon::today()],
            'thisMonth' => [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()],
            'lastMonth' => [
                Carbon::now()->subMonth()->startOfMonth(),
                Carbon::now()->subMonth()->endOfMonth(),
            ],
            'thisYear' => [Carbon::now()->startOfYear(), Carbon::now()->endOfYear()],
        ];

        return $ranges[$period] ?? $ranges['30d'];
    }

    private function getSummary($query): array
    {
        $totals = $query->selectRaw('
            COUNT(*) as total_orders,
            SUM(total_cents) as total_revenue,
            AVG(total_cents) as average_order_value,
            COUNT(DISTINCT user_id) as unique_customers
        ')->first();

        return [
            'total_orders' => $totals->total_orders ?? 0,
            'total_revenue' => $totals->total_revenue ?? 0,
            'total_revenue_formatted' => '$' . number_format(($totals->total_revenue ?? 0) / 100, 2),
            'average_order_value' => $totals->average_order_value ?? 0,
            'average_order_value_formatted' => '$' . number_format(($totals->average_order_value ?? 0) / 100, 2),
            'unique_customers' => $totals->unique_customers ?? 0,
        ];
    }

    private function getDailyBreakdown($query, string $period): array
    {
        $groupBy = match ($period) {
            'today' => 'HOUR(created_at)',
            '7d', '30d', '90d' => 'DATE(created_at)',
            default => 'DATE(created_at)',
        };

        return Order::where('status', 'completed')
            ->whereBetween('created_at', $this->getDateRange($period))
            ->selectRaw("{$groupBy} as date, COUNT(*) as orders, SUM(total_cents) as revenue")
            ->groupByRaw("{$groupBy}")
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date->format('Y-m-d'),
                'orders' => (int) $row->orders,
                'revenue' => (int) $row->revenue,
                'revenue_formatted' => '$' . number_format((int) $row->revenue / 100, 2),
            ])
            ->toArray();
    }

    private function getByCategory($query): array
    {
        return Order::where('status', 'completed')
            ->whereBetween('created_at', $this->getDateRange('30d'))
            ->join('order_items', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('COUNT(*) as orders'), DB::raw('SUM(order_items.total_cents) as revenue'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn ($row) => [
                'category' => $row->name,
                'orders' => (int) $row->orders,
                'revenue' => (int) $row->revenue,
                'revenue_formatted' => '$' . number_format((int) $row->revenue / 100, 2),
            ])
            ->toArray();
    }

    private function getByProduct($query, int $limit = 10): array
    {
        return OrderItem::whereHas('order', fn ($q) => $q
            ->where('status', 'completed')
            ->whereBetween('created_at', $this->getDateRange('30d'))
        )
            ->with('product')
            ->selectRaw('product_id, SUM(quantity) as total_quantity, SUM(total_cents) as total_revenue')
            ->groupBy('product_id')
            ->orderByDesc('total_quantity')
            ->limit($limit)
            ->get()
            ->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product->name,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue' => (int) $item->total_revenue,
                'total_revenue_formatted' => '$' . number_format((int) $item->total_revenue / 100, 2),
            ])
            ->toArray();
    }

    private function getTopCustomers($query, int $limit = 10): array
    {
        return Order::where('status', 'completed')
            ->whereBetween('created_at', $this->getDateRange('30d'))
            ->select('user_id', DB::raw('COUNT(*) as orders'), DB::raw('SUM(total_cents) as total_spent'))
            ->groupBy('user_id')
            ->orderByDesc('total_spent')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'user_name' => User::find($row->user_id)?->name ?? 'Unknown',
                'orders' => (int) $row->orders,
                'total_spent' => (int) $row->total_spent,
                'total_spent_formatted' => '$' . number_format((int) $row->total_spent / 100, 2),
            ])
            ->toArray();
    }
}
```

## Step 2 — Controller

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ReportRequest;
use App\Services\ReportService;
use App\Traits\ApiResponses;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    use ApiResponses;

    public function __construct(
        private readonly ReportService $reportService,
    ) {}

    public function sales(ReportRequest $request): JsonResponse
    {
        $report = $this->reportService->getSalesReport(
            period: $request->validated('period', '30d'),
            categoryId: $request->integer('category_id'),
            userId: $request->integer('user_id'),
        );

        return $this->success(data: $report);
    }

    public function inventory(ReportRequest $request): JsonResponse
    {
        $report = $this->reportService->getInventoryReport();

        return $this->success(data: $report);
    }
}
```

## Step 3 — Frontend: TypeScript Types

```typescript
// resources/js/types/report.ts
export interface SalesReport {
  summary: {
    total_orders: number
    total_revenue: number
    total_revenue_formatted: string
    average_order_value: number
    average_order_value_formatted: string
    unique_customers: number
  }
  daily: Array<{
    date: string
    orders: number
    revenue: number
    revenue_formatted: string
  }>
  byCategory: Array<{
    category: string
    orders: number
    revenue: number
    revenue_formatted: string
  }>
  byProduct: Array<{
    product_id: number
    product_name: string
    total_quantity: number
    total_revenue: number
    total_revenue_formatted: string
  }>
  topCustomers: Array<{
    user_id: number
    user_name: string
    orders: number
    total_spent: number
    total_spent_formatted: string
  }>
  dateRange: {
    from: string
    to: string
  }
}
```

## Step 4 — Frontend: Report Page

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import SelectButton from 'primevue/selectbutton'
import { fetchSalesReport } from '@/api/services/reportApi'
import type { SalesReport } from '@/types/report'

const isLoading = ref(false)
const report = ref<SalesReport | null>(null)
const selectedPeriod = ref('30d')

const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'This Month', value: 'thisMonth' },
]

async function loadReport() {
  isLoading.value = true
  try {
    report.value = await fetchSalesReport({ period: selectedPeriod.value })
  } catch {
    // handle error
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadReport())
</script>

<template>
  <div class="report-page">
    <div class="page-header">
      <h2>Sales Report</h2>
      <SelectButton
        v-model="selectedPeriod"
        :options="periodOptions"
        option-label="label"
        option-value="value"
        @change="loadReport"
      />
    </div>

    <div v-if="report" class="report-content">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <Card>
          <h4>Total Revenue</h4>
          <p class="stat-value">{{ report.summary.total_revenue_formatted }}</p>
        </Card>
        <Card>
          <h4>Total Orders</h4>
          <p class="stat-value">{{ report.summary.total_orders }}</p>
        </Card>
        <Card>
          <h4>Avg Order Value</h4>
          <p class="stat-value">{{ report.summary.average_order_value_formatted }}</p>
        </Card>
        <Card>
          <h4>Unique Customers</h4>
          <p class="stat-value">{{ report.summary.unique_customers }}</p>
        </Card>
      </div>

      <!-- Charts and Tables -->
      <div class="report-grid">
        <Card title="Revenue by Day">
          <RevenueChart :data="report.daily" />
        </Card>
        <Card title="Revenue by Category">
          <CategoryChart :data="report.byCategory" />
        </Card>
      </div>

      <div class="report-grid">
        <Card title="Top Products">
          <DataTable :value="report.byProduct">
            <Column field="product_name" header="Product" />
            <Column field="total_quantity" header="Quantity Sold" />
            <Column field="total_revenue_formatted" header="Revenue" />
          </DataTable>
        </Card>
        <Card title="Top Customers">
          <DataTable :value="report.topCustomers">
            <Column field="user_name" header="Customer" />
            <Column field="orders" header="Orders" />
            <Column field="total_spent_formatted" header="Total Spent" />
          </DataTable>
        </Card>
      </div>
    </div>
  </div>
</template>
```

## Step 5 — Testing

```bash
# Feature test: sales report returns data

it('returns sales report for the given period', function () {
    Order::factory()->count(10)->create(['status' => 'completed']);

    $response = $this->getJson('/api/v1/reports/sales?period=7d');

    $response->assertOk()
        ->assertJsonPath('data.summary.total_orders', 10);
});

# Feature test: report filters by period

it('filters report by period', function () {
    Order::factory()->create(['status' => 'completed', 'created_at' => now()->subDays(60)]);
    Order::factory()->create(['status' => 'completed', 'created_at' => now()->subDays(3)]);

    $response = $this->getJson('/api/v1/reports/sales?period=7d');

    $response->assertOk()
        ->assertJsonPath('data.summary.total_orders', 1);
});

# Feature test: report includes daily breakdown

it('includes daily breakdown in report', function () {
    Order::factory()->count(5)->create(['status' => 'completed']);

    $response = $this->getJson('/api/v1/reports/sales?period=7d');

    $response->assertOk()
        ->assertJsonStructure(['data' => ['daily']]);
});

# Feature test: report includes top customers

it('includes top customers in report', function () {
    Order::factory()->count(10)->create(['status' => 'completed']);

    $response = $this->getJson('/api/v1/reports/sales?period=30d');

    $response->assertOk()
        ->assertJsonStructure(['data' => ['topCustomers']]);
});
```

## Pitfalls

- **Not caching reports** — Reports are expensive; cache for 5-15 minutes
- **Missing authorization** — Reports are admin-only; always check permissions
- **N+1 queries in aggregations** — Use joins and raw queries for aggregations
- **Not handling empty data** — Show meaningful empty states for reports
- **Hardcoding date ranges** — Use a date range mapping for different periods
- **Not testing with different periods** — Test each period returns correct data
- **Missing loading state** — Show ProgressBar while loading report data
- **Returning raw query results** — Always format currency and dates in service
- **Not including date range in response** — Include `dateRange` for context
- **Not providing filters in request** — Allow filtering by category, user, etc.
- **Ignoring timezone** — Use `created_at` timezone consistently in queries
- **Not optimizing large datasets** — Use database-level aggregation instead of Eloquent
