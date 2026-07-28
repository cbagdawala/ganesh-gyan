# Drawers

## Overview

PrimeVue `Drawer` component for side panels, slide-out sheets, and overlay content. Use for secondary actions, previews, and non-modal workflows.

## Drawer Sizes

### Small Drawer

| Side | Width |
|------|-------|
| Left | `320px` |
| Right | `320px` |

- Used for **quick actions, previews, inline forms**.

### Medium Drawer

| Side | Width |
|------|-------|
| Left | `400px` |
| Right | `400px` |

- Used for **standard side panels, navigation, settings**.

### Large Drawer

| Side | Width |
|------|-------|
| Left | `500px` |
| Right | `500px` |

- Used for **complex side panels, editors, previews**.

```html
<!-- Right drawer (default) -->
<Drawer v-model:visible="displayRight" header="Settings" position="right" :style="{ width: '400px' }">
  <SettingsForm />
</Drawer>

<!-- Left drawer -->
<Drawer v-model:visible="displayLeft" header="Navigation" position="left" :style="{ width: '320px' }">
  <NavMenu />
</Drawer>

<!-- Top drawer -->
<Drawer v-model:visible="displayTop" header="Notifications" position="top" :style="{ height: '400px' }">
  <NotificationList />
</Drawer>

<!-- Bottom drawer -->
<Drawer v-model:visible="displayBottom" header="Actions" position="bottom" :style="{ height: '300px' }">
  <ActionSheet />
</Drawer>
```

## Drawer Placement

### Right Drawer (Default)

```html
<Drawer v-model:visible="display" header="Details" position="right" :style="{ width: '400px' }">
  <!-- Content -->
</Drawer>
```

- Slides in from the right.
- Default for most use cases.
- Used for **previews, details, side panels**.

### Left Drawer

```html
<Drawer v-model:visible="display" header="Menu" position="left" :style="{ width: '320px' }">
  <!-- Content -->
</Drawer>
```

- Slides in from the left.
- Used for **navigation, filters, primary sidebars**.

### Top Drawer

```html
<Drawer v-model:visible="display" header="Notifications" position="top" :style="{ height: '400px' }">
  <!-- Content -->
</Drawer>
```

- Slides in from the top.
- Used for **notifications, announcements, quick actions**.

### Bottom Drawer

```html
<Drawer v-model:visible="display" header="Actions" position="bottom" :style="{ height: '300px' }">
  <!-- Content -->
</Drawer>
```

- Slides in from the bottom.
- Used for **mobile action sheets, bottom sheets**.

## Drawer Structure

### Header

```html
<Drawer v-model:visible="display" header="Settings">
  <!-- Content -->
</Drawer>
```

- Title: `text-xl font-semibold`.
- Close button (X) in top-right corner.
- Use `header` slot for custom header content.

```html
<Drawer v-model:visible="display">
  <template #header>
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Settings</h2>
      <Button icon="pi pi-times" severity="secondary" plain @click="display = false" />
    </div>
  </template>
  <!-- Content -->
</Drawer>
```

### Body

```html
<Drawer v-model:visible="display" header="Details">
  <div class="py-4">
    <!-- Form or content -->
  </div>
</Drawer>
```

- Padding: `1.5rem` (24px).
- Max height/width: depends on drawer position.
- Scrollable if content exceeds container.

### Footer

```html
<Drawer v-model:visible="display" header="Details">
  <!-- Content -->
  <template #footer>
    <div class="flex justify-end gap-2">
      <Button label="Cancel" severity="secondary" @click="display = false" />
      <Button label="Save" icon="pi pi-check" />
    </div>
  </template>
</Drawer>
```

- Padding: `0 1.5rem 1.5rem`.
- Buttons right-aligned with `gap-2` (8px).
- **Always include a close/cancel action** unless drawer is non-dismissible.

## Overlay Behavior

### With Overlay

```html
<Drawer v-model:visible="display" header="Details" :baseStyle="{ zIndex: 1000 }">
  <!-- Content -->
</Drawer>
```

- Blocks interaction with background.
- Overlay: `--p-overlay-mask-bg: rgba(0, 0, 0, 0.5)`.
- Default behavior.

### Without Overlay

```html
<Drawer v-model:visible="display" header="Details" :showCloseIcon="true" />
```

- No overlay.
- Use for **inline side panels** (e.g., email previews, chat).

## Drawer vs Dialog Decision

| Criterion | Use Drawer | Use Dialog |
|-----------|------------|------------|
| Interaction | Non-modal, background accessible | Modal, blocks background |
| Content | Secondary, supplementary | Primary, focused task |
| Duration | Extended use (preview, navigation) | Quick task (confirmation, form) |
| Position | Side, top, bottom | Centered, top, bottom |
| Example | Email preview, navigation menu | Delete confirmation, edit form |

## Drawer Rules

1. **Use drawers for secondary content** (previews, navigation, settings).
2. **Use dialogs for primary tasks** (confirmations, data entry).
3. **Drawers should not cover the entire screen.** Leave some background visible.
4. **Include a close button** (X) in the header.
5. **Close on Escape key** (default behavior).
6. **Animate drawer entrance/exit** with `transition` prop.
7. **Use appropriate size** for the content. Don't use full-screen for simple panels.
8. **Footer actions are right-aligned.** Primary action is rightmost.
9. **Drawers are scrollable** if content exceeds container.
10. **Test on mobile:** use bottom drawer for action sheets.

## PrimeVue Drawer Theme Tokens

```css
--p-drawer-header-padding: 1.5rem;
--p-drawer-header-border-width: 0 0 1px 0;
--p-drawer-header-border-color: var(--color-neutral-200);
--p-drawer-header-title-size: 1.25rem;
--p-drawer-header-title-font-weight: 600;
--p-drawer-body-padding: 1.5rem;
--p-drawer-footer-padding: 0 1.5rem 1.5rem;
--p-drawer-footer-gap: 0.75rem;
--p-drawer-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
--p-drawer-border-radius: 0; /* Full height/width, no radius */
--p-drawer-close-button-size: 2rem;
--p-drawer-close-button-color: var(--color-neutral-500);
--p-drawer-close-button-hover-color: var(--color-neutral-700);
--p-drawer-transition-duration: 300ms;
--p-overlay-mask-bg: rgba(0, 0, 0, 0.5);
```
