# d1 blueprint: create / edit form (`FormPage`)

> **Layout override.** This file replaces the **page markup** of
> [`../../../blueprints/crud-form.md`](../../../blueprints/crud-form.md) for projects on
> the `d1` layout. The migration, model, controller `store()` / `update()`, form
> requests, API resource, routes, Pest tests and factories still come from that shared
> blueprint; the 422 shape comes from [`../../../rules/api.md`](../../../rules/api.md).
> Precedence rules: [`../../README.md`](../../README.md).
>
> Related d1 files: [`../shell.md`](../shell.md), [`../colors.md`](../colors.md),
> [`../typography.md`](../typography.md), [`../spacing.md`](../spacing.md),
> [`../components.md`](../components.md) (`StatusChip`). A detail page's per-section
> **Edit** links land here: see [`detail-page.md`](detail-page.md).

A d1 form is a full page of **numbered section cards** with a **sticky footer**. Three
components and one pure module:

```
resources/js/components/form/
  FormPage.vue      header, view switch + jump links, numbered sections, sticky footer,
                    optional preview column, dirty guard
  FormSection.vue   one numbered card: badge, title, sub, #aside, body; <section id> is the anchor
  FormFooter.vue    sticky action bar: error sentence · #totals · Cancel · secondary · primary
  formPage.ts       FormSectionDef, FormLayout, sectionAnchorId, read/writeFormLayout,
                    sectionFromQuery, FormTotalItem (no Vue import)
resources/js/components/form/DocumentFormPage.vue   preset: Details / Lines / Terms + totals
resources/js/utils/validation.ts                    validationErrors(), errorSentence()
```

Use `FormPage` for full-page create / edit. Short forms (a few fields, no navigation away)
stay in a dialog ([`../../../blueprints/modal-form.md`](../../../blueprints/modal-form.md)).

---

## 1. Anatomy

```
← Products                                                       (back link)
New product  TS-001  [Draft]  V2                    [header actions] [Save]
Subtitle · #header-meta
View [Form | Form + preview]  hint            ① Details  ② Pricing  ③ Description   (jump links)
#banner
┌──────────────────────────────────────────────────────────────┐
│ (1) Details                                  #section-…-aside │  FormSection
│     muted sub line                                            │
│ [Name ...........................] [SKU ......] [Category ▾]  │  12-column field grid
└──────────────────────────────────────────────────────────────┘
#before-<key> / (2) … / (3) … / #after-sections
┌──────────────────────────────────────────────────────────────┐
│ Fill the highlighted fields: name, price   Subtotal 12.00   Cancel [Save draft] [✓ Create] │  sticky
└──────────────────────────────────────────────────────────────┘
```

With **Form + preview** the sections and footer sit in a `minmax(0,1fr)` column and a
420px sticky `#preview` column sits to the right; below 1180px the preview stacks under
the form.

---

## 2. Look

### 2.1 Header

```css
.fp-header  { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.fp-back    { font-size: 12.5px; color: var(--p-text-muted-color); background: none; border: 0; padding: 0; }
.fp-title   { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.25; }
.fp-number  { margin-left: .4em; font-family: var(--font-numeric, monospace); font-size: .86em; }
.fp-sub     { font-size: 13.5px; color: var(--p-text-muted-color); }
.fp-jump-link { font-size: 12.5px; color: var(--p-text-muted-color); padding: 4px 8px; border-radius: 6px; }
.fp-jump-num  { width: 16px; height: 16px; border-radius: 50%; border: 1px solid var(--p-content-border-color);
                font-size: 10px; font-weight: 600; display: grid; place-items: center; }
```

The back link is a text button with `pi-arrow-left` ("← Products"). The status is a
`StatusChip` (`size="md"`); a version above 1 is a small mono chip. The view switch is a
PrimeVue `SelectButton` (`size="small"`, `allow-empty="false"`) labelled by a "View" span
whose id comes from `useId()`.

### 2.2 Section card (`FormSection`)

```vue
<section :id="id" class="form-section" :class="{ 'is-highlight': highlight }" :aria-labelledby="`${id}-title`">
  <header class="fs-head">
    <span v-if="number != null" class="fs-num" aria-hidden="true">{{ number }}</span>
    <div class="fs-titles">
      <h2 :id="`${id}-title`" class="fs-title">{{ title }}</h2>
      <p v-if="sub" class="fs-sub">{{ sub }}</p>
    </div>
    <div v-if="$slots.aside" class="fs-aside"><slot name="aside" /></div>
  </header>
  <div class="fs-body"><slot /></div>
</section>
```

```css
.form-section {
  background: var(--p-content-background); border: 1px solid var(--p-content-border-color);
  border-radius: 12px; padding: 14px 18px 16px; display: flex; flex-direction: column; gap: 12px;
  scroll-margin-top: 1rem; transition: box-shadow .3s, border-color .3s; min-width: 0;
}
.form-section.is-highlight {                       /* ?section=<key> ring */
  border-color: var(--p-primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--p-primary-color) 18%, transparent);
}
.fs-num   { width: 24px; height: 24px; border-radius: 50%; background: var(--p-text-color);
            color: var(--p-content-background); display: grid; place-items: center;
            font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.fs-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.3; }
.fs-sub   { margin: 1px 0 0; font-size: 12.5px; color: var(--p-text-muted-color); }
.fs-aside { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--p-text-muted-color); }
```

The number badge is **ink** (`--p-text-color`), matching the d1 dark primary buttons.
Settings-style pages pass `:numbered="false"` and get titled, unnumbered cards.

### 2.3 Sticky footer (`FormFooter`)

```vue
<div class="form-footer" :class="{ 'is-sticky': sticky }">
  <div class="ff-error" role="status" aria-live="polite"><span v-if="error">{{ error }}</span></div>
  <div v-if="$slots.totals" class="ff-totals"><slot name="totals" /></div>
  <div class="ff-actions">
    <Button :label="cancelLabel" severity="secondary" text :disabled="saving" @click="emit('cancel')" />
    <Button v-if="secondaryLabel" :label="secondaryLabel" severity="secondary" outlined
            :disabled="saving || disabled" @click="emit('secondary')" />
    <Button v-if="!hidePrimary" :label="primaryLabel" :icon="primaryIcon" :loading="saving" :disabled="disabled"
            :type="primarySubmit ? 'submit' : 'button'" @click="primarySubmit ? undefined : emit('primary')" />
  </div>
</div>
```

```css
.form-footer {
  display: flex; align-items: center; gap: 12px 18px; flex-wrap: wrap;
  background: var(--p-content-background); border: 1px solid var(--p-content-border-color);
  border-radius: 12px; padding: 12px 18px;
}
.form-footer.is-sticky { position: sticky; bottom: 0; z-index: 5; box-shadow: 0 -6px 16px rgb(0 0 0 / .04); }
.ff-error   { flex: 1 1 200px; min-width: 0; font-size: 12.5px; color: var(--p-red-600); }
.ff-totals  { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 13.5px; color: var(--p-text-muted-color); }
.ff-actions { display: flex; gap: 8px; margin-left: auto; }
```

The error region is always mounted (`role="status"`), so a new sentence is announced.

### 2.4 Body grid and preview

```css
.fp-body              { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
.fp-body.with-preview { grid-template-columns: minmax(0, 1fr) 420px; }
.fp-main              { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.fp-preview           { position: sticky; top: 1rem; max-height: calc(100vh - 2rem); overflow-y: auto; }
@media (max-width: 1180px) {
  .fp-body.with-preview { grid-template-columns: minmax(0, 1fr); }
  .fp-preview { position: static; max-height: none; }
}
```

The preview column has a "● Live preview" label (7px green dot). Offer the preview only
for **printable** documents (an order, a quote); a product or a settings form has none.

### 2.5 The 12-column field grid

Every section body lays its fields on a 12-column grid. In Tailwind CSS 4 utilities:

```vue
<div class="grid grid-cols-12 items-start gap-x-3 gap-y-2.5">
  <div class="col-span-12 flex min-w-0 flex-col gap-1 xl:col-span-6">  <!-- wide field -->
  <div class="col-span-12 flex min-w-0 flex-col gap-1 sm:col-span-6 xl:col-span-3">  <!-- short field -->
  <div class="col-span-12 flex min-w-0 flex-col gap-1">  <!-- full row: textarea, editor -->
</div>
```

- Phones: every field takes the full row. Tablets (`sm`): two per row. Desktop (`xl`):
  the spans you design (a typical header row is 6 + 3 + 3, or 4 + 2 + 2 + 2 + 2).
- Label: `text-xs font-medium` in `--p-text-color`; a required mark is a red `*`; help
  text `text-[0.8rem] text-[var(--p-text-muted-color)]`; the field error a
  `<small class="text-[0.83rem] text-[var(--p-red-600)]">` under the control.
- Inputs fill their cell (`fluid` on PrimeVue 4 inputs, or `class="w-full"`).

Put the repeated field wrapper in a tiny component (`FormField.vue`: `label`, `for`,
`required`, `hint`, `error`, `span` classes, default slot) rather than repeating it.

---

## 3. Contracts

### 3.1 `FormPage` props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | required | "New product" / "Edit product" |
| `number` | `string \| null` | `null` | Mono, after the title (the record's code) |
| `subtitle` | `string \| null` | `null` | Muted line under the title |
| `status`, `statusLabel`, `statusTone` | `string \| null` | `null` | `StatusChip` in the title row |
| `version` | `number \| null` | `null` | Mono chip "V2", shown from 2 |
| `backTo`, `backLabel` | `RouteLocationRaw`, `string` | `null` | Back link; without `backTo` it is `router.back()` |
| `sections` | `FormSectionDef[]` (`{ key, label, sub? }`) | required | One card each, in order |
| `numbered` | `boolean` | `true` | `false` for settings-style pages |
| `preview`, `previewLabel` | `boolean`, `string` | `false`, "Live preview" | Offer Form / Form + preview |
| `storageKey` | `string` | `'form'` | Remembered layout key (`form_layout_<key>` in localStorage) |
| `loading` | `boolean` | `false` | Two skeleton cards instead of the sections; disables the primary |
| `highlight` | `string \| null` | `null` | Section key to ring (wins over `?section=`) |
| `stickyFooter` | `boolean` | `true` | |
| `primaryLabel`, `primaryIcon` | `string` | required, `pi pi-check` | "Create product" / "Save changes" |
| `secondaryLabel` | `string \| null` | `null` | "Save draft" / "Save & add another"; hidden when null |
| `cancelLabel` | `string` | "Cancel" | |
| `error` | `string \| null` | `null` | The footer sentence |
| `saving`, `disabled` | `boolean` | `false` | Spinner / disabled primary |
| `dirtyGuard`, `dirty`, `dirtyMessage` | `boolean`, `boolean`, `string` | `false`, `false`, "You have unsaved changes…" | Leave guard (§5) |
| `hidePrimary` | `boolean` | `false` | Read-only sheet: no primary at all |
| `primarySubmit` | `boolean` | `false` | Primary is `type="submit"` and emits nothing: wrap the page in `<form @submit.prevent="save">` so Enter and the click take one path |
| `primaryInHeader` | `boolean` | `false` | Repeats the primary in the header actions |

**v-model:** `layout: 'sections' | 'preview'`.
**Emits:** `primary`, `secondary`, `cancel` (Cancel also navigates: `backTo`, else back).
**Exposes:** `scrollToSection(key)`.

### 3.2 `FormPage` slots

| Slot | Where |
|---|---|
| `section-<key>` | Body of that section card |
| `section-<key>-aside` | Right of that card's heading (a note, a toggle) |
| `before-<key>` | Between cards, before that section (a call-out) |
| `after-sections` | After the last card, before the footer |
| `header-meta` | After the subtitle (a "next number" chip) |
| `header-actions` | Header right (a ⋯ menu, Delete) |
| `banner` | Under the toolbar (a `Message`) |
| `footer-totals` | Middle of the footer |
| `preview` | The preview column |

### 3.3 `FormSection` and `FormFooter`

`FormSection`: `id` (anchor, `section-<key>`), `title`, `number?` (null = unnumbered),
`sub?`, `highlight?`; slots default and `#aside`.

`FormFooter`: `primaryLabel`, `primaryIcon`, `secondaryLabel`, `cancelLabel`, `error`,
`saving`, `disabled`, `sticky`, `hidePrimary`, `primarySubmit`; emits `cancel`, `primary`,
`secondary`; slot `#totals`. Use it alone under a settings form that is not a `FormPage`.

### 3.4 `formPage.ts`

```ts
export interface FormSectionDef { key: string; label: string; sub?: string | null }
export type FormLayout = 'sections' | 'preview'
export const FORM_LAYOUT_OPTIONS = [
  { value: 'sections', label: 'Form', hint: 'Full width, numbered steps' },
  { value: 'preview', label: 'Form + preview', hint: 'Live preview beside the form' },
] as const

export const sectionAnchorId = (key: string): string => `section-${key}`

export function readFormLayout(storageKey: string): FormLayout | null {
  try {
    const v = window.localStorage.getItem(`form_layout_${storageKey}`)
    return v === 'sections' || v === 'preview' ? v : null
  } catch { return null }                      // private mode: simply opens in Form
}
export function writeFormLayout(storageKey: string, layout: FormLayout): void {
  try { window.localStorage.setItem(`form_layout_${storageKey}`, layout) } catch { /* not remembered */ }
}

/** `?section=pricing` → 'pricing' when it is one of the page's keys. */
export function sectionFromQuery(query: Record<string, unknown> | null | undefined, keys: readonly string[]): string | null {
  const raw = query?.section
  const v = Array.isArray(raw) ? raw[0] : raw
  return typeof v === 'string' && keys.includes(v) ? v : null
}

export interface FormTotalItem {
  key: string; label: string; amount: number
  negative?: boolean                            // printed with a leading minus
  strong?: boolean                              // the grand total: larger, last
  format?: 'money' | 'quantity'
}
```

---

## 4. Behaviour

### 4.1 `?section=<key>`: scroll and ring

A detail page's section **Edit** links to the edit route with `?section=<key>` and the
hash `#section-<key>`. Once `loading` is false, `FormPage` scrolls to that card and rings
it for about 1.8s:

```ts
const route = useRoute()
const queryHighlight = ref<string | null>(null)
const effectiveHighlight = computed(() => props.highlight ?? queryHighlight.value)
let deepLinked = false
watch(() => [props.loading, props.sections.map(s => s.key).join('|')] as const, ([isLoading]) => {
  if (deepLinked || isLoading) return
  const key = sectionFromQuery(route.query, props.sections.map(s => s.key))
  if (!key) return
  deepLinked = true
  void nextTick(() => {
    document.getElementById(sectionAnchorId(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    queryHighlight.value = key
    setTimeout(() => { if (queryHighlight.value === key) queryHighlight.value = null }, 1800)
  })
}, { immediate: true })
```

Optionally, the router's `scrollBehavior` can handle `#section-*` hashes too (wait for the
element, scroll, add `is-highlight`), so any link with the hash works.

### 4.2 Form / Form + preview, per viewer

On mount, when `preview` is on, read the remembered layout; write it on every change. When
`preview` is off, force `sections`.

### 4.3 Validation display

Two places, both driven by one `errors: Record<string, string[]>`:

1. **Field highlights**: `:invalid="!!errors.name"` on the PrimeVue 4 control (plus
   `aria-invalid` / `aria-describedby` to the `<small>` error), and the first message
   under the field.
2. **The footer sentence**: "Fill the highlighted fields: name, price". Map API keys to
   readable names; nested keys (`variants.0.sku`) map by prefix; unknown keys fall back
   to "Some fields need attention."

The API answers 422 with the gg13 envelope (`error.code = VALIDATION_ERROR`,
`error.details = { field: [messages] }`, [`../../../rules/api.md`](../../../rules/api.md)).
Read it with one helper that also accepts Laravel's default `errors` key, so the page
works whichever way the exception handler is configured:

```ts
// resources/js/utils/validation.ts
import { isAxiosError } from 'axios'

export type FieldErrors = Record<string, string[]>

/** The 422 field errors, or null when the error is not a validation failure. */
export function validationErrors(e: unknown): FieldErrors | null {
  if (!isAxiosError(e) || e.response?.status !== 422) return null
  const body = e.response.data as { error?: { details?: FieldErrors }; errors?: FieldErrors }
  return body.error?.details ?? body.errors ?? {}
}

/** "Fill the highlighted fields: name, price" from the error keys. */
export function errorSentence(errors: FieldErrors, names: Record<string, string>): string | null {
  const keys = Object.keys(errors)
  if (!keys.length) return null
  const readable = [...new Set(keys.map(k => names[k] ?? names[k.split('.')[0]] ?? null).filter((n): n is string => !!n))]
  return readable.length ? `Fill the highlighted fields: ${readable.join(', ')}` : 'Some fields need attention.'
}

/** A non-validation failure: the server's message, else a fallback. */
export function apiErrorMessage(e: unknown, fallback: string): string {
  if (!isAxiosError(e)) return fallback
  const body = e.response?.data as { error?: { message?: string }; message?: string } | undefined
  return body?.error?.message ?? body?.message ?? fallback
}
```

Client-side checks (required fields before sending) write into the same `errors` object,
so both kinds look identical. Clear `errors` at the start of each save.

### 4.4 Dirty guard

`dirtyGuard && dirty` turns on a route-leave guard and a `beforeunload` handler. The
question goes through PrimeVue's global `ConfirmDialog` (mounted once by the shell, with
`ConfirmationService` installed), falling back to `window.confirm` in tests without it.

```ts
let confirmService: ReturnType<typeof useConfirm> | null = null
try { confirmService = useConfirm() } catch { confirmService = null }
const guarding = computed(() => props.dirtyGuard && props.dirty)

function askToLeave(): Promise<boolean> {
  if (!confirmService) return Promise.resolve(window.confirm(props.dirtyMessage))
  return new Promise(resolve => {
    let settled = false
    const done = (v: boolean) => { if (!settled) { settled = true; resolve(v) } }
    confirmService!.require({
      header: 'Leave without saving?',
      message: props.dirtyMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Leave', rejectLabel: 'Stay',
      acceptProps: { severity: 'danger' },
      rejectProps: { severity: 'secondary', outlined: true },
      accept: () => done(true), reject: () => done(false), onHide: () => done(false),
    })
  })
}

onBeforeRouteLeave(() => (guarding.value ? askToLeave() : true))
function onBeforeUnload(e: BeforeUnloadEvent) { if (guarding.value) { e.preventDefault(); e.returnValue = '' } }
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
```

The page owns `dirty`: compare a JSON signature of the editable state with a baseline
taken after load. After a successful save, set a `leaving` flag (so `dirty` is false),
`await nextTick()`, **then** `router.push`. Vitest specs that mock `vue-router` must add
`onBeforeRouteLeave: vi.fn()` to the mock.

### 4.5 Ids

Never hard-code label / `aria-labelledby` ids: build them with Vue's `useId()`. The
section anchors `section-<key>` are the one exception (one form per page, and deep links
target them).

---

## 5. `DocumentFormPage`: the header + lines + totals preset

For records with a header, line items and printed terms (an order, a quote, a purchase
order), a thin preset over `FormPage` fixes the sections and renders the running totals.
It owns the page; the document owns its fields.

| Section | Key | Slot on the preset | Label prop (default) |
|---|---|---|---|
| 1 | `details` | `#header-fields` (+ `#header-fields-aside`) | `detailsLabel` ("Customer & details") |
| 2 | `lines` | `#lines` (+ `#lines-aside`, `#before-lines`) | `linesLabel` ("Items") |
| … | `extraSections[].key` | `#section-<key>` | between Lines and Terms |
| 3 | `terms` | `#terms` (+ `#terms-aside`) | `termsLabel` ("Terms"); omit with `:terms="false"` |
| … | `trailingSections[].key` | `#section-<key>` | after Terms (e.g. "Payment") |

```ts
const sections = computed<FormSectionDef[]>(() => [
  { key: 'details', label: props.detailsLabel, sub: props.detailsSub },
  { key: 'lines', label: props.linesLabel, sub: props.linesSub },
  ...props.extraSections,
  ...(props.terms ? [{ key: 'terms', label: props.termsLabel, sub: props.termsSub }] : []),
  ...props.trailingSections,
])
// Preset slot names → FormPage's; every other slot passes through unchanged.
const RENAMED: Record<string, string> = {
  'header-fields': 'section-details', 'header-fields-aside': 'section-details-aside',
  lines: 'section-lines', 'lines-aside': 'section-lines-aside',
  terms: 'section-terms', 'terms-aside': 'section-terms-aside',
}
```

```vue
<template v-if="totals.length" #footer-totals>
  <span v-for="t in totals" :key="t.key" class="whitespace-nowrap" :class="{ 'text-[15px] text-[var(--p-text-color)]': t.strong }">
    {{ t.strong && currencyCode ? `${t.label} ${currencyCode}` : t.label }}
    <strong class="font-semibold tabular-nums text-[var(--p-text-color)] font-[var(--font-numeric)]">
      {{ t.negative && t.amount ? '−' : '' }}{{ format(t) }}
    </strong>
  </span>
</template>
```

Defaults differ from `FormPage`: `dirtyGuard` is **on** and `primaryInHeader` is on (Save
at the top and the bottom). It does not place a line editor or totals table itself: each
document's grid differs, so the consumer puts them in `#lines`. The totals figures come
from the line state the form already holds; the server recomputes on save and is the
source of truth.

---

## 6. Worked example: product create / edit

One page serves `products.create` and `products.edit`. Sections: 1 Details, 2 Pricing &
stock, 3 Description. No preview (a product does not print).

```ts
// resources/js/api/services/productApi.ts (additions)
export async function createProduct(data: ProductPayload): Promise<Product> {
  const response = await api.post<ApiResponse<Product>>('/products', data)
  return response.data.data
}
export async function updateProduct(id: number, data: ProductPayload): Promise<Product> {
  const response = await api.patch<ApiResponse<Product>>(`/products/${id}`, data)
  return response.data.data
}
```

```vue
<!-- resources/js/pages/products/ProductFormPage.vue -->
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import ToggleSwitch from 'primevue/toggleswitch'
import FormPage from '@/components/form/FormPage.vue'
import FormField from '@/components/form/FormField.vue'
import type { FormSectionDef } from '@/components/form/formPage'
import { createProduct, fetchProduct, updateProduct } from '@/api/services/productApi'
import { fetchCategoryOptions } from '@/api/services/categoryApi'
import { apiErrorMessage, errorSentence, validationErrors, type FieldErrors } from '@/utils/validation'
import type { Product, ProductPayload } from '@/types/product'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const id = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => id.value !== null)

const sections: FormSectionDef[] = [
  { key: 'details', label: 'Details', sub: 'How the product is named and filed.' },
  { key: 'pricing', label: 'Pricing & stock' },
  { key: 'description', label: 'Description', sub: 'Shown on quotes and the shop page.' },
]

const form = reactive<ProductPayload>({
  name: '', sku: '', category_id: null, status: 'draft',
  price: null, cost: null, stock: 0, track_stock: true, description: '',
})
const existing = ref<Product | null>(null)
const categories = ref<{ value: number; label: string }[]>([])
const loading = ref(false)
const saving = ref(false)
const errors = ref<FieldErrors>({})

/* ---------- dirty ---------- */
const signature = computed(() => JSON.stringify(form))
const baseline = ref(signature.value)
const leaving = ref(false)
const dirty = computed(() => !leaving.value && signature.value !== baseline.value)

/* ---------- load ---------- */
onMounted(async () => {
  fetchCategoryOptions().then(o => { categories.value = o }).catch(() => {})
  if (!isEdit.value) return
  loading.value = true
  try {
    const p = await fetchProduct(id.value!)
    existing.value = p
    Object.assign(form, {
      name: p.name, sku: p.sku, category_id: p.category?.id ?? null, status: p.status,
      price: p.price, cost: p.cost, stock: p.stock, track_stock: p.track_stock, description: p.description ?? '',
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Could not load the product', detail: apiErrorMessage(e, ''), life: 6000 })
  } finally {
    loading.value = false
    await nextTick()
    baseline.value = signature.value
  }
})

/* ---------- validation ---------- */
const FIELD_NAMES: Record<string, string> = {
  name: 'name', sku: 'SKU', category_id: 'category', price: 'price', cost: 'cost', stock: 'stock', description: 'description',
}
const footerError = computed(() => errorSentence(errors.value, FIELD_NAMES))
const err = (k: string) => errors.value[k]?.[0] ?? null

function localErrors(): FieldErrors {
  const out: FieldErrors = {}
  if (!form.name.trim()) out.name = ['Enter a name.']
  if (form.price === null) out.price = ['Enter a price.']
  return out
}

/* ---------- save ---------- */
async function save(andNew = false) {
  errors.value = localErrors()
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    const saved = isEdit.value ? await updateProduct(id.value!, { ...form }) : await createProduct({ ...form })
    toast.add({ severity: 'success', summary: isEdit.value ? 'Product saved' : 'Product created', life: 3000 })
    leaving.value = true                       // dirty → false before the guard runs
    await nextTick()
    await router.push(andNew ? { name: 'products.create', query: { t: Date.now() } } : { name: 'products.show', params: { id: saved.id } })
  } catch (e) {
    const fields = validationErrors(e)
    if (fields) errors.value = fields
    else toast.add({ severity: 'error', summary: 'Could not save', detail: apiErrorMessage(e, 'Please try again.'), life: 6000 })
  } finally {
    saving.value = false
  }
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' },
]
</script>

<template>
  <FormPage
    :title="isEdit ? 'Edit product' : 'New product'"
    :number="existing?.sku ?? null"
    :status-label="existing ? STATUS_OPTIONS.find(s => s.value === existing!.status)?.label : null"
    :status-tone="existing?.status === 'active' ? 'green' : existing?.status === 'draft' ? 'amber' : 'gray'"
    :back-to="{ name: 'products.index' }"
    back-label="Products"
    :sections="sections"
    storage-key="product-form"
    :loading="loading"
    :primary-label="isEdit ? 'Save changes' : 'Create product'"
    :secondary-label="isEdit ? null : 'Save & add another'"
    :error="footerError"
    :saving="saving"
    dirty-guard
    :dirty="dirty"
    @primary="save()"
    @secondary="save(true)"
  >
    <template #section-details>
      <div class="grid grid-cols-12 items-start gap-x-3 gap-y-2.5">
        <FormField class="col-span-12 xl:col-span-6" label="Name" for="p-name" required :error="err('name')">
          <InputText id="p-name" v-model="form.name" fluid :invalid="!!err('name')" />
        </FormField>
        <FormField class="col-span-12 sm:col-span-6 xl:col-span-3" label="SKU" for="p-sku" :error="err('sku')"
                   hint="Leave empty to generate one.">
          <InputText id="p-sku" v-model="form.sku" fluid class="font-[var(--font-numeric)]" :invalid="!!err('sku')" />
        </FormField>
        <FormField class="col-span-12 sm:col-span-6 xl:col-span-3" label="Status" for="p-status">
          <Select input-id="p-status" v-model="form.status" :options="STATUS_OPTIONS" option-label="label" option-value="value" fluid />
        </FormField>
        <FormField class="col-span-12 xl:col-span-6" label="Category" for="p-cat" :error="err('category_id')">
          <Select input-id="p-cat" v-model="form.category_id" :options="categories" option-label="label" option-value="value"
                  filter show-clear placeholder="No category" fluid :invalid="!!err('category_id')" />
        </FormField>
      </div>
    </template>

    <template #section-pricing-aside>
      <label class="flex items-center gap-2">
        <ToggleSwitch v-model="form.track_stock" input-id="p-track" /> <span>Track stock</span>
      </label>
    </template>
    <template #section-pricing>
      <div class="grid grid-cols-12 items-start gap-x-3 gap-y-2.5">
        <FormField class="col-span-12 sm:col-span-6 xl:col-span-3" label="Price" for="p-price" required :error="err('price')">
          <InputNumber input-id="p-price" v-model="form.price" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2"
                       fluid :invalid="!!err('price')" />
        </FormField>
        <FormField class="col-span-12 sm:col-span-6 xl:col-span-3" label="Cost" for="p-cost" :error="err('cost')">
          <InputNumber input-id="p-cost" v-model="form.cost" mode="decimal" :min-fraction-digits="2" :max-fraction-digits="2" fluid />
        </FormField>
        <FormField v-if="form.track_stock" class="col-span-12 sm:col-span-6 xl:col-span-3" label="In stock" for="p-stock" :error="err('stock')">
          <InputNumber input-id="p-stock" v-model="form.stock" :min="0" fluid :invalid="!!err('stock')" />
        </FormField>
      </div>
    </template>

    <template #section-description>
      <FormField label="Description" for="p-desc" :error="err('description')">
        <Textarea id="p-desc" v-model="form.description" rows="5" auto-resize fluid :invalid="!!err('description')" />
      </FormField>
    </template>
  </FormPage>
</template>
```

Routes (inside the authenticated layout route from [`../shell.md`](../shell.md)):

```ts
{ path: 'products/create', name: 'products.create', component: () => import('@/pages/products/ProductFormPage.vue'), meta: { permission: 'products.create' } },
{ path: 'products/:id/edit', name: 'products.edit', component: () => import('@/pages/products/ProductFormPage.vue'), meta: { permission: 'products.update' } },
```

`FormField.vue` is the small wrapper from §2.5: a `flex flex-col gap-1 min-w-0` div with
the label (`text-xs font-medium`, red `*` when `required`), the default slot, the hint
and the `<small>` error (`id` from `useId()`, referenced by the control's
`aria-describedby`).

---

## 7. Checklist

1. Sections named for what the user fills in; `sub` lines only where they help.
2. Every field on the 12-column grid; full-row fields for long text.
3. `errors` from `validationErrors(e)`; field `:invalid` + message; footer sentence from a
   key → name map.
4. `dirty` from a signature + baseline; `leaving` flag before `router.push`.
5. Primary label states the outcome ("Create product", "Save changes").
6. `?section=<key>` works because section keys are stable; a detail page links to them.
7. Preview only for printable records.
