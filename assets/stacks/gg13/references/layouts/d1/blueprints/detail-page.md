# d1 blueprint: detail page (`DocumentPanel`)

> **Layout override.** This file replaces the **page markup** of
> [`../../../blueprints/detail-page.md`](../../../blueprints/detail-page.md) for projects
> on the `d1` layout. The controller `show()`, the API resource with its relationships,
> routes and Pest tests still come from that shared blueprint; response shapes from
> [`../../../rules/api.md`](../../../rules/api.md). Precedence rules:
> [`../../README.md`](../../README.md).
>
> Related d1 files: [`listing.md`](listing.md) (the split view that hosts this panel),
> [`crud-form.md`](crud-form.md) (where section Edit links land),
> [`../components.md`](../components.md) (`StatusChip`, `LifecycleStepper`,
> `DetailField`, `DetailGroup`), [`../colors.md`](../colors.md),
> [`../typography.md`](../typography.md).

In d1 a record has **one detail component**, used in two places:

- as the **right pane** of a `ListPage` in split view (`#detail` slot, `?open=<id>`);
- as the **full page** at `<resource>.show`, inside a thin frame, `DocumentDetailPage`.

Every action lives in the detail component, so the pane and the page always offer the same
actions. The show page only fetches, frames, and handles what happens after a delete.

```
resources/js/components/document/
  DocumentPanel.vue      the card: heading, facts, next step, tabs, body, totals (presentational)
  DocumentToolbar.vue    action ribbon for #toolbar (roving tabindex, overflow menu)
  DocumentSection.vue    titled block of the body, with an optional section Edit link
  DocumentLines.vue      read-only lines table (# · item + code · qty × rate · amount)
  DocumentActivity.vue   activity log (fetches its own rows)
  DocumentVersions.vue   versions card (optional, for versioned records)
  DocumentDetailPage.vue the *.show frame: back link, error + retry
  documentDetail.ts      pure helpers: total rows, section edit route, deep-linked tab
  documentParts.ts       types (DocumentFact, DocumentTotalRow, DocumentNextStep, …)
```

`DocumentPanel`, `DocumentLines`, `DocumentToolbar` and `DocumentSection` are **purely
presentational**: they fetch nothing, format nothing (money arrives as strings) and check
no permissions. `DocumentActivity` is the exception: it fetches its own rows.

---

## 1. Anatomy

```
┌ #toolbar ───────────────────────────────────────────────────────────────┐
│ [Edit] [Email ▾] [Duplicate] [⋯]                                  [PDF] │  DocumentToolbar
├─────────────────────────────────────────────────────────────────────────┤
│ [#media]  ORDER                                         [#actions: ⧉ 🗑] │  eyebrow (docType)
│           SO-2026-0142  V2  [Confirmed]                                  │  mono number · version · status
│           Acme Retail  C-0042                                            │  title (+ titleCode pill)
│           Placed 3 Nov · 12 items                                        │  subtitle
│ ┌ Order date │ Required by │ Items │ Total      │ Balance ┐              │  facts grid (auto-fit)
│ └ 3 Nov 2026 │ 10 Nov 2026 │ 12    │ $1,240.00  │ $240.00 ┘              │
│ #stepper  ✓ Draft ── ● Confirmed ── 3 Shipped ── 4 Delivered            │  LifecycleStepper compact
│ ┌ NEXT  Ship the remaining 3 items.        [Cancel order] [Create shipment →] ┐  next-step callout
│ Overview   Shipments 2   History                                         │  underline tabs
│ ── body (default slot): DocumentSection blocks, DocumentLines …         │
│                                             Subtotal       1,100.00      │  totals (right, mono)
│                                             Tax              140.00      │
│                                             Total USD      1,240.00      │  emphasis row
│ #footer                                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Look

The panel defines its own `--dp-*` tokens over the preset, like the list shell:

```css
.dp-root {
  --dp-ink: var(--p-surface-900, #18181b);
  --dp-on-ink: var(--p-surface-0, #fff);
  --dp-text-2: var(--p-surface-600, #52525b);
  --dp-muted: var(--p-text-muted-color, #71717a);
  --dp-border: var(--p-content-border-color, #e7e7ea);
  --dp-line: var(--p-surface-100, #f0f0f2);
  --dp-soft: var(--p-surface-50, #fafafa);
  --dp-surface: var(--p-content-background, #fff);
  background: var(--dp-surface); border: 1px solid var(--dp-border); border-radius: 12px;
  display: flex; flex-direction: column; min-width: 0; padding-bottom: 17px; color: var(--dp-ink);
}
:global(.dark-mode .dp-root.dp-root) {
  --dp-ink: var(--p-surface-50, #fafafa); --dp-on-ink: var(--p-surface-900, #18181b);
  --dp-text-2: var(--p-surface-400, #a1a1aa); --dp-line: var(--p-surface-800, #27272a);
  --dp-soft: color-mix(in srgb, var(--p-surface-800) 50%, var(--p-surface-900));
}
.dp-root.is-flat { border: 0; border-radius: 0; }

/* layout="page": same panel as the full page */
.dp-root.is-page .dp-toolbar { position: sticky; top: 0; z-index: 2; background: var(--dp-surface); border-radius: 12px 12px 0 0; }
.dp-root.is-page .dp-facts   { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.dp-root.is-page .dp-number  { font-size: 22px; }

.dp-toolbar { display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 12px; border-bottom: 1px solid var(--dp-line); }
.dp-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--dp-text-2); }
.dp-number  { margin: 0; font-family: var(--font-numeric, monospace); font-variant-numeric: tabular-nums;
              font-size: 19px; font-weight: 600; letter-spacing: -.02em; }
.dp-version { font-family: var(--font-numeric, monospace); font-size: 11px; font-weight: 600;
              padding: 1px 5px; border-radius: 5px; background: var(--dp-ink); color: var(--dp-on-ink); }
.dp-title   { margin-top: 3px; font-size: 13.4px; font-weight: 600; }
.dp-subtitle{ margin-top: 2px; font-size: 12.2px; color: var(--dp-text-2); }

.dp-facts   { margin: 12px 17px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
              border: 1px solid var(--dp-line); border-radius: 10px; background: var(--dp-soft); }
.dp-fact    { padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dp-fact dt { font-size: 11.3px; color: var(--dp-muted); }
.dp-fact dd { margin: 0; font-size: 12.5px; font-weight: 600; overflow-wrap: anywhere; }

.dp-next       { margin: 12px 17px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
                 padding: 10px 12px; border: 1px solid var(--dp-border); border-radius: 10px; }
.dp-next-badge { font-size: 11px; font-weight: 600; letter-spacing: .08em; padding: 3px 7px; border-radius: 6px;
                 background: var(--status-blue-bg); color: var(--status-blue-fg); }
.dp-next-text  { flex: 1 1 240px; font-size: 12.2px; }
.dp-next :deep(.dp-next-btn.p-button) { height: 31px; border-radius: 8px; background: var(--dp-ink);
                 border-color: var(--dp-ink); color: var(--dp-on-ink); font-size: 12.2px; }

.dp-tabs      { display: flex; gap: 19px; margin: 14px 17px 0; border-bottom: 1px solid var(--dp-border); overflow-x: auto; }
.dp-tab       { height: 34px; font-size: 12.5px; font-weight: 500; color: var(--dp-text-2); background: transparent; border: 0; }
.dp-tab.is-active { color: var(--dp-ink); font-weight: 600; box-shadow: inset 0 -2px 0 var(--dp-ink); }

.dp-body        { padding: 12px 17px 0; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dp-totals-wrap { display: flex; justify-content: flex-end; }   /* totals: right, mono values, emphasis row ruled + bold */
```

Key traits: an uppercase eyebrow, a **mono** document number, an **ink** version chip,
facts in a soft rounded strip, a bordered NEXT callout with a blue badge and an ink
button, underline tabs with an ink indicator, right-aligned mono totals.

---

## 3. `DocumentPanel` contract

### 3.1 Props

| Prop | Type | Region |
|---|---|---|
| `docType` | `string` | Uppercase eyebrow ("Order") |
| `number` | `string \| null` | The `<h2>`, numeric face (19px pane, 22px page) |
| `version` | `string \| null` | Ink mono chip ("V2"); or `#version` |
| `statusLabel`, `statusTone` | `string \| null`, tone | `StatusChip` ([`../components.md`](../components.md)); or `#status` |
| `title`, `titleCode` | `string \| null` | Party / name line (13.4px / 600) + a mono pill (a customer number) |
| `subtitle` | `string \| null` | Muted line; or `#subtitle` |
| `facts` | `DocumentFact[]` `{ key?, label, value, mono?, tone? }` | Facts grid; empty value → `—` |
| `next` | `DocumentNextStep \| null` `{ text, actionLabel?, actionIcon?, disabled?, loading?, secondary?: DocumentNextAction[] }` | NEXT callout. Primary button only with `actionLabel`; `secondary` = outlined buttons before it (`{ key, label, icon?, disabled?, loading?, danger? }`) |
| `tabs`, `tabsLabel` | `DocumentPanelTab[]` `{ key, label, count? }` | Underline tabs; or `#tabs` |
| `totals` | `DocumentTotalRow[]` `{ key?, label, value, emphasis?, muted?, tone? }` | Right-aligned totals; `emphasis` = grand total; or `#totals` |
| `loading` | `boolean` | Skeleton heading, facts and body. **`#actions` stays visible**, `#media` hides; actions must cope with a null record |
| `flat` | `boolean` | No outer border / radius (host already draws a card) |
| `layout` | `'pane' \| 'page'` | `page`: sticky toolbar, wider facts, 22px number; sets `data-layout` |

**v-model:** `tab`. When `tab` matches no tab, the panel falls back to the first and
**emits `update:tab` with it**, so model and UI agree.

**Emits:** `next()` (primary NEXT button), `next-action(key)` (a secondary),
`update:tab(key)`. The NEXT bar runs actions in place; it never just navigates to the
show page.

### 3.2 Slots (render order)

| Slot | Content |
|---|---|
| `#toolbar` | `<DocumentToolbar>` across the top |
| `#media` | Left of the heading: a thumbnail, an avatar |
| `#version`, `#status`, `#subtitle` | Replace the built-in chip / line |
| `#actions` | Header right: "Full page", Delete, ⋯ (icon buttons, `text rounded`) |
| (facts) | from the `facts` prop |
| `#stepper` | `<LifecycleStepper variant="compact">` |
| `#next` | Replaces the NEXT sentence (keeps badge and buttons) |
| `#tabs` | Replaces the built-in tabs |
| default | The body: `DocumentSection`s, `DocumentLines`, related lists, activity |
| `#totals` | Replaces the totals block |
| `#footer` | After totals |

Every region renders only when its prop or slot is present.

### 3.3 Tabs accessibility

Built-in tabs follow the WAI-ARIA tabs pattern: `role="tablist"`, each tab `role="tab"`
with an id, `aria-selected`, `aria-controls` → the body; roving tabindex; Left / Right /
Home / End. The body is `role="tabpanel"` with `aria-labelledby` the active tab (built-in
tabs only). Ids come from `useId()`.

---

## 4. The parts

### 4.1 `DocumentToolbar`

| Prop | Type |
|---|---|
| `items` | `DocumentToolbarItem[]` `{ key, label, icon?, command?, items?: MenuEntry[], disabled?, disabledReason?, primary?, loading?, end? }` |
| `ariaLabel` | `string` |

Menu entry: `{ key, label, sub?, icon?, disabled?, danger?, command? }` (`sub` = muted
second line).

Rules:

- `role="toolbar"`, one tab stop, Left / Right / Home / End.
- A dropdown button has `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` → its
  PrimeVue `Menu`; ArrowDown opens it.
- A **blocked** item is not a disabled `<button>`: it stays focusable with
  `aria-disabled="true"`, its `disabledReason` is the accessible description (visually
  hidden span) and a tooltip, and a click writes the reason into a polite live region
  instead of acting. A disabled button can neither be reached nor explain itself.
- `end: true` pushes an item right (PDF); `primary` = ink-filled.
- Narrow: a `ResizeObserver` keeps all items inline at ≥ 620px, four at 420–620px, two
  below; the rest fold into a "More actions" (`pi-ellipsis-h`) menu. Primary items never
  fold.

### 4.2 `DocumentSection`

A titled block of the body. Title: 11.3px / 600 / uppercase / `0.06em` tracking, muted,
with an optional mono count ("Items · 12 lines").

| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | |
| `count` | `string \| number \| null` | After the title |
| `sectionKey` | `string \| null` | `data-section`; the form section the Edit link opens |
| `editable` | `boolean` | Shows an "Edit" text button (`pi-pencil`) |
| `editBlockedReason` | `string \| null` | Blocked Edit: `aria-disabled`, described, tooltip, no emit |
| `variant` | `'default' \| 'note'` | `note` = amber internal-note box |

Emits `edit`; slot `#actions`. The Edit goes to the form with `?section=<key>` and
`#section-<key>` ([`crud-form.md`](crud-form.md) §4.1), built with `sectionEditRoute`.

### 4.3 `DocumentLines`

Read-only lines table with ARIA table roles: `#` · item name + code (numeric face) ·
`qty × rate` · amount. Props `lines: DocumentLine[]` (`{ key, name, code?, qty, rate,
amount }`, all pre-formatted strings) and `emptyText` ("No lines on this record.").
Records whose lines carry extra columns (ordered vs shipped) render their own table in the
same style.

### 4.4 `DocumentActivity` and `DocumentVersions`

- `DocumentActivity`: props `subjectType`, `subjectId`, `refreshKey` (bump to refetch),
  `limit` (8, then "Show all N"). It calls a service
  (`fetchActivities({ subject_type, subject_id })` → `GET /activities`, a paginated
  endpoint over the app's audit log). Put it in a **History** tab.
- `DocumentVersions` (only for records that keep versions): props `versions`, `viewing`,
  `currentVersion`, `loading`, `error`, `canRestore`, `restoreBlockedReason`; emits
  `view(v)`, `restore(v, reason, done)`, `retry`. While an old version is viewed, the pane
  shows it read-only with a "Back to current" banner and hides the NEXT bar.

### 4.5 `LifecycleStepper`

Documented in [`../components.md`](../components.md). Inside the panel use
`variant="compact"` in `#stepper`:

```vue
<template #stepper>
  <LifecycleStepper variant="compact" :steps="ORDER_STEPS" :current="order.status" aria-label="Order progress" />
</template>
```

`completed` defaults to every step before `current`. Keep the step set in one pure module
next to the status tone map, never inline in a view.

---

## 5. Pane = page

### 5.1 `documentDetail.ts`

```ts
import type { RouteLocationRaw } from 'vue-router'
import type { DocumentTotalRow } from './documentParts'
import { sectionAnchorId } from '@/components/form/formPage'

export interface DocumentTotalsInput {
  subtotal: number; discount?: number | null; tax?: number | null
  total: number; paid?: number | null; balance?: number | null; currency?: string | null
}

/** Subtotal · Discount · Tax · Total CUR · Paid · Balance due (rows with no value are skipped). */
export function documentTotalRows(t: DocumentTotalsInput, money: (n: number) => string): DocumentTotalRow[] {
  const rows: DocumentTotalRow[] = [{ key: 'subtotal', label: 'Subtotal', value: money(t.subtotal) }]
  if (t.discount) rows.push({ key: 'discount', label: 'Discount', value: `−${money(t.discount)}`, muted: true })
  if (t.tax != null) rows.push({ key: 'tax', label: 'Tax', value: money(t.tax) })
  rows.push({ key: 'total', label: t.currency ? `Total ${t.currency}` : 'Total', value: money(t.total), emphasis: true })
  if (t.paid) rows.push({ key: 'paid', label: 'Paid', value: money(t.paid) })
  if (t.balance) rows.push({ key: 'balance', label: 'Balance due', value: money(t.balance), tone: 'red' })
  return rows
}

/** A section's Edit: the edit route with ?section= and the card's anchor as hash. */
export function sectionEditRoute(routeName: string, id: number, section: string): RouteLocationRaw {
  return { name: routeName, params: { id }, query: { section }, hash: `#${sectionAnchorId(section)}` }
}

/** The tab a detail opens on: `?tab=` when it is one of the keys, else the fallback. */
export function initialDetailTab(requested: unknown, keys: readonly string[], fallback: string): string {
  const v = Array.isArray(requested) ? requested[0] : requested
  return typeof v === 'string' && keys.includes(v) ? v : fallback
}

export function queryTab(query: Record<string, unknown>): string | undefined {
  const v = Array.isArray(query.tab) ? query.tab[0] : query.tab
  return typeof v === 'string' && v !== '' ? v : undefined
}
```

Only the show page passes `:initial-tab="queryTab(route.query)"`; the list pane passes
nothing and opens on the default tab.

### 5.2 `DocumentDetailPage` (the `*.show` frame)

Props `backTo`, `backLabel`, `error`; emits `retry`; default slot. It renders a slim bar
(a `text` Button "‹ Orders" on the left, an optional help button right), then either the
error state (dashed box, `pi-exclamation-circle`, the sentence, **Try again** and "Back to
orders") or the slot. The frame is centred and capped at 1180px:

```vue
<div class="mx-auto flex w-full max-w-[1180px] min-w-0 flex-col gap-2">
  <nav class="flex items-center gap-2" aria-label="Breadcrumb">
    <Button :label="backLabel" icon="pi pi-angle-left" text size="small" @click="router.push(backTo)" />
    <span class="flex-1" />
    <slot name="bar-end" />
  </nav>
  <div v-if="error" role="alert"
       class="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-[var(--p-content-border-color)] px-5 py-12 text-center text-[var(--p-text-muted-color)]">
    <i class="pi pi-exclamation-circle text-2xl text-[var(--status-red-fg)]" aria-hidden="true" />
    <p class="m-0 text-[12.5px]">{{ error }}</p>
    <div class="flex gap-2">
      <Button label="Try again" icon="pi pi-refresh" size="small" severity="secondary" outlined @click="emit('retry')" />
      <Button :label="`Back to ${backLabel.toLowerCase()}`" size="small" text @click="router.push(backTo)" />
    </div>
  </div>
  <slot v-else />
</div>
```

### 5.3 Wiring

| | In the list (split pane) | On the show page |
|---|---|---|
| Component | `OrderDetail` in `ListPage #detail="{ id, close }"` | `OrderDetail layout="page"` in `DocumentDetailPage` |
| Fetch | `useDetailCache` in the list view, same service call | the page's own `fetchOrder(id)` |
| After a change | `details.invalidate(id)` + list `reload()` | refetch |
| After delete | clear `active`, reload | `router.push` to the list |
| "Full page" action | shown (`layout !== 'page'`) | hidden |

---

## 6. Worked example: order detail

### 6.1 The detail component

```vue
<!-- resources/js/pages/orders/OrderDetail.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import DocumentPanel from '@/components/document/DocumentPanel.vue'
import DocumentToolbar from '@/components/document/DocumentToolbar.vue'
import DocumentSection from '@/components/document/DocumentSection.vue'
import DocumentLines from '@/components/document/DocumentLines.vue'
import DocumentActivity from '@/components/document/DocumentActivity.vue'
import LifecycleStepper from '@/components/status/LifecycleStepper.vue'
import DetailGroup from '@/components/common/DetailGroup.vue'
import DetailField from '@/components/common/DetailField.vue'
import { documentTotalRows, initialDetailTab, sectionEditRoute } from '@/components/document/documentDetail'
import type { DocumentFact, DocumentNextStep, DocumentToolbarItem } from '@/components/document/documentParts'
import { ORDER_STEPS, orderStatusChip, orderNextStep } from './orderStatus'      // pure module
import { useMoney } from '@/composables/useMoney'
import { usePermission } from '@/composables/usePermission'
import type { Order } from '@/types/order'

const props = withDefaults(defineProps<{
  order: Order | null
  loading?: boolean
  error?: string | null
  layout?: 'pane' | 'page'
  initialTab?: string
}>(), { loading: false, error: null, layout: 'pane', initialTab: undefined })

const emit = defineEmits<{ retry: []; delete: [order: Order]; changed: [id: number]; ship: [order: Order]; cancel: [order: Order] }>()

const router = useRouter()
const { can } = usePermission()
const money = useMoney(() => props.order?.currency ?? null)

const TAB_KEYS = ['overview', 'shipments', 'history'] as const
const tab = ref(initialDetailTab(props.initialTab, TAB_KEYS, 'overview'))
const tabs = computed(() => [
  { key: 'overview', label: 'Overview' },
  { key: 'shipments', label: 'Shipments', count: props.order?.shipments_count ?? null },
  { key: 'history', label: 'History' },
])

const o = computed(() => props.order)
const status = computed(() => (o.value ? orderStatusChip(o.value.status) : null))   // { label, tone }
const facts = computed<DocumentFact[]>(() => (o.value ? [
  { key: 'date', label: 'Order date', value: o.value.ordered_on_label },
  { key: 'due', label: 'Required by', value: o.value.required_by_label },
  { key: 'items', label: 'Items', value: o.value.lines.length, mono: true },
  { key: 'total', label: 'Total', value: money(o.value.total), mono: true },
  { key: 'balance', label: 'Balance', value: money(o.value.balance), mono: true, tone: o.value.balance > 0 ? 'red' : undefined },
] : []))
const next = computed<DocumentNextStep | null>(() => (o.value ? orderNextStep(o.value, can) : null))
const totals = computed(() => (o.value ? documentTotalRows({
  subtotal: o.value.subtotal, discount: o.value.discount, tax: o.value.tax,
  total: o.value.total, paid: o.value.paid, balance: o.value.balance, currency: o.value.currency,
}, money) : []))

const canEdit = computed(() => !!o.value && can('orders.update') && o.value.can_edit)
const editBlocked = computed(() => (o.value && !o.value.can_edit ? o.value.edit_blocked_reason : null))
const toolbar = computed<DocumentToolbarItem[]>(() => (o.value ? [
  { key: 'edit', label: 'Edit', icon: 'pi pi-pencil', disabled: !canEdit.value, disabledReason: editBlocked.value,
    command: () => router.push({ name: 'orders.edit', params: { id: o.value!.id } }) },
  { key: 'email', label: 'Email', icon: 'pi pi-envelope', items: [
    { key: 'send', label: 'Send to customer', command: () => openEmail('send') },
    { key: 'copy', label: 'Email me a copy', command: () => openEmail('copy') },
  ] },
  { key: 'duplicate', label: 'Duplicate', icon: 'pi pi-copy', command: duplicate },
  { key: 'pdf', label: 'PDF', icon: 'pi pi-file-pdf', end: true, command: downloadPdf },
] : []))

function onNext() { if (o.value) emit('ship', o.value) }
function onNextAction(key: string) { if (key === 'cancel' && o.value) emit('cancel', o.value) }
const editSection = (key: string) => router.push(sectionEditRoute('orders.edit', o.value!.id, key))
/* openEmail, duplicate, downloadPdf: service calls, then emit('changed', id) */
</script>

<template>
  <div v-if="error && !order" role="alert" class="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
    <p class="m-0 text-[12.5px] text-[var(--p-text-muted-color)]">{{ error }}</p>
    <Button label="Try again" icon="pi pi-refresh" size="small" severity="secondary" outlined @click="emit('retry')" />
  </div>

  <DocumentPanel
    v-else
    v-model:tab="tab"
    doc-type="Order"
    :layout="layout"
    :number="o?.number ?? null"
    :status-label="status?.label ?? null"
    :status-tone="status?.tone ?? null"
    :title="o?.customer.name ?? null"
    :title-code="o?.customer.code ?? null"
    :subtitle="o ? `Placed ${o.ordered_on_label} · ${o.lines.length} items` : null"
    :facts="facts"
    :next="next"
    :tabs="o ? tabs : []"
    tabs-label="Order sections"
    :totals="tab === 'overview' ? totals : []"
    :loading="loading || !o"
    @next="onNext"
    @next-action="onNextAction"
  >
    <template v-if="o" #toolbar>
      <DocumentToolbar :items="toolbar" aria-label="Order actions" />
    </template>

    <template #actions>
      <Button v-if="layout !== 'page'" label="Full page" icon="pi pi-window-maximize" size="small"
              severity="secondary" outlined :disabled="!o" @click="router.push({ name: 'orders.show', params: { id: o!.id } })" />
      <Button v-if="o && can('orders.delete')" icon="pi pi-trash" severity="danger" text rounded
              aria-label="Delete order" v-tooltip.top="'Delete'" @click="emit('delete', o)" />
    </template>

    <template v-if="o" #stepper>
      <LifecycleStepper variant="compact" :steps="ORDER_STEPS" :current="o.status" aria-label="Order progress" />
    </template>

    <template v-if="o && tab === 'overview'">
      <DocumentSection title="Customer" section-key="details" :editable="can('orders.update')"
                       :edit-blocked-reason="editBlocked" @edit="editSection('details')">
        <DetailGroup title="Bill to">
          <DetailField label="Name" :value="o.customer.name" />
          <DetailField label="Email" :value="o.customer.email" />
          <DetailField label="Address" :value="o.billing_address_text" wide />
        </DetailGroup>
      </DocumentSection>

      <DocumentSection title="Items" :count="`${o.lines.length} lines`" section-key="lines"
                       :editable="can('orders.update')" :edit-blocked-reason="editBlocked" @edit="editSection('lines')">
        <DocumentLines :lines="o.lines.map(l => ({ key: l.id, name: l.name, code: l.sku, qty: String(l.qty), rate: money(l.rate), amount: money(l.amount) }))" />
      </DocumentSection>

      <DocumentSection v-if="o.internal_note" title="Internal note" variant="note">
        <p class="m-0 text-[12.5px]">{{ o.internal_note }}</p>
      </DocumentSection>
    </template>

    <OrderShipments v-else-if="o && tab === 'shipments'" :order-id="o.id" />

    <DocumentActivity v-else-if="o && tab === 'history'" subject-type="order" :subject-id="o.id" />
  </DocumentPanel>
</template>
```

`orderStatus.ts` holds the pure rules: `ORDER_STEPS` (Draft · Confirmed · Shipped ·
Delivered), `orderStatusChip(status)` → `{ label, tone }`, and `orderNextStep(order, can)`
→ the NEXT sentence plus its action (e.g. "Ship the remaining 3 items." + **Create
shipment**, with a danger secondary **Cancel order**). The server sends `can_edit` and
`edit_blocked_reason`, so the client never re-derives business rules.

### 6.2 In the list

```vue
<template #detail="{ id }">
  <OrderDetail
    :key="String(id)"
    :order="details.entry(id)?.data ?? null"
    :loading="details.entry(id)?.loading ?? true"
    :error="details.entry(id)?.error ?? null"
    @retry="details.ensure(id, true)"
    @changed="(oid) => { details.invalidate(oid); page.reload() }"
    @delete="confirmDelete"
  />
</template>
```

### 6.3 The show page

```vue
<!-- resources/js/pages/orders/OrderShowPage.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import DocumentDetailPage from '@/components/document/DocumentDetailPage.vue'
import { queryTab } from '@/components/document/documentDetail'
import OrderDetail from './OrderDetail.vue'
import { deleteOrder, fetchOrder } from '@/api/services/orderApi'
import { apiErrorMessage } from '@/utils/validation'
import type { Order } from '@/types/order'

const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const order = ref<Order | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try { order.value = await fetchOrder(Number(route.params.id)) }
  catch (e) { error.value = apiErrorMessage(e, 'Could not load this order.') }
  finally { loading.value = false }
}

function onDelete(o: Order) {
  confirm.require({
    header: 'Delete order', message: `Delete ${o.number}?`, acceptLabel: 'Delete',
    acceptProps: { severity: 'danger' }, rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => { await deleteOrder(o.id); await router.push({ name: 'orders.index' }) },
  })
}
onMounted(load)
</script>

<template>
  <DocumentDetailPage :back-to="{ name: 'orders.index' }" back-label="Orders" :error="error && !order ? error : null" @retry="load">
    <OrderDetail
      layout="page"
      :initial-tab="queryTab(route.query)"
      :order="order"
      :loading="loading"
      @retry="load"
      @changed="load"
      @delete="onDelete"
    />
  </DocumentDetailPage>
</template>
```

Never add an action to the show page: add it to `OrderDetail`, so pane and page stay one
action set.

---

## 7. Simple records: `DetailField` / `DetailGroup`

A record without lines, totals or a lifecycle (a product, a contact, a warehouse) still
uses `DocumentPanel` for the heading, facts and tabs, but its body is a definition grid:
`DetailGroup` (a small heading with a hairline rule, then a `<dl>` grid of 3 / 2 / 1
columns at >860 / >520 / smaller) of `DetailField`s (`label`, `value`, `mono`, `numeric`,
`wide`, `emptyText` "Not set"). Both are documented in
[`../components.md`](../components.md).

```vue
<!-- resources/js/pages/products/ProductDetail.vue (body only) -->
<DocumentPanel doc-type="Product" :layout="layout" :number="product?.sku ?? null"
               :status-label="statusLabel" :status-tone="statusTone" :title="product?.name ?? null"
               :facts="facts" :tabs="tabs" v-model:tab="tab" :loading="loading || !product">
  <template v-if="product?.image_url" #media>
    <img :src="product.image_url" alt="" class="size-14 rounded-lg border border-[var(--p-content-border-color)] object-cover" />
  </template>
  <template v-if="product && tab === 'overview'">
    <DetailGroup title="Catalogue">
      <DetailField label="Category" :value="product.category?.name" />
      <DetailField label="SKU" :value="product.sku" mono />
      <DetailField label="Unit" :value="product.unit" />
      <DetailField label="Description" :value="product.description" wide />
    </DetailGroup>
    <DetailGroup title="Stock">
      <DetailField label="In stock" :value="product.stock" numeric />
      <DetailField label="Reorder at" :value="product.reorder_level" numeric />
    </DetailGroup>
  </template>
  <DocumentActivity v-else-if="product && tab === 'history'" subject-type="product" :subject-id="product.id" />
</DocumentPanel>
```

Facts carry the few numbers people scan first (price, stock, last sold); the groups carry
everything else.
