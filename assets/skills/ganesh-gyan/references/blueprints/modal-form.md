# Blueprint: Modal Form

## Overview

PrimeVue Dialog wrapping a form. State management, per-step validation, close/submit behavior with overlay backdrop click handling. Reusable modal form component pattern.

---

## 1. Reusable Modal Form Component

```vue
<!-- resources/js/Components/ModalForm.vue -->
<template>
    <Dialog
        :visible="open"
        :modal="true"
        :closable="closable"
        :draggable="false"
        :style="{ width: style ?? '50vw', maxWidth: '90vw' }"
        :pt="{
            root: { class: 'modal-form-dialog' },
            header: { class: 'd-flex justify-content-between align-items-center' },
            content: { class: 'p-0' },
            footer: { class: 'd-flex justify-content-between align-items-center gap-2' },
        }"
        @hide="handleClose"
    >
        <template #header>
            <div class="flex align-items-center gap-2">
                <component v-if="icon" :is="icon" class="text-primary" />
                <h3 class="m-0">{{ title }}</h3>
            </div>
            <Button
                icon="pi pi-times"
                text
                rounded
                severity="secondary"
                @click="handleClose"
                aria-label="Close"
            />
        </template>

        <div class="modal-body">
            <!-- Loading state -->
            <div v-if="loading" class="d-flex justify-content-center py-5">
                <ProgressSpinner />
            </div>

            <!-- Validation errors summary -->
            <div
                v-if="Object.keys(serverErrors).length > 0"
                class="alert alert-danger m-3"
            >
                <ul class="mb-0">
                    <li v-for="(errors, field) in serverErrors" :key="field">
                        {{ errors[0] }}
                    </li>
                </ul>
            </div>

            <!-- Form content slot -->
            <slot :form-state="formState" :errors="serverErrors" />
        </div>

        <template #footer>
            <Button
                label="Cancel"
                severity="secondary"
                outlined
                :disabled="submitting"
                @click="handleClose"
            />
            <Button
                :label="submitLabel"
                icon="pi pi-check"
                :loading="submitting"
                :disabled="submitting || !isFormValid"
                @click="handleSubmit"
            />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';

interface Props {
    modelValue: boolean;
    title: string;
    submitLabel?: string;
    style?: string;
    closable?: boolean;
    icon?: string;
    initialFormState: Record<string, any>;
    isFormValid?: boolean;
}

interface SubmitHelpers {
    setErrors: (errors: Record<string, string[]>) => void;
    close: () => void;
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void;
    (e: 'submit', data: Record<string, any>, helpers: SubmitHelpers): void;
    (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
    submitLabel: 'Submit',
    closable: true,
    isFormValid: () => true,
});

const emit = defineEmits<Emits>();

const loading = ref(false);
const submitting = ref(false);
const serverErrors = ref<Record<string, string[]>>({});

// Bind directly to the parent-owned reactive object passed via
// `initialFormState`. The inputs in the slot mutate this same object, so the
// parent's `isFormValid` computed stays in sync with what the user types
// (rather than being evaluated against a static snapshot).
const formState = computed(() => props.initialFormState);

// Reset transient UI state when the dialog opens. The parent is responsible
// for resetting the form object's own fields.
watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue) {
            serverErrors.value = {};
            loading.value = false;
            submitting.value = false;
        }
    }
);

const handleClose = () => {
    emit('update:modelValue', false);
    emit('cancel');
};

const handleSubmit = async () => {
    if (!props.isFormValid) return;

    submitting.value = true;
    serverErrors.value = {};

    // NOTE: `emit()` returns void — it does not return the parent listener's
    // promise, so `await emit(...)` resolves immediately and this try/catch
    // CANNOT catch errors thrown inside the parent's @submit handler. For the
    // parent to surface validation errors back into this dialog, expose a
    // helper via the payload (e.g. `emit('submit', data, { setErrors })`) or
    // pass an async `onSubmit` prop that ModalForm can actually await.
    try {
        emit('submit', { ...formState.value }, {
            setErrors: (errors: Record<string, string[]>) => {
                serverErrors.value = errors;
            },
            close: () => handleClose(),
        });
    } catch (error: any) {
        if (error.response?.status === 422) {
            serverErrors.value = error.response.data.errors;
        } else {
            serverErrors.value = { general: ['An unexpected error occurred.'] };
        }
    } finally {
        submitting.value = false;
    }
};
</script>
```

---

## 2. Concrete Modal Form Usage — Team Member

```vue
<!-- resources/js/Pages/Teams/Members/CreateModal.vue -->
<template>
    <ModalForm
        v-model="isOpen"
        title="Add Team Member"
        submit-label="Add Member"
        :initial-form-state="form"
        :is-form-valid="isFormValid"
        @submit="handleSubmit"
        @cancel="handleCancel"
    >
        <template #default="{ formState: state, errors }">
            <div class="p-3">
                <div class="grid">
                    <div class="col-12 md:col-6">
                        <FloatLabel>
                            <InputText
                                id="first_name"
                                v-model="state.first_name"
                                :class="{ 'p-invalid': errors?.first_name }"
                            />
                            <label for="first_name">First Name *</label>
                        </FloatLabel>
                    </div>

                    <div class="col-12 md:col-6">
                        <FloatLabel>
                            <InputText
                                id="last_name"
                                v-model="state.last_name"
                                :class="{ 'p-invalid': errors?.last_name }"
                            />
                            <label for="last_name">Last Name *</label>
                        </FloatLabel>
                    </div>

                    <div class="col-12">
                        <FloatLabel>
                            <InputText
                                id="email"
                                type="email"
                                v-model="state.email"
                                :class="{ 'p-invalid': errors?.email }"
                            />
                            <label for="email">Email *</label>
                        </FloatLabel>
                    </div>

                    <div class="col-12 md:col-6">
                        <FloatLabel>
                            <InputText
                                id="phone"
                                v-model="state.phone"
                                :class="{ 'p-invalid': errors?.phone }"
                            />
                            <label for="phone">Phone</label>
                        </FloatLabel>
                    </div>

                    <div class="col-12 md:col-6">
                        <FloatLabel>
                            <Select
                                id="role_id"
                                v-model="state.role_id"
                                :options="roles"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Select Role"
                                :class="{ 'p-invalid': errors?.role_id }"
                                :pt="{ root: { class: 'w-full' } }"
                            />
                            <label for="role_id">Role *</label>
                        </FloatLabel>
                    </div>

                    <div class="col-12">
                        <label class="block mb-1 font-medium">Notes</label>
                        <Textarea
                            v-model="state.notes"
                            rows="3"
                            :class="{ 'p-invalid': errors?.notes }"
                            autoResize
                            class="w-full"
                        />
                    </div>
                </div>
            </div>
        </template>
    </ModalForm>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import ModalForm from '@/Components/ModalForm.vue';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import FloatLabel from 'primevue/floatlabel';
import Textarea from 'primevue/textarea';

const isOpen = defineModel<boolean>({ default: false });

interface TeamMemberFormState {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role_id: number | null;
    notes: string;
}

const roles = ref<{ id: number; name: string }[]>([]);

// Reactive form object shared with ModalForm — the slot inputs mutate this
// same object, so `isFormValid` below recomputes as the user types.
const form = reactive<TeamMemberFormState>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_id: null,
    notes: '',
});

const isFormValid = computed(() => {
    return (
        form.first_name.trim() !== '' &&
        form.last_name.trim() !== '' &&
        form.email.trim() !== '' &&
        form.role_id !== null
    );
});

const handleSubmit = async (
    data: Record<string, any>,
    { setErrors, close }: {
        setErrors: (errors: Record<string, string[]>) => void;
        close: () => void;
    }
) => {
    // Errors are handled here (not inside ModalForm) because `await emit(...)`
    // in the child cannot catch errors thrown in this handler.
    try {
        await axios.post('/api/teams/members', data);
        // Trigger refresh of team member list via event bus or parent prop
        window.dispatchEvent(new CustomEvent('team-member-created'));
        close();
    } catch (error: any) {
        if (error.response?.status === 422) {
            setErrors(error.response.data.errors);
        } else {
            setErrors({ general: ['An unexpected error occurred.'] });
        }
    }
};

const handleCancel = () => {
    // cleanup, analytics tracking, etc.
};

// Load roles on mount
onMounted(async () => {
    try {
        const { data } = await axios.get('/api/roles');
        roles.value = data.data;
    } catch {
        // roles not critical for modal
    }
});
</script>
```

---

## 3. Controller

```php
// app/Http/Controllers/Api/V1/TeamMemberController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\TeamMember\StoreRequest;
use App\Http\Resources\TeamMemberResource;
use App\Models\TeamMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller as BaseController;

class TeamMemberController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function store(StoreRequest $request): JsonResponse
    {
        $data = $request->validated();

        $member = TeamMember::create($data);

        // Optionally send invitation email
        // SendTeamMemberInvitation::dispatch($member);

        return response()->json(
            new TeamMemberResource($member),
            \Illuminate\Http\Response::HTTP_CREATED
        );
    }
}
```

---

## 4. Form Request

```php
// app/Http/Requests/TeamMember/StoreRequest.php
namespace App\Http\Requests\TeamMember;

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
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:team_members,email',
            'phone' => 'sometimes|nullable|string|max:20',
            'role_id' => 'required|integer|exists:roles,id',
            'notes' => 'sometimes|nullable|string|max:2000',
        ];
    }
}
```

---

## 5. Opening Modal from Parent Page

```vue
<!-- resources/js/Pages/Teams/Show.vue -->
<template>
    <div>
        <h1>{{ team.name }}</h1>

        <!-- Trigger button -->
        <Button
            label="Add Member"
            icon="pi pi-plus"
            class="mb-4"
            @click="openCreateModal"
        />

        <!-- Team members table -->
        <DataTable :value="members" :loading="loading" stripedRows>
            <Column field="first_name" header="First Name" />
            <Column field="last_name" header="Last Name" />
            <Column field="email" header="Email" />
            <Column field="role.name" header="Role" />
            <Column header="Actions">
                <template #body="{ data }">
                    <Button icon="pi pi-trash" severity="danger" text @click="removeMember(data)" />
                </template>
            </Column>
        </DataTable>

        <!-- Modal -->
        <CreateMemberModal v-model="createModalOpen" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import CreateMemberModal from './Members/CreateModal.vue';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

interface Team {
    id: number;
    name: string;
}

interface Member {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: { name: string };
}

const props = defineProps<{ team: Team }>();
const team = props.team;
const members = ref<Member[]>([]);
const loading = ref(false);
const createModalOpen = ref(false);

const openCreateModal = () => {
    createModalOpen.value = true;
};

const handleMemberCreated = () => {
    loadMembers();
};

const loadMembers = async () => {
    loading.value = true;
    try {
        const { data } = await axios.get(`/api/teams/${team.id}/members`);
        members.value = data.data;
    } finally {
        loading.value = false;
    }
};

const removeMember = async (member: Member) => {
    if (!confirm(`Remove ${member.first_name} ${member.last_name}?`)) return;
    await axios.delete(`/api/teams/${team.id}/members/${member.id}`);
    loadMembers();
};

onMounted(() => {
    loadMembers();
    window.addEventListener('team-member-created', handleMemberCreated);
});

onUnmounted(() => {
    window.removeEventListener('team-member-created', handleMemberCreated);
});
</script>
```

---

## 6. Pest Tests

```php
// tests/Feature/Api/TeamMemberModalTest.php
use App\Models\Role;
use App\Models\TeamMember;

describe('Team Member Modal Form (POST /api/teams/members)', function () {
    beforeEach(function () {
        $this->user = \App\Models\User::factory()->create();
        $this->role = Role::factory()->create();
    });

    it('creates a team member', function () {
        $data = [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'role_id' => $this->role->id,
        ];

        $this->actingAs($this->user, 'api')
            ->postJson('/api/teams/members', $data)
            ->assertStatus(201)
            ->assertJsonPath('data.first_name', 'John')
            ->assertJsonPath('data.email', 'john@example.com');

        $this->assertDatabaseHas('team_members', [
            'email' => 'john@example.com',
        ]);
    });

    it('validates required fields', function () {
        $this->actingAs($this->user, 'api')
            ->postJson('/api/teams/members', [
                'email' => 'john@example.com',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['first_name', 'last_name', 'role_id']);
    });

    it('rejects duplicate email', function () {
        TeamMember::factory()->create(['email' => 'john@example.com']);

        $this->actingAs($this->user, 'api')
            ->postJson('/api/teams/members', [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john@example.com',
                'role_id' => $this->role->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    });

    it('returns 401 without auth', function () {
        $this->postJson('/api/teams/members', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'role_id' => $this->role->id,
        ])->assertStatus(401);
    });
});
```

---

## 7. Vue Dependencies

```json
{
    "dependencies": {
        "primevue": "^4.2.0",
        "@primevue/themes": "^4.2.0",
        "vue": "^3.5.0",
        "axios": "^1.7.0"
    }
}
```
