# UI Principles

Stack-neutral principles. Your stack pack's `references/design-system/` shows how to apply them.

## Spacing

### The 4px Grid

All spacing uses a **4px base grid**. Every margin, padding, and gap is a multiple of 4px. The only exceptions are hairlines (1px) and tight optical adjustments (2px).

| Step | Pixels | Typical use |
|---|---|---|
| 0.5 | 2px | Tight icon spacing |
| 1 | 4px | Inline element gap, sidebar nav items |
| 2 | 8px | Icon and text in a button, button groups, label to input |
| 3 | 12px | Compact lists, compact form spacing |
| 4 | 16px | Default gap between related elements, between form fields |
| 5 | 20px | Tight section padding |
| 6 | 24px | Standard card, dialog, and drawer padding; card grid gap |
| 8 | 32px | Generous section padding, page header to content |
| 10 | 40px | Hero padding |
| 12 | 48px | Page section spacing |
| 16 | 64px | Large page section spacing |
| 20 | 80px | Hero and landing spacing |
| 24 | 96px | Full-page section breaks |

### Spacing Rules

1. **Always use the spacing scale.** Never invent custom values.
2. **Use flex/grid gap** for groups of related elements, not margins on each child.
3. **Padding for containers, margin for separation between containers.**
4. **Form fields are 16px apart** vertically.
5. **Card internal padding is at least 24px** (16px for compact cards in dense dashboards).
6. **Desktop page horizontal padding is at least 32px.**
7. **No negative margins in layout.** Use them only for deliberate visual overlaps.
8. **Container-level vertical spacing is a multiple of 16px** for a consistent rhythm.

## Breakpoints and Responsive Behaviour

Design mobile-first: start with the single-column layout and add columns as the viewport widens.

| Breakpoint | Min width | Horizontal padding | Typical layout |
|---|---|---|---|
| Base (phone) | 0 | 16px | One column, stacked |
| Small | 640px | 16px | Two-column card grids |
| Medium (tablet) | 768px | 24px | Side navigation may appear |
| Large (laptop) | 1024px | 32px | Three-column grids, full tables |
| Extra large | 1280px | 48px | Wide dashboards |
| 2x large | 1536px | 64px | Maximum container width |

- Section vertical spacing grows with the viewport: about 48px on phones, 80px on desktop.
- **Minimum touch target is 44 x 44px** on every interactive element.
- Wide tables become cards or a reduced set of columns on phones.
- Side panels become bottom sheets on phones.
- Test every screen at phone width; there must be no horizontal page scroll.

## Breadcrumbs

### When to Use

- Pages three or more levels deep in a hierarchy (list, then record, then sub-page).
- Multi-step navigation where users need to step back up.
- Not on top-level pages or flat sites, where they add noise.

### Rules

1. The **current page is the last item**: bold and not a link.
2. The first item is **Home**, linking to the root.
3. Icons may aid recognition (home, users, settings) but labels stay visible.
4. **Limit to 5–7 items.** Deeper than that, use a sidebar or collapse the middle into a menu.
5. **Collapse on phones** to the current page and its parent.
6. Breadcrumb state is reflected in the URL so pages can be bookmarked and shared.
7. Separators are decorative; screen readers must announce the trail as navigation, with the current page marked as current.
8. Links show a hover colour change and a visible focus ring.

## Cards

### When to Use Cards

- Summary or preview information (a profile, a project overview, a dashboard metric).
- Each item is a standalone unit whose content varies in height and structure.
- Few items (roughly 2–12), or visual content alongside text.
- Phone layouts where tables are hard to read.

### When to Use Tables Instead

- Structured, comparable data across many columns.
- Users need to sort, filter, or search.
- Many rows (10 or more) with a consistent structure.

| Scenario | Use |
|---|---|
| Dashboard summary | Card grid |
| User list, order history | Table |
| Profile preview | Card in a grid |
| Profile detail | Single spacious card |

### Card Structure and Variants

- Sections: optional **header** (image, icon, title), optional **subheader** (metadata), required **content**, optional **footer** (actions only).
- **Elevated** (subtle shadow) for standalone blocks; **flat** (border, no shadow) for dense dashboards and inside dialogs or drawers.
- **Interactive** cards are fully clickable, show a pointer cursor and a hover lift, and are real links so keyboard and middle-click work.
- Padding: 16px compact, 24px standard, 32px spacious (landing pages, onboarding).
- Grid gaps: 16px dense list, 24px dashboard, 32px content grid.

### Rules

1. **One card per logical unit of content.** Never mix unrelated items.
2. **Cards in a grid share a consistent height**; content grows to fill.
3. **Footers hold actions only**, never body text.
4. Paginate or load more rather than showing an unbounded grid.

## Drawers vs Dialogs

| Criterion | Drawer (side panel) | Dialog (modal) |
|---|---|---|
| Interaction | Background may stay accessible | Blocks the background |
| Content | Secondary, supplementary | Primary, focused task |
| Duration | Extended use (preview, navigation, filters) | Quick task |
| Example | Record preview, settings, filters | Delete confirmation, short edit form |

### Drawer Placement and Size

- **Right** (default): previews, details, side forms.
- **Left**: navigation, filters, primary sidebars.
- **Top**: notifications and announcements.
- **Bottom**: action sheets on phones.
- Widths of about 320px (quick actions), 400px (standard panels), and 500px (complex editors). Never cover the whole screen on desktop; leave some background visible.

### Rules for Overlays (Drawers and Dialogs)

1. A visible **close button** in the header, and **Escape** closes it (unless it is deliberately non-dismissible).
2. Footer actions are **right-aligned, primary action rightmost**, with a cancel action always present.
3. Body content scrolls inside the panel; the header and footer stay fixed.
4. Focus moves into the overlay when it opens, is trapped while modal, and returns to the trigger when it closes.
5. Entrance and exit are animated briefly (around 150–300ms) and respect reduced-motion preferences.
6. Use dialogs for confirmations of destructive actions; use drawers for supplementary content.

## Empty States

Every list, table, card grid, and page that can be empty has a designed empty state.

### Structure

- **Icon or illustration**: a visual cue relevant to the situation.
- **Heading**: short and clear (5–10 words).
- **Description**: actionable guidance on what to do next.
- **Call to action**: one or two actions that resolve the empty state.

### Types

| Type | Message | Action |
|---|---|---|
| No data yet | "No items yet. Get started by creating one." | Create item |
| No search results | "No results found. Try adjusting your filters." | Clear filters, view all |
| Nothing to show (informational) | "You're all caught up." | None |
| No permission | "You don't have access to this page." | Go back |

### Rules

1. Use a larger icon for full-page empty states and a smaller one inline (inside a table or list).
2. Full-page empty states are centred, with a minimum height of about half the viewport.
3. **Never show an error as an empty state.** A failed load shows an error with a retry action.
4. Distinguish loading, empty, and error states; never flash "no data" while loading.
5. Test empty states in both light and dark themes.

## Accessibility

- Meet **WCAG 2.1 AA**: text contrast at least 4.5:1 (3:1 for large text and UI controls).
- Every interactive element is reachable and operable by keyboard, in a logical order.
- Focus is always visible: a clear focus ring, never removed without a replacement.
- Use semantic structure: headings in order, landmarks, lists, buttons for actions and links for navigation.
- Every form input has a visible label; errors are announced and linked to their field.
- Icon-only buttons have an accessible name.
- Never convey meaning by colour alone; pair it with text or an icon.
- Respect reduced-motion preferences and keep animations short.
- Decorative images have empty alternative text; meaningful images describe their content.

## Theming and Consistency

- Define colours, spacing, radii, and shadows as design tokens, and never hard-code values in screens.
- Support light and dark themes from the same tokens.
- Keep radii and shadows to a small set: subtle shadow by default, a stronger one on hover or for overlays.
- Reuse existing patterns before inventing new ones; a new pattern is added to the design system, not to a single screen.
