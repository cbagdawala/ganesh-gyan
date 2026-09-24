# Blueprint: Multi-Step Wizard

## Overview

Multi-step form with PrimeVue Stepper, per-step validation, data persistence (localStorage + server draft), and a review step before final submission.

---

## 1. Migration

```php
// database/migrations/2024_01_01_000000_create_offers_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->integer('term_months')->default(12);
            $table->decimal('interest_rate', 5, 2)->default(0);
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'expired'])->default('draft');
            $table->integer('wizard_step')->default(0);
            $table->json('wizard_data')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
```

---

## 2. Controller

```php
// app/Http/Controllers/Api/V1/OfferWizardController.php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OfferResource;
use App\Models\Offer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Validator;

class OfferWizardController extends BaseController
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function getDraft(Request $request): JsonResponse
    {
        $draft = Offer::where('user_id', $request->user()->id)
            ->where('status', 'draft')
            ->first();

        if (!$draft) {
            $draft = Offer::create([
                'user_id' => $request->user()->id,
                'status' => 'draft',
                'wizard_step' => 0,
                'wizard_data' => '{}',
            ]);
        }

        return response()->json(new OfferResource($draft));
    }

    public function saveStep(Request $request): JsonResponse
    {
        // The /offers/wizard/save route declares no {offer} parameter, so there
        // is nothing to route-model bind. Operate on the authenticated user's
        // current draft (created by getDraft()).
        $offer = Offer::where('user_id', $request->user()->id)
            ->where('status', 'draft')
            ->firstOrFail();

        $this->authorize('update', $offer);

        $validated = $request->validate([
            'wizard_step' => 'required|integer|min:0|max:4',
            'wizard_data' => 'required|array',
        ]);

        $currentData = json_decode($offer->wizard_data ?? '{}', true) ?: [];
        $currentData[$validated['wizard_step']] = $validated['wizard_data'];

        $offer->update([
            'wizard_step' => $validated['wizard_step'],
            'wizard_data' => json_encode($currentData),
        ]);

        return response()->json(new OfferResource($offer));
    }

    public function finalize(Request $request): JsonResponse
    {
        // Same as saveStep(): no {offer} route parameter — resolve the user's
        // current draft rather than route-model binding.
        $offer = Offer::where('user_id', $request->user()->id)
            ->where('status', 'draft')
            ->firstOrFail();

        $this->authorize('update', $offer);

        $wizardData = json_decode($offer->wizard_data ?? '{}', true) ?: [];

        foreach ($wizardData as $step => $data) {
            $rules = $this->stepRules((int) $step);
            $errors = Validator::make($data, $rules)->errors();

            if ($errors->count() > 0) {
                return response()->json([
                    'errors' => $errors->toArray(),
                    'step' => $step,
                ], 422);
            }
        }

        $offer->update([
            'name' => $wizardData[0]['name'] ?? 'Untitled Offer',
            'description' => $wizardData[1]['description'] ?? null,
            'amount' => $wizardData[2]['amount'] ?? 0,
            'currency' => $wizardData[2]['currency'] ?? 'USD',
            'term_months' => $wizardData[2]['term_months'] ?? 12,
            'interest_rate' => $wizardData[2]['interest_rate'] ?? 0,
            'status' => 'pending',
            'wizard_step' => 4,
            'wizard_data' => json_encode($wizardData),
        ]);

        // Dispatch notification / workflow
        // NotifyTeam::dispatch($offer);

        return response()->json(new OfferResource($offer));
    }

    private function stepRules(int $step): array
    {
        return match ($step) {
            0 => [
                'name' => 'required|string|max:255',
                'client_id' => 'required|integer|exists:clients,id',
            ],
            1 => [
                'description' => 'sometimes|string|max:5000',
                'documents' => 'sometimes|array',
                'documents.*' => 'string',
            ],
            2 => [
                'amount' => 'required|numeric|min:1',
                'currency' => 'required|string|size:3',
                'term_months' => 'required|integer|min:1|max:360',
                'interest_rate' => 'sometimes|numeric|min:0|max:100',
            ],
            3 => [
                'terms' => 'required|array',
                'terms.payment_due_days' => 'required|integer|min:1|max:90',
                'terms.late_fee' => 'required|numeric|min:0',
                'terms.auto_renew' => 'sometimes|boolean',
            ],
            4 => [], // review step, no validation needed
        };
    }
}
```

---

## 3. Model

```php
// app/Models/Offer.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Offer extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'name', 'description', 'amount', 'currency',
        'term_months', 'interest_rate', 'status', 'wizard_step', 'wizard_data',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'wizard_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

---

## 4. Wizard Vue Page

```vue
<!-- resources/js/Pages/Offer/Wizard.vue -->
<template>
    <div class="wizard-container">
        <!-- PrimeVue 4 Stepper "steps only" pattern: the StepList renders the
             progress indicator, while the step content/navigation below is
             driven by `activeStep`. Step `value`s are strings in v4. -->
        <Stepper :value="String(activeStep)" class="mb-6">
            <StepList>
                <Step
                    v-for="(step, index) in steps"
                    :key="step.label"
                    :value="String(index)"
                >
                    {{ step.label }}
                </Step>
            </StepList>
        </Stepper>

        <Card class="wizard-card">
            <template #content>
                <!-- Step 1: Basic Info -->
                <div v-show="activeStep === 0" class="wizard-step-content">
                    <h3>Basic Information</h3>
                    <div class="grid">
                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <InputText
                                    id="name"
                                    v-model="form.name"
                                    :class="{ 'p-invalid': errors.name }"
                                    required
                                />
                                <label for="name">Offer Name *</label>
                            </FloatLabel>
                            <Message v-if="errors.name" severity="error" size="small">{{ errors.name }}</Message>
                        </div>
                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <Select
                                    id="client_id"
                                    v-model="form.client_id"
                                    :options="clients"
                                    optionLabel="name"
                                    optionValue="id"
                                    placeholder="Select Client"
                                    :class="{ 'p-invalid': errors.client_id }"
                                    filter
                                    :pt="{ root: { class: 'w-full' } }"
                                />
                                <label for="client_id">Client *</label>
                            </FloatLabel>
                            <Message v-if="errors.client_id" severity="error" size="small">{{ errors.client_id }}</Message>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Description & Documents -->
                <div v-show="activeStep === 1" class="wizard-step-content">
                    <h3>Description & Documents</h3>
                    <div class="mb-4">
                        <label class="block mb-1 font-medium">Description</label>
                        <Textarea v-model="form.description" rows="5" class="w-full" autoResize />
                    </div>
                    <div>
                        <label class="block mb-1 font-medium">Attached Documents</label>
                        <FileUpload
                            mode="basic"
                            accept="application/pdf,image/*"
                            :maxFileSize="10000000"
                            :auto="false"
                            chooseLabel="Choose Files"
                            @select="onFileSelect"
                        />
                        <div v-if="form.documents.length" class="mt-2">
                            <Tag
                                v-for="(doc, i) in form.documents"
                                :key="i"
                                :value="doc.name"
                                severity="info"
                                class="mr-1"
                            />
                        </div>
                    </div>
                </div>

                <!-- Step 3: Financial Details -->
                <div v-show="activeStep === 2" class="wizard-step-content">
                    <h3>Financial Details</h3>
                    <div class="grid">
                        <div class="col-12 md:col-4">
                            <FloatLabel>
                                <InputNumber
                                    v-model="form.amount"
                                    mode="currency"
                                    currency="USD"
                                    locale="en-US"
                                    :class="{ 'p-invalid': errors.amount }"
                                />
                                <label>Amount</label>
                            </FloatLabel>
                            <Message v-if="errors.amount" severity="error" size="small">{{ errors.amount }}</Message>
                        </div>
                        <div class="col-12 md:col-4">
                            <FloatLabel>
                                <Select
                                    v-model="form.currency"
                                    :options="currencies"
                                    optionLabel="code"
                                    optionValue="code"
                                    :class="{ 'p-invalid': errors.currency }"
                                />
                                <label>Currency</label>
                            </FloatLabel>
                        </div>
                        <div class="col-12 md:col-4">
                            <FloatLabel>
                                <InputNumber
                                    v-model="form.term_months"
                                    :min="1"
                                    :max="360"
                                    :class="{ 'p-invalid': errors.term_months }"
                                />
                                <label>Term (months)</label>
                            </FloatLabel>
                            <Message v-if="errors.term_months" severity="error" size="small">{{ errors.term_months }}</Message>
                        </div>
                        <div class="col-12 md:col-6">
                            <FloatLabel>
                                <InputNumber
                                    v-model="form.interest_rate"
                                    :min="0"
                                    :max="100"
                                    :step="0.1"
                                />
                                <label>Interest Rate (%)</label>
                            </FloatLabel>
                        </div>
                    </div>
                </div>

                <!-- Step 4: Review -->
                <div v-show="activeStep === 3" class="wizard-step-content">
                    <h3>Review & Confirm</h3>
                    <div class="review-summary">
                        <div class="grid">
                            <div class="col-6">
                                <label class="text-muted">Offer Name</label>
                                <p class="font-bold">{{ form.name }}</p>
                            </div>
                            <div class="col-6">
                                <label class="text-muted">Client</label>
                                <p class="font-bold">{{ selectedClientName }}</p>
                            </div>
                            <div class="col-6">
                                <label class="text-muted">Amount</label>
                                <p class="font-bold text-success">${{ formatCurrency(form.amount) }}</p>
                            </div>
                            <div class="col-6">
                                <label class="text-muted">Term</label>
                                <p class="font-bold">{{ form.term_months }} months</p>
                            </div>
                            <div class="col-12">
                                <label class="text-muted">Description</label>
                                <p>{{ form.description || 'No description provided.' }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="d-flex justify-content-between mt-4">
                    <Button
                        v-if="activeStep > 0"
                        label="Previous"
                        severity="secondary"
                        @click="prevStep"
                    />
                    <div v-else />
                    <Button
                        v-if="activeStep < steps.length - 1"
                        label="Next"
                        icon="pi pi-arrow-right"
                        :disabled="activeStep === 2 && !isStep2Valid"
                        @click="nextStep"
                    />
                    <Button
                        v-else
                        label="Submit Offer"
                        icon="pi pi-check"
                        :loading="submitting"
                        :disabled="submitting"
                        severity="success"
                        @click="submitWizard"
                    />
                </div>
            </template>
        </Card>

        <Toast />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import Step from 'primevue/step';
import Card from 'primevue/card';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import FloatLabel from 'primevue/floatlabel';
import Message from 'primevue/message';
import FileUpload from 'primevue/fileupload';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

interface FormData {
    name: string;
    client_id: number | null;
    description: string;
    documents: File[];
    amount: number | null;
    currency: string;
    term_months: number;
    interest_rate: number;
}

const toast = useToast();
const activeStep = ref(0);
const submitting = ref(false);
const errors = ref<Record<string, string>>({});

const form = ref<FormData>({
    name: '',
    client_id: null,
    description: '',
    documents: [],
    amount: null,
    currency: 'USD',
    term_months: 12,
    interest_rate: 0,
});

const clients = ref<{ id: number; name: string }[]>([]);
const currencies = ref([
    { code: 'USD', label: 'USD - US Dollar' },
    { code: 'EUR', label: 'EUR - Euro' },
    { code: 'GBP', label: 'GBP - British Pound' },
    { code: 'JPY', label: 'JPY - Japanese Yen' },
]);

const selectedClientName = computed(() => {
    const client = clients.value.find((c) => c.id === form.value.client_id);
    return client?.name || '';
});

const isStep2Valid = computed(() => {
    return form.value.amount !== null && form.value.amount > 0;
});

const steps = computed(() => [
    { label: 'Basic Info', icon: 'pi pi-info-circle', active: true, completed: false },
    { label: 'Details', icon: 'pi pi-file-edit', active: false, completed: false },
    { label: 'Financial', icon: 'pi pi-dollar', active: false, completed: false },
    { label: 'Review', icon: 'pi pi-check-circle', active: false, completed: false },
]);

const onFileSelect = (event: { files: { [key: string]: File[] } }) => {
    form.value.documents.push(...(event.files.documents || []));
};

const nextStep = async () => {
    if (activeStep.value === 0) {
        const stepErrors: Record<string, string> = {};
        if (!form.value.name.trim()) stepErrors.name = 'Name is required.';
        if (!form.value.client_id) stepErrors.client_id = 'Client is required.';

        if (Object.keys(stepErrors).length > 0) {
            errors.value = stepErrors;
            return;
        }
        errors.value = {};
    }

    if (activeStep.value === 2 && !isStep2Valid.value) return;

    // Save step data to server
    await saveCurrentStep();

    const next = activeStep.value + 1;
    updateSteps(next);
    activeStep.value = next;
};

const prevStep = async () => {
    if (activeStep.value <= 0) return;

    await saveCurrentStep();

    const prev = activeStep.value - 1;
    updateSteps(prev);
    activeStep.value = prev;
};

const saveCurrentStep = async () => {
    try {
        const stepData = getStepData(activeStep.value);
        await axios.post(`/api/offers/wizard/save`, {
            wizard_step: activeStep.value,
            wizard_data: stepData,
        });
    } catch {
        // non-critical
    }
};

const getStepData = (step: number): any => {
    switch (step) {
        case 0: return { name: form.value.name, client_id: form.value.client_id };
        case 1: return { description: form.value.description, documents: form.value.documents };
        case 2: return { amount: form.value.amount, currency: form.value.currency, term_months: form.value.term_months, interest_rate: form.value.interest_rate };
        case 3: return { name: form.value.name, client_id: form.value.client_id, description: form.value.description, amount: form.value.amount, currency: form.value.currency, term_months: form.value.term_months, interest_rate: form.value.interest_rate };
        default: return {};
    }
};

const updateSteps = (step: number) => {
    steps.value.forEach((s, i) => {
        s.active = i === step;
        s.completed = i < step;
    });
};

const submitWizard = async () => {
    submitting.value = true;
    errors.value = {};

    try {
        const stepData = getStepData(activeStep.value);
        await axios.post(`/api/offers/wizard/save`, {
            wizard_step: activeStep.value,
            wizard_data: stepData,
        });

        const { data } = await axios.post(`/api/offers/wizard/finalize`);

        toast.add({
            severity: 'success',
            summary: 'Offer Submitted',
            detail: `Offer "${data.data.name}" has been submitted.`,
            life: 5000,
        });

        window.location.href = `/offers/${data.data.id}`;
    } catch (error: any) {
        if (error.response?.status === 422) {
            const body = error.response.data;
            errors.value = body.errors;
            activeStep.value = body.step ?? 0;
            toast.add({ severity: 'error', detail: `Step ${body.step + 1} has validation errors.`, life: 5000 });
        } else {
            toast.add({ severity: 'error', detail: 'Submission failed. Please try again.', life: 5000 });
        }
    } finally {
        submitting.value = false;
    }
};

const formatCurrency = (amount: number | null) => {
    if (amount === null) return '0.00';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(amount);
};

const loadDraft = async () => {
    try {
        const { data } = await axios.get('/api/offers/wizard/draft');
        const wizardData = data.data.wizard_data || {};

        if (wizardData[0]) { form.value.name = wizardData[0].name || ''; form.value.client_id = wizardData[0].client_id; }
        if (wizardData[1]) { form.value.description = wizardData[1].description || ''; }
        if (wizardData[2]) {
            form.value.amount = wizardData[2].amount || null;
            form.value.currency = wizardData[2].currency || 'USD';
            form.value.term_months = wizardData[2].term_months || 12;
            form.value.interest_rate = wizardData[2].interest_rate || 0;
        }

        activeStep.value = data.data.wizard_step ?? 0;
        updateSteps(activeStep.value);
    } catch {
        // no draft yet
    }
};

const loadClients = async () => {
    try {
        const { data } = await axios.get('/api/clients');
        clients.value = data.data;
    } catch {
        // optional
    }
};

onMounted(() => {
    loadDraft();
    loadClients();
});
</script>

<style scoped>
.wizard-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem;
}

.wizard-card {
    margin-bottom: 2rem;
}

.wizard-step-content {
    min-height: 200px;
}

.review-summary .col-6 {
    padding: 0.5rem;
}
</style>
```

---

## 5. Step Template Component

```vue
<!-- resources/js/Pages/Offer/StepTemplate.vue -->
<template>
    <div class="step-template">
        <div class="d-flex align-items-center gap-2">
            <div
                class="step-indicator"
                :class="{ 'is-active': active, 'is-completed': completed }"
            >
                <i v-if="completed" class="pi pi-check" />
                <i v-else :class="icon" />
            </div>
            <span :class="{ 'text-bold': active }">{{ label }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    label: string;
    active: boolean;
    completed: boolean;
    icon?: string;
}>();
</script>

<style scoped>
.step-indicator {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-200);
    color: var(--text-color-secondary);
    font-size: 0.75rem;
    flex-shrink: 0;
}

.step-indicator.is-active {
    background: var(--primary-color);
    color: white;
}

.step-indicator.is-completed {
    background: var(--green-500);
    color: white;
}

.text-bold {
    font-weight: 600;
}
</style>
```

---

## 6. Routes

```php
// routes/web.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/offers/wizard/draft', [OfferWizardController::class, 'getDraft'])->name('offers.wizard.draft');
    Route::post('/offers/wizard/save', [OfferWizardController::class, 'saveStep'])->name('offers.wizard.save');
    Route::post('/offers/wizard/finalize', [OfferWizardController::class, 'finalize'])->name('offers.wizard.finalize');
});
```

---

## 7. Pest Tests

```php
// tests/Feature/Api/OfferWizardTest.php
use App\Models\Offer;
use App\Models\User;
use App\Models\Client;

describe('Offer Wizard', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
        $this->client = Client::factory()->create();
    });

    describe('POST /api/offers/wizard/draft', function () {
        it('creates a draft offer', function () {
            $response = $this->actingAs($this->user, 'api')
                ->getJson('/api/offers/wizard/draft');

            $response->assertStatus(200)
                ->assertJsonPath('data.status', 'draft');

            expect(Offer::where('user_id', $user->id)->first())
                ->status->toBe('draft');
        });

        it('returns existing draft if one exists', function () {
            Offer::factory()->create(['user_id' => $this->user->id, 'status' => 'draft']);

            $response = $this->actingAs($this->user, 'api')
                ->getJson('/api/offers/wizard/draft');

            $response->assertStatus(200)
                ->assertJsonPath('data.status', 'draft');

            expect(Offer::where('user_id', $user->id)->count())->toBe(1);
        });
    });

    describe('POST /api/offers/wizard/save', function () {
        it('saves step data', function () {
            $offer = Offer::factory()->create(['user_id' => $this->user->id, 'status' => 'draft']);

            $response = $this->actingAs($this->user, 'api')
                ->postJson("/api/offers/wizard/save", [
                    'wizard_step' => 0,
                    'wizard_data' => ['name' => 'Test Offer', 'client_id' => $this->client->id],
                ]);

            $response->assertStatus(200);
            expect($offer->refresh()->wizard_step)->toBe(0);
        });

        it('merges data across steps', function () {
            $offer = Offer::factory()->create(['user_id' => $this->user->id, 'status' => 'draft']);

            $this->actingAs($this->user, 'api')
                ->postJson("/api/offers/wizard/save", [
                    'wizard_step' => 0,
                    'wizard_data' => ['name' => 'Test', 'client_id' => $this->client->id],
                ]);

            $this->actingAs($this->user, 'api')
                ->postJson("/api/offers/wizard/save", [
                    'wizard_step' => 1,
                    'wizard_data' => ['description' => 'A test offer'],
                ]);

            $offer->refresh();
            $data = json_decode($offer->wizard_data, true);
            expect($data[0]['name'])->toBe('Test');
            expect($data[1]['description'])->toBe('A test offer');
        });
    });

    describe('POST /api/offers/wizard/finalize', function () {
        it('finalizes the offer after all steps are complete', function () {
            $offer = Offer::factory()->create(['user_id' => $this->user->id, 'status' => 'draft']);
            $offer->wizard_data = [
                0 => ['name' => 'Offer', 'client_id' => $this->client->id],
                1 => ['description' => 'desc'],
                2 => ['amount' => 1000, 'currency' => 'USD', 'term_months' => 12, 'interest_rate' => 5],
                3 => ['name' => 'Offer', 'client_id' => $this->client->id, 'description' => 'desc', 'amount' => 1000, 'currency' => 'USD', 'term_months' => 12, 'interest_rate' => 5],
            ];
            $offer->save();

            $response = $this->actingAs($this->user, 'api')
                ->postJson("/api/offers/wizard/finalize");

            $response->assertStatus(200)
                ->assertJsonPath('data.status', 'pending');
        });

        it('returns 422 for incomplete steps', function () {
            $offer = Offer::factory()->create(['user_id' => $this->user->id, 'status' => 'draft']);
            $offer->wizard_data = [0 => ['name' => 'Test']]; // missing client_id
            $offer->save();

            $this->actingAs($this->user, 'api')
                ->postJson("/api/offers/wizard/finalize")
                ->assertStatus(422)
                ->assertJsonPath('step', 0);
        });
    });
});
```

---

## 8. Vue Dependencies

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
