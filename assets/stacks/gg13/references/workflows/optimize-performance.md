# Optimize Performance

## When to Use

When diagnosing and fixing performance issues: N+1 queries, caching, eager loading, indexing, lazy loading images, and virtual scrolling for large datasets.

## Prerequisites

- Laravel 13 application with performance issues identified
- Query debugging tools available (Laravel Debugbar, Clockwork, Telescope)
- MySQL database with existing indexes

## Step-by-Step Workflow

### 1. Identify Performance Issues

**Using Laravel Debugbar:**
```bash
composer require barryvdh/laravel-debugbar --dev
```

**Using Telescope (separate first-party package — not bundled with Laravel):**
```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

**Check for N+1 queries:**
```bash
composer require beyondcode/laravel-query-detector --dev
```

In `app/Providers/AppServiceProvider.php`:
```php
use Illuminate\Database\Eloquent\Model;

public function boot(): void
{
    if (app()->environment('local', 'staging')) {
        Model::handleLazyLoadingViolationUsing(function ($model, $relation) {
            report(new LazyLoadingViolationException($model, $relation));
        });
    }
}
```

### 2. Fix N+1 Queries with Eager Loading

**Before (N+1):**
```php
public function index()
{
    $users = User::all(); // This triggers N+1 for posts
    return $users;
}
```

**After (Eager Loading):**
```php
public function index()
{
    return User::with('posts', 'posts.comments')
        ->withCount('posts')
        ->withAvg('posts', 'created_at')
        ->latest()
        ->paginate();
}
```

**Conditional eager loading:**
```php
public function index(Request $request)
{
    $query = User::query();

    if ($request->boolean('with_posts')) {
        $query->with('posts');
    }

    return $query->latest()->paginate();
}
```

### 3. Add Database Indexes

```bash
php artisan make:migration add_indexes_to_<table>_table --table=<table>
```

```php
Schema::table('<table>', function (Blueprint $table) {
    // Single column index
    $table->index('email');

    // Composite index
    $table->index(['status', 'created_at'], 'status_created_idx');

    // Unique index
    $table->unique(['email', 'verified_at']);

    // NOTE: MySQL has no partial indexes. The `->where(...)` modifier is
    // PostgreSQL-only. On MySQL, index the column and let the query planner
    // use it, or add a generated column to index a subset.
    $table->index(['status'], 'status_idx');
});
```

### 4. Implement Caching

```php
use Illuminate\Support\Facades\Cache;

public function index(Request $request)
{
    $cacheKey = "users_{$request->page}_{$request->per_page}";

    return Cache::remember($cacheKey, 3600, function () use ($request) {
        return User::latest()
            ->paginate($request->get('per_page', 15));
    });
}

// Cache tags (long-standing Laravel feature, NOT new in Laravel 11).
// Tags are only supported by drivers that track keys — redis, memcached,
// dynamodb, array. They are NOT available on the `file` or `database` drivers.
Cache::tags(['users', 'public'])->remember('users_list', 3600, function () {
    return User::all();
});
```

### 5. Optimize Query with Select and Chunk

**Select only needed columns:**
```php
public function index()
{
    return User::select('id', 'name', 'email')
        ->latest()
        ->paginate();
}
```

**Use chunk for large datasets:**
```php
public function export()
{
    $count = 0;
    User::chunk(1000, function ($users) use (&$count) {
        foreach ($users as $user) {
            // Process user
            $count++;
        }
    });
    return $count;
}
```

### 6. Implement Query Scopes for Reusable Logic

```php
// In Model
class <Model> extends Model
{
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
        });
    }

    public function scopeWithRecentActivity(Builder $query): Builder
    {
        return $query->with(['activities' => function ($q) {
            $q->latest()->take(5);
        }]);
    }
}

// Usage
<Model>::active()->search('john')->withRecentActivity()->paginate();
```

### 7. Lazy Loading Images in Vue

```vue
<script setup>
import { ref } from 'vue';
import Image from 'primevue/image';

const images = ref([
    { src: '/images/large-1.jpg', alt: 'Image 1' },
    { src: '/images/large-2.jpg', alt: 'Image 2' },
]);
</script>

<template>
    <div class="image-grid">
        <Image
            v-for="img in images"
            :key="img.src"
            :src="img.src"
            :alt="img.alt"
            loading="lazy"
            width="300"
            height="200"
            class="lazy-image"
        />
    </div>
</template>

<style scoped>
.lazy-image {
    opacity: 0;
    transition: opacity 0.3s ease;
}
.lazy-image.loaded {
    opacity: 1;
}
</style>
```

### 8. Virtual Scrolling for Large Lists

```vue
<script setup>
import { computed } from 'vue';
import VirtualScroller from 'primevue/virtualscroller';

const props = defineProps({
    items: { type: Array, required: true },
});

const virtualItems = computed(() => {
    return props.items.map((item, index) => ({
        ...item,
        index,
        style: `height: 50px`,
    }));
});
</script>

<template>
    <VirtualScroller
        :value="virtualItems"
        :itemSize="50"
        :style="{ height: '500px' }"
        itemStyle="height: 50px"
    >
        <template #default="{ item }">
            <div class="virtual-item">
                {{ item.name }}
            </div>
        </template>
    </VirtualScroller>
</template>
```

### 9. Database Query Optimization

**Use `exists()` instead of `count()`:**
```php
// Before
if (Post::where('user_id', $userId)->count() > 0) { ... }

// After
if (Post::where('user_id', $userId)->exists()) { ... }
```

**Use `pluck()` for single column:**
```php
// Before
$names = User::all()->pluck('name');

// After
$names = User::pluck('name');
```

**Use `inRandomOrder()->take(n)` for small samples:**
```php
$randomUsers = User::inRandomOrder()->take(5)->get();
```

### 10. Profile with Xdebug + Blackfire (Optional)

```bash
# Using Laravel profiling
php artisan about
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Artisan Commands Reference

```bash
composer require barryvdh/laravel-debugbar --dev
composer require beyondcode/laravel-query-detector --dev
php artisan debugbar:clear
php artisan optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan cache:clear
php artisan cache:prune
php artisan test --filter=Performance
```

## Verification Checklist

- [ ] N+1 queries detected and fixed
- [ ] Eager loading applied to all relationships
- [ ] Indexes added to frequently queried columns
- [ ] Query profiler shows reduced query count
- [ ] Cache working (check hit/miss ratio)
- [ ] Images lazy loaded
- [ ] Large lists use virtual scrolling
- [ ] Response times improved
- [ ] Memory usage reduced
- [ ] Database query time reduced
- [ ] All tests still pass after optimizations
