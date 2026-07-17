# Implement Soft Delete

## When to Use

When implementing soft delete behavior: migration changes, model trait, restore/force delete endpoints, and Vue trash view.

## Prerequisites

- Laravel 13 with existing model
- MySQL database with existing table
- Vue 3 + PrimeVue installed
- Soft deletes concept understood

## Step-by-Step Workflow

### 1. Add Soft Deletes to Migration

For existing tables, create a migration to add soft deletes:

```bash
php artisan make:migration add_soft_deletes_to_<table>_table --table=<table>
```

```php
Schema::table('<table>', function (Blueprint $table) {
    // softDeletes() already creates a nullable `deleted_at` timestamp column.
    // Do NOT also add a `deleted_at` column manually — that duplicates it and
    // the migration will fail.
    $table->softDeletes();
    $table->index('deleted_at');
});
```

For new tables, use `$table->softDeletes()` in the original migration.

### 2. Update Model

In `app/Models/<Model>.php`:

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class <Model> extends Model
{
    use SoftDeletes;

    protected $fillable = ['...'];

    // Include trashed records by default for admin views
    public function scopeWithTrashed(Builder $query): Builder
    {
        return $query->withTrashed();
    }

    // Only include trashed records
    public function scopeTrashed(Builder $query): Builder
    {
        return $query->onlyTrashed();
    }
}
```

### 3. Update Controller

```bash
php artisan make:controller SoftDeleteController
```

Or modify existing controller to add restore/force delete methods:

```php
use App\Models\<Model>;
use Illuminate\Http\Request;

class <Model>Controller extends Controller
{
    public function destroy(Request $request, <Model> $item)
    {
        // Soft delete (default behavior)
        $item->delete();
        return response()->json(null, 204);
    }

    public function restore(string $id)
    {
        $item = <Model>::withTrashed()->findOrFail($id);
        $item->restore();
        return response()->json($item);
    }

    public function forceDelete(string $id)
    {
        $item = <Model>::withTrashed()->findOrFail($id);
        $item->forceDelete();
        return response()->json(null, 204);
    }

    public function trashedList(Request $request)
    {
        $items = <Model>::onlyTrashed()
            ->latest('deleted_at')
            ->paginate($request->get('per_page', 15));
        return response()->json($items);
    }
}
```

### 4. Register Routes

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('<resource>', <Model>Controller::class);

    // Soft delete specific routes
    Route::post('/<resource>/{id}/restore', [
        <Model>Controller::class, 'restore'
    ])->name('<resource>.restore');

    Route::delete('/<resource>/{id}/force', [
        <Model>Controller::class, 'forceDelete'
    ])->name('<resource>.force-delete');

    Route::get('/<resource>/trashed', [
        <Model>Controller::class, 'trashedList'
    ])->name('<resource>.trashed');
});
```

### 5. Add Soft Delete Middleware (Optional)

```bash
php artisan make:middleware HandleSoftDeletes
```

```php
class HandleSoftDeletes
{
    public function handle(Request $request, Closure $next)
    {
        $request->merge([
            'include_trashed' => $request->boolean('include_trashed', false),
        ]);

        return $next($request);
    }
}
```

### 6. Create Vue Trash View

```vue
<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api/client';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import Tag from 'primevue/tag';
import ConfirmPopup from 'primevue/confirmpopup';

const trashed = ref([]);
const selected = ref(null);
const loading = ref(false);

const loadTrashed = async () => {
    loading.value = true;
    const { data } = await api.get('/<resource>/trashed');
    trashed.value = data;
    loading.value = false;
};

const restore = async (id) => {
    await api.post(`/<resource>/${id}/restore`);
    loadTrashed();
};

const forceDelete = async (id) => {
    await api.delete(`/<resource>/${id}/force`);
    loadTrashed();
};

onMounted(loadTrashed);
</script>

<template>
    <div>
        <ConfirmDialog />
        <ConfirmPopup />

        <div class="flex justify-between mb-4">
            <h2>Deleted Items</h2>
            <Button label="Restore Selected" @click="restore(selected)" :disabled="!selected" />
        </div>

        <DataTable
            :value="trashed"
            :loading="loading"
            v-model:selection="selected"
            selection-mode="single"
            paginator
            :rows="15"
        >
            <Column selection-mode="single" header-style="width: 3rem" />
            <Column field="id" header="ID" />
            <Column field="name" header="Name" />
            <Column field="deleted_at" header="Deleted At">
                <template #body="{ data }">
                    {{ formatDate(data.deleted_at) }}
                </template>
            </Column>
            <Column header="Actions">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-undo"
                        class="p-button-text p-button-success"
                        label="Restore"
                        @click="restore(data.id)"
                    />
                    <Button
                        icon="pi pi-trash"
                        class="p-button-text p-button-danger"
                        label="Delete Forever"
                        @click="forceDelete(data.id)"
                    />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
```

### 7. Update Vue List Component to Handle Soft Deletes

Modify the regular list component:

```vue
<template>
    <!-- In list view, show "Deleted" tag for soft-deleted items -->
    <Column header="Status">
        <template #body="{ data }">
            <Tag v-if="data.deleted_at" value="Deleted" severity="danger" />
            <Tag v-else value="Active" severity="success" />
        </template>
    </Column>
    <Column header="Actions">
        <template #body="{ data }">
            <Button
                v-if="!data.deleted_at"
                icon="pi pi-trash"
                class="p-button-text"
                @click="confirmDelete(data.id)"
            />
        </template>
    </Column>
</template>
```

## Artisan Commands Reference

```bash
php artisan make:migration add_soft_deletes_to_<table>_table --table=<table>
php artisan make:controller SoftDeleteController
php artisan make:middleware HandleSoftDeletes
php artisan migrate
php artisan route:list --path=api/<resource>
php artisan test --filter=SoftDelete
```

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `database/migrations/*_add_soft_deletes_to_<table>_table.php` | Soft delete column |
| `app/Models/<Model>.php` | Add SoftDeletes trait |
| `app/Http/Controllers/<Model>Controller.php` | Add restore/forceDelete methods |
| `app/Http/Middleware/HandleSoftDeletes.php` | Middleware (optional) |
| `routes/api.php` | Register new routes |
| `resources/js/Pages/<Model>/Trash.vue` | Trash view |
| `resources/js/Pages/<Model>/List.vue` | Update to show deleted status |
| `tests/Feature/SoftDeleteTest.php` | Soft delete tests |

## Testing

```bash
php artisan test tests/Feature/SoftDeleteTest.php
php artisan test --filter=test_soft_delete_does_not_remove_record
php artisan test --filter=test_restore_restores_record
php artisan test --filter=test_force_delete_permanently_removes
php artisan test --filter=test_trashed_list_shows_only_deleted
php artisan test --filter=test_normal_list_excludes_trashed
```

## Verification Checklist

- [ ] Soft deletes column added to table
- [ ] Model uses SoftDeletes trait
- [ ] Soft delete sets deleted_at timestamp
- [ ] Soft delete does not remove from database
- [ ] Normal queries exclude soft-deleted records
- [ ] Restore clears deleted_at
- [ ] Force delete permanently removes record
- [ ] Trashed list shows only deleted records
- [ ] Vue trash view displays deleted items
- [ ] Vue trash view has restore and force-delete buttons
- [ ] Vue list shows "Deleted" tag for soft-deleted items
- [ ] All tests pass
