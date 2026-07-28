# Forms

## Overview

PrimeVue form components for all input types. Consistent label placement, error handling, and responsive layouts.

## Form Components

### InputText

```html
<InputText
  v-model="form.name"
  placeholder="Enter your name"
  :class="{ 'border-danger-500': errors.name }"
/>
```

- Used for **single-line text input**.
- Default height: 40px.

### InputNumber

```html
<InputNumber
  v-model="form.amount"
  mode="decimal"
  :min="0"
  :minFractionDigits="2"
  :maxFractionDigits="2"
  prefix="$"
  suffix=" USD"
  :class="{ 'border-danger-500': errors.amount }"
/>
```

- Used for **numeric values** (prices, quantities, counts).
- Always set `mode="decimal"` for currency.
- Use `prefix`/`suffix` for units.

### Select

```html
<Select
  v-model="form.status"
  :options="statusOptions"
  optionLabel="label"
  optionValue="value"
  placeholder="Select a status"
  :class="{ 'border-danger-500': errors.status }"
  filter
  :showClear="true"
/>
```

- Used for **single selection from a list**.
- Add `filter` prop for searchable selects with 10+ options.
- Always provide a placeholder.
- **PrimeVue 4:** `Dropdown` was renamed to `Select` (`import Select from 'primevue/select'`).

### DatePicker

```html
<DatePicker
  v-model="form.date"
  :showIcon="true"
  :iconDisplay="'input'"
  dateFormat="mm/dd/yy"
  :class="{ 'border-danger-500': errors.date }"
/>
```

- Used for **date and time selection**.
- Use `showIcon="true"` with `iconDisplay="input"` for compact input.
- Set explicit `dateFormat` for consistency.

### Editor (Quill)

```html
<Editor
  v-model="form.content"
  :style="{ height: '300px' }"
  :class="{ 'border-danger-500': errors.content }"
/>
```

- Used for **rich text / HTML content**.
- Default height: 300px.
- Use `Toolbar` component for custom toolbars.

### Checkbox

```html
<Checkbox v-model="form.acceptTerms" inputId="acceptTerms" />
<label for="acceptTerms" class="text-sm">
  I accept the terms and conditions
</label>
```

- Used for **boolean toggles** and **multiple selections**.
- Always pair with a `<label>` element.

### Radio

```html
<RadioButton
  v-model="form.plan"
  inputId="plan-free"
  name="plan"
  :value="'free'"
/>
<label for="plan-free" class="text-sm">Free Plan</label>
```

- Used for **single selection from mutually exclusive options**.
- Group with `name` prop for accessibility.

### ToggleSwitch

```html
<ToggleSwitch v-model="form.notifications" />
```

- Used for **boolean on/off toggles** (settings, preferences).
- Compact, no label needed inline (use adjacent label).

### FileUpload

```html
<FileUpload
  mode="basic"
  name="avatar"
  accept="image/*"
  :maxFileSize="2000000"
  @select="onFileSelect"
  @error="onFileError"
/>
```

- Used for **file uploads** (images, documents).
- Set `accept` for file type restrictions.
- Set `maxFileSize` for size limits.

## Form Layouts

### Vertical Layout (Default)

```html
<div class="space-y-4">
  <!-- Label -->
  <label for="email" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
    Email Address
  </label>
  <!-- Input -->
  <InputText id="email" v-model="form.email" placeholder="you@example.com" />
  <!-- Error -->
  <Message v-if="errors.email" severity="error" size="small" class="mt-1">{{ errors.email }}</Message>
  <!-- Helper text -->
  <p v-else class="text-xs text-neutral-500 mt-1">We'll never share your email.</p>
</div>
```

- Fields stack vertically.
- Default for **mobile** and **forms with few fields**.

### Horizontal Layout

```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label for="firstName" class="block text-sm font-medium mb-1">First Name</label>
    <InputText id="firstName" v-model="form.firstName" />
  </div>
  <div>
    <label for="lastName" class="block text-sm font-medium mb-1">Last Name</label>
    <InputText id="lastName" v-model="form.lastName" />
  </div>
</div>
```

- Fields in grid columns.
- Use `md:grid-cols-2` for 2-column on desktop.
- Use `md:grid-cols-3` for 3-column on large screens.

### Inline Layout (Search, Filters)

```html
<div class="flex items-center gap-2">
  <InputText v-model="query" placeholder="Search..." class="flex-1" />
  <Button label="Search" icon="pi pi-search" />
</div>
```

- Used for **search bars**, **filter rows**, **toolbar actions**.
- Elements in a single row with `gap-2`.

## Labels

### Label Styling

```html
<label for="field" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
  Field Label
  <span v-if="required" class="text-danger-500 ml-0.5">*</span>
</label>
```

- Size: `text-sm` (14px).
- Weight: `font-medium` (500).
- Color: `--color-neutral-700` (light) / `--color-neutral-300` (dark).
- Always pair with `for` attribute matching input `id`.

### Required Indicators

```html
<!-- Asterisk (default) -->
<label>
  Email *
</label>

<!-- "Required" text (alternative) -->
<label>
  Email
  <span class="text-xs text-neutral-500 ml-1">(required)</span>
</label>
```

- Use `*` for most forms.
- Use "(required)" text for complex forms with many fields.
- **Never use visual-only required indicators** (must be readable by screen readers).

## Placeholders

```html
<InputText placeholder="Enter your email address" />
<Select :options="options" placeholder="Select an option" />
<DatePicker placeholder="Pick a date" />
```

- Use **descriptive placeholders** that hint at the expected input.
- Never use placeholder as the only label.
- Color: `--color-neutral-400` (light) / `--color-neutral-500` (dark).

## Error States

### Field Border

```html
<InputText
  v-model="form.email"
  :class="{ 'border-danger-500 focus:ring-danger-500': errors.email }"
/>
```

- Border color: `--color-danger-500`.
- Focus ring: `--color-danger-500`.
- Remove default primary focus ring on error.

### Error Message

```html
<Message
  v-if="errors.email"
  severity="error"
  size="small"
  class="mt-1"
>{{ errors.email }}</Message>
<!-- Or inline -->
<p class="text-sm text-danger-600 mt-1">{{ errors.email }}</p>
```

- Size: `text-sm` (14px).
- Color: `--color-danger-600`.
- Position: directly below the input.
- **Never use generic errors** ("Invalid input"). Be specific ("Please enter a valid email address").

### Field-Level Error Class

```css
.form-error input,
.form-error .p-inputtext,
.form-error .p-select,
.form-error .p-datepicker {
  border-color: var(--color-danger-500);
}

.form-error input:focus,
.form-error .p-inputtext:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}
```

## Helper Text

```html
<p class="text-xs text-neutral-500 mt-1">
  Must be at least 8 characters long.
</p>
```

- Size: `text-xs` (12px).
- Color: `--color-neutral-500`.
- Position: below the error message (if present) or below the input.
- Use for **format hints**, **character limits**, **policy notes**.

## Form Field Spacing

| Context | Value |
|---------|-------|
| Label to input | `mb-1` (4px) |
| Input to error/helper | `mt-1` (4px) |
| Between fields | `mb-4` (16px) |
| Between field groups (sections) | `mb-6` (24px) |
| Form to submit button | `mt-6` (24px) |

## PrimeVue Form Theme Tokens

```css
--p-inputtext-padding-x: 0.75rem;      /* 12px */
--p-inputtext-padding-y: 0.625rem;     /* 10px */
--p-inputtext-border-radius: 0.5rem;
--p-inputtext-border-color: var(--color-neutral-300);
--p-inputtext-focus-border-color: var(--color-primary-500);
--p-inputtext-focus-ring-color: rgba(0, 100, 245, 0.2);
--p-inputtext-focus-ring-shadow: 0 0 0 3px var(--p-inputtext-focus-ring-color);

--p-field-gap: 0.5rem;                 /* 8px label-input gap */
--p-field-margin-bottom: 1rem;         /* 16px between fields */
--p-field-label-margin-bottom: 0.5rem; /* 8px label to input */
--p-field-help-text-color: var(--color-neutral-500);
--p-field-help-text-font-size: 0.75rem;
--p-field-error-color: var(--color-danger-600);
--p-field-error-font-size: 0.875rem;
```

## Form Validation (Laravel + Vue)

### Server-Side Validation Display

```vue
<script setup>
import { reactive, ref } from 'vue';
import axios from 'axios';

const form = reactive({
  name: '',
  email: '',
  password: '',
});

const errors = ref({});
const saving = ref(false);

const submit = async () => {
  saving.value = true;
  errors.value = {};
  try {
    await axios.post('/api/register', form);
  } catch (error) {
    // Laravel returns a 422 with { errors: { field: [messages] } }
    if (error.response?.status === 422) {
      errors.value = error.response.data.errors;
    }
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div>
      <label for="name" class="block text-sm font-medium mb-1">Name</label>
      <InputText id="name" v-model="form.name" />
      <Message v-if="errors.name" severity="error" size="small" class="mt-1">{{ errors.name[0] }}</Message>
    </div>
  </form>
</template>
```

### Client-Side Validation

```js
const validate = () => {
  const newErrors = {};
  if (!form.name?.trim()) newErrors.name = 'Name is required';
  if (!form.email?.trim()) newErrors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email';
  return newErrors;
};
```

## Form Rules

1. **Always pair inputs with labels.** Never rely on placeholders alone.
2. **Required fields must show a visual indicator** (`*` or "(required)").
3. **Error messages must be specific and actionable.**
4. **Group related fields** with visual separation (dividers, section headers).
5. **Use appropriate input types** (InputNumber for numbers, DatePicker for dates).
6. **Validate on blur for single fields**, on submit for the entire form.
7. **Disable submit button during submission** (`:loading="saving"`, toggled in a try/finally around the axios call).
8. **Mobile-first:** vertical layout by default, horizontal only on `md+`.
