# Create Listing Page

Build a data listing page with PrimeVue DataTable, server-side filtering, sorting, pagination, and bulk actions.

## Prerequisites

- [ ] Model, migration, and table exist
- [ ] API endpoint exists (e.g., `GET /api/v1/products`)
- [ ] API service function exists (e.g., `fetchProducts`)
- [ ] TypeScript type exists for the resource
- [ ] Know the columns to display and their sortability
- [ ] Know which columns are filterable

## Step 1 — Backend: Paginated Response Controller

The controller should return paginated data via the Resource collection:

```php
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

public function index(IndexProductRequest $request): AnonymousResourceCollection
{
    $products = $this->productService->list(
        filters: $request->validated(),
        perPage: $request->integer('per_page', 15),
    );

    return ProductResource::collection($products);
}
```

The `ProductResource::collection()` call wraps results in:

```json
{
    "data": [...],
    "meta": {
        "current_page": 1,
        "per_page": 15,
        "total": 100,
        "last_page": 7
    }
}
```

## Step 2 — Frontend: API Service

```typescript
// resources/js/api/services/productApi.ts
import api from '@/api/client'
import type { Product } from '@/types/product'
import type { PaginatedResponse, QueryParams } from '@/types/api'

export interface ProductFilters {
  search?: string
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
  filter_active?: boolean
  filter_category_id?: number | null
}

export async function fetchProducts(
  params: ProductFilters,
): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>('/products', {
    params: sanitizeFilters(params),
  })
  return response.data
}

function sanitizeFilters(params: ProductFilters): QueryParams {
  const sanitized: QueryParams = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'boolean') {
        sanitized[key] = value ? '1' : '0'
      } else {
        sanitized[key] = String(value)
      }
    }
  })
  return sanitized
}
```

## Step 3 — Frontend: TypeScript Types

```typescript
// resources/js/types/product.ts
export interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  price_cents: number
  price_formatted: string
  currency: string
  stock: number
  is_active: boolean
  category_id: number | null
  created_at: string
  updated_at: string
}
```

```typescript
// resources/js/types/api.ts
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  links?: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

export type QueryParams = Record<string, string>
```

## Step 4 — Frontend: Listing Page Component

Create `resources/js/pages/products/ProductListPage.vue`:

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import ConfirmPopup from 'primevue/confirmpopup'
import { useConfirm } from 'primevue/useconfirm'
import { fetchProducts, deleteProduct } from '@/api/services/productApi'
import type { Product, ProductFilters } from '@/types/product'

interface PaginationState {
  page: number
  perPage: number
  total: number
  lastPage: number
}

interface SortState {
  field: string
  order: 1 | -1
}

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const products = ref<Product[]>([])
const isLoading = ref(false)
const isDeleting = ref(false)

const pagination = ref<PaginationState>({
  page: 1,
  perPage: 15,
  total: 0,
  lastPage: 1,
})

const sort = ref<SortState>({ field: 'created_at', order: -1 })

const filters = ref<ProductFilters>({
  search: '',
  filter_active: undefined,
  filter_category_id: null,
})

const categoryOptions = [
  { label: 'All Categories', value: null },
  { label: 'Electronics', value: 1 },
  { label: 'Clothing', value: 2 },
]

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'price_formatted', label: 'Price', sortable: true },
  { key: 'stock', label: 'Stock', sortable: true },
  { key: 'is_active', label: 'Status', sortable: true },
  { key: 'created_at', label: 'Created', sortable: true },
]

async function loadProducts() {
  isLoading.value = true
  try {
    const response = await fetchProducts({
      ...filters.value,
      page: pagination.value.page,
      per_page: pagination.value.perPage,
      sort: sort.value.field,
      order: sort.value.order === 1 ? 'asc' : 'desc',
    })
    products.value = response.data
    pagination.value.total = response.meta.total
    pagination.value.lastPage = response.meta.last_page
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load products',
      life: 5000,
    })
  } finally {
    isLoading.value = false
  }
}

function handleSort(event: { field: string; order: 1 | -1 }) {
  if (sort.value.field === event.field) {
    sort.value.order = -sort.value.order
  } else {
    sort.value.field = event.field
    sort.value.order = event.order
  }
  pagination.value.page = 1
  loadProducts()
}

function handlePageChange(event: { page: number }) {
  pagination.value.page = event.page
  loadProducts()
}

function handlePerPageChange(event: { value: number }) {
  pagination.value.perPage = event.value
  pagination.value.page = 1
  loadProducts()
}

function handleFilterChange() {
  pagination.value.page = 1
  loadProducts()
}

function handleSearchDebounce() {
  // Debounced search is handled by primevue DataTable's filter
}

function formatPrice(price: string): string {
  return `$${price}`
}

async function handleDelete(product: Product) {
  try {
    await deleteProduct(product.id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product deleted successfully',
      life: 3000,
    })
    loadProducts()
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete product',
      life: 5000,
    })
  }
}

function confirmDelete(event: Event, product: Product) {
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `Are you sure you want to delete "${product.name}"?`,
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
      outlined: true,
    },
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    accept: () => handleDelete(product),
  })
}

function navigateToCreate() {
  router.push({ name: 'product.create' })
}

function navigateToEdit(product: Product) {
  router.push({ name: 'product.edit', params: { id: product.id } })
}

function navigateToDetail(product: Product) {
  router.push({ name: 'product.show', params: { id: product.id } })
}

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <div class="product-list-page">
    <ConfirmPopup />
    <div class="page-header">
      <h2>Products</h2>
      <Button
        label="Create Product"
        icon="pi pi-plus"
        severity="primary"
        @click="navigateToCreate"
      />
    </div>

    <div class="page-filters">
      <div class="filter-group">
        <InputText
          v-model="filters.search"
          placeholder="Search products..."
          icon="pi pi-search"
          class="filter-search"
          @input="handleFilterChange"
        />
      </div>
      <div class="filter-group">
        <Select
          v-model="filters.filter_category_id"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          placeholder="All Categories"
          class="filter-dropdown"
          @change="handleFilterChange"
        />
      </div>
      <div class="filter-group">
        <Select
          v-model="filters.per_page"
          :options="[10, 15, 25, 50, 100]"
          placeholder="Rows per page"
          class="filter-per-page"
          @change="handlePerPageChange"
        />
      </div>
    </div>

    <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 3px" />

    <DataTable
      :value="products"
      :loading="isLoading"
      :paginator="true"
      :rows="pagination.perPage"
      :total-records="pagination.total"
      :rows-per-page-options="[10, 15, 25, 50]"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      current-page-report="{first} to {last} of {totalRecords} products"
      @page="handlePageChange"
      @sort="handleSort"
      sort-field="created_at"
      sort-order="-1"
      :empty-message="'No products found.'"
      table-style="min-width: 50rem"
    >
      <template #empty>
        <div class="empty-state">
          <p>No products found. Create your first product to get started.</p>
          <Button label="Create Product" icon="pi pi-plus" @click="navigateToCreate" />
        </div>
      </template>

      <Column field="id" header="ID" :sortable="true" :frozen="true" style="width: 60px" />
      <Column field="name" header="Name" :sortable="true">
        <template #body="slotProps">
          <a
            class="product-name-link"
            @click="navigateToDetail(slotProps.data)"
          >
            {{ slotProps.data.name }}
          </a>
        </template>
      </Column>
      <Column field="price_formatted" header="Price" :sortable="true" :frozen="true">
        <template #body="slotProps">
          {{ formatPrice(slotProps.data.price_formatted) }}
        </template>
      </Column>
      <Column field="stock" header="Stock" :sortable="true" />
      <Column field="is_active" header="Status" :sortable="true">
        <template #body="slotProps">
          <Tag
            :value="slotProps.data.is_active ? 'Active' : 'Inactive'"
            :severity="slotProps.data.is_active ? 'success' : 'danger'"
          />
        </template>
      </Column>
      <Column field="created_at" header="Created" :sortable="true">
        <template #body="slotProps">
          {{ new Date(slotProps.data.created_at).toLocaleDateString() }}
        </template>
      </Column>
      <Column header="Actions" :frozen="true" style="width: 150px">
        <template #body="slotProps">
          <Button
            icon="pi pi-pencil"
            class="p-button-text p-button-sm"
            :aria-label="'Edit product ' + slotProps.data.name"
            @click="navigateToEdit(slotProps.data)"
          />
          <Button
            icon="pi pi-trash"
            class="p-button-text p-button-danger p-button-sm"
            :aria-label="'Delete product ' + slotProps.data.name"
            @click="confirmDelete($event, slotProps.data)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
```

## Step 5 — Frontend: CSS

Add to `resources/css/app.css` or component SCSS:

```css
.product-list-page {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.page-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-search {
  width: 100%;
}

.filter-dropdown {
  width: 100%;
}

.product-name-link {
  color: var(--p-primary-color);
  cursor: pointer;
  text-decoration: none;
}

.product-name-link:hover {
  text-decoration: underline;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  text-align: center;
}
```

## Step 6 — Testing

```bash
# Feature test: pagination
it('returns paginated products', function () {
    Product::factory()->count(20)->create();

    $response = $this->getJson('/api/v1/products?per_page=15');

    $response->assertOk()
        ->assertJsonPath('meta.per_page', 15)
        ->assertJsonCount(15, 'data');
});

# Feature test: sorting
it('sorts products by name ascending', function () {
    Product::factory()->create(['name' => 'Zebra']);
    Product::factory()->create(['name' => 'Apple']);

    $response = $this->getJson('/api/v1/products?sort=name&order=asc');

    $response->assertOk()
        ->assertJsonPath('data.0.name', 'Apple');
});

# Feature test: filtering
it('filters products by search term', function () {
    Product::factory()->create(['name' => 'Apple Watch']);
    Product::factory()->create(['name' => 'Banana']);

    $response = $this->getJson('/api/v1/products?search=Apple');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Apple Watch');
});

# Frontend: test pagination renders correctly
it('displays pagination controls', () => {
  // mount component with paginated data
  // assert pagination component is visible
});
```

## Pitfalls

- **Not sanitizing filter params** — Remove empty/null values before sending to API
- **Not resetting page on filter change** — Always go to page 1 when filters change
- **N+1 queries** — Use eager loading in service: `with(['category', 'user'])`
- **Not handling empty state** — Show meaningful message when no records exist
- **Hardcoding column definitions** — Define columns as data structure for reusability
- **Not handling sort direction toggle** — Clicking same column twice should reverse sort
- **Missing loading state** — Show ProgressBar or skeleton while loading
- **Not preserving sort state across pagination** — Keep sort field/order when changing pages
