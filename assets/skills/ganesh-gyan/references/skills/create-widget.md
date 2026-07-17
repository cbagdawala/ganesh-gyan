# Create Widget

Build a dashboard widget component for displaying specific metrics or data.

## Prerequisites

- [ ] Know the widget type (e.g., stats, chart, list, table, activity feed)
- [ ] Know the data source (API endpoint, static data, computed)
- [ ] Know if the widget needs real-time updates
- [ ] Know the widget dimensions (full width, half width, quarter width)
- [ ] Know the loading state behavior

## Step 1 — Backend: Widget Data Endpoint

```php
// app/Http/Controllers/Api/WidgetController.php
public function recentOrders(): JsonResponse
{
    $orders = Order::with(['user', 'items.product'])
        ->latest()
        ->limit(5)
        ->get()
        ->map(fn ($order) => [
            'id' => $order->id,
            'user_name' => $order->user?->name,
            'total' => $order->total_cents,
            'total_formatted' => '$' . number_format($order->total_cents / 100, 2),
            'status' => $order->status,
            'created_at' => $order->created_at->diffForHumans(),
        ]);

    return response()->json(['data' => $orders]);
}

public function topProducts(): JsonResponse
{
    $products = OrderItem::with('product')
        ->selectRaw('product_id, SUM(quantity) as total_quantity')
        ->groupBy('product_id')
        ->orderByDesc('total_quantity')
        ->limit(5)
        ->get()
        ->map(fn ($item) => [
            'product_id' => $item->product_id,
            'product_name' => $item->product->name,
            'total_quantity' => (int) $item->total_quantity,
        ]);

    return response()->json(['data' => $products]);
}

public function recentActivity(): JsonResponse
{
    $activities = ActivityLog::with(['user', 'subject'])
        ->latest()
        ->limit(10)
        ->get()
        ->map(fn ($log) => [
            'id' => $log->id,
            'action' => $log->action,
            'description' => $log->description,
            'user_name' => $log->user?->name,
            'created_at' => $log->created_at->diffForHumans(),
        ]);

    return response()->json(['data' => $activities]);
}
```

## Step 2 — Frontend: API Service

```typescript
// resources/js/api/services/widgetApi.ts
import api from '@/api/client'

export interface RecentOrder {
  id: number
  user_name: string
  total: number
  total_formatted: string
  status: string
  created_at: string
}

export interface TopProduct {
  product_id: number
  product_name: string
  total_quantity: number
}

export interface ActivityItem {
  id: number
  action: string
  description: string
  user_name: string
  created_at: string
}

export async function fetchRecentOrders(): Promise<RecentOrder[]> {
  const response = await api.get<{ data: RecentOrder[] }>('/widgets/recent-orders')
  return response.data.data
}

export async function fetchTopProducts(): Promise<TopProduct[]> {
  const response = await api.get<{ data: TopProduct[] }>('/widgets/top-products')
  return response.data.data
}

export async function fetchRecentActivity(): Promise<ActivityItem[]> {
  const response = await api.get<{ data: ActivityItem[] }>('/widgets/recent-activity')
  return response.data.data
}
```

## Step 3 — Frontend: Stats Widget

Create `resources/js/components/widgets/StatsWidget.vue`:

```vue
<script setup lang="ts">
import Card from 'primevue/card'

interface Props {
  title: string
  value: string | number
  icon: string
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  trend: () => ({ value: 0, isPositive: true }),
  subtitle: '',
})
</script>

<template>
  <Card class="stats-widget">
    <div class="stats-widget__content">
      <div class="stats-widget__icon" :class="`stats-widget__icon--${icon}`">
        <i :class="`pi ${icon}`" />
      </div>
      <div class="stats-widget__info">
        <span class="stats-widget__title">{{ title }}</span>
        <span class="stats-widget__value">{{ value }}</span>
        <div v-if="trend" class="stats-widget__trend" :class="{ 'stats-widget__trend--positive': trend.isPositive, 'stats-widget__trend--negative': !trend.isPositive }">
          <i :class="trend.isPositive ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" />
          {{ Math.abs(trend.value) }}%
        </div>
        <span v-if="subtitle" class="stats-widget__subtitle">{{ subtitle }}</span>
      </div>
    </div>
  </Card>
</template>
```

## Step 4 — Frontend: Recent Orders Widget

Create `resources/js/components/widgets/RecentOrdersWidget.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import { fetchRecentOrders } from '@/api/services/widgetApi'
import type { RecentOrder } from '@/api/services/widgetApi'

const orders = ref<RecentOrder[]>([])
const isLoading = ref(false)

async function loadOrders() {
  isLoading.value = true
  try {
    orders.value = await fetchRecentOrders()
  } catch {
    // handle error
  } finally {
    isLoading.value = false
  }
}

function getStatusSeverity(status: string): string {
  const severityMap: Record<string, string> = {
    completed: 'success',
    processing: 'info',
    pending: 'warn',
    cancelled: 'danger',
  }
  return severityMap[status] || 'info'
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

onMounted(() => loadOrders())
</script>

<template>
  <Card title="Recent Orders">
    <template #footer>
      <a href="/orders" class="widget-link">View All Orders</a>
    </template>

    <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 3px" />

    <DataTable v-else :value="orders" table-style="width: 100%" :empty-message="'No recent orders.'">
      <Column field="user_name" header="Customer">
        <template #body="{ data }">
          {{ data.user_name || 'Guest' }}
        </template>
      </Column>
      <Column field="total_formatted" header="Total" />
      <Column field="status" header="Status">
        <template #body="{ data }">
          <Tag :value="formatStatus(data.status)" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>
      <Column field="created_at" header="Time" />
    </DataTable>
  </Card>
</template>
```

## Step 5 — Frontend: Activity Feed Widget

Create `resources/js/components/widgets/ActivityFeedWidget.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from 'primevue/card'
import Timeline from 'primevue/timeline'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import { fetchRecentActivity } from '@/api/services/widgetApi'
import type { ActivityItem } from '@/api/services/widgetApi'

const activities = ref<ActivityItem[]>([])
const isLoading = ref(false)

async function loadActivity() {
  isLoading.value = true
  try {
    activities.value = await fetchRecentActivity()
  } catch {
    // handle error
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadActivity())
</script>

<template>
  <Card title="Recent Activity">
    <template #footer>
      <a href="/activity" class="widget-link">View All Activity</a>
    </template>

    <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 3px" />

    <Timeline v-else :value="activities" align="alternate" class="activity-timeline">
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
            <span class="activity-item__user">{{ slotProps.item.user_name || 'System' }}</span>
            <span class="activity-item__time">{{ slotProps.item.created_at }}</span>
          </div>
        </div>
      </template>
    </Timeline>
  </Card>
</template>
```

## Step 6 — Dashboard Page Using Widgets

```vue
<!-- resources/js/pages/dashboard/DashboardPage.vue -->
<script setup lang="ts">
import StatsWidget from '@/components/widgets/StatsWidget.vue'
import RecentOrdersWidget from '@/components/widgets/RecentOrdersWidget.vue'
import ActivityFeedWidget from '@/components/widgets/ActivityFeedWidget.vue'
import TopProductsWidget from '@/components/widgets/TopProductsWidget.vue'
</script>

<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2>Dashboard</h2>
    </div>

    <!-- Stats Row -->
    <div class="stats-grid">
      <StatsWidget
        title="Total Revenue"
        value="$12,450.00"
        icon="pi pi-dollar"
        :trend="{ value: 12.5, isPositive: true }"
      />
      <StatsWidget
        title="Total Orders"
        value="342"
        icon="pi pi-shopping-cart"
        :trend="{ value: 8.2, isPositive: true }"
      />
      <StatsWidget
        title="Total Users"
        value="1,234"
        icon="pi pi-users"
        :trend="{ value: 5.1, isPositive: true }"
      />
      <StatsWidget
        title="Pending Orders"
        value="23"
        icon="pi pi-clock"
        :trend="{ value: 2.3, isPositive: false }"
      />
    </div>

    <!-- Widgets Row -->
    <div class="widgets-grid">
      <div class="widget-col widget-col--full">
        <RecentOrdersWidget />
      </div>
      <div class="widget-col">
        <ActivityFeedWidget />
      </div>
      <div class="widget-col">
        <TopProductsWidget />
      </div>
    </div>
  </div>
</template>
```

## Step 7 — Testing

```bash
# Feature test: widget data endpoints

it('returns recent orders', function () {
    Order::factory()->count(5)->create();

    $response = $this->getJson('/api/v1/widgets/recent-orders');

    $response->assertOk()
        ->assertJsonCount(5, 'data');
});

it('returns top products', function () {
    OrderItem::factory()->count(5)->create();

    $response = $this->getJson('/api/v1/widgets/top-products');

    $response->assertOk()
        ->assertJsonStructure(['data']);
});

it('returns recent activity', function () {
    ActivityLog::factory()->count(10)->create();

    $response = $this->getJson('/api/v1/widgets/recent-activity');

    $response->assertOk()
        ->assertJsonCount(10, 'data');
});

# Feature test: widget limits results

it('limits recent orders to 5', function () {
    Order::factory()->count(10)->create();

    $response = $this->getJson('/api/v1/widgets/recent-orders');

    $response->assertOk()
        ->assertJsonCount(5, 'data');
});
```

## Pitfalls

- **Not loading data asynchronously** — Use `onMounted` to fetch widget data
- **Missing loading state** — Show ProgressBar or skeleton while loading
- **Not handling empty data** — Show meaningful empty messages
- **Hardcoding widget data** — Always fetch from API for real data
- **Not including timestamps** — Include created_at for time-based widgets
- **Missing navigation links** — Add "View All" links in widget footers
- **Not formatting currency** — Always format currency values consistently
- **Not handling auth failures** — Return 401 for unauthenticated requests
- **Not testing widget data** — Always test API endpoints return correct data
- **Missing error handling** — Handle API errors gracefully
- **Not using Timeline for activity** — Use PrimeVue Timeline for chronological data
- **Not caching widget data** — Cache widget data for 5-15 minutes to reduce API calls
