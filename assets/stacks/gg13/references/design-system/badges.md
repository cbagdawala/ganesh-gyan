# Badges

## Overview

PrimeVue `Badge` component for status indicators, counts, and labels. Use sparingly to avoid visual noise.

## Badge Types

### Primary (Default) Badge

```html
<p-badge value="New" />
```

- The **default** badge (no `severity`) renders in the primary color. `severity="primary"` is **not** a valid value in PrimeVue 4.
- Valid severities: `secondary`, `info`, `success`, `warn`, `danger`, `contrast`.
- Used for **neutral status labels** (New, Updated, Beta).
- Color: `--color-primary-600` background, white text.

### Success Badge

```html
<p-badge value="Active" severity="success" />
<p-badge value="12" severity="success" />
```

- Used for **positive states** (online, completed, approved).
- Color: `--color-success-600` background.

### Warning Badge

```html
<p-badge value="Pending" severity="warn" />
```

- Used for **caution states** (pending, review, expiring).
- Color: `--color-warning-600` background.

### Danger Badge

```html
<p-badge value="Error" severity="danger" />
<p-badge value="3" severity="danger" />
```

- Used for **error or critical states** (offline, failed, overdue).
- Color: `--color-danger-600` background.

### Info Badge

```html
<p-badge value="Info" severity="info" />
```

- Used for **informational states** (notice, tip).
- Color: `--color-info-600` background.

### Secondary Badge

```html
<p-badge value="Draft" severity="secondary" />
```

- Used for **neutral, low-emphasis labels**.
- Color: `--color-neutral-600` background.

## Badge Sizes

| Size | Class / Prop | Font Size | Padding | Use Case |
|------|-------------|-----------|---------|----------|
| Small | `size="small"` | `text-xs` | `0.25rem 0.5rem` | Inline text, table cells |
| Medium (default) | — | `text-xs` | `0.375rem 0.625rem` | Default, navigation |
| Large | `size="large"` | `text-sm` | `0.5rem 0.75rem` | Headers, empty states |

```html
<!-- Small badge -->
<p-badge value="12" size="small" />

<!-- Medium (default) -->
<p-badge value="New" />

<!-- Large badge -->
<p-badge value="Updated" severity="success" size="large" />
```

## Badge with Icon

`Badge` has **no** `icon` prop, and `Button` has **no** `#end` slot in PrimeVue 4. Compose the badge next to an icon or inside other content with layout utilities instead.

```html
<!-- Icon + count, composed with flex -->
<span class="inline-flex items-center gap-1">
  <i class="pi pi-bell" />
  <p-badge value="5" severity="danger" />
</span>

<!-- Count next to a button label -->
<div class="inline-flex items-center gap-2">
  <Button label="Inbox" icon="pi pi-envelope" />
  <p-badge value="3" severity="danger" size="small" />
</div>

<!-- Badge inside a tab header (PrimeVue 4 composed Tabs API) -->
<Tab value="messages">
  <div class="flex items-center gap-2">
    <i class="pi pi-envelope" />
    <span>Messages</span>
    <p-badge value="5" severity="info" size="small" class="ml-1" />
  </div>
</Tab>
```

## Badge Placement

### Inline with Text

```html
<h3>
  Projects
  <p-badge value="5" size="small" class="ml-2" />
</h3>
```

- Badge immediately after text.
- Use `ml-1` or `ml-2` for spacing.

### Badge as Dot (Status Indicator)

```html
<!-- Dot badge for status -->
<div class="flex items-center gap-2">
  <span class="w-2 h-2 rounded-full bg-success-500" />
  <span class="text-sm">Active</span>
</div>
```

- Use a small circle (`w-2 h-2`) instead of full badge for status dots.
- Color matches the status severity.

### Notification Badge (on icon/button)

```html
<!-- Overlay a count on an icon button via absolute positioning -->
<div class="relative inline-flex">
  <Button icon="pi pi-bell" severity="secondary" text aria-label="Notifications" />
  <p-badge
    value="3"
    severity="danger"
    size="small"
    class="absolute -top-1 -right-1"
  />
</div>
```

- Badge positioned at top-right of icon.
- Use `position: relative` on parent (`relative`), `position: absolute` on the badge (`absolute -top-1 -right-1`).
- `Button` has no `#end` slot in PrimeVue 4 — overlay the badge with positioning utilities.

## Badge vs Status Label

### Use Badge When

- Showing a **count** (notifications, items, errors).
- Label is **short** (1–2 words).
- Badge is **interactive** (clickable to filter).
- Badge is in **navigation** (tabs, sidebar).

### Use Status Label (Tag) When

- Showing a **state** (Active, Pending, Completed).
- Label needs **more context** (longer text).
- Status is **read-only** (not interactive).
- In **table cells** or **form fields**.

### Badge vs Tag

| Component | Use Case |
|-----------|----------|
| `p-badge` | Counts, navigation labels, short status |
| `p-tag` | Status indicators, categories, readable labels |

```html
<!-- Badge for count -->
<p-badge value="5" />

<!-- Tag for status -->
<p-tag value="Active" severity="success" size="small" />

<!-- Tag for category -->
<p-tag value="Urgent" severity="danger" />
```

## Badge Rules

1. **Use badges sparingly.** Too many badges create visual noise.
2. **One badge per navigation item.** Don't stack multiple badges.
3. **Use severity colors consistently** (success = good, danger = bad).
4. **Badges in navigation must be visible** but not distracting.
5. **Badge counts must be accurate.** Stale counts erode trust.
6. **Use dot badges** for status indicators in lists.
7. **Badge text must be short** (1–2 words max). Use tag for longer text.

## PrimeVue Badge Theme Tokens

```css
--p-badge-padding: 0.375rem 0.625rem;
--p-badge-border-radius: 9999px; /* Pill shape */
--p-badge-font-size: 0.75rem;
--p-badge-font-weight: 600;
--p-badge-min-width: 1.5rem;
--p-badge-height: 1.5rem;
--p-badge-line-height: 1.5rem;

/* Severity colors */
--p-badge-primary-bg: var(--color-primary-600);
--p-badge-primary-text-color: #ffffff;
--p-badge-success-bg: var(--color-success-600);
--p-badge-success-text-color: #ffffff;
--p-badge-warn-bg: var(--color-warning-600);
--p-badge-warn-text-color: #ffffff;
--p-badge-danger-bg: var(--color-danger-600);
--p-badge-danger-text-color: #ffffff;
--p-badge-info-bg: var(--color-info-600);
--p-badge-info-text-color: #ffffff;
--p-badge-secondary-bg: var(--color-neutral-600);
--p-badge-secondary-text-color: #ffffff;
```
