# D1 layout — shared components

Small presentational components that give d1 pages their look. None of them fetches
data or reads a store. Pages pass everything in through props. They read only `--p-*`,
`--status-*`, `--avatar-tint-*` and the type/spacing tokens, so dark mode works with no
extra code.

| Component | Path (`resources/js/components/…`) | Purpose |
|---|---|---|
| `StatusChip` + `statusTones.ts` | `status/` | The one status pill, and the status → tone map |
| `VersionChip` | `status/` | "V3" / "V3 · not sent" on versioned records |
| `ListKpi` | `list/` | One 40px KPI / filter tile above a list |
| `ListAvatar` | `list/` | Initials avatar with a stable tint |
| `DetailField` / `DetailGroup` | `common/` | Read-only label/value grids on show pages |
| `InnerNavShell` / `InnerNavHub` | `common/` | Areas with their own inner sidebar (settings, imports) |
| `LifecycleStepper` | `common/` | Horizontal stepper for a record's lifecycle |

Generic PrimeVue usage (buttons, dialogs, tables, forms) stays in
`../../design-system/`. Where page blueprints differ in d1, they are in
`blueprints/` next to this file.

---

## `StatusChip` and `statusTones.ts`

### `statusTones.ts` (pure, no Vue)

The **one** place that maps a backend status string to a tone (`colors.md` → status
palette) and a display label. A status is looked up for its `kind` first, then in a
shared generic map, and falls back to gray.

```typescript
// resources/js/components/status/statusTones.ts
export type StatusTone = 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'teal'
export const STATUS_TONES: readonly StatusTone[] = ['gray', 'blue', 'amber', 'green', 'red', 'purple', 'teal']

/** The record families whose statuses the app shows. Extend per project. */
export type RecordKind = 'order' | 'invoice' | 'ticket'

type ToneMap = Readonly<Record<string, StatusTone>>

/** Statuses that mean the same thing everywhere. Kind maps list only what differs. */
const GENERIC: ToneMap = {
  draft: 'gray',
  open: 'blue', sent: 'blue', submitted: 'blue', confirmed: 'blue', posted: 'blue',
  pending: 'amber', partial: 'amber', processing: 'amber', in_progress: 'amber', on_hold: 'amber',
  accepted: 'green', approved: 'green', paid: 'green', delivered: 'green', completed: 'green', closed: 'green', active: 'green',
  overdue: 'red', expired: 'red', rejected: 'red', cancelled: 'red', void: 'red', failed: 'red',
  converted: 'purple', invoiced: 'purple', packed: 'purple',
  scheduled: 'teal', shipped: 'teal', in_transit: 'teal',
}

const BY_KIND: Readonly<Record<RecordKind, ToneMap>> = {
  order:   { draft: 'gray', confirmed: 'blue', processing: 'amber', shipped: 'teal', delivered: 'green', cancelled: 'red' },
  invoice: { draft: 'gray', sent: 'blue', partial: 'amber', paid: 'green', overdue: 'red', void: 'red' },
  ticket:  { open: 'blue', waiting_on_customer: 'amber', resolved: 'green', closed: 'gray' },
}

/** Labels that differ from the humanised status. Rename HERE, not in templates. */
const LABELS_BY_KIND: Partial<Record<RecordKind, Readonly<Record<string, string>>>> = {
  ticket: { waiting_on_customer: 'Waiting' },
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')

export function statusTone(status: string | null | undefined, kind?: RecordKind | null): StatusTone {
  const s = norm(status)
  if (!s) return 'gray'
  return (kind ? BY_KIND[kind][s] : undefined) ?? GENERIC[s] ?? 'gray'
}

/** "in_progress" → "In progress", unless the kind renames it. */
export function statusLabel(status: string | null | undefined, kind?: RecordKind | null): string {
  const s = norm(status)
  if (!s) return ''
  const override = kind ? LABELS_BY_KIND[kind]?.[s] : undefined
  if (override) return override
  const words = s.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export const toneVars = (tone: StatusTone) => ({ background: `var(--status-${tone}-bg)`, color: `var(--status-${tone}-fg)` })

/** Every step positioned before `current`: the default "completed" set for LifecycleStepper. */
export function stepsBefore(steps: readonly { key: string }[], current: string | null | undefined): string[] {
  const i = steps.findIndex((s) => s.key === current)
  return i <= 0 ? [] : steps.slice(0, i).map((s) => s.key)
}
```

Keep step definitions for steppers (`LifecycleStepDef[]`) in this file as well, so that
the chip label and the stepper label can never disagree.

### `StatusChip.vue`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `status` | `string \| null` | `null` | Raw backend value (`"in_progress"`, `"Paid"`, `"on-hold"`: normalised) |
| `kind` | `RecordKind \| null` | `null` | Selects the kind map |
| `label` | `string \| null` | `null` | Overrides the computed label |
| `tone` | `StatusTone \| null` | `null` | Overrides the computed tone |
| `size` | `'sm' \| 'md'` | `'sm'` | `sm` in tables and lists, `md` in page headers |
| `caret` | `boolean` | `false` | Trailing chevron, for a chip that opens a status menu (presentational only) |

No slots, no emits. Renders nothing when the label resolves to `''`. Exposes
`data-tone` for tests.

```vue
<span v-if="text" class="status-chip" :class="[`status-chip--${resolvedTone}`, `status-chip--${size}`]" :data-tone="resolvedTone">
  {{ text }}<i v-if="caret" class="pi pi-chevron-down status-chip-caret" aria-hidden="true" />
</span>

<style scoped>
.status-chip {
  display: inline-flex; align-items: center; gap: 4px;
  border-radius: var(--radius-md); font-weight: 500; line-height: 1.35; white-space: nowrap;
  background: var(--status-gray-bg); color: var(--status-gray-fg);
}
.status-chip--sm { font-size: 11.3px; padding: 2px 8px; }
.status-chip--md { font-size: 11.6px; padding: 4px 10px; }
.status-chip--blue   { background: var(--status-blue-bg);   color: var(--status-blue-fg); }
/* …amber, green, red, purple, teal: same pattern */
.status-chip-caret { font-size: 11px; opacity: 0.75; }
</style>
```

```html
<StatusChip :status="order.status" kind="order" />
<StatusChip status="active" />                         <!-- generic map → green -->
<StatusChip label="Overdue 12d" tone="red" size="md" /> <!-- fully explicit -->
<Column field="status" header="Status" class="col-center">
  <template #body="{ data }"><StatusChip :status="data.status" kind="invoice" /></template>
</Column>
```

Unit-test `statusTone` / `statusLabel` as pure functions: kind beats generic, generic
beats gray, normalisation of case, spaces and hyphens, and label overrides.

---

## `VersionChip`

For records that keep revisions (quotes, contracts, orders). It renders **nothing**
for a V1 that is not pending, so a list of untouched records stays quiet.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `version` | `number \| null` | `null` | Treated as 1 when missing, invalid or < 1 |
| `pending` | `boolean \| null` | `false` | Saved after it was sent, and not re-sent yet |
| `compact` | `boolean` | `false` | "V3" + an amber dot. The words go to a screen-reader-only span. |

| State | Renders |
|---|---|
| v ≤ 1, not pending | nothing |
| v > 1 | `V3`: neutral chip (`--status-gray-*`), number in the numeric face |
| pending | `V3 · not sent`: amber (`--status-amber-*`), with a `title` explaining it |
| pending + compact | `V3 ●` + `<span class="sr-only"> (not sent)</span>` |

```typescript
// status/versionChip.ts (pure)
export function versionChip(version: number | null | undefined, pending: boolean | null | undefined) {
  const v = Number(version ?? 1)
  const n = Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1
  if (n <= 1 && !pending) return null
  return { label: `V${n}`, version: n, pending: !!pending }
}
```

```css
.version-chip { display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 5px;
  font-size: 10.8px; font-weight: 600; line-height: 1.45; white-space: nowrap; vertical-align: middle;
  background: var(--status-gray-bg); color: var(--status-gray-fg); }
.version-chip-v { font-family: var(--font-numeric); font-variant-numeric: tabular-nums; }
.version-chip.is-pending { background: var(--status-amber-bg); color: var(--status-amber-fg); }
.version-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
```

Place it right after the record number: `<span class="num">Q-0042</span> <VersionChip :version="q.version" :pending="q.has_unsent_revision" compact />`.

---

## `ListKpi`

One overview tile in the KPI row above a list. It is a single **40px line**:

```
 ● Overdue   $1,333.50  · 3 invoices ..................... 23.9%
 ══════════ 2px share bar along the bottom ══════════
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | required | Muted, ellipsises |
| `value` | `string \| number` | required | **Pre-formatted** (currency, count). Numeric face, 15px/600. |
| `sub` | `string \| null` | `null` | Muted trailing text after "·". It ellipsises first. |
| `tone` | `StatusTone \| null` | `null` | Colors the dot, the share bar and the active border |
| `share` | `number \| null` | `null` | 0–100. Adds the % at the right edge and the bottom bar (clamped). |
| `active` | `boolean \| null` | `null` | A boolean makes the tile a **filter toggle**: `<button aria-pressed>`, tone border while pressed |
| `clickable` | `boolean` | `false` | A plain button with no pressed state |
| `alert` | `boolean` | `false` | Also colors the label and value with the tone (Overdue) |
| `icon` | `string \| null` | `null` | PrimeIcons class shown instead of the dot |
| `ariaLabel` | `string \| null` | `null` | Accessible name for a button tile |

| Emits | |
|---|---|
| `click(event: MouseEvent)` | Only when `active` is a boolean or `clickable` is set |

With neither `active` nor `clickable` it renders a static `<div>`.

```vue
<component :is="isButton ? 'button' : 'div'" :type="isButton ? 'button' : undefined"
  class="lk-tile" :class="{ 'is-button': isButton, 'is-active': active === true, 'is-alert': alert }"
  :style="tone ? { '--lk-tone': `var(--status-${tone}-fg)` } : undefined"
  :aria-pressed="isToggle ? String(!!active) : undefined" @click="isButton && emit('click', $event)">
  <i v-if="icon" :class="['lk-icon', icon]" aria-hidden="true" />
  <span v-else-if="tone" class="lk-dot" aria-hidden="true" />
  <span class="lk-label">{{ label }}</span>
  <span class="lk-value">{{ value }}</span>
  <span v-if="sub" class="lk-sub"><span aria-hidden="true">· </span>{{ sub }}</span>
  <span v-if="hasShare" class="lk-share">{{ shareText }}</span>
  <span v-if="hasShare && shareClamped > 0" class="lk-bar" :style="{ width: `${shareClamped}%` }" aria-hidden="true" />
</component>
```

```css
.lk-tile {
  --lk-tone: var(--p-text-muted-color);
  position: relative; display: flex; align-items: center; gap: 8px; min-width: 0;
  height: 40px; padding: 0 12px; overflow: hidden; text-align: left; font: inherit; color: inherit;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color); border-radius: var(--radius-lg);
}
.lk-tile.is-button { cursor: pointer; transition: border-color .12s, background-color .12s; }
.lk-tile.is-button:hover { border-color: var(--p-text-muted-color); }
.lk-tile.is-active { background: var(--p-content-hover-background); border-color: var(--lk-tone); box-shadow: inset 0 0 0 1px var(--lk-tone); }
.lk-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--lk-tone); }
.lk-label { font-size: 12.5px; color: var(--p-text-muted-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lk-value { flex: none; font-family: var(--font-numeric); font-variant-numeric: tabular-nums; font-size: 15px; font-weight: 600; color: var(--p-text-color); }
.lk-tile.is-alert :is(.lk-label, .lk-value) { color: var(--lk-tone); }
.lk-sub { flex: 0 3 auto; min-width: 0; font-size: 12px; color: var(--p-text-muted-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lk-share { margin-left: auto; flex: none; font-family: var(--font-numeric); font-size: 11.5px; color: var(--p-text-muted-color); }
.lk-bar { position: absolute; left: 0; bottom: 0; height: 2px; background: var(--lk-tone); opacity: .85; }
```

Lay tiles out in an auto-fit grid, one per row on phones:

```html
<div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5">
  <ListKpi label="Open" :value="fmt(openTotal)" :sub="`${openCount} invoices`" tone="blue" :share="openShare"
           :active="filter === 'open'" @click="toggle('open')" />
  <ListKpi label="Overdue" :value="fmt(overdueTotal)" tone="red" alert :active="filter === 'overdue'" @click="toggle('overdue')" />
</div>
```

---

## `ListAvatar`

An initials avatar. Use `circle` for people and `square` for organisations and groups.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `text` | `string` | required | Already-computed initials (`initials(name)`) |
| `size` | `number` | `32` | px. ≥ 40 → 14px text and 9px square radius; otherwise 11.5px text and 8px radius |
| `shape` | `'circle' \| 'square'` | `'circle'` | |
| `tone` | `StatusTone` | — | Color by meaning (`--status-<tone>-*`), e.g. an inactive user in gray |
| `tint` | `number` | `0` | 0–5, `--avatar-tint-<n>-*`. Use when `tone` is not given. |

Decorative: `aria-hidden="true"`. The name next to it carries the meaning.

```typescript
/** Up to two initials from the words; punctuation ignored; '?' when empty. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean)
  return words.length ? words.map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?'
}

/** A tint that is STABLE per record, so colors don't jump when a list re-sorts or filters. */
export function tintFor(key: string | number, count = 6): number {
  if (typeof key === 'number' && Number.isFinite(key)) return Math.abs(Math.trunc(key)) % count
  let h = 0
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0
  return Math.abs(h) % count
}
```

```css
.list-avatar { flex: none; display: grid; place-items: center; font-weight: 600; line-height: 1; letter-spacing: .01em; }
/* size, radius, background and color are bound inline from the props */
```

```html
<ListAvatar :text="initials(c.name)" :tint="tintFor(c.id)" />
<ListAvatar :text="initials(org.name)" shape="square" :size="42" :tint="tintFor(org.id)" />
```

---

## `DetailField` / `DetailGroup`

Read-only show pages are built from titled groups of label/value pairs, not from
disabled form inputs.

### `DetailGroup`

| Prop | Slot | |
|---|---|---|
| `title: string` | default: the `DetailField`s | Renders `<section><h3/><dl class="detail-grid"><slot/></dl></section>` |

```css
h3 { display: flex; align-items: center; gap: .5rem; margin: 0 0 .75rem; font-size: var(--text-sm); font-weight: 600; color: var(--p-text-color); }
h3::after { content: ''; flex: 1; height: 1px; background: var(--p-content-border-color); }  /* hairline to the right */
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem 1.5rem; margin: 0; }
@media (max-width: 860px) { .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .detail-grid { grid-template-columns: 1fr; } }
```

### `DetailField`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | required | `<dt>`: `--text-xs`, 500, muted |
| `value` | `string \| number \| null` | `null` | `<dd>`: `--text-base`, 500, `overflow-wrap: anywhere` |
| `mono` | `boolean` | `false` | Codes, SKUs, UPCs: mono face at `--text-sm` |
| `numeric` | `boolean` | `false` | Tabular figures |
| `wide` | `boolean` | `false` | `grid-column: 1 / -1` |
| `emptyText` | `string` | `'Not set'` | Shown, muted at 70% opacity and weight 400, when `value` is `null`, `undefined` or `''` |

| Slot | |
|---|---|
| default | Replaces the value (a link, a `StatusChip`, a formatted amount). Never treated as empty. |

It renders `<div class="detail-field"><dt/><dd/></div>`, which is valid inside a `<dl>`.
An empty value says "Not set", never "--" or "N/A", so missing reads as missing rather
than as data.

```html
<div class="card flex flex-col gap-6">
  <DetailGroup title="General">
    <DetailField label="Name" :value="product.name" />
    <DetailField label="SKU" :value="product.sku" mono />
    <DetailField label="Status"><StatusChip :status="product.status" /></DetailField>
    <DetailField label="Description" :value="product.description" wide />
  </DetailGroup>
  <DetailGroup title="Pricing">
    <DetailField label="Price"><span class="num">{{ money(product.price) }}</span></DetailField>
  </DetailGroup>
</div>
```

---

## `InnerNavShell` / `InnerNavHub`

For an area that is "a directory of modules + one page per module" (Settings, Imports,
Master data). The area keeps the app sidebar and adds its own **inner nav card** on
the left of the content. These are **components the view wraps itself in**, not a
route-level layout, so the router stays flat.

```typescript
// common/innerNav.ts
export interface InnerNavItem {
  key: string            // matched against activeKey; usually the URL slug
  label: string
  icon: string           // 'pi pi-…'
  description: string    // one line, shown on hub cards only
  to: RouteLocationRaw
}
export interface InnerNavSection { label: string; items: InnerNavItem[] }
```

The section list can be static config (filtered by permission in a computed) or
server-driven. Both components take the same `InnerNavSection[]`.

### `InnerNavShell`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | required | Area name at the top of the nav card |
| `homeTo` | `RouteLocationRaw` | required | The hub route |
| `sections` | `InnerNavSection[]` | required | |
| `activeKey` | `string \| null` | `null` | Highlights that row. On a module page the title becomes a "← Title" link back to the hub; on the hub (null) it is a plain label. |
| `loading` | `boolean` | `false` | First paint only: 4 skeleton rows the size of the real nav |
| `settled` | `boolean` | `true` | Show `emptyLabel` only when the caller has an answer (a failed fetch is not "empty") |
| `emptyLabel` | `string` | `'Nothing here.'` | |

| Slot | |
|---|---|
| default | The page content (right column) |

```css
.inner-nav-shell { display: flex; align-items: flex-start; gap: 1.25rem; }
.inner-nav { flex: 0 0 13.5rem; width: 13.5rem; }                  /* ~189px */
.inner-nav-content { flex: 1 1 auto; min-width: 0; }
.nav-card { position: sticky; top: 1.25rem; padding: .5rem;
  background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: var(--radius-lg); }
.nav-title { padding: .5rem .75rem .75rem; font-size: .957rem; font-weight: 600; letter-spacing: -0.01em; }
.nav-group { margin: 0 0 .25rem; padding: 0 .75rem; font-size: .786rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--p-text-muted-color); }
.nav-section + .nav-section { margin-top: .875rem; }
.nav-link { display: flex; align-items: center; gap: .625rem; padding: .4375rem .75rem; border-radius: var(--radius-lg);
  font-size: .871rem; color: var(--p-text-color); text-decoration: none; }
.nav-link:hover { background: var(--p-content-hover-background); }
.nav-link.is-active {
  /* color-mix keeps one rule right in both themes */
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  color: var(--p-primary-color); font-weight: 600;
}
/* Below 1100px the nav becomes a strip above the page. It never disappears:
   a module page has no other way to a sibling. */
@media (max-width: 1100px) {
  .inner-nav-shell { flex-direction: column; gap: 1rem; }
  .inner-nav { flex: none; width: 100%; }
  .nav-card { position: static; }
}
```

Links are `RouterLink`s with `aria-current="page"` on the active one. The nav is a
`<nav :aria-label="title">`.

### `InnerNavHub`

The body of the area's hub page: a heading, a lead paragraph, then a card grid per
section.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | required | `h1`, 1.5rem/600 |
| `sections` | `InnerNavSection[]` | required | |
| `loading` | `boolean` | `false` | 4 skeleton cards (5.25rem tall) |
| `settled` | `boolean` | `true` | As above |
| `emptyLabel` | `string` | `'There is nothing available to you here.'` | |
| `layout` | `'cards' \| 'rows'` | `'cards'` | `cards`: two-up grid inside a 60rem measure, for short labels. `rows`: one card per row, full width, for entries with a sentence of description. |

| Slot | |
|---|---|
| `lead` | Paragraph under the title (max 46rem, muted, line-height 1.55) |
| `actions` | Right side of the header |

Each module card is a `RouterLink`: a 2.25rem icon square tinted with
`color-mix(in srgb, var(--p-primary-color) 12%, transparent)`, the title (600), the
description (muted, 0.829rem) and a faint chevron. On hover it takes
`--p-content-hover-background` and a border mixed 40% toward primary. The grid is a
single column at ≤ 720px.

```vue
<!-- views/settings/SettingsHubView.vue -->
<InnerNavShell title="Settings" :home-to="{ name: 'settings.index' }" :sections="sections">
  <InnerNavHub title="Settings" :sections="sections">
    <template #lead>Company details, users, numbering and integrations.</template>
  </InnerNavHub>
</InnerNavShell>

<!-- views/settings/NumberingView.vue -->
<InnerNavShell title="Settings" :home-to="{ name: 'settings.index' }" :sections="sections" active-key="numbering">
  <div class="page-header mb-4">…</div>
  <div class="card">…</div>
</InnerNavShell>
```

---

## `LifecycleStepper`

A horizontal stepper that shows where a record is in its flow. It is purely
presentational: the page decides `current` and, optionally, `completed`.

```typescript
export interface LifecycleStep {
  key: string
  label: string
  sub?: string                 // sub-label, pills variant only
  count?: number | null        // small numeric badge (e.g. open records at that stage)
  to?: RouteLocationRaw        // makes the step a RouterLink
}
export type LifecycleStepState = 'done' | 'current' | 'upcoming'
```

| Prop | Type | Default | Notes |
|---|---|---|---|
| `steps` | `readonly LifecycleStep[]` | required | Define step sets next to the tone map in `statusTones.ts` |
| `current` | `string \| null` | `null` | Key of the current step |
| `completed` | `readonly string[] \| null` | `null` | Keys shown as done. Omitted → every step before `current` (`stepsBefore`). Pass it explicitly for non-linear flows. |
| `variant` | `'pills' \| 'compact'` | `'pills'` | See below |
| `ariaLabel` | `string` | `'Lifecycle'` | On the `<ol>` |

No slots, no emits. Each `<li>` carries `data-state`. The current step has
`aria-current="step"`, and each step has a screen-reader-only "(completed)" /
"(current)" suffix.

| Variant | Look | Use |
|---|---|---|
| `pills` | 29px rounded pills joined by `pi-arrow-right` arrows. Each pill holds a 19px numbered marker, the label (12.5px/600), the optional `sub` (75% opacity) and an optional `count` pill. | A flow across record types in a page header (Quote → Order → Invoice) |
| `compact` | A 20px marker + label (11.9px) + a 1px rule to the next step. The steps flex to fill the width and wrap. | A record's own status lifecycle inside a detail panel |

States (both variants):

| State | Marker | Pill / label |
|---|---|---|
| `done` | `pi-check` on `--status-green-bg` / `-fg` | normal. In compact the following rule is green at 50%. |
| `current` | inverse: `--p-surface-0` on ink | the pill is **filled with ink** (zinc-900 light / zinc-50 dark), the text inverse. In compact the label is 600. |
| `upcoming` | the step number on `--p-surface-100` (`--p-surface-800` dark) | muted label in compact |

```css
.ls-root {
  --ls-ink: var(--p-surface-900); --ls-on-ink: var(--p-surface-0);
  --ls-track: var(--p-surface-100); --ls-border: var(--p-content-border-color);
  --ls-done-bg: var(--status-green-bg); --ls-done-fg: var(--status-green-fg);
  list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center;
}
:global(html.dark-mode .ls-root.ls-root) { --ls-ink: var(--p-surface-50); --ls-on-ink: var(--p-surface-900); --ls-track: var(--p-surface-800); }
.ls-mark { display: grid; place-items: center; flex: none; border-radius: 999px;
  font-family: var(--font-numeric); font-variant-numeric: tabular-nums; font-weight: 600; }
.ls-pill { display: flex; align-items: center; gap: 7px; height: 29px; padding: 0 12px 0 5px;
  border: 1px solid var(--ls-border); border-radius: 999px; background: var(--p-content-background);
  color: var(--ls-ink); font-size: 12.5px; font-weight: 600; white-space: nowrap; text-decoration: none; }
.ls--pills .is-current .ls-pill { background: var(--ls-ink); border-color: var(--ls-ink); color: var(--ls-on-ink); }
.ls--pills .is-current .ls-mark { background: var(--ls-on-ink); color: var(--ls-ink); }
.ls--pills .is-done .ls-mark, .ls--compact .is-done .ls-mark { background: var(--ls-done-bg); color: var(--ls-done-fg); }
.ls--compact .ls-step { display: flex; align-items: center; flex: 1 1 100px; min-width: 96px; gap: 7px; }
.ls--compact .ls-step:last-child { flex: 0 1 auto; }
.ls-rule { flex: 1; min-width: 7px; height: 1px; margin-right: 7px; background: var(--ls-border); }
.ls--compact .is-done .ls-rule { background: color-mix(in srgb, var(--status-green-fg) 50%, transparent); }
```

The `html.dark-mode` selector plus the doubled class out-ranks the scoped
`.ls-root[data-v-…]` rule, whatever the source order.

```typescript
// statusTones.ts
export const ORDER_STEPS: readonly LifecycleStep[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]
```

```html
<LifecycleStepper :steps="ORDER_STEPS" :current="order.status" variant="compact" aria-label="Order status" />

<LifecycleStepper
  :steps="[
    { key: 'quote', label: 'Quote', sub: 'Price offer', to: { name: 'quotes.index' }, count: openQuotes },
    { key: 'order', label: 'Order', sub: 'Confirm', to: { name: 'orders.index' }, count: openOrders },
    { key: 'invoice', label: 'Invoice', sub: 'Bill & get paid', to: { name: 'invoices.index' } },
  ]"
  current="order"
  aria-label="Sales flow"
/>
```

A cancelled record is not a step. Show the stepper up to the last real state and put
a red `StatusChip` next to it, or hide the stepper.
