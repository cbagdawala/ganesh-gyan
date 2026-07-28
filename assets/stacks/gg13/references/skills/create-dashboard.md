# Create Dashboard

Build a dashboard page with stats cards, charts, and activity feed using PrimeVue and Vue 3.

## Prerequisites

- [ ] Know which metrics to display (e.g., total users, revenue, orders)
- [ ] Know the time period for the dashboard (today, this week, this month, all time)
- [ ] Know which charts to include (bar, line, pie)
- [ ] Know which activities to show (recent orders, signups, notifications)
- [ ] Backend API endpoint returns dashboard data

## Step 1 — Backend: Dashboard API

Create the dashboard controller method:

```php
// app/Http/Controllers/Api/DashboardController.php
public function index(DashboardRequest $request): JsonResponse
{
    $period = $request->validated('period', '7d');
    $data = $this->dashboardService->getDashboardData($period);

    return response()->json(['data' => $data]);
}
```

Dashboard Request:

```php
// app/Http/Requests/Api/DashboardRequest.php
class DashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    public function rules(): array
    {
        return [
            'period' => ['sometimes', 'string', Rule::in(['today', '7d', '30d', '90d', 'all'])],
        ];
    }
}
```

Dashboard Service:

```php
// app/Services/DashboardService.php
class DashboardService
{
    public function getDashboardData(string $period): array
    {
        $dateRanges = [
            'today' => [now()->startOfDay(), now()],
            '7d' => [now()->subDays(7), now()],
            '30d' => [now()->subDays(30), now()],
            '90d' => [now()->subDays(90), now()],
            'all' => [now()->startOfMonth(), now()],
        ];

        [$from, $to] = $dateRanges[$period];

        return [
            'stats' => $this->getStats($from, $to),
            'revenue' => $this->getRevenueChart($from, $to),
            'orders' => $this->getOrdersChart($from, $to),
            'topProducts' => $this->getTopProducts(),
            'recentActivity' => $this->getRecentActivity(),
            'userGrowth' => $this->getUserGrowthChart($from, $to),
        ];
    }

    private function getStats(DateTimeInterface $from, DateTimeInterface $to): array
    {
        $totalUsers = User::whereBetween('created_at', [$from, $to])->count();
        $totalRevenue = Order::whereBetween('created_at', [$from, $to])
            ->where('status', 'completed')
            ->sum('total_cents');
        $totalOrders = Order::whereBetween('created_at', [$from, $to])->count();
        $pendingOrders = Order::where('status', 'pending')->count();

        return [
            'total_users' => $totalUsers,
            'total_revenue' => $totalRevenue,
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'revenue_formatted' => $this->formatCurrency($totalRevenue),
            'orders_formatted' => number_format($totalOrders),
            'users_formatted' => number_format($totalUsers),
            'pending_formatted' => number_format($pendingOrders),
        ];
    }

    private function getRevenueChart(DateTimeInterface $from, DateTimeInterface $to): array
    {
        return Order::selectRaw('DATE(created_at) as date, SUM(total_cents) as revenue')
            ->whereBetween('created_at', [$from, $to])
            ->where('status', 'completed')
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date->format('Y-m-d'),
                'revenue' => $row->revenue,
                'revenue_formatted' => $this->formatCurrency($row->revenue),
            ])
            ->toArray();
    }

    private function getOrdersChart(DateTimeInterface $from, DateTimeInterface $to): array
    {
        return Order::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->whereBetween('created_at', [$from, $to])
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date->format('Y-m-d'),
                'count' => $row->count,
                'count_formatted' => number_format($row->count),
            ])
            ->toArray();
    }

    private function getTopProducts(): array
    {
        return OrderItem::with('product')
            ->selectRaw('product_id, SUM(quantity) as total_quantity, SUM(total_cents) as total_revenue')
            ->groupBy('product_id')
            ->orderByDesc('total_quantity')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product->name,
                'total_quantity' => $item->total_quantity,
                'total_revenue' => $item->total_revenue,
                'total_revenue_formatted' => $this->formatCurrency($item->total_revenue),
            ])
            ->toArray();
    }

    private function getRecentActivity(): array
    {
        return ActivityLog::with(['user', 'subject'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'description' => $log->description,
                'user_name' => $log->user?->name,
                'created_at' => $log->created_at->diffForHumans(),
            ])
            ->toArray();
    }

    private function getUserGrowthChart(DateTimeInterface $from, DateTimeInterface $to): array
    {
        return User::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->whereBetween('created_at', [$from, $to])
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date->format('Y-m-d'),
                'count' => $row->count,
            ])
            ->toArray();
    }

    private function formatCurrency(int $cents): string
    {
        return '$' . number_format($cents / 100, 2);
    }
}
```

## Step 2 — Frontend: TypeScript Types

```typescript
// resources/js/types/dashboard.ts
export interface DashboardStats {
  total_users: number
  total_revenue: number
  total_orders: number
  pending_orders: number
  revenue_formatted: string
  orders_formatted: string
  users_formatted: string
  pending_formatted: string
}

export interface ChartPoint {
  date: string
  revenue: number
  revenue_formatted: string
  count: number
}

export interface TopProduct {
  product_id: number
  product_name: string
  total_quantity: number
  total_revenue: number
  total_revenue_formatted: string
}

export interface ActivityItem {
  id: number
  action: string
  subject_type: string
  subject_id: number
  description: string
  user_name: string | null
  created_at: string
}

export interface DashboardData {
  stats: DashboardStats
  revenue: ChartPoint[]
  orders: ChartPoint[]
  topProducts: TopProduct[]
  recentActivity: ActivityItem[]
  userGrowth: ChartPoint[]
}
```

## Step 3 — Frontend: API Service

```typescript
// resources/js/api/services/dashboardApi.ts
import api from '@/api/client'
import type { DashboardData } from '@/types/dashboard'

export interface DashboardFilters {
  period?: 'today' | '7d' | '30d' | '90d' | 'all'
}

export async function fetchDashboardData(
  params: DashboardFilters = {},
): Promise<DashboardData> {
  const response = await api.get<{ data: DashboardData }>('/dashboard', {
    params: { period: params.period || '7d' },
  })
  return response.data.data
}
```

## Step 4 — Frontend: Dashboard Page

Create `resources/js/pages/dashboard/DashboardPage.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import SelectButton from 'primevue/selectbutton'
import { fetchDashboardData } from '@/api/services/dashboardApi'
import type { DashboardData } from '@/types/dashboard'

const toast = useToast()

const isLoading = ref(false)
const dashboard = ref<DashboardData | null>(null)
const selectedPeriod = ref<'today' | '7d' | '30d' | '90d' | 'all'>('7d')

const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'All Time', value: 'all' },
]

async function loadDashboard() {
  isLoading.value = true
  try {
    dashboard.value = await fetchDashboardData({ period: selectedPeriod.value })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load dashboard data',
      life: 5000,
    })
  } finally {
    isLoading.value = false
  }
}

function handlePeriodChange(event: { value: string }) {
  selectedPeriod.value = event.value as typeof selectedPeriod.value
  loadDashboard()
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2>Dashboard</h2>
      <SelectButton
        v-model="selectedPeriod"
        :options="periodOptions"
        option-label="label"
        option-value="value"
        @change="handlePeriodChange"
      />
    </div>

    <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 3px" />

    <template v-if="!isLoading && dashboard">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <Card class="stat-card stat-card--revenue">
          <div class="stat-card__icon">
            <i class="pi pi-dollar" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Total Revenue</span>
            <span class="stat-card__value">{{ dashboard.stats.revenue_formatted }}</span>
          </div>
        </Card>

        <Card class="stat-card stat-card--orders">
          <div class="stat-card__icon">
            <i class="pi pi-shopping-cart" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Total Orders</span>
            <span class="stat-card__value">{{ dashboard.stats.orders_formatted }}</span>
          </div>
        </Card>

        <Card class="stat-card stat-card--users">
          <div class="stat-card__icon">
            <i class="pi pi-users" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Total Users</span>
            <span class="stat-card__value">{{ dashboard.stats.users_formatted }}</span>
          </div>
        </Card>

        <Card class="stat-card stat-card--pending">
          <div class="stat-card__icon">
            <i class="pi pi-clock" />
          </div>
          <div class="stat-card__content">
            <span class="stat-card__label">Pending Orders</span>
            <span class="stat-card__value">{{ dashboard.stats.pending_formatted }}</span>
          </div>
        </Card>
      </div>

      <!-- Charts Row -->
      <div class="charts-grid">
        <Card title="Revenue">
          <RevenueChart :data="dashboard.revenue" />
        </Card>
        <Card title="Orders">
          <OrdersChart :data="dashboard.orders" />
        </Card>
      </div>

      <!-- Bottom Row: Top Products + Activity -->
      <div class="bottom-grid">
        <Card title="Top Products">
          <template #content>
            <DataTable :value="dashboard.topProducts" table-style="width: 100%">
              <template #empty>No top products found.</template>
              <template #body="{ data, field }">
                <div class="table-row" v-if="field === 'product_name'">
                  <strong>{{ data[field] }}</strong>
                </div>
                <div v-else>{{ data[field] }}</div>
              </template>
            </DataTable>
          </template>
        </Card>

        <Card title="Recent Activity">
          <template #content>
            <Timeline :value="dashboard.recentActivity" align="alternate">
              <template #marker="slotProps">
                <span class="p-timeline-event-marker p-tag p-tag-info">
                  <i class="pi pi-activity" />
                </span>
              </template>
              <template #content="slotProps">
                <div class="activity-item">
                  <div class="activity-item__description">
                    {{ slotProps.item.description }}
                  </div>
                  <div class="activity-item__meta">
                    <span class="activity-item__user">
                      {{ slotProps.item.user_name || 'System' }}
                    </span>
                    <span class="activity-item__time">
                      {{ slotProps.item.created_at }}
                    </span>
                  </div>
                </div>
              </template>
            </Timeline>
          </template>
        </Card>
      </div>
    </template>
  </div>
</template>
```

## Step 5 — Frontend: CSS

```css
.dashboard-page {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card__icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.stat-card--revenue .stat-card__icon { background: #dcfce7; color: #16a34a; }
.stat-card--orders .stat-card__icon { background: #dbeafe; color: #2563eb; }
.stat-card--users .stat-card__icon { background: #fef3c7; color: #d97706; }
.stat-card--pending .stat-card__icon { background: #fee2e2; color: #dc2626; }

.stat-card__content {
  display: flex;
  flex-direction: column;
}

.stat-card__label {
  font-size: 0.875rem;
  color: var(--p-text-200-color);
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 700;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.bottom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.activity-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-content-border-color);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item__meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--p-text-300-color);
  margin-top: 0.25rem;
}
```

## Step 6 — Testing

```bash
# Feature test: dashboard returns stats
it('returns dashboard stats for the given period', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('admin:dashboard');

    Order::factory()->count(10)->create([
        'status' => 'completed',
        'created_at' => now()->subDays(3),
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/dashboard?period=7d');

    $response->assertOk()
        ->assertJsonPath('data.stats.total_orders', 10);
});

# Feature test: dashboard filters by period
it('filters dashboard data by period', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('admin:dashboard');

    $oldOrder = Order::factory()->create(['created_at' => now()->subDays(60)]);
    $recentOrder = Order::factory()->create(['created_at' => now()->subDays(3)]);

    $response = $this->actingAs($user)->getJson('/api/v1/dashboard?period=7d');

    $response->assertOk()
        ->assertJsonPath('data.stats.total_orders', 1);
});

# Feature test: dashboard returns activity
it('returns recent activity', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('admin:dashboard');

    ActivityLog::factory()->count(5)->create();

    $response = $this->actingAs($user)->getJson('/api/v1/dashboard');

    $response->assertOk()
        ->assertJsonCount(5, 'data.recentActivity');
});
```

## Pitfalls

- **Not caching dashboard data** — Dashboard queries are expensive; cache results for 5-15 minutes
- **Missing authorization** — Dashboard is admin-only; always check permissions
- **N+1 queries on activity feed** — Use eager loading for `user` and `subject` relationships
- **Not handling empty data** — Show meaningful empty states for charts with no data
- **Hardcoding date ranges** — Use a date range mapping for different periods
- **Returning raw query results** — Always format currency and dates in the service
- **Not testing with different periods** — Test each period returns correct data
- **Missing loading state** — Show ProgressBar while loading dashboard data
- **Not handling auth failures** — Return 403 for non-admin users
- **Ignoring timezone** — Use `created_at` timezone consistently in queries
