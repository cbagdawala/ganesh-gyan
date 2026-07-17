# Blueprint: Settings Page

## Overview

PrimeVue Tabs (`Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel`) with multiple tabs: Profile, Notifications, Theme, API Keys, Danger Zone. Each tab is its own component. Sanctum-protected settings routes.

---

## 1. Settings Controller

```php
// app/Http/Controllers/Api/V1/SettingsController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateProfileRequest;
use App\Http\Requests\Settings\UpdateNotificationsRequest;
use App\Http\Requests\Settings\UpdateThemeRequest;
use App\Http\Requests\Settings\RevokeApiKeyRequest;
use App\Http\Requests\Settings\DeleteAccountRequest;
use App\Http\Resources\UserResource;
use App\Models\ApiKey;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SettingsController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function profile(UpdateProfileRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('avatar')) {
            $user = $request->user();
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $data['avatar'] = $path;
        }

        if ($request->boolean('remove_avatar')) {
            $user = $request->user();
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = null;
        }

        $request->user()->update($data);

        return response()->json(new UserResource($request->user()));
    }

    public function updateNotifications(UpdateNotificationsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        Setting::updateOrCreate(
            ['user_id' => $user->id, 'key' => 'notification_settings'],
            ['value' => json_encode($data)]
        );

        return response()->json(['message' => 'Notification preferences updated.']);
    }

    public function theme(UpdateThemeRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        Setting::updateOrCreate(
            ['user_id' => $user->id, 'key' => 'theme'],
            ['value' => json_encode($data)]
        );

        return response()->json(['message' => 'Theme preferences updated.']);
    }

    public function apiKeys(Request $request): JsonResponse
    {
        $user = $request->user();

        $keys = ApiKey::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            // Never return the stored key. The column holds a SHA-256 hash of
            // the plaintext, which cannot be reversed. Only surface a
            // non-sensitive hint (prefix + last 4 chars) for identification.
            'data' => $keys->map(fn ($key) => [
                'id' => $key->id,
                'name' => $key->name,
                'masked_key' => $key->prefix . '…' . $key->last_four,
                'last_used_at' => $key->last_used_at?->toIso8601String(),
                'created_at' => $key->created_at->toIso8601String(),
                'expires_at' => $key->expires_at?->toIso8601String(),
            ]),
        ]);
    }

    public function createApiKey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'expires_at' => 'sometimes|date|after:now',
        ]);

        $user = $request->user();

        // Generate the plaintext once, store only its hash. `prefix` and
        // `last_four` are non-sensitive display hints. (Add `key`, `prefix`,
        // `last_four` columns to the api_keys table + fillable on the model.)
        $plainTextKey = 'sk_' . Str::random(48);

        $apiKey = ApiKey::create([
            'user_id' => $user->id,
            'name' => $validated['name'],
            'key' => hash('sha256', $plainTextKey),
            'prefix' => substr($plainTextKey, 0, 6),
            'last_four' => substr($plainTextKey, -4),
            'expires_at' => $validated['expires_at'] ?? now()->addYear(),
        ]);

        return response()->json([
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                // Returned exactly once, on creation. Never retrievable again.
                'key' => $plainTextKey,
                'message' => 'Save this key now. It will not be shown again.',
            ],
        ], 201);
    }

    public function revokeApiKey(RevokeApiKeyRequest $request, ApiKey $apiKey): JsonResponse
    {
        $this->authorize('revoke', $apiKey);

        $apiKey->delete();

        return response()->json(['message' => 'API key revoked.']);
    }

    public function deleteAccount(DeleteAccountRequest $request): JsonResponse
    {
        $user = $request->user();

        // Soft delete approach - or hard delete based on policy
        $user->delete();

        auth()->guard('api')->logout();

        return response()->json(['message' => 'Account deleted.']);
    }
}
```

---

## 2. Form Requests

```php
// app/Http/Requests/Settings/UpdateProfileRequest.php
namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'name' => 'required|string|max:100',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'bio' => 'sometimes|nullable|string|max:500',
            'avatar' => ['sometimes', 'nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
            'remove_avatar' => 'sometimes|boolean',
        ];
    }
}
```

```php
// app/Http/Requests/Settings/UpdateNotificationsRequest.php
namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email_notifications' => 'sometimes|boolean',
            'push_notifications' => 'sometimes|boolean',
            'comment_notifications' => 'sometimes|boolean',
            'mention_notifications' => 'sometimes|boolean',
            'marketing_emails' => 'sometimes|boolean',
        ];
    }
}
```

```php
// app/Http/Requests/Settings/UpdateThemeRequest.php
namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateThemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mode' => ['sometimes', Rule::in(['light', 'dark', 'system'])],
            'sidebar_position' => ['sometimes', Rule::in(['left', 'right'])],
            'sidebar_collapsed' => 'sometimes|boolean',
            'compact' => 'sometimes|boolean',
        ];
    }
}
```

```php
// app/Http/Requests/Settings/DeleteAccountRequest.php
namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeleteAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'current_password:api'],
            'confirm_delete' => 'required|boolean',
        ];
    }
}
```

---

## 3. Vue Settings Page

```vue
<!-- resources/js/Pages/Settings.vue -->
<template>
    <div class="settings-container">
        <h1 class="mb-4">Settings</h1>

        <Tabs v-model:value="activeTab" class="mb-4">
            <TabList>
                <Tab value="profile">Profile</Tab>
                <Tab value="notifications">Notifications</Tab>
                <Tab value="theme">Theme</Tab>
                <Tab value="api-keys">API Keys</Tab>
                <Tab value="danger" :pt="{ root: { class: '!text-red-500' } }">Danger Zone</Tab>
            </TabList>
            <TabPanels>
                <!-- Profile Tab -->
                <TabPanel value="profile">
                    <ProfileSettings />
                </TabPanel>

                <!-- Notifications Tab -->
                <TabPanel value="notifications">
                    <NotificationsSettings />
                </TabPanel>

                <!-- Theme Tab -->
                <TabPanel value="theme">
                    <ThemeSettings />
                </TabPanel>

                <!-- API Keys Tab -->
                <TabPanel value="api-keys">
                    <ApiKeySettings />
                </TabPanel>

                <!-- Danger Zone Tab -->
                <TabPanel value="danger">
                    <DangerZoneSettings />
                </TabPanel>
            </TabPanels>
        </Tabs>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import ProfileSettings from './settings/ProfileSettings.vue';
import NotificationsSettings from './settings/NotificationsSettings.vue';
import ThemeSettings from './settings/ThemeSettings.vue';
import ApiKeySettings from './settings/ApiKeySettings.vue';
import DangerZoneSettings from './settings/DangerZoneSettings.vue';
import Toast from 'primevue/toast';

const activeTab = ref('profile');
</script>

<style scoped>
.settings-container {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem;
}
</style>
```

---

## 4. Profile Settings Tab

```vue
<!-- resources/js/Pages/settings/ProfileSettings.vue -->
<template>
    <div class="profile-settings">
        <h3>Profile Information</h3>

        <form @submit.prevent="saveProfile" novalidate>
            <div class="grid mb-4">
                <div class="col-12 md:col-4 d-flex flex-column align-items-center">
                    <div class="avatar-upload">
                        <Avatar
                            :image="user?.avatar"
                            :label="getInitials(user?.name || '')"
                            size="xlarge"
                            shape="circle"
                        />
                        <Button
                            icon="pi pi-camera"
                            severity="secondary"
                            rounded
                            size="small"
                            class="mt-2"
                            @click="avatarInput?.click()"
                        />
                        <input
                            ref="avatarInput"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            style="display: none"
                            @change="onAvatarSelect"
                        />
                    </div>
                </div>

                <div class="col-12 md:col-8">
                    <div class="mb-3">
                        <FloatLabel>
                            <InputText
                                v-model="form.name"
                                :class="{ 'p-invalid': errors.name }"
                            />
                            <label for="name">Full Name *</label>
                        </FloatLabel>
                        <Message v-if="errors.name" severity="error" size="small">{{ errors.name }}</Message>
                    </div>

                    <div class="mb-3">
                        <FloatLabel>
                            <InputText
                                id="email"
                                type="email"
                                v-model="form.email"
                                :class="{ 'p-invalid': errors.email }"
                            />
                            <label for="email">Email Address *</label>
                        </FloatLabel>
                        <Message v-if="errors.email" severity="error" size="small">{{ errors.email }}</Message>
                    </div>

                    <div class="mb-3">
                        <label class="block mb-1 font-medium">Bio</label>
                        <Textarea
                            v-model="form.bio"
                            rows="3"
                            class="w-full"
                            autoResize
                        />
                    </div>
                </div>
            </div>

            <div class="d-flex justify-content-end">
                <Button
                    label="Save Changes"
                    icon="pi pi-check"
                    :loading="saving"
                    :disabled="saving"
                    @click="saveProfile"
                />
            </div>
        </form>

        <Divider />

        <!-- Password Change -->
        <h3 class="mt-4">Change Password</h3>
        <form @submit.prevent="changePassword" novalidate>
            <div class="grid">
                <div class="col-12 md:col-4">
                    <FloatLabel>
                        <Password
                            id="current_password"
                            v-model="passwordForm.current_password"
                            :feedback="false"
                            :class="{ 'p-invalid': errors.current_password }"
                            toggleMask
                            class="w-full"
                        />
                        <label for="current_password">Current Password *</label>
                    </FloatLabel>
                    <Message v-if="errors.current_password" severity="error" size="small">{{ errors.current_password }}</Message>
                </div>
                <div class="col-12 md:4">
                    <FloatLabel>
                        <Password
                            id="new_password"
                            v-model="passwordForm.new_password"
                            :feedback="true"
                            :class="{ 'p-invalid': errors.new_password }"
                            toggleMask
                            class="w-full"
                        />
                        <label for="new_password">New Password *</label>
                    </FloatLabel>
                    <Message v-if="errors.new_password" severity="error" size="small">{{ errors.new_password }}</Message>
                </div>
                <div class="col-12 md:4">
                    <FloatLabel>
                        <Password
                            id="confirm_password"
                            v-model="passwordForm.confirm_password"
                            :feedback="false"
                            :class="{ 'p-invalid': errors.confirm_password }"
                            toggleMask
                            class="w-full"
                        />
                        <label for="confirm_password">Confirm Password *</label>
                    </FloatLabel>
                    <Message v-if="errors.confirm_password" severity="error" size="small">{{ errors.confirm_password }}</Message>
                </div>
            </div>

            <div class="d-flex justify-content-end mt-3">
                <Button
                    label="Update Password"
                    icon="pi pi-lock"
                    :loading="changingPassword"
                    :disabled="changingPassword"
                    severity="warn"
                    @click="changePassword"
                />
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Password from 'primevue/password';
import FloatLabel from 'primevue/floatlabel';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import { useToast } from 'primevue/usetoast';

interface UserData {
    id: number;
    name: string;
    email: string;
    bio: string | null;
    avatar: string | null;
}

const toast = useToast();
const avatarInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const changingPassword = ref(false);
const errors = ref<Record<string, string>>({});

const authStore = useAuthStore();
const user = computed(() => authStore.user as UserData | null);

const form = reactive({
    name: '',
    email: '',
    bio: '',
    avatarFile: null as File | null,
});

const passwordForm = reactive({
    current_password: '',
    new_password: '',
    confirm_password: '',
});

const onAvatarSelect = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
        form.avatarFile = input.files[0];
    }
};

const saveProfile = async () => {
    saving.value = true;
    errors.value = {};

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('bio', form.bio || '');

    if (form.avatarFile) {
        formData.append('avatar', form.avatarFile);
    }

    try {
        await axios.put('/api/settings/profile', formData);
        toast.add({ severity: 'success', detail: 'Profile updated.', life: 3000 });
    } catch (error: any) {
        if (error.response?.status === 422) {
            errors.value = error.response.data.errors;
        }
    } finally {
        saving.value = false;
    }
};

const changePassword = async () => {
    changingPassword.value = true;
    errors.value = {};

    if (passwordForm.new_password !== passwordForm.confirm_password) {
        errors.value.confirm_password = 'Passwords do not match.';
        changingPassword.value = false;
        return;
    }

    try {
        await axios.put('/api/settings/password', passwordForm);
        toast.add({ severity: 'success', detail: 'Password changed.', life: 3000 });
        passwordForm.current_password = '';
        passwordForm.new_password = '';
        passwordForm.confirm_password = '';
    } catch (error: any) {
        if (error.response?.status === 422) {
            errors.value = error.response.data.errors;
        } else {
            toast.add({ severity: 'error', detail: 'Failed to change password.', life: 5000 });
        }
    } finally {
        changingPassword.value = false;
    }
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Populate form on mount
onMounted(() => {
    if (user.value) {
        form.name = user.value.name;
        form.email = user.value.email;
        form.bio = user.value.bio || '';
    }
});
</script>

<style scoped>
.avatar-upload {
    position: relative;
}
</style>
```

---

## 5. Danger Zone Tab

```vue
<!-- resources/js/Pages/settings/DangerZoneSettings.vue -->
<template>
    <div class="danger-zone">
        <h3 class="text-red-500">Danger Zone</h3>

        <div class="alert alert-warning mb-4">
            <i class="pi pi-exclamation-triangle" />
            The actions below are irreversible. Please proceed with caution.
        </div>

        <!-- Delete Account -->
        <Card>
            <template #header>
                <div class="d-flex justify-content-between align-items-center">
                    <span>Delete Account</span>
                    <Tag value="Permanent" severity="danger" />
                </div>
            </template>
            <template #content>
                <p>
                    Once you delete your account, there is no going back. All your data,
                    including articles, comments, and API keys will be permanently removed.
                </p>
                <Button
                    label="Delete My Account"
                    severity="danger"
                    @click="showDeleteDialog = true"
                />
            </template>
        </Card>

        <!-- Delete Confirmation -->
        <Dialog
            v-model:visible="showDeleteDialog"
            modal
            header="Confirm Account Deletion"
            :style="{ width: '30rem' }"
        >
            <p>This action is permanent and cannot be undone.</p>

            <div class="mb-3">
                <FloatLabel>
                    <Password
                        v-model="deletePassword"
                        :feedback="false"
                        toggleMask
                        class="w-full"
                    />
                    <label>Enter your password to confirm</label>
                </FloatLabel>
            </div>

            <div class="d-flex justify-content-end gap-2">
                <Button label="Cancel" @click="showDeleteDialog = false" />
                <Button
                    label="Delete Account"
                    severity="danger"
                    :loading="deleting"
                    @click="confirmDelete"
                />
            </div>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Password from 'primevue/password';
import FloatLabel from 'primevue/floatlabel';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const showDeleteDialog = ref(false);
const deletePassword = ref('');
const deleting = ref(false);

const confirmDelete = async () => {
    deleting.value = true;

    try {
        await axios.delete('/api/settings/account', {
            data: { password: deletePassword.value, confirm_delete: true },
        });
        toast.add({ severity: 'success', detail: 'Account deleted.', life: 5000 });
        // Account (and session) are gone — do a full-page redirect to reset app state.
        window.location.assign('/login');
    } catch (error: any) {
        toast.add({
            severity: 'error',
            detail: error.response?.data?.errors?.password?.[0] || 'Delete failed.',
            life: 5000,
        });
        showDeleteDialog.value = false;
    } finally {
        deleting.value = false;
    }
};
</script>
```

---

## 6. Routes

```php
// routes/web.php
Route::middleware('auth:sanctum')->prefix('settings')->group(function () {
    Route::put('/profile', [SettingsController::class, 'profile'])->name('settings.profile');
    Route::put('/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications');
    Route::put('/theme', [SettingsController::class, 'theme'])->name('settings.theme');
    Route::put('/password', [SettingsController::class, 'updatePassword'])->name('settings.password');

    Route::get('/api-keys', [SettingsController::class, 'apiKeys'])->name('settings.api-keys');
    Route::post('/api-keys', [SettingsController::class, 'createApiKey'])->name('settings.api-keys.create');
    Route::delete('/api-keys/{apiKey}', [SettingsController::class, 'revokeApiKey'])->name('settings.api-keys.revoke');

    Route::delete('/account', [SettingsController::class, 'deleteAccount'])->name('settings.account.delete');
});
```

---

## 7. Pest Tests

```php
// tests/Feature/Api/SettingsTest.php
use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

describe('Settings', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
    });

    describe('PUT /api/settings/profile', function () {
        it('updates profile', function () {
            $this->actingAs($this->user, 'api')
                ->putJson('/api/settings/profile', [
                    'name' => 'Updated Name',
                    'email' => $this->user->email,
                    'bio' => 'New bio',
                ])
                ->assertStatus(200)
                ->assertJsonPath('data.name', 'Updated Name');
        });

        it('rejects duplicate email', function () {
            $other = User::factory()->create(['email' => 'other@example.com']);

            $this->actingAs($this->user, 'api')
                ->putJson('/api/settings/profile', [
                    'name' => 'Name',
                    'email' => $other->email,
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('email');
        });

        it('uploads avatar', function () {
            Storage::fake('public');

            $file = UploadedFile::fake()->image('avatar.jpg');

            $this->actingAs($this->user, 'api')
                ->withFile('avatar', $file)
                ->putJson('/api/settings/profile', [
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ])
                ->assertStatus(200);

            Storage::disk('public')->assertExists('avatars/' . pathinfo($file->getClientOriginalName())->getFilename());
        });

        it('removes avatar when requested', function () {
            Storage::fake('public');

            $this->user->update(['avatar' => 'old-avatar.jpg']);
            Storage::disk('public')->put('old-avatar.jpg', 'data');

            $this->actingAs($this->user, 'api')
                ->putJson('/api/settings/profile', [
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'remove_avatar' => true,
                ])
                ->assertStatus(200);

            Storage::disk('public')->assertMissing('old-avatar.jpg');
        });
    });

    describe('PUT /api/settings/password', function () {
        it('changes password', function () {
            $this->actingAs($this->user, 'api')
                ->putJson('/api/settings/password', [
                    'current_password' => 'password',
                    'new_password' => 'newpassword123',
                    'new_password_confirmation' => 'newpassword123',
                ])
                ->assertStatus(200);

            expect(Hash::check('newpassword123', $this->user->refresh()->password))->toBeTrue();
        });

        it('rejects wrong current password', function () {
            $this->actingAs($this->user, 'api')
                ->putJson('/api/settings/password', [
                    'current_password' => 'wrongpassword',
                    'new_password' => 'newpassword123',
                    'new_password_confirmation' => 'newpassword123',
                ])
                ->assertStatus(422);
        });
    });

    describe('GET/POST /api/settings/api-keys', function () {
        it('lists api keys', function () {
            ApiKey::factory()->create(['user_id' => $this->user->id]);

            $this->actingAs($this->user, 'api')
                ->getJson('/api/settings/api-keys')
                ->assertStatus(200)
                ->assertJsonCount(1, 'data');
        });

        it('creates api key', function () {
            $response = $this->actingAs($this->user, 'api')
                ->postJson('/api/settings/api-keys', [
                    'name' => 'CI Key',
                ]);

            $response->assertStatus(201)
                ->assertJsonPath('data.name', 'CI Key');

            expect(ApiKey::where('user_id', $this->user->id)->first())
                ->key->length->toBe(64); // stored value is a SHA-256 hex hash
        });

        it('revokes api key', function () {
            $key = ApiKey::factory()->create(['user_id' => $this->user->id]);

            $this->actingAs($this->user, 'api')
                ->deleteJson("/api/settings/api-keys/{$key->id}")
                ->assertStatus(200);

            expect(ApiKey::find($key->id))->toBeNull();
        });
    });

    describe('DELETE /api/settings/account', function () {
        it('deletes account with correct password', function () {
            $this->actingAs($this->user, 'api')
                ->deleteJson('/api/settings/account', [
                    'password' => 'password',
                    'confirm_delete' => true,
                ])
                ->assertStatus(200);

            expect(User::find($this->user->id))->toBeNull();
        });

        it('rejects with wrong password', function () {
            $this->actingAs($this->user, 'api')
                ->deleteJson('/api/settings/account', [
                    'password' => 'wrongpassword',
                    'confirm_delete' => true,
                ])
                ->assertStatus(422);
        });
    });
});
```

---

## 8. Vue Dependencies

```json
{
    "dependencies": {
        "primevue": "^4.2.0",
        "@primevue/themes": "^4.2.0",
        "vue": "^3.5.0",
        "pinia": "^2.2.0",
        "axios": "^1.7.0"
    }
}
```
