# Tables

## Overview

PrimeVue `DataTable` is the standard for displaying structured data. Use for sortable, filterable, paginated data sets.

## Basic DataTable

```html
<p-dataTable
  :value="users"
  :loading="loading"
  :paginator="true"
  :rows="10"
  :rowsPerPageOptions="[5, 10, 25, 50]"
  paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
  :currentPageReportTemplate="'{first} - {last} of {totalRecords}'"
  sortField="name"
  :sortOrder="1"
  @sort="onSort"
  @page="onPage"
>
  <!-- Row Selection -->
  <p-column selectionMode="multiple" style="width: 3rem" />

  <!-- Data Columns -->
  <p-column field="name" header="Name" sortable :filter="true" filterPlaceholder="Search name" />
  <p-column field="email" header="Email" sortable :filter="true" filterPlaceholder="Search email" />
  <p-column field="role" header="Role" sortable :filter="true" :filterMenuStyle="{ width: '12rem' }" />
  <p-column field="status" header="Status" :filter="true">
    <template #body="{ data }">
      <p-tag :value="data.status" :severity="getStatusSeverity(data.status)" size="small" />
    </template>
  </p-column>
  <p-column field="createdAt" header="Created" sortable :exportable="false">
    <template #body="{ data }">
      {{ formatDate(data.createdAt) }}
    </template>
  </p-column>

  <!-- Actions Column -->
  <p-column :exportable="false" style="width: 5rem">
    <template #body="{ data }">
      <div class="flex items-center gap-2">
        <Button icon="pi pi-pencil" severity="secondary" size="small" plain @click="editUser(data)" />
        <Button icon="pi pi-trash" severity="danger" size="small" plain @click="deleteUser(data)" />
      </div>
    </template>
  </p-column>
</p-dataTable>
```

## Column Definitions

### Column Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `field` | `string` | — | Data key (for `bodyTemplate` default) |
| `header` | `string` | — | Column header text |
| `sortable` | `boolean` | `false` | Enable column sorting |
| `filter` | `boolean \| object` | `false` | Enable filtering |
| `filterPlaceholder` | `string` | `''` | Filter input placeholder |
| `filterMatchMode` | `string` | `contains` | Filter match mode |
| `sortable` | `boolean` | `false` | Enable column sorting |
| `sortField` | `string` | — | Field to sort by |
| `bodyTemplate` | `slot` | — | Custom body rendering |
| `headerTemplate` | `slot` | — | Custom header rendering |
| `footerTemplate` | `slot` | — | Custom footer rendering |
| `style` | `object` | — | Inline column styles |
| `class` | `string` | — | CSS classes for the column |
| `exportable` | `boolean` | `true` | Include in CSV export |

### Column Types

```html
<!-- Text column (default) -->
<p-column field="name" header="Name" sortable />

<!-- Badge / Tag column -->
<p-column field="status" header="Status">
  <template #body="{ data }">
    <p-tag :value="data.status" :severity="getStatusSeverity(data.status)" size="small" />
  </template>
</p-column>

<!-- Avatar + text column -->
<p-column field="user" header="User">
  <template #body="{ data }">
    <div class="flex items-center gap-2">
      <Avatar :image="data.avatar" shape="circle" size="small" />
      <div>
        <p class="text-sm font-medium">{{ data.name }}</p>
        <p class="text-xs text-neutral-500">{{ data.email }}</p>
      </div>
    </div>
  </template>
</p-column>

<!-- Action column (no export) -->
<p-column :exportable="false" style="width: 5rem">
  <template #body="{ data }">
    <ButtonGroup :data="data" />
  </template>
</p-column>

<!-- Formatted number column -->
<p-column field="amount" header="Amount">
  <template #body="{ data }">
    {{ formatCurrency(data.amount) }}
  </template>
</p-column>

<!-- Date column -->
<p-column field="createdAt" header="Created">
  <template #body="{ data }">
    <p class="text-sm">{{ formatRelative(data.createdAt) }}</p>
  </template>
</p-column>
```

## Sorting

```html
<!-- Single sort -->
<p-dataTable :value="data" sortField="name" :sortOrder="1" @sort="onSort" />

<!-- Multi-sort (hold Shift while clicking) -->
<p-dataTable :value="data" :multiSortMeta="multiSortMeta" @sort="onSort" />
```

### Sort Indicators

DataTable renders these sort icons **automatically** on sortable columns (no manual mapping needed). The PrimeVue 4 defaults are:

| State | Icon | Order |
|-------|------|-------|
| Unsorted | `pi pi-sort-alt` | `0` |
| Ascending | `pi pi-sort-amount-up-alt` | `1` |
| Descending | `pi pi-sort-amount-down` | `-1` |

To override, pass a custom icon through the column's `sorticon` pass-through slot.

### Sorting Rules

1. **Always use server-side sorting** for large datasets (>1000 rows).
2. **Default sort field** should be the most relevant column (e.g., name, date).
3. **Show sort indicators** in column headers.
4. **Persist sort state** in URL query params for bookmarking.

## Filtering

### Column Filter

```html
<p-column field="name" header="Name" :filter="true" filterPlaceholder="Search..." />
```

### External Filter Bar

```html
<div class="flex items-center gap-2 mb-4">
  <IconField>
    <InputIcon class="pi pi-search" />
    <InputText v-model="globalFilter" placeholder="Search all columns..." class="flex-1" />
  </IconField>
  <Button icon="pi pi-filter" label="Filters" severity="secondary" @click="toggleFilter" />
</div>

<p-dataTable
  v-model:filters="filters"
  :value="data"
  :globalFilterFields="['name', 'email', 'role']"
/>
```

### Filter Types

| Type | Component | Use Case |
|------|-----------|----------|
| Text | `InputText` | Default, character matching |
| Select | `Select` | Enum values (status, role) |
| Date | `DatePicker` | Date ranges |
| Numeric | `InputNumber` | Range filters |

### Filter Rules

1. **Always provide a clear filter placeholder.**
2. **Use dropdown filters for categorical data** (status, type, role).
3. **Use text filters for free-text search.**
4. **Persist filter state** in URL query params.

## Resizing

```html
<p-dataTable
  :value="data"
  :resizableColumns="true"
  resizeColumnDelay="300"
>
  <p-column field="name" header="Name" :resizable="true" style="min-width: 200px" />
  <p-column field="email" header="Email" :resizable="true" style="min-width: 250px" />
</p-dataTable>
```

### Resizing Rules

1. **Enable `resizableColumns`** for tables with many columns.
2. **Set `min-width`** on each column to prevent collapse.
3. **Persist column widths** in localStorage.
4. **Use `style="width: 1%"` on action columns** to prevent unwanted expansion.

## Reordering

```html
<p-dataTable :value="data" :reorderableColumns="true">
  <!-- Columns can be reordered via drag -->
</p-dataTable>
```

- Enable for **user-customizable table layouts**.
- Drag columns by header to reorder.
- Persist column order in localStorage.

## Column Visibility (Toggle)

PrimeVue has **no** `ColumnSelector` / `<p-columnSelector>` component. Build a show/hide-columns control with a `MultiSelect` bound to the visible column list, then render columns dynamically.

```vue
<script setup>
import { ref } from 'vue';

const allColumns = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'phone', header: 'Phone' },
  { field: 'address', header: 'Address' },
];

// Columns shown by default (hide less-important ones on mobile)
const selectedColumns = ref(allColumns.slice(0, 2));
</script>

<template>
  <div class="flex justify-end mb-4">
    <MultiSelect
      :modelValue="selectedColumns"
      :options="allColumns"
      optionLabel="header"
      display="chip"
      placeholder="Select columns"
      class="w-64"
      @update:modelValue="onToggleColumns"
    />
  </div>

  <p-dataTable :value="data">
    <p-column
      v-for="col in selectedColumns"
      :key="col.field"
      :field="col.field"
      :header="col.header"
    />
  </p-dataTable>
</template>
```

- `onToggleColumns` should preserve the original column order when updating `selectedColumns`.
- Hide less important columns by default on mobile.
- Persist the visible-column set in localStorage.

## Row Selection

### Single Selection

```html
<p-dataTable v-model:selection="selectedUser" :value="users" selectionMode="single" @selection-change="onSelect">
  <p-column selectionMode="single" style="width: 3rem" />
</p-dataTable>
```

### Multiple Selection

```html
<p-dataTable v-model:selection="selectedUsers" :value="users" selectionMode="multiple" @selection-change="onSelect">
  <p-column selectionMode="multiple" style="width: 3rem" />
</p-dataTable>
```

### Row Click Selection

```html
<p-dataTable
  v-model:selection="selectedUsers"
  :value="users"
  selectionMode="multiple"
  @row-select="onRowSelect"
  @row-unselect="onRowUnselect"
  rowHover
  :rowsPerPageOptions="[10, 25, 50]"
>
  <p-column selectionMode="multiple" style="width: 3rem" />
</p-dataTable>
```

### Selection Rules

1. **Use checkboxes** for actions that apply to multiple rows (bulk delete, export).
2. **Use row click** for navigation to detail views.
3. **Show selected count** in toolbar when rows are selected.
4. **Clear selection** after successful bulk action.

## Pagination

```html
<p-dataTable
  :value="data"
  :paginator="true"
  :rows="10"
  :totalRecords="total"
  :first="first"
  @page="onPage"
  :rowsPerPageOptions="[5, 10, 25, 50]"
  paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
  :currentPageReportTemplate="'{first} - {last} of {totalRecords}'"
/>
```

### Pagination Props

| Prop | Description |
|------|-------------|
| `paginator` | Enable paginator |
| `rows` | Default rows per page |
| `totalRecords` | Total record count (server-side) |
| `first` | First record index (for server-side) |
| `rowsPerPageOptions` | Available page sizes |
| `paginatorTemplate` | Paginator layout |
| `currentPageReportTemplate` | Page report format |

### Pagination Rules

1. **Default to 10 rows per page.**
2. **Offer 5, 10, 25, 50 as page size options.**
3. **Use server-side pagination** for >1000 rows.
4. **Show page report** ("1 - 10 of 50") for clarity.

## Empty State

```html
<p-dataTable :value="data" emptyMessage="No data found">
  <template #empty>
    <div class="p-8 text-center">
      <i class="pi pi-inbox text-3xl text-neutral-400 mb-4" />
      <p class="text-base font-medium mb-2">No data found</p>
      <p class="text-sm text-neutral-500 mb-4">Try adjusting your search or filters.</p>
      <Button label="Clear Filters" severity="secondary" size="small" @click="clearFilters" />
    </div>
  </template>
</p-dataTable>
```

### Empty State Rules

1. **Show empty state when table has no data.**
2. **Include an icon, message, and CTA button.**
3. **Offer a way to clear filters or add new data.**
4. **Use `emptyMessage` prop for simple cases.**

## Loading State

```html
<p-dataTable :value="data" :loading="loading" loadingRows="5">
  <template #loading>
    <div class="p-4 text-center">
      <ProgressSpinner style="width: 40px; height: 40px" />
      <p class="mt-2 text-sm text-neutral-500">Loading data...</p>
    </div>
  </template>
</p-dataTable>
```

### Loading Rules

1. **Show skeleton loader** while initial data loads.
2. **Show spinner** during filter/sort/paginate operations.
3. **Disable interactions** during loading (`:loading="true"`).

## Row Styling

### Striped Rows

```html
<p-dataTable :value="data" stripedRows />
```

- Alternating row backgrounds.
- Use for **data-dense tables** to improve readability.

### Row Hover

```html
<p-dataTable :value="data" rowHover />
```

- Highlight row on hover.
- Use for **interactive tables** (clickable rows).

### Row Class

```html
<p-dataTable :value="data">
  <template #body="{ data, index }">
    <div :class="{ 'bg-danger-50': data.status === 'error' }">
      <!-- Row content -->
    </div>
  </template>
</p-dataTable>
```

- Apply conditional styles based on data.
- Use for **status indicators**, **priority highlighting**.

## PrimeVue DataTable Theme Tokens

```css
--p-datatable-body-cell-padding: 1rem 1.5rem;
--p-datatable-header-cell-padding: 1rem 1.5rem;
--p-datatable-footer-cell-padding: 1rem 1.5rem;
--p-datatable-body-cell-border-width: 0 0 1px 0;
--p-datatable-body-cell-border-color: var(--color-neutral-200);
--p-datatable-header-cell-bg: var(--color-neutral-50);
--p-datatable-header-cell-text-color: var(--color-neutral-700);
--p-datatable-body-row-bg: var(--color-neutral-0);
--p-datatable-body-row-hover-bg: var(--color-neutral-50);
--p-datatable-body-row-selected-bg: var(--color-primary-50);
--p-datatable-resizable-column-handle-width: 1rem;
--p-datatable-resizable-column-handle-color: var(--color-primary-500);
--p-datatable-sort-icon-color: var(--color-neutral-400);
--p-datatable-sort-icon-active-color: var(--color-primary-500);
--p-datatable-row-gap: 0;
--p-datatable-row-even-bg: var(--color-neutral-50); /* striped */
```

## DataTable Rules

1. **Use DataTable for structured, comparable data.** For summaries, use cards.
2. **Always define column widths** (`style="min-width: X"`).
3. **Show sort indicators** for sortable columns.
4. **Persist table state** (sort, filter, page, column order) in URL or localStorage.
5. **Use server-side operations** for >1000 rows.
6. **Always include an empty state.**
7. **Use loading state** for async operations.
8. **Action columns must be last** (right-aligned).
9. **Limit to 10–15 columns** on desktop. Use column selector for more.
10. **Test on mobile:** stack columns or use responsive mode.
