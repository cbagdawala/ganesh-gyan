# Blueprint: Timeline

## Overview

PrimeVue Timeline component displaying events, filterable by type/date, paginated, with loading states and infinite scroll support.

---

## 1. Migration

```php
// database/migrations/2024_01_01_000000_create_events_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->string('icon')->default('pi pi-circle');
            $table->enum('severity', ['info', 'success', 'warning', 'danger', 'secondary'])->default('info');
            $table->timestamp('event_at')->nullable();
            $table->timestamps();
        });

        Schema::create('event_filters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('types')->nullable();
            $table->string('date_from')->nullable();
            $table->string('date_to')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_filters');
        Schema::dropIfExists('events');
    }
};
```

---

## 2. Model

```php
// app/Models/Event.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'type', 'title', 'description', 'metadata',
        'icon', 'severity', 'event_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'event_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeDateRange($query, ?string $from, ?string $to)
    {
        if ($from) {
            $query->where('event_at', '>=', $from);
        }
        if ($to) {
            $query->where('event_at', '<=', $to . ' 23:59:59');
        }
        return $query;
    }
}
```

---

## 3. Controller

```php
// app/Http/Controllers/Api/V1/EventController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Event\IndexRequest;
use App\Http\Requests\Event\StoreRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventFilter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class EventController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(IndexRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $filter = EventFilter::firstOrCreate(
            ['user_id' => $user->id],
            ['types' => null, 'date_from' => null, 'date_to' => null]
        );

        $query = Event::with('user:id,name,avatar')
            ->when($validated['type'] ?? null, fn ($q, $t) => $q->where('type', $t))
            ->when($validated['severity'] ?? null, fn ($q, $s) => $q->where('severity', $s))
            ->when($validated['date_from'] ?? null, fn ($q, $d) => $q->where('event_at', '>=', $d))
            ->when($validated['date_to'] ?? null, fn ($q, $d) => $q->where('event_at', '<=', $d . ' 23:59:59'))
            ->when(!$validated['include_user_events'], fn ($q) => $q->whereNull('user_id'))
            ->when($validated['sort'] ?? null, function ($q, $sort) {
                $q->orderBy($sort === 'recent' ? 'event_at' : 'created_at', 'desc');
            });

        $perPage = min((int)($validated['per_page'] ?? 15), 50);
        $events = $query->paginate($perPage);

        return response()->json([
            'data' => EventResource::collection($events),
            'meta' => [
                'current_page' => $events->currentPage(),
                'per_page' => $events->perPage(),
                'total' => $events->total(),
                'last_page' => $events->lastPage(),
            ],
            'filter' => [
                'types' => $filter->types,
                'date_from' => $filter->date_from,
                'date_to' => $filter->date_to,
            ],
        ]);
    }

    public function store(StoreRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;

        $event = Event::create($data);

        return response()->json(
            new EventResource($event),
            201
        );
    }

    public function updateFilter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'types' => 'sometimes|array',
            'types.*' => 'string',
            'date_from' => 'sometimes|nullable|date',
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $request->user()->eventFilter()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated
        );

        return response()->json(['message' => 'Filter saved.']);
    }
}
```

---

## 4. Form Requests

```php
// app/Http/Requests/Event/IndexRequest.php
namespace App\Http\Requests\Event;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', Rule::in(['article_published', 'comment_added', 'user_registered', 'offer_created', 'system', 'general'])],
            'severity' => ['sometimes', Rule::in(['info', 'success', 'warning', 'danger', 'secondary'])],
            'date_from' => 'sometimes|date',
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
            'sort' => 'sometimes|string|in:recent,created',
            'per_page' => 'sometimes|integer|min:1|max:50',
            'include_user_events' => 'sometimes|boolean',
        ];
    }
}
```

```php
// app/Http/Requests/Event/StoreRequest.php
namespace App\Http\Requests\Event;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'description' => 'sometimes|nullable|string|max:2000',
            'metadata' => 'sometimes|nullable|array',
            'icon' => 'sometimes|string|max:50',
            'severity' => ['sometimes', Rule::in(['info', 'success', 'warning', 'danger', 'secondary'])],
            'event_at' => 'sometimes|nullable|date',
        ];
    }
}
```

---

## 5. Resource

```php
// app/Http/Resources/EventResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'metadata' => $this->metadata,
            'icon' => $this->icon,
            'severity' => $this->severity,
            'event_at' => $this->event_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'avatar' => $this->user->avatar ? Storage::url($this->user->avatar) : null,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

---

## 6. Vue Timeline Page

```vue
<!-- resources/js/Pages/Timeline.vue -->
<template>
    <div class="timeline-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="m-0">Timeline</h1>
            <Select
                v-model="filter.type"
                :options="typeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="All Types"
                class="w-14rem"
                showClear
                @change="fetchEvents"
            />
        </div>

        <!-- Filters -->
        <Card class="mb-4">
            <template #header>
                <div class="d-flex align-items-center gap-2">
                    <DatePicker
                        v-model="filter.dateFrom"
                        dateFormat="dd/mm/yy"
                        placeholder="From date"
                        :pt="{ root: { class: 'w-12rem' } }"
                    />
                    <span class="text-muted">to</span>
                    <DatePicker
                        v-model="filter.dateTo"
                        dateFormat="dd/mm/yy"
                        placeholder="To date"
                        :pt="{ root: { class: 'w-12rem' } }"
                    />
                    <Button label="Apply" icon="pi pi-filter" @click="fetchEvents" />
                    <Button label="Reset" text @click="resetFilters" />
                </div>
            </template>
        </Card>

        <!-- Loading -->
        <div v-if="loading" class="d-flex justify-content-center py-5">
            <ProgressSpinner />
        </div>

        <!-- Empty state -->
        <div v-else-if="events.length === 0" class="empty-state py-5 text-center">
            <i class="pi pi-clock text-4xl text-muted mb-3" />
            <p class="text-muted">No events found.</p>
        </div>

        <!-- Timeline -->
        <div v-else>
            <Timeline
                :value="events"
                :layout="'alternate'"
                class="customized-content"
            >
                <template #marker="slotProps">
                    <span
                        class="flex w-2.5rem h-2.5rem align-items-center justify-content-center text-white border-circle z-1 shadow-2"
                        :class="severityColor(slotProps.item.severity)"
                    >
                        <i :class="slotProps.item.icon" />
                    </span>
                </template>
                <template #content="slotProps">
                    <div>
                        <div class="font-bold text-lg">{{ slotProps.item.title }}</div>
                        <small v-if="slotProps.item.description" class="text-muted">
                            {{ slotProps.item.description }}
                        </small>
                        <div v-if="slotProps.item.user" class="d-flex align-items-center gap-2 mt-1">
                            <Avatar
                                v-if="slotProps.item.user.avatar"
                                :image="slotProps.item.user.avatar"
                                size="small"
                            />
                            <span v-else class="text-muted">System</span>
                            <span v-if="slotProps.item.user.name" class="text-sm">
                                by {{ slotProps.item.user.name }}
                            </span>
                        </div>
                    </div>
                    <div class="text-right">
                        <small class="text-muted">{{ formatEventDate(slotProps.item.event_at) }}</small>
                        <Tag
                            v-if="slotProps.item.type"
                            :value="slotProps.item.type"
                            severity="info"
                            size="small"
                            class="ml-1"
                        />
                    </div>
                </template>
            </Timeline>

            <!-- Pagination -->
            <div class="d-flex justify-content-center mt-4" v-if="totalPages > 1">
                <Paginator
                    :rows="pageSize"
                    :totalRecords="total"
                    v-model:rows="pageSize"
                    @page="onPage"
                />
            </div>
        </div>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';
import Select from 'primevue/select';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Timeline from 'primevue/timeline';
import Avatar from 'primevue/avatar';
import Tag from 'primevue/tag';
import Paginator from 'primevue/paginator';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';

interface TimelineEvent {
    id: number;
    type: string;
    title: string;
    description: string | null;
    icon: string;
    severity: string;
    event_at: string | null;
    user: {
        id: number;
        name: string;
        avatar: string | null;
    } | null;
}

const filter = ref({
    type: null as string | null,
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    severity: null as string | null,
});

const events = ref<TimelineEvent[]>([]);
const loading = ref(false);
const pageSize = ref(15);
const currentPage = ref(1);
const total = ref(0);

const typeOptions = [
    { label: 'Article Published', value: 'article_published' },
    { label: 'Comment Added', value: 'comment_added' },
    { label: 'User Registered', value: 'user_registered' },
    { label: 'Offer Created', value: 'offer_created' },
    { label: 'System', value: 'system' },
    { label: 'General', value: 'general' },
];

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

const severityColor = (severity: string) => {
    const map: Record<string, string> = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        danger: 'bg-red-500',
        secondary: 'bg-gray-500',
    };
    return map[severity] || 'bg-blue-500';
};

const formatEventDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

const fetchEvents = async () => {
    loading.value = true;
    try {
        const params: Record<string, any> = {
            per_page: pageSize.value,
            page: currentPage.value,
        };

        if (filter.value.type) params.type = filter.value.type;
        if (filter.value.dateFrom) params.date_from = filter.value.dateFrom.toISOString().split('T')[0];
        if (filter.value.dateTo) params.date_to = filter.value.dateTo.toISOString().split('T')[0];

        const { data } = await axios.get('/api/events', { params });
        events.value = data.data.data;
        total.value = data.meta.total;
    } finally {
        loading.value = false;
    }
};

const resetFilters = () => {
    filter.value.type = null;
    filter.value.dateFrom = null;
    filter.value.dateTo = null;
    currentPage.value = 1;
    fetchEvents();
};

const onPage = (event: any) => {
    currentPage.value = event.page + 1;
    pageSize.value = event.rows;
    fetchEvents();
};

const loadFilter = async () => {
    try {
        const { data } = await axios.get('/api/events');
        if (data.filter) {
            filter.value.type = data.filter.types?.[0] || null;
            if (data.filter.date_from) {
                filter.value.dateFrom = new Date(data.filter.date_from);
            }
            if (data.filter.date_to) {
                filter.value.dateTo = new Date(data.filter.date_to);
            }
        }
    } catch {
        // filter loading is optional
    }
};

fetchEvents();
</script>

<style scoped>
.timeline-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 1.5rem;
}

.empty-state {
    text-align: center;
}

.customized-content {
    padding: 1rem 0;
}
</style>
```

---

## 7. Routes

```php
// routes/web.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/events', [EventController::class, 'index'])->name('events.index');
    Route::post('/events', [EventController::class, 'store'])->name('events.store');
    Route::put('/events/filter', [EventController::class, 'updateFilter'])->name('events.filter');
});
```

---

## 8. Pest Tests

```php
// tests/Feature/Api/EventTimelineTest.php
use App\Models\Event;
use App\Models\User;

describe('Timeline (GET /api/events)', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
    });

    it('returns events with pagination', function () {
        Event::factory()->count(10)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/events');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['*' => ['id', 'type', 'title', 'severity']],
                'meta' => ['current_page', 'per_page', 'total', 'last_page'],
            ]);
    });

    it('filters events by type', function () {
        Event::factory()->count(5)->create(['type' => 'article_published']);
        Event::factory()->count(3)->create(['type' => 'comment_added']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/events?type=article_published');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data.data');
    });

    it('filters by date range', function () {
        Event::factory()->count(2)->create(['event_at' => now()->subDays(5)]);
        Event::factory()->count(4)->create(['event_at' => now()->subDays(60)]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/events?date_from=' . now()->subDays(7)->toDateString());

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 2);
    });

    it('respects severity filter', function () {
        Event::factory()->count(3)->create(['severity' => 'danger']);
        Event::factory()->count(5)->create(['severity' => 'info']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/events?severity=danger');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data.data');
    });

    it('returns 401 without auth', function () {
        $this->getJson('/api/events')->assertStatus(401);
    });

    it('creates an event', function () {
        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/events', [
                'type' => 'general',
                'title' => 'Test Event',
                'description' => 'A test event',
                'severity' => 'info',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Test Event');
    });
});
```

---

## 9. Factory

```php
// tests/Factories/EventFactory.php
namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EventFactory extends Factory
{
    protected $model = Event::class;

    public function definition(): array
    {
        $types = ['article_published', 'comment_added', 'user_registered', 'offer_created', 'system', 'general'];
        $severities = ['info', 'success', 'warning', 'danger', 'secondary'];

        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement($types),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'metadata' => null,
            'icon' => fake()->randomElement([
                'pi pi-file', 'pi pi-comment', 'pi pi-user-plus',
                'pi pi-dollar', 'pi pi-cog', 'pi pi-info-circle',
            ]),
            'severity' => fake()->randomElement($severities),
            'event_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ];
    }
}
```

---

## 10. Vue Dependencies

```json
{
    "scripts": {
        "typecheck": "vue-tsc --noEmit"
    },
    "dependencies": {
        "primevue": "^4.2.0",
        "@primeuix/themes": "^2.0.3",
        "primeicons": "^8.0.0",
        "vue": "^3.5.0",
        "axios": "^1.7.0"
    },
    "devDependencies": {
        "typescript": "^5.9.0",
        "vue-tsc": "^3.3.0",
        "tailwindcss-primeui": "^0.6.0"
    }
}
```
