# Dialogs

## Overview

PrimeVue `Dialog` component for modals, confirmations, and focused interactions. Use for tasks that require user attention or confirmation.

## Dialog Sizes

| Size | Width | Use Case |
|------|-------|----------|
| Small | `400px` | Inline forms, quick actions, confirmations |
| Medium | `600px` | Standard forms, data entry, previews |
| Large | `800px` | Complex forms, multi-step wizards |
| Full Width | `90vw` (max 1200px) | Data editors, code editors, large tables |

```html
<!-- Small dialog -->
<Dialog v-model:visible="displaySmall" header="Confirm" :style="{ width: '400px' }">
  <p>Are you sure you want to delete this item?</p>
  <template #footer>
    <Button label="Cancel" severity="secondary" @click="displaySmall = false" />
    <Button label="Delete" severity="danger" @click="handleDelete" />
  </template>
</Dialog>

<!-- Medium dialog -->
<Dialog v-model:visible="displayMedium" header="Edit User" :style="{ width: '600px' }">
  <EditUserForm />
</Dialog>

<!-- Large dialog -->
<Dialog v-model:visible="displayLarge" header="Advanced Settings" :style="{ width: '800px' }">
  <AdvancedSettingsForm />
</Dialog>

<!-- Full width dialog -->
<Dialog v-model:visible="displayFull" header="Data Editor" :style="{ width: '90vw', maxWidth: '1200px' }">
  <DataEditor />
</Dialog>
```

## Dialog Position

### Default (Centered)

```html
<Dialog v-model:visible="display" header="Title">
  <!-- Content -->
</Dialog>
```

- Centered on screen.
- Default for most dialogs.

### Top-Aligned

```html
<Dialog v-model:visible="display" header="Title" :position="'top'">
  <!-- Content -->
</Dialog>
```

- Positioned at top of viewport.
- Use for **notifications, quick actions, slide-out panels**.

### Bottom-Aligned

```html
<Dialog v-model:visible="display" header="Title" :position="'bottom'">
  <!-- Content -->
</Dialog>
```

- Positioned at bottom of viewport.
- Use for **mobile sheets, action sheets**.

### Maximizable / Full Screen

```html
<Dialog
  v-model:visible="display"
  v-model:maximized="maximized"
  header="Title"
  maximizable
>
  <!-- Content; user can toggle full screen -->
</Dialog>
```

- PrimeVue 4 removed the `fullScreen` prop. Use `maximizable` to add a maximize toggle to the header, and bind `v-model:maximized` to control or preset the full-screen state.
- Covers entire viewport when maximized.
- Use for **form wizards, data editors, previews**.

## Dialog Structure

### Header

```html
<Dialog v-model:visible="display" header="Edit Profile">
  <!-- Content -->
</Dialog>
```

- Title: `text-xl font-semibold`.
- Close button (X) in top-right corner.
- Use `header` slot for custom header content.

```html
<Dialog v-model:visible="display">
  <template #header>
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Edit Profile</h2>
      <Button icon="pi pi-times" severity="secondary" plain @click="display = false" />
    </div>
  </template>
  <!-- Content -->
</Dialog>
```

### Body

```html
<Dialog v-model:visible="display" header="Title">
  <div class="py-4">
    <!-- Form content -->
  </div>
</Dialog>
```

- Padding: `1.5rem` (24px).
- Max height: 70vh (scrollable if content exceeds).
- Use `py-4` for internal vertical spacing.

### Footer

```html
<Dialog v-model:visible="display" header="Title">
  <!-- Content -->
  <template #footer>
    <div class="flex justify-end gap-2">
      <Button label="Cancel" severity="secondary" @click="display = false" />
      <Button label="Save" icon="pi pi-check" />
    </div>
  </template>
</Dialog>
```

- Padding: `0 1.5rem 1.5rem`.
- Buttons right-aligned with `gap-2` (8px).
- **Always include a cancel/close action** unless dialog is non-dismissible.

## Modal Behavior

### Standard Modal

```html
<Dialog v-model:visible="display" header="Title" :modal="true">
  <!-- Content -->
</Dialog>
```

- Blocks interaction with background.
- Overlay: `--p-dialog-mask-bg: rgba(0, 0, 0, 0.5)`.
- Default for most dialogs.

### Non-Modal (Floatover)

```html
<Dialog v-model:visible="display" header="Title" :modal="false">
  <!-- Content -->
</Dialog>
```

- Does not block background interaction.
- Use for **tooltips, popovers, inline previews**.

### Dismissible

```html
<Dialog
  v-model:visible="display"
  header="Title"
  modal
  :closable="true"
  :dismissableMask="true"
/>
```

- `closable` (default `true`) shows the close (X) button in the top-right.
- `dismissableMask` (default `false`) enables click-outside-the-mask to close (modal dialogs only).
- PrimeVue 4 has no single `dismissable` prop — use `closable` and/or `dismissableMask`.

### Non-Dismissible

```html
<Dialog
  v-model:visible="display"
  header="Title"
  modal
  :closable="false"
  :dismissableMask="false"
  :closeOnEscape="false"
>
  <!-- Content with required actions -->
</Dialog>
```

- No close button (`:closable="false"`).
- No click-outside-to-close (`:dismissableMask="false"`).
- Optionally block the Escape key with `:closeOnEscape="false"`.
- Use for **critical confirmations** (delete, unsubscribe).

## Confirm Dialogs

### Standard Confirmation

```html
<Dialog v-model:visible="display" header="Confirm Delete" :style="{ width: '400px' }" :modal="true">
  <p>Are you sure you want to delete this item? This action cannot be undone.</p>
  <template #footer>
    <Button label="Cancel" severity="secondary" @click="display = false" />
    <Button label="Delete" severity="danger" @click="handleDelete" />
  </template>
</Dialog>
```

### Danger Confirmation

```html
<Dialog v-model:visible="display" header="Delete Account" :style="{ width: '450px' }" :modal="true">
  <div class="text-center">
    <i class="pi pi-exclamation-triangle text-3xl text-danger-500 mb-4" />
    <p class="text-base mb-2">This action is permanent and cannot be undone.</p>
    <p class="text-sm text-neutral-500">All your data, including posts and comments, will be permanently deleted.</p>
  </div>
  <template #footer>
    <Button label="Keep Account" severity="secondary" @click="display = false" />
    <Button label="Delete Everything" severity="danger" @click="handleDelete" />
  </template>
</Dialog>
```

### Confirm with Input

```html
<Dialog v-model:visible="display" header="Change Email" :style="{ width: '400px' }">
  <div class="space-y-4">
    <div>
      <label for="newEmail" class="block text-sm font-medium mb-1">New Email</label>
      <InputText id="newEmail" v-model="newEmail" placeholder="Enter new email" />
    </div>
  </div>
  <template #footer>
    <Button label="Cancel" severity="secondary" @click="display = false" />
    <Button label="Update" icon="pi pi-check" :disabled="!newEmail" @click="handleUpdate" />
  </template>
</Dialog>
```

## Dialog Rules

1. **Always include a close/cancel action** unless the dialog is non-dismissible.
2. **Use confirm dialogs for destructive actions** (delete, unsubscribe, logout).
3. **Keep dialog content focused.** One task per dialog.
4. **Use appropriate size.** Don't use full-screen for simple confirmations.
5. **Modal dialogs block background interaction.** Use floatover for non-critical info.
6. **Footer buttons are right-aligned.** Primary action is rightmost.
7. **Dialogs should not require scrolling** if content fits. Use pagination or tabs for long content.
8. **Close dialog on Escape key** (default behavior).
9. **Focus trap inside dialog.** Focus starts at first focusable element.
10. **Animate dialog entrance/exit** with `transition` prop.

## PrimeVue Dialog Theme Tokens

```css
--p-dialog-header-padding: 1.5rem;
--p-dialog-header-border-width: 0 0 1px 0;
--p-dialog-header-border-color: var(--color-neutral-200);
--p-dialog-header-title-size: 1.25rem;
--p-dialog-header-title-font-weight: 600;
--p-dialog-body-padding: 1.5rem;
--p-dialog-footer-padding: 0 1.5rem 1.5rem;
--p-dialog-footer-gap: 0.75rem;
--p-dialog-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
--p-dialog-border-radius: 0.75rem;
--p-dialog-mask-bg: rgba(0, 0, 0, 0.5);
--p-dialog-close-button-size: 2rem;
--p-dialog-close-button-color: var(--color-neutral-500);
--p-dialog-close-button-hover-color: var(--color-neutral-700);
--p-dialog-transition-duration: 300ms;
```
