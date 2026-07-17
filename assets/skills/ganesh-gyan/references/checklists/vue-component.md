# Vue Component Checklist

Use this checklist when creating or reviewing a Vue 3 + PrimeVue component.

---

## Checklist

### Structure

- [ ] `<script setup lang="ts">` used
- [ ] `<template>` and `<style scoped>` present
- [ ] Single Responsibility: component does one thing well
- [ ] Props and emits defined with TypeScript interfaces
- [ ] No `export default` (uses `<script setup>`)
- [ ] No inline styles (use PrimeVue classes or CSS variables)

### Props

- [ ] Props typed with `defineProps<Props>()`
- [ ] Default values set with `withDefaults()`
- [ ] Props are `readonly` (not mutated inside component)
- [ ] Props documented in interface
- [ ] Optional props have sensible defaults
- [ ] No `any` type in prop definitions
- [ ] Prop names use camelCase

### Emits

- [ ] Emits typed with `defineEmits<Emits>()`
- [ ] Emit names use kebab-case convention or camelCase consistently
- [ ] Emitted data matches defined types
- [ ] No unnecessary emits (avoid emitting values that are already props)
- [ ] Emit descriptions in interface comments

### State Management

- [ ] `ref()` for primitive state
- [ ] `reactive()` for object state
- [ ] `computed()` for derived state (not methods)
- [ ] State is private to component unless exposed
- [ ] No global state for component-internal data
- [ ] Large arrays use `shallowRef()` if deep reactivity not needed
- [ ] State reset in `onUnmounted` if needed

### Async Operations

- [ ] Loading state tracked (`loading` ref)
- [ ] Error state tracked (`error` ref or try/catch)
- [ ] API requests use try/catch with toast notifications
- [ ] Requests cancelled on unmount (AbortController)
- [ ] Debounced search inputs (300ms delay)
- [ ] No multiple simultaneous requests without deduplication

### PrimeVue Components

- [ ] Components imported individually (not all from `primevue`)
- [ ] Correct props passed to PrimeVue components
- [ ] Events handled correctly (`@event` syntax)
- [ ] Slots used for customization
- [ ] `pt` (pass-through) used sparingly for custom styling
- [ ] Theme tokens used instead of custom CSS
- [ ] Component version compatible with PrimeVue 4

### Data Display

- [ ] DataTable uses pagination with `meta` + `links`
- [ ] DataTable has sortable columns with validated sort
- [ ] Empty state message shown when no data
- [ ] Loading state (skeleton or spinner) shown during fetch
- [ ] Row selection handled properly
- [ ] Filters work correctly with server-side pagination
- [ ] Actions column uses ButtonGroup
- [ ] Tags/Status use PrimeVue Tag with severity

### Forms

- [ ] Form inputs use `v-model` for two-way binding
- [ ] Required fields indicated with `*`
- [ ] Validation errors shown inline below inputs
- [ ] `p-invalid` class applied on validation errors
- [ ] Submit button disabled during submission
- [ ] Cancel/back navigation available
- [ ] Unsaved changes warning (`beforeunload`)
- [ ] File uploads show preview
- [ ] Form resets after successful save

### Accessibility

- [ ] All interactive elements have labels
- [ ] Icon buttons have `aria-label`
- [ ] Form inputs have associated labels (`<label for="id">`)
- [ ] Error messages linked to inputs (`aria-describedby`)
- [ ] Dialogs have focus trap
- [ ] Focus returns to trigger element after dialog closes
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Live regions for dynamic content (`aria-live`)
- [ ] Sufficient color contrast (4.5:1 for text)
- [ ] Focus outline visible (2px, 2px offset)

### Responsive Design

- [ ] Mobile layout tested at 320px, 375px, 768px, 1024px, 1440px
- [ ] Touch targets at least 44x44px
- [ ] DataTable columns hide on mobile (responsive columns)
- [ ] Sidebar/drawer collapses on small screens
- [ ] Images scale with `max-width: 100%`
- [ ] Font sizes readable on mobile (minimum 14px body)
- [ ] Grid system used for layout (PrimeVue Grid)

### Performance

- [ ] `v-memo` on expensive list items
- [ ] `computed()` instead of methods for derived data
- [ ] Lazy-loaded heavy components with `defineAsyncComponent()`
- [ ] Virtual scrolling for large DataTables
- [ ] No unnecessary re-renders (avoid inline functions in templates)
- [ ] Debounced search before API calls
- [ ] Canceled pending requests on unmount
- [ ] PrimeVue components imported individually (tree-shaking)

### Error Handling

- [ ] Network errors caught and displayed (toast)
- [ ] Validation errors displayed inline
- [ ] Server errors displayed clearly
- [ ] Retry mechanism for failed operations
- [ ] Offline detection with appropriate message
- [ ] No raw error messages exposed to users

### Code Quality

- [ ] No `console.log` or `debugger` statements
- [ ] No unused imports
- [ ] No unused variables
- [ ] Composables extracted for shared logic
- [ ] TypeScript strict mode (no `any`)
- [ ] Prettier formatting applied
- [ ] ESLint passes with no errors
- [ ] Comments only for non-obvious logic
- [ ] Meaningful variable/function names

### Testing

- [ ] Component unit tests written
- [ ] Props tested with valid/invalid values
- [ ] Emits tested on interactions
- [ ] Loading/error states tested
- [ ] Computed properties tested
- [ ] Methods tested with edge cases
- [ ] Snapshot tests for stable output
- [ ] Accessibility tested (axe-core)

---

## Quick Validation

```bash
# Lint check
npm run lint

# Type check
npm run type-check

# Component tests
npm run test -- --reporter=verbose src/modules/{module}/components/

# Visual inspection
# Check at multiple viewport sizes
# Verify keyboard navigation
# Verify color contrast
```
