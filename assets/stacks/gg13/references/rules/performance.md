# Performance Optimization

> Builds on `references/principles/performance.md` — read it first. This file covers how to apply it on Laravel 13 + Vue 3.5.

## Eager Loading Relationships

### Avoid N+1 Queries

Use `with()` for explicit loading and `$with` for default loading.

```php
// Bad — N+1 query problem
$users = User::all();
foreach ($users as $user) {
    echo $user->profile->bio; // Query per user
}

// Good — eager loaded
$users = User::with('profile')->get();
```

### Using with() Selectively

Use `with()` with column selection when possible:

```php
// Good — selective eager loading with columns.
// You MUST include the foreign key that links the relation (here user_id on
// profiles), otherwise Eloquent cannot match the loaded rows and the relation
// comes back null.
$users = User::with('profile:id,user_id,bio,avatar_url')->paginate();

// Good — conditional eager loading
$users = User::query();
if ($request->boolean('with_orders')) {
    $users->with('orders');
}
if ($request->boolean('with_reviews')) {
    $users->with('reviews');
}
return $users->paginate();
```

### Default Eager Loading

Define `$with` for relationships always needed:

```php
class User extends Authenticatable
{
    protected $with = ['profile', 'settings'];

    // Relationships needed for every response
    // Avoid adding heavy relationships like `orders` here
}
```

### Lazy Eager Loading

Use `loadMissing()` for relationships not always needed:

```php
$user = User::find($id);
if ($request->boolean('include_orders')) {
    $user->loadMissing('orders');
}
```

## Query Caching with Redis

### Cache Expensive Queries

```php
class UserService
{
    public function getPopularUsers(int $limit = 10): Collection
    {
        return Cache::remember('popular_users:' . $limit, 3600, function () use ($limit) {
            return User::withCount('orders')
                ->orderByDesc('orders_count')
                ->limit($limit)
                ->get();
        });
    }
}
```

### Cache Invalidation

```php
class OrderService
{
    public function create(CreateOrderDto $dto): Order
    {
        $order = Order::create($dto->toArray());

        // Invalidate related caches
        Cache::forget('popular_users:10');
        Cache::tags(['orders', "user:{$dto->user_id}"])->flush();

        return $order;
    }
}
```

### Tagged Cache for Related Invalidation

```php
// Store with tags
Cache::tags(['users', 'admin-users'])->put('admin_list', $users, 1800);

// Invalidate all admin user caches
Cache::tags(['admin-users'])->flush();
```

## Vue Component Lazy Loading

### Route-Level Lazy Loading

Already covered in `vue.md` — use dynamic imports for all routes:

```typescript
{
    path: 'reports',
    component: () => import('@/pages/ReportsPage.vue'),
}
```

### Component-Level Lazy Loading

Lazy-load heavy components (charts, large tables):

```typescript
import { defineAsyncComponent } from 'vue'

const RevenueChart = defineAsyncComponent(() =>
    import('@/components/charts/RevenueChart.vue')
)

const AnalyticsDashboard = defineAsyncComponent(() =>
    import('@/components/analytics/AnalyticsDashboard.vue')
)
```

### Preload Critical Components

Preload components used in the initial view:

```typescript
// vite.config.ts
export default defineConfig({
    optimizeDeps: {
        include: ['primevue/button', 'primevue/inputtext'],
    },
})
```

## PrimeVue Virtual Scrolling

Use virtual scrolling for large lists (>100 items):

```vue
<template>
  <VirtualScroller
    :value="items"
    :itemSize="50"
    :style="{ height: '500px' }"
    item-size="50"
  >
    <template #default="{ item }">
      <div class="list-item">
        {{ item.name }}
      </div>
    </template>
  </VirtualScroller>
</template>

<script setup lang="ts">
import VirtualScroller from 'primevue/virtualscroller'
</script>
```

For DataTable with large datasets:

```vue
<template>
  <DataTable
    :value="items"
    virtual-scroll
    :scroll-height="500"
    :rows="50"
    @virtual-scroll="onVirtualScroll"
  >
    <Column field="name" header="Name" />
    <Column field="email" header="Email" />
  </DataTable>
</template>
```

## Database Indexing Strategy

### Add Indexes Proactively

```php
// Migrations — add indexes on commonly queried columns
$table->foreignId('user_id')->constrained()->index();
$table->string('status', 20)->index();
$table->dateTime('shipped_at')->index();
$table->string('email')->unique()->index();
```

### Composite Indexes

```php
// For queries filtering on multiple columns
$table->index(['user_id', 'status', 'created_at']);

// Use when common query pattern is:
// WHERE user_id = ? AND status = ? ORDER BY created_at DESC
```

### Avoid Over-Indexing

Monitor slow queries with Laravel's query log or Telescope before adding an index.

## API Response Caching

### HTTP Caching Headers

Cache public, read-only endpoints:

```php
public function index(IndexProductRequest $request): JsonResource
{
    $products = Product::active()->paginate();

    return response()
        ->json(ProductResource::collection($products))
        ->setMaxAge(300)          // 5 minutes
        ->setPublic();
}
```

### Server-Side Response Caching

Cache expensive resource collections:

```php
class ProductService
{
    public function listForCategory(int $categoryId, int $perPage = 20): LengthAwarePaginator
    {
        return Cache::remember(
            "products:category:{$categoryId}:page:{$perPage}",
            600, // 10 minutes
            fn () => Product::where('category_id', $categoryId)
                ->active()
                ->paginate($perPage)
        );
    }
}
```

## Asset Optimization with Vite

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
    plugins: [vue()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'primevue': ['primevue/button', 'primevue/datatable'],
                    'vendor': ['vue', 'vue-router', 'pinia', 'axios'],
                },
            },
        },
        chunkSizeWarningLimit: 500,
        minify: 'esbuild',
    },
})
```

### Tree-Shaking

Import components individually (already done in PrimeVue config):

```typescript
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
// NOT: import * as PrimeVue from 'primevue'
```

## Queue Job Optimization

### Batch Jobs

Process items in batches instead of individual jobs:

```php
class ProcessOrderItemsJob implements ShouldQueue
{
    public function handle(InventoryService $inventory): void
    {
        $items = OrderItem::whereIn('order_id', $this->orderIds)
            ->where('processed', false)
            ->get();

        $inventory->reserve($items);
        OrderItem::whereIn('id', $items->pluck('id'))->update(['processed' => true]);
    }
}

// Dispatch batch
ProcessOrderItemsJob::dispatch($orderIds)->onQueue('inventory');
```

### Job Chaining

Chain dependent jobs:

```php
ProcessOrderJob::chain([
    new ReserveInventoryJob($orderId),
    new ChargePaymentJob($orderId),
    new ShipOrderJob($orderId),
    new SendConfirmationEmailJob($orderId),
])->dispatch()->onQueue('orders');
```

### Monitoring

Use Laravel Horizon for queue monitoring:

```php
// config/horizon.php
return [
    'environments' => [
        'production' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['orders', 'payments', 'notifications'],
                'balance' => 'auto',
                'minProcesses' => 2,
                'maxProcesses' => 10,
            ],
        ],
    ],
];
```

## General Guidelines

1. **Profile with Laravel Telescope** to identify bottlenecks before optimizing
2. **Use Collections** over raw arrays where beneficial
3. **Monitor** with Query Monitor or Telescope for ongoing performance tracking
