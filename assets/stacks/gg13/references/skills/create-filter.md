# Create Filter

Build a reusable filter component for PrimeVue DataTable with query parameters and state management.

## Prerequisites

- [ ] Know which columns to filter (e.g., status, category, date range, price range)
- [ ] Know the filter types (dropdown, date range, text, checkbox, number)
- [ ] Know if filters should persist across page visits
- [ ] Know if filters should be saved as presets
- [ ] Know the URL query parameter names for each filter

## Step 1 — Backend: Filter Handling

```php
// app/Http/Requests/Api/FilterRequest.php
class FilterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', Rule::in(['active', 'inactive', 'draft', 'archived'])],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'max_stock' => ['nullable', 'integer', 'min:0'],
            'date_from' => ['nullable', 'date', 'before_or_equal:date_to'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_new' => ['sometimes', 'boolean'],
        ];
    }
}
```

```php
// app/Services/FilterService.php
class FilterService
{
    public function apply(Builder $query, array $filters): Builder
    {
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (isset($filters['min_price'])) {
            $query->where('price_cents', '>=', $filters['min_price']);
        }
        if (isset($filters['max_price'])) {
            $query->where('price_cents', '<=', $filters['max_price']);
        }

        if (isset($filters['min_stock'])) {
            $query->where('stock', '>=', $filters['min_stock']);
        }
        if (isset($filters['max_stock'])) {
            $query->where('stock', '<=', $filters['max_stock']);
        }

        if (isset($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        if (isset($filters['is_featured'])) {
            $query->where('is_featured', $filters['is_featured']);
        }
        if (isset($filters['is_new'])) {
            $query->where('is_new', $filters['is_new']);
        }

        return $query;
    }
}
```

## Step 2 — Frontend: Filter Types

```typescript
// resources/js/types/filter.ts
export interface FilterOption {
  label: string
  value: string | number | boolean | null
}

export interface DateRange {
  from: string | null
  to: string | null
}

export interface NumberRange {
  min: number | null
  max: number | null
}

export type FilterValue = string | number | boolean | null | DateRange | NumberRange | string[]
```

## Step 3 — Frontend: Composable for Filters

Create `resources/js/composables/useFilters.ts`:

```typescript
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface FilterState {
  status: string | null
  categoryId: number | null
  minPrice: number | null
  maxPrice: number | null
  minStock: number | null
  maxStock: number | null
  dateFrom: string | null
  dateTo: string | null
  isFeatured: boolean | null
  isNew: boolean | null
  search: string
}

export function useFilters(defaults: Partial<FilterState> = {}) {
  const route = useRoute()
  const router = useRouter()

  const filters = ref<FilterState>({
    status: defaults.status ?? null,
    categoryId: defaults.categoryId ?? null,
    minPrice: defaults.minPrice ?? null,
    maxPrice: defaults.maxPrice ?? null,
    minStock: defaults.minStock ?? null,
    maxStock: defaults.maxStock ?? null,
    dateFrom: defaults.dateFrom ?? null,
    dateTo: defaults.dateTo ?? null,
    isFeatured: defaults.isFeatured ?? null,
    isNew: defaults.isNew ?? null,
    search: defaults.search ?? '',
  })

  // Load filters from query parameters
  function loadFromQuery() {
    const query = route.query as Record<string, string>
    if (query.status) filters.value.status = query.status
    if (query.category_id) filters.value.categoryId = Number(query.category_id)
    if (query.min_price) filters.value.minPrice = Number(query.min_price)
    if (query.max_price) filters.value.maxPrice = Number(query.max_price)
    if (query.min_stock) filters.value.minStock = Number(query.min_stock)
    if (query.max_stock) filters.value.maxStock = Number(query.max_stock)
    if (query.date_from) filters.value.dateFrom = query.date_from
    if (query.date_to) filters.value.dateTo = query.date_to
    if (query.is_featured) filters.value.isFeatured = query.is_featured === '1'
    if (query.is_new) filters.value.isNew = query.is_new === '1'
    if (query.search) filters.value.search = query.search
  }

  // Push filters to query parameters
  function pushToQuery() {
    const query: Record<string, string | number> = {}

    if (filters.value.status) query.status = filters.value.status
    if (filters.value.categoryId) query.category_id = filters.value.categoryId
    if (filters.value.minPrice !== null) query.min_price = filters.value.minPrice
    if (filters.value.maxPrice !== null) query.max_price = filters.value.maxPrice
    if (filters.value.minStock !== null) query.min_stock = filters.value.minStock
    if (filters.value.maxStock !== null) query.max_stock = filters.value.maxStock
    if (filters.value.dateFrom) query.date_from = filters.value.dateFrom
    if (filters.value.dateTo) query.dateTo = filters.value.dateTo
    if (filters.value.isFeatured !== null) query.is_featured = filters.value.isFeatured ? 1 : 0
    if (filters.value.isNew !== null) query.is_new = filters.value.isNew ? 1 : 0
    if (filters.value.search) query.search = filters.value.search

    router.replace({ query: { ...route.query, ...query } })
  }

  // Reset all filters
  function resetFilters() {
    filters.value = {
      status: null,
      categoryId: null,
      minPrice: null,
      maxPrice: null,
      minStock: null,
      maxStock: null,
      dateFrom: null,
      dateTo: null,
      isFeatured: null,
      isNew: null,
      search: '',
    }
    pushToQuery()
  }

  // Check if any filters are active
  const hasActiveFilters = computed(() => {
    return Object.values(filters.value).some(
      (value) => value !== null && value !== '' && value !== false,
    )
  })

  // Count active filters
  const activeFilterCount = computed(() => {
    return Object.values(filters.value).filter(
      (value) => value !== null && value !== '' && value !== false,
    ).length
  })

  loadFromQuery()

  return {
    filters,
    pushToQuery,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  }
}
```

## Step 4 — Frontend: Filter Component

Create `resources/js/components/filters/ProductFilters.vue`:

```vue
<script setup lang="ts">
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'
import type { FilterState } from '@/composables/useFilters'

interface Props {
  filters: FilterState
  categories: { id: number; name: string }[]
  onUpdate: (filters: FilterState) => void
  onReset: () => void
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:filters', value: FilterState): void
  (e: 'reset'): void
}>()

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
]

function updateFilter(key: keyof FilterState, value: any) {
  emit('update:filters', { ...filters, [key]: value })
}
</script>

<template>
  <div class="product-filters">
    <div class="filters-row">
      <!-- Search -->
      <div class="filter-group">
        <InputText
          v-model="filters.search"
          placeholder="Search..."
          icon="pi pi-search"
          class="filter-search"
          @update:model-value="updateFilter('search', $event)"
        />
      </div>

      <!-- Status -->
      <div class="filter-group">
        <Select
          v-model="filters.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="All Statuses"
          class="filter-dropdown"
          @update:model-value="updateFilter('status', $event)"
        />
      </div>

      <!-- Category -->
      <div class="filter-group">
        <Select
          v-model="filters.categoryId"
          :options="categories"
          option-label="name"
          option-value="id"
          placeholder="All Categories"
          class="filter-dropdown"
          @update:model-value="updateFilter('categoryId', $event)"
        />
      </div>

      <!-- Price Range -->
      <div class="filter-group">
        <InputNumber
          v-model="filters.minPrice"
          placeholder="Min Price"
          :min="0"
          class="filter-number"
          @update:model-value="updateFilter('minPrice', $event)"
        />
        <span class="filter-separator">-</span>
        <InputNumber
          v-model="filters.maxPrice"
          placeholder="Max Price"
          :min="0"
          class="filter-number"
          @update:model-value="updateFilter('maxPrice', $event)"
        />
      </div>

      <!-- Stock Range -->
      <div class="filter-group">
        <InputNumber
          v-model="filters.minStock"
          placeholder="Min Stock"
          :min="0"
          class="filter-number"
          @update:model-value="updateFilter('minStock', $event)"
        />
        <span class="filter-separator">-</span>
        <InputNumber
          v-model="filters.maxStock"
          placeholder="Max Stock"
          :min="0"
          class="filter-number"
          @update:model-value="updateFilter('maxStock', $event)"
        />
      </div>

      <!-- Date Range -->
      <div class="filter-group">
        <DatePicker
          v-model="filters.dateFrom"
          placeholder="From"
          dateFormat="yy-mm-dd"
          class="filter-calendar"
          @update:model-value="updateFilter('dateFrom', $event)"
        />
        <span class="filter-separator">to</span>
        <DatePicker
          v-model="filters.dateTo"
          placeholder="To"
          dateFormat="yy-mm-dd"
          class="filter-calendar"
          @update:model-value="updateFilter('dateTo', $event)"
        />
      </div>
    </div>

    <!-- Active Filters Tags -->
    <div v-if="hasActiveFilters" class="active-filters">
      <Tag v-if="filters.status" :value="`Status: ${filters.status}`" severity="info" closable @close="updateFilter('status', null)" />
      <Tag v-if="filters.categoryId" :value="`Category: ${filters.categoryId}`" severity="info" closable @close="updateFilter('categoryId', null)" />
      <Tag v-if="filters.minPrice !== null" :value="`Min Price: $${filters.minPrice}`" severity="info" closable @close="updateFilter('minPrice', null)" />
      <Tag v-if="filters.maxPrice !== null" :value="`Max Price: $${filters.maxPrice}`" severity="info" closable @close="updateFilter('maxPrice', null)" />
      <Tag v-if="filters.minStock !== null" :value="`Min Stock: ${filters.minStock}`" severity="info" closable @close="updateFilter('minStock', null)" />
      <Tag v-if="filters.maxStock !== null" :value="`Max Stock: ${filters.maxStock}`" severity="info" closable @close="updateFilter('maxStock', null)" />
      <Tag v-if="filters.dateFrom" :value="`From: ${filters.dateFrom}`" severity="info" closable @close="updateFilter('dateFrom', null)" />
      <Tag v-if="filters.dateTo" :value="`To: ${filters.dateTo}`" severity="info" closable @close="updateFilter('dateTo', null)" />
      <Button
        label="Clear All"
        icon="pi pi-times"
        text
        size="small"
        severity="secondary"
        @click="onReset"
      />
    </div>
  </div>
</template>
```

## Step 5 — Using Filters in Listing Page

```vue
<!-- resources/js/pages/products/ProductListPage.vue -->
<script setup lang="ts">
import { useFilters, type FilterState } from '@/composables/useFilters'
import ProductFilters from '@/components/filters/ProductFilters.vue'

const { filters, pushToQuery, resetFilters, hasActiveFilters, activeFilterCount } = useFilters()

const categories = ref<{ id: number; name: string }[]>([])

function handleFilterUpdate(newFilters: FilterState) {
  filters.value = newFilters
  pushToQuery()
  loadProducts()
}

function handleReset() {
  resetFilters()
  loadProducts()
}

async function loadProducts() {
  const response = await fetchProducts({
    ...filters.value,
    page: pagination.value.page,
    per_page: pagination.value.perPage,
    sort: sort.value.field,
    order: sort.value.order === 1 ? 'asc' : 'desc',
  })
  products.value = response.data
}
</script>

<template>
  <div class="product-list-page">
    <ProductFilters
      :filters="filters"
      :categories="categories"
      @update:filters="handleFilterUpdate"
      @reset="handleReset"
    />

    <DataTable :value="products" ... />
  </div>
</template>
```

## Step 6 — Testing

```bash
# Frontend: test filter composable

it('loads filters from query parameters', () => {
  const { filters } = useFilters()

  // set route query
  router.push({ query: { status: 'active', category_id: '1' } })

  expect(filters.value.status).toBe('active')
  expect(filters.value.categoryId).toBe(1)
})

it('pushes filters to query parameters', () => {
  const { pushToQuery, filters } = useFilters()

  filters.value.status = 'active'
  pushToQuery()

  expect(route.query.status).toBe('active')
})

it('resets all filters', () => {
  const { resetFilters, filters } = useFilters()

  filters.value.status = 'active'
  filters.value.search = 'test'
  resetFilters()

  expect(filters.value.status).toBeNull()
  expect(filters.value.search).toBe('')
})

it('detects active filters', () => {
  const { hasActiveFilters, filters } = useFilters()

  filters.value.status = 'active'

  expect(hasActiveFilters.value).toBe(true)
})

it('counts active filters', () => {
  const { activeFilterCount, filters } = useFilters()

  filters.value.status = 'active'
  filters.value.categoryId = 1

  expect(activeFilterCount.value).toBe(2)
})
```

## Pitfalls

- **Not syncing filters with URL** — Always sync filters with query parameters
- **Not resetting filters on navigation** — Clear filters when navigating away
- **Not loading filters from query** — Initialize filters from URL query parameters
- **Missing filter count badge** — Show count of active filters for UX
- **Not providing clear all button** — Always provide a way to reset all filters
- **Not handling filter types correctly** — Use correct input types for each filter
- **Missing filter persistence** — Persist filters in URL for bookmarking/sharing
- **Not debouncing search input** — Debounce search to avoid excessive API calls
- **Not handling empty filter values** — Skip null/empty values in query
- **Not using composable for filters** — Use `useFilters()` composable for reusability
- **Hardcoding filter options** — Fetch filter options from API for dynamic data
- **Not testing filter state management** — Always test filter state changes
