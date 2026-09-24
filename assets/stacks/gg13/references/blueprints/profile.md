# Blueprint: Profile

## Overview

Avatar upload with preview, profile info editing, password change, and activity log. All within a single profile page.

---

## 1. Controller

```php
// app/Http/Controllers/Api/V1/ProfileController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateRequest;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('avatar');

        return response()->json(new UserResource($user));
    }

    public function update(UpdateRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        if ($request->boolean('remove_avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = null;
        }

        $user->update($data);

        return response()->json(new UserResource($user));
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (!Hash::check($request->validated('current_password'), $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->validated('new_password')),
        ]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function activityLog(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = min((int)($request->get('per_page', 15)), 50);

        $logs = ActivityLog::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'last_page' => $logs->lastPage(),
            ],
        ]);
    }
}
```

---

## 2. Models

```php
// app/Models/ActivityLog.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'action', 'description', 'ip_address', 'user_agent',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

---

## 3. Profile Vue Page

```vue
<!-- resources/js/Pages/Profile.vue -->
<template>
    <div class="profile-container">
        <h1 class="mb-4">My Profile</h1>

        <!-- Loading -->
        <div v-if="loading" class="d-flex justify-content-center py-5">
            <ProgressSpinner />
        </div>

        <div v-if="user" class="profile-content">
            <!-- Avatar Section -->
            <Card class="mb-4">
                <template #header>Avatar</template>
                <template #content>
                    <div class="d-flex align-items-center gap-4">
                        <Avatar
                            :image="user.avatar"
                            :label="getInitials(user.name)"
                            size="xlarge"
                            shape="circle"
                        />
                        <div>
                            <input
                                ref="avatarInput"
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                style="display: none"
                                @change="handleAvatarSelect"
                            />
                            <div class="d-flex gap-2">
                                <Button
                                    label="Change Photo"
                                    icon="pi pi-camera"
                                    @click="avatarInput?.click()"
                                />
                                <Button
                                    v-if="user.avatar"
                                    label="Remove"
                                    severity="danger"
                                    text
                                    @click="removeAvatar"
                                />
                            </div>
                            <small class="text-muted">JPG, PNG, or WebP. Max 2MB.</small>
                        </div>
                    </div>
                    <Message v-if="avatarError" severity="error" class="mt-2">{{ avatarError }}</Message>
                </template>
            </Card>

            <!-- Profile Info -->
            <Card class="mb-4">
                <template #header>Personal Information</template>
                <template #content>
                    <form @submit.prevent="saveProfile" novalidate>
                        <div class="grid">
                            <div class="col-12 md:col-6">
                                <FloatLabel>
                                    <InputText
                                        id="name"
                                        v-model="form.name"
                                        :class="{ 'p-invalid': errors.name }"
                                    />
                                    <label for="name">Full Name *</label>
                                </FloatLabel>
                                <Message v-if="errors.name" severity="error" size="small">{{ errors.name[0] }}</Message>
                            </div>
                            <div class="col-12 md:col-6">
                                <FloatLabel>
                                    <InputText
                                        id="email"
                                        type="email"
                                        v-model="form.email"
                                        :class="{ 'p-invalid': errors.email }"
                                    />
                                    <label for="email">Email *</label>
                                </FloatLabel>
                                <Message v-if="errors.email" severity="error" size="small">{{ errors.email[0] }}</Message>
                            </div>
                            <div class="col-12">
                                <label class="block mb-1 font-medium">Bio</label>
                                <Textarea
                                    v-model="form.bio"
                                    rows="3"
                                    class="w-full"
                                    autoResize
                                />
                            </div>
                        </div>
                        <div class="d-flex justify-content-end mt-3">
                            <Button
                                label="Save Changes"
                                icon="pi pi-check"
                                :loading="savingProfile"
                                :disabled="savingProfile"
                            />
                        </div>
                    </form>
                </template>
            </Card>

            <!-- Password Change -->
            <Card class="mb-4">
                <template #header>Change Password</template>
                <template #content>
                    <form @submit.prevent="changePassword" novalidate>
                        <div class="grid">
                            <div class="col-12 md:col-4">
                                <FloatLabel>
                                    <Password
                                        v-model="passwordForm.current_password"
                                        :feedback="false"
                                        toggleMask
                                        class="w-full"
                                    />
                                    <label>Current Password *</label>
                                </FloatLabel>
                            </div>
                            <div class="col-12 md:col-4">
                                <FloatLabel>
                                    <Password
                                        v-model="passwordForm.new_password"
                                        :feedback="true"
                                        toggleMask
                                        :class="{ 'p-invalid': errors.new_password }"
                                        class="w-full"
                                    />
                                    <label>New Password *</label>
                                </FloatLabel>
                                <Message v-if="errors.new_password" severity="error" size="small">{{ errors.new_password[0] }}</Message>
                            </div>
                            <div class="col-12 md:col-4">
                                <FloatLabel>
                                    <Password
                                        v-model="passwordForm.confirm_password"
                                        :feedback="false"
                                        toggleMask
                                        :class="{ 'p-invalid': errors.confirm_password }"
                                        class="w-full"
                                    />
                                    <label>Confirm New Password *</label>
                                </FloatLabel>
                                <Message v-if="errors.confirm_password" severity="error" size="small">{{ errors.confirm_password[0] }}</Message>
                            </div>
                        </div>
                        <div class="d-flex justify-content-end mt-3">
                            <Button
                                label="Update Password"
                                icon="pi pi-lock"
                                :loading="changingPassword"
                                :disabled="changingPassword"
                                severity="warn"
                            />
                        </div>
                    </form>
                </template>
            </Card>

            <!-- Activity Log -->
            <Card>
                <template #header>Recent Activity</template>
                <template #content>
                    <DataTable
                        :value="activity"
                        :loading="loadingActivity"
                        :paginator="true"
                        :rows="activityPerPage"
                        :totalRecords="activityTotal"
                        @page="onActivityPage"
                        stripedRows
                    >
                        <Column field="action" header="Action" />
                        <Column field="description" header="Description" />
                        <Column field="ip_address" header="IP Address" />
                        <Column field="created_at" header="Date" sortable :sortField="'created_at'">
                            <template #body="{ data }">
                                {{ formatDate(data.created_at) }}
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </div>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Password from 'primevue/password';
import FloatLabel from 'primevue/floatlabel';
import Message from 'primevue/message';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

interface UserProfile {
    id: number;
    name: string;
    email: string;
    bio: string | null;
    avatar: string | null;
}

interface ActivityLog {
    id: number;
    action: string;
    description: string | null;
    ip_address: string | null;
    created_at: string;
}

const toast = useToast();
const avatarInput = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const savingProfile = ref(false);
const changingPassword = ref(false);
const loadingActivity = ref(false);

const user = ref<UserProfile | null>(null);
const errors = ref<Record<string, string[]>>({});
const avatarError = ref<string | null>(null);

const form = reactive({
    name: '',
    email: '',
    bio: '',
});

const passwordForm = reactive({
    current_password: '',
    new_password: '',
    confirm_password: '',
});

const activity = ref<ActivityLog[]>([]);
const activityTotal = ref(0);
const activityPerPage = ref(15);

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
};

const handleAvatarSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        avatarError.value = 'File size must be under 2MB.';
        return;
    }

    avatarError.value = null;
    savingProfile.value = true;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const { data } = await axios.put('/api/profile', formData);
        user.value = data.data;
        toast.add({ severity: 'success', detail: 'Avatar updated.', life: 3000 });
    } catch {
        avatarError.value = 'Failed to upload avatar.';
    } finally {
        savingProfile.value = false;
    }
};

const removeAvatar = async () => {
    savingProfile.value = true;
    try {
        const { data } = await axios.put('/api/profile', { remove_avatar: true });
        user.value = data.data;
        toast.add({ severity: 'success', detail: 'Avatar removed.', life: 3000 });
    } catch {
        toast.add({ severity: 'error', detail: 'Failed to remove avatar.', life: 5000 });
    } finally {
        savingProfile.value = false;
    }
};

const saveProfile = async () => {
    savingProfile.value = true;
    errors.value = {};

    try {
        const { data } = await axios.put('/api/profile', {
            name: form.name,
            email: form.email,
            bio: form.bio,
        });
        user.value = data.data;
        toast.add({ severity: 'success', detail: 'Profile updated.', life: 3000 });
    } catch (error: any) {
        if (error.response?.status === 422) {
            errors.value = error.response.data.errors;
        }
    } finally {
        savingProfile.value = false;
    }
};

const changePassword = async () => {
    changingPassword.value = true;
    errors.value = {};

    if (passwordForm.new_password !== passwordForm.confirm_password) {
        errors.value.confirm_password = ['Passwords do not match.'];
        changingPassword.value = false;
        return;
    }

    try {
        await axios.put('/api/profile/password', passwordForm);
        toast.add({ severity: 'success', detail: 'Password changed.', life: 3000 });
        passwordForm.current_password = '';
        passwordForm.new_password = '';
        passwordForm.confirm_password = '';
    } catch (error: any) {
        if (error.response?.status === 422) {
            errors.value = error.response.data.errors;
        }
    } finally {
        changingPassword.value = false;
    }
};

const loadActivity = async (page: number = 1) => {
    loadingActivity.value = true;
    try {
        const { data } = await axios.get('/api/profile/activity', {
            params: { page, per_page: activityPerPage.value },
        });
        activity.value = data.data;
        activityTotal.value = data.meta.total;
    } finally {
        loadingActivity.value = false;
    }
};

const onActivityPage = (event: any) => {
    activityPerPage.value = event.rows;
    loadActivity(event.page + 1);
};

onMounted(() => {
    loading.value = true;
    axios.get('/api/profile').then(({ data }) => {
        user.value = data.data;
        form.name = data.data.name;
        form.email = data.data.email;
        form.bio = data.data.bio || '';
    }).finally(() => {
        loading.value = false;
        loadActivity();
    });
});
</script>

<style scoped>
.profile-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem;
}
</style>
```

---

## 4. Routes

```php
// routes/web.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');
    Route::get('/profile/activity', [ProfileController::class, 'activityLog'])->name('profile.activity');
});
```

---

## 5. Pest Tests

```php
// tests/Feature/Api/ProfileTest.php
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

describe('Profile', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
    });

    describe('GET /api/profile', function () {
        it('returns user profile', function () {
            $this->actingAs($this->user, 'api')
                ->getJson('/api/profile')
                ->assertStatus(200)
                ->assertJsonPath('data.name', $this->user->name)
                ->assertJsonPath('data.email', $this->user->email);
        });

        it('returns 401 without auth', function () {
            $this->getJson('/api/profile')->assertStatus(401);
        });
    });

    describe('PUT /api/profile', function () {
        it('updates profile information', function () {
            $this->actingAs($this->user, 'api')
                ->putJson('/api/profile', [
                    'name' => 'Updated Name',
                    'email' => $this->user->email,
                    'bio' => 'New bio text',
                ])
                ->assertStatus(200)
                ->assertJsonPath('data.name', 'Updated Name');
        });

        it('uploads avatar', function () {
            Storage::fake('public');

            $file = UploadedFile::fake()->image('avatar.jpg');

            $this->actingAs($this->user, 'api')
                ->withFile('avatar', $file)
                ->putJson('/api/profile', ['name' => $this->user->name])
                ->assertStatus(200);

            Storage::disk('public')->assertExists('avatars/' . pathinfo($file->getClientOriginalName())->getFilename());
        });

        it('removes avatar', function () {
            Storage::fake('public');
            $this->user->update(['avatar' => 'old.jpg']);
            Storage::disk('public')->put('old.jpg', 'data');

            $this->actingAs($this->user, 'api')
                ->putJson('/api/profile', ['remove_avatar' => true])
                ->assertStatus(200);

            Storage::disk('public')->assertMissing('old.jpg');
        });
    });

    describe('PUT /api/profile/password', function () {
        it('changes password', function () {
            $this->actingAs($this->user, 'api')
                ->putJson('/api/profile/password', [
                    'current_password' => 'password',
                    'new_password' => 'newpassword123',
                    'confirm_password' => 'newpassword123',
                ])
                ->assertStatus(200);

            expect(Hash::check('newpassword123', $this->user->refresh()->password))->toBeTrue();
        });

        it('rejects wrong current password', function () {
            $this->actingAs($this->user, 'api')
                ->putJson('/api/profile/password', [
                    'current_password' => 'wrongpassword',
                    'new_password' => 'newpassword123',
                    'confirm_password' => 'newpassword123',
                ])
                ->assertStatus(422);
        });
    });

    describe('GET /api/profile/activity', function () {
        it('returns paginated activity log', function () {
            ActivityLog::factory()->count(3)->for($this->user)->create();

            $this->actingAs($this->user, 'api')
                ->getJson('/api/profile/activity')
                ->assertStatus(200)
                ->assertJsonPath('meta.total', 3);
        });
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
        "axios": "^1.7.0"
    },
    "devDependencies": {
        "typescript": "^5.9.0",
        "vue-tsc": "^3.3.0",
        "tailwindcss-primeui": "^0.6.0"
    }
}
```
