# Alerts

## Overview

PrimeVue `Message` and `Toast` components for user feedback. Use `Message` for inline alerts, `Toast` for transient notifications.

## Message Component (Inline Alerts)

### Message Types

#### Success Message

```html
<Message severity="success" :closable="false">
  <template #icon>
    <i class="pi pi-check-circle" />
  </template>
  Profile updated successfully.
</Message>
```

- Used for **positive confirmations** (saved, created, published).
- Icon: `pi pi-check-circle` (success) or `pi pi-check` (inline).
- Color: `--color-success-600` background, `--color-success-800` text (light mode).

#### Info Message

```html
<Message severity="info" :closable="false">
  <template #icon>
    <i class="pi pi-info-circle" />
  </template>
  Your trial expires in 7 days.
</Message>
```

- Used for **informational updates** (notices, tips, reminders).
- Icon: `pi pi-info-circle`.
- Color: `--color-info-600` background.

#### Warning Message

```html
<Message severity="warn" :closable="false">
  <template #icon>
    <i class="pi pi-exclamation-triangle" />
  </template>
  Your password will expire in 3 days.
</Message>
```

- Used for **cautionary notices** (expiring, pending review, deprecated).
- Icon: `pi pi-exclamation-triangle`.
- Color: `--color-warning-600` background.

#### Error Message

```html
<Message severity="error" :closable="false">
  <template #icon>
    <i class="pi pi-times-circle" />
  </template>
  Failed to save changes. Please try again.
</Message>
```

- Used for **error states** (failed actions, validation errors).
- Icon: `pi pi-times-circle` or `pi pi-exclamation-circle`.
- Color: `--color-danger-600` background.

### Message Sizes

| Size | Class / Prop | Padding | Font Size | Use Case |
|------|-------------|---------|-----------|----------|
| Small | `size="small"` | `0.5rem 1rem` | `text-sm` | Inline form errors, compact UI |
| Medium (default) | — | `0.75rem 1.25rem` | `text-base` | Standard alerts |
| Large | `size="large"` | `1rem 1.5rem` | `text-lg` | Important notices, banners |

```html
<Message severity="success" size="small">Saved!</Message>
<Message severity="warn">Please review before submitting.</Message>
<Message severity="error" size="large">Critical error occurred.</Message>
```

### Message Placement

#### Top of Page (Banner)

```html
<!-- Success banner at top of page -->
<Message severity="success" :closable="true" dismissible>
  <template #icon>
    <i class="pi pi-check-circle" />
  </template>
  Changes saved successfully.
</Message>
```

- Positioned at the **top of the page content**.
- Use `dismissible` for user control.
- Auto-dismiss after 5–10 seconds for non-critical messages.

#### Within Form (Inline)

```html
<!-- After form submission -->
<Message v-if="submitted" severity="success">Form submitted successfully!</Message>

<!-- Validation error summary -->
<Message v-if="formErrors.length" severity="error" :closable="false">
  <template #icon>
    <i class="pi pi-exclamation-circle" />
  </template>
  <ul class="list-disc list-inside mt-2">
    <li v-for="error in formErrors" :key="error">{{ error }}</li>
  </ul>
</Message>
```

- Positioned **above the form** or **below the submit button**.
- Show all errors in a list for clarity.

#### Between Sections

```html
<!-- Notice between content sections -->
<Message severity="info" :closable="false">
  <template #icon>
    <i class="pi pi-info-circle" />
  </template>
  This section is under maintenance.
</Message>
```

- Positioned **between content sections**.
- Use for **non-urgent notices** (maintenance, deprecations).

## Toast Component (Transient Notifications)

### Toast Types

#### Success Toast

```js
import { useToast } from 'primevue/usetoast';
const toast = useToast();

toast.add({
  severity: 'success',
  summary: 'Success',
  detail: 'Profile updated successfully.',
  life: 3000,
});
```

#### Info Toast

```js
toast.add({
  severity: 'info',
  summary: 'Info',
  detail: 'Your trial expires in 7 days.',
  life: 5000,
});
```

#### Warning Toast

```js
toast.add({
  severity: 'warn',
  summary: 'Warning',
  detail: 'Your password will expire soon.',
  life: 5000,
});
```

#### Error Toast

```js
toast.add({
  severity: 'error',
  summary: 'Error',
  detail: 'Failed to save changes. Please try again.',
  life: 6000,
});
```

### Toast Placement

| Position | Description |
|----------|-------------|
| `top-right` | Default, non-intrusive |
| `top-left` | For important notices |
| `top-center` | For global notices |
| `bottom-right` | For non-urgent updates |
| `bottom-left` | Rarely used |

```html
<Toast position="top-right" />
```

### Toast Duration

| Severity | Default Duration | Use Case |
|----------|-----------------|----------|
| Success | 3000ms | Quick confirmations |
| Info | 5000ms | Notices, reminders |
| Warning | 5000ms | Cautionary notices |
| Error | 6000ms | Errors requiring attention |

### Toast Rules

1. **Use Toast for transient feedback** (actions, notifications).
2. **Auto-dismiss after duration.** Never require manual dismiss for success/info.
3. **Error toasts must be dismissible** (user may need to read).
4. **Limit to 3 concurrent toasts.** Queue additional toasts.
5. **Use `summary` for title, `detail` for description.**

## Message vs Toast Decision

| Criterion | Use Message | Use Toast |
|-----------|-------------|-----------|
| Persistence | Stays until dismissed | Auto-dismisses |
| Importance | High (must read) | Medium (nice to know) |
| Placement | Inline, top of page | Screen corner |
| User action | Required (review, acknowledge) | Optional (read at leisure) |
| Example | Form validation errors, success confirmations | "Saved", "Notification received" |

## Toast Icon Configuration

```html
<Toast :icon="'pi pi-check'" />
```

- Default icon: `pi pi-info-circle` (info), `pi pi-check-circle` (success), `pi pi-exclamation-triangle` (warning), `pi pi-times-circle` (error).
- Override with `icon` prop for custom icons.

## PrimeVue Message Theme Tokens

```css
--p-message-padding: 0.75rem 1.25rem;
--p-message-border-width: 0 0 0 4px;
--p-message-border-radius: 0.5rem;
--p-message-font-size: 1rem;
--p-message-icon-size: 1.25rem;
--p-message-close-button-padding: 0.25rem;

/* Severity backgrounds */
--p-message-success-bg: var(--color-success-50);
--p-message-success-border-color: var(--color-success-600);
--p-message-success-text-color: var(--color-success-800);
--p-message-info-bg: var(--color-info-50);
--p-message-info-border-color: var(--color-info-600);
--p-message-info-text-color: var(--color-info-800);
--p-message-warn-bg: var(--color-warning-50);
--p-message-warn-border-color: var(--color-warning-600);
--p-message-warn-text-color: var(--color-warning-800);
--p-message-error-bg: var(--color-danger-50);
--p-message-error-border-color: var(--color-danger-600);
--p-message-error-text-color: var(--color-danger-800);

/* Dark mode */
:root.dark {
  --p-message-success-bg: var(--color-success-950);
  --p-message-success-text-color: var(--color-success-200);
  --p-message-info-bg: var(--color-info-950);
  --p-message-info-text-color: var(--color-info-200);
  --p-message-warn-bg: var(--color-warning-950);
  --p-message-warn-text-color: var(--color-warning-200);
  --p-message-error-bg: var(--color-danger-950);
  --p-message-error-text-color: var(--color-danger-200);
}
```

## Alert Rules

1. **Use Message for inline, persistent alerts.**
2. **Use Toast for transient, auto-dismissing notifications.**
3. **Always include an icon** for quick visual recognition.
4. **Error messages must be specific and actionable.**
5. **Success messages should auto-dismiss** after 3 seconds.
6. **Warning and error toasts must be dismissible.**
7. **Limit to 3 concurrent toasts.** Queue additional toasts.
8. **Test all alert types in dark mode.**
