# Typography

## Overview

Typography scale using a 1.25 ratio (major third). Base size is 16px. All type tokens map to CSS custom properties and PrimeVue design tokens.

## Font Families

| Token | Font Stack | Usage |
|-------|-----------|-------|
| `--font-sans` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Body text, headings, UI |
| `--font-mono` | `JetBrains Mono, "Fira Code", "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace` | Code blocks, terminals, raw data |
| `--font-display` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Hero text, large display (same stack, larger sizes) |

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
}
```

## Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `--text-xs` | `0.75rem` (12px) | `1rem` (16px) | 400 | `0.025em` | Captions, helper text, metadata |
| `--text-sm` | `0.875rem` (14px) | `1.25rem` (20px) | 400 | `0.01em` | Secondary body, table cells |
| `--text-base` | `1rem` (16px) | `1.5rem` (24px) | 400 | `0em` | Default body text |
| `--text-lg` | `1.125rem` (18px) | `1.75rem` (28px) | 400 | `-0.005em` | Lead paragraphs |
| `--text-xl` | `1.25rem` (20px) | `1.75rem` (28px) | 500 | `-0.01em` | Section headings |
| `--text-2xl` | `1.5rem` (24px) | `2rem` (32px) | 600 | `-0.015em` | H4, card titles |
| `--text-3xl` | `1.875rem` (30px) | `2.25rem` (36px) | 600 | `-0.02em` | H3 |
| `--text-4xl` | `2.25rem` (36px) | `2.5rem` (40px) | 700 | `-0.025em` | H2 |
| `--text-5xl` | `3rem` (48px) | `1.2` | 700 | `-0.03em` | H1, hero |
| `--text-6xl` | `3.75rem` (60px) | `1.15` | 800 | `-0.04em` | Display / landing hero |

## Heading Definitions

### h1 — `--text-5xl` (48px / mobile: `--text-3xl` 30px)

```html
<h1 class="text-5xl font-bold tracking-tight leading-tight">
  Page Title
</h1>
```

- Max 60 characters
- Use on page-level headings only (one per page)
- Never inline; always on its own line

### h2 — `--text-4xl` (36px / mobile: `--text-2xl` 24px)

```html
<h2 class="text-4xl font-semibold tracking-tight leading-tight">
  Section Heading
</h2>
```

- Max 80 characters
- Use for major page sections

### h3 — `--text-3xl` (30px / mobile: `--text-xl` 20px)

```html
<h3 class="text-3xl font-semibold leading-tight">
  Subsection
</h3>
```

- Max 100 characters

### h4 — `--text-2xl` (24px / mobile: `--text-lg` 18px)

```html
<h4 class="text-2xl font-medium leading-snug">
  Card title, sidebar heading
</h4>
```

- Max 120 characters
- Commonly used in cards and widget titles

### h5 — `--text-xl` (20px / mobile: `--text-base` 16px)

```html
<h5 class="text-xl font-medium">
  Small section title
</h5>
```

### h6 — `--text-lg` (18px / mobile: `--text-sm` 14px)

```html
<h6 class="text-lg font-medium uppercase tracking-wide">
  Label-style heading
</h6>
```

- Uppercase + wider tracking for UI labels
- Max 150 characters

## Body Text

### Body Large — `--text-lg`

```html
<p class="text-lg leading-relaxed">
  Lead paragraph for articles, onboarding screens.
</p>
```

### Body Default — `--text-base`

```html
<p class="text-base leading-relaxed">
  Standard body text for most content areas.
</p>
```

### Body Small — `--text-sm`

```html
<p class="text-sm leading-snug">
  Table cells, dense UI areas, form helper text.
</p>
```

### Caption — `--text-xs`

```html
<p class="text-xs leading-normal text-neutral-500">
  Timestamps, footnotes, image alt text.
</p>
```

## Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | `400` | Body text, default |
| Medium | `500` | Subtle emphasis, button text, input placeholders |
| Semibold | `600` | h4, card titles, tab labels |
| Bold | `700` | h1–h3, emphasis |
| Extra Bold | `800` | Display text, hero numbers |

## Line Heights

| Scale Token | Line Height |
|-------------|-------------|
| `--text-xs` | `1rem` (16px, tight) |
| `--text-sm` | `1.25rem` (20px) |
| `--text-base` | `1.5rem` (24px) |
| `--text-lg` | `1.75rem` (28px) |
| `--text-xl` | `1.75rem` (28px) |
| `--text-2xl` | `2rem` (32px) |
| `--text-3xl` | `2.25rem` (36px) |
| `--text-4xl` | `2.5rem` (40px) |
| `--text-5xl` | `1.2` (tight) |
| `--text-6xl` | `1.15` (tight) |

## Responsive Typography

### Breakpoint Scaling

| Element | Mobile (<768px) | Desktop (>=768px) |
|---------|-----------------|-------------------|
| h1 | `--text-3xl` (30px) | `--text-5xl` (48px) |
| h2 | `--text-2xl` (24px) | `--text-4xl` (36px) |
| h3 | `--text-xl` (20px) | `--text-3xl` (30px) |
| h4 | `--text-lg` (18px) | `--text-2xl` (24px) |
| Body | `--text-base` (16px) | `--text-base` (16px) |
| Small | `--text-sm` (14px) | `--text-sm` (14px) |

### Implementation

```html
<h1 class="text-3xl md:text-5xl font-bold tracking-tight">
```

```css
/* Tailwind or CSS custom property approach */
:root {
  --type-scale-h1: clamp(1.875rem, 2vw, 3rem);
  --type-scale-h2: clamp(1.5rem, 1.5vw, 2.25rem);
  --type-scale-h3: clamp(1.25rem, 1.2vw, 1.875rem);
}
```

## PrimeVue Typography Tokens

```css
/* PrimeVue design tokens for components */
--p-text-size-sm: 0.875rem;
--p-text-size-base: 1rem;
--p-text-size-lg: 1.125rem;
--p-text-size-xl: 1.25rem;

--p-font-weight-normal: 400;
--p-font-weight-medium: 500;
--p-font-weight-semibold: 600;
--p-font-weight-bold: 700;

--p-line-height-tight: 1.2;
--p-line-height-snug: 1.375;
--p-line-height-normal: 1.5;
--p-line-height-relaxed: 1.625;
```

## Component-Specific Typography

### Button Text

```html
<!-- Small button -->
<Button label="Save" class="text-sm" />

<!-- Medium (default) -->
<Button label="Save" />

<!-- Large button -->
<Button label="Save" class="text-lg" />
```

### Table Text

```html
<p-dataTable :value="data">
  <p-column field="name" header="Name">
    <template #body="slotProps">
      <span class="text-sm">{{ slotProps.data.name }}</span>
    </template>
  </p-column>
</p-dataTable>
```

### Form Labels

```html
<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
  Email address
</label>
```

### Badge Text

```html
<p-badge value="New" class="text-xs" />
```

### Empty State Text

```html
<p class="text-base font-medium">No results found</p>
<p class="text-sm text-neutral-500">Try adjusting your search or filters.</p>
```

## Typography Rules

1. **Never use more than 2 font families.** Sans-serif for UI, mono for code/data.
2. **Never use font sizes outside the type scale.** If something doesn't fit, adjust tracking or weight instead.
3. **Always specify line height.** Never rely on browser defaults.
4. **Use `tracking-tight` for headings >= 24px.** Use `tracking-wide` for uppercase labels.
5. **Body text must use `--text-base` minimum.** Never use `--text-sm` for long-form content.
6. **Test at all responsive breakpoints** before shipping typography changes.
