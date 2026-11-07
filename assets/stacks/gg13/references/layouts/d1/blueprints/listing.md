# d1 blueprint: list page (`ListPage`)

> **Layout override.** This file replaces the **page markup** of
> [`../../../blueprints/listing.md`](../../../blueprints/listing.md) for projects on the
> `d1` layout. The migration, model, resource controller (`index()` with filter / sort /
> paginate), form requests, resource collection, routes and Pest tests still come from
> that shared blueprint, and the response shapes from
> [`../../../rules/api.md`](../../../rules/api.md). Precedence rules:
> [`../../README.md`](../../README.md).
>
> Related d1 files: [`../shell.md`](../shell.md) (the page frame and its height
> variables), [`../colors.md`](../colors.md), [`../typography.md`](../typography.md),
> [`../spacing.md`](../spacing.md), [`../components.md`](../components.md) (`StatusChip`,
> `ListKpi`, `ListAvatar`, `DetailField`, `LifecycleStepper`). The split-view detail pane
> is described in [`detail-page.md`](detail-page.md).

A d1 list page is one generic, config-driven shell, `ListPage.vue`, plus a composable,
`useListPage`, that does the server plumbing. A list view supplies configuration and
slots; it never builds its own header, toolbar, table or empty state.

```
resources/js/components/list/
  ListPage.vue           the shell (generic over the row type T)
  listPage.ts            types + pure helpers (no Vue import, unit-tested)
  ListCard.vue           standard card body for the cards view
  ListCheckbox.vue       <button role="checkbox"> with aria-checked true/false/mixed
  ListSegmentTabs.vue    segmented tabs (WAI-ARIA tabs pattern)
  ListSettingsButton.vue the toolbar cog (refresh, export, column toggles)
  ListCells.ts           gives each top-level node of #row role="cell"
resources/js/composables/
  useListPage.ts         filters, server paging, sort, columns, export, ?open=
  useServerPagedList.ts  page 1 replaces, Load more appends
  useFilterState.ts      filters remembered per tab (sessionStorage)
  useTableSettings.ts    visible columns remembered per viewer
  useDetailCache.ts      per-id cache for the split detail pane
```

`ListKpi`, `ListAvatar` and `StatusChip` live with the other shared pieces in
[`../components.md`](../components.md).

---

## 1. Anatomy

Top to bottom. Every region renders only when its prop or slot is present, so an
adopter pays nothing for regions it does not use.

```
┌ #ribbon ─────────────────────────────────────────────────────────────┐  optional (e.g. LifecycleStepper)
│ Products                                         [Import ▾] [+ New ▾] │  header: title, lead, secondaryActions, primaryAction
│ Everything you sell, with stock and price.                            │
├──────────────────────────────────────────────────────────────────────┤
│ [All 128 | Active 97 | Draft 21]          [Split|Table|Cards]  Expand │  row 2: tabs · view toggle · expand/collapse (groups)
├ #kpis ───────────────────────────────────────────────────────────────┤  ListKpi tiles, auto-fit grid
├ #banner ─────────────────────────────────────────────────────────────┤  full-width notice (archive view…)
│ ┌ #rail ┐ ┌ list card ─────────────────────────────────────────────┐ │
│ │ 240px │ │ [☐ Select all 48] [🔍 Search…] [+ Category] [Date] … ⚙ │ │  toolbar
│ │       │ │ (All 128) (● Active 97) (● Draft 21) (● Archived 10)    │ │  status chips with counts
│ │       │ │ ███ 3 selected  Select all 128 matching  Clear   Archive│ │  sticky bulk bar
│ │       │ │ ID  Name            SKU      Category   Stock   Price   │ │  CSS-grid ARIA table header
│ │       │ │ …rows…                                                  │ │
│ │       │ │            ⌄ Load more (50 of 128)                      │ │
│ └───────┘ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**Views.** A page lists the views it offers in `views`; the toggle appears with two or
more.

| View key | Body |
|---|---|
| `table` | CSS-grid ARIA table (`role="table"`, `rowgroup`, `row`, `columnheader` with `aria-sort`, `cell`). **Not** PrimeVue `DataTable`. Columns drive `grid-template-columns` |
| `cards` | Auto-fill card grid (`minmax(cardMinWidth, 1fr)`, default 260px); adopter renders `<ListCard>` in `#card` |
| `split` | 360px compact list on the left, detail pane on the right (`#detail`), mirrored to `?open=<id>` |
| any other key | **Custom view**: `#custom="{ view }"` replaces the whole list body (skeleton, empty state and paging are then the adopter's) |

Remember the chosen view per viewer with `loadListPrefs` / `saveListPrefs` (localStorage
behind try/catch).

---

## 2. Look: the parts that define d1

These excerpts are the parts of the shell's scoped CSS that make the d1 look. The rest
(spacing of every sub-element) follows [`../spacing.md`](../spacing.md).

### 2.1 Tokens: `--lp-*` read `--p-*`

All shell colours are custom properties on `.lp-root`. Structural tokens read the
PrimeVue preset (built with `@primeuix/themes`, see [`../colors.md`](../colors.md)), with
a light fallback, so a preset change re-themes the list. Adopters use `var(--lp-*)`,
never hex.

```css
.lp-root {
  --lp-font-text: var(--font-text, inherit);          /* text face, ../typography.md */
  --lp-font-num: var(--font-numeric, monospace);      /* numeric face: counts, codes, money */
  --p-font-family: var(--lp-font-text);               /* carries the face into PrimeVue controls */
  font-family: var(--lp-font-text);

  --lp-ink: var(--p-surface-900, #18181b);            /* titles, dark buttons, active chip */
  --lp-on-ink: var(--p-surface-0, #fff);
  --lp-text: var(--p-text-color, #3f3f46);
  --lp-text-2: var(--p-surface-600, #52525b);
  --lp-muted: var(--p-text-muted-color, #71717a);
  --lp-faint: var(--p-surface-400, #a1a1aa);
  --lp-surface: var(--p-content-background, #fff);
  --lp-border: var(--p-content-border-color, #e7e7ea);
  --lp-control-border: var(--p-content-border-color, #e4e4e7);
  --lp-dashed: var(--p-surface-300, #d4d4d8);         /* unset filter chips */
  --lp-line: var(--p-surface-100, #f0f0f2);
  --lp-line-soft: var(--p-surface-100, #f4f4f5);
  --lp-head-bg: var(--p-surface-50, #fafafa);         /* table head, set chip */
  --lp-row-hover: var(--p-surface-50, #fafafa);
  --lp-row-selected: #f4f6fb;                         /* literal on purpose */
  --lp-bulk-bg: var(--lp-ink);
  --lp-bulk-fg: var(--lp-on-ink);
  --lp-split-divider: var(--p-surface-600, #52525b);
  /* Tag tones and avatar tints are NOT defined here: use the global
     --status-<gray|blue|amber|green|red|purple|teal>-bg/-fg and
     --avatar-tint-<0..5>-bg/-fg palettes from ../colors.md (StatusChip, ListAvatar). */
}

/* Dark mode: d1 sets darkModeSelector to `.dark-mode` (../shell.md). Tokens bound to
   semantic preset variables flip by themselves; only the ones pinned to a surface step
   move. The doubled class out-ranks the scoped rule regardless of source order. */
:global(.dark-mode .lp-root.lp-root) {
  --lp-ink: var(--p-surface-50, #fafafa);
  --lp-on-ink: var(--p-surface-900, #18181b);
  --lp-text-2: var(--p-surface-400, #a1a1aa);
  --lp-dashed: var(--p-surface-600, #52525b);
  --lp-line: var(--p-surface-800, #27272a);
  --lp-head-bg: var(--p-content-hover-background, #1f1f22);
  --lp-row-selected: #1d2332;
  --lp-bulk-bg: var(--p-surface-700, #3f3f46);
  /* … one line per pinned token (tones/tints flip in ../colors.md) */
}
```

The `--lp-*` tokens and their dark values only exist inside a `ListPage`, because they are
defined on its root. `ListCard` and `ListSegmentTabs` carry light fallbacks so they still
render on their own.

### 2.2 Height budget

The shell fills the viewport below the top bar and scrolls **inside the list card**, so
the bulk bar can stick to the card's top and the header stays put.

```css
.lp-root {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: calc(100vh - var(--layout-topbar-height) - 2 * var(--layout-content-padding));
  min-height: 357px;
  color: var(--lp-ink);
}
.lp-main  { flex: 1; min-height: 0; display: flex; gap: 12px; }        /* rail + stage */
.lp-card  { flex: 1; min-height: 0; overflow: auto;                     /* scrolls, both axes */
            background: var(--lp-surface); border: 1px solid var(--lp-border); border-radius: 12px; }
@media (max-width: 640px) { .lp-root { height: auto; min-height: 0; } } /* phones: page scroll */
```

`--layout-topbar-height` and `--layout-content-padding` are set by the d1 shell
([`../shell.md`](../shell.md)); use the names it defines. Never override `.lp-root`'s
height to fit something above the header: put it in `#ribbon`, inside the budget.

### 2.3 Header and buttons

Title 23px / 600 / `-0.02em`, lead 12.8px muted. Buttons are 31px high, 8px radius,
12.5px / 500. The primary action is **ink-filled** (`.lp-btn-dark`), not the preset's
primary colour; with `items` it becomes a PrimeVue `SplitButton` (`.lp-btn-split`) with a
1px divider before the chevron. Secondary actions are outline (`.lp-btn-outline`). The
rules are written as `.lp-actions :deep(...)`, so buttons an adopter puts in `#actions`
get the same look by class.

```css
.lp-actions :deep(.lp-btn-dark.p-button),
.lp-actions :deep(.lp-btn-split .p-button) {
  height: 31px; background: var(--lp-ink); border-color: var(--lp-ink);
  color: var(--lp-on-ink); font-size: 12.5px; font-weight: 500;
}
.lp-actions :deep(.lp-btn-outline.p-button) {
  height: 31px; padding: 0 12px; border: 1px solid var(--lp-control-border);
  background: var(--lp-surface); color: var(--lp-ink); border-radius: 8px;
}
```

### 2.4 Toolbar: search, dashed "+ Label" chips, status chips

- **Search**: `IconField` + `InputIcon pi-search` + `InputText`, 280px (full width in split
  and on phones).
- **Filter chips**: one PrimeVue `Select` per `filterDefs` entry, 29px high. While unset it
  is **dashed** and reads `+ Category` with no chevron; once set it is solid, tinted
  `--lp-head-bg`, reads `Category: Shoes` and shows a clear icon (unless the def has a
  `defaultValue`).

```css
.lp-chip               { height: 29px; border-radius: 8px; border: 1px solid var(--lp-control-border); }
.lp-chip:not(.is-set)  { border-style: dashed; border-color: var(--lp-dashed); }
.lp-chip:not(.is-set) :deep(.p-select-dropdown) { display: none; }
.lp-chip.is-set        { background: var(--lp-head-bg); }
```

- **Date filter**: a date-range control with presets (dashed while unset, like the chips).
  Build it from PrimeVue `DatePicker selectionMode="range"` in a `Popover` with preset
  buttons (Today, This week, This month, Last 30 days, This year).
- **Settings cog** (`ListSettingsButton`): always last; it pushes itself to the right.
- **Status chips**: a row under the toolbar (`role="group"`, buttons with `aria-pressed`).
  "All" first. Pills 27px, radius 999px; the pressed chip is ink-filled; counts in the
  numeric face; `tone` adds a 7px dot from `--status-<tone>-fg`. It wraps in table /
  cards and scrolls on one line in the narrow split column.

### 2.5 Table (CSS grid, not DataTable)

```css
.lp-thead { display: grid; gap: 14px; padding: 8px 17px; background: var(--lp-head-bg);
            border-block: 1px solid var(--lp-line); font-size: 11.9px; color: var(--lp-muted); }
.lp-row   { display: grid; gap: 14px; align-items: center; padding: 8px 17px; min-height: 48px;
            border-bottom: 1px solid var(--lp-line-soft); background: var(--lp-surface); cursor: pointer; }
.lp-row:hover       { background: var(--lp-row-hover); }
.lp-row.is-selected { background: var(--lp-row-selected); }
```

`grid-template-columns` comes from `gridTemplate(columns, selectable, expandable)`: a
28px checkbox track when selectable, a 24px chevron track when rows expand, then each
column's `width` (`'64px'`, `'minmax(160px,1.8fr)'`). Give the card inner a `min-width`
(`tableMinWidth`, default 760) so a wide table scrolls horizontally inside the card.
Header sort buttons show `↑` / `↓` and carry an `aria-label` with the current direction.
A `#table-footer` slot renders a sticky totals row on the same grid.

### 2.6 Bulk bar

Appears when `bulkActions` exist and something is selected. Ink-filled, 10px radius,
`position: sticky; top: 0` inside the scrolling card. "N selected · Select all N matching ·
Clear … [actions]". A danger action is light red on ink.

### 2.7 Row links (`rowHref`)

Rows, cards and split rows get an invisible full-size anchor, so middle click, ctrl/cmd
click and the context menu act on a real link, while a plain click still opens the row in
place.

```html
<a v-if="rowHref && hrefOf(item)" class="lp-rowlink" :href="hrefOf(item)"
   tabindex="-1" aria-hidden="true" @click="onRowLinkClick" />
```

```css
.lp-row.is-linked, .lp-item-card.is-linked, .lp-srow.is-linked { position: relative; }
.lp-rowlink { position: absolute; inset: 0; z-index: 1; border-radius: inherit; }
.is-linked :deep(button), .is-linked :deep(a:not(.lp-rowlink)), .is-linked :deep(input),
.is-linked :deep(.p-select), .is-linked :deep([role='checkbox']) { position: relative; z-index: 2; }
```

`onRowLinkClick(e)` calls `e.preventDefault()` only when `isPlainClick(e)`; the click then
bubbles to the row, which emits `open` (or activates in split).

### 2.8 Split mode

```css
.lp-stage          { flex: 1; min-width: 0; min-height: 0; display: flex; gap: 12px; }
.lp-card--split    { flex: 0 0 var(--lp-split-w, 360px); max-width: var(--lp-split-w, 360px); }
.lp-srow           { display: flex; align-items: center; gap: 8px; padding: 9px 12px;
                     border-bottom: 1px solid var(--lp-line-soft); cursor: pointer; }
.lp-srow.is-active { background: var(--lp-row-selected); box-shadow: inset 3px 0 0 var(--lp-ink); }
.lp-detail         { flex: 1; min-width: 0; min-height: 0; overflow: auto; }
.lp-detail-empty   { border: 1px dashed var(--lp-dashed); border-radius: 12px; min-height: 204px; }

/* Below 1024px: list, then detail with a Back button. Pure CSS. */
@media (max-width: 1023px) {
  .lp-stage.is-split > .lp-card--split { flex: 1; max-width: none; }
  .lp-stage.is-split.is-detail-open > .lp-card--split,
  .lp-stage.is-split:not(.is-detail-open) > .lp-detail,
  .lp-rail.is-hidden-narrow, .lp-splitrail, .lp-collapse { display: none; }
  .lp-detail-back { display: inline-flex; }
}
@media (max-width: 640px) { .lp-main { flex-direction: column; } .lp-rail { flex: none; } }
```

A split row reads:

```
[avatar] Title ...................... amount
         CODE · meta ............ [StatusChip]
         optional muted hint line
```

The split bar above the rows holds, in order: the count line ("50 of 128 products"), a
compact **Sort ▾** picker (split has no column headers) and a collapse button that folds
the list to a 44px rail with the title written vertically (`splitCollapsible`, wide
screens only).

### 2.9 Empty and loading states

- **Loading**: skeleton rows matching the layout (8 grid rows in table, 8 two-line rows in
  split, 6 cards in cards). PrimeVue `Skeleton`.
- **Empty, filtered** (`noun` set): `pi-filter-slash` + "No products match these filters"
  + **Clear filters** (outlined, small).
- **Empty, nothing yet**: `pi-inbox` + "No products yet" + the create action's button.
- `#empty="{ filtered }"` overrides both.

---

## 3. `ListPage` contract

Generic over the row type: `<script setup lang="ts" generic="T">`. Required props:
`title`, `getId`, `getLabel` (it names every card button and checkbox).

### 3.1 Props

| Prop | Type | Region / effect | Absent → |
|---|---|---|---|
| `title`, `lead` | `string` | Header | — |
| `primaryAction` | `{ label, icon?, command, items?: MenuItem[] }` | Ink button; with `items` a `SplitButton` | no button |
| `secondaryActions` | `{ key, label, icon?, command?, menu?, disabled?, loading? }[]` | Outline buttons; `menu` adds a chevron + PrimeVue `Menu` | none |
| `tabs`, `tabsLabel` | `{ key, label, icon?, count? }[]` | Segmented tab bar | no bar |
| `views` | `{ key, label, icon? }[]` | View toggle (2+ entries); keys `cards` / `table` / `split` / custom | layout = `views[0]`, else table if `columns`, else cards |
| `items` | `T[]` | Flat list (the loaded rows) | — |
| `groups` | `ListGroup<T>[]` | Collapsible groups, tri-state group checkbox, Expand / Collapse all | flat list |
| `columns` | `{ key, label, width, align?, sortable? }[]` | Table header + grid tracks | — |
| `sort` | `{ key, dir }` | Arrow on the sorted header | — |
| `sortOptions` | `{ key, dir, label }[]` | Split mode's Sort picker | no picker |
| `bulkActions` | `{ key, label, icon?, danger?, menu? }[]` | Checkboxes, Select all, sticky bulk bar | **no checkboxes, no bulk bar** |
| `searchable`, `searchPlaceholder`, `searchDebounce` | `boolean`, `string`, `number` (ms) | Search box; the `search` model follows after `searchDebounce` ms of quiet | shown, no debounce |
| `filterDefs` | `{ key, label, options, filterable?, defaultValue? }[]` | Dashed "+ Label" chips | none |
| `groupByOptions` | `{ value, label }[]` | "Group by X" select | hidden |
| `statusChips`, `statusAllCount`, `statusAllLabel`, `statusChipsLabel` | `{ key, label, count?, tone? }[]`… | Status chip row, "All" first | none |
| `dateFilter` | `{ placeholder? }` | Date-range control in the toolbar | none |
| `settings` | `{ columnDefs?, showColumns?, showRefresh?, showExport?, exporting? }` | `ListSettingsButton`, last in the toolbar | none |
| `loading` | `boolean` | Skeletons | — |
| `filtered`, `noun`, `createAction` | `boolean`, plural noun, action | Standard empty states | `emptyTitle` / `emptyFilteredTitle` |
| `itemsTotal`, `itemsHasMore`, `itemsLoadingMore` | `number`, `boolean`, `boolean` | "Load more (x of N)" row | none |
| `matchingTotal`, `pruneSelection` | `number`, `boolean` (default `true`) | "Select all N matching"; selection lifetime | not offered; prune |
| `rowHref` | `(item) => string \| { name, params?, query? }` | Link overlay on rows / cards / split rows | no links |
| `rowClass` | `(item) => string \| string[] \| Record<string, boolean>` | Extra classes on rows, cards, split rows | — |
| `expandableRows` | `boolean \| (item) => boolean` | Table: chevron track + `#row-expansion` | — |
| `splitFields` | `{ title, code?, meta?, amount?, status?, avatar?, hint? }` (accessors) | Split row content | `getLabel` |
| `openQueryKey` | `string` (use `'open'`) | Mirrors the active row to `?open=<id>` | URL untouched |
| `splitAutoSelect` | `boolean` (default `true`) | Opens the first row on wide screens | — |
| `splitListWidth` | `number` (default 360) | List column width | — |
| `splitEmptyText` | `string` | Dashed box when no row is open | "Select a row to see it here." |
| `splitCollapsible`, `splitCount` | `boolean` | Collapse-to-rail button; "N of M noun" line | — |
| `noticeAction` | `{ label, icon?, command }` | Button in the green notice strip (Undo) | — |
| `cardMinWidth`, `tableMinWidth` | `number` | Card track min; table min width | 260, 760 |

The shell does **no permission checks**. Filter `primaryAction`, `secondaryActions` and
`bulkActions` with the viewer's permissions before passing them.

### 3.2 v-models

| Model | Type | Notes |
|---|---|---|
| `tab` | `string` | Active segment tab |
| `view` | `string` | Active view key |
| `search` | `string` | Debounced by `searchDebounce` |
| `filterValues` | `Record<string, string \| number \| null>` | One key per `filterDefs` entry |
| `status` | `string` | `''` = All |
| `dateRange` | `[Date \| null, Date \| null]` | The config prop is `dateFilter`; Vue cannot have a `dateRange` prop and model both |
| `groupBy` | `string` | |
| `selected` | `ListId[]` | Bulk selection |
| `allMatching` | `boolean` | Server-side "all N matching" |
| `active` | `ListId \| null` | Split mode's open row (independent of `selected`) |
| `expanded` | `Record<groupKey, boolean>` | Absent key = open |
| `expandedRows` | `ListId[]` | Expanded table rows |
| `visibleColumns` | `string[]` | Straight from `useTableSettings` |
| `splitCollapsed` | `boolean` | List folded to the rail |
| `notice` | `string` | Green strip text; any selection change clears it |

Each has a local default, so an adopter binds only what it uses.

### 3.3 Emits

| Event | Payload | When |
|---|---|---|
| `open` | `item: T` | Row / card click or Enter (not in split mode: there the pane is the destination) |
| `bulk` | `key, ids: ListId[], { allMatching }` | Bulk action (a `menu` entry emits the entry's key) |
| `sort` | `columnKey` | Header click; the adopter cycles (`cycleSort`) |
| `sort-select` | `{ key, dir }` | Split Sort picker; apply as given |
| `load-more` | `groupKey` | Flat mode emits `LIST_FLAT_KEY` (`'__flat'`) |
| `clear-filters` | — | Empty state's Clear filters. The shell has already reset search, chips, status and date range; reset the rest (`clearFilters()` from `useListPage`) |
| `refresh`, `export-csv`, `export-pdf` | — | Re-emitted from the settings cog |

### 3.4 Slots

| Slot | Props | Use |
|---|---|---|
| `#ribbon` | — | Above the header (a `LifecycleStepper`) |
| `#actions` | — | Replaces the header buttons; style with `lp-btn-dark` / `lp-btn-outline` |
| `#kpis` | — | `ListKpi` tiles (auto-fit grid `minmax(min(220px,100%),1fr)`) |
| `#banner` | — | Full-width notice above the card and rail |
| `#rail` | — | 240px left rail (category tree) |
| `#filters` | — | Extra toolbar controls, after the date filter, before the cog |
| `#row` | `{ item, selected }` | One element per column; each becomes a `role="cell"` |
| `#card` | `{ item, selected, selectable, toggle }` | Card body; render `<ListCard>` |
| `#split-row` | `{ item, active, selected }` | Replaces split row content (the checkbox stays outside) |
| `#detail` | `{ item, id, close }` | Detail pane. `item` is `null` for a deep-linked id not yet loaded: fetch by `id` |
| `#detail-empty` | — | No row open |
| `#custom` | `{ view }` | Whole body of a custom view |
| `#pinned` | `{ layout }` | Rows pinned above the list body |
| `#row-expansion` | `{ item }` | Under an expanded table row |
| `#table-footer` | `{ template }` | Sticky totals row, one element per column |
| `#group-extra` | `{ group }` | Right side of a group header |
| `#list-footer` | — | After the last group |
| `#empty` | `{ filtered }` | Replaces the standard empty states |

### 3.5 Behaviour the shell guarantees

- **Selection** is by id; a filter, search or tab that removes a selected row drops it
  from the selection (`pruneSelection`). Server lists that page set
  `:prune-selection="false"` and clear the selection on every query change themselves.
- **Select all N matching**: when every loaded row is selected and `matchingTotal` is
  larger, the bulk bar offers it; `bulk` then carries `{ allMatching: true }` and the
  adopter sends the **query** (filters) instead of ids.
- **Split keyboard**: wide (≥1024px) Up / Down / Home / End move the active row and focus
  it; narrow they move focus only, and Enter / Space opens. The roving tab stop is the
  active row, else the last focused, else the first.
- **`?open=<id>`**: `router.replace` keeps the other query keys; back / forward moves the
  active row; a string id from the URL is swapped for the row's real id once it loads.
  The router is `inject`ed, so the shell mounts without one in tests.
- **A close sticks**: after Back / `close()` / `active = null`, reloads and Load more do
  not re-open the first row. Opening a row or switching back to split re-arms it.
- **Narrow open** moves focus to Back; Back returns focus to the row that was open.
- **Accessibility**: the notice strip's `role="status"` region stays mounted; the bulk bar
  is `role="group"`; table roles apply only while real rows render. Known caveat: a card
  (`role="button"`) contains its checkbox button (axe `nested-interactive`).

---

## 4. `listPage.ts`: pure helpers

No Vue import; unit-test it with Vitest. The ones adopters call:

| Helper | Signature | Purpose |
|---|---|---|
| `resolveLayout` | `(view, views, hasColumns) => 'cards'\|'table'\|'split'\|'custom'` | Which body renders |
| `gridTemplate` | `(columns, selectable, expandable?) => string` | `grid-template-columns` |
| `cycleSort` | `(current, key) => ListSort` | Same column flips, a new one starts ascending |
| `appendUnique` | `(items, more, getId) => T[]` | Append a page, skipping ids already loaded |
| `loadMoreLabel` | `(loaded, total) => string` | "Load more (50 of 128)" |
| `countLineText` | `(loaded, total, noun?) => string` | "50 of 128 products" / "128 products" |
| `emptyStateText` | `(noun, filtered) => string` | "No products match these filters" / "No products yet" |
| `resolveOpenId` | `(raw, ids) => ListId \| null` | `?open=12` finds numeric id 12 |
| `stepActive` | `(ids, active, key) => ListId \| null` | Up / Down / Home / End |
| `isPlainClick` | `(e) => boolean` | Row-link click handling |
| `checkState`, `toggleMany`, `toggleOne`, `pruneSelection`, `uniqueIds` | | Tri-state selection |
| `offersSelectAllMatching` | `(state, selectedCount, matchingTotal) => boolean` | Bulk bar offer |
| `isDateRangeSet`, `toggleIdIn`, `splitNumbers` | | Small utilities |
| `initials`, `tintFor` | `(name) => 'JD'`, `(id) => 0..5` | Avatars with a stable tint |
| `filterBySearch`, `sortByText` | | Client-side lists only |
| `toCsv` | `(header, rows) => string` | RFC-4180 CSV; neutralises `= + - @` cells (CSV injection) |
| `loadListPrefs`, `saveListPrefs` | `(key) => ListPrefs`, `(key, prefs)` | View / group-by per viewer; localStorage, never throws |

```ts
export type ListId = string | number;
export interface ListSort { key: string; dir: 'asc' | 'desc' }
export const LIST_FLAT_KEY = '__flat';

export function gridTemplate(columns: readonly ListColumn[], selectable: boolean, expandable = false): string {
  return [...(selectable ? ['28px'] : []), ...(expandable ? ['24px'] : []), ...columns.map(c => c.width)].join(' ');
}

export function countLineText(loaded: number, total: number | null | undefined, noun?: string | null): string {
  const all = typeof total === 'number' && Number.isFinite(total) ? total : loaded;
  const tail = noun ? ` ${noun}` : '';
  return loaded >= all ? `${all.toLocaleString()}${tail}` : `${loaded.toLocaleString()} of ${all.toLocaleString()}${tail}`;
}

export function isPlainClick(e: { button?: number; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): boolean {
  return (e.button ?? 0) === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
}
```

---

## 5. Data: `useServerPagedList` and `useListPage`

The shell knows nothing about servers. `useListPage` is the adopter half: one call wires
remembered filters, server paging, sort, column settings, export and the split view's
open row. Requests go through a service module that uses the gg13 Axios client
(`resources/js/api/client.ts`: Sanctum session cookie, `withCredentials`, no tokens).

### 5.1 Response shape

The list endpoint returns the gg13 paginated envelope
([`../../../rules/api.md`](../../../rules/api.md)):

```json
{
  "status": "success",
  "data": [{ "id": 1, "sku": "TS-001", "name": "Trail shoe", "status": "active" }],
  "meta": {
    "current_page": 1, "last_page": 3, "per_page": 50, "total": 128, "from": 1, "to": 50,
    "status_counts": { "all": 128, "active": 97, "draft": 21, "archived": 10 }
  }
}
```

"Load more" needs no `has_more` field: `hasMore = current_page < last_page` (falling back
to `items.length < total`). `meta.status_counts` (and any other list extras such as
`totals`) is an optional addition the controller makes on page 1 when asked with
`counts=1`; it must ignore the status filter itself so the chips keep their counts. A
cursor-paginated endpoint maps `meta.has_more_pages` to `hasMore` and sends
`next_cursor` instead of `page`; the shell does not change.

### 5.2 Service module

```ts
// resources/js/api/services/productApi.ts
import api from '@/api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Product } from '@/types/product'

export async function fetchProducts(params: Record<string, unknown>): Promise<PaginatedResponse<Product>> {
  const response = await api.get<PaginatedResponse<Product>>('/products', { params })
  return response.data                       // { status, data, meta }
}

export async function fetchProduct(id: number | string): Promise<Product> {
  const response = await api.get<ApiResponse<Product>>(`/products/${id}`)
  return response.data.data
}

export async function bulkArchiveProducts(body: { ids?: number[]; filters?: Record<string, unknown> }): Promise<void> {
  await api.post('/products/bulk/archive', body)
}
```

### 5.3 `useServerPagedList`

Page 1 **replaces**, Load more **appends** de-duplicated; every response is checked
against a request token so a slow, superseded response never overwrites a newer one.

```ts
export interface PagedResponse<T> { data: T[]; meta?: unknown }

export function useServerPagedList<T>(opts: {
  fetch: (params: Record<string, unknown>) => Promise<PagedResponse<T>>
  params: () => Record<string, unknown>                    // filters + sort, read fresh
  firstPageParams?: (arg: Record<string, unknown>) => Record<string, unknown>
  getId: (item: T) => ListId
  perPage: number
  onError?: (e: unknown, phase: 'reload' | 'more') => void
}) {
  const items = shallowRef<T[]>([]) as Ref<T[]>
  const total = ref(0), page = ref(0), lastPage = ref<number | null>(null)
  const loading = ref(false), loadingMore = ref(false)
  const meta = shallowRef<unknown>(null)
  let token = 0
  const hasMore = computed(() => (lastPage.value !== null ? page.value < lastPage.value : items.value.length < total.value))

  async function reload(arg: Record<string, unknown> = {}) {
    const mine = ++token
    loading.value = true
    try {
      const res = await opts.fetch({ page: 1, per_page: opts.perPage, ...opts.params(), ...(opts.firstPageParams?.(arg) ?? {}) })
      if (mine !== token) return
      items.value = res.data ?? []
      total.value = metaNumber(res.meta, 'total') ?? items.value.length
      lastPage.value = metaNumber(res.meta, 'last_page')
      page.value = metaNumber(res.meta, 'current_page') ?? 1
      meta.value = res.meta ?? null                        // page-1 meta: counts, totals
    } catch (e) {
      if (mine !== token) return
      items.value = []; total.value = 0; page.value = 0; lastPage.value = null; meta.value = null
      opts.onError?.(e, 'reload')
    } finally {
      if (mine === token) loading.value = false
    }
  }

  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    const mine = token
    loadingMore.value = true
    try {
      const res = await opts.fetch({ page: page.value + 1, per_page: opts.perPage, ...opts.params() })
      if (mine !== token) return
      items.value = appendUnique(items.value, res.data ?? [], opts.getId)
      total.value = metaNumber(res.meta, 'total') ?? total.value
      lastPage.value = metaNumber(res.meta, 'last_page') ?? lastPage.value
      page.value = metaNumber(res.meta, 'current_page') ?? page.value + 1
    } catch (e) {
      if (mine === token) opts.onError?.(e, 'more')
    } finally {
      if (mine === token) loadingMore.value = false
    }
  }

  return { items, total, page, lastPage, loading, loadingMore, hasMore, meta, reload, loadMore }
}
```

Never sum loaded rows for totals: a footer or KPI over the filtered set comes from the
server's `meta`.

### 5.4 `useListPage` options

```ts
const page = useListPage<Product, ProductFilters>({
  key: 'products',                  // filter_state_<key> (sessionStorage) + column-settings key
  noun: 'products',                 // "Failed to load products."
  filters: { search: '', status: null, category_id: null, created_from: null, created_to: null },
  initialFilters: fromQuery,        // a deep link (?status=draft): replaces remembered filters once
  fetch: fetchProducts,
  getId: p => p.id,
  params: f => ({ search: f.search || undefined, status: f.status || undefined, ... }),
  sort: { initial: { key: 'updated_at', dir: 'desc' }, fields: { name: 'name', updated_at: 'updated_at' } },
  firstPageParams: a => (a.counts === false ? {} : { counts: 1 }),
  sortReload: { counts: false },    // a sort-only change skips the counts
  dateRange: { from: 'created_from', to: 'created_to' },
  columns: { defs: columnDefs },
  export: { endpoint: '/products', filename: 'products', columns: (): string[] => [...] },
})
```

| Option | Meaning |
|---|---|
| `key`, `noun`, `filters`, `fetch`, `getId`, `params` | Required. `params(filters)` returns filter params only; page, `per_page` and sort are added |
| `initialFilters` | Deep-link patch applied once, before the first fetch |
| `sort` | `{ initial, fields, fieldParam = 'sort', dirParam = 'order', style = 'pair' }`. **Whitelist**: only keys in `fields` sort; the API receives the mapped field. `style: 'colon'` sends one `sort=field:dir` param instead (the shared listing controller's form). Keep `fields` in step with the controller's allowed list |
| `sortReload` | `reload()` argument for a sort-only change |
| `firstPageParams` | Extra params on page-1 requests only (`counts: 1`) |
| `perPage` | Default `50` |
| `loadAll` | Ask for `per_page = 100` (the API maximum) for short lists; Load more still covers more |
| `dateRange` | `{ from, to }`: two string filter keys (ISO dates) exposed as a `[Date, Date]` tuple |
| `columns` | `{ defs: ColumnDef[], moduleKey? }` for the cog's toggles |
| `export` | `{ endpoint, filename?, columns }`: GET `endpoint` with the same params + `format=csv\|pdf` + `columns[]`, as a blob |
| `immediate` | Default `true`: fetch on mount |
| `onError` | Hook after the default error toast |

**Returns**: `filters`, `hasActiveFilters`, `clearFilters`; `list`, `items`, `total`,
`loading`, `loadingMore`, `hasMore`, `meta`, `reload(arg?)`, `loadMore`; `sort`, `onSort`,
`onSortSelect`, `apiParams()` (filters + sort, no paging: the export uses the same
function, so a download always matches the screen); `active` (split's open row);
`dateRange`; `columnDefs`, `visibleColumns`, `isVisible`; `exporting`, `exportCsv`,
`exportPdf`; `searchDebounce` (300).

### 5.5 `useListPage` key code

```ts
export function useListPage<T, F extends Record<string, ListFilterValue>>(opts: UseListPageOptions<T, F>) {
  const toast = useToast()

  // Filters: remembered per browser tab, merged over the defaults.
  const { state: filters, hasActiveFilters, clearFilters } = useFilterState<F>(opts.key, opts.filters)
  if (opts.initialFilters) {
    clearFilters()
    for (const [k, v] of Object.entries(opts.initialFilters)) if (v !== undefined) (filters as Record<string, unknown>)[k] = v
  }

  // Sort, with a whitelist.
  const s = opts.sort
  const sort = ref<ListSort>(s ? { ...s.initial } : { key: '', dir: 'asc' })
  const sortable = (key: string) => !!s && Object.hasOwn(s.fields, key)
  const onSort = (key: string) => { if (sortable(key)) sort.value = cycleSort(sort.value, key) }
  const onSortSelect = (v: ListSort) => { if (sortable(v.key)) sort.value = { ...v } }
  const sortParams = (): Record<string, unknown> => {
    if (!s) return {}
    const field = s.fields[sort.value.key] ?? s.fields[s.initial.key]
    return s.style === 'colon'
      ? { [s.fieldParam ?? 'sort']: `${field}:${sort.value.dir}` }
      : { [s.fieldParam ?? 'sort']: field, [s.dirParam ?? 'order']: sort.value.dir }
  }
  const apiParams = () => ({ ...sortParams(), ...opts.params(filters as F) })

  const list = useServerPagedList<T>({
    fetch: opts.fetch, params: apiParams, firstPageParams: opts.firstPageParams, getId: opts.getId,
    perPage: opts.loadAll ? 100 : (opts.perPage ?? 50),
    onError: (e) => {
      toast.add({ severity: 'error', summary: 'Error', detail: `Failed to load ${opts.noun}.`, life: 5000 })
      opts.onError?.(e)
    },
  })

  // One watcher over all filters: a Clear that resets five filters costs one request.
  watch(() => ({ ...filters }), () => void list.reload(), { deep: true })
  watch(sort, () => void list.reload(opts.sortReload ?? {}), { deep: true })

  const active = ref<ListId | null>(null)                                   // give ListPage open-query-key="open"
  const dateRange = opts.dateRange ? useDateRangeTuple(filters, opts.dateRange.from, opts.dateRange.to) : null
  const settings = opts.columns ? useTableSettings(opts.columns.moduleKey ?? opts.key, opts.columns.defs) : null
  const exporter = opts.export ? useListExport({ ...opts.export, buildParams: apiParams }) : null

  if (opts.immediate !== false) onMounted(() => void list.reload())

  return {
    filters: filters as F, hasActiveFilters, clearFilters,
    list, items: list.items, total: list.total, loading: list.loading, loadingMore: list.loadingMore,
    hasMore: list.hasMore, meta: list.meta, reload: list.reload, loadMore: list.loadMore,
    sort, onSort, onSortSelect, apiParams, active, dateRange,
    columnDefs: opts.columns?.defs ?? [],
    visibleColumns: settings ? settings.visibleColumns : ref<string[]>([]),
    isVisible: (k: string) => (settings ? settings.isVisible(k) : true),
    exporting: exporter ? exporter.exporting : ref(false),
    exportCsv: () => exporter?.exportCsv().catch(() => toast.add({ severity: 'error', summary: 'Export failed', life: 5000 })),
    exportPdf: () => exporter?.exportPdf().catch(() => toast.add({ severity: 'error', summary: 'Export failed', life: 5000 })),
    searchDebounce: 300,
  }
}
```

Supporting composables, in one line each:

- `useFilterState(key, defaults)`: `reactive` state merged from
  `sessionStorage['filter_state_<key>']`, saved 500ms after a change, `hasActiveFilters`
  compares with the defaults, `clearFilters()` resets and removes the key. All storage
  access is inside try/catch.
- `useTableSettings(key, defs)`: `visibleColumns` from
  `localStorage['list_columns_<key>']` (try/catch), defaulting to every def not marked
  `defaultVisible: false`; `isVisible(key)`. To follow the viewer across devices, save to
  a user-settings endpoint through the API client instead; never into an auth payload.
- `useListExport({ endpoint, filename, columns, buildParams })`:
  `api.get(endpoint, { params: { ...buildParams(), format, columns }, responseType: 'blob' })`,
  then a download through an object URL. The controller's `index()` must answer
  `format=csv|pdf` (otherwise set `showExport: false`).
- `useDetailCache(fetcher)`: `entry(id)` → `{ data, loading, error }`, `ensure(id, force?)`,
  `invalidate(id?)`, `track(getter)`. Use the **same** fetch the detail page makes.

**Self-reference.** When `export.columns` reads `isVisible` destructured from the result,
give the closure an explicit return type (`(): string[] =>`), or TypeScript reports
TS7022 / TS7023.

---

## 6. Worked example: Products list

Split + table + cards, status chips with counts, a Category chip, a date filter on the
creation date, the cog with columns and export, row links, bulk archive, server paging.

```vue
<!-- resources/js/pages/products/ProductListPage.vue -->
<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ListPage from '@/components/list/ListPage.vue'
import ListCard from '@/components/list/ListCard.vue'
import ListKpi from '@/components/list/ListKpi.vue'
import StatusChip from '@/components/status/StatusChip.vue'
import ProductDetail from './ProductDetail.vue'
import {
  initials, loadListPrefs, saveListPrefs, tintFor,
  type ListBulkAction, type ListColumn, type ListFilterDef, type ListFilterValues, type ListHref,
  type ListId, type ListPrimaryAction, type ListSettingsConfig, type ListSortOption,
  type ListSplitFields, type ListStatusChip, type ListViewOption,
} from '@/components/list/listPage'
import { useListPage } from '@/composables/useListPage'
import { useDetailCache } from '@/composables/useDetailCache'
import { usePermission } from '@/composables/usePermission'
import { bulkArchiveProducts, fetchProduct, fetchProducts } from '@/api/services/productApi'
import { fetchCategoryOptions } from '@/api/services/categoryApi'
import type { Product, ProductStatus } from '@/types/product'
import type { ColumnDef } from '@/composables/useTableSettings'

const router = useRouter()
const route = useRoute()
const confirm = useConfirm()
const toast = useToast()
const { can } = usePermission()

/* ---------- view, remembered per viewer ---------- */
const views: ListViewOption[] = [
  { key: 'split', label: 'Split', icon: 'pi pi-objects-column' },
  { key: 'table', label: 'Table', icon: 'pi pi-bars' },
  { key: 'cards', label: 'Cards', icon: 'pi pi-th-large' },
]
const saved = loadListPrefs('products').view
const view = ref(views.some(v => v.key === saved) ? saved! : 'split')
watch(view, v => saveListPrefs('products', { view: v }))

/* ---------- columns (keys = export column keys) ---------- */
const columnDefs: ColumnDef[] = [
  { key: 'category', header: 'Category' },
  { key: 'stock', header: 'Stock' },
  { key: 'price', header: 'Price' },
  { key: 'status', header: 'Status' },
  { key: 'updated_at', header: 'Updated', defaultVisible: false },
]
const STATUS_TONE: Record<ProductStatus, 'green' | 'amber' | 'gray'> = { active: 'green', draft: 'amber', archived: 'gray' }
const STATUS_LABEL: Record<ProductStatus, string> = { active: 'Active', draft: 'Draft', archived: 'Archived' }

/* ---------- data ---------- */
type ProductFilters = {
  search: string
  status: string | null
  category_id: number | null
  created_from: string | null
  created_to: string | null
}
const page = useListPage<Product, ProductFilters>({
  key: 'products',
  noun: 'products',
  filters: { search: '', status: null, category_id: null, created_from: null, created_to: null },
  initialFilters: typeof route.query.status === 'string' ? { status: route.query.status } : null,
  fetch: fetchProducts,
  getId: p => p.id,
  params: f => ({
    search: f.search || undefined,
    status: f.status || undefined,
    category_id: f.category_id || undefined,
    created_from: f.created_from || undefined,
    created_to: f.created_to || undefined,
  }),
  // The controller's allowed sort fields, column key → API field.
  sort: { initial: { key: 'updated_at', dir: 'desc' }, fields: { name: 'name', sku: 'sku', stock: 'stock', price: 'price', updated_at: 'updated_at' } },
  firstPageParams: a => (a.counts === false ? {} : { counts: 1 }),
  sortReload: { counts: false },
  dateRange: { from: 'created_from', to: 'created_to' },
  columns: { defs: columnDefs },
  export: {
    endpoint: '/products',
    filename: 'products',
    columns: (): string[] => ['id', 'sku', 'name', ...columnDefs.filter(c => isVisible(c.key)).map(c => c.key)],
  },
})
const {
  filters, hasActiveFilters, clearFilters, list, items, total, loading, loadingMore, hasMore,
  sort, onSort, onSortSelect, active, visibleColumns, isVisible, exporting, exportCsv, exportPdf,
} = page
const dateRange = page.dateRange!

/* ---------- toolbar ---------- */
const categories = shallowRef<{ value: number; label: string }[]>([])
fetchCategoryOptions().then(o => { categories.value = o }).catch(() => { /* chip just has no options */ })

const filterDefs = computed<ListFilterDef[]>(() => [
  { key: 'category_id', label: 'Category', filterable: true, options: categories.value },
])
const filterValues = computed<ListFilterValues>({
  get: () => ({ category_id: filters.category_id }),
  set: v => { filters.category_id = v.category_id == null ? null : Number(v.category_id) },
})
const statusModel = computed<string>({
  get: () => filters.status ?? '',
  set: v => { filters.status = v || null },
})
const counts = computed(() => (list.meta.value as { status_counts?: Record<string, number> } | null)?.status_counts ?? null)
const statusChips = computed<ListStatusChip[]>(() =>
  (['active', 'draft', 'archived'] as ProductStatus[]).map(s => ({
    key: s, label: STATUS_LABEL[s], tone: STATUS_TONE[s], count: counts.value?.[s] ?? null,
  })),
)
const settings = computed<ListSettingsConfig>(() => ({
  columnDefs,
  showColumns: view.value === 'table',
  showExport: can('products.export'),
  exporting: exporting.value,
}))

/* ---------- table ---------- */
const ALL_COLUMNS: (ListColumn & { toggle?: boolean })[] = [
  { key: 'sku', label: 'SKU', width: '120px', sortable: true },
  { key: 'name', label: 'Name', width: 'minmax(180px,2fr)', sortable: true },
  { key: 'category', label: 'Category', width: 'minmax(120px,1fr)', toggle: true },
  { key: 'stock', label: 'Stock', width: '90px', align: 'right', sortable: true, toggle: true },
  { key: 'price', label: 'Price', width: '110px', align: 'right', sortable: true, toggle: true },
  { key: 'status', label: 'Status', width: '110px', toggle: true },
  { key: 'updated_at', label: 'Updated', width: '110px', sortable: true, toggle: true },
]
const columns = computed(() => ALL_COLUMNS.filter(c => !c.toggle || isVisible(c.key)))

/* ---------- split ---------- */
const splitFields: ListSplitFields<Product> = {
  title: p => p.name,
  code: p => p.sku,
  meta: p => p.category?.name ?? 'No category',
  amount: p => p.price_formatted,
  status: p => ({ label: STATUS_LABEL[p.status], tone: STATUS_TONE[p.status] }),
  avatar: p => initials(p.name),
}
const SORT_OPTIONS: ListSortOption[] = [
  { key: 'updated_at', dir: 'desc', label: 'Recently updated' },
  { key: 'name', dir: 'asc', label: 'Name (A–Z)' },
  { key: 'stock', dir: 'asc', label: 'Stock (lowest first)' },
  { key: 'price', dir: 'desc', label: 'Price (high to low)' },
]
const details = useDetailCache<Product>(id => fetchProduct(id))
details.track(() => active.value)

/* ---------- actions ---------- */
const primaryAction = computed<ListPrimaryAction | null>(() =>
  can('products.create')
    ? {
        label: 'New product',
        icon: 'pi pi-plus',
        command: () => void router.push({ name: 'products.create' }),
        items: [{ label: 'Import CSV', icon: 'pi pi-upload', command: () => void router.push({ name: 'products.import' }) }],
      }
    : null,
)
const bulkActions = computed<ListBulkAction[]>(() =>
  can('products.update') ? [{ key: 'archive', label: 'Archive', icon: 'pi pi-box', danger: true }] : [],
)
const selected = ref<ListId[]>([])
const allMatching = ref(false)
watch(() => page.apiParams(), () => { selected.value = []; allMatching.value = false }, { deep: true })

function onBulk(key: string, ids: ListId[], opts: { allMatching: boolean }) {
  if (key !== 'archive') return
  confirm.require({
    header: 'Archive products',
    message: `Archive ${opts.allMatching ? `all ${total.value}` : ids.length} products?`,
    acceptLabel: 'Archive',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      // All matching → send the query, not ids.
      await bulkArchiveProducts(opts.allMatching ? { filters: page.apiParams() } : { ids: ids.map(Number) })
      toast.add({ severity: 'success', summary: 'Archived', life: 3000 })
      details.invalidate()
      void page.reload()
    },
  })
}

const rowHref = (p: Product): ListHref => ({ name: 'products.show', params: { id: p.id } })
const openShow = (p: Product) => void router.push({ name: 'products.show', params: { id: p.id } })
function refresh() { details.invalidate(); void page.reload() }
</script>

<template>
  <ListPage
    v-model:view="view"
    v-model:search="filters.search"
    v-model:filter-values="filterValues"
    v-model:status="statusModel"
    v-model:date-range="dateRange"
    v-model:visible-columns="visibleColumns"
    v-model:active="active"
    v-model:selected="selected"
    v-model:all-matching="allMatching"
    title="Products"
    lead="Everything you sell, with stock and price."
    noun="products"
    :views="views"
    :items="items"
    :items-total="total"
    :items-has-more="hasMore"
    :items-loading-more="loadingMore"
    :get-id="(p: Product) => p.id"
    :get-label="(p: Product) => `${p.sku} ${p.name}`"
    :columns="columns"
    :sort="sort"
    :sort-options="SORT_OPTIONS"
    :split-fields="splitFields"
    split-count
    split-collapsible
    open-query-key="open"
    split-empty-text="Select a product to see it here."
    :row-href="rowHref"
    :search-debounce="page.searchDebounce"
    search-placeholder="Search name or SKU"
    :filter-defs="filterDefs"
    :status-chips="statusChips"
    :status-all-count="counts?.all ?? null"
    status-chips-label="Product status"
    :date-filter="{ placeholder: 'Created' }"
    :settings="settings"
    :bulk-actions="bulkActions"
    :matching-total="total"
    :prune-selection="false"
    :primary-action="primaryAction"
    :create-action="primaryAction"
    :loading="loading"
    :filtered="hasActiveFilters"
    @open="openShow"
    @sort="onSort"
    @sort-select="onSortSelect"
    @load-more="list.loadMore"
    @bulk="onBulk"
    @clear-filters="clearFilters"
    @refresh="refresh"
    @export-csv="exportCsv"
    @export-pdf="exportPdf"
  >
    <template v-if="counts" #kpis>
      <ListKpi label="Active" :value="String(counts.active ?? 0)" tone="green"
               :active="filters.status === 'active'" @click="statusModel = filters.status === 'active' ? '' : 'active'" />
      <ListKpi label="Draft" :value="String(counts.draft ?? 0)" tone="amber"
               :active="filters.status === 'draft'" @click="statusModel = filters.status === 'draft' ? '' : 'draft'" />
    </template>

    <!-- table: one element per column, in column order -->
    <template #row="{ item }">
      <div class="font-[var(--lp-font-num)] text-xs text-[var(--lp-muted)] truncate">{{ item.sku }}</div>
      <div class="truncate text-[12.5px] font-medium text-[var(--lp-ink)]">{{ item.name }}</div>
      <div v-if="isVisible('category')" class="truncate text-xs">{{ item.category?.name ?? '—' }}</div>
      <div v-if="isVisible('stock')" class="text-right font-[var(--lp-font-num)] tabular-nums text-xs">{{ item.stock }}</div>
      <div v-if="isVisible('price')" class="text-right font-[var(--lp-font-num)] tabular-nums text-xs">{{ item.price_formatted }}</div>
      <div v-if="isVisible('status')"><StatusChip :label="STATUS_LABEL[item.status]" :tone="STATUS_TONE[item.status]" /></div>
      <div v-if="isVisible('updated_at')" class="font-[var(--lp-font-num)] text-xs">{{ item.updated_at_short }}</div>
    </template>

    <template #card="{ item, selected: isSel, selectable, toggle }">
      <ListCard
        :title="item.name"
        :subtitle="item.category?.name"
        :avatar="{ text: initials(item.name), shape: 'square', tint: tintFor(item.id) }"
        :lines="[{ icon: 'pi pi-box', text: `${item.stock} in stock`, numeric: true }]"
        :footer-start="STATUS_LABEL[item.status]"
        :footer-end="item.sku"
        :selectable="selectable"
        :selected="isSel"
        @toggle="toggle"
      />
    </template>

    <template #detail="{ id, close }">
      <ProductDetail
        :key="String(id)"
        :product="details.entry(id)?.data ?? null"
        :loading="details.entry(id)?.loading ?? true"
        :error="details.entry(id)?.error ?? null"
        @retry="details.ensure(id, true)"
        @close="close"
        @changed="refresh"
      />
    </template>
  </ListPage>
</template>
```

Notes on the example:

- `ProductDetail` is a `DocumentPanel` pane (see [`detail-page.md`](detail-page.md)); the
  same component renders the `products.show` page.
- `fetchCategoryOptions` returns `{ value, label }[]` from a small options endpoint.
- `price_formatted` / `updated_at_short` stand for whatever the API resource or a
  formatter gives; the shell never formats money.
- KPI tiles and status chips use the **same keys**, so clicking a tile presses its chip.
- Tailwind arbitrary values (`font-[var(--lp-font-num)]`) are fine in slots; a scoped
  class reading `var(--lp-*)` is equally fine for repeated cell styles.

---

## 7. Checklist

1. Controller `index()` from the shared blueprint: search, filters, the sort whitelist
   (same keys as `sort.fields`), `per_page` capped at 100, `meta.status_counts` on
   `counts=1` if the page shows chips with counts, `format=csv|pdf` if it exports.
2. Service function returning the paginated envelope; no direct `axios` in the view.
3. `useListPage` with a unique `key`; `:search-debounce="page.searchDebounce"`.
4. `noun` + `createAction` for the standard empty states; `rowHref` for real links.
5. Split view: `open-query-key="open"`, a `#detail` pane with `useDetailCache`.
6. Permissions filtered before `primaryAction` / `bulkActions` reach the shell.
7. Vitest: pure helpers in `listPage.ts`; a mount test that "absent config renders no
   region"; the view's filter → params mapping.

---

## 8. Legacy path: `AppDataTable`

`AppDataTable` is a thin wrapper around PrimeVue `DataTable` (defaults applied through
`$attrs`, a settings popover with Refresh and a column chooser, the same `ColumnDef`
shape). It is the **legacy** path in d1: new full-page lists use `ListPage`. It is
still acceptable for:

- tables inside another page: a related list in a detail tab, a dialog, a report section;
- grids that need `DataTable` features the shell does not have: inline cell editing,
  frozen columns, row grouping with subtotals, virtual scrolling of thousands of rows;
- existing pages not yet moved (move them deliberately, one page at a time, keeping the
  same filter-state key so remembered filters survive).

When you use it, follow the shared table guidance in
[`../../../design-system/tables.md`](../../../design-system/tables.md) and the
`DataTable` example in [`../../../rules/vue.md`](../../../rules/vue.md).
