# Blueprint: Data Listing Page

## Overview

Resource controller with `index()` supporting filter, sort, and paginate. Vue page with PrimeVue DataTable, server-side search/filter/sort, and bulk actions. Built with Laravel 13 + Vue 3.5 + PrimeVue 4 + MySQL + Pest + Sanctum.

---

## 1. Migration

```php
// database/migrations/2024_01_01_000000_create_articles_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->foreignId('author_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->boolean('featured')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('article_category', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_category');
        Schema::dropIfExists('articles');
    }
};
```

---

## 2. Model

```php
// app/Models/Article.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Article extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title', 'slug', 'excerpt', 'author_id', 'category_id',
        'status', 'published_at', 'featured',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'featured' => 'boolean',
    ];

    public function author()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'article_category');
    }
}
```

---

## 3. Resource Controller

```php
// app/Http/Controllers/Api/V1/ArticleController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Article\IndexRequest;
use App\Http\Requests\Article\StoreRequest;
use App\Http\Requests\Article\UpdateRequest;
use App\Http\Resources\ArticleResource;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

class ArticleController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['index']);
    }

    /**
     * Display a paginated listing of articles with filtering, sorting, and search.
     */
    public function index(IndexRequest $request): JsonResponse
    {
        $data = $request->validated();

        $query = Article::with(['author:id,name,email', 'category:id,name'])
            ->when($data['search'] ?? null, fn ($q, $s) => $q->where(fn ($q2) =>
                $q2->where('title', 'like', "%{$s}%")
                    ->orWhere('slug', 'like', "%{$s}%")
                    ->orWhere('excerpt', 'like', "%{$s}%")
            ))
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($data['category_id'] ?? null, fn ($q, $catId) => $q->where('category_id', $catId))
            ->when($data['author_id'] ?? null, fn ($q, $authorId) => $q->where('author_id', $authorId))
            ->when($data['featured'] ?? null, fn ($q, $featured) => $q->where('featured', $featured))
            ->when($data['published_after'] ?? null, fn ($q, $d) => $q->where('published_at', '>=', $d))
            ->when($data['published_before'] ?? null, fn ($q, $d) => $q->where('published_at', '<=', $d))
            ->when($data['sort'] ?? null, function ($q, $sort) {
                $allowed = ['title', 'status', 'published_at', 'created_at', 'updated_at', 'featured'];
                $direction = 'asc';

                if (str_contains($sort, ':')) {
                    [$field, $dir] = explode(':', $sort, 2);
                    if (in_array($field, $allowed)) {
                        $direction = in_array(strtolower($dir), ['asc', 'desc']) ? $dir : 'asc';
                        $sort = $field;
                    }
                }

                if (in_array($sort, $allowed)) {
                    $q->orderBy($sort, $direction);
                } else {
                    $q->latest();
                }
            })
            ->when(!$request->boolean('include_archived'), fn ($q) => $q->whereNull('deleted_at'));

        $perPage = min((int)($data['per_page'] ?? 15), 100);

        $articles = $query->paginate($perPage);

        return response()->json([
            'data' => ArticleResource::collection($articles),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
                'last_page' => $articles->lastPage(),
                'from' => $articles->firstItem(),
                'to' => $articles->lastItem(),
            ],
        ]);
    }

    /**
     * Store a new article.
     */
    public function store(StoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        $article = Article::create([
            ...$data,
            'author_id' => $request->user()->id,
        ]);

        if ($request->has('category_ids')) {
            $article->categories()->sync($request->input('category_ids'));
        }

        return response()->json(
            new ArticleResource($article),
            \Illuminate\Http\Response::HTTP_CREATED
        );
    }

    /**
     * Update an existing article.
     */
    public function update(UpdateRequest $request, Article $article): JsonResponse
    {
        $data = $request->validated();

        $article->update($data);

        if ($request->has('category_ids')) {
            $article->categories()->sync($request->input('category_ids'));
        }

        return response()->json(new ArticleResource($article));
    }

    /**
     * Bulk destroy multiple articles.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:articles,id',
        ]);

        $count = Article::whereIn('id', $validated['ids'])->delete();

        return response()->json([
            'message' => "{$count} article(s) deleted successfully.",
        ]);
    }

    /**
     * Bulk update status for multiple articles.
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:articles,id',
            'status' => 'required|in:draft,published,archived',
        ]);

        $count = Article::whereIn('id', $validated['ids'])
            ->update(['status' => $validated['status']]);

        return response()->json([
            'message' => "{$count} article(s) status updated successfully.",
        ]);
    }
}
```

---

## 4. Form Requests

```php
// app/Http/Requests/Article/IndexRequest.php
namespace App\Http\Requests\Article;

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
            'search' => 'sometimes|string|max:255',
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'category_id' => 'sometimes|integer|exists:categories,id',
            'author_id' => 'sometimes|integer|exists:users,id',
            'featured' => 'sometimes|boolean',
            'published_after' => 'sometimes|date',
            'published_before' => 'sometimes|date|after_or_equal:published_after',
            'sort' => 'sometimes|string|max:50',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'include_archived' => 'sometimes|boolean',
        ];
    }
}
```

```php
// app/Http/Requests/Article/StoreRequest.php
namespace App\Http\Requests\Article;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Article::class) ?? true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:articles,slug',
            'excerpt' => 'sometimes|string|max:1000',
            'category_id' => 'sometimes|integer|exists:categories,id',
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'published_at' => 'sometimes|date',
            'featured' => 'sometimes|boolean',
            'category_ids' => 'sometimes|array',
            'category_ids.*' => 'integer|exists:categories,id',
        ];
    }
}
```

```php
// app/Http/Requests/Article/UpdateRequest.php
namespace App\Http\Requests\Article;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $articleId = $this->route('article')->id;

        return [
            'title' => 'required|string|max:255',
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('articles', 'slug')->ignore($articleId)],
            'excerpt' => 'sometimes|string|max:1000',
            'category_id' => 'sometimes|integer|exists:categories,id',
            'status' => ['sometimes', Rule::in(['draft', 'published', 'archived'])],
            'published_at' => 'sometimes|date',
            'featured' => 'sometimes|boolean',
            'category_ids' => 'sometimes|array',
            'category_ids.*' => 'integer|exists:categories,id',
        ];
    }
}
```

---

## 5. Resource Collection

```php
// app/Http/Resources/ArticleResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'status' => $this->status,
            'featured' => $this->featured,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'email' => $this->author->email,
            ]),
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

---

## 6. Vue Page Component

```vue
<!-- resources/js/Pages/Articles/Index.vue -->
<template>
    <div class="article-list-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="m-0">Articles</h1>
            <Button
                label="New Article"
                icon="pi pi-plus"
                severity="primary"
                @click="router.push('/articles/create')"
            />
        </div>

        <!-- Toolbar with search, filters, and bulk actions -->
        <DataTable
            ref="dt"
            v-model:selection="selectedArticles"
            :value="articles"
            dataKey="id"
            :loading="loading"
            :paginator="true"
            :rows="meta.per_page ?? 15"
            :totalRecords="meta.total"
            :rowsPerPageOptions="[10, 25, 50]"
            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
            :sortField="queryParams.sort?.split(':')[0]"
            :sortOrder="queryParams.sort?.includes(':desc') ? -1 : 1"
            @page="onPage"
            @sort="onSort"
            @filter="onFilter"
            responsiveLayout="scroll"
            stripedRows
        >
            <template #header>
                <div class="flex flex-wrap gap-2 align-items-center">
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText
                            v-model="queryParams.search"
                            placeholder="Search articles..."
                            class="w-14rem"
                            @keyup.enter="debouncedSearch"
                            @blur="debouncedSearch"
                        />
                    </IconField>

                    <Select
                        v-model="queryParams.status"
                        :options="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="All Statuses"
                        class="w-12rem"
                        showClear
                        @change="debouncedSearch"
                    />

                    <Select
                        v-model="queryParams.category_id"
                        :options="categories"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="All Categories"
                        class="w-12rem"
                        showClear
                        @change="debouncedSearch"
                    />

                    <Button
                        v-if="selectedArticles?.length > 0"
                        label="Delete Selected"
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        @click="confirmBulkDelete"
                    />

                    <Button
                        label="Export CSV"
                        icon="pi pi-download"
                        severity="secondary"
                        outlined
                        @click="exportCSV"
                    />
                </div>
            </template>

            <Column
                selectionMode="multiple"
                headerStyle="width: 3rem"
            />

            <Column
                field="title"
                header="Title"
                sortable
                :sortField="queryParams.sort?.split(':')[0]"
                :sortOrder="queryParams.sort?.includes(':desc') ? -1 : 1"
            >
                <template #body="{ data }">
                    <router-link
                        :to="`/articles/${data.id}`"
                        class="text-decoration-none"
                    >
                        {{ data.title }}
                    </router-link>
                </template>
            </Column>

            <Column field="status" header="Status" sortable>
                <template #body="{ data }">
                    <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                </template>
            </Column>

            <Column field="category.name" header="Category" sortable>
                <template #body="{ data }">
                    <span v-if="data.category">{{ data.category.name }}</span>
                    <span v-else class="text-muted">—</span>
                </template>
            </Column>

            <Column field="featured" header="Featured" sortable>
                <template #body="{ data }">
                    <i
                        :class="['pi', data.featured ? 'pi-star-fill text-warning' : 'pi-star']"
                    />
                </template>
            </Column>

            <Column field="published_at" header="Published" sortable :sortField="'published_at'">
                <template #body="{ data }">
                    {{ formatDate(data.published_at) }}
                </template>
            </Column>

            <Column header="Actions" headerStyle="width: 8rem">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-pencil"
                        severity="secondary"
                        outlined
                        rounded
                        @click="router.push(`/articles/${data.id}/edit`)"
                        aria-label="Edit"
                    />
                    <Button
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        rounded
                        @click="confirmDelete(data)"
                        aria-label="Delete"
                    />
                </template>
            </Column>
        </DataTable>

        <!-- Confirm Delete Dialog -->
        <Dialog
            v-model:visible="confirmDialog.visible"
            modal
            header="Confirm Delete"
            :style="{ width: '25rem' }"
        >
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-red-500 text-2xl" />
                <div>
                    <p v-if="!confirmDialog.ids">
                        Are you sure you want to delete <strong>{{ confirmDialog.item?.title }}</strong>?
                    </p>
                    <p v-else>
                        Are you sure you want to delete <strong>{{ confirmDialog.ids.length }}</strong> articles?
                    </p>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" outlined @click="confirmDialog.visible = false" />
                <Button
                    label="Delete"
                    severity="danger"
                    @click="confirmDialog.ids ? bulkDelete() : singleDelete()"
                    @keydown.escape="confirmDialog.visible = false"
                />
            </template>
        </Dialog>

        <!-- Toast notifications -->
        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { useToast } from 'primevue/usetoast';

interface Article {
    id: number;
    title: string;
    slug: string;
    status: string;
    featured: boolean;
    published_at: string | null;
    author: { id: number; name: string; email: string } | null;
    category: { id: number; name: string } | null;
    created_at: string;
    updated_at: string;
}

interface Meta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
}

interface QueryParams {
    search: string;
    status: string | null;
    category_id: number | null;
    sort: string;
    include_archived: boolean;
    page: number;
    per_page: number;
}

const toast = useToast();
const router = useRouter();
const dt = ref();
const selectedArticles = ref<Article[]>([]);

const articles = ref<Article[]>([]);
const meta = ref<Meta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
});

const categories = ref<{ id: number; name: string }[]>([]);
const loading = ref(false);

const queryParams = reactive<QueryParams>({
    search: '',
    status: null,
    category_id: null,
    sort: 'created_at:desc',
    include_archived: false,
    page: 1,
    per_page: 15,
});

const confirmDialog = reactive({
    visible: false,
    item: null as Article | null,
    ids: null as number[] | null,
});

const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
];

const statusSeverity = (status: string) => {
    const map: Record<string, string> = {
        draft: 'secondary',
        published: 'success',
        archived: 'warning',
    };
    return map[status] || 'info';
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

let searchTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSearch = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        // A changed filter resets to the first page.
        queryParams.page = 1;
        fetchArticles();
    }, 300);
};

const fetchArticles = async () => {
    loading.value = true;
    try {
        const params: Record<string, any> = { ...queryParams };

        // Remove null/empty values
        Object.keys(params).forEach((key) => {
            if (params[key] === null || params[key] === '' || params[key] === false) {
                delete params[key];
            }
        });

        if (queryParams.sort) {
            params.sort = queryParams.sort;
        }

        const { data } = await axios.get('/api/articles', { params });

        articles.value = data.data;
        meta.value = data.meta;
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load articles.',
            life: 5000,
        });
    } finally {
        loading.value = false;
    }
};

const fetchCategories = async () => {
    try {
        const { data } = await axios.get('/api/categories');
        categories.value = data.data;
    } catch {
        // categories not required for listing
    }
};

const onPage = (event: any) => {
    // Preserve the active search/status/category filters across pagination —
    // only the page index and page size change here.
    queryParams.page = event.page + 1;
    queryParams.per_page = event.rows;
    fetchArticles();
};

const onSort = (event: any) => {
    queryParams.sort = `${event.sortField}:${event.sortOrder === 1 ? 'asc' : 'desc'}`;
    fetchArticles();
};

const onFilter = () => {
    // PrimeVue DataTable fires filter on column filter changes
    fetchArticles();
};

const confirmDelete = (article: Article) => {
    confirmDialog.item = article;
    confirmDialog.ids = null;
    confirmDialog.visible = true;
};

const confirmBulkDelete = () => {
    confirmDialog.ids = selectedArticles.value.map((a) => a.id);
    confirmDialog.item = null;
    confirmDialog.visible = true;
};

const singleDelete = async () => {
    try {
        await axios.delete(`/api/articles/${confirmDialog.item!.id}`);
        toast.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Article deleted successfully.',
            life: 3000,
        });
        fetchArticles();
    } catch {
        toast.add({
            severity: 'error',
            detail: 'Failed to delete article.',
            life: 5000,
        });
    }
    confirmDialog.visible = false;
    confirmDialog.item = null;
};

const bulkDelete = async () => {
    try {
        await axios.delete('/api/articles/bulk-destroy', {
            data: { ids: confirmDialog.ids },
        });
        toast.add({
            severity: 'success',
            summary: 'Deleted',
            detail: `${confirmDialog.ids!.length} article(s) deleted successfully.`,
            life: 3000,
        });
        fetchArticles();
    } catch {
        toast.add({
            severity: 'error',
            detail: 'Failed to delete articles.',
            life: 5000,
        });
    }
    confirmDialog.visible = false;
    confirmDialog.ids = null;
    selectedArticles.value = [];
};

const exportCSV = () => {
    const headers = ['Title', 'Status', 'Category', 'Published'];
    const rows = articles.value.map((a) => [
        a.title,
        a.status,
        a.category?.name ?? '—',
        a.published_at ?? '—',
    ]);

    const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'articles.csv';
    link.click();
    URL.revokeObjectURL(url);
};

onMounted(() => {
    fetchArticles();
    fetchCategories();
});

watch(() => queryParams.status, () => debouncedSearch());
watch(() => queryParams.category_id, () => debouncedSearch());
</script>

<style scoped>
.article-list-container {
    padding: 1.5rem;
}

@media (max-width: 768px) {
    .article-list-container {
        padding: 0.75rem;
    }
}
</style>
```

---

## 7. Routes

```php
// routes/web.php or routes/api.php
use App\Http\Controllers\Api\V1\ArticleController;

Route::apiResource('articles', ArticleController::class)
    ->middleware('auth:sanctum')
    ->names('articles');

Route::delete('/articles/bulk-destroy', [ArticleController::class, 'bulkDestroy'])
    ->name('articles.bulk-destroy')
    ->middleware('auth:sanctum');

Route::post('/articles/bulk-update-status', [ArticleController::class, 'bulkUpdateStatus'])
    ->name('articles.bulk-update-status')
    ->middleware('auth:sanctum');
```

---

## 8. Pest Tests

```php
// tests/Feature/Api/ArticleListingTest.php
use App\Models\Article;
use App\Models\Category;
use App\Models\User;
use App\Models\Permission;

describe('Article Listing (GET /api/articles)', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
    });

    it('returns 401 without authentication', function () {
        $this->getJson('/api/articles')
            ->assertStatus(401);
    });

    it('returns paginated articles when authenticated', function () {
        Article::factory()->count(20)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['*' => ['id', 'title', 'slug', 'status', 'created_at']],
                'meta' => ['current_page', 'per_page', 'total', 'last_page'],
            ])
            ->assertJsonCount(15, 'data'); // default per_page
    });

    it('filters articles by status', function () {
        Article::factory()->count(5)->create(['status' => 'draft']);
        Article::factory()->count(3)->create(['status' => 'published']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles?status=draft');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    });

    it('searches articles by title', function () {
        Article::factory()->create(['title' => 'Laravel Testing Guide']);
        Article::factory()->create(['title' => 'Vue.js Components']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles?search=Testing');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['title' => 'Laravel Testing Guide']);
    });

    it('sorts articles by field and direction', function () {
        Article::factory()->create(['title' => 'Alpha']);
        Article::factory()->create(['title' => 'Zebra']);
        Article::factory()->create(['title' => 'Beta']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles?sort=title:asc');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');

        $titles = collect($response->json('data'))->pluck('title')->toArray();
        expect($titles)->toBeSorted();
    });

    it('respects per_page parameter', function () {
        Article::factory()->count(5)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles?per_page=5');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    });

    it('excludes archived by default', function () {
        Article::factory()->count(3)->create(['status' => 'archived']);
        Article::factory()->count(2)->create(['status' => 'published']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    });

    it('includes archived when requested', function () {
        Article::factory()->count(3)->create(['status' => 'archived']);
        Article::factory()->count(2)->create(['status' => 'published']);

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles?include_archived=true');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data');
    });

    it('returns soft-deleted articles when include_archived=true', function () {
        $article = Article::factory()->create();
        $article->delete(); // soft delete

        $response = $this->actingAs($this->user, 'api')
            ->getJson('/api/articles?include_archived=true');

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $article->id]);
    });
});

describe('Article Bulk Actions', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
        $this->articles = Article::factory()->count(3)->create();
    });

    it('bulk deletes articles', function () {
        $ids = $this->articles->take(2)->pluck('id')->all();

        $this->actingAs($this->user, 'api')
            ->deleteJson('/api/articles/bulk-destroy', ['ids' => $ids])
            ->assertStatus(200)
            ->assertJsonPath('message', '2 article(s) deleted successfully.');

        expect(Article::whereIn('id', $ids)->count())->toBe(0);
    });

    it('validates bulk delete requires ids array', function () {
        $this->actingAs($this->user, 'api')
            ->deleteJson('/api/articles/bulk-destroy', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ids');
    });

    it('bulk updates article status', function () {
        $ids = $this->articles->pluck('id')->all();

        $this->actingAs($this->user, 'api')
            ->postJson('/api/articles/bulk-update-status', [
                'ids' => $ids,
                'status' => 'published',
            ])
            ->assertStatus(200)
            ->assertJsonPath('message', '3 article(s) status updated successfully.');

        foreach ($this->articles as $article) {
            expect($article->refresh()->status)->toBe('published');
        }
    });

    it('rejects invalid status for bulk update', function () {
        $ids = $this->articles->pluck('id')->all();

        $this->actingAs($this->user, 'api')
            ->postJson('/api/articles/bulk-update-status', [
                'ids' => $ids,
                'status' => 'invalid',
            ])
            ->assertStatus(422);
    });
});
```

---

## 9. Package.json Dependencies

```json
{
    "dependencies": {
        "primevue": "^4.2.0",
        "vue": "^3.5.0",
        "vue-router": "^5.0.0",
        "pinia": "^4.0.0",
        "axios": "^1.7.0",
        "@primevue/themes": "^4.2.0"
    },
    "devDependencies": {
        "@vitejs/plugin-vue": "^6.0.0",
        "vite": "^8.0.0",
        "laravel-vite-plugin": "^3.0.0",
        "tailwindcss": "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
        "typescript": "^5.9.0",
        "vue-tsc": "^3.0.0"
    }
}
```

---

## 10. primevue.config.ts

```ts
// resources/js/primevue.config.ts
import Aura from '@primevue/themes/aura';
import type { AppConfig } from 'primevue/config';

const config: AppConfig = {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.dark',
            cssLayer: false,
        },
    },
    ripple: true,
};

export default config;
```
