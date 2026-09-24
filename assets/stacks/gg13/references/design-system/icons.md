# Icons

## Overview

PrimeIcons is the primary icon set for this project. Custom SVG icons are used sparingly for brand-specific or complex illustrations. All icons must meet minimum size and contrast requirements.

## Setup

PrimeIcons is a separate package from PrimeVue — without it every `pi pi-*` icon renders blank.

```bash
npm install primeicons@^8.0
```

Import the stylesheet once, in the app entry, alongside the PrimeVue setup:

```ts
// resources/js/app.ts
import 'primeicons/primeicons.css'
```

## PrimeIcons

### Usage

```html
<!-- Basic icon (PrimeIcons is a plain icon font — use an <i> element) -->
<i class="pi pi-check" />

<!-- In a button -->
<Button label="Save" icon="pi pi-check" />

<!-- Standalone icon with size -->
<i class="pi pi-user text-xl" />

<!-- With PrimeVue IconField for icon-input combo -->
<IconField>
  <InputIcon class="pi pi-search" />
  <InputText v-model="search" placeholder="Search..." />
</IconField>
```

### Commonly Used Icons

| Icon Name | Unicode | Usage |
|-----------|---------|-------|
| `pi pi-home` | `e800` | Home / Dashboard navigation |
| `pi pi-users` | `e801` | User management, team |
| `pi pi-cog` / `pi pi-settings` | `e80d` | Settings, configuration |
| `pi pi-search` | `e805` | Search functionality |
| `pi pi-filter` | `e804` | Filter controls |
| `pi pi-sort` | `e814` | Sort controls |
| `pi pi-plus` | `e80a` | Add / Create actions |
| `pi pi-pencil` / `pi pi-edit` | `e80b` | Edit actions |
| `pi pi-trash` | `e80c` | Delete actions |
| `pi pi-eye` | `e806` | View / Preview actions |
| `pi pi-download` | `e80f` | Download actions |
| `pi pi-upload` | `e810` | Upload actions |
| `pi pi-refresh` | `e809` | Reload / Refresh actions |
| `pi pi-check` | `e807` | Success, confirm, complete |
| `pi pi-times` / `pi pi-window-close` | `e808` | Close, cancel, dismiss |
| `pi pi-exclamation-triangle` | `e811` | Warnings |
| `pi pi-info-circle` | `e80e` | Information |
| `pi pi-exclamation-circle` | `e812` | Errors |
| `pi pi-question-circle` | `e813` | Help, FAQ |
| `pi pi-chevron-right` | `e815` | Navigation, expand |
| `pi pi-chevron-down` | `e816` | Collapse, dropdown |
| `pi pi-chevron-left` | `e817` | Back navigation |
| `pi pi-arrow-up` / `pi pi-arrow-down` | `e818` / `e819` | Directional navigation |
| `pi pi-calendar` | `e802` | Date pickers, scheduling |
| `pi pi-clock` | `e803` | Time, history |
| `pi pi-bell` | `e81a` | Notifications |
| `pi pi-briefcase` | `e81b` | Work, projects |
| `pi pi-chart-bar` | `e81c` | Analytics, charts |
| `pi pi-flag` | `e81d` | Featured, status |

### Icon Sizes

| Token | Class | Pixels | Usage |
|-------|-------|--------|-------|
| `xs` | `text-base` | 16px | Inline text, badges |
| `sm` | `text-lg` | 18px | Small buttons, compact UI |
| `md` | `text-xl` | 20px | Default, standard buttons |
| `lg` | `text-2xl` | 24px | Empty states, large actions |
| `xl` | `text-3xl` | 30px | Page headers, hero icons |
| `2xl` | `text-4xl` | 36px | Landing pages, onboarding |

```html
<i class="pi pi-check text-base" />   <!-- 16px -->
<i class="pi pi-check text-lg" />    <!-- 18px -->
<i class="pi pi-check text-xl" />    <!-- 20px (default) -->
<i class="pi pi-check text-2xl" />   <!-- 24px -->
```

### Icon Colors

```css
/* Use semantic color tokens, never hardcoded icon colors */
.icon-primary { color: var(--color-primary-500); }
.icon-success { color: var(--color-success-500); }
.icon-warning { color: var(--color-warning-500); }
.icon-danger  { color: var(--color-danger-500); }
.icon-info    { color: var(--color-info-500); }
.icon-muted   { color: var(--color-text-secondary); }
.icon-current { color: currentColor; } /* Inherits from parent */
```

### Icon States

```html
<!-- Disabled icon -->
<i class="pi pi-star text-neutral-400" />

<!-- Hover state -->
<i class="pi pi-edit hover:text-primary-600 transition-colors duration-150" />

<!-- Active/selected -->
<i class="pi pi-home text-primary-500" />

<!-- Loading spinner -->
<i class="pi pi-spinner pi-spin text-lg" />
```

## Icon + Text Combinations

### Buttons

```html
<!-- Icon left, text right (default) -->
<Button label="Save" icon="pi pi-check" />

<!-- Icon right -->
<Button label="Next" icon="pi pi-arrow-right" icon-pos="right" />

<!-- Icon only (no text) -->
<Button icon="pi pi-plus" aria-label="Add new" />

<!-- Text only, icon via slot -->
<Button>
  <template #icon>
    <i class="pi pi-check" />
  </template>
  Save
</Button>
```

### Tab Navigation

```html
<!-- PrimeVue 4 composed Tabs API — place icon markup directly in <Tab> -->
<Tab value="dashboard">
  <div class="flex items-center gap-2">
    <i class="pi pi-home" />
    <span>Dashboard</span>
  </div>
</Tab>
```

### List Items

```html
<div class="flex items-center gap-3">
  <i class="pi pi-file text-lg text-neutral-500" />
  <div>
    <p class="text-sm font-medium">{{ file.name }}</p>
    <p class="text-xs text-neutral-500">{{ file.size }}</p>
  </div>
</div>
```

## Icon vs Text Decision

### Use Icons When

- The action is universally understood (edit, delete, search, close).
- Space is constrained (table actions, mobile navigation).
- The icon reinforces a text label (icon + text button).
- Status indication (checkmark for success, exclamation for warning).

### Use Text (or Icon + Text) When

- The action is domain-specific or ambiguous.
- Accessibility requires clear labeling (`aria-label` is not enough for complex actions).
- The icon might not be recognized by all users.
- State changes need explicit labeling (e.g., "Follow" vs "Following").

### Rules

1. **Never use icon-only buttons for critical actions** (delete, submit) without a tooltip or `aria-label`.
2. **Always provide `aria-label` on icon-only elements.**
3. **Use PrimeIcons as the default.** Only add custom SVGs for brand-specific or complex icons not covered by PrimeIcons.
4. **Keep icon + text buttons consistent:** icon always on the left, 8px gap between icon and text.
5. **Icon buttons must have minimum 40×40px touch target.**

## Custom Icon Integration

### Adding Custom SVG Icons

```html
<!-- Inline SVG icon -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  class="w-5 h-5"
  aria-hidden="true"
>
  <path
    fill="currentColor"
    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10..."
  />
</svg>
```

### SVG Sprite Sheet (Recommended for Multiple Custom Icons)

```html
<!-- Define in app layout or main component -->
<svg style="display: none">
  <symbol id="icon-brand-logo" viewBox="0 0 24 24">
    <path fill="currentColor" d="..." />
  </symbol>
  <symbol id="icon-custom-action" viewBox="0 0 24 24">
    <path fill="currentColor" d="..." />
  </symbol>
</svg>

<!-- Use -->
<svg class="w-5 h-5">
  <use href="#icon-brand-logo" />
</svg>
```

### Reusable Custom Icon Component

PrimeVue 4 has **no** `defineCustomIconSet` API. To reuse a custom SVG icon, wrap it in a small Vue component (or reference an SVG sprite `<symbol>` as shown above). PrimeVue components that accept an `icon` prop take a PrimeIcons class string; for custom art, use their icon slots instead.

```vue
<!-- components/BrandLogoIcon.vue -->
<template>
  <svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true">
    <path fill="currentColor" d="..." />
  </svg>
</template>
```

```html
<!-- Reuse anywhere -->
<BrandLogoIcon class="text-primary-500" />

<!-- Inside a component that supports an icon slot -->
<Button aria-label="Brand action">
  <template #icon>
    <BrandLogoIcon />
  </template>
</Button>
```

## Icon Accessibility

1. **Decorative icons:** `aria-hidden="true"` on the icon container.
2. **Functional icons (icon buttons):** `aria-label` describing the action.
3. **Icon + text combinations:** `aria-hidden="true"` on the icon, text is the accessible label.
4. **Status icons (success, error):** Must be paired with visible text or `aria-live` region.
5. **Minimum icon size: 16px** for readability on all devices.

## PrimeVue Icon Components

PrimeVue has **no** generic `<Icon>` component — PrimeIcons render as `<i class="pi pi-*" />`. For icon-in-input layouts, use `IconField` + `InputIcon`. In PrimeVue 4 `IconField` has **no** `iconPosition` prop; placement is inferred from where `<InputIcon>` sits relative to the input.

```html
<!-- A PrimeIcon is just an <i> element -->
<i class="pi pi-check" />

<!-- IconField with a leading icon (icon before the input) -->
<IconField>
  <InputIcon class="pi pi-search" />
  <InputText v-model="search" />
</IconField>

<!-- IconField with a trailing icon (icon after the input) -->
<IconField>
  <InputText v-model="search" />
  <InputIcon class="pi pi-times" />
</IconField>
```

## Icon Spacing Rules

| Context | Icon-Text Gap | Icon-Sibling Gap |
|---------|---------------|-----------------|
| Button (icon + text) | `gap-2` (8px) | — |
| List item (icon + content) | `gap-3` (12px) | — |
| Navigation link | `gap-2` (8px) | — |
| Form field icon prefix | `gap-1` (4px) | — |
| Card icon (standalone) | — | `gap-2` (8px) with text |
| Empty state icon | — | `gap-4` (16px) with heading |
