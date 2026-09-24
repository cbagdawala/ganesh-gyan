# Blueprint: Dashboard

## Overview

Aggregated queries returning stats cards, charts, and recent activity. Widget layout with responsive grid. Sanctum-protected dashboard route (`auth:sanctum`).

---

## 1. Dashboard Controller

```php
// app/Http/Controllers/Api/V1/DashboardController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\DashboardResource;
use App\Models\Article;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $period = $request->input('period', '30d');

        $resource = new DashboardResource([
            'stats' => $this->getStats($user),
            'activity' => $this->getRecentActivity($user),
            'articles_over_time' => $this->getArticlesOverTime($period),
            'comments_over_time' => $this->getCommentsOverTime($period),
            'category_distribution' => $this->getCategoryDistribution(),
            'top_authors' => $this->getTopAuthors(),
            'user_stats' => $this->getUserStats($user),
            'system_stats' => $this->getSystemStats(),
        ]);

        return response()->json($resource);
    }

    private function getStats($user): array
    {
        $since = now()->subDays($this->periodDays());

        return [
            'total_articles' => Article::count(),
            'published_articles' => Article::where('status', 'published')->count(),
            'draft_articles' => Article::where('status', 'draft')->count(),
            'total_comments' => Comment::where('status', 'approved')->count(),
            'recent_articles' => Article::where('created_at', '>=', $since)->count(),
            'recent_comments' => Comment::where('created_at', '>=', $since)->count(),
        ];
    }

    private function getRecentActivity($user): array
    {
        return Article::with('author:id,name')
            ->where('status', '!=', 'draft')
            ->orderByDesc('updated_at')
            ->take(10)
            ->get()
            ->map(fn ($article) => [
                'id' => $article->id,
                'type' => 'article',
                'title' => $article->title,
                'action' => $article->status === 'published' ? 'published' : 'updated',
                'author' => $article->author?->name,
                'published_at' => $article->updated_at?->toIso8601String(),
            ]);
    }

    private function getArticlesOverTime(string $period): array
    {
        $startDate = now()->subDays($this->periodDays($period))->startOfDay();

        return Article::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', $startDate)
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'count' => (int) $row->count,
            ])
            ->toArray();
    }

    private function getCommentsOverTime(string $period): array
    {
        $startDate = now()->subDays($this->periodDays($period))->startOfDay();

        return Comment::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', $startDate)
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'count' => (int) $row->count,
            ])
            ->toArray();
    }

    private function getCategoryDistribution(): array
    {
        return DB::table('articles')
            ->join('categories', 'articles.category_id', '=', 'categories.id')
            ->select('categories.name', DB::raw('COUNT(articles.id) as count'))
            ->whereNull('articles.deleted_at')
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'count' => (int) $row->count,
            ])
            ->toArray();
    }

    private function getTopAuthors(int $limit = 5): array
    {
        return User::select('users.name', DB::raw('COUNT(articles.id) as article_count'))
            ->join('articles', 'users.id', '=', 'articles.author_id')
            ->where('articles.status', 'published')
            ->whereNull('articles.deleted_at')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('article_count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'article_count' => (int) $row->article_count,
            ])
            ->toArray();
    }

    private function getUserStats($user): array
    {
        return [
            'total_articles_by_user' => Article::where('author_id', $user->id)->count(),
            'published_by_user' => Article::where('author_id', $user->id)
                ->where('status', 'published')->count(),
            'comments_by_user' => Comment::where('user_id', $user->id)->count(),
        ];
    }

    private function getSystemStats(): array
    {
        return [
            'total_users' => User::count(),
            'active_users_last_30_days' => User::where('last_login_at', '>=', now()->subDays(30))->count(),
        ];
    }

    private function periodDays(?string $period = null): int
    {
        // Map the request's period string ('7d', '30d', '90d', or a bare
        // number) to a day count. No self-reference — falls back to the
        // current request's `period` input when not passed explicitly.
        $period ??= request()->input('period', '30d');

        return match ((string) $period) {
            '7d', '7' => 7,
            '14d', '14' => 14,
            '30d', '30' => 30,
            '90d', '90' => 90,
            default => 30,
        };
    }
}
```

---

## 2. Resource

```php
// app/Http/Resources/DashboardResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'data' => [
                'stats' => $this['stats'],
                'activity' => $this['activity'],
                'articles_over_time' => $this['articles_over_time'],
                'comments_over_time' => $this['comments_over_time'],
                'category_distribution' => $this['category_distribution'],
                'top_authors' => $this['top_authors'],
                'user_stats' => $this['user_stats'],
                'system_stats' => $this['system_stats'],
            ],
        ];
    }
}
```

---

## 3. Vue Dashboard Page

```vue
<!-- resources/js/Pages/Dashboard.vue -->
<template>
    <div class="dashboard-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1>Dashboard</h1>
            <Select
                v-model="selectedPeriod"
                :options="periodOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select Period"
                class="w-12rem"
                @change="fetchDashboard"
            ></Select>
        </div>

        <!-- Stats cards -->
        <div class="stats-grid mb-4">
            <StatCard
                title="Total Articles"
                :value="stats.total_articles"
                icon="pi pi-file"
                severity="primary"
                trend="articles"
            />
            <StatCard
                title="Published"
                :value="stats.published_articles"
                icon="pi pi-check-circle"
                severity="success"
            />
            <div class="col-12 md:col-6 lg:col-3">
                <StatCard
                    title="Drafts"
                    :value="stats.draft_articles"
                    icon="pi pi-pencil"
                    severity="warn"
                />
            </div>
            <div class="col-12 md:col-6 lg:col-3">
                <StatCard
                    title="Comments"
                    :value="stats.total_comments"
                    icon="pi pi-comments"
                    severity="info"
                />
            </div>
            <div class="col-12 md:col-6 lg:col-3">
                <StatCard
                    title="Recent Articles"
                    :value="stats.recent_articles"
                    icon="pi pi-star"
                    severity="secondary"
                />
            </div>
        </div>

        <!-- Charts row -->
        <div class="charts-grid mb-4">
            <Card>
                <template #header>Articles Over Time</template>
                <template #content>
                    <Chart
                        type="line"
                        :data="articlesChart"
                        :options="lineChartOptions"
                        style="height: 300px"
                    />
                </template>
            </Card>

            <Card>
                <template #header>Comments Over Time</template>
                <template #content>
                    <Chart
                        type="bar"
                        :data="commentsChart"
                        :options="barChartOptions"
                        style="height: 300px"
                    />
                </template>
            </Card>
        </div>

        <!-- Secondary row -->
        <div class="secondary-grid">
            <Card>
                <template #header>Category Distribution</template>
                <template #content>
                    <Chart
                        type="doughnut"
                        :data="categoryChart"
                        :options="doughnutOptions"
                        style="height: 250px"
                    />
                </template>
            </Card>

            <Card>
                <template #header>Top Authors</template>
                <template #content>
                    <DataTable :value="topAuthors" stripedRows>
                        <Column field="name" header="Author" />
                        <Column field="article_count" header="Articles" sortable>
                            <template #body="{ data }">
                                <Tag :value="data.article_count" severity="info" />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </div>

        <!-- Recent Activity -->
        <Card class="mt-4">
            <template #header>Recent Activity</template>
            <template #content>
                <Timeline
                    :value="activity"
                    class="customized-content"
                >
                    <template #marker="slotProps">
                        <span
                            class="flex w-2rem h-2rem align-items-center justify-content-center text-white border-circle z-1 shadow-1"
                            :class="slotProps.item.type === 'article' ? 'bg-blue-500' : 'bg-orange-500'"
                        >
                            <i :class="slotProps.item.type === 'article' ? 'pi pi-file' : 'pi pi-ellipsis-h'" />
                        </span>
                    </template>
                    <template #content="slotProps">
                        <div>
                            <div class="font-bold">{{ slotProps.item.title }}</div>
                            <small class="text-muted">
                                {{ slotProps.item.action }} by {{ slotProps.item.author }}
                            </small>
                        </div>
                        <div class="text-right">
                            <small class="text-muted">
                                {{ formatDate(slotProps.item.published_at) }}
                            </small>
                        </div>
                    </template>
                </Timeline>
            </template>
        </Card>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import Select from 'primevue/select';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Timeline from 'primevue/timeline';
import Chart from 'primevue/chart';
import StatCard from '@/Components/Dashboard/StatCard.vue';
import Toast from 'primevue/toast';

interface DashboardData {
    stats: {
        total_articles: number;
        published_articles: number;
        draft_articles: number;
        total_comments: number;
        recent_articles: number;
        recent_comments: number;
    };
    activity: { id: number; title: string; action: string; author: string; published_at: string }[];
    articles_over_time: { date: string; count: number }[];
    comments_over_time: { date: string; count: number }[];
    category_distribution: { name: string; count: number }[];
    top_authors: { name: string; article_count: number }[];
    user_stats: Record<string, number>;
    system_stats: Record<string, number>;
}

const selectedPeriod = ref(30);
const periodOptions = [
    { label: '7 Days', value: 7 },
    { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
];

const stats = ref<DashboardData['stats']>({
    total_articles: 0, published_articles: 0, draft_articles: 0,
    total_comments: 0, recent_articles: 0, recent_comments: 0,
});

const activity = ref<DashboardData['activity']>([]);
const topAuthors = ref<DashboardData['top_authors']>([]);

const articlesChart = computed(() => ({
    labels: dashboardData.value?.articles_over_time.map((d) => d.date) || [],
    datasets: [{
        label: 'Articles',
        data: dashboardData.value?.articles_over_time.map((d) => d.count) || [],
        fill: true,
        tension: 0.3,
    }],
}));

const commentsChart = computed(() => ({
    labels: dashboardData.value?.comments_over_time.map((d) => d.date) || [],
    datasets: [{
        label: 'Comments',
        data: dashboardData.value?.comments_over_time.map((d) => d.count) || [],
    }],
}));

const categoryChart = computed(() => {
    const data = dashboardData.value?.category_distribution || [];
    return {
        labels: data.map((d) => d.name),
        datasets: [{
            data: data.map((d) => d.count),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
        }],
    };
});

const dashboardData = ref<DashboardData | null>(null);

const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
};

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
};

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } },
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
};

const fetchDashboard = async () => {
    try {
        const { data } = await axios.get('/api/dashboard', {
            params: { period: selectedPeriod.value },
        });
        dashboardData.value = data.data;
        stats.value = data.data.stats;
        activity.value = data.data.activity;
        topAuthors.value = data.data.top_authors;
    } catch {
        // toast error
    }
};

const refreshDashboard = () => {
    fetchDashboard();
};

onMounted(() => {
    fetchDashboard();
});
</script>

<style scoped>
.dashboard-container {
    padding: 1.5rem;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1rem;
}

.secondary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1rem;
}
</style>
```

---

## 4. StatCard Component

```vue
<!-- resources/js/Components/Dashboard/StatCard.vue -->
<template>
    <Card>
        <template #content>
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted mb-1">{{ title }}</div>
                    <div class="text-3xl font-bold">{{ value }}</div>
                </div>
                <i :class="['pi text-3xl', icon, colorClass]" />
            </div>
        </template>
    </Card>
</template>

<script setup lang="ts">
const props = defineProps<{
    title: string;
    value: number;
    icon: string;
    severity: 'primary' | 'success' | 'warning' | 'info' | 'secondary';
}>();

const colorClass = computed(() => {
    const map: Record<string, string> = {
        primary: 'text-blue-500',
        success: 'text-green-500',
        warning: 'text-yellow-500',
        info: 'text-cyan-500',
        secondary: 'text-gray-500',
    };
    return map[props.severity] || 'text-blue-500';
});
</script>
```

---

## 5. Routes

```php
// routes/web.php
use App\Http\Controllers\Api\V1\DashboardController;

Route::middleware('auth:sanctum')->get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
```

---

## 6. Pest Tests

```php
// tests/Feature/Api/DashboardTest.php
use App\Models\Article;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Support\Carbon;

describe('Dashboard (GET /api/dashboard)', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
    });

    it('returns 401 without authentication', function () {
        $this->getJson('/api/dashboard')
            ->assertStatus(401);
    });

    it('returns dashboard data', function () {
        Article::factory()->count(10)->create();
        Comment::factory()->count(5)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/dashboard');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'stats' => ['total_articles', 'published_articles', 'draft_articles', 'total_comments'],
                    'activity' => ['*' => ['id', 'title', 'action', 'published_at']],
                    'articles_over_time' => ['*' => ['date', 'count']],
                    'comments_over_time' => ['*' => ['date', 'count']],
                    'category_distribution' => ['*' => ['name', 'count']],
                    'top_authors' => ['*' => ['name', 'article_count']],
                ],
            ]);
    });

    it('respects period parameter', function () {
        Article::factory()->count(3)->create([
            'created_at' => now()->subDays(5),
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/dashboard?period=7');

        $response->assertStatus(200)
            ->assertJsonPath('data.stats.recent_articles', 3);
    });

    it('returns 7 days of articles_over_time', function () {
        $this->actingAs($this->user, 'api')
            ->getJson('/api/dashboard?period=7')
            ->assertStatus(200);

        $dates = $this->json('GET', '/api/dashboard?period=7')
            ->json('data.articles_over_time');

        // All dates should be within the last 7 days
        foreach ($dates as $entry) {
            $date = Carbon::parse($entry['date']);
            expect($date)->greaterThanOrEqualTo(now()->subDays(7));
        }
    });
});
```

---

## 7. Vue Dependencies

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

<!-- PrimeVue 4 ships the Chart component in the core `primevue` package
     (`import Chart from 'primevue/chart'`); it only needs the `chart.js`
     peer dependency. There is no separate `@primevue/chart` package. -->
```
