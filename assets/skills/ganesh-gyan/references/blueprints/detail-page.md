# Blueprint: Detail Page

## Overview

Controller `show()` with loaded relationships. Vue page with PrimeVue tabs, related data sub-lists, breadcrumb navigation, and action buttons.

---

## 1. Controller

```php
// app/Http/Controllers/Api/V1/ArticleController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ArticleResource;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

class ArticleController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Show article with all relationships loaded.
     */
    public function show(Article $article): JsonResponse
    {
        $article->load([
            'author:id,name,email,avatar',
            'category:id,name,slug',
            'categories:id,name,slug',
            'comments' => fn ($q) => $q->withCount('replies')->latest()->take(5),
            'comments.replies',
            'media',
        ]);

        return response()->json(new ArticleResource($article));
    }
}
```

---

## 2. Resource (with relationships)

```php
// app/Http/Resources/ArticleResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'content' => $this->content,
            'status' => $this->status,
            'featured' => $this->featured,
            'published_at' => $this->published_at?->toIso8601String(),
            'cover_image' => $this->cover_image ? Storage::url($this->cover_image) : null,
            'seo' => $this->seo,
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'email' => $this->author->email,
                'avatar' => $this->author->avatar ? Storage::url($this->author->avatar) : null,
            ]),
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
            'categories' => $this->whenLoaded('categories', fn () =>
                $this->categories->map(fn ($cat) => [
                    'id' => $cat->id,
                    'name' => $cat->name,
                    'slug' => $cat->slug,
                ])
            ),
            'comments_count' => $this->whenCounted('comments'),
            'comments' => $this->whenLoaded('comments', fn () =>
                CommentResource::collection($this->comments)
            ),
            'media' => $this->whenLoaded('media', fn () =>
                MediaResource::collection($this->media)
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

---

## 3. Vue Detail Page

```vue
<!-- resources/js/Pages/Articles/Show.vue -->
<template>
    <div class="article-detail-container">
        <!-- Breadcrumbs -->
        <Breadcrumb :model="items" class="mb-3">
            <template #item="{ item, props }">
                <router-link v-if="item.to" v-bind="props.action" :to="item.to">
                    {{ item.label }}
                </router-link>
                <span v-else>{{ item.label }}</span>
            </template>
        </Breadcrumb>

        <!-- Loading -->
        <div v-if="loading" class="d-flex justify-content-center py-5">
            <ProgressSpinner />
        </div>

        <!-- Article header -->
        <div v-if="article" class="article-header mb-4">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <Tag :value="article.status" :severity="statusSeverity(article.status)" class="mb-2" />
                    <h1 class="m-0">{{ article.title }}</h1>
                    <div v-if="article.featured" class="mt-1">
                        <Tag icon="pi pi-star-fill" value="Featured" severity="warn" />
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <Button
                        icon="pi pi-pencil"
                        label="Edit"
                        severity="secondary"
                        @click="router.push(`/articles/${article.id}/edit`)"
                    />
                    <Button
                        icon="pi pi-trash"
                        label="Delete"
                        severity="danger"
                        outlined
                        @click="confirmDialog = true"
                    />
                </div>
            </div>

            <!-- Meta info -->
            <div class="article-meta mt-3">
                <div v-if="article.author" class="d-flex align-items-center gap-2">
                    <Avatar
                        :image="article.author.avatar"
                        :label="getInitials(article.author.name)"
                        size="small"
                    />
                    <span>By {{ article.author.name }}</span>
                </div>
                <div class="d-flex gap-4 mt-1 text-muted">
                    <span v-if="article.category">
                        <i class="pi pi-tag" /> {{ article.category.name }}
                    </span>
                    <span v-if="article.published_at">
                        <i class="pi pi-calendar" />
                        Published {{ formatDate(article.published_at) }}
                    </span>
                    <span>
                        <i class="pi pi-clock" />
                        Updated {{ formatDate(article.updated_at) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Tabs for related data -->
        <Tabs v-model:value="activeTab" class="mb-4">
            <TabList>
                <Tab value="content">Content</Tab>
                <Tab value="categories">Categories</Tab>
                <Tab value="media">
                    Media
                    <Badge v-if="article.media?.length" :value="article.media.length" class="ml-2" />
                </Tab>
                <Tab value="comments">
                    Comments
                    <Badge v-if="article.comments_count" :value="article.comments_count" class="ml-2" />
                </Tab>
                <Tab value="seo">SEO</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="content">
                    <div class="article-content prose max-w-none">
                        <div v-html="article.content" />
                    </div>
                </TabPanel>

                <TabPanel value="categories">
                <div v-if="article.categories?.length" class="d-flex flex-wrap gap-2">
                    <Tag
                        v-for="cat in article.categories"
                        :key="cat.id"
                        :value="cat.name"
                        severity="info"
                        closable
                    />
                </div>
                <p v-else class="text-muted">No categories assigned.</p>
            </TabPanel>

                <TabPanel value="media">
                <div v-if="article.media?.length" class="media-grid">
                    <div
                        v-for="media in article.media"
                        :key="media.id"
                        class="media-item"
                    >
                        <img
                            :src="media.url"
                            :alt="media.alt"
                            class="img-fluid"
                            @click="openLightbox(media)"
                        />
                        <div class="media-info">
                            <small>{{ media.filename }}</small>
                            <small v-if="media.alt">— {{ media.alt }}</small>
                        </div>
                    </div>
                </div>
                <p v-else class="text-muted">No media attached.</p>
            </TabPanel>

                <TabPanel value="comments">
                <div v-if="article.comments?.length">
                    <CommentItem
                        v-for="comment in article.comments"
                        :key="comment.id"
                        :comment="comment"
                    />
                </div>
                <p v-else class="text-muted">No comments yet.</p>

                <!-- Add comment form -->
                <div class="mt-4">
                    <h4>Add a Comment</h4>
                    <form @submit.prevent="addComment">
                        <Textarea
                            v-model="newComment"
                            rows="3"
                            placeholder="Write your comment..."
                            class="w-full"
                        />
                        <Button
                            label="Post Comment"
                            icon="pi pi-send"
                            class="mt-2"
                            :disabled="!newComment.trim()"
                        />
                    </form>
                </div>
            </TabPanel>

                <TabPanel value="seo">
                <div v-if="article.seo" class="grid">
                    <div class="col-12">
                        <label class="font-medium">Meta Title</label>
                        <p>{{ article.seo.meta_title }}</p>
                    </div>
                    <div class="col-12">
                        <label class="font-medium">Meta Description</label>
                        <p>{{ article.seo.meta_description }}</p>
                    </div>
                    <div class="col-12">
                        <label class="font-medium">Meta Keywords</label>
                        <div class="d-flex gap-1">
                            <Tag
                                v-for="kw in article.seo.meta_keywords"
                                :key="kw"
                                :value="kw"
                                size="small"
                            />
                        </div>
                    </div>
                </div>
                <p v-else class="text-muted">No SEO data configured.</p>
                </TabPanel>
            </TabPanels>
        </Tabs>

        <!-- Confirm delete dialog -->
        <Dialog
            v-model:visible="confirmDialog"
            modal
            header="Delete Article"
            :style="{ width: '25rem' }"
        >
            <p>Are you sure you want to delete this article? This action cannot be undone.</p>
            <template #footer>
                <Button label="Cancel" outlined @click="confirmDialog = false" />
                <Button
                    label="Delete"
                    severity="danger"
                    @click="deleteArticle"
                    :loading="deleting"
                />
            </template>
        </Dialog>

        <!-- Lightbox (PrimeVue has no Lightbox component — use a full-screen Galleria) -->
        <Galleria
            v-model:visible="lightboxVisible"
            :value="lightboxImages"
            :fullScreen="true"
            :circular="true"
            :showThumbnails="false"
            :showItemNavigators="true"
        >
            <template #item="{ item }">
                <img :src="item.src" :alt="item.alt" style="max-width: 100%; max-height: 90vh;" />
            </template>
        </Galleria>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import Breadcrumb from 'primevue/breadcrumb';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Badge from 'primevue/badge';
import Tag from 'primevue/tag';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Galleria from 'primevue/galleria';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import CommentItem from '@/Components/Comment/Item.vue';

interface Article {
    id: number;
    title: string;
    slug: string;
    content: string;
    status: string;
    featured: boolean;
    published_at: string | null;
    updated_at: string;
    cover_image: string | null;
    seo: { meta_title: string; meta_description: string; meta_keywords: string[] } | null;
    author: { id: number; name: string; email: string; avatar: string | null } | null;
    category: { id: number; name: string; slug: string } | null;
    categories: { id: number; name: string; slug: string }[];
    comments_count: number;
    comments: any[];
    media: { id: number; url: string; alt: string; filename: string }[];
}

const toast = useToast();
const activeTab = ref('content');
const loading = ref(false);
const deleting = ref(false);
const newComment = ref('');
const confirmDialog = ref(false);
const lightboxVisible = ref(false);
const lightboxImages = ref<{ src: string; alt: string }[]>([]);

const route = useRoute();
const router = useRouter();
const article = ref<Article | null>(null);

const loadArticle = async () => {
    loading.value = true;
    try {
        const { data } = await axios.get(`/api/articles/${route.params.id}`);
        article.value = data.data;
    } finally {
        loading.value = false;
    }
};

const items = computed(() => [
    { label: 'Articles', to: '/articles' },
    { label: article.value?.title || 'Detail' },
]);

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
        year: 'numeric', month: 'short', day: 'numeric',
    });
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const openLightbox = (media: any) => {
    lightboxImages.value = article.value!.media.map((m: any) => ({
        src: m.url,
        alt: m.alt,
    }));
    lightboxVisible.value = true;
};

const addComment = async () => {
    try {
        await axios.post(`/api/articles/${article.value!.id}/comments`, {
            body: newComment.value,
        });
        newComment.value = '';
        toast.add({ severity: 'success', detail: 'Comment added.', life: 3000 });
        // Refresh article
        await loadArticle();
    } catch {
        toast.add({ severity: 'error', detail: 'Failed to add comment.', life: 5000 });
    }
};

const deleteArticle = async () => {
    deleting.value = true;
    try {
        await axios.delete(`/api/articles/${article.value!.id}`);
        router.push('/articles');
    } catch {
        toast.add({ severity: 'error', detail: 'Failed to delete article.', life: 5000 });
    } finally {
        deleting.value = false;
        confirmDialog.value = false;
    }
};

onMounted(() => {
    loadArticle();
});
</script>

<style scoped>
.article-detail-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem;
}

.article-content {
    line-height: 1.8;
}

.media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
}

.media-item {
    cursor: pointer;
}

.media-item img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 6px;
    transition: transform 0.2s;
}

.media-item img:hover {
    transform: scale(1.02);
}

.media-info {
    font-size: 0.8rem;
    color: var(--text-color-secondary);
    padding: 0.25rem 0;
}
</style>
```

---

## 4. Routes

```php
// routes/web.php
use App\Http\Controllers\Api\V1\ArticleController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/articles/{article}', [ArticleController::class, 'show'])->name('articles.show');
    Route::post('/articles/{article}/comments', [CommentController::class, 'store'])->name('articles.comments.store');
});
```

---

## 5. Pest Tests

```php
// tests/Feature/Api/ArticleDetailTest.php
use App\Models\Article;
use App\Models\Comment;
use App\Models\User;
use App\Models\Category;

describe('Article Detail (GET /api/articles/{article})', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
        $this->article = Article::factory()->for(User::factory())->create();
    });

    it('returns article with relationships', function () {
        $category = Category::factory()->create();
        $this->article->categories()->attach($category);
        $this->article->load('categories');

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/articles/{$this->article->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id', 'title', 'slug', 'content', 'status',
                    'author' => ['id', 'name', 'email'],
                    'category',
                    'categories' => ['*' => ['id', 'name', 'slug']],
                    'comments_count',
                    'comments' => ['*' => ['id', 'body']],
                    'created_at',
                ],
            ]);
    });

    it('returns 404 for non-existent article', function () {
        $this->actingAs($this->user, 'api')
            ->getJson('/api/articles/999')
            ->assertStatus(404);
    });

    it('returns 401 without authentication', function () {
        $this->getJson("/api/articles/{$this->article->id}")
            ->assertStatus(401);
    });

    it('includes comments with reply counts', function () {
        Comment::factory()->count(3)->for($this->article)->create();

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/articles/{$this->article->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.comments_count', 3);
    });
});
```

---

## 6. Vue Dependencies

```json
{
    "dependencies": {
        "primevue": "^4.2.0",
        "@primevue/themes": "^4.2.0",
        "vue": "^3.5.0",
        "vue-router": "^4.4.0",
        "axios": "^1.7.0"
    }
}
```
