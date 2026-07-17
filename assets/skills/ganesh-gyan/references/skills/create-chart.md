# Create Chart

Build a chart component with PrimeVue Chart.js integration for displaying data visually.

## Prerequisites

- [ ] Know the chart type (bar, line, pie, doughnut, radar, polar area)
- [ ] Know the data to display (e.g., revenue over time, category breakdown)
- [ ] Know the time period (daily, weekly, monthly)
- [ ] Know if the chart needs interactive features (tooltips, zoom, legend)
- [ ] Know the color scheme (default, theme-based, custom)

## Step 1 — Install Chart.js

The Vue components below use the `vue-chartjs` wrapper, so install both packages:

```bash
npm install chart.js vue-chartjs
```

## Step 2 — Backend: Chart Data Endpoint

```php
// app/Http/Controllers/Api/ChartController.php
public function revenueChart(Request $request): JsonResponse
{
    $period = $request->validated('period', '30d');
    $dateRange = $this->getDateRange($period);

    $data = Order::where('status', 'completed')
        ->whereBetween('created_at', $dateRange)
        ->selectRaw('DATE(created_at) as date, SUM(total_cents) as revenue, COUNT(*) as orders')
        ->groupByRaw('DATE(created_at)')
        ->orderBy('date')
        ->get()
        ->map(fn ($row) => [
            'date' => $row->date->format('Y-m-d'),
            'revenue' => (int) $row->revenue,
            'revenue_formatted' => '$' . number_format((int) $row->revenue / 100, 2),
            'orders' => (int) $row->orders,
        ])
        ->toArray();

    return response()->json(['data' => $data]);
}

public function categoryChart(): JsonResponse
{
    $data = Order::where('status', 'completed')
        ->join('order_items', 'orders.id', '=', 'order_items.order_id')
        ->join('products', 'order_items.product_id', '=', 'products.id')
        ->join('categories', 'products.category_id', '=', 'categories.id')
        ->select('categories.name', DB::raw('COUNT(*) as count'), DB::raw('SUM(order_items.total_cents) as revenue'))
        ->groupBy('categories.id', 'categories.name')
        ->orderByDesc('revenue')
        ->get()
        ->map(fn ($row) => [
            'category' => $row->name,
            'count' => (int) $row->count,
            'revenue' => (int) $row->revenue,
            'revenue_formatted' => '$' . number_format((int) $row->revenue / 100, 2),
        ])
        ->toArray();

    return response()->json(['data' => $data]);
}

public function orderStatusChart(): JsonResponse
{
    $data = Order::select('status', DB::raw('COUNT(*) as count'))
        ->groupBy('status')
        ->get()
        ->map(fn ($row) => [
            'status' => ucfirst($row->status),
            'count' => (int) $row->count,
        ])
        ->toArray();

    return response()->json(['data' => $data]);
}
```

## Step 3 — Frontend: TypeScript Types

```typescript
// resources/js/types/chart.ts
export interface RevenueChartPoint {
  date: string
  revenue: number
  revenue_formatted: string
  orders: number
}

export interface CategoryChartPoint {
  category: string
  count: number
  revenue: number
  revenue_formatted: string
}

export interface OrderStatusChartPoint {
  status: string
  count: number
}

export interface ChartColors {
  background: string[]
  border: string[]
}
```

## Step 4 — Frontend: API Service

```typescript
// resources/js/api/services/chartApi.ts
import api from '@/api/client'
import type { RevenueChartPoint, CategoryChartPoint, OrderStatusChartPoint } from '@/types/chart'

export async function fetchRevenueChartData(
  params: { period?: string } = {},
): Promise<RevenueChartPoint[]> {
  const response = await api.get<{ data: RevenueChartPoint[] }>('/charts/revenue', {
    params: { period: params.period || '30d' },
  })
  return response.data.data
}

export async function fetchCategoryChartData(): Promise<CategoryChartPoint[]> {
  const response = await api.get<{ data: CategoryChartPoint[] }>('/charts/categories')
  return response.data.data
}

export async function fetchOrderStatusChartData(): Promise<OrderStatusChartPoint[]> {
  const response = await api.get<{ data: OrderStatusChartPoint[] }>('/charts/order-status')
  return response.data.data
}
```

## Step 5 — Frontend: Chart Component (Bar Chart)

Create `resources/js/components/charts/RevenueChart.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { fetchRevenueChartData } from '@/api/services/chartApi'
import type { RevenueChartPoint } from '@/types/chart'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler)

interface Props {
  period?: string
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  period: '30d',
  height: 300,
})

const chartData = ref<RevenueChartPoint[]>([])
const isLoading = ref(false)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
    },
    title: {
      display: true,
      text: `Revenue Overview (${props.period === '7d' ? 'Last 7 Days' : props.period === '30d' ? 'Last 30 Days' : 'Last 90 Days'})`,
      font: { size: 16 },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        // The dataset is already converted to dollars (revenue / 100), so the axis
        // value is dollars — do NOT divide by 100 again here.
        callback: (value: number) => `$${value.toFixed(2)}`,
      },
    },
    x: {
      ticks: {
        maxRotation: 45,
        minRotation: 45,
      },
    },
  },
}))

const chartDataObject = computed(() => ({
  labels: chartData.value.map((point) => point.date),
  datasets: [
    {
      label: 'Revenue ($)',
      data: chartData.value.map((point) => point.revenue / 100),
      backgroundColor: 'rgba(37, 99, 235, 0.6)',
      borderColor: 'rgba(37, 99, 235, 1)',
      borderWidth: 1,
    },
  ],
}))

async function loadChartData() {
  isLoading.value = true
  try {
    chartData.value = await fetchRevenueChartData({ period: props.period })
  } catch {
    // handle error
  } finally {
    isLoading.value = false
  }
}

watch(() => props.period, () => loadChartData())

onMounted(() => loadChartData())
</script>

<template>
  <div class="revenue-chart" :style="{ height: height + 'px' }">
    <Bar v-if="!isLoading && chartDataObject" :options="chartOptions" :data="chartDataObject" />
    <div v-else-if="isLoading" class="chart-loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    </div>
    <div v-else class="chart-empty">
      <p>No revenue data available.</p>
    </div>
  </div>
</template>
```

## Step 6 — Frontend: Chart Component (Pie Chart)

Create `resources/js/components/charts/CategoryPieChart.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Chart as ChartJS, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { fetchCategoryChartData } from '@/api/services/chartApi'
import type { CategoryChartPoint } from '@/types/chart'

ChartJS.register(ArcElement, Title, Tooltip, Legend)

const chartData = ref<CategoryChartPoint[]>([])
const isLoading = ref(false)

const colors = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#65a30d', '#ca8a04',
]

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
    },
    title: {
      display: true,
      text: 'Revenue by Category',
      font: { size: 16 },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.label}: $${context.parsed.toLocaleString()}`,
      },
    },
  },
}))

const chartDataObject = computed(() => ({
  labels: chartData.value.map((point) => point.category),
  datasets: [
    {
      data: chartData.value.map((point) => point.revenue / 100),
      backgroundColor: colors.slice(0, chartData.value.length),
      borderWidth: 2,
      borderColor: '#ffffff',
    },
  ],
}))

async function loadChartData() {
  isLoading.value = true
  try {
    chartData.value = await fetchCategoryChartData()
  } catch {
    // handle error
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadChartData())
</script>

<template>
  <div class="category-pie-chart" style="height: 300px">
    <Doughnut v-if="!isLoading && chartDataObject" :options="chartOptions" :data="chartDataObject" />
    <div v-else-if="isLoading" class="chart-loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    </div>
    <div v-else class="chart-empty">
      <p>No category data available.</p>
    </div>
  </div>
</template>
```

## Step 7 — Frontend: Line Chart Component

Create `resources/js/components/charts/OrderLineChart.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'vue-chartjs'
import { fetchRevenueChartData } from '@/api/services/chartApi'
import type { RevenueChartPoint } from '@/types/chart'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

interface Props {
  period?: string
  height?: number
  showFiller?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  period: '30d',
  height: 300,
  showFiller: true,
})

const chartData = ref<RevenueChartPoint[]>([])
const isLoading = ref(false)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
    },
    title: {
      display: true,
      text: `Orders Over Time (${props.period === '7d' ? 'Last 7 Days' : props.period === '30d' ? 'Last 30 Days' : 'Last 90 Days'})`,
      font: { size: 16 },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `Orders: ${context.parsed.y}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
      },
    },
    x: {
      ticks: {
        maxRotation: 45,
        minRotation: 45,
      },
    },
  },
}))

const chartDataObject = computed(() => ({
  labels: chartData.value.map((point) => point.date),
  datasets: [
    {
      label: 'Orders',
      data: chartData.value.map((point) => point.orders),
      borderColor: 'rgba(22, 163, 74, 1)',
      backgroundColor: props.showFiller ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
      fill: props.showFiller,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
}))

async function loadChartData() {
  isLoading.value = true
  try {
    chartData.value = await fetchRevenueChartData({ period: props.period })
  } catch {
    // handle error
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadChartData())
</script>

<template>
  <div class="order-line-chart" :style="{ height: height + 'px' }">
    <Line v-if="!isLoading && chartDataObject" :options="chartOptions" :data="chartDataObject" />
    <div v-else-if="isLoading" class="chart-loading">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem" />
    </div>
    <div v-else class="chart-empty">
      <p>No order data available.</p>
    </div>
  </div>
</template>
```

## Step 8 — Testing

```bash
# Feature test: chart data endpoints

it('returns revenue chart data', function () {
    Order::factory()->count(10)->create(['status' => 'completed']);

    $response = $this->getJson('/api/v1/charts/revenue?period=7d');

    $response->assertOk()
        ->assertJsonStructure(['data']);
});

it('returns category chart data', function () {
    $response = $this->getJson('/api/v1/charts/categories');

    $response->assertOk()
        ->assertJsonStructure(['data']);
});

it('returns order status chart data', function () {
    $response = $this->getJson('/api/v1/charts/order-status');

    $response->assertOk()
        ->assertJsonStructure(['data']);
});

# Frontend: test chart renders with data

it('renders revenue chart with data', () => {
  // mount RevenueChart component with mock data
  // assert chart is rendered
});

it('shows loading state while fetching data', () => {
  // mount RevenueChart component
  // assert loading spinner is visible
});

it('shows empty state when no data', () => {
  // mount RevenueChart component with empty data
  // assert empty message is visible
});
```

## Pitfalls

- **Not registering Chart.js components** — Must register ChartJS components before using them
- **Not handling loading state** — Show spinner while fetching chart data
- **Not handling empty data** — Show meaningful empty message when no data
- **Hardcoding chart colors** — Use theme colors or configurable colors
- **Not making charts responsive** — Use `responsive: true` and `maintainAspectRatio: false`
- **Missing tooltip formatting** — Format currency and numbers in tooltips
- **Not caching chart data** — Cache chart data for 5-15 minutes to reduce API calls
- **Not testing chart rendering** — Always test chart renders with mock data
- **Using wrong chart type for data** — Use bar for comparisons, line for trends, pie for proportions
- **Not handling resize** — Charts should resize with container
- **Missing error handling** — Handle API errors gracefully
- **Not providing period selector** — Allow users to change time period
- **Not optimizing large datasets** — Aggregate data for large time ranges
- **Not using vue-chartjs** — Use vue-chartjs wrapper for proper Vue integration
