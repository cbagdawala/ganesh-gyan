# Buttons

## Overview

PrimeVue `Button` component is the standard for all interactive actions. Use semantic color types, consistent sizing, and proper state management.

## Button Types

### Primary

```html
<Button label="Save Changes" icon="pi pi-check" />
<Button label="Create User" icon="pi pi-plus" />
```

- Used for the **primary action** on a page or dialog (e.g., Save, Submit, Create).
- One primary button per container (form, dialog, page).
- Color: `--color-primary-600` background, white text.

### Secondary

```html
<Button label="Cancel" severity="secondary" />
<Button label="Back" severity="secondary" icon="pi pi-arrow-left" />
```

- Used for **secondary actions** alongside a primary action.
- Outline style with primary border color.
- Color: transparent background, `--color-primary-600` border and text.

### Success

```html
<Button label="Publish" severity="success" icon="pi pi-check" />
```

- Used for **non-destructive confirmations** that create or activate something.
- Color: `--color-success-600` background.

### Danger / Destructive

```html
<Button label="Delete" severity="danger" icon="pi pi-trash" />
<Button label="Cancel Subscription" severity="danger" outlined text />
```

- Used for **destructive actions** (delete, remove, cancel, unsubscribe).
- Always use `outlined` or `text` variant for destructive actions in forms/dialogs.
- Color: `--color-danger-600` background (outlined) or red text (text variant).

### Plain / Ghost

```html
<Button label="Options" icon="pi pi-ellipsis-v" plain />
<Button label="More" icon="pi pi-chevron-down" plain />
```

- Used for **less prominent actions** in toolbars, headers, and overflow menus.
- No background, no border. Only icon or text color.
- Hover adds subtle background (`--color-neutral-100`).

### Link

```html
<Button label="Learn more" link />
```

- Text-only styling, underlined on hover.
- Used for inline actions within content (e.g., "View details").

## Button Sizes

| Size | Class / Prop | Padding X | Padding Y | Font Size | Icon Size | Use Case |
|------|-------------|-----------|-----------|-----------|-----------|----------|
| Small | `size="small"` | `0.75rem` | `0.375rem` | `text-sm` | `text-base` | Compact tables, toolbars, form footers |
| Medium (default) | — | `1rem` | `0.5rem` | `text-base` | `text-lg` | Default actions, dialogs |
| Large | `size="large"` | `1.25rem` | `0.75rem` | `text-lg` | `text-xl` | Hero actions, empty states, landing pages |

```html
<!-- Small button -->
<Button label="Edit" size="small" icon="pi pi-pencil" />

<!-- Medium (default) -->
<Button label="Save" icon="pi pi-check" />

<!-- Large button -->
<Button label="Get Started" size="large" icon="pi pi-arrow-right" />
```

## Button States

### Loading

```html
<Button label="Saving..." :disabled="loading" :loading="loading" icon="pi pi-check" />
```

- Shows PrimeVue built-in spinner.
- Label changes to loading message (e.g., "Saving...", "Submitting...").
- Disables the button to prevent double-submission.
- **Always show a loading state for async actions.**

### Disabled

```html
<Button label="Save" :disabled="!isValid" />
<Button label="Save" :disabled="true" severity="primary" />
```

- Color: `--color-neutral-400` background, `--color-neutral-500` text.
- Remove pointer cursor (`pointer-events: none`).
- Use `:disabled` binding (never static `disabled`).

### Hover State

- Primary: darken background to `--color-primary-700`.
- Secondary: add `--color-primary-50` background.
- Danger: darken to `--color-danger-700`.
- Transition: `duration-150 ease-in-out`.

### Active / Pressed State

- Primary: darken to `--color-primary-800`.
- Transition: `duration-75 ease-in`.

### Focus Ring

```css
/* PrimeVue default focus ring */
--p-button-focus-ring-color: var(--color-primary-300);
--p-button-focus-ring-offset: 2px;
--p-button-focus-ring-shadow: 0 0 0 2px var(--color-primary-300);
```

## Icon + Text Combinations

### Icon Position

| Position | Prop | Example |
|----------|------|---------|
| Left (default) | `icon="pi pi-check"` | `<Button icon="pi pi-check" label="Save" />` |
| Right | `icon-pos="right"` | `<Button icon="pi pi-arrow-right" label="Next" icon-pos="right" />` |
| Icon only | No `label` | `<Button icon="pi pi-plus" aria-label="Add" />` |

### Gap and Alignment

```html
<!-- Default: icon left, 8px gap -->
<Button label="Save Changes" icon="pi pi-check" />

<!-- Icon right, 8px gap -->
<Button label="Next Step" icon="pi pi-arrow-right" icon-pos="right" />

<!-- Icon + text in header area -->
<Button>
  <template #icon>
    <i class="pi pi-download" />
  </template>
  Export CSV
</Button>
```

### Rules

1. **Icon always on the left** for left-to-right languages (default).
2. **Always 8px gap** between icon and text (`gap-2`).
3. **Icon size matches button size:** sm→text-base, md→text-lg, lg→text-xl.
4. **Icon-only buttons require `aria-label`.**
5. **Never put icon and text in both positions** (no icon on both sides).

## Button Grouping

### Inline Group (toolbar, form actions)

```html
<div class="flex items-center gap-2">
  <Button label="Cancel" severity="secondary" />
  <Button label="Save" icon="pi pi-check" />
</div>
```

### Block Group (full-width stacked)

```html
<div class="flex flex-col gap-3">
  <Button label="Save Changes" icon="pi pi-check" class="w-full" />
  <Button label="Cancel" severity="secondary" class="w-full" />
</div>
```

### Rules for Button Groups

1. **Maximum 3 buttons** in an inline group. More → use a dropdown or separate section.
2. **Primary action is always the rightmost button** in a horizontal group (F-pattern reading).
3. **Group buttons together visually** with no more than `gap-2` (8px) between them.
4. **Stack vertically** on mobile (`flex-col sm:flex-row`).

## Button Spacing

| Context | Value |
|---------|-------|
| Between buttons in a group | `gap-2` (8px) |
| Button group to content | `gap-4` (16px) |
| Button group at bottom of form/dialog | `mt-4` (16px) top margin from content |
| Full-width button to next element | `gap-4` (16px) |

## PrimeVue Button Theme Tokens

```css
--p-button-padding-x: 1rem;
--p-button-padding-y: 0.5rem;
--p-button-border-radius: 0.5rem;
--p-button-text-gap: 0.5rem;
--p-button-transition-duration: 150ms;

/* Severity-specific */
--p-button-primary-bg: var(--color-primary-600);
--p-button-primary-border-color: var(--color-primary-600);
--p-button-primary-text-color: #ffffff;
--p-button-primary-hover-bg: var(--color-primary-700);
--p-button-primary-hover-border-color: var(--color-primary-700);

--p-button-secondary-bg: transparent;
--p-button-secondary-border-color: var(--color-primary-600);
--p-button-secondary-text-color: var(--color-primary-600);
--p-button-secondary-hover-bg: var(--color-primary-50);

--p-button-success-bg: var(--color-success-600);
--p-button-danger-bg: var(--color-danger-600);
```

## Button Rules

1. **One primary action per container.** Never have two primary buttons side by side.
2. **Use semantic severity types** (`primary`, `secondary`, `success`, `danger`) — never custom colors.
3. **Always show loading state for async actions.** Never allow double submission.
4. **Icon-only buttons must have `aria-label`.**
5. **Destructive actions use outlined/text variant** in forms and dialogs (not filled).
6. **Buttons are always full-width on mobile** when in a stacked group.
7. **Minimum 40px touch target height.**
8. **Disable rather than hide** unavailable actions (shows state to the user).
