# Good Vue 3 Component Example

A well-structured PrimeVue component using the Composition API, with proper prop validation, emits, slots, and lifecycle management.

---

## Context

- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **UI Library**: PrimeVue 4
- **State**: Pinia (for cross-component state)
- **Module**: Product listing with filters, sorting, and bulk actions

---

## Component: `ProductListing.vue`

```vue
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRouter, useRoute } from 'vue-router'
import ProductService from '@/services/productService'
import type { Product, ProductFilters, SortConfig } from '@/types/product'
import { useConfirm } from 'primevue/useconfirm'
import { useProductStore } from '@/stores/products'
import { formatCurrency } from '@/utils/format'

// --- Props ---
interface Props {
    warehouseId?: number
    showActions?: boolean
    compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    warehouseId: undefined,
    showActions: true,
    compact: false,
})

// --- Emits ---
interface Emits {
    (e: 'product-selected', product: Product): void
    (e: 'product-created'): void
    (e: 'product-updated', product: Product): void
    (e: 'product-deleted', productId: number): void
}

const emit = defineEmits<Emits>()

// --- Setup ---
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const route = useRoute()
const productStore = useProductStore()

// --- State ---
const loading = ref(false)
const products = ref<Product[]>([])
const filters = reactive<ProductFilters>({
    search: '',
    category: undefined,
    status: undefined,
})
const sortConfig = reactive<SortConfig>({
    field: (route.query.sort_by as string) || 'created_at',
    direction: (route.query.sort_dir as string) || 'asc',
})
const currentPage = ref(Number(route.query.page) || 1)
const totalPages = ref(0)
const totalItems = ref(0)
const selectedProducts = ref<Product[]>([])

const categories = computed(() => productStore.categories)

// --- Computed ---
const hasFilters = computed(() => {
    return !!(filters.search || filters.category || filters.status)
})

const selectionMode = computed(() => {
    return props.showActions ? 'multiple' : undefined
})

// --- Methods ---
async function fetchProducts() {
    loading.value = true
    try {
        const response = await ProductService.list({
            filters,
            sort: sortConfig,
            page: currentPage.value,
            perPage: 15,
            warehouseId: props.warehouseId,
        })

        products.value = response.data.data
        totalPages.value = response.data.meta.last_page
        totalItems.value = response.data.meta.total
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load products',
            life: 5000,
        })
    } finally {
        loading.value = false
    }
}

function handleSort(field: string) {
    if (sortConfig.field === field) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'
    } else {
        sortConfig.field = field
        sortConfig.direction = 'asc'
    }
    currentPage.value = 1
    fetchProducts()
}

function onPageChange(event: { page: number }) {
    currentPage.value = event.page
    fetchProducts()
    router.push({ query: { ...route.query, page: event.page } })
}

function onSearchChange() {
    currentPage.value = 1
    fetchProducts()
}

function onSelectionChange(event: { value: Product[] }) {
    selectedProducts.value = event.value
}

function confirmBulkDelete() {
    confirm.require({
        message: `Are you sure you want to delete ${selectedProducts.value.length} product(s)?`,
        header: 'Confirm Deletion',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
            try {
                await ProductService.bulkDelete(
                    selectedProducts.value.map((p) => p.id),
                )
                toast.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `${selectedProducts.value.length} product(s) deleted`,
                    life: 3000,
                })
                emit('product-deleted', -1)
                fetchProducts()
                selectedProducts.value = []
            } catch {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to delete products',
                    life: 5000,
                })
            }
        },
    })
}

function confirmDelete(product: Product) {
    confirm.require({
        message: `Are you sure you want to delete "${product.name}"?`,
        header: 'Confirm Deletion',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
            try {
                await ProductService.delete(product.id)
                toast.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `${product.name} deleted`,
                    life: 3000,
                })
                emit('product-deleted', product.id)
                fetchProducts()
            } catch {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to delete product',
                    life: 5000,
                })
            }
        },
    })
}

// --- Watchers ---
watch(
    () => props.warehouseId,
    () => fetchProducts(),
)

// --- Lifecycle ---
onMounted(() => {
    fetchProducts()
    productStore.fetchCategories()
})

// --- Expose ---
defineExpose({
    refresh: fetchProducts,
})
</script>

<template>
    <div class="product-listing">
        <!-- Toolbar -->
        <div class="flex justify-between items-center mb-4">
            <div class="flex gap-2">
                <IconField>
                    <InputIcon class="pi pi-search" />
                    <InputText
                        v-model="filters.search"
                        placeholder="Search products..."
                        class="w-80"
                        @change="onSearchChange"
                    />
                </IconField>

                <Select
                    v-model="filters.category"
                    :options="categories"
                    option-label="name"
                    option-value="id"
                    placeholder="All Categories"
                    class="w-60"
                    clearable
                    @change="onSearchChange"
                />

                <Select
                    v-model="filters.status"
                    :options="[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]"
                    option-label="label"
                    option-value="value"
                    placeholder="All Status"
                    class="w-60"
                    clearable
                    @change="onSearchChange"
                />
            </div>

            <div class="flex gap-2">
                <Button
                    v-if="selectedProducts.length > 0"
                    icon="pi pi-trash"
                    label="Delete Selected"
                    severity="danger"
                    @click="confirmBulkDelete"
                />
                <slot name="actions" />
                <Button icon="pi pi-plus" label="Add Product" @click="router.push('/products/create')" />
            </div>
        </div>

        <!-- DataTable -->
        <DataTable
            :value="products"
            :loading="loading"
            v-model:selection="selectedProducts"
            :selection-mode="selectionMode"
            :paginator="true"
            :rows="15"
            :first="(currentPage - 1) * 15"
            :total-records="totalItems"
            paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            @page="onPageChange"
            @row-click="(e) => $emit('product-selected', e.data)"
            removable-sort
            @sort="handleSort"
            sort-field="created_at"
            sort-order="1"
            :rows-per-page-options="[15, 30, 50]"
            empty-message="No products found."
            :pt="{
                header: { class: 'flex justify-between' },
            }"
        >
            <Column
                v-if="showActions"
                selection-mode="multiple"
                :header-style="{ width: '3rem' }"
            />

            <Column field="sku" header="SKU" sortable :body-style="{ width: '120px' }">
                <template #body="{ data }">
                    <Tag :value="data.sku" severity="info" />
                </template>
            </Column>

            <Column field="name" header="Name" sortable>
                <template #body="{ data }">
                    <div class="font-medium">{{ data.name }}</div>
                    <div v-if="!compact" class="text-sm text-gray-600">{{ data.category?.name }}</div>
                </template>
            </Column>

            <Column field="price" header="Price" sortable>
                <template #body="{ data }">
                    {{ formatCurrency(data.price) }}
                </template>
            </Column>

            <Column field="stock_quantity" header="Stock" sortable>
                <template #body="{ data }">
                    <Tag
                        :value="data.stock_quantity"
                        :severity="data.stock_quantity > 0 ? 'success' : 'danger'"
                    />
                </template>
            </Column>

            <Column field="status" header="Status" sortable>
                <template #body="{ data }">
                    <Tag :value="data.status" :severity="data.status === 'active' ? 'success' : 'secondary'" />
                </template>
            </Column>

            <Column v-if="showActions" header="Actions" :body-style="{ width: '8rem' }">
                <template #body="{ data }">
                    <ButtonGroup>
                        <Button icon="pi pi-pencil" outlined text @click="$emit('product-updated', data)" />
                        <Button icon="pi pi-trash" outlined text severity="danger" @click="confirmDelete(data)" />
                    </ButtonGroup>
                </template>
            </Column>

            <template #empty>
                <div class="text-center py-4">
                    <i class="pi pi-inbox text-4xl text-gray-500 mb-2" />
                    <p>No products match your criteria.</p>
                </div>
            </template>

            <template #loading>
                <div class="text-center py-4">
                    <ProgressSpinner style="width: 40px; height: 40px" />
                </div>
            </template>
        </DataTable>
    </div>
</template>
```

---

## Helper Types

```ts
// @/types/product.ts
export interface Product {
    id: number
    name: string
    sku: string
    price: number
    stock_quantity: number
    status: 'active' | 'inactive'
    category?: Category
    warehouse_id: number
    created_at: string
    updated_at: string
}

export interface ProductFilters {
    search?: string
    category?: number | undefined
    status?: 'active' | 'inactive' | undefined
}

export interface SortConfig {
    field: string
    direction: 'asc' | 'desc'
}

export interface Category {
    id: number
    name: string
}
```

---

## Key Patterns

| Pattern | Why |
|---------|-----|
| `withDefaults(defineProps<Props>())` | Type-safe props with defaults |
| Typed `Emits` interface | TypeScript validates emit usage |
| `reactive()` for filters | Nested object state stays reactive |
| `computed()` for derived state | `hasFilters`, `selectionMode` |
| `defineExpose({ refresh })` | Parent can call child methods |
| `$emit('product-selected', e.data)` | DataTable row click data passthrough |
| `confirm.require()` | PrimeVue confirm dialog for destructive actions |
| `onMounted` + watchers | Data loads on mount; re-fetches when props change |
| Scoped CSS via `class` props | PrimeVue `:pt` pass-through for partial styling |
| `empty-message` + slot fallback | Clear empty states for UX |
| `progress-spinner` in loading slot | Visual feedback during async operations |
| `formatCurrency` (imported from `@/utils/format`) | Consistent currency formatting across app |

---

## Usage from Parent

```vue
<template>
    <ProductListing
        warehouse-id="1"
        @product-selected="handleSelect"
        @product-deleted="handleDeleted"
    >
        <template #actions>
            <Button icon="pi pi-download" label="Export" @click="exportCsv" />
        </template>
    </ProductListing>
</template>
```
