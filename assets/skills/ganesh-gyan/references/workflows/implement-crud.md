# Implement Full CRUD

## When to Use

When you need to build a complete Create, Read, Update, Delete implementation for a resource from scratch. Covers listing with pagination, create/edit forms, detail view, and delete operations.

## Prerequisites

- Laravel 13 project with database configured
- Vue 3 + PrimeVue installed
- API route prefix configured
- Authentication middleware available

## Step-by-Step Workflow

### 1. Create Database Migration

```bash
php artisan make:migration create_<table>_table --create=<table>
```

Define schema with:
- Primary key (auto)
- All required columns with appropriate types
- `timestamps()` and optionally `softDeletes()`
- Indexes on frequently filtered/sorted columns

### 2. Create Eloquent Model

```bash
php artisan make:model <Model> -m
```

Configure:
- `$fillable` array
- `$casts` for type casting
- `$hidden` for sensitive data
- Relationships if any

### 3. Create Resource Controller

```bash
php artisan make:controller <Model>Controller --api
```

Implement all CRUD methods:

**List (index):**
```php
public function index(Request $request)
{
    $query = <Model>::query();
    // Apply filters
    if ($request->filled('search')) {
        $query->where('name', 'like', "%{$request->search}%");
    }
    $items = $query->latest()->paginate($request->get('per_page', 15));
    return response()->json($items);
}
```

**Create (store):**
```php
public function store(Store<Model>Request $request)
{
    $item = <Model>::create($request->validated());
    return response()->json($item, 201);
}
```

**Show:**
```php
public function show(<Model> $item)
{
    return response()->json($item->load('relationship'));
}
```

**Update:**
```php
public function update(Update<Model>Request $request, <Model> $item)
{
    $item->update($request->validated());
    return response()->json($item);
}
```

**Delete:**
```php
public function destroy(<Model> $item)
{
    $item->delete();
    return response()->json(null, 204);
}
```

### 4. Create Form Request Classes

```bash
php artisan make:request Store<Model>Request
php artisan make:request Update<Model>Request
```

Define rules, authorization, and error messages.

### 5. Create API Resource (Transformer)

```bash
php artisan make:resource <Model>Resource
php artisan make:resource <Model>Collection
```

### 6. Register Routes

In `routes/api.php`:

```php
Route::middleware('auth:sanctum')->prefix('<resource>')->group(function () {
    Route::get('/', [<Model>Controller::class, 'index'])->name('<resource>.index');
    Route::post('/', [<Model>Controller::class, 'store'])->name('<resource>.store');
    Route::get('/{item}', [<Model>Controller::class, 'show'])->name('<resource>.show');
    Route::put('/{item}', [<Model>Controller::class, 'update'])->name('<resource>.update');
    Route::patch('/{item}', [<Model>Controller::class, 'update'])->name('<resource>.patch');
    Route::delete('/{item}', [<Model>Controller::class, 'destroy'])->name('<resource>.destroy');
});
```

### 7. Create Vue Pages

#### List Page (`resources/js/Pages/<Model>/List.vue`)

```vue
<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api/client';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

const items = ref([]);
const loading = ref(false);
const search = ref('');
const first = ref(0);
const rows = ref(15);

const loadItems = async () => {
    loading.value = true;
    const { data } = await api.get('/<resource>', {
        params: {
            page: (first.value / rows.value) + 1,
            per_page: rows.value,
            ...(search.value ? { search: search.value } : {}),
        },
    });
    items.value = data;
    loading.value = false;
};

const deleteItem = async (id) => {
    await api.delete(`/<resource>/${id}`);
    loadItems();
};
</script>

<template>
    <div>
        <Toast />
        <ConfirmDialog />
        <div class="flex justify-between mb-4">
            <InputText v-model="search" placeholder="Search..." @change="loadItems" />
            <Button label="Create" @click="$router.push('/<resource>/create')" />
        </div>
        <DataTable :value="items.data" :loading="loading" paginator :first="first" :rows="rows" @page="loadItems">
            <Column field="id" header="ID" />
            <Column field="name" header="Name" sortable filterable />
            <Column header="Actions">
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" class="p-button-text" @click="$router.push('/<resource>/' + data.id)" />
                    <Button icon="pi pi-trash" class="p-button-text p-button-danger" @click="deleteItem(data.id)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
```

#### Create Page (`resources/js/Pages/<Model>/Create.vue`)

```vue
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api/client';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Password from 'primevue/password';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import ToggleSwitch from 'primevue/toggleswitch';
import FloatLabel from 'primevue/floatlabel';
import Message from 'primevue/message';

const router = useRouter();
const form = ref({ name: '', email: '', role: null });
const loading = ref(false);
const errors = ref({});

const submit = async () => {
    loading.value = true;
    try {
        await api.post('/<resource>', form.value);
        router.push('/<resource>');
    } catch (e) {
        // Laravel returns 422 with an `errors` bag on validation failure.
        errors.value = e.response?.status === 422
            ? e.response.data.errors
            : { general: ['An error occurred'] };
    }
    loading.value = false;
};
</script>

<template>
    <div class="card">
        <h2>Create <Model></h2>
        <form @submit.prevent="submit">
            <FloatLabel>
                <InputText id="name" v-model="form.name" :class="{ 'p-invalid': errors?.name }" />
                <label for="name">Name</label>
            </FloatLabel>
            <Message v-if="errors.name" severity="error" size="small">{{ errors.name[0] }}</Message>

            <FloatLabel>
                <Select v-model="form.role" :options="roles" optionLabel="name" optionValue="id" />
                <label>Select Role</label>
            </FloatLabel>

            <Button label="Create" :disabled="loading" type="submit" />
            <Button label="Cancel" @click="$router.back()" class="p-button-outlined ml-2" />
        </form>
    </div>
</template>
```

#### Show Page (`resources/js/Pages/<Model>/Show.vue`)

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/api/client';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const route = useRoute();
const item = ref(null);

onMounted(async () => {
    const { data } = await api.get(`/<resource>/${route.params.id}`);
    item.value = data;
});
</script>

<template>
    <div>
        <Button label="Back" @click="$router.back()" class="p-button-outlined mb-4" />
        <div v-if="item" class="card">
            <h2>{{ item.name }}</h2>
            <p>Email: {{ item.email }}</p>
        </div>
    </div>
</template>
```

#### Edit Page (`resources/js/Pages/<Model>/Edit.vue`)

Same as Create but pre-populated with `item` data and using PUT/PATCH method.

### 8. Create Vue Router Entries

In `resources/js/router/index.js`:

```js
{
    path: '<resource>',
    name: '<resource>.list',
    component: () => import('@/Pages/<Model>/List.vue'),
    meta: { title: '<Resource> List', guard: true },
},
{
    path: '<resource>/create',
    name: '<resource>.create',
    component: () => import('@/Pages/<Model>/Create.vue'),
    meta: { title: 'Create <Resource>', guard: true },
},
{
    path: '<resource>/:id',
    name: '<resource>.show',
    component: () => import('@/Pages/<Model>/Show.vue'),
    meta: { title: '<Resource> Details', guard: true },
},
{
    path: '<resource>/:id/edit',
    name: '<resource>.edit',
    component: () => import('@/Pages/<Model>/Edit.vue'),
    meta: { title: 'Edit <Resource>', guard: true },
},
```

## Artisan Commands Reference

```bash
php artisan make:migration create_<table>_table --create=<table>
php artisan make:model <Model> -m
php artisan make:controller <Model>Controller --api
php artisan make:request Store<Model>Request
php artisan make:request Update<Model>Request
php artisan make:resource <Model>Resource
php artisan make:resource <Model>Collection
php artisan migrate
php artisan route:list --path=api/<resource>
php artisan test --filter=<Model>
```

## Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/*_<table>_table.php` | Schema |
| `app/Models/<Model>.php` | Eloquent model |
| `app/Http/Controllers/<Model>Controller.php` | API controller |
| `app/Http/Requests/Store<Model>Request.php` | Create validation |
| `app/Http/Requests/Update<Model>Request.php` | Update validation |
| `app/Http/Resources/<Model>Resource.php` | JSON transform |
| `app/Http/Resources/<Model>Collection.php` | Collection transform |
| `resources/js/Pages/<Model>/List.vue` | List page |
| `resources/js/Pages/<Model>/Create.vue` | Create form |
| `resources/js/Pages/<Model>/Edit.vue` | Edit form |
| `resources/js/Pages/<Model>/Show.vue` | Detail page |
| `tests/Feature/<Model>CrudTest.php` | CRUD tests |

## Testing

```bash
# Run all module tests
php artisan test tests/Feature/<Model>CrudTest.php

# Test list endpoint
php artisan test --filter=test_list_returns_json

# Test create
php artisan test --filter=test_create_valid_data

# Test update
php artisan test --filter=test_update_valid_data

# Test delete
php artisan test --filter=test_delete_item

# Test unauthorized access
php artisan test --filter=test_unauthenticated
```

## Verification Checklist

- [ ] `php artisan migrate` runs cleanly
- [ ] List page shows paginated data
- [ ] Create form submits and creates record
- [ ] Edit form updates existing record
- [ ] Show page displays details
- [ ] Delete removes record (or soft deletes)
- [ ] Search/filter works on list
- [ ] Sort works on table columns
- [ ] Pagination works correctly
- [ ] All Pest tests pass
- [ ] No server errors in browser console
- [ ] Form validation shows errors for invalid data
- [ ] 404 returned for non-existent records
- [ ] Authorization enforced (unauthorized users get 403)
