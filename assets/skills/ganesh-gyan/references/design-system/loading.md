# Loading

## Overview

PrimeVue `ProgressSpinner`, `ProgressBar`, and `Skeleton` components for loading states. Use to indicate async operations and improve perceived performance.

## ProgressSpinner

### Basic Spinner

```html
<ProgressSpinner style="width: 40px; height: 40px" />
```

- Used for **small loading indicators** (buttons, inline content).
- Default size: 40×40px.

### Large Spinner

```html
<ProgressSpinner style="width: 60px; height: 60px" />
```

- Used for **page-level loading** (empty states, full-page).
- Size: 60×60px.

### Color

```html
<!-- Primary color (default) -->
<ProgressSpinner style="width: 40px; height: 40px" />

<!-- Custom color -->
<ProgressSpinner
  style="width: 40px; height: 40px"
  :style="{ stroke: 'var(--color-primary-500)' }"
/>
```

- Default stroke color: `--color-primary-500`.
- Use semantic colors for different contexts (success, error).

### Animation

```css
/* Spinner animation */
.p-progress-spinner-circle {
  animation: p-progress-spinner-dash 1.5s ease-in-out infinite;
  stroke: var(--color-primary-500);
}

@keyframes p-progress-spinner-dash {
  0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
  100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
}
```

- Duration: 1.5s.
- Ease: `ease-in-out`.
- Infinite loop.

## ProgressBar

### Linear Progress

```html
<ProgressBar :value="50" :style="{ height: '6px' }" />
```

- Used for **file uploads, form steps, progress indicators**.
- Height: 6px (default).
- Value: 0–100.

### Indeterminate Progress

```html
<ProgressBar mode="indeterminate" :style="{ height: '6px' }" />
```

- Used for **unknown duration operations** (page load, search).
- Animated stripe moving across the bar.

### Color

```html
<!-- Primary (default) -->
<ProgressBar :value="50" />

<!-- Success -->
<ProgressBar :value="100" :class="'bg-success-500'" />

<!-- Error -->
<ProgressBar :value="30" :class="'bg-danger-500'" />
```

- Default: `--color-primary-500`.
- Use semantic colors for different contexts.

### Label

```html
<ProgressBar :value="50" :showValue="true" />
```

- Show percentage label on the bar.
- Font size: `text-xs` (12px).
- Color: white (on colored bar).

## Skeleton Loading

### Card Skeleton

```html
<div class="animate-pulse">
  <div class="h-48 bg-neutral-200 rounded-t-lg" />
  <div class="p-6">
    <div class="h-6 bg-neutral-200 rounded w-3/4 mb-4" />
    <div class="h-4 bg-neutral-200 rounded w-full mb-2" />
    <div class="h-4 bg-neutral-200 rounded w-5/6" />
  </div>
</div>
```

- Used for **card loading states**.
- Placeholder shapes match content structure.
- Animation: `animate-pulse` (Tailwind).

### Table Skeleton

```html
<div class="space-y-3">
  <div v-for="i in 5" :key="i" class="flex items-center gap-4 animate-pulse">
    <div class="h-10 w-10 bg-neutral-200 rounded-full" />
    <div class="flex-1 space-y-2">
      <div class="h-4 bg-neutral-200 rounded w-1/3" />
      <div class="h-3 bg-neutral-200 rounded w-2/3" />
    </div>
  </div>
</div>
```

- Used for **table row loading states**.
- Placeholder shapes match row structure.
- 5 placeholder rows (default).

### Text Skeleton

```html
<div class="space-y-2 animate-pulse">
  <div class="h-4 bg-neutral-200 rounded w-full" />
  <div class="h-4 bg-neutral-200 rounded w-5/6" />
  <div class="h-4 bg-neutral-200 rounded w-4/6" />
</div>
```

- Used for **text content loading states**.
- Placeholder lines match text length.

### Avatar Skeleton

```html
<div class="w-12 h-12 bg-neutral-200 rounded-full animate-pulse" />
```

- Used for **avatar loading states**.
- Size: 48×48px (default).
- Shape: circle (`rounded-full`).

### Button Skeleton

```html
<div class="h-10 w-24 bg-neutral-200 rounded animate-pulse" />
```

- Used for **button loading states**.
- Size: 40px height, 96px width (default).
- Shape: rounded (`rounded`).

## Full-Page Loading

### Page Loader

```html
<div class="fixed inset-0 bg-neutral-0 dark:bg-neutral-950 flex items-center justify-center z-50">
  <div class="text-center">
    <ProgressSpinner style="width: 60px; height: 60px" />
    <p class="mt-4 text-sm text-neutral-500">Loading...</p>
  </div>
</div>
```

- Used for **initial page load**.
- Full-screen overlay.
- Spinner + loading text.

### Route Transition Loader

```html
<script setup>
import { useRoute, useRouter } from 'vue-router';
import { ref } from 'vue';

const route = useRoute();
const loading = ref(false);

const router = useRouter();
router.beforeEach(() => { loading.value = true; });
router.afterEach(() => { loading.value = false; });
</script>

<template>
  <Transition name="fade">
    <div v-if="loading" class="fixed inset-0 bg-neutral-0 dark:bg-neutral-950 flex items-center justify-center z-50">
      <ProgressSpinner style="width: 60px; height: 60px" />
    </div>
  </Transition>
  <RouterView />
</template>
```

- Used for **route transitions**.
- Show spinner during navigation.
- Transition: `fade` (opacity).

## Button Loading State

```html
<Button
  label="Saving..."
  :loading="loading"
  :disabled="loading"
  icon="pi pi-check"
/>
```

- Shows spinner inside button.
- Label changes to loading message.
- Button disabled to prevent double-submission.

## Loading Rules

1. **Show loading state for all async operations.**
2. **Use skeleton loaders** for initial content load (better than blank screen).
3. **Use spinners** for ongoing operations (search, filter, submit).
4. **Use progress bars** for known-duration operations (upload, form steps).
5. **Loading states must be dismissible** for long operations (cancel button).
6. **Show loading text** for clarity ("Loading...", "Saving...", "Uploading...").
7. **Disable interactions** during loading to prevent race conditions.
8. **Animate loading states** (spinner rotation, skeleton pulse).
9. **Test loading states in dark mode.**
10. **Remove loading state immediately** when operation completes.

## PrimeVue Loading Theme Tokens

```css
/* ProgressSpinner */
--p-progressspinner-color: var(--color-primary-500);
--p-progressspinner-stroke-width: 4px;
--p-progressspinner-animation-duration: 1.5s;

/* ProgressBar */
--p-progressbar-height: 6px;
--p-progressbar-border-radius: 9999px;
--p-progressbar-bg: var(--color-neutral-200);
--p-progressbar-value-bg: var(--color-primary-500);
--p-progressbar-value-text-color: #ffffff;
--p-progressbar-value-font-size: 0.75rem;

/* Skeleton */
--p-skeleton-bg: var(--color-neutral-200);
--p-skeleton-animation: pulse;
--p-skeleton-border-radius: 0.25rem;
```
