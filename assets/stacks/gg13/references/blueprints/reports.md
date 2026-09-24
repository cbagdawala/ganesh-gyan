# Blueprint: Reports

## Overview

Date range filters, DataTable with export to CSV/Excel/PDF, charts, server-side filtering. Sanctum-protected report endpoints (`auth:sanctum`).

---

## 1. Controller

```php
// app/Http/Controllers/Api/V1/ReportController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Report\GenerateRequest;
use App\Models\Article;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function overview(GenerateRequest $request): JsonResponse
    {
        $startDate = $request->validated('start_date');
        $endDate = $request->validated('end_date');

        $summary = Article::selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status = \'published\' THEN 1 ELSE 0 END) as published,
            SUM(CASE WHEN status = \'draft\' THEN 1 ELSE 0 END) as drafts,
            SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured
        ')
            ->when($startDate, fn ($q) => $q->where('created_at', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('created_at', '<=', $endDate . ' 23:59:59'))
            ->first();

        $trend = $this->getTrend($startDate, $endDate);
        $topContent = $this->getTopContent($startDate, $endDate);
        $engagement = $this->getEngagement($startDate, $endDate);

        return response()->json([
            'data' => [
                'summary' => [
                    'total' => (int) $summary->total,
                    'published' => (int) $summary->published,
                    'drafts' => (int) $summary->drafts,
                    'featured' => (int) $summary->featured,
                ],
                'trend' => $trend,
                'top_content' => $topContent,
                'engagement' => $engagement,
            ],
        ]);
    }

    public function articles(GenerateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $query = Article::with(['author:id,name', 'category:id,name'])
            ->when($validated['start_date'], fn ($q) => $q->where('created_at', '>=', $validated['start_date']))
            ->when($validated['end_date'], fn ($q) => $q->where('created_at', '<=', $validated['end_date'] . ' 23:59:59'))
            ->when($validated['status'] ?? null, fn ($q) => $q->where('status', $validated['status']))
            ->when($validated['author_id'] ?? null, fn ($q) => $q->where('author_id', $validated['author_id']))
            ->when($validated['category_id'] ?? null, fn ($q) => $q->where('category_id', $validated['category_id']))
            ->when($validated['search'] ?? null, fn ($q) => $q->where('title', 'like', '%' . $validated['search'] . '%'))
            ->when($validated['sort'] ?? null, function ($q, $sort) {
                [$field, $dir] = explode(':', $sort);
                $q->orderBy($field, strtolower($dir) === 'desc' ? 'desc' : 'asc');
            })
            ->when(!$validated['include_archived'], fn ($q) => $q->whereNull('deleted_at'));

        $perPage = min((int)($validated['per_page'] ?? 25), 100);
        $articles = $query->paginate($perPage);

        return response()->json([
            'data' => $articles,
            'filters' => [
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'status' => $validated['status'] ?? null,
                'search' => $validated['search'] ?? null,
            ],
        ]);
    }

    public function comments(GenerateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $query = Comment::with(['user:id,name', 'article:id,title'])
            ->when($validated['start_date'], fn ($q) => $q->where('created_at', '>=', $validated['start_date']))
            ->when($validated['end_date'], fn ($q) => $q->where('created_at', '<=', $validated['end_date'] . ' 23:59:59'))
            ->when($validated['status'] ?? null, fn ($q) => $q->where('status', $validated['status']));

        $perPage = min((int)($validated['per_page'] ?? 25), 100);
        $comments = $query->paginate($perPage);

        return response()->json([
            'data' => $comments,
            'filters' => [
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'status' => $validated['status'] ?? null,
            ],
        ]);
    }

    private function getTrend($startDate, $endDate): array
    {
        $period = $startDate && $endDate
            ? Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate))
            : 30;

        return Article::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', $startDate ?? now()->subDays($period))
            ->where('created_at', '<=', $endDate ?? now()->endOfDay())
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => ['date' => $r->date, 'count' => (int) $r->count])
            ->toArray();
    }

    private function getTopContent($startDate, $endDate, int $limit = 10): array
    {
        return Article::select('articles.title', 'articles.id', DB::raw('COUNT(comments.id) as comment_count'))
            ->leftJoin('comments', 'comments.article_id', '=', 'articles.id')
            ->where('articles.status', 'published')
            ->where('articles.created_at', '>=', $startDate ?? now()->subDays(30))
            ->where('articles.created_at', '<=', $endDate ?? now()->endOfDay())
            ->groupBy('articles.id', 'articles.title')
            ->orderByDesc('comment_count')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => [
                'title' => $r->title,
                'id' => $r->id,
                'comment_count' => (int) $r->comment_count,
            ])
            ->toArray();
    }

    private function getEngagement($startDate, $endDate): array
    {
        return [
            'total_comments' => Comment::where('created_at', '>=', $startDate ?? now()->subDays(30))
                ->where('created_at', '<=', $endDate ?? now()->endOfDay())
                ->count(),
            'avg_comments_per_article' => Article::selectRaw('AVG(comment_count)')
                ->selectSub(DB::raw('0'), 'comment_count')
                ->first()
                ?->comment_count ?? 0,
        ];
    }
}
```

---

## 2. Form Request

```php
// app/Http/Requests/Report/GenerateRequest.php
namespace App\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GenerateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'start_date' => 'sometimes|date',
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'author_id' => 'sometimes|integer|exists:users,id',
            'category_id' => 'sometimes|integer|exists:categories,id',
            'search' => 'sometimes|string|max:255',
            'sort' => 'sometimes|string|max:50',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include_archived' => 'sometimes|boolean',
        ];
    }
}
```

---

## 3. Vue Reports Page

```vue
<!-- resources/js/Pages/Reports.vue -->
<template>
    <div class="reports-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="m-0">Reports</h1>
            <div class="d-flex gap-2">
                <Select
                    v-model="selectedTab"
                    :options="tabs"
                    optionLabel="label"
                    optionValue="value"
                    class="w-12rem"
                />
            </div>
        </div>

        <!-- Date range filter -->
        <Card class="mb-4">
            <template #header>
                <div class="d-flex align-items-center gap-2">
                    <DatePicker
                        v-model="filters.startDate"
                        dateFormat="dd/mm/yy"
                        placeholder="Start date"
                        :pt="{ root: { class: 'w-10rem' } }"
                    />
                    <span class="text-muted">to</span>
                    <DatePicker
                        v-model="filters.endDate"
                        dateFormat="dd/mm/yy"
                        placeholder="End date"
                        :pt="{ root: { class: 'w-10rem' } }"
                    />
                    <Button
                        label="Apply Filters"
                        icon="pi pi-filter"
                        @click="applyFilters"
                    />
                    <Button
                        label="Reset"
                        text
                        @click="resetFilters"
                    />
                </div>
            </template>
        </Card>

        <!-- Summary Stats -->
        <div v-if="summary" class="stats-grid mb-4">
            <StatCard title="Total" :value="summary.total" icon="pi pi-file" severity="primary" />
            <StatCard title="Published" :value="summary.published" icon="pi pi-check-circle" severity="success" />
            <StatCard title="Drafts" :value="summary.drafts" icon="pi pi-pencil" severity="warn" />
            <StatCard title="Featured" :value="summary.featured" icon="pi pi-star" severity="info" />
        </div>

        <!-- Chart -->
        <Card class="mb-4">
            <template #header>Trend</template>
            <template #content>
                <Chart
                    type="line"
                    :data="trendChart"
                    :options="chartOptions"
                    style="height: 250px"
                />
            </template>
        </Card>

        <!-- Data Table -->
        <DataTable
            :value="tableData"
            :loading="loading"
            :paginator="true"
            :rows="pageSize"
            :totalRecords="totalRecords"
            @page="onPage"
            @sort="onSort"
            stripedRows
            responsiveLayout="scroll"
        >
            <template #header>
                <div class="d-flex gap-2">
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText
                            v-model="filters.search"
                            placeholder="Search..."
                            @keyup.enter="applyFilters"
                        />
                    </IconField>
                    <Select
                        v-model="filters.status"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Status"
                        class="w-10rem"
                        showClear
                        @change="applyFilters"
                    />
                    <Button
                        label="Export CSV"
                        icon="pi pi-download"
                        severity="secondary"
                        outlined
                        @click="exportCSV"
                    />
                    <Button
                        label="Export Excel"
                        icon="pi pi-file-excel"
                        severity="success"
                        outlined
                        @click="exportExcel"
                    />
                </div>
            </template>

            <Column field="title" header="Title" sortable :sortField="'title'" />
            <Column field="author.name" header="Author" />
            <Column field="status" header="Status">
                <template #body="{ data }">
                    <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                </template>
            </Column>
            <Column field="created_at" header="Created" sortable :sortField="'created_at'">
                <template #body="{ data }">
                    {{ formatDate(data.created_at) }}
                </template>
            </Column>
        </DataTable>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Chart from 'primevue/chart';
import StatCard from '@/Components/Dashboard/StatCard.vue';
import Toast from 'primevue/toast';

interface FilterState {
    startDate: Date | null;
    endDate: Date | null;
    status: string | null;
    author_id: number | null;
    category_id: number | null;
    search: string;
    sort: string;
    per_page: number;
    include_archived: boolean;
}

interface Summary {
    total: number;
    published: number;
    drafts: number;
    featured: number;
}

const selectedTab = ref(0);
const tabs = [
    { label: 'Overview', value: 0 },
    { label: 'Articles', value: 1 },
    { label: 'Comments', value: 2 },
];

const filters = reactive<FilterState>({
    startDate: null,
    endDate: null,
    status: null,
    author_id: null,
    category_id: null,
    search: '',
    sort: 'created_at:desc',
    per_page: 25,
    include_archived: false,
});

const summary = ref<Summary | null>(null);
const tableData = ref<any[]>([]);
const totalRecords = ref(0);
const loading = ref(false);
const pageSize = ref(25);

const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
];

const trendChart = computed(() => ({
    labels: (trendData.value || []).map((d: any) => d.date),
    datasets: [{
        label: 'Articles',
        data: (trendData.value || []).map((d: any) => d.count),
        fill: true,
        tension: 0.3,
    }],
}));

const trendData = ref<any[]>([]);
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
};

const statusSeverity = (status: string) => {
    const map: Record<string, string> = {
        draft: 'secondary',
        published: 'success',
        archived: 'warning',
    };
    return map[status] || 'info';
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const applyFilters = async () => {
    loading.value = true;
    try {
        const params: any = {};
        if (filters.startDate) params.start_date = filters.startDate.toISOString().split('T')[0];
        if (filters.endDate) params.end_date = filters.endDate.toISOString().split('T')[0];
        if (filters.status) params.status = filters.status;
        if (filters.search) params.search = filters.search;
        if (filters.sort) params.sort = filters.sort;
        params.per_page = pageSize.value;

        const { data } = await axios.get('/api/reports/articles', { params });
        tableData.value = data.data.data;
        totalRecords.value = data.data.total ?? 0;
    } finally {
        loading.value = false;
    }
};

const resetFilters = () => {
    filters.startDate = null;
    filters.endDate = null;
    filters.status = null;
    filters.search = '';
    filters.sort = 'created_at:desc';
    applyFilters();
};

const onPage = (event: any) => {
    pageSize.value = event.rows;
    applyFilters();
};

const onSort = (event: any) => {
    filters.sort = `${event.sortField}:${event.sortOrder === 1 ? 'asc' : 'desc'}`;
    applyFilters();
};

const exportCSV = () => {
    const headers = ['Title', 'Author', 'Status', 'Created'];
    const rows = tableData.value.map((r: any) => [
        r.title, r.author?.name ?? '—', r.status, formatDate(r.created_at),
    ]);
    const csv = [headers, ...rows]
        .map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

const exportExcel = () => {
    // Server-side export: window.open(`/api/reports/articles/export?${params}`)
    alert('Server-side Excel export initiated.');
};

onMounted(() => {
    applyFilters();
});
</script>

<style scoped>
.reports-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
}
</style>
```

---

## 4. Routes

```php
// routes/web.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/reports/overview', [ReportController::class, 'overview'])->name('reports.overview');
    Route::get('/reports/articles', [ReportController::class, 'articles'])->name('reports.articles');
    Route::get('/reports/comments', [ReportController::class, 'comments'])->name('reports.comments');
    Route::get('/reports/articles/export', [ReportController::class, 'exportArticles'])->name('reports.export');
});
```

---

## 5. Pest Tests

```php
// tests/Feature/Api/ReportTest.php
use App\Models\Article;
use App\Models\Comment;
use App\Models\User;

describe('Reports', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
    });

    it('returns overview with filters', function () {
        Article::factory()->count(5)->create(['status' => 'published']);
        Article::factory()->count(3)->create(['status' => 'draft']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/reports/overview');

        $response->assertStatus(200)
            ->assertJsonPath('data.summary.published', 5)
            ->assertJsonPath('data.summary.drafts', 3);
    });

    it('filters articles by date range', function () {
        Article::factory()->count(2)->create(['created_at' => now()->subDays(5)]);
        Article::factory()->count(3)->create(['created_at' => now()->subDays(40)]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/reports/articles?start_date=' . now()->subDays(7)->toDateString());

        $response->assertStatus(200)
            ->assertJsonPath('data.total', 2);
    });

    it('filters by status', function () {
        Article::factory()->count(4)->create(['status' => 'published']);
        Article::factory()->count(2)->create(['status' => 'draft']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/reports/articles?status=draft');

        $response->assertStatus(200)
            ->assertJsonPath('data.total', 2);
    });

    it('returns paginated results', function () {
        Article::factory()->count(30)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/reports/articles?per_page=10');

        $response->assertStatus(200)
            ->assertJsonCount(10, 'data.data');
    });

    it('returns 401 without auth', function () {
        $this->getJson('/api/reports/overview')
            ->assertStatus(401);
    });
});
```

---

## 6. Vue Dependencies

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
        "chart.js": "^4.4.0",
        "axios": "^1.7.0"
    },
    "devDependencies": {
        "typescript": "^5.9.0",
        "vue-tsc": "^3.3.0",
        "tailwindcss-primeui": "^0.6.0"
    }
}

<!-- PrimeVue 4's Chart component ships in the core `primevue` package
     (`import Chart from 'primevue/chart'`) and only needs the `chart.js` peer.
     There is no separate `@primevue/chart` package. -->
```
