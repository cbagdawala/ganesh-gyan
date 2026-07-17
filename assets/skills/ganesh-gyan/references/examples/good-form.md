# Good Form Example

A complete form with validation, file upload, success/error states, and PrimeVue components.

---

## Context

- **Framework**: Vue 3 Composition API
- **UI**: PrimeVue 4 (InputText, InputNumber, DatePicker, Editor, FileUpload, Dialog, Toast, Message, AutoComplete)
- **API**: Laravel backend with file upload support
- **State**: Reactive form data + submission state

---

## Component: `ProductForm.vue`

```vue
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { Product, Category } from '@/types/product'
import ProductService from '@/services/productService'
import { formatCurrency, formatFilesize } from '@/utils/format'

// --- Props ---
interface Props {
    model?: Product | null
    mode?: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
    model: null,
    mode: 'create',
})

// --- Emits ---
interface Emits {
    (e: 'saved', product: Product): void
    (e: 'cancelled'): void
}

const emit = defineEmits<Emits>()

// --- Setup ---
const toast = useToast()
const confirm = useConfirm()
const loading = ref(false)
const saving = ref(false)
const hasChanges = ref(false)

const form = reactive({
    name: '',
    sku: '',
    price: null as number | null,
    cost_price: null as number | null,
    category_id: undefined as number | undefined,
    warehouse_id: undefined as number | undefined,
    status: 'active' as 'active' | 'inactive',
    description: '',
    tags: [] as string[],
    images: [] as File[],
})

const imagePreview = ref<string[]>([])
const categories = ref<Category[]>([])

// --- Computed ---
const isCreating = computed(() => props.mode === 'create')
const title = computed(() => (isCreating.value ? 'New Product' : 'Edit Product'))

const validationErrors = computed(() => {
    if (!form.name.trim()) return 'Product name is required'
    if (!form.sku.trim()) return 'SKU is required'
    if (form.price === null || form.price <= 0) return 'Price must be a positive number'
    if (form.category_id === undefined) return 'Category is required'
    return null
})

const canSave = computed(() => !validationErrors.value && !saving.value)

// --- Methods ---
function loadProduct() {
    if (!props.model) return

    loading.value = true
    ProductService.show(props.model.id)
        .then((res) => {
            const p = res.data
            Object.assign(form, {
                name: p.name,
                sku: p.sku,
                price: p.price,
                cost_price: p.cost_price,
                category_id: p.category_id,
                warehouse_id: p.warehouse_id,
                status: p.status,
                description: p.description || '',
                tags: p.tags || [],
            })
            imagePreview.value = p.images?.map((img: any) => img.url) || []
        })
        .catch(() => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load product', life: 4000 })
        })
        .finally(() => {
            loading.value = false
        })
}

async function save() {
    if (!canSave.value) return

    saving.value = true
    const formData = new FormData()

    // Append form fields
    formData.append('name', form.name)
    formData.append('sku', form.sku)
    formData.append('price', String(form.price))
    if (form.cost_price !== null) formData.append('cost_price', String(form.cost_price))
    if (form.category_id !== undefined) formData.append('category_id', String(form.category_id))
    if (form.warehouse_id !== undefined) formData.append('warehouse_id', String(form.warehouse_id))
    formData.append('status', form.status)
    formData.append('description', form.description)
    formData.append('tags', JSON.stringify(form.tags))

    // Append images
    for (const file of form.images) {
        formData.append('images[]', file)
    }

    try {
        const response = isCreating.value
            ? await ProductService.store(formData)
            : await ProductService.update(props.model!.id, formData)

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: isCreating.value ? 'Product created' : 'Product updated',
            life: 3000,
        })

        emit('saved', response.data)
    } catch (error: any) {
        if (error.response?.status === 422) {
            const errors = error.response.data.errors
            Object.entries(errors).forEach(([field, msgs]) => {
                toast.add({
                    severity: 'error',
                    summary: 'Validation Error',
                    detail: `${field}: ${msgs[0]}`,
                    life: 5000,
                })
            })
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save product. Please try again.',
                life: 5000,
            })
        }
    } finally {
        saving.value = false
    }
}

function onImageUpload(event: any) {
    const files = event.files || []
    form.images.push(...files)
    imagePreview.value.push(...files.map((f: File) => URL.createObjectURL(f)))
    hasChanges.value = true
}

function removeImage(index: number) {
    form.images.splice(index, 1)
    imagePreview.value.splice(index, 1)
    hasChanges.value = true
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (hasChanges.value) {
        e.preventDefault()
        e.returnValue = ''
    }
}

// --- Lifecycle ---
onMounted(() => {
    ProductService.listCategories().then((res) => {
        categories.value = res.data.data
    })

    if (props.model) {
        loadProduct()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
})

defineExpose({
    save,
    reset: () => {
        Object.assign(form, {
            name: '', sku: '', price: null, cost_price: null,
            category_id: undefined, warehouse_id: undefined,
            status: 'active', description: '', tags: [], images: [],
        })
        imagePreview.value = []
        hasChanges.value = false
    },
})
</script>

<template>
    <div class="product-form" v-if="loading">
        <!-- Skeleton has no `number` prop; render N via v-for. -->
        <Skeleton v-for="n in 3" :key="n" height="2rem" class="mb-2" />
        <Skeleton width="100%" height="200px" />
    </div>
    <div v-else class="product-form">
        <div class="flex justify-content-between align-items-center mb-4">
            <h2 class="text-xl font-bold">{{ title }}</h2>
            <Button text @click="emit('cancelled')">
                <template #icon><i class="pi pi-times" /></template>
            </Button>
        </div>

        <!-- Validation message -->
        <Message v-if="validationErrors" severity="warn" class="mb-3">
            {{ validationErrors }}
        </Message>

        <form @submit.prevent="save" class="grid">
            <!-- Left Column: Basic Info -->
            <div class="col-12 md:col-8">
                <Panel header="Basic Information" class="mb-4">
                    <div class="grid mb-3">
                        <div class="col-6">
                            <label for="name" class="block mb-2 font-medium">Product Name *</label>
                            <InputText
                                id="name"
                                v-model="form.name"
                                placeholder="e.g. Wireless Mouse"
                                :class="{ 'p-invalid': !form.name.trim() }"
                                @input="hasChanges = true"
                            />
                            <small v-if="!form.name.trim()" class="p-error">Name is required</small>
                        </div>

                        <div class="col-6">
                            <label for="sku" class="block mb-2 font-medium">SKU *</label>
                            <InputText
                                id="sku"
                                v-model="form.sku"
                                placeholder="e.g. WM-001"
                                :class="{ 'p-invalid': !form.sku.trim() }"
                                @input="hasChanges = true"
                            />
                            <small v-if="!form.sku.trim()" class="p-error">SKU is required</small>
                        </div>
                    </div>

                    <div class="grid mb-3">
                        <div class="col-6">
                            <label for="price" class="block mb-2 font-medium">Price ($)</label>
                            <InputNumber
                                id="price"
                                v-model="form.price"
                                mode="decimal"
                                :min="0"
                                :minFractionDigits="2"
                                :maxFractionDigits="2"
                                :class="{ 'p-invalid': form.price !== null && form.price <= 0 }"
                                @input="hasChanges = true"
                            />
                            <small v-if="form.price !== null && form.price <= 0" class="p-error">
                                Price must be positive
                            </small>
                        </div>

                        <div class="col-6">
                            <label for="cost_price" class="block mb-2 font-medium">Cost Price ($)</label>
                            <InputNumber
                                id="cost_price"
                                v-model="form.cost_price"
                                mode="decimal"
                                :min="0"
                                :minFractionDigits="2"
                                :maxFractionDigits="2"
                                @input="hasChanges = true"
                            />
                        </div>
                    </div>

                    <div class="grid mb-3">
                        <div class="col-6">
                            <label for="category" class="block mb-2 font-medium">Category *</label>
                            <Select
                                id="category"
                                v-model="form.category_id"
                                :options="categories"
                                option-label="name"
                                option-value="id"
                                placeholder="Select category"
                                :class="{ 'p-invalid': !form.category_id }"
                                :loading="categories.length === 0"
                                @change="hasChanges = true"
                            />
                            <small v-if="!form.category_id" class="p-error">Category is required</small>
                        </div>

                        <div class="col-6">
                            <label for="status" class="block mb-2 font-medium">Status</label>
                            <Select
                                id="status"
                                v-model="form.status"
                                :options="[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]"
                                option-label="label"
                                option-value="value"
                                @change="hasChanges = true"
                            />
                        </div>
                    </div>

                    <div class="mb-3">
                        <label for="description" class="block mb-2 font-medium">Description</label>
                        <Editor
                            id="description"
                            v-model="form.description"
                            :style="{ height: '200px' }"
                            editor-style="border: 1px solid #ced4da; border-radius: 6px"
                            @input="hasChanges = true"
                        />
                    </div>

                    <div class="mb-3">
                        <label class="block mb-2 font-medium">Tags</label>
                        <!-- PrimeVue 4 has no TagInput/Chips component; use AutoComplete
                             in `multiple` mode for free-form tag entry. -->
                        <AutoComplete
                            v-model="form.tags"
                            multiple
                            :typeahead="false"
                            placeholder="Add a tag"
                            @change="hasChanges = true"
                        />
                    </div>
                </Panel>

                <!-- Images -->
                <Panel header="Product Images" class="mb-4">
                    <FileUpload
                        mode="basic"
                        name="images[]"
                        accept="image/*"
                        :max-file-size="5242880"
                        :auto="true"
                        choose-label="Choose Images"
                        @select="onImageUpload"
                    />
                    <small class="text-500 block mt-2">Max 5MB per image. Upload up to 6 images.</small>

                    <div class="grid mt-4" v-if="imagePreview.length > 0">
                        <div
                            v-for="(img, index) in imagePreview"
                            :key="index"
                            class="col-3 mb-3"
                        >
                            <div class="relative">
                                <img :src="img" class="w-full rounded border" style="height: 120px; object-fit: cover" />
                                <Button
                                    icon="pi pi-times"
                                    severity="danger"
                                    size="small"
                                    rounded
                                    class="absolute top-1 right-1"
                                    @click="removeImage(index)"
                                />
                            </div>
                        </div>
                    </div>
                </Panel>
            </div>

            <!-- Right Column: SEO / Meta -->
            <div class="col-12 md:col-4">
                <Panel header="Metadata" class="mb-4">
                    <div class="mb-3">
                        <label for="warehouse" class="block mb-2 font-medium">Warehouse</label>
                        <Select
                            id="warehouse"
                            v-model="form.warehouse_id"
                            :options="[]"
                            option-label="name"
                            option-value="id"
                            placeholder="Select warehouse"
                            @change="hasChanges = true"
                        />
                    </div>
                </Panel>
            </div>

            <!-- Footer Actions -->
            <div class="col-12 flex justify-content-end gap-2 mt-4">
                <Button label="Cancel" outlined @click="emit('cancelled')" />
                <Button
                    label="Save"
                    icon="pi pi-check"
                    :disabled="!canSave"
                    :loading="saving"
                    @click="save"
                />
            </div>
        </form>
    </div>
</template>
```

---

## API Service

```ts
// @/services/productService.ts
import api from '@/utils/api'
import type { Product } from '@/types/product'

export default {
    list(params: any) {
        return api.get('/products', { params })
    },
    show(id: number) {
        return api.get(`/products/${id}`)
    },
    store(data: FormData) {
        return api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    update(id: number, data: FormData) {
        return api.patch(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    listCategories() {
        return api.get('/categories')
    },
}
```

---

## Key Patterns

| Pattern | Why |
|---------|-----|
| `FormData` for submission | Native way to handle multipart file uploads |
| Reactive form object | Single source of truth for all form fields |
| `hasChanges` tracking | Warns user before navigating away with unsaved data |
| `beforeunload` event | Browser-native unsaved changes protection |
| Separate `saving` and `loading` | Loading = initial data fetch; Saving = submission in progress |
| Computed `canSave` | Disables button when validation fails or saving |
| Error handling by status code | 422 = validation; other = generic error |
| `defineExpose({ save, reset })` | Parent can control form lifecycle |
| `v-model` on all inputs | Two-way binding keeps state in sync |
| `:class="{ 'p-invalid': ... }"` | PrimeVue visual error indicators |
| `FileUpload` with preview | Immediate visual feedback on selected images |
| Skeleton loading state | Better perceived performance than blank screen |
