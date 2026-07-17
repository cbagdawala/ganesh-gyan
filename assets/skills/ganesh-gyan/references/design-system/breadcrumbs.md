# Breadcrumbs

## Overview

PrimeVue `Breadcrumb` component for navigation paths. Use for deep page hierarchies and multi-step navigation.

## Basic Breadcrumb

```html
<Breadcrumb :home="home" :model="items" />
```

### Home Item

```js
const home = {
  icon: 'pi pi-home',
  to: '/',
};
```

### Items

```js
const items = ref([
  { label: 'Users', to: '/users' },
  { label: 'John Doe', to: '/users/1' },
  { label: 'Settings', current: true },
]);
```

### With Icons

```html
<Breadcrumb :home="home" :model="items" />
```

```js
const home = {
  icon: 'pi pi-home',
  to: '/',
};

const items = ref([
  { label: 'Users', icon: 'pi pi-users', to: '/users' },
  { label: 'John Doe', icon: 'pi pi-user', to: '/users/1' },
  { label: 'Settings', icon: 'pi pi-cog', current: true },
]);
```

## Breadcrumb Variants

### Standard Breadcrumb

```html
<Breadcrumb :home="home" :model="items" />
```

- Default styling.
- Used for **page navigation**.

### Compact Breadcrumb

```html
<Breadcrumb :home="home" :model="items" class="text-sm" />
```

- Smaller font size (`text-sm`).
- Used for **dense UI**, **mobile navigation**.

### Custom Separator

```html
<Breadcrumb :home="home" :model="items" :separator="'>'" />
```

- Default separator: `pi pi-chevron-right`.
- Custom separator: `/`, `>`, `|`, etc.
- Use text separators for **accessibility** (screen readers).

## Breadcrumb States

### Active State (Current Page)

```js
const items = ref([
  { label: 'Users', to: '/users' },
  { label: 'John Doe', current: true },
]);
```

- Current item: `font-semibold`, `--color-neutral-800` (light) / `--color-neutral-200` (dark).
- No link (`to` prop omitted).
- Last item is always the current page.

### Hover State

```css
/* Breadcrumb link hover */
.p-breadcrumb .p-menuitem-link:hover {
  color: var(--color-primary-600);
}
```

- Hover color: `--color-primary-600`.
- Transition: `duration-150 ease-in-out`.

### Focus State

```css
/* Breadcrumb link focus */
.p-breadcrumb .p-menuitem-link:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

- Focus ring: `2px solid --color-primary-500`.
- Offset: `2px`.

## Breadcrumb Separator

### Icon Separator (Default)

```html
<Breadcrumb :home="home" :model="items" />
```

- Separator: `pi pi-chevron-right`.
- Color: `--color-neutral-400`.
- Size: `text-xs` (12px).

### Text Separator

```html
<Breadcrumb :home="home" :model="items" :separator="'/'" />
```

- Separator: `/`, `>`, `|`, etc.
- Color: `--color-neutral-400`.
- Use for **accessibility** (screen readers).

### Custom Separator Slot

```html
<Breadcrumb :home="home" :model="items">
  <template #separator>
    <i class="pi pi-chevron-right text-xs text-neutral-400" />
  </template>
</Breadcrumb>
```

- Custom separator icon.
- Use for **brand-specific separators**.

## Responsive Collapse

### Mobile Collapse

```html
<Breadcrumb :home="home" :model="items" class="md:flex" />
```

- On mobile: collapse to last 2 items (current + parent).
- Use `@media` or responsive classes to hide intermediate items.

### Dropdown Collapse

```html
<Breadcrumb :home="home" :model="items">
  <template #start>
    <!-- Custom start content -->
  </template>
  <template #item="{ item, props, hasSubmenu, root }">
    <a v-if="!item.current" v-bind="props.action" class="text-sm">
      {{ item.label }}
    </a>
    <span v-else class="text-sm font-semibold">{{ item.label }}</span>
  </template>
</Breadcrumb>
```

- Custom item rendering.
- Use `v-if` / `v-else` for conditional styling.
- **Limit to 5–7 items** before using collapse.

## Breadcrumb Rules

1. **Use breadcrumbs for deep hierarchies** (3+ levels).
2. **Show current page as the last item** (non-clickable, bold).
3. **Use icons** for better recognition (home, users, settings).
4. **Limit to 5–7 items.** More → use a sidebar or dropdown.
5. **Collapse on mobile** (show last 2 items or use dropdown).
6. **Persist breadcrumb state** in URL for bookmarking.
7. **Use text separators** for accessibility (screen readers).
8. **Home icon links to the root** (`/`).
9. **Hover state: primary color.** Focus state: primary ring.
10. **Test on mobile:** ensure breadcrumbs are usable on small screens.

## PrimeVue Breadcrumb Theme Tokens

```css
--p-breadcrumb-padding: 0.5rem 1rem;
--p-breadcrumb-border-radius: 0.5rem;
--p-breadcrumb-bg: transparent;
--p-breadcrumb-border-color: transparent;
--p-breadcrumb-item-gap: 0.5rem;
--p-breadcrumb-item-link-padding: 0.5rem 0.75rem;
--p-breadcrumb-item-link-text-color: var(--color-neutral-600);
--p-breadcrumb-item-link-hover-text-color: var(--color-primary-600);
--p-breadcrumb-item-link-focus-ring-color: var(--color-primary-300);
--p-breadcrumb-item-current-text-color: var(--color-neutral-800);
--p-breadcrumb-separator-color: var(--color-neutral-400);
--p-breadcrumb-separator-icon-size: 0.75rem;
--p-breadcrumb-transition-duration: 150ms;

/* Dark mode */
:root.dark {
  --p-breadcrumb-item-link-text-color: var(--color-neutral-400);
  --p-breadcrumb-item-link-hover-text-color: var(--color-primary-400);
  --p-breadcrumb-item-current-text-color: var(--color-neutral-200);
  --p-breadcrumb-separator-color: var(--color-neutral-500);
}
```
