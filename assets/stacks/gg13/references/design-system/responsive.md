# Responsive

## Overview

Responsive design system for mobile-first development. Breakpoints, layout shifts, and PrimeVue responsive components.

## Breakpoints

These are the **Tailwind CSS 4 default** breakpoints. (Note: Tailwind has no `xxl`; the largest default is `2xl`.)

| Breakpoint | Min Width | Device |
|------------|-----------|--------|
| `sm` | `640px` | Large phones |
| `md` | `768px` | Tablets |
| `lg` | `1024px` | Small laptops |
| `xl` | `1280px` | Desktops |
| `2xl` | `1536px` | Large desktops |

### Tailwind Classes

```html
<!-- Mobile first: default styles apply below sm -->
<div class="px-4">
  <!-- sm: 640px+ -->
  <div class="sm:px-6">
    <!-- md: 768px+ -->
    <div class="md:px-8">
      <!-- lg: 1024px+ -->
      <div class="lg:px-12">
        <!-- xl: 1280px+ -->
        <div class="xl:px-16">
          <!-- 2xl: 1536px+ -->
          <div class="2xl:px-20">
```

## Container Max Widths

| Breakpoint | Min Width | Container Max Width | Horizontal Padding |
|------------|-----------|--------------------|-------------------|
| `sm` | `640px` | `640px` | `1rem` (16px) |
| `md` | `768px` | `768px` | `1.5rem` (24px) |
| `lg` | `1024px` | `1024px` | `2rem` (32px) |
| `xl` | `1280px` | `1280px` | `3rem` (48px) |
| `2xl` | `1536px` | `1536px` | `4rem` (64px) |

### Implementation

```html
<div class="mx-auto max-w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
  <!-- Content -->
</div>
```

## Layout Shifts

App-shell navigation (hamburger drawer, sidebar collapse) depends on the active layout: see `../layouts/<layout>/shell.md` (default `../layouts/classic/shell.md`).

### Grid Layouts

#### Card Grid

```html
<!-- Mobile: 1 column -->
<div class="grid grid-cols-1">
  <!-- Tablet: 2 columns -->
  <div class="sm:grid-cols-2">
    <!-- Desktop: 3 columns -->
    <div class="md:grid-cols-3">
      <!-- Large desktop: 4 columns -->
      <div class="lg:grid-cols-4">
        <Card v-for="item in items" :key="item.id" />
      </div>
    </div>
  </div>
</div>
```

#### Form Layout

```html
<!-- Mobile: 1 column -->
<div class="grid grid-cols-1 gap-4">
  <!-- Tablet: 2 columns -->
  <div class="sm:grid-cols-2">
    <!-- Desktop: 3 columns -->
    <div class="md:grid-cols-3">
      <FormField v-for="field in formFields" :key="field.name" />
    </div>
  </div>
</div>
```

### Tables

#### Mobile: Stacked Cards

```html
<!-- Desktop: DataTable -->
<div class="hidden md:block">
  <DataTable :value="data" />
</div>

<!-- Mobile: Card list -->
<div class="md:hidden">
  <div v-for="item in data" :key="item.id" class="p-4 border-b">
    <h3 class="font-semibold">{{ item.name }}</h3>
    <p class="text-sm text-neutral-500">{{ item.email }}</p>
  </div>
</div>
```

#### Mobile: Horizontal Scroll

```html
<div class="overflow-x-auto">
  <DataTable :value="data" class="min-w-[600px]" />
</div>
```

- Use `overflow-x-auto` for wide tables on mobile.
- Set `min-w-[600px]` to prevent column collapse.

## PrimeVue Responsive Components

### DataTable

#### Responsive Mode

```html
<p-dataTable
  :value="data"
  responsiveLayout="scroll"
  :resizableColumns="true"
  :scrollable="true"
  scrollHeight="flex"
>
  <!-- Columns with min-width -->
  <p-column field="name" header="Name" style="min-width: 150px" />
  <p-column field="email" header="Email" style="min-width: 200px" />
  <p-column field="role" header="Role" style="min-width: 100px" />
</p-dataTable>
```

- `responsiveLayout="scroll"`: horizontal scroll on mobile.
- `scrollHeight="flex"`: fill container height.
- Set `min-width` on columns to prevent collapse.

#### Column Visibility

PrimeVue has **no** `ColumnSelector` component. Drive column visibility with a `MultiSelect` and render columns dynamically from the selected set.

```html
<!-- Column toggle control -->
<MultiSelect
  :modelValue="selectedColumns"
  :options="allColumns"
  optionLabel="header"
  display="chip"
  placeholder="Select columns"
  class="w-64 mb-4"
  @update:modelValue="onToggleColumns"
/>

<p-dataTable :value="data">
  <p-column
    v-for="col in selectedColumns"
    :key="col.field"
    :field="col.field"
    :header="col.header"
  />
</p-dataTable>
```

- Use a `MultiSelect`-driven toggle for user-customizable columns (see `tables.md` → Column Visibility).
- Hide less important columns by default on mobile (seed `selectedColumns` with only the key columns).

### Select

#### Mobile: Full Width

```html
<Select
  v-model="selected"
  :options="options"
  optionLabel="label"
  optionValue="value"
  :showClear="true"
  filter
  class="w-full"
/>
```

- `Dropdown` was renamed to `Select` in PrimeVue 4 (`import Select from 'primevue/select'`).
- Full width on mobile (`w-full`).
- Searchable with `filter`.

### Dialog

#### Mobile: Full Screen

PrimeVue 4 has no `fullScreen` prop. Use `maximizable` with `v-model:maximized`, or the `breakpoints` prop to make the dialog full width at small sizes.

```html
<Dialog
  v-model:visible="display"
  v-model:maximized="maximized"
  header="Title"
  maximizable
>
  <!-- Content; toggle full screen via the header maximize button -->
</Dialog>
```

- Preset `maximized` to `true` on mobile for better UX, or let the user toggle it.
- Alternatively, drive width per screen size with the `breakpoints` prop:

```html
<Dialog
  v-model:visible="display"
  header="Title"
  :breakpoints="{ '640px': '100vw' }"
  :style="{ width: '600px' }"
>
  <!-- Full width below 640px, 600px above -->
</Dialog>
```

### Drawer

#### Mobile: Bottom Sheet

```html
<Drawer
  v-model:visible="display"
  header="Actions"
  position="bottom"
  :style="{ height: '50vh' }"
  class="md:hidden"
/>
```

- Bottom drawer on mobile.
- Side drawer on desktop.

### Tabs

#### Mobile: Select Dropdown

```html
<div class="md:hidden">
  <Select v-model="activeTab" :options="tabs" optionLabel="header" optionValue="value" class="w-full" />
</div>
<div class="hidden md:block">
  <!-- PrimeVue 4 composed Tabs API -->
  <Tabs v-model:value="activeTab">
    <TabList>
      <Tab v-for="tab in tabs" :key="tab.value" :value="tab.value">{{ tab.header }}</Tab>
    </TabList>
    <TabPanels>
      <TabPanel v-for="tab in tabs" :key="tab.value" :value="tab.value">
        <component :is="tab.content" />
      </TabPanel>
    </TabPanels>
  </Tabs>
</div>
```

- `Select` dropdown on mobile.
- Horizontal tabs on desktop.

## Mobile-First Approach

### CSS Custom Properties

```css
:root {
  --container-padding: 1rem;
  --grid-gap: 1rem;
}

@media (min-width: 768px) {
  :root {
    --container-padding: 1.5rem;
    --grid-gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  :root {
    --container-padding: 2rem;
    --grid-gap: 2rem;
  }
}
```

### Tailwind Responsive Utilities

```html
<!-- Hide on mobile, show on desktop -->
<div class="hidden md:block">Desktop Content</div>

<!-- Show on mobile, hide on desktop -->
<div class="block md:hidden">Mobile Content</div>

<!-- Responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

<!-- Responsive typography -->
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">

<!-- Responsive spacing -->
<div class="p-4 sm:p-6 lg:p-8 xl:p-12">
```

## Responsive Rules

1. **Mobile-first:** write styles for mobile, then add `sm:`, `md:`, `lg:`, `xl:`, `2xl:` for larger screens.
2. **Test at all breakpoints** before shipping.
3. **Use touch targets >= 44×44px** on mobile.
4. **Stack layouts vertically on mobile** (1 column).
5. **Use horizontal scroll for wide tables** on mobile.
6. **Replace complex UIs with simpler alternatives** on mobile (dropdowns instead of tabs, cards instead of tables).
7. **Optimize images** for mobile (smaller resolution, WebP format).
8. **Use `vw` and `vh` units** for full-screen layouts.
9. **Test on real devices** (not just browser dev tools).
10. **Ensure text is readable** at all breakpoints (minimum 16px body text).

## PrimeVue Responsive Tokens

```css
/* Container */
--container-max-width: 100%;
--container-padding: 1rem;

@media (min-width: 768px) {
  --container-max-width: 768px;
  --container-padding: 1.5rem;
}

@media (min-width: 1024px) {
  --container-max-width: 1024px;
  --container-padding: 2rem;
}

@media (min-width: 1280px) {
  --container-max-width: 1280px;
  --container-padding: 3rem;
}

@media (min-width: 1536px) {
  --container-max-width: 1536px;
  --container-padding: 4rem;
}

/* Grid gap */
--grid-gap: 1rem;

@media (min-width: 768px) {
  --grid-gap: 1.5rem;
}

@media (min-width: 1024px) {
  --grid-gap: 2rem;
}
```
