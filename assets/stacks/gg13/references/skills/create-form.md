# Create Form (Create/Edit)

Create a full create/edit form page using PrimeVue components with validation, file uploads, and navigation.

## Prerequisites

- [ ] Model, migration, and table exist
- [ ] Form Request class exists for store/update (e.g., `StoreProductRequest`, `UpdateProductRequest`)
- [ ] Service class exists (e.g., `ProductService`)
- [ ] TypeScript type exists for the resource
- [ ] Know the form fields, their types, and validation rules

## Step 1 — Backend: Form Request with DTO Mapping

Create the Form Request classes if not already done:

```bash
php artisan make:request Api/StoreProductRequest
php artisan make:request Api/UpdateProductRequest
```

Add `toDto()` method for clean data transfer:

```php
<?php

namespace App\Http\Requests\Api;

use App\Dtos\StoreProductDto;
use App\Rules\UniqueSlug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('product:create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products', 'slug')],
            'description' => ['nullable', 'string', 'max:5000'],
            'price_cents' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', Rule::in(['USD', 'EUR', 'GBP'])],
            'stock' => ['required', 'integer', 'min:0'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function toDto(): StoreProductDto
    {
        return StoreProductDto::fromRequest($this);
    }
}
```

Create the DTO class:

```bash
mkdir -p app/Dtos
```

`app/Dtos/StoreProductDto.php`:

```php
<?php

namespace App\Dtos;

readonly class StoreProductDto
{
    public function __construct(
        public string $name,
        public ?string $slug,
        public ?string $description,
        public int $priceCents,
        public string $currency,
        public int $stock,
        public ?int $categoryId,
        public bool $isActive = true,
    ) {}

    public static function fromRequest(\Illuminate\Http\Request $request): self
    {
        return new self(
            name: $request->input('name'),
            slug: $request->input('slug'),
            description: $request->input('description'),
            priceCents: $request->integer('price_cents'),
            currency: $request->input('currency'),
            stock: $request->integer('stock'),
            categoryId: $request->integer('category_id'),
            isActive: $request->boolean('is_active', true),
        );
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price_cents' => $this->priceCents,
            'currency' => $this->currency,
            'stock' => $this->stock,
            'category_id' => $this->categoryId,
            'is_active' => $this->isActive,
        ];
    }
}
```

## Step 2 — Frontend: TypeScript Types

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
  created_at: string
  updated_at: string
}

export interface CreateProductData {
  name: string
  slug?: string
  description?: string
  price_cents: number
  currency: string
  stock: number
  category_id?: number | null
  is_active?: boolean
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: number
}
```

## Step 3 — Frontend: API Service

```typescript
// resources/js/api/services/productApi.ts
import api from '@/api/client'
import type { CreateProductData, UpdateProductData, Product } from '@/types/product'
import type { ApiResponse } from '@/types/api'

export async function createProduct(data: CreateProductData): Promise<Product> {
  const response = await api.post<{ data: Product }>('/products', data)
  return response.data.data
}

export async function updateProduct(id: number, data: UpdateProductData): Promise<Product> {
  const response = await api.patch<{ data: Product }>(`/products/${id}`, data)
  return response.data.data
}

export async function fetchProduct(id: number): Promise<Product> {
  const response = await api.get<{ data: Product }>(`/products/${id}`)
  return response.data.data
}
```

## Step 4 — Frontend: Create Form Page

Create `resources/js/pages/products/ProductCreatePage.vue`:

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import Card from 'primevue/card'
import { createProduct } from '@/api/services/productApi'
import type { CreateProductData } from '@/types/product'

const router = useRouter()
const toast = useToast()

const isLoading = ref(false)
const serverErrors = ref<Record<string, string[]>>({})

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

async function handleSubmit() {
  isLoading.value = true
  serverErrors.value = {}

  try {
    await createProduct(formData)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product created successfully',
      life: 3000,
    })
    router.push({ name: 'products' })
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
    isLoading.value = false
  }
}

function handleCancel() {
  router.back()
}
</script>

<template>
  <div class="product-create-page">
    <div class="page-header">
      <h2>Create Product</h2>
      <Button label="Cancel" icon="pi pi-arrow-left" text @click="handleCancel" />
    </div>

    <Card>
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <!-- Name -->
          <div class="form-group">
            <label for="name">Product Name <span class="required">*</span></label>
            <InputText
              id="name"
              v-model="formData.name"
              placeholder="Enter product name"
              :class="{ 'p-invalid': serverErrors?.name }"
            />
            <Message v-if="serverErrors?.name" severity="error" size="small" :text="serverErrors.name[0]" />
          </div>

          <!-- Slug -->
          <div class="form-group">
            <label for="slug">Slug</label>
            <InputText
              id="slug"
              v-model="formData.slug"
              placeholder="auto-generated-from-name"
              :class="{ 'p-invalid': serverErrors?.slug }"
            />
            <Message v-if="serverErrors?.slug" severity="error" size="small" :text="serverErrors.slug[0]" />
            <small class="help-text">Leave empty to auto-generate from name</small>
          </div>

          <!-- Price -->
          <div class="form-group">
            <label for="price_cents">Price (cents) <span class="required">*</span></label>
            <InputNumber
              id="price_cents"
              v-model="formData.price_cents"
              mode="decimal"
              :min="1"
              :class="{ 'p-invalid': serverErrors?.price_cents }"
            />
            <!--
              A cents INTEGER, so NEITHER fraction prop. This carried
              :min-fraction-digits="0", which reads like an opt-out and is not one:
              `!0` is `true`. See design-system/forms.md, "max-fraction-digits is
              what makes the field usable on a phone".
            -->
            <Message v-if="serverErrors?.price_cents" severity="error" size="small" :text="serverErrors.price_cents[0]" />
          </div>

          <!-- Currency -->
          <div class="form-group">
            <label for="currency">Currency <span class="required">*</span></label>
            <Select
              id="currency"
              v-model="formData.currency"
              :options="['USD', 'EUR', 'GBP']"
              placeholder="Select currency"
              :class="{ 'p-invalid': serverErrors?.currency }"
            />
            <Message v-if="serverErrors?.currency" severity="error" size="small" :text="serverErrors.currency[0]" />
          </div>

          <!-- Stock -->
          <div class="form-group">
            <label for="stock">Stock <span class="required">*</span></label>
            <InputNumber
              id="stock"
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
            <label for="category_id">Category</label>
            <Select
              id="category_id"
              v-model="formData.category_id"
              :options="[]"
              option-label="name"
              option-value="id"
              placeholder="Select category"
              :class="{ 'p-invalid': serverErrors?.category_id }"
            />
            <Message v-if="serverErrors?.category_id" severity="error" size="small" :text="serverErrors.category_id[0]" />
          </div>

          <!-- Description -->
          <div class="form-group form-group--full">
            <label for="description">Description</label>
            <Textarea
              id="description"
              v-model="formData.description"
              rows="4"
              placeholder="Enter product description"
              :class="{ 'p-invalid': serverErrors?.description }"
            />
            <Message v-if="serverErrors?.description" severity="error" size="small" :text="serverErrors.description[0]" />
          </div>

          <!-- Active -->
          <div class="form-group">
            <div class="form-group__checkbox">
              <Checkbox v-model="formData.is_active" input-id="is_active" />
              <label for="is_active">Active</label>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <Button label="Cancel" text @click="handleCancel" />
          <Button
            type="submit"
            label="Create Product"
            icon="pi pi-check"
            severity="primary"
            :loading="isLoading"
          />
        </div>
      </form>
    </Card>
  </div>
</template>
```

## Step 5 — Frontend: Edit Form Page

Create `resources/js/pages/products/ProductEditPage.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import Card from 'primevue/card'
import { fetchProduct, updateProduct } from '@/api/services/productApi'
import type { Product, UpdateProductData } from '@/types/product'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const isLoading = ref(false)
const isSubmitting = ref(false)
const serverErrors = ref<Record<string, string[]>>({})
const product = ref<Product | null>(null)

const id = Number(route.params.id)

const formData = reactive<UpdateProductData>({
  id,
  name: '',
  slug: '',
  description: null,
  price_cents: 0,
  currency: 'USD',
  stock: 0,
  category_id: null,
  is_active: true,
})

async function loadProduct() {
  isLoading.value = true
  try {
    const data = await fetchProduct(id)
    product.value = data
    Object.assign(formData, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      price_cents: data.price_cents,
      currency: data.currency,
      stock: data.stock,
      category_id: data.category_id,
      is_active: data.is_active,
    })
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load product',
      life: 5000,
    })
    router.push({ name: 'products' })
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit() {
  isSubmitting.value = true
  serverErrors.value = {}

  try {
    const { id: _, ...updateData } = formData
    await updateProduct(id, updateData)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product updated successfully',
      life: 3000,
    })
    router.push({ name: 'products' })
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
        detail: 'Failed to update product',
        life: 5000,
      })
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  router.back()
}

onMounted(() => {
  loadProduct()
})
</script>

<template>
  <div class="product-edit-page">
    <div class="page-header">
      <h2>Edit Product</h2>
      <Button label="Cancel" icon="pi pi-arrow-left" text @click="handleCancel" />
    </div>

    <div v-if="isLoading" class="list-loading">
      <ProgressBar mode="indeterminate" />
    </div>

    <Card v-else>
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Product Name <span class="required">*</span></label>
            <InputText
              id="name"
              v-model="formData.name"
              :class="{ 'p-invalid': serverErrors?.name }"
            />
            <Message v-if="serverErrors?.name" severity="error" size="small" :text="serverErrors.name[0]" />
          </div>

          <div class="form-group">
            <label for="slug">Slug</label>
            <InputText
              id="slug"
              v-model="formData.slug"
              :class="{ 'p-invalid': serverErrors?.slug }"
            />
            <Message v-if="serverErrors?.slug" severity="error" size="small" :text="serverErrors.slug[0]" />
          </div>

          <div class="form-group">
            <label for="price_cents">Price (cents) <span class="required">*</span></label>
            <InputNumber
              id="price_cents"
              v-model="formData.price_cents"
              :min="1"
              :class="{ 'p-invalid': serverErrors?.price_cents }"
            />
            <Message v-if="serverErrors?.price_cents" severity="error" size="small" :text="serverErrors.price_cents[0]" />
          </div>

          <div class="form-group">
            <label for="currency">Currency <span class="required">*</span></label>
            <Select
              id="currency"
              v-model="formData.currency"
              :options="['USD', 'EUR', 'GBP']"
              :class="{ 'p-invalid': serverErrors?.currency }"
            />
            <Message v-if="serverErrors?.currency" severity="error" size="small" :text="serverErrors.currency[0]" />
          </div>

          <div class="form-group">
            <label for="stock">Stock <span class="required">*</span></label>
            <InputNumber
              id="stock"
              v-model="formData.stock"
              :min="0"
              :show-buttons="true"
              :class="{ 'p-invalid': serverErrors?.stock }"
            />
            <Message v-if="serverErrors?.stock" severity="error" size="small" :text="serverErrors.stock[0]" />
          </div>

          <div class="form-group">
            <label for="category_id">Category</label>
            <Select
              id="category_id"
              v-model="formData.category_id"
              :options="[]"
              option-label="name"
              option-value="id"
              placeholder="Select category"
              :class="{ 'p-invalid': serverErrors?.category_id }"
            />
            <Message v-if="serverErrors?.category_id" severity="error" size="small" :text="serverErrors.category_id[0]" />
          </div>

          <div class="form-group form-group--full">
            <label for="description">Description</label>
            <Textarea
              id="description"
              v-model="formData.description || ''"
              rows="4"
              :class="{ 'p-invalid': serverErrors?.description }"
            />
            <Message v-if="serverErrors?.description" severity="error" size="small" :text="serverErrors.description[0]" />
          </div>

          <div class="form-group">
            <div class="form-group__checkbox">
              <Checkbox v-model="formData.is_active" input-id="is_active" />
              <label for="is_active">Active</label>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <Button label="Cancel" text @click="handleCancel" />
          <Button
            type="submit"
            label="Save Changes"
            icon="pi pi-check"
            severity="primary"
            :loading="isSubmitting"
          />
        </div>
      </form>
    </Card>
  </div>
</template>
```

## Testing

```bash
# Backend: test form request validation
it('validates product name is required', function () {
    $response = $this->postJson('/api/v1/products', [
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => 10,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

# Frontend: test form submission flow in Pest (optional)
it('can create a product via the API', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/products', [
        'name' => 'Test Product',
        'price_cents' => 1000,
        'currency' => 'USD',
        'stock' => 5,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Test Product');
});
```

## Pitfalls

- **Not handling 422 validation errors on frontend** — Map server errors to form fields
- **Not pre-populating form data for edits** — Fetch the resource before rendering the form
- **Submitting on every keystroke** — Submit only on form submit event, not on input change
- **Forgetting to clear errors on new submission** — Reset `serverErrors` at the start of handleSubmit
- **Not including CSRF token for web forms** — Axios interceptor handles this automatically
- **Missing required field markers** — Show visual indicators (e.g., `*`) on required fields
- **Not disabling submit button during loading** — Prevents double submissions
- **Returning 500 on validation failure** — Ensure Form Request returns proper 422 with error details
