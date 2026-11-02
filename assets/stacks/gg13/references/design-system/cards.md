# Cards

## Overview

PrimeVue `Card` component for grouping related content. Use cards to separate distinct pieces of information on a page.

## Card Structure

### Basic Card

```html
<p-card>
  <template #header>
    <img src="/illustration.svg" alt="" class="rounded-lg" />
  </template>
  <template #subheader>
    <p class="text-sm text-neutral-500">Updated 2 hours ago</p>
  </template>
  <template #content>
    <h3 class="text-xl font-semibold mb-2">Card Title</h3>
    <p class="text-sm text-neutral-600">Card body content goes here.</p>
  </template>
  <template #footer>
    <Button label="Action" icon="pi pi-check" size="small" />
  </template>
</p-card>
```

### Sections

| Section | Purpose | Required |
|---------|---------|----------|
| `header` | Image, avatar, or prominent visual | No |
| `subheader` | Secondary metadata (dates, authors) | No |
| `content` | Main body text, data, or child components | Yes |
| `footer` | Actions (buttons, links) | No |

## Card Variants

### Elevated Card (default)

```html
<p-card>
  <!-- Default shadow, border -->
</p-card>
```

- Default card with subtle shadow (`box-shadow: 0 1px 3px rgba(0,0,0,0.1)`).
- Used for **standalone content blocks**.

### Flat Card (no shadow)

```html
<p-card :raised="false">
  <!-- No shadow, border only -->
</p-card>
```

- No shadow, subtle border.
- Used in **dense layouts** (dashboards with many cards) or within dialogs/drawers.

### Interactive Card (clickable)

```html
<RouterLink :to="`/users/${user.id}`" class="card-link">
  <p-card class="h-full cursor-pointer hover:shadow-md transition-shadow duration-200">
    <template #content>
      <h3 class="text-lg font-semibold">{{ user.name }}</h3>
      <p class="text-sm text-neutral-500">{{ user.email }}</p>
    </template>
  </p-card>
</RouterLink>
```

- Adds hover shadow lift (`shadow-md`).
- Use `<RouterLink>` or `<NuxtLink>` wrapper.
- **Always add `cursor-pointer` and `transition` for feedback.**

## Card Sizing

### Compact Card

```html
<p-card :raised="false" class="p-4">
  <!-- Reduced padding -->
</p-card>
```

- Padding: `1rem` (16px) instead of default `1.5rem`.
- Used for **dashboard widgets**, **table row expansions**.

### Standard Card

```html
<p-card>
  <!-- Default padding: 1.5rem (24px) -->
</p-card>
```

- Padding: `1.5rem` (24px).
- Used for **content pages**, **detail views**.

### Spacious Card

```html
<p-card class="p-8">
  <!-- Large padding -->
</p-card>
```

- Padding: `2rem` (32px).
- Used for **landing pages**, **empty states**, **onboarding**.

## Card Shadows

| Variant | Shadow Token | CSS |
|---------|-------------|-----|
| Flat | `none` | `box-shadow: none;` |
| Default | `--p-card-shadow` | `0 1px 3px rgba(0, 0, 0, 0.1)` |
| Hover | `--p-card-hover-shadow` | `0 4px 12px rgba(0, 0, 0, 0.15)` |
| Dialog | `--p-dialog-shadow` | `0 20px 60px rgba(0, 0, 0, 0.2)` |

## Card Border Radius

| Context | Border Radius |
|---------|---------------|
| Card | `--p-card-border-radius: 0.5rem` (8px) |
| Card header | Inherits from card |
| Card image (header) | `0.5rem` (8px) — matches card |
| Compact card | `0.375rem` (6px) |

## Card Padding

| Section | Default | Compact |
|---------|---------|---------|
| Header | `1.5rem` | `1rem` |
| Subheader | `0 1.5rem` | `0 1rem` |
| Content | `1.5rem` | `1rem` |
| Footer | `0 1.5rem 1.5rem` | `0 1rem 1rem` |

## Card Spacing

### Within Card

| Element | Spacing |
|---------|---------|
| Header to Subheader | `mb-2` (8px) |
| Subheader to Content | `mb-4` (16px) |
| Content to Footer | `mt-4` (16px) |
| Content internal lines | `mb-2` (8px) |

### Between Cards (Grid)

| Layout | Gap |
|--------|-----|
| Dashboard grid | `gap-6` (24px) |
| Content grid | `gap-8` (32px) |
| Dense list | `gap-4` (16px) |

## When to Use Cards vs Tables

### Use Cards When

- Displaying **summary information** or **preview data** (e.g., user profile, project overview).
- Each item is a **standalone unit** of information.
- Content varies in **height and structure**.
- On **mobile** where tables are hard to read.
- Showing **illustrations or visual content** alongside text.
- List items are **few** (2–12 items).

### Use Tables When

- Displaying **structured, comparable data** across many columns.
- Users need to **sort, filter, or search** the data.
- There are **many rows** (10+).
- Data has **consistent structure** across rows.
- On **desktop** where horizontal space is available.

### Hybrid Approach

| Scenario | Approach |
|----------|----------|
| Dashboard summary | Card grid |
| User list | DataTable |
| User profile preview | Card (in grid) |
| User profile detail | Card (single, spacious) |
| Order summary | Card |
| Order history | DataTable |

## Card Layout Patterns

### Single Card (Detail Page)

```html
<div class="max-w-3xl mx-auto">
  <p-card>
    <template #header>
      <img :src="item.image" :alt="item.title" class="w-full rounded-t-lg" />
    </template>
    <template #content>
      <h2 class="text-2xl font-bold mb-4">{{ item.title }}</h2>
      <div class="prose max-w-none">{{ item.description }}</div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Edit" severity="secondary" icon="pi pi-pencil" />
        <Button label="Save" icon="pi pi-check" />
      </div>
    </template>
  </p-card>
</div>
```

### Card Grid (List Page)

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <p-card v-for="item in items" :key="item.id">
    <template #header>
      <img :src="item.image" :alt="item.title" class="w-full aspect-video object-cover rounded-t-lg" />
    </template>
    <template #content>
      <h3 class="text-lg font-semibold">{{ item.title }}</h3>
      <p class="text-sm text-neutral-500">{{ item.subtitle }}</p>
    </template>
    <template #footer>
      <RouterLink :to="`/items/${item.id}`">
        <Button label="View" size="small" class="w-full" />
      </RouterLink>
    </template>
  </p-card>
</div>
```

### Card with Actions (Dashboard Widget)

```html
<p-card :raised="false" class="flex flex-col">
  <template #header>
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold">Revenue</h3>
      <Button icon="pi pi-ellipsis-v" plain size="small" />
    </div>
  </template>
  <template #content>
    <p class="text-3xl font-bold mb-1">$24,500</p>
    <p class="text-sm text-success-600 flex items-center gap-1">
      <i class="pi pi-arrow-up text-sm" />
      12.5% from last month
    </p>
  </template>
</p-card>
```

## Card Rules

1. **One card per logical unit of content.** Never mix unrelated items in a single card.
2. **Cards in a grid must have consistent sizing** (use `flex flex-col` and grow content to fill height).
3. **Always include a header image or icon** when the card represents a distinct entity.
4. **Card footers contain actions only.** Never put body text in the footer.
5. **Use `raised: false`** in dense layouts (dashboards, lists with many cards).
6. **Cards are full-height in a grid** — use `h-full` on the card and flex layout.
7. **Maximum 12 cards per grid row** on desktop. Use pagination or infinite scroll beyond that.

## PrimeVue Card Theme Tokens

```css
--p-card-padding: 1.5rem;
--p-card-border-radius: 0.5rem;
--p-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
--p-card-hover-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
--p-card-border-color: var(--color-neutral-200);
--p-card-bg: var(--color-neutral-0);
--p-card-header-padding: 1.5rem 1.5rem 0;
--p-card-body-padding: 1.5rem;
--p-card-footer-padding: 0 1.5rem 1.5rem;
--p-card-header-border-width: 0 0 1px 0;
--p-card-header-border-color: var(--color-neutral-200);
```
