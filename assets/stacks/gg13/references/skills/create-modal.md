# Create Modal Form

Build a modal form using PrimeVue Dialog component with form integration, validation, and dynamic content loading.

## Prerequisites

- [ ] Model, migration, and table exist
- [ ] Form Request class exists (e.g., `StoreProductRequest`)
- [ ] API service function exists (e.g., `createProduct`, `updateProduct`)
- [ ] TypeScript type exists for the resource
- [ ] Know whether the modal is for create, edit, or quick actions

## Step 1 — Backend: Modal Endpoint

Create a dedicated endpoint for modal data if it needs dropdown options, enums, or related data:

```php
// routes/api.php
Route::prefix('v1')->group(function () {
    Route::get('/products/modal-data', [ProductController::class, 'modalData'])->name('products.modal-data');
});
```

```php
// app/Http/Controllers/Api/ProductController.php
public function modalData(): JsonResponse
{
    return response()->json([
        'data' => [
            'categories' => Category::active()->orderBy('name')->get(['id', 'name']),
            'statuses' => [
                ['value' => 'active', 'label' => 'Active'],
                ['value' => 'draft', 'label' => 'Draft'],
            ],
            'currencies' => ['USD', 'EUR', 'GBP'],
        ],
    ]);
}
```

## Step 2 — Frontend: API Service

```typescript
// resources/js/api/services/productApi.ts
import api from '@/api/client'
import type { CreateProductData } from '@/types/product'
import type { ApiResponse } from '@/types/api'

export async function createProduct(data: CreateProductData): Promise<Product> {
  const response = await api.post<{ data: Product }>('/products', data)
  return response.data.data
}

export async function fetchModalData(): Promise<ModalData> {
  const response = await api.get<{ data: ModalData }>('/products/modal-data')
  return response.data.data
}

export interface ModalData {
  categories: { id: number; name: string }[]
  statuses: { value: string; label: string }[]
  currencies: string[]
}
```

## Step 3 — Frontend: Modal Component

Create `resources/js/components/ProductModal.vue`:

```vue
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'
import { createProduct } from '@/api/services/productApi'
import type { CreateProductData, Product } from '@/types/product'
import type { ModalData } from '@/api/services/productApi'

interface Props {
  modelValue: boolean
  mode: 'create' | 'edit'
  productId?: number
}

const props = withDefaults(defineProps<Props>(), {
  productId: null,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', product: Product): void
  (e: 'closed'): void
}>()

const toast = useToast()

const isLoading = ref(false)
const isSubmitting = ref(false)
const serverErrors = ref<Record<string, string[]>>({})
const modalData = ref<ModalData | null>(null)

const formData = reactive<CreateProductData>({
  name: '',
  slug: '',
  description: '',
  price_cents: 0,
  currency: 'USD',
  stock: 0,
  category_id: null,
  is_active: true,
})

const isFormValid = computed(() => {
  return formData.name.trim().length > 0
    && formData.price_cents > 0
    && formData.stock >= 0
})

async function loadModalData() {
  try {
    modalData.value = await fetchModalData()
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load modal options',
      life: 5000,
    })
  }
}

async function handleSubmit() {
  if (!isFormValid.value) return

  isSubmitting.value = true
  serverErrors.value = {}

  try {
    await createProduct(formData)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product created successfully',
      life: 3000,
    })
    emit('saved', formData as unknown as Product)
    resetForm()
    emit('update:modelValue', false)
  } catch (error: any) {
    if (error.response?.status === 422) {
      serverErrors.value = error.response.data.error.details || {}
      toast.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix the errors and try again',
        life: 5000,
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create product',
        life: 5000,
      })
    }
  } finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    slug: '',
    description: '',
    price_cents: 0,
    currency: 'USD',
    stock: 0,
    category_id: null,
    is_active: true,
  })
  serverErrors.value = {}
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
  emit('closed')
}

onMounted(() => {
  loadModalData()
})
</script>

<template>
  <Dialog
    :visible="modelValue"
    @update:visible="handleClose"
    modal
    :header="mode === 'create' ? 'Create Product' : 'Edit Product'"
    :style="{ width: '500px', maxWidth: '90vw' }"
    :breakpoints="{ '576px': '95vw' }"
    :draggable="false"
    :resizable="false"
    position="center"
  >
    <template #header>
      <div class="modal-header">
        <span>{{ mode === 'create' ? 'Create Product' : 'Edit Product' }}</span>
      </div>
    </template>

    <div class="modal-body">
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <!-- Name -->
          <div class="form-group">
            <label for="modal-name">Product Name <span class="required">*</span></label>
            <InputText
              id="modal-name"
              v-model="formData.name"
              placeholder="Enter product name"
              autofocus
              :class="{ 'p-invalid': serverErrors?.name }"
            />
            <Message v-if="serverErrors?.name" severity="error" size="small" :text="serverErrors.name[0]" />
          </div>

          <!-- Slug -->
          <div class="form-group">
            <label for="modal-slug">Slug</label>
            <InputText
              id="modal-slug"
              v-model="formData.slug"
              placeholder="auto-generated"
              :class="{ 'p-invalid': serverErrors?.slug }"
            />
            <Message v-if="serverErrors?.slug" severity="error" size="small" :text="serverErrors.slug[0]" />
          </div>

          <!-- Price -->
          <div class="form-group">
            <label for="modal-price">Price (cents) <span class="required">*</span></label>
            <InputNumber
              id="modal-price"
              v-model="formData.price_cents"
              mode="decimal"
              :min="1"
              :class="{ 'p-invalid': serverErrors?.price_cents }"
            />
            <Message v-if="serverErrors?.price_cents" severity="error" size="small" :text="serverErrors.price_cents[0]" />
          </div>

          <!-- Currency -->
          <div class="form-group">
            <label for="modal-currency">Currency <span class="required">*</span></label>
            <Select
              id="modal-currency"
              v-model="formData.currency"
              :options="modalData?.currencies || []"
              placeholder="Select currency"
              :class="{ 'p-invalid': serverErrors?.currency }"
            />
            <Message v-if="serverErrors?.currency" severity="error" size="small" :text="serverErrors.currency[0]" />
          </div>

          <!-- Stock -->
          <div class="form-group">
            <label for="modal-stock">Stock <span class="required">*</span></label>
            <InputNumber
              id="modal-stock"
              v-model="formData.stock"
              mode="decimal"
              :min="0"
              :show-buttons="true"
              :class="{ 'p-invalid': serverErrors?.stock }"
            />
            <Message v-if="serverErrors?.stock" severity="error" size="small" :text="serverErrors.stock[0]" />
          </div>

          <!-- Category -->
          <div class="form-group">
            <label for="modal-category">Category</label>
            <Select
              id="modal-category"
              v-model="formData.category_id"
              :options="modalData?.categories || []"
              option-label="name"
              option-value="id"
              placeholder="Select category"
              :class="{ 'p-invalid': serverErrors?.category_id }"
            />
            <Message v-if="serverErrors?.category_id" severity="error" size="small" :text="serverErrors.category_id[0]" />
          </div>

          <!-- Description -->
          <div class="form-group form-group--full">
            <label for="modal-description">Description</label>
            <Textarea
              id="modal-description"
              v-model="formData.description"
              rows="3"
              placeholder="Enter product description"
              :class="{ 'p-invalid': serverErrors?.description }"
            />
            <Message v-if="serverErrors?.description" severity="error" size="small" :text="serverErrors.description[0]" />
          </div>
        </div>
      </form>
    </div>

    <template #footer>
      <div class="modal-footer">
        <Button
          label="Cancel"
          severity="secondary"
          text
          :loading="isSubmitting"
          @click="handleClose"
        />
        <Button
          label="Create Product"
          severity="primary"
          :disabled="!isFormValid || isSubmitting"
          :loading="isSubmitting"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>
```

## Step 4 — Frontend: Parent Page Using Modal

Create or edit the listing page to include the modal:

```vue
<!-- resources/js/pages/products/ProductListPage.vue -->
<script setup lang="ts">
// ... existing imports and logic ...

import ProductModal from '@/components/ProductModal.vue'

const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingProductId = ref<number | null>(null)

function openCreateModal() {
  modalMode.value = 'create'
  editingProductId.value = null
  showModal.value = true
}

function openEditModal(product: Product) {
  modalMode.value = 'edit'
  editingProductId.value = product.id
  showModal.value = true
}

function handleModalSaved(product: Product) {
  // Refresh the listing after save
  loadProducts()
}
</script>

<template>
  <div class="product-list-page">
    <!-- ... existing listing content ... -->

    <ProductModal
      v-model="showModal"
      :mode="modalMode"
      :product-id="editingProductId"
      @saved="handleModalSaved"
    />
  </div>
</template>
```

## Step 5 — Testing

```bash
# Backend: test modal data endpoint
it('returns modal options for product form', function () {
    Category::factory()->create(['name' => 'Electronics', 'is_active' => true]);

    $response = $this->getJson('/api/v1/products/modal-data');

    $response->assertOk()
        ->assertJsonPath('data.categories.0.name', 'Electronics')
        ->assertJsonStructure(['data' => ['categories', 'statuses', 'currencies']]);
});

# Feature: test product creation via modal
it('creates a product via the store endpoint', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('product:create');

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Test Product',
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => 10,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Test Product');
});

# Frontend: test modal opens and closes
it('opens the modal when create button is clicked', () => {
  // mount listing page with button
  // click create button
  // assert modal is visible
});

it('closes the modal when cancel is clicked', () => {
  // mount modal
  // assert visible
  // click cancel
  // assert closed
});
```

## Pitfalls

- **Not loading modal options eagerly** — Fetch dropdown data before opening modal
- **Not resetting form on close** — Clear all fields when modal closes to prevent stale data
- **Submitting when form is invalid** — Disable submit button when form is not valid
- **Not handling 422 errors inside modal** — Show validation errors inline in modal
- **Using `v-model` on Dialog incorrectly** — Use `:visible` and `@update:visible` pattern
- **Modal not accessible** — Use `modal` prop on Dialog for trap focus and backdrop
- **Not providing proper ARIA labels** — Add labels for screen readers
- **Hardcoding form data structure** — Use reactive form object that can be reset
- **Not handling modal backdrop click** — Decide if backdrop click should close the modal
- **Missing loading state during submit** — Prevent double submissions with loading flag
