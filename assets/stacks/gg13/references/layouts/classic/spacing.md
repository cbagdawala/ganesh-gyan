# Spacing

## Overview

All spacing uses a 4px base grid. Every spacing value is a multiple of 4px (except where optical adjustments are needed). Spacing is controlled via CSS custom properties and Tailwind utility classes.

## Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--space-0` | `0` | `0px` | No spacing |
| `--space-px` | `1px` | `1px` | Hairline borders |
| `--space-0\.5` | `0.125rem` | `2px` | Tight icon spacing |
| `--space-1` | `0.25rem` | `4px` | Inline element gap |
| `--space-2` | `0.5rem` | `8px` | Tight UI gaps |
| `--space-3` | `0.75rem` | `12px` | Compact form spacing |
| `--space-4` | `1rem` | `16px` | Default gap between related elements |
| `--space-5` | `1.25rem` | `20px` | Section padding (tight) |
| `--space-6` | `1.5rem` | `24px` | Section padding (standard) |
| `--space-8` | `2rem` | `32px` | Section padding (generous) |
| `--space-10` | `2.5rem` | `40px` | Hero padding |
| `--space-12` | `3rem` | `48px` | Page section spacing |
| `--space-16` | `4rem` | `64px` | Page section spacing (large) |
| `--space-20` | `5rem` | `80px` | Hero / landing spacing |
| `--space-24` | `6rem` | `96px` | Full-page section breaks |

## Margin Tokens

```css
:root {
  --margin-0: 0;
  --margin-1: 0.25rem;   /* 4px */
  --margin-2: 0.5rem;    /* 8px */
  --margin-3: 0.75rem;   /* 12px */
  --margin-4: 1rem;      /* 16px */
  --margin-6: 1.5rem;    /* 24px */
  --margin-8: 2rem;      /* 32px */
  --margin-12: 3rem;     /* 48px */
  --margin-auto: auto;
}
```

### Margin Usage

| Context | Value | Example |
|---------|-------|---------|
| Between form fields | `--space-4` (16px) | `mb-4` between inputs |
| Between list items | `--space-2` (8px) | `gap-2` in list groups |
| Between card and content | `--space-6` (24px) | Card body padding |
| Page container horizontal | `--space-6` mobile, `--space-8` desktop | Container padding |
| Section to section | `--space-12` mobile, `--space-20` desktop | Section padding |
| Header to content | `--space-8` | Page header spacing |

## Padding Tokens

```css
:root {
  --padding-card: 1.5rem;    /* 24px — default card padding */
  --padding-card-sm: 1rem;   /* 16px — compact card padding */
  --padding-card-lg: 2rem;   /* 32px — spacious card padding */
  --padding-container: 1.5rem; /* 24px mobile, auto centered desktop */
  --padding-dialog: 1.5rem;  /* 24px — dialog body padding */
  --padding-drawer: 1.5rem;  /* 24px — drawer content padding */
  --padding-sidebar: 1rem;   /* 16px — sidebar item padding */
}
```

## Gap Tokens (Flex / Grid)

```css
:root {
  --gap-1: 0.25rem;   /* 4px — tight icon + text */
  --gap-2: 0.5rem;    /* 8px — icon + text in buttons */
  --gap-3: 0.75rem;   /* 12px — compact list items */
  --gap-4: 1rem;      /* 16px — standard related items */
  --gap-6: 1.5rem;    /* 24px — card grid gap */
  --gap-8: 2rem;      /* 32px — section element gap */
  --gap-12: 3rem;     /* 48px — page section gap */
}
```

### Grid Gap Usage

| Context | Value |
|---------|-------|
| Card grid (dashboard) | `gap-6` (24px) |
| Button group | `gap-2` (8px) |
| Form row fields | `gap-4` (16px) |
| Icon list items | `gap-3` (12px) |
| Sidebar nav items | `gap-1` (4px) |

## Responsive Spacing

### Container Max Widths

Breakpoints follow the **Tailwind CSS 4 defaults** (no `xxl` — the largest is `2xl`).

| Breakpoint | Min Width | Container Max Width | Horizontal Padding |
|------------|-----------|--------------------|-------------------|
| `sm` | `640px` | `640px` | `--space-4` (16px) |
| `md` | `768px` | `768px` | `--space-6` (24px) |
| `lg` | `1024px` | `1024px` | `--space-8` (32px) |
| `xl` | `1280px` | `1280px` | `--space-12` (48px) |
| `2xl` | `1536px` | `1536px` | `--space-16` (64px) |

### Layout Spacing

```html
<!-- Page container -->
<div class="px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">

<!-- Section spacing -->
<section class="py-12 md:py-20">

<!-- Card grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
```

## PrimeVue Spacing Tokens

### Button Spacing

```css
--p-button-padding-x: 1rem;      /* 16px horizontal */
--p-button-padding-y: 0.5rem;    /* 8px vertical */
--p-button-text-gap: 0.5rem;     /* 8px icon-text gap */
--p-button-sm-padding-x: 0.75rem;
--p-button-sm-padding-y: 0.375rem;
--p-button-lg-padding-x: 1.25rem;
--p-button-lg-padding-y: 0.75rem;
```

### Card Spacing

```css
--p-card-padding: 1.5rem;        /* 24px default card padding */
--p-card-header-padding: 1.5rem 1.5rem 0;
--p-card-body-padding: 1.5rem;
--p-card-footer-padding: 0 1.5rem 1.5rem;
--p-card-header-border-width: 0 0 1px 0;
```

### DataTable Spacing

```css
--p-datatable-body-cell-padding: 1rem 1.5rem;
--p-datatable-body-cell-border-width: 0 0 1px 0;
--p-datatable-header-cell-padding: 1rem 1.5rem;
--p-datatable-header-cell-border-width: 0 0 1px 0;
--p-datatable-footer-cell-padding: 1rem 1.5rem;
--p-datatable-footer-border-width: 0 0 1px 0;
--p-datatable-row-gap: 0;          /* No gap between rows */
--p-datatable-row-hover-bg: transparent;
```

### Form Spacing

```css
--p-inputtext-padding-x: 0.75rem;    /* 12px */
--p-inputtext-padding-y: 0.625rem;   /* 10px */
--p-field-gap: 0.5rem;               /* 8px label-input gap */
--p-field-margin-bottom: 1rem;       /* 16px between fields */
--p-field-label-margin-bottom: 0.5rem; /* 8px label to input */
--p-field-help-text-margin-top: 0.25rem; /* 4px helper text */
--p-field-error-margin-top: 0.25rem;
```

### Dialog Spacing

```css
--p-dialog-header-padding: 1.5rem;
--p-dialog-header-border-width: 0 0 1px 0;
--p-dialog-body-padding: 1.5rem;
--p-dialog-footer-padding: 0 1.5rem 1.5rem;
--p-dialog-footer-gap: 0.75rem;
--p-dialog-header-title-size: 1.25rem;
```

### Drawer Spacing

```css
--p-drawer-header-padding: 1.5rem;
--p-drawer-body-padding: 1.5rem;
--p-drawer-footer-padding: 0 1.5rem 1.5rem;
--p-drawer-header-title-size: 1.25rem;
```

### Overlay / Popover Spacing

```css
--p-overlay-popover-padding: 0.75rem;
--p-overlay-popover-border-radius: 0.5rem;
--p-paginator-padding: 0.5rem 1rem;
```

## Spacing Rules

1. **Always use the spacing scale.** Never invent custom spacing values.
2. **Use `gap` (flex/grid gap) instead of margin for related element groups.**
3. **Use padding for containers, margin for separation between containers.**
4. **Minimum touch target: 44px × 44px** (follows iOS/Android guidelines).
5. **Form field vertical spacing: `--space-4` (16px) between each field.**
6. **Card internal padding: `--space-6` (24px) minimum.**
7. **Desktop page horizontal padding: `--space-8` (32px) minimum.**
8. **Never use negative margins in layout.** Use them only for deliberate visual overlaps (e.g., floating action buttons).
9. **Consistent horizontal rhythm:** All vertical spacing must be a multiple of `--space-4` (16px) at the container level.
