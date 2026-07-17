# Implement Audit Log

## When to Use

When implementing an audit trail: model event listeners, audit table, log endpoint, and timeline view. Tracks all changes made to records.

## Prerequisites

- Laravel 13 with model already in place
- MySQL database
- Vue 3 + PrimeVue installed
- Existing model with SoftDeletes (optional)

## Step-by-Step Workflow

### 1. Create Audit Table Migration

```bash
php artisan make:migration create_audits_table
```

```php
Schema::create('audits', function (Blueprint $table) {
    $table->id();
    $table->string('auditable_type');
    $table->unsignedBigInteger('auditable_id');
    $table->string('event'); // created, updated, deleted, restored
    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->unsignedBigInteger('user_id')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->string('user_agent')->nullable();
    $table->timestamp('created_at')->useCurrent();
    $table->index(['auditable_type', 'auditable_id']);
});
```

### 2. Create Audit Model

```bash
php artisan make:model Audit -m
```

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Audit extends Model
{
    protected $table = 'audits';

    protected $fillable = [
        'auditable_type',
        'auditable_id',
        'event',
        'old_values',
        'new_values',
        'user_id',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

### 3. Create Auditable Trait

`make:trait` is not a stock Artisan command. Create the file manually at
`app/Traits/Auditable.php` (or add a custom stub / package that registers a
`make:trait` generator):

```php
namespace App\Traits;

use App\Models\Audit;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            $model->recordAudit('created');
        });

        static::updated(function ($model) {
            if ($model->isDirty()) {
                $model->recordAudit('updated');
            }
        });

        static::deleted(function ($model) {
            if (method_exists($model, 'trashed') && $model->trashed()) {
                $model->recordAudit('deleted');
            } else {
                $model->recordAudit('deleted');
            }
        });

        if (method_exists(static::class, 'restored')) {
            static::restored(function ($model) {
                $model->recordAudit('restored');
            });
        }
    }

    protected function recordAudit(string $event): void
    {
        Audit::create([
            'auditable_type' => get_class($this),
            'auditable_id' => $this->getKey(),
            'event' => $event,
            'old_values' => $this->getOriginal(),
            'new_values' => $this->getChanges(),
            'user_id' => Auth::id(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    public function audits(): MorphMany
    {
        return $this->morphMany(Audit::class, 'auditable');
    }
}
```

### 4. Apply Trait to Models

In `app/Models/<Model>.php`:

```php
use App\Traits\Auditable;

class <Model> extends Model
{
    use Auditable;
    // ...
}
```

### 5. Create Audit Controller

```bash
php artisan make:controller AuditController
```

```php
namespace App\Http\Controllers;

use App\Models\Audit;
use App\Models\<Model>;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $query = Audit::with('user')
            ->where('auditable_type', get_class(<Model>::class));

        if ($request->filled('auditable_id')) {
            $query->where('auditable_id', $request->auditable_id);
        }

        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        $audits = $query->latest()->paginate($request->get('per_page', 25));

        return response()->json($audits);
    }

    public function show(string $id)
    {
        $audit = Audit::with('user', 'auditable')->findOrFail($id);
        return response()->json($audit);
    }

    public function timeline(string $modelType, string $id)
    {
        $audits = Audit::where('auditable_type', $modelType)
            ->where('auditable_id', $id)
            ->with('user')
            ->latest()
            ->get();

        return response()->json($audits);
    }
}
```

### 6. Register Routes

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/audits', [AuditController::class, 'index']);
    Route::get('/audits/{audit}', [AuditController::class, 'show']);
    Route::get('/{model}/{id}/audit-timeline', [AuditController::class, 'timeline']);
});
```

### 7. Create Vue Audit Timeline Component

```vue
<script setup>
import { ref, onMounted } from 'vue';
import api from '@/api/client';
import Timeline from 'primevue/timeline';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';

const audits = ref([]);
const loading = ref(false);

const eventSeverity = {
    created: 'success',
    updated: 'info',
    deleted: 'danger',
    restored: 'warn',
};

const loadTimeline = async () => {
    loading.value = true;
    const { data } = await api.get(`/${props.model}/${props.id}/audit-timeline`);
    audits.value = data;
    loading.value = false;
};

onMounted(loadTimeline);
</script>

<template>
    <Card>
        <template #title>Audit Timeline</template>
        <template #content>
            <Timeline
                :value="audits"
                :align="align"
                :reverse-items="reverseItems"
            >
                <template #opposite="{ item }">
                    <span class="text-sm text-secondary">
                        {{ item.created_at }}
                    </span>
                </template>
                <template #marker="{ item }">
                    <Tag :value="item.event" :severity="eventSeverity[item.event]" />
                </template>
                <template #content="{ item }">
                    <div class="flex flex-column gap-2">
                        <div>
                            <strong>{{ item.user?.name || 'System' }}</strong>
                            <span class="ml-2 text-sm">{{ item.event }} record #{{ item.auditable_id }}</span>
                        </div>
                        <div v-if="item.old_values && item.new_values" class="changes">
                            <table class="p-datatable p-component">
                                <thead>
                                    <tr>
                                        <th>Field</th>
                                        <th>Old Value</th>
                                        <th>New Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(newValue, field) in item.new_values" :key="field">
                                        <td>{{ field }}</td>
                                        <td>{{ item.old_values[field] ?? 'NULL' }}</td>
                                        <td>{{ newValue }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>
            </Timeline>
        </template>
    </Card>
</template>
```

## Artisan Commands Reference

```bash
php artisan make:migration create_audits_table
php artisan make:model Audit -m
# app/Traits/Auditable.php — create manually (no stock make:trait command)
php artisan make:controller AuditController
php artisan migrate
php artisan route:list --path=api/audits
php artisan test --filter=Audit
```

## Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/*_create_audits_table.php` | Audit schema |
| `app/Models/Audit.php` | Audit model |
| `app/Traits/Auditable.php` | Audit trait |
| `app/Http/Controllers/AuditController.php` | Audit API |
| `resources/js/Components/AuditTimeline.vue` | Timeline UI |
| `resources/js/Pages/<Model>/Audit.vue` | Audit page |
| `routes/api.php` | Audit routes |
| `tests/Feature/AuditTest.php` | Audit tests |

## Testing

```bash
php artisan test tests/Feature/AuditTest.php
php artisan test --filter=test_audit_created_event
php artisan test --filter=test_audit_updated_event
php artisan test --filter=test_audit_stores_old_and_new_values
php artisan test --filter=test_audit_timeline_endpoint
php artisan test --filter=test_audit_filters_by_event
```

## Verification Checklist

- [ ] Audit migration runs without errors
- [ ] Audit table has all required columns
- [ ] Auditable trait records events on model changes
- [ ] Audit entries created on create/update/delete
- [ ] Old and new values captured correctly
- [ ] User ID, IP, and user agent recorded
- [ ] Audit timeline endpoint returns correct data
- [ ] Timeline filters by auditable_id
- [ ] Timeline filters by event type
- [ ] Vue timeline displays changes with old/new values
- [ ] Event tags use correct severity colors
- [ ] All tests pass
