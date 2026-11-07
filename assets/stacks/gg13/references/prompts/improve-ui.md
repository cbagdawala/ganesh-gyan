# Improve UI - Prompt Template

Use this prompt when you need to improve the UI/UX of a Vue 3 + PrimeVue component or page.

---

## Prompt

```
You are improving the UI/UX of a Vue 3 + PrimeVue 4 component in a Laravel 13 + Vue 3 + PrimeVue 4 + MySQL + Pest + Sanctum project.

## Target

**Component/Page**: {COMPONENT_PATH}

**Current description**: {CURRENT_STATE_DESCRIPTION}

**Issues to address:**
- [ ] Visual consistency with design system
- [ ] Accessibility (ARIA, keyboard navigation)
- [ ] Loading states and error handling
- [ ] Responsive / mobile-friendly layout
- [ ] Interaction feedback (hover, active, focus states)
- [ ] Empty states and edge cases
- [ ] Form validation feedback
- [ ] Micro-interactions and animations

## Design System Reference

Follow the active layout in `layouts/<layout>/` (see `layouts/README.md`; default `classic`):
- `shell.md` - App frame, sidebar/topbar, navigation
- `colors.md` - Color palette and usage
- `typography.md` - Font sizes, weights, line heights
- `spacing.md` - Padding, margins, gaps

And the shared component guidance in `design-system/`:
- `buttons.md` - Button styles, sizes, states
- `cards.md` - Card layout, shadows, borders
- `forms.md` - Input styles, validation states
- `tables.md` - DataTable styling, row heights
- `badges.md` - Tag/Status badge styles
- `alerts.md` - Toast/Message styles
- `dialogs.md` - Dialog/Modal patterns
- `loading.md` - Skeleton and spinner patterns
- `empty-states.md` - Empty state illustrations and messages
- `responsive.md` - Breakpoints and responsive patterns

## UI Improvement Checklist

### 1. Visual Consistency

- [ ] Uses design system colors (not arbitrary hex values)
- [ ] Consistent typography (heading hierarchy matches spec)
- [ ] Consistent spacing (uses design system spacing scale)
- [ ] Consistent border radius, shadows, and borders
- [ ] PrimeVue theme tokens used instead of custom CSS where possible

### 2. Accessibility (WCAG 2.1 AA)

- [ ] All interactive elements are keyboard accessible
- [ ] Focus states visible (2px outline, 2px offset)
- [ ] Color is not the only indicator of state (use icons + text)
- [ ] ARIA labels on icon-only buttons
- [ ] Screen reader announcements for dynamic content (live regions)
- [ ] Form errors associated with inputs (aria-describedby)
- [ ] Skip-to-content link present
- [ ] Alt text on images
- [ ] Sufficient color contrast (4.5:1 for text, 3:1 for UI)

### 3. Loading States

- [ ] Skeleton screens for page content
- [ ] Spinner or progress bar for actions
- [ ] Disabled state on buttons during submission
- [ ] No layout shift during loading (reserve space)
- [ ] Loading text for screen readers (aria-busy)

### 4. Error States

- [ ] Toast notifications for async errors
- [ ] Inline validation errors near inputs
- [ ] Server error messages displayed clearly
- [ ] Retry mechanism for failed operations
- [ ] Network error handling (offline detection)

### 5. Empty States

- [ ] Descriptive message when no data
- [ ] Action button to create first item
- [ ] Illustration or icon for visual context
- [ ] No bare "No data found" messages

### 6. Interaction Feedback

- [ ] Hover states on interactive elements
- [ ] Active/pressed states
- [ ] Transition animations (subtle, <200ms)
- [ ] Success feedback on actions (toast, checkmark)
- [ ] Confirmation dialogs for destructive actions

### 7. Responsive Design

- [ ] Mobile-first approach
- [ ] Touch targets at least 44x44px
- [ ] Tables become cards on mobile
- [ ] Sidebar collapses on small screens
- [ ] Images scale appropriately
- [ ] Font sizes readable on mobile

### 8. Form UX

- [ ] Labels above inputs (not placeholders only)
- [ ] Required field indicators (*)
- [ ] Real-time validation on blur
- [ ] Helper text for complex fields
- [ ] Clear submit button (not "OK" or "Submit")
- [ ] Cancel/back navigation available
- [ ] Form state preserved on navigation away

## PrimeVue Components Reference

When suggesting improvements, use these PrimeVue components where appropriate:

| Need | PrimeVue Component |
|------|-------------------|
| Data table | DataTable + Column |
| Dropdown / single-select | Select (v3 `Dropdown` was renamed) |
| Date picker | DatePicker (v3 `Calendar` was renamed) |
| File upload | FileUpload |
| Dialog | Dialog / ConfirmDialog |
| Notifications | Toast + Message |
| Loading | ProgressSpinner / ProgressBar |
| Tags | Tag |
| Breadcrumbs | Breadcrumb |
| Tabs | Tabs / TabList / Tab / TabPanels / TabPanel (v3 `TabView` / `TabPanel` was restructured) |
| Charts | Chart |
| Auto-complete | AutoComplete |
| Multi-select | MultiSelect |
| Toggle | ToggleSwitch |
| Rating | Rating |
| Input number | InputNumber |
| Text area | Textarea |
| Editor | Editor (Quill) |
| Upload | FileUpload |
| Menu | Menu / Menubar |
| Toast | Toast |
| Tooltip | Tooltip |
| Overlay panel | Popover (v3 `OverlayPanel` was renamed) |
| Sidebar / off-canvas | Drawer (v3 `Sidebar` was renamed) |
| Stepper | Stepper / Step |

## Output Format

For each improvement:

### Improvement #X: {TITLE}

**Component**: `{file_path}`

**Current State**:
```vue
{CURRENT_CODE_OR_DESCRIPTION}
```

**Improved State**:
```vue
{IMPROVED_CODE}
```

**Changes Made**:
- {CHANGE_1}
- {CHANGE_2}

**Accessibility Impact**: {DESCRIBE_A11Y_IMPROVEMENT}
**Design System Compliance**: {DESCRIBE_VISUAL_IMPROVEMENT}
```

---

## Example: Improving a DataTable

```
Improve the ProductListing.vue component.

Current issues:
- No loading skeleton while data loads
- No empty state message
- Mobile layout breaks (table overflows)
- No keyboard navigation feedback
- Status badges use raw text, no color coding

Apply the design system for visual consistency.
```

---

## Example: Improving a Form

```
Improve the {Entity}Form.vue component.

Current issues:
- Validation errors not visible until submit
- File upload has no preview
- No loading state during save
- Mobile form is too wide (no stacking)
- Required field indicators inconsistent

Apply PrimeVue form validation patterns and the design system.
```

---

## Accessibility Audit

```
Perform an accessibility audit of {COMPONENT_PATH}.

Check for:
1. Keyboard navigation (Tab, Enter, Escape, Arrow keys)
2. ARIA attributes (labels, roles, states, live regions)
3. Color contrast (text and interactive elements)
4. Focus management (focus trap in dialogs, focus return)
5. Screen reader compatibility (semantic HTML, announcements)
6. Reduced motion preferences (prefers-reduced-motion)
7. Zoom support (200% without horizontal scroll)

Provide specific code fixes for each issue found.
```
