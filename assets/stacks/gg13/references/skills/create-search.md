# Create Search

Build a full-text search with scoping, highlighting, and autocomplete using Laravel and PrimeVue.

## Prerequisites

- [ ] Know which models to search (e.g., Product, Order, User)
- [ ] Know which columns to search (e.g., name, description, email)
- [ ] Know if search should be exact match or fuzzy
- [ ] Know if search results need highlighting
- [ ] Know if autocomplete is needed (typeahead)

## Step 1 — Backend: Search Scope

Add a scope to the model for searchable columns:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'price_cents', 'currency', 'stock', 'category_id', 'is_active'];

    /**
     * Scope a query to search across searchable columns.
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        if (empty($search)) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('slug', 'like', "%{$search}%")
              ->orWhere('description', 'like', "%{$search}%");
        });
    }

    /**
     * Get searchable columns.
     */
    public function getSearchableColumns(): array
    {
        return ['name', 'slug', 'description'];
    }
}
```

## Step 2 — Backend: Search Service

```php
<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class SearchService
{
    public function __construct(
        private readonly ProductRepository $productRepository,
    ) {}

    /**
     * Search products with filtering, sorting, and pagination.
     */
    public function searchProducts(
        string $query,
        array $filters = [],
        int $perPage = 15,
    ): LengthAwarePaginator {
        $queryBuilder = Product::query();

        // Apply search
        if (! empty($query)) {
            $queryBuilder->search($query);
        }

        // Apply filters
        if (! empty($filters['category_id'])) {
            $queryBuilder->where('category_id', $filters['category_id']);
        }

        if (isset($filters['is_active'])) {
            $queryBuilder->where('is_active', $filters['is_active']);
        }

        if (isset($filters['min_price'])) {
            $queryBuilder->where('price_cents', '>=', $filters['min_price']);
        }

        if (isset($filters['max_price'])) {
            $queryBuilder->where('price_cents', '<=', $filters['max_price']);
        }

        // Sort by relevance if search query provided
        if (! empty($query)) {
            $queryBuilder->orderByRaw("MATCH(name, description) AGAINST(? IN BOOLEAN MODE)", [$query])
                ->orderBy('created_at', 'desc');
        } else {
            $queryBuilder->orderBy('name', 'asc');
        }

        return $queryBuilder->paginate($perPage);
    }

    /**
     * Get search suggestions for autocomplete.
     */
    public function getSuggestions(string $query, int $limit = 5): array
    {
        if (empty($query) || strlen($query) < 2) {
            return [];
        }

        // Note: `price_formatted` is a Resource-computed attribute, not a real column —
        // select only actual DB columns here.
        return Product::search($query)
            ->select('id', 'name', 'slug', 'price_cents')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Highlight search terms in text.
     */
    public function highlightText(string $text, string $query): string
    {
        // SECURITY: escape the source text FIRST. The result is rendered with `v-html`
        // on the frontend, so any un-escaped user/DB content is an XSS vector. Escaping
        // before inserting the (safe, hard-coded) <mark> tags keeps the payload inert.
        $text = e($text);

        if (empty($query)) {
            return $text;
        }

        $words = array_filter(explode(' ', $query));

        foreach ($words as $word) {
            // Match against the escaped word so the pattern lines up with the escaped text.
            $text = preg_replace(
                '/(' . preg_quote(e($word), '/') . ')/i',
                '<mark class="search-highlight">$1</mark>',
                $text
            );
        }

        return $text;
    }
}
```

> **XSS warning:** Highlighted output is intended for `v-html`. Never build it from raw,
> un-escaped text — always escape the source (as above) before injecting markup, otherwise
> attacker-controlled product data can execute script in the browser.

## Step 3 — Backend: Full-Text Search (MySQL)

Add full-text index to migration:

```php
Schema::create('products', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('slug')->unique();
    $table->text('description')->nullable();
    $table->unsignedBigInteger('price_cents');
    $table->unsignedInteger('stock')->default(0);
    $table->boolean('is_active')->default(true);
    $table->timestamps();

    // Full-text index for search
    $table->fullText(['name', 'description'])->setName('products_search');
});
```

Update the search scope to use full-text:

```php
public function scopeSearch(Builder $query, string $search): Builder
{
    if (empty($search)) {
        return $query;
    }

    // Use full-text search if available
    if ($this->usesFullTextSearch()) {
        return $query->whereRaw(
            "MATCH(name, description) AGAINST(? IN BOOLEAN MODE)",
            [$search]
        );
    }

    // Fallback to LIKE search
    return $query->where(function (Builder $q) use ($search) {
        $q->where('name', 'like', "%{$search}%")
          ->orWhere('description', 'like', "%{$search}%");
    });
}

private function usesFullTextSearch(): bool
{
    return Schema::hasIndex('products', 'products_search');
}
```

## Step 4 — Controller

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\SearchRequest;
use App\Http\Resources\ProductResource;
use App\Services\SearchService;
use App\Traits\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SearchController extends Controller
{
    use ApiResponses;

    public function __construct(
        private readonly SearchService $searchService,
    ) {}

    public function products(SearchRequest $request): AnonymousResourceCollection
    {
        $results = $this->searchService->searchProducts(
            query: $request->validated('q'),
            filters: $request->only(['category_id', 'is_active', 'min_price', 'max_price']),
            perPage: $request->integer('per_page', 15),
        );

        return ProductResource::collection($results);
    }

    public function suggestions(SearchRequest $request): JsonResponse
    {
        $suggestions = $this->searchService->getSuggestions(
            query: $request->validated('q'),
            limit: $request->integer('limit', 5),
        );

        return response()->json(['data' => $suggestions]);
    }
}
```

## Step 5 — Frontend: API Service

```typescript
// resources/js/api/services/searchApi.ts
import api from '@/api/client'
import type { Product } from '@/types/product'
import type { PaginatedResponse } from '@/types/api'

export interface SearchParams {
  q: string
  category_id?: number
  is_active?: boolean
  min_price?: number
  max_price?: number
  per_page?: number
  page?: number
}

export async function searchProducts(params: SearchParams): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>('/search/products', { params })
  return response.data
}

export interface SearchSuggestion {
  id: number
  name: string
  slug: string
  price_formatted: string
}

export async function searchSuggestions(
  query: string,
  limit = 5,
): Promise<SearchSuggestion[]> {
  const response = await api.get<{ data: SearchSuggestion[] }>('/search/suggestions', {
    params: { q: query, limit },
  })
  return response.data.data
}
```

## Step 6 — Frontend: Search Component

Create `resources/js/components/SearchInput.vue`:

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { searchSuggestions, type SearchSuggestion } from '@/api/services/searchApi'

interface Props {
  modelValue: string
  placeholder?: string
  debounceMs?: number
  onSearch: (query: string) => void
  onSelect: (item: SearchSuggestion) => void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
  debounceMs: 300,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string): void
  (e: 'select', item: SearchSuggestion): void
}>()

const localValue = ref(props.modelValue)
const suggestions = ref<SearchSuggestion[]>([])
const isLoading = ref(false)
const showSuggestions = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const hasSuggestions = computed(() => suggestions.value.length > 0)

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  localValue.value = value
  emit('update:modelValue', value)

  // Debounce the search
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    fetchSuggestions(value)
  }, props.debounceMs)
}

async function fetchSuggestions(query: string) {
  if (!query || query.length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  isLoading.value = true
  try {
    suggestions.value = await searchSuggestions(query)
    showSuggestions.value = true
  } catch {
    suggestions.value = []
  } finally {
    isLoading.value = false
  }
}

function handleSelect(item: SearchSuggestion) {
  emit('select', item)
  suggestions.value = []
  showSuggestions.value = false
  localValue.value = item.name
}

function handleClear() {
  localValue.value = ''
  suggestions.value = []
  showSuggestions.value = false
  emit('update:modelValue', '')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showSuggestions.value = false
    suggestions.value = []
  }
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.search-input-container')) {
    showSuggestions.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div class="search-input-container">
    <div class="search-input">
      <i class="pi pi-search search-input__icon" />
      <InputText
        :model-value="localValue"
        :placeholder="placeholder"
        class="search-input__field"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <Button
        v-if="localValue"
        icon="pi pi-times"
        class="p-button-text p-button-sm search-input__clear"
        @click="handleClear"
      />
    </div>

    <!-- Suggestions Dropdown -->
    <div v-if="showSuggestions && hasSuggestions" class="search-suggestions">
      <div v-if="isLoading" class="search-suggestions__loading">
        <i class="pi pi-spin pi-spinner" />
      </div>
      <ul v-else class="search-suggestions__list">
        <li
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          class="search-suggestions__item"
          @click="handleSelect(suggestion)"
        >
          <div class="search-suggestions__item-content">
            <strong>{{ suggestion.name }}</strong>
            <span class="search-suggestions__item-slug">{{ suggestion.slug }}</span>
          </div>
          <span v-if="suggestion.price_formatted" class="search-suggestions__item-price">
            {{ suggestion.price_formatted }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
```

## Step 7 — Frontend: Search Results Page

Create `resources/js/pages/search/SearchResultsPage.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { fetchProducts } from '@/api/services/productApi'
import type { Product } from '@/types/product'

const route = useRoute()
const router = useRouter()

const products = ref<Product[]>([])
const isLoading = ref(false)
const totalResults = ref(0)
const query = ref('')

async function loadResults() {
  query.value = (route.query.q as string) || ''
  isLoading.value = true

  try {
    const response = await fetchProducts({
      search: query.value,
      per_page: 20,
      sort: 'name',
      order: 'asc',
    })
    products.value = response.data
    totalResults.value = response.meta.total
  } catch {
    // handle error
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadResults())
</script>

<template>
  <div class="search-results-page">
    <div class="page-header">
      <h2>Search Results</h2>
      <p v-if="query" class="search-query">
        Showing results for "<strong>{{ query }}</strong>" ({{ totalResults }} results)
      </p>
    </div>

    <DataTable
      v-if="products.length > 0"
      :value="products"
      :loading="isLoading"
      :empty-message="'No results found.'"
      table-style="width: 100%"
    >
      <Column field="name" header="Name">
        <template #body="{ data }">
          <router-link :to="{ name: 'product.show', params: { id: data.id } }">
            {{ data.name }}
          </router-link>
        </template>
      </Column>
      <Column field="price_formatted" header="Price" />
      <Column field="stock" header="Stock" />
      <Column field="is_active" header="Status">
        <template #body="{ data }">
          <Tag :value="data.is_active ? 'Active' : 'Inactive'" />
        </template>
      </Column>
    </DataTable>

    <div v-else-if="!isLoading" class="empty-state">
      <i class="pi pi-search" style="font-size: 3rem; color: var(--p-text-300-color)" />
      <h3>No Results Found</h3>
      <p>Try adjusting your search terms or filters.</p>
    </div>
  </div>
</template>
```

## Step 8 — Testing

```bash
# Feature test: search returns results

it('searches products by name', function () {
    Product::factory()->create(['name' => 'Apple Watch']);
    Product::factory()->create(['name' => 'Banana']);

    $response = $this->getJson('/api/v1/search/products?q=Apple');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Apple Watch');
});

it('searches products by description', function () {
    Product::factory()->create(['name' => 'Phone', 'description' => 'Smart phone with camera']);

    $response = $this->getJson('/api/v1/search/products?q=camera');

    $response->assertOk()
        ->assertJsonCount(1, 'data');
});

it('returns empty results for no matches', function () {
    Product::factory()->count(5)->create();

    $response = $this->getJson('/api/v1/search/products?q=nonexistent');

    $response->assertOk()
        ->assertJsonCount(0, 'data');
});

it('searches with filters', function () {
    Product::factory()->create(['name' => 'Apple', 'category_id' => 1]);
    Product::factory()->create(['name' => 'Apple Phone', 'category_id' => 2]);

    $response = $this->getJson('/api/v1/search/products?q=Apple&category_id=1');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.category_id', 1);
});

# Feature test: autocomplete suggestions

it('returns suggestions for autocomplete', function () {
    Product::factory()->create(['name' => 'Apple Watch']);
    Product::factory()->create(['name' => 'Apple Phone']);

    $response = $this->getJson('/api/v1/search/suggestions?q=Apple');

    $response->assertOk()
        ->assertJsonCount(2, 'data');
});

it('limits suggestions to 5', function () {
    Product::factory()->count(10)->create();

    $response = $this->getJson('/api/v1/search/suggestions?q=A');

    $response->assertOk()
        ->assertJsonCount(5, 'data');
});

it('returns empty for short queries', function () {
    $response = $this->getJson('/api/v1/search/suggestions?q=A');

    $response->assertOk()
        ->assertJsonCount(0, 'data');
});

# Frontend: test search component

it('displays search results', () => {
  // mount SearchResultsPage with query
  // assert results are displayed
});

it('shows empty state for no results', () => {
  // mount SearchResultsPage with no results
  // assert empty state is displayed
});
```

## Pitfalls

- **Not using scope for search** — Always use `scopeSearch` for reusable search logic
- **SQL injection via LIKE** — Always parameterize search queries (Laravel handles this)
- **Missing full-text index** — Add full-text index for better search performance
- **Not handling empty queries** — Return early if query is empty
- **Not limiting autocomplete results** — Always limit suggestions to prevent excessive data
- **Not debouncing search input** — Debounce to avoid excessive API calls
- **Missing search highlighting** — Highlight matched terms in results
- **Not handling case sensitivity** — Use `ILIKE` (PostgreSQL) or `LOWER()` for case-insensitive search
- **Not sorting by relevance** — Sort search results by relevance, not just created_at
- **Missing search analytics** — Track search queries for insights
- **Not providing empty state** — Show meaningful message when no results found
- **Not testing with special characters** — Test search with special characters and unicode
- **Not handling pagination** — Always paginate search results
- **Not providing search filters** — Allow filtering search results by category, price, etc.
- **Missing URL sync** — Sync search query with URL for bookmarking/sharing
