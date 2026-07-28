# Create Dashboard

## When to Use

When building a dashboard page with statistics, charts, widgets, and aggregated data. Covers backend data aggregation and frontend chart rendering.

## Prerequisites

- Laravel 13 backend with data tables
- Vue 3 + PrimeVue installed
- Chart library available (PrimeVue Charts / Chart.js / ApexCharts)
- Authentication and authorization in place

## Step-by-Step Workflow

### 1. Design Dashboard Layout

Plan the dashboard grid:
- Summary stat cards (row 1)
- Main chart area (row 2)
- Secondary widgets (row 3)
- Activity/feed (row 4)

### 2. Create Dashboard Controller

```bash
php artisan make:controller DashboardController
```

```php
namespace App\Http\Controllers;

use App\Models\<Model>;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->get('period', '30days');
        $dateRange = $this->getDateRange($period);

        $stats = [
            'total_users' => User::count(),
            'active_users' => User::where('last_login_at', '>=', $dateRange['start'])->count(),
            'total_revenue' => Transaction::where('created_at', '>=', $dateRange['start'])
                ->sum('amount'),
            'pending_orders' => Order::where('status', 'pending')->count(),
        ];

        $chartData = $this->getChartData($period);
        $recentActivity = $this->getRecentActivity();

        return response()->json([
            'stats' => $stats,
            'chart_data' => $chartData,
            'recent_activity' => $recentActivity,
            'period' => $period,
        ]);
    }

    private function getDateRange(string $period): array
    {
        return match ($period) {
            '7days' => ['start' => Carbon::now()->subDays(7), 'end' => Carbon::now()],
            '30days' => ['start' => Carbon::now()->subDays(30), 'end' => Carbon::now()],
            '90days' => ['start' => Carbon::now()->subDays(90), 'end' => Carbon::now()],
            'this_month' => ['start' => Carbon::now()->startOfMonth(), 'end' => Carbon::now()],
            default => ['start' => Carbon::now()->subDays(30), 'end' => Carbon::now()],
        };
    }

    private function getChartData(string $period): array
    {
        // Group by time period
        $groupBy = match ($period) {
            '7days' => 'day',
            '30days', '90days' => 'day',
            'this_month' => 'day',
            default => 'day',
        };

        return DB::table('transactions')
            ->selectRaw("DATE(created_at) as date, SUM(amount) as total")
            ->where('created_at', '>=', $this->getDateRange($period)['start'])
            ->groupByRaw("DATE(created_at)")
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    private function getRecentActivity(): array
    {
        return Activity::with('user')
            ->latest()
            ->take(10)
            ->get()
            ->toArray();
    }
}
```

### 3. Create Dashboard Resource

```bash
php artisan make:resource DashboardResource
```

Transform aggregated data into chart-friendly format.

### 4. Register Route

```php
Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('auth:sanctum');
```

### 5. Create Vue Dashboard Component

```vue
<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '@/api/client';
import Card from 'primevue/card';
import Chart from 'primevue/chart';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';

const stats = ref([]);
const chartData = ref({ labels: [], datasets: [] });
const activity = ref([]);
const loading = ref(true);
const period = ref('30days');
const periods = [
    { label: '7 Days', value: '7days' },
    { label: '30 Days', value: '30days' },
    { label: '90 Days', value: '90days' },
];

const loadDashboard = async (p = '30days') => {
    loading.value = true;
    const { data } = await api.get('/dashboard', { params: { period: p } });
    stats.value = data.stats;
    chartData.value = data.chart_data;
    activity.value = data.recent_activity;
    period.value = data.period;
    loading.value = false;
};

onMounted(() => loadDashboard());
watch(period, (newVal) => loadDashboard(newVal));
</script>

<template>
    <div class="dashboard">
        <!-- Stat Cards -->
        <div class="grid">
            <div v-for="stat in stats" :key="stat.label" class="col-3">
                <Card>
                    <template #title>{{ stat.label }}</template>
                    <template #content>
                        <Skeleton v-if="loading" width="100%" height="40px" />
                        <span v-else class="text-2xl font-bold">{{ stat.value }}</span>
                    </template>
                </Card>
            </div>
        </div>

        <!-- Chart -->
        <Card class="mt-4">
            <template #title>
                <Select v-model="period" :options="periods" optionLabel="label" optionValue="value" />
            </template>
            <template #content>
                <Skeleton v-if="loading" width="100%" height="300px" />
                <Chart v-else type="line" :data="chartData" :options="chartOptions" height="300px" />
            </template>
        </Card>

        <!-- Recent Activity -->
        <Card class="mt-4">
            <template #title>Recent Activity</template>
            <template #content>
                <DataTable :value="activity" :loading="loading">
                    <Column field="action" header="Action" />
                    <Column field="user.name" header="User" />
                    <Column field="created_at" header="Date">
                        <template #body="{ data }">{{ formatDate(data.created_at) }}</template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </div>
</template>
```

### 6. Create Performance Optimizations

- Use eager loading for related models
- Cache dashboard data with `Cache::remember()` for 5-15 minutes
- Use `select()` to only fetch needed columns
- Consider server-side aggregation queries

```php
public function index(Request $request)
{
    $period = $request->get('period', '30days');
    
    return Cache::remember("dashboard_{$period}", 900, function () use ($period) {
        // expensive aggregation queries
    });
}
```

## Artisan Commands Reference

```bash
php artisan make:controller DashboardController
php artisan make:resource DashboardResource
php artisan route:list --path=api/dashboard
php artisan test --filter=Dashboard
```

## Files to Create

| File | Purpose |
|------|---------|
| `app/Http/Controllers/DashboardController.php` | Aggregation logic |
| `app/Http/Resources/DashboardResource.php` | Chart data transform |
| `resources/js/Pages/Dashboard.vue` | Dashboard UI |
| `resources/js/components/DashboardChart.vue` | Chart component |
| `resources/js/components/StatCard.vue` | Stat card widget |
| `routes/api.php` | Dashboard route |
| `tests/Feature/DashboardTest.php` | Dashboard tests |

## Testing

```bash
php artisan test tests/Feature/DashboardTest.php
php artisan test --filter=test_dashboard_returns_stats
php artisan test --filter=test_dashboard_respects_period_filter
php artisan test --filter=test_dashboard_caches_response
```

## Verification Checklist

- [ ] Stats cards display correct aggregated values
- [ ] Chart renders with correct data
- [ ] Period selector changes chart data
- [ ] Recent activity shows latest entries
- [ ] Dashboard loads within acceptable time (< 500ms cached)
- [ ] Cache is populated on first load
- [ ] Cache expires after configured TTL
- [ ] Unauthorized access returns 401
- [ ] No N+1 queries in aggregation
- [ ] All tests pass
