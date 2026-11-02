# Improve UI - Prompt Template

Use this prompt when you need to improve the UI/UX of a component or page. The component names, theming mechanism and file syntax come from your stack pack's UI rules and design system.

---

## Prompt

```
You are improving the UI/UX of a component in this project. Follow
`references/principles/ui.md`, the stack pack's `references/design-system/`
and the stack pack's `references/design-system/`.

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

Follow the design system in the stack pack's `references/design-system/`.
Typical topics (use whichever files the pack provides):
- Colors - palette and usage
- Typography - font sizes, weights, line heights
- Spacing - padding, margins, gaps
- Buttons - styles, sizes, states
- Cards - layout, shadows, borders
- Forms - input styles, validation states
- Tables - data table styling, row heights
- Badges - tag / status badge styles
- Alerts - toast / message styles
- Dialogs - dialog / modal patterns
- Loading - skeleton and spinner patterns
- Empty states - illustrations and messages
- Responsive - breakpoints and responsive patterns

## UI Improvement Checklist

### 1. Visual Consistency

- [ ] Uses design system colors (not arbitrary hex values)
- [ ] Consistent typography (heading hierarchy matches spec)
- [ ] Consistent spacing (uses design system spacing scale)
- [ ] Consistent border radius, shadows, and borders
- [ ] UI component library theme tokens used instead of custom CSS where possible

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

## UI Component Library Reference

When suggesting improvements, prefer the UI component library's built-in
component for each need below. The stack pack's `references/design-system/`
(or its design system) maps each need to the exact component name.

| Need | Look for |
|------|----------|
| Data table | Data table with column definitions, sorting, pagination |
| Single-select | Select / dropdown |
| Date picker | Date picker |
| File upload | File upload with preview |
| Dialog | Dialog / confirm dialog |
| Notifications | Toast + inline message |
| Loading | Spinner / progress bar / skeleton |
| Tags | Tag / badge |
| Breadcrumbs | Breadcrumb |
| Tabs | Tabs |
| Charts | Chart wrapper |
| Auto-complete | Auto-complete |
| Multi-select | Multi-select |
| Toggle | Toggle switch |
| Rating | Rating |
| Input number | Numeric input with locale formatting |
| Text area | Textarea |
| Editor | Rich text editor |
| Menu | Menu / menubar |
| Tooltip | Tooltip |
| Overlay panel | Popover |
| Sidebar / off-canvas | Drawer |
| Stepper | Stepper |

## Output Format

For each improvement:

### Improvement #X: {TITLE}

**Component**: `{file_path}`

**Current State**:
    {CURRENT_CODE_OR_DESCRIPTION}

**Improved State**:
    {IMPROVED_CODE}

**Changes Made**:
- {CHANGE_1}
- {CHANGE_2}

**Accessibility Impact**: {DESCRIBE_A11Y_IMPROVEMENT}
**Design System Compliance**: {DESCRIBE_VISUAL_IMPROVEMENT}
```

---

## Example: Improving a Data Table

```
Improve the {Module} listing component.

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
Improve the {Entity} form component.

Current issues:
- Validation errors not visible until submit
- File upload has no preview
- No loading state during save
- Mobile form is too wide (no stacking)
- Required field indicators inconsistent

Apply the UI component library's form validation patterns and the design system.
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
