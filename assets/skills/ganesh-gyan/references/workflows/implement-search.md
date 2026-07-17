# Implement Search

## When to Use

When implementing search functionality: full-text database indexes, model scopes, API endpoints, and Vue search component with debouncing.

## Prerequisites

- Laravel 13 with MySQL database
- Vue 3 + PrimeVue installed
- Existing resource with searchable fields

## Step-by-Step Workflow

### 1. Create Full-Text Index Migration

```bash
php artisan make:migration add_fulltext_index_to_<table>_table --table=<table>
```

```php
Schema::table('<table>', function (Blueprint $table) {
    $table->fullText(['name', 'description'], 'search_index');
});
```

For Laravel 11+, this uses the native MySQL full-text index. For multiple columns, define them in a single `fullText()` call.

### 2. Add Scope to Model

In `app/Models/<Model>.php`:

```php
public function scopeSearch(Builder $query, ?string $search): Builder
{
    if (empty($search)) {
        return $query;
    }

    return $query->whereRaw(
        "MATCH(name, description, email) AGAINST(? IN BOOLEAN MODE)",
        [$search]
    );
}

public function scopeFilterStatus(Builder $query, ?string $status): Builder
{
    if ($status) {
        return $query->where('status', $status);
    }
    return $query;
}
```

### 3. Add Search to Controller

In `app/Http/Controllers/<Model>Controller.php`:

```php
public function index(Request $request)
{
    $query = <Model>::query()
        ->search($request->input('search'))
        ->filterStatus($request->input('status'))
        ->latest();

    $items = $query->paginate($request->get('per_page', 15));

    return response()->json($items);
}
```

### 4. Add Search Validation

In `app/Http/Requests/Store<Model>Request.php` or directly in controller:

```php
$search = $request->string('search')->min(2)->max(100)->get();
```

Or in the request class rules:
```php
public function rules(): array
{
    return [
        'search' => 'sometimes|string|min:2|max:100',
        'status' => 'sometimes|string|in:active,inactive,pending',
    ];
}
```

### 5. Register Search Route (if separate endpoint needed)

```php
Route::get('/search', [SearchController::class, 'index']);
```

### 6. Create Search API Controller

```bash
php artisan make:controller SearchController
```

```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->input('q', '');

        if (strlen($query) < 2) {
            return response()->json([]);
        }

        $results = DB::table('models')
            ->select('id', 'name', 'description', 'email')
            ->whereRaw("MATCH(name, description) AGAINST(? IN BOOLEAN MODE)", [$query])
            ->limit(20)
            ->get()
            ->toArray();

        return response()->json([
            'query' => $query,
            'results' => $results,
            'count' => count($results),
        ]);
    }
}
```

### 7. Create Vue Search Component

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import api from '@/api/client';
import InputText from 'primevue/inputtext';
import AutoComplete from 'primevue/autocomplete';
import Listbox from 'primevue/listbox';
import Button from 'primevue/button';

const query = ref('');
const results = ref([]);
const loading = ref(false);
const debounceTimer = ref(null);
const MIN_QUERY_LENGTH = 2;

const search = async (q) => {
    if (q.length < MIN_QUERY_LENGTH) {
        results.value = [];
        return;
    }

    loading.value = true;
    try {
        const { data } = await api.get('/search', { params: { q } });
        results.value = data.results || [];
    } catch {
        results.value = [];
    }
    loading.value = false;
};

const debouncedSearch = (value) => {
    if (debounceTimer.value) {
        clearTimeout(debounceTimer.value);
    }
    debounceTimer.value = setTimeout(() => search(value), 300);
};

onUnmounted(() => {
    if (debounceTimer.value) clearTimeout(debounceTimer.value);
});
</script>

<template>
    <div class="search-container">
        <InputText
            v-model="query"
            placeholder="Search..."
            icon="pi pi-search"
            fluid
            @input="debouncedSearch(query)"
        />

        <Transition name="fade">
            <div v-if="results.length > 0" class="search-results">
                <Listbox v-model="selected" :options="results" optionLabel="name">
                    <template #item="{ option }">
                        <div class="search-result-item">
                            <div class="result-title">{{ option.name }}</div>
                            <div class="result-description">{{ option.description }}</div>
                        </div>
                    </template>
                    <template #value="{ value, placeholder }">
                        <div class="search-result-item">
                            <div>{{ value?.name || placeholder }}</div>
                        </div>
                    </template>
                </Listbox>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.search-container {
    position: relative;
}
.search-results {
    position: absolute;
    z-index: 10;
    width: 100%;
    max-height: 400px;
    overflow-y: auto;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.result-title { font-weight: 600; }
.result-description { font-size: 0.875rem; color: var(--text-secondary); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

### 8. Add Global Search Command

```bash
php artisan make:console GlobalSearchCommand
```

```php
protected $signature = 'search:global {query}';

public function handle(): int
{
    $query = $this->argument('query');

    $results = DB::table('models')
        ->select('id', 'name', 'description')
        ->whereRaw("MATCH(name, description) AGAINST(? IN BOOLEAN MODE)", [$query])
        ->take(10)
        ->get();

    foreach ($results as $result) {
        $this->info("{$result->id} - {$result->name}");
    }

    return self::SUCCESS;
}
```

## Artisan Commands Reference

```bash
php artisan make:migration add_fulltext_index_to_<table>_table --table=<table>
php artisan make:controller SearchController
php artisan make:console GlobalSearchCommand
php artisan migrate
php artisan search:global "test query"
php artisan route:list --path=api/search
php artisan test --filter=Search
```

## Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/*_add_fulltext_index_to_<table>_table.php` | Full-text index |
| `app/Http/Controllers/SearchController.php` | Search API |
| `resources/js/Components/Search.vue` | Search component |
| `resources/js/Components/GlobalSearch.vue` | Global search bar |
| `resources/js/Pages/Search.vue` | Dedicated search page |
| `app/Console/Commands/GlobalSearchCommand.php` | CLI search |
| `routes/api.php` | Search routes |
| `tests/Feature/SearchTest.php` | Search tests |

## Testing

```bash
php artisan test tests/Feature/SearchTest.php
php artisan test --filter=test_search_returns_results
php artisan test --filter=test_search_returns_empty_for_short_query
php artisan test --filter=test_fulltext_index_used
php artisan test --filter=test_search_with_filters
php artisan test --filter=test_search_debounce_in_vue
```

## Verification Checklist

- [ ] Full-text index created on search columns
- [ ] Search scope filters correctly using MATCH/AGAINST
- [ ] Search API returns matching results
- [ ] Short queries (less than 2 chars) return empty
- [ ] Vue component debounces search input (300ms)
- [ ] Results appear in dropdown as user types
- [ ] Clicking a result navigates to detail page
- [ ] Global search works from any page
- [ ] Search is case-insensitive
- [ ] Special characters handled safely
- [ ] All tests pass
