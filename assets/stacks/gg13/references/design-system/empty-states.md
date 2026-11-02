# Empty States

## Overview

Empty states for when content is missing, search returns no results, or user has not created anything. Use illustrations, messaging, and CTAs to guide users.

## Empty State Structure

### Basic Empty State

```html
<div class="text-center py-12">
  <div class="mb-4">
    <i class="pi pi-inbox text-4xl text-neutral-400" />
  </div>
  <h3 class="text-xl font-semibold mb-2">No items found</h3>
  <p class="text-base text-neutral-500 mb-6">
    Try adjusting your search or filters to find what you're looking for.
  </p>
  <Button label="Clear Filters" severity="secondary" icon="pi pi-filter-slash" />
</div>
```

### Sections

| Section | Purpose | Required |
|---------|---------|----------|
| Icon / Illustration | Visual cue for empty state | Yes |
| Heading | Clear description of the empty state | Yes |
| Description | Explanation and guidance | Yes |
| CTA Button | Action to resolve the empty state | Yes |

## Empty State Types

### No Data (Initial Empty State)

```html
<div class="text-center py-12">
  <div class="mb-4">
    <i class="pi pi-plus-circle text-5xl text-neutral-300" />
  </div>
  <h3 class="text-xl font-semibold mb-2">No data yet</h3>
  <p class="text-base text-neutral-500 mb-6">
    Get started by creating your first item.
  </p>
  <Button label="Create Item" icon="pi pi-plus" />
</div>
```

- Used for **initial empty states** (no data created yet).
- Icon: `pi pi-plus-circle` or `pi pi-folder-open`.
- CTA: "Create [Item]" button.

### No Search Results

```html
<div class="text-center py-12">
  <div class="mb-4">
    <i class="pi pi-search text-4xl text-neutral-400" />
  </div>
  <h3 class="text-xl font-semibold mb-2">No results found</h3>
  <p class="text-base text-neutral-500 mb-6">
    Try adjusting your search or filters to find what you're looking for.
  </p>
  <div class="flex justify-center gap-2">
    <Button label="Clear Filters" severity="secondary" icon="pi pi-filter-slash" @click="clearFilters" />
    <Button label="View All" icon="pi pi-list" @click="viewAll" />
  </div>
</div>
```

- Used for **search/filter no results**.
- Icon: `pi pi-search`.
- CTAs: "Clear Filters", "View All".

### No Notifications

```html
<div class="text-center py-12">
  <div class="mb-4">
    <i class="pi pi-bell-slash text-4xl text-neutral-400" />
  </div>
  <h3 class="text-xl font-semibold mb-2">No notifications</h3>
  <p class="text-base text-neutral-500 mb-6">
    You're all caught up! Check back later for updates.
  </p>
</div>
```

- Used for **notification pages** with no notifications.
- Icon: `pi pi-bell-slash`.
- No CTA (just informational).

### No Permissions

```html
<div class="text-center py-12">
  <div class="mb-4">
    <i class="pi pi-lock text-4xl text-neutral-400" />
  </div>
  <h3 class="text-xl font-semibold mb-2">Access denied</h3>
  <p class="text-base text-neutral-500 mb-6">
    You don't have permission to view this page. Contact your administrator.
  </p>
  <Button label="Go Back" icon="pi pi-arrow-left" severity="secondary" @click="$router.back()" />
</div>
```

- Used for **unauthorized access**.
- Icon: `pi pi-lock`.
- CTA: "Go Back" button.

## Icon Sizes

| Context | Size | Class |
|---------|------|-------|
| Initial empty state | 80px | `text-5xl` |
| Search no results | 60px | `text-4xl` |
| Notification empty | 60px | `text-4xl` |
| Permission denied | 60px | `text-4xl` |
| Inline empty (table, list) | 40px | `text-2xl` |

```html
<i class="pi pi-inbox text-4xl text-neutral-400" />
<i class="pi pi-plus-circle text-5xl text-neutral-300" />
```

## Messaging

### Heading

```html
<h3 class="text-xl font-semibold mb-2">No items found</h3>
```

- Size: `text-xl` (20px).
- Weight: `font-semibold` (600).
- Color: `--color-neutral-800` (light) / `--color-neutral-200` (dark).
- Keep concise (5–10 words).

### Description

```html
<p class="text-base text-neutral-500 mb-6">
  Try adjusting your search or filters to find what you're looking for.
</p>
```

- Size: `text-base` (16px).
- Color: `--color-neutral-500`.
- Provide actionable guidance (what to do next).

### CTA Button

```html
<Button label="Create Item" icon="pi pi-plus" />
<Button label="Clear Filters" severity="secondary" icon="pi pi-filter-slash" />
```

- Size: `text-base` (16px).
- Primary action: filled button.
- Secondary action: secondary/outlined button.
- Icon: relevant to the action.

## Empty State Placement

### Page Center

```html
<div class="flex items-center justify-center min-h-[50vh]">
  <EmptyState />
</div>
```

- Used for **full-page empty states**.
- Centered vertically and horizontally.
- Minimum height: `50vh`.

### Card Center

```html
<p-card>
  <template #content>
    <EmptyState />
  </template>
</p-card>
```

- Used for **card-based empty states**.
- Centered within the card.

### Table Empty State

```html
<p-dataTable :value="data" emptyMessage="No data found">
  <template #empty>
    <EmptyState />
  </template>
</p-dataTable>
```

- Used for **table empty states**.
- Show in the table body when no data.

### List Empty State

```html
<div v-if="items.length === 0">
  <EmptyState />
</div>
<ul v-else>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</ul>
```

- Used for **list empty states**.
- Show when list is empty.

## Empty State Rules

1. **Always show an empty state** when content is missing.
2. **Include an icon, heading, description, and CTA.**
3. **Use relevant icons** (search for no results, plus for create).
4. **Provide actionable guidance** in the description.
5. **CTA should resolve the empty state** (create, clear filters, go back).
6. **Limit CTAs to 1–2.** Don't overwhelm the user.
7. **Use appropriate icon size** for the context (page vs inline).
8. **Test empty states in dark mode.**
9. **Never show a broken or error state as an empty state.**
10. **Animate empty state entrance** (fade in) for smoother UX.

## PrimeVue Empty State Tokens

Empty states use standard design system tokens:

```css
--empty-state-icon-size: 4rem;
--empty-state-icon-color: var(--color-neutral-400);
--empty-state-heading-size: 1.25rem;
--empty-state-heading-weight: 600;
--empty-state-heading-color: var(--color-neutral-800);
--empty-state-description-size: 1rem;
--empty-state-description-color: var(--color-neutral-500);
--empty-state-cta-margin-top: 1.5rem;
```
