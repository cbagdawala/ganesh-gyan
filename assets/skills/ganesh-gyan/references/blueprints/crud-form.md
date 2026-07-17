# Blueprint: Create/Edit Form (CRUD)

## Overview

Controller `store()`/`update()` with Form Request validation. Vue form using PrimeVue InputText, InputNumber, Select, DatePicker, Editor, Checkbox. File upload with preview. Server-side validation error handling. Clean routing.

---

## 1. Migration

```php
// database/migrations/2024_01_01_000000_create_projects_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('goal')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('team_lead_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('tags')->nullable();
            $table->boolean('active')->default(true);
            $table->string('cover_image')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
```

---

## 2. Model

```php
// app/Models/Project.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'description', 'goal', 'budget',
        'priority', 'start_date', 'end_date', 'client_id',
        'team_lead_id', 'tags', 'active', 'cover_image',
    ];

    protected $casts = [
        'budget' => 'decimal:2',
        'tags' => 'array',
        'active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function teamLead()
    {
        return $this->belongsTo(User::class, 'team_lead_id');
    }

    public function setCoverImageAttribute(string $value): void
    {
        $this->attributes['cover_image'] = $value === 'null' || $value === '' ? null : $value;
    }
}
```

---

## 3. Resource Controller

```php
// app/Http/Controllers/Api/V1/ProjectController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreRequest;
use App\Http\Requests\Project\UpdateRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller as BaseController;

class ProjectController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Store a new project.
     */
    public function store(StoreRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = Str::slug($data['name']);

        if ($request->hasFile('cover_image')) {
            $path = $request->file('cover_image')->store('projects/covers', 'public');
            $data['cover_image'] = $path;
        }

        $project = Project::create($data);

        return response()->json(
            new ProjectResource($project),
            \Illuminate\Http\Response::HTTP_CREATED
        );
    }

    /**
     * Update an existing project.
     */
    public function update(UpdateRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = Str::slug($data['name']);

        // Handle cover image replacement
        if ($request->hasFile('cover_image')) {
            if ($project->cover_image) {
                Storage::disk('public')->delete($project->cover_image);
            }
            $path = $request->file('cover_image')->store('projects/covers', 'public');
            $data['cover_image'] = $path;
        }

        // Handle cover image removal
        if ($request->boolean('remove_cover_image')) {
            if ($project->cover_image) {
                Storage::disk('public')->delete($project->cover_image);
            }
            $data['cover_image'] = null;
        }

        $project->update($data);

        return response()->json(new ProjectResource($project));
    }

    /**
     * Get a single project with loaded relationships.
     */
    public function show(Project $project): JsonResponse
    {
        $project->load(['client', 'teamLead:id,name,email']);

        return response()->json(new ProjectResource($project));
    }
}
```

---

## 4. Form Requests

```php
// app/Http/Requests/Project/StoreRequest.php
namespace App\Http\Requests\Project;

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
            'name' => 'required|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:projects,slug',
            'description' => 'sometimes|string|max:5000',
            'goal' => 'sometimes|string|max:2000',
            'budget' => ['sometimes', 'numeric', 'min:0', 'max:999999999.99'],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'start_date' => ['sometimes', 'date', 'before:end_date'],
            'end_date' => ['sometimes', 'date', 'after:start_date'],
            'client_id' => 'required|integer|exists:clients,id',
            'team_lead_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:50',
            'active' => 'sometimes|boolean',
            'cover_image' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'start_date.before' => 'Start date must be before end date.',
            'end_date.after' => 'End date must be after start date.',
        ];
    }
}
```

```php
// app/Http/Requests/Project/UpdateRequest.php
namespace App\Http\Requests\Project;

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
        $projectId = $this->route('project')->id;

        return [
            'name' => 'required|string|max:255',
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('projects', 'slug')->ignore($projectId)],
            'description' => 'sometimes|string|max:5000',
            'goal' => 'sometimes|string|max:2000',
            'budget' => ['sometimes', 'numeric', 'min:0', 'max:999999999.99'],
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'start_date' => ['sometimes', 'date', 'before:end_date'],
            'end_date' => ['sometimes', 'date', 'after:start_date'],
            'client_id' => 'required|integer|exists:clients,id',
            'team_lead_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:50',
            'active' => 'sometimes|boolean',
            'cover_image' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'remove_cover_image' => 'sometimes|boolean',
        ];
    }
}
```

---

## 5. Resource

```php
// app/Http/Resources/ProjectResource.php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'goal' => $this->goal,
            'budget' => $this->budget,
            'priority' => $this->priority,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'client_id' => $this->client_id,
            'team_lead_id' => $this->team_lead_id,
            'tags' => $this->tags,
            'active' => $this->active,
            'cover_image' => $this->cover_image ? Storage::url($this->cover_image) : null,
            'client' => $this->whenLoaded('client', fn () => [
                'id' => $this->client->id,
                'name' => $this->client->name,
            ]),
            'team_lead' => $this->whenLoaded('teamLead', fn () => [
                'id' => $this->teamLead->id,
                'name' => $this->teamLead->name,
                'email' => $this->teamLead->email,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

---

## 6. Vue Form Component

```vue
<!-- resources/js/Pages/Projects/Create.vue -->
<!-- resources/js/Pages/Projects/Edit.vue (same template, different route) -->
<template>
    <div class="project-form-container">
        <div class="d-flex align-items-center gap-3 mb-4">
            <Button icon="pi pi-arrow-left" severity="secondary" outlined @click="router.back()" />
            <h1 class="m-0">{{ isEdit ? 'Edit Project' : 'New Project' }}</h1>
        </div>

        <!-- Breadcrumbs -->
        <Breadcrumb :model="items">
            <template #item="{ item, props }">
                <router-link v-if="item.to" v-bind="props.action" :to="item.to">
                    {{ item.label }}
                </router-link>
                <span v-else>{{ item.label }}</span>
            </template>
        </Breadcrumb>

        <!-- Loading spinner -->
        <div v-if="loading" class="d-flex justify-content-center py-5">
            <ProgressSpinner />
        </div>

        <!-- Validation summary -->
        <div v-if="Object.keys(serverErrors).length > 0" class="alert alert-danger mb-4">
            <div class="d-flex justify-content-between align-items-center">
                <span>Please fix the errors below before submitting.</span>
                <Button icon="pi pi-times" text size="small" @click="serverErrors = {}" />
            </div>
        </div>

        <form @submit.prevent="submitForm" novalidate>
            <!-- Section: Basic Information -->
            <Card class="mb-4">
                <template #header>Basic Information</template>
                <template #content>
                    <div class="grid">
                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <InputText
                                    id="name"
                                    :class="{ 'p-invalid': serverErrors.name }"
                                    v-model="form.name"
                                    required
                                />
                                <label for="name">Project Name *</label>
                            </FloatLabel>
                            <Message v-if="serverErrors.name" severity="error" size="small">
                                {{ serverErrors.name[0] }}
                            </Message>
                        </div>

                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <InputText
                                    id="slug"
                                    :class="{ 'p-invalid': serverErrors.slug }"
                                    v-model="form.slug"
                                />
                                <label for="slug">Slug</label>
                            </FloatLabel>
                            <Message v-if="serverErrors.slug" severity="error" size="small">
                                {{ serverErrors.slug[0] }}
                            </Message>
                        </div>

                        <div class="col-12">
                            <label class="block mb-1 font-medium">Description</label>
                            <Editor
                                v-model="form.description"
                                :class="{ 'p-invalid': serverErrors.description }"
                                :style="{ height: '200px' }"
                                :pt="{ textarea: { class: 'w-full' } }"
                            />
                            <Message v-if="serverErrors.description" severity="error" size="small">
                                {{ serverErrors.description[0] }}
                            </Message>
                        </div>

                        <div class="col-12">
                            <FloatLabel>
                                <InputText
                                    id="goal"
                                    v-model="form.goal"
                                />
                                <label for="goal">Goal</label>
                            </FloatLabel>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Section: Details -->
            <Card class="mb-4">
                <template #header>Project Details</template>
                <template #content>
                    <div class="grid">
                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <InputNumber
                                    id="budget"
                                    :class="{ 'p-invalid': serverErrors.budget }"
                                    v-model="form.budget"
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                />
                                <label for="budget">Budget</label>
                            </FloatLabel>
                            <Message v-if="serverErrors.budget" severity="error" size="small">
                                {{ serverErrors.budget[0] }}
                            </Message>
                        </div>

                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <Select
                                    id="priority"
                                    :class="{ 'p-invalid': serverErrors.priority }"
                                    :options="priorityOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    v-model="form.priority"
                                    placeholder="Select Priority"
                                />
                                <label for="priority">Priority *</label>
                            </FloatLabel>
                            <Message v-if="serverErrors.priority" severity="error" size="small">
                                {{ serverErrors.priority[0] }}
                            </Message>
                        </div>

                        <div class="col-12 md:col-6">
                            <label class="block mb-1 font-medium">Start Date</label>
                            <DatePicker
                                v-model="form.start_date"
                                :class="{ 'p-invalid': serverErrors.start_date }"
                                dateFormat="dd/mm/yy"
                                showIcon
                                placeholder="Select start date"
                                :pt="{ root: { class: 'w-full' } }"
                            />
                            <Message v-if="serverErrors.start_date" severity="error" size="small">
                                {{ serverErrors.start_date[0] }}
                            </Message>
                        </div>

                        <div class="col-12 md:col-6">
                            <label class="block mb-1 font-medium">End Date</label>
                            <DatePicker
                                v-model="form.end_date"
                                :class="{ 'p-invalid': serverErrors.end_date }"
                                dateFormat="dd/mm/yy"
                                showIcon
                                placeholder="Select end date"
                                :pt="{ root: { class: 'w-full' } }"
                            />
                            <Message v-if="serverErrors.end_date" severity="error" size="small">
                                {{ serverErrors.end_date[0] }}
                            </Message>
                        </div>

                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <Select
                                    id="client_id"
                                    :class="{ 'p-invalid': serverErrors.client_id }"
                                    :options="clients"
                                    optionLabel="name"
                                    optionValue="id"
                                    v-model="form.client_id"
                                    placeholder="Select Client"
                                    filter
                                    showClear
                                    :pt="{ root: { class: 'w-full' } }"
                                />
                                <label for="client_id">Client *</label>
                            </FloatLabel>
                            <Message v-if="serverErrors.client_id" severity="error" size="small">
                                {{ serverErrors.client_id[0] }}
                            </Message>
                        </div>

                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <Select
                                    id="team_lead_id"
                                    v-model="form.team_lead_id"
                                    :options="teamMembers"
                                    optionLabel="name"
                                    optionValue="id"
                                    placeholder="Select Team Lead"
                                    filter
                                    showClear
                                    :pt="{ root: { class: 'w-full' } }"
                                />
                                <label for="team_lead_id">Team Lead</label>
                            </FloatLabel>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Section: Tags -->
            <Card class="mb-4">
                <template #header>Tags</template>
                <template #content>
                    <MultiSelect
                        v-model="form.tags"
                        :options="availableTags"
                        optionLabel="label"
                        optionValue="value"
                        :placeholder="`Enter tags...`"
                        filter
                        display="chip"
                        :pt="{ listContainer: { class: 'w-full' } }"
                    />
                    <Message severity="error" size="small" v-if="serverErrors.tags">
                        {{ serverErrors.tags[0] }}
                    </Message>
                </template>
            </Card>

            <!-- Section: Cover Image -->
            <Card class="mb-4">
                <template #header>Cover Image</template>
                <template #content>
                    <FileUpload
                        mode="basic"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        :maxFileSize="5120000"
                        :auto="false"
                        chooseLabel="Choose File"
                        @select="onFileSelect"
                    />

                    <div v-if="form.cover_image_preview" class="mt-3">
                        <div class="cover-preview">
                            <img :src="form.cover_image_preview" alt="Cover preview" />
                        </div>
                        <div class="d-flex gap-2 mt-2">
                            <Button
                                label="Remove"
                                severity="danger"
                                text
                                size="small"
                                @click="removeCoverImage"
                            />
                        </div>
                    </div>

                    <Message severity="error" size="small" v-if="serverErrors.cover_image">
                        {{ serverErrors.cover_image[0] }}
                    </Message>
                </template>
            </Card>

            <!-- Section: Active Toggle -->
            <Card class="mb-4">
                <template #header>Settings</template>
                <template #content>
                    <div class="flex align-items-center gap-2">
                        <Checkbox
                            v-model="form.active"
                            inputId="active"
                            :binary="true"
                        />
                        <label for="active">Active</label>
                        <small class="text-muted">
                            Deactivated projects won't appear in active listings.
                        </small>
                    </div>
                </template>
            </Card>

            <!-- Actions -->
            <div class="d-flex justify-content-end gap-2">
                <Button label="Cancel" severity="secondary" @click="router.back()" />
                <Button
                    label="Save"
                    icon="pi pi-check"
                    :loading="submitting"
                    :disabled="submitting"
                    type="submit"
                />
            </div>
        </form>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Editor from 'primevue/editor';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import FileUpload from 'primevue/fileupload';
import FloatLabel from 'primevue/floatlabel';
import Message from 'primevue/message';
import Card from 'primevue/card';
import Breadcrumb from 'primevue/breadcrumb';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

interface FormState {
    name: string;
    slug: string;
    description: string | null;
    goal: string | null;
    budget: number | null;
    priority: string;
    start_date: string | null;
    end_date: string | null;
    client_id: number | null;
    team_lead_id: number | null;
    tags: string[];
    active: boolean;
    cover_image_file: File | null;
    cover_image_preview: string | null;
    remove_cover_image: boolean;
}

const props = defineProps<{ editData?: Record<string, any> | null }>();
const router = useRouter();

const isEdit = computed(() => !!props.editData);
const form = reactive<FormState>({
    name: '',
    slug: '',
    description: null,
    goal: null,
    budget: null,
    priority: 'medium',
    start_date: null,
    end_date: null,
    client_id: null,
    team_lead_id: null,
    tags: [],
    active: true,
    cover_image_file: null,
    cover_image_preview: null,
    remove_cover_image: false,
});

const loading = ref(false);
const submitting = ref(false);
const serverErrors = ref<Record<string, string[]>>({});
const toast = useToast();

const priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' },
];

const clients = ref<{ id: number; name: string }[]>([]);
const teamMembers = ref<{ id: number; name: string }[]>([]);
const availableTags = ref<{ label: string; value: string }[]>([]);

const items = computed(() => [
    { label: 'Projects', to: '/projects' },
    { label: isEdit.value ? 'Edit' : 'Create' },
]);

const populateForm = (data: any) => {
    form.name = data.name || '';
    form.slug = data.slug || '';
    form.description = data.description || '';
    form.goal = data.goal || '';
    form.budget = data.budget ? parseFloat(data.budget) : null;
    form.priority = data.priority || 'medium';
    form.start_date = data.start_date || null;
    form.end_date = data.end_date || null;
    form.client_id = data.client_id || null;
    form.team_lead_id = data.team_lead_id || null;
    form.tags = data.tags || [];
    form.active = data.active ?? true;
    if (data.cover_image) {
        form.cover_image_preview = data.cover_image;
    }
};

const onFileSelect = (event: { files: { [key: string]: File[] } }) => {
    const file = event.files['cover_image'];
    if (file) {
        form.cover_image_file = file;
        form.cover_image_preview = URL.createObjectURL(file);
        form.remove_cover_image = false;
    }
};

const removeCoverImage = () => {
    form.cover_image_file = null;
    form.cover_image_preview = null;
    form.remove_cover_image = true;
};

const submitForm = async () => {
    submitting.value = true;
    serverErrors.value = {};

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('slug', form.slug || '');
    formData.append('description', form.description || '');
    formData.append('goal', form.goal || '');
    formData.append('budget', form.budget?.toString() || '');
    formData.append('priority', form.priority);
    formData.append('start_date', form.start_date || '');
    formData.append('end_date', form.end_date || '');
    formData.append('client_id', String(form.client_id));
    formData.append('team_lead_id', form.team_lead_id?.toString() || '');
    formData.append('active', String(form.active));

    if (form.tags.length > 0) {
        form.tags.forEach((tag: string, index: number) => {
            formData.append(`tags[${index}]`, tag);
        });
    }

    if (form.remove_cover_image) {
        formData.append('remove_cover_image', '1');
    }

    if (form.cover_image_file) {
        formData.append('cover_image', form.cover_image_file);
    }

    const method = isEdit.value ? 'put' : 'post';
    const url = isEdit.value ? `/projects/${props.editData!.id}` : '/projects';

    try {
        await axios[method](url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.add({
            severity: 'success',
            summary: isEdit.value ? 'Updated' : 'Created',
            detail: `Project saved successfully.`,
            life: 3000,
        });
        router.push('/projects');
    } catch (error: any) {
        if (error.response?.status === 422) {
            serverErrors.value = error.response.data.errors;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'An unexpected error occurred.',
                life: 5000,
            });
        }
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    if (isEdit.value) {
        populateForm(props.editData);
    }
    loadClients();
    loadTeamMembers();
});

const loadClients = async () => {
    try {
        const { data } = await axios.get('/api/clients');
        clients.value = data.data;
    } catch {
        // fallback
    }
};

const loadTeamMembers = async () => {
    try {
        const { data } = await axios.get('/api/users');
        teamMembers.value = data.data;
    } catch {
        // fallback
    }
};
</script>

<style scoped>
.project-form-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem;
}

.cover-preview img {
    width: 100%;
    max-height: 300px;
    object-fit: cover;
    border-radius: 8px;
}
</style>
```

---

## 7. Routes

```php
// routes/web.php
use App\Http\Controllers\Api\V1\ProjectController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/projects/create', fn () => inertia('Projects/Create'))->name('projects.create');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::get('/projects/{project}/edit', fn () => inertia('Projects/Edit'))->name('projects.edit');
    Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
});
```

---

## 8. Pest Tests

```php
// tests/Feature/Api/ProjectFormTest.php
use App\Models\Project;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

describe('Project Form (CRUD)', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
        $this->client = Client::factory()->create();
    });

    describe('POST /api/projects (store)', function () {
        it('creates a project with valid data', function () {
            $data = [
                'name' => 'E-Commerce Platform',
                'priority' => 'high',
                'client_id' => $this->client->id,
                'active' => true,
            ];

            $response = $this->actingAs($this->user, 'api')
                ->postJson('/api/projects', $data);

            $response->assertStatus(201)
                ->assertJsonPath('data.name', 'E-Commerce Platform')
                ->assertJsonPath('data.priority', 'high')
                ->assertJsonPath('data.active', true);

            expect(Project::where('name', 'E-Commerce Platform')->first())
                ->name->toBe('E-Commerce Platform');
        });

        it('auto-generates slug from name when not provided', function () {
            $data = [
                'name' => 'E-Commerce Platform',
                'priority' => 'medium',
                'client_id' => $this->client->id,
            ];

            $response = $this->actingAs($this->user, 'api')
                ->postJson('/api/projects', $data);

            $response->assertStatus(201)
                ->assertJsonPath('data.slug', 'e-commerce-platform');
        });

        it('returns 422 for missing required fields', function () {
            $this->actingAs($this->user, 'api')
                ->postJson('/api/projects', [])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['name', 'priority', 'client_id']);
        });

        it('returns 422 for invalid priority value', function () {
            $data = [
                'name' => 'Test Project',
                'priority' => 'urgent',
                'client_id' => $this->client->id,
            ];

            $this->actingAs($this->user, 'api')
                ->postJson('/api/projects', $data)
                ->assertStatus(422)
                ->assertJsonValidationErrors('priority');
        });

        it('uploads cover image', function () {
            Storage::fake('public');

            $file = UploadedFile::fake()->image('cover.jpg', 800, 600);

            $response = $this->actingAs($this->user, 'api')
                ->withHeaders(['Accept' => 'application/json'])
                ->postJson('/api/projects', [
                    'name' => 'Image Project',
                    'priority' => 'medium',
                    'client_id' => $this->client->id,
                    'cover_image' => $file,
                ]);

            $response->assertStatus(201);
            Storage::disk('public')->assertExists('projects/covers/' . pathinfo($file->getClientOriginalName())->getFilename());
        });

        it('rejects non-image file upload', function () {
            $file = UploadedFile::fake()->create('document.pdf', 100);

            $response = $this->actingAs($this->user, 'api')
                ->withHeaders(['Accept' => 'application/json'])
                ->postJson('/api/projects', [
                    'name' => 'PDF Project',
                    'priority' => 'medium',
                    'client_id' => $this->client->id,
                    'cover_image' => $file,
                ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors('cover_image');
        });

        it('returns 401 when unauthenticated', function () {
            $this->postJson('/api/projects', [])
                ->assertStatus(401);
        });
    });

    describe('PUT /api/projects/{project} (update)', function () {
        it('updates a project with valid data', function () {
            $project = Project::factory()->create(['client_id' => $this->client->id]);

            $response = $this->actingAs($this->user, 'api')
                ->putJson("/api/projects/{$project->id}", [
                    'name' => 'Updated Project Name',
                    'priority' => 'critical',
                    'client_id' => $this->client->id,
                ]);

            $response->assertStatus(200)
                ->assertJsonPath('data.name', 'Updated Project Name')
                ->assertJsonPath('data.priority', 'critical');
        });

        it('returns 404 for non-existent project', function () {
            $this->actingAs($this->user, 'api')
                ->putJson('/api/projects/999', [
                    'name' => 'Ghost',
                    'priority' => 'medium',
                    'client_id' => $this->client->id,
                ])
                ->assertStatus(404);
        });

        it('replaces cover image', function () {
            Storage::fake('public');

            $project = Project::factory()->create([
                'client_id' => $this->client->id,
                'cover_image' => 'old-cover.jpg',
            ]);

            Storage::disk('public')->put('old-cover.jpg', 'old');

            $newFile = UploadedFile::fake()->image('new.jpg');

            $response = $this->actingAs($this->user, 'api')
                ->withHeaders(['Accept' => 'application/json'])
                ->withFile('cover_image', $newFile)
                ->putJson("/api/projects/{$project->id}", [
                    'name' => 'Replaced Cover',
                    'priority' => 'medium',
                    'client_id' => $this->client->id,
                ]);

            $response->assertStatus(200);
            Storage::disk('public')->assertMissing('old-cover.jpg');
            Storage::disk('public')->assertExists('projects/covers/' . pathinfo($newFile->getClientOriginalName())->getFilename());
        });

        it('removes cover image when requested', function () {
            Storage::fake('public');

            $project = Project::factory()->create([
                'client_id' => $this->client->id,
                'cover_image' => 'old-cover.jpg',
            ]);

            Storage::disk('public')->put('old-cover.jpg', 'old');

            $response = $this->actingAs($this->user, 'api')
                ->putJson("/api/projects/{$project->id}", [
                    'name' => 'No Cover',
                    'priority' => 'medium',
                    'client_id' => $this->client->id,
                    'remove_cover_image' => true,
                ]);

            $response->assertStatus(200)
                ->assertJsonPath('data.cover_image', null);
            Storage::disk('public')->assertMissing('old-cover.jpg');
        });

        it('validates date range (end_date must be after start_date)', function () {
            $project = Project::factory()->create(['client_id' => $this->client->id]);

            $this->actingAs($this->user, 'api')
                ->putJson("/api/projects/{$project->id}", [
                    'name' => 'Bad Dates',
                    'priority' => 'medium',
                    'client_id' => $this->client->id,
                    'start_date' => '2024-12-01',
                    'end_date' => '2024-01-01',
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['start_date', 'end_date']);
        });
    });
});
```

---

## 9. Form Factory (Pest)

```php
// tests/Factories/ProjectFactory.php
namespace Database\Factories;

use App\Models\Client;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        return [
            'name' => fake()->company() . ' Project',
            'slug' => Str::slug(fake()->company()) . '-project',
            'description' => fake()->paragraph(),
            'goal' => fake()->sentence(),
            'budget' => fake()->randomFloat(2, 1000, 100000),
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'start_date' => fake()->dateTimeBetween('now', '+1 year'),
            'end_date' => fake()->dateTimeBetween('+1 year', '+2 years'),
            'client_id' => Client::factory(),
            'team_lead_id' => User::factory(),
            'tags' => [fake()->word(), fake()->word()],
            'active' => true,
            'cover_image' => null,
        ];
    }
}
```

---

## 10. Vue Dependencies

```json
{
    "dependencies": {
        "primevue": "^4.2.0",
        "@primevue/themes": "^4.2.0",
        "vue": "^3.5.0",
        "vue-router": "^4.4.0",
        "pinia": "^2.2.0",
        "axios": "^1.7.0"
    }
}
```
