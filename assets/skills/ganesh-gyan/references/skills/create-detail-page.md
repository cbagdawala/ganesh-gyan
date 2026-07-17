# Create Detail Page

Build a detail view page with relationship display, breadcrumbs, and action buttons using PrimeVue.

## Prerequisites

- [ ] Model, migration, and table exist
- [ ] API endpoint exists (e.g., `GET /api/v1/products/{id}`)
- [ ] API service function exists (e.g., `fetchProduct`)
- [ ] TypeScript type exists for the resource
- [ ] Know the relationships to display (e.g., `user`, `category`, `orderItems`)
- [ ] Know which actions are available (edit, delete, duplicate)

## Step 1 — Backend: Detail Controller

```php
// app/Http/Controllers/Api/ProductController.php
public function show(int $id): JsonResponse
{
    $product = $this->productService->findById($id);

    if (! $product) {
        return response()->json([
            'status' => 'error',
            'error' => [
                'code' => 'NOT_FOUND',
                'message' => 'Product not found.',
            ],
        ], 404);
    }

    return new ProductResource($product);
}
```

Ensure the resource includes related data:

```php
// app/Http/Resources/ProductResource.php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'name' => $this->name,
        'slug' => $this->slug,
        'description' => $this->description,
        'price_cents' => $this->price_cents,
        'price_formatted' => number_format($this->price_cents / 100, 2),
        'currency' => $this->currency,
        'stock' => $this->stock,
        'is_active' => $this->is_active,
        'category_id' => $this->category_id,
        'user_id' => $this->user_id,
        'category' => $this->whenLoaded('category', function () {
            return [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ];
        }),
        'user' => $this->whenLoaded('user', function () {
            return [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ];
        }),
        'created_at' => $this->created_at?->toIso8601String(),
        'updated_at' => $this->updated_at?->toIso8601String(),
    ];
}
```

Service method for eager loading:

```php
// app/Services/ProductService.php
public function findById(int $id): ?Product
{
    return Product::with(['category', 'user'])->find($id);
}
```

## Step 2 — Frontend: API Service

```typescript
// resources/js/api/services/productApi.ts
import api from '@/api/client'
import type { Product } from '@/types/product'
import type { ApiResponse } from '@/types/api'

export async function fetchProduct(id: number): Promise<Product> {
  const response = await api.get<{ data: Product }>(`/products/${id}`)
  return response.data.data
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`)
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
  user_id: number
  category?: {
    id: number
    name: string
  } | null
  user?: {
    id: number
    name: string
    email: string
  } | null
  created_at: string
  updated_at: string
}
```

## Step 4 — Frontend: Detail Page

Create `resources/js/pages/products/ProductDetailPage.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Breadcrumb from 'primevue/breadcrumb'
import ConfirmPopup from 'primevue/confirmpopup'
import { fetchProduct, deleteProduct } from '@/api/services/productApi'
import type { Product } from '@/types/product'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const confirm = useConfirm()

const product = ref<Product | null>(null)
const isLoading = ref(false)
const isDeleting = ref(false)

const id = Number(route.params.id)

async function loadProduct() {
  isLoading.value = true
  try {
    product.value = await fetchProduct(id)
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Product not found or failed to load',
      life: 5000,
    })
    router.push({ name: 'products' })
  } finally {
    isLoading.value = false
  }
}

async function handleDelete() {
  isDeleting.value = true
  try {
    await deleteProduct(id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product deleted successfully',
      life: 3000,
    })
    router.push({ name: 'products' })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete product',
      life: 5000,
    })
  } finally {
    isDeleting.value = false
  }
}

function confirmDelete(event: Event) {
  confirm.require({
    target: event.currentTarget as HTMLElement,
    message: `Are you sure you want to delete "${product.value?.name}"? This action cannot be undone.`,
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
    accept: () => handleDelete(),
  })
}

function navigateToEdit() {
  router.push({ name: 'product.edit', params: { id } })
}

function navigateToBack() {
  router.back()
}

onMounted(() => {
  loadProduct()
})
</script>

<template>
  <div class="product-detail-page">
    <ConfirmPopup />
    <!-- Breadcrumbs -->
    <Breadcrumb :home="home" :model="items" />

    <!-- Header -->
    <div class="page-header" v-if="product">
      <div class="page-header__left">
        <h2>{{ product.name }}</h2>
        <Tag :value="product.is_active ? 'Active' : 'Inactive'" />
      </div>
      <div class="page-header__right">
        <Button
          label="Back to List"
          icon="pi pi-arrow-left"
          text
          @click="navigateToBack"
        />
        <Button
          label="Edit Product"
          icon="pi pi-pencil"
          severity="primary"
          @click="navigateToEdit"
        />
      </div>
    </div>

    <!-- Loading -->
    <ProgressBar v-if="isLoading" mode="indeterminate" style="height: 3px" />

    <!-- Error / Not Found -->
    <div v-if="!isLoading && !product" class="error-state">
      <i class="pi pi-exclamation-triangle" style="font-size: 3rem; color: var(--p-text-300-color)" />
      <h3>Product Not Found</h3>
      <p>The product you're looking for doesn't exist.</p>
      <Button label="Back to List" icon="pi pi-arrow-left" @click="navigateToBack" />
    </div>

    <!-- Detail Content -->
    <div v-if="product && !isLoading" class="detail-grid">
      <!-- Main Info -->
      <Card title="Product Information">
        <div class="detail-grid__main">
          <dl class="detail-list">
            <div class="detail-list__item">
              <dt>Product Name</dt>
              <dd>{{ product.name }}</dd>
            </div>
            <div class="detail-list__item">
              <dt>Slug</dt>
              <dd>{{ product.slug }}</dd>
            </div>
            <div class="detail-list__item">
              <dt>Description</dt>
              <dd>{{ product.description || 'No description provided.' }}</dd>
            </div>
            <div class="detail-list__item">
              <dt>Price</dt>
              <dd>{{ product.price_formatted }} {{ product.currency }}</dd>
            </div>
            <div class="detail-list__item">
              <dt>Stock</dt>
              <dd>
                <strong>{{ product.stock }}</strong>
                <Tag
                  v-if="product.stock === 0"
                  value="Out of Stock"
                  severity="danger"
                />
                <Tag
                  v-else-if="product.stock < 10"
                  value="Low Stock"
                  severity="warn"
                />
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      <!-- Sidebar Info -->
      <div class="detail-grid__sidebar">
        <Card title="Category">
          <div v-if="product.category">
            <router-link :to="{ name: 'category.show', params: { id: product.category.id } }">
              {{ product.category.name }}
            </router-link>
          </div>
          <div v-else>
            <span class="text-muted">No category assigned</span>
          </div>
        </Card>

        <Card title="Owner">
          <div v-if="product.user">
            <p class="detail-owner__name">{{ product.user.name }}</p>
            <p class="detail-owner__email">{{ product.user.email }}</p>
          </div>
          <div v-else>
            <span class="text-muted">Unknown owner</span>
          </div>
        </Card>

        <Card title="Timestamps">
          <dl class="detail-list">
            <div class="detail-list__item">
              <dt>Created</dt>
              <dd>{{ new Date(product.created_at).toLocaleDateString() }}</dd>
            </div>
            <div class="detail-list__item">
              <dt>Last Updated</dt>
              <dd>{{ new Date(product.updated_at).toLocaleDateString() }}</dd>
            </div>
          </dl>
        </Card>

        <!-- Danger Zone -->
        <Card class="card--danger" title="Danger Zone">
          <p class="danger-zone__text">
            Deleting this product is permanent and cannot be undone.
          </p>
          <Button
            label="Delete Product"
            icon="pi pi-trash"
            severity="danger"
            outlined
            @click="confirmDelete($event)"
            :loading="isDeleting"
          />
        </Card>
      </div>
    </div>
  </div>
</template>
```

## Step 5 — Frontend: Breadcrumbs Setup

Add to the page's `<script setup>`:

```typescript
const home = ref({
  icon: 'pi pi-home',
  to: { name: 'home' },
})

const items = computed(() => [
  {
    label: 'Products',
    to: { name: 'products' },
  },
  {
    label: product.value?.name || 'Loading...',
    current: true,
  },
])
```

## Step 6 — Frontend: CSS

```css
.product-detail-page {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-header__left h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.detail-grid__main dl {
  margin: 0;
}

.detail-list__item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--p-content-border-color);
}

.detail-list__item:last-child {
  border-bottom: none;
}

.detail-list__item dt {
  font-weight: 500;
  color: var(--p-text-200-color);
  margin-right: 1rem;
}

.detail-owner__name {
  font-weight: 600;
  margin: 0;
}

.detail-owner__email {
  color: var(--p-text-300-color);
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

.danger-zone__text {
  color: var(--p-text-300-color);
  margin-bottom: 1rem;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 1rem;
  text-align: center;
}

.error-state h3 {
  margin: 0;
  font-size: 1.25rem;
}

.text-muted {
  color: var(--p-text-300-color);
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
```

## Step 7 — Testing

```bash
# Feature test: detail page returns product
it('returns a product by ID', function () {
    $product = Product::factory()->create();

    $response = $this->getJson("/api/v1/products/{$product->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $product->id)
        ->assertJsonPath('data.name', $product->name);
});

# Feature test: detail page returns 404 for missing product
it('returns 404 for non-existent product', function () {
    $response = $this->getJson('/api/v1/products/999999');

    $response->assertNotFound()
        ->assertJsonPath('error.code', 'NOT_FOUND');
});

# Feature test: detail page includes relationships
it('includes category in product detail', function () {
    $product = Product::factory()->create();
    $category = Category::factory()->create();
    $product->update(['category_id' => $category->id]);
    $product->load('category');

    $response = $this->getJson("/api/v1/products/{$product->id}");

    $response->assertOk()
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonPath('data.category.name', $category->name);
});
```

## Pitfalls

- **Not eager loading relationships** — Always `with(['category', 'user'])` to avoid N+1
- **Missing breadcrumbs** — Always show navigation path back to listing
- **Not handling 404s properly** — Show meaningful error page, not raw exception
- **Returning raw model attributes** — Use Resource to format dates, currencies, etc.
- **Not checking authorization** — Verify `can('view', $product)` before returning detail
- **Not showing loading state** — Display ProgressBar while fetching detail data
- **Hardcoding action buttons** — Only show buttons the user is authorized to use
- **Missing confirmation on delete** — Always confirm before delete via `useConfirm()` + a `<ConfirmPopup />` (pass the DOM `$event` so the popup can anchor to the button)
- **Not navigating back after delete** — Return user to listing page after successful delete
- **Not including timestamps** — Show created/updated dates for context
- **Not handling null relationships** — Show "No category assigned" instead of crashing
- **Missing responsive layout** — Stack sidebar below main content on mobile
