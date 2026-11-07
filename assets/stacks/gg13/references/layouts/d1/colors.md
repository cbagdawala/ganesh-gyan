# D1 layout — colors

d1 is **monochrome**. Primary is zinc-950 (near-black) in light mode and zinc-50 in
dark mode: the PrimeVue "Noir" pattern. Surfaces are zinc. Hue appears in exactly one
place, the **7-tone status palette**, which colors status chips, KPI dots, stepper
"done" marks and alert values. Primary buttons, the active sidebar pill, links and
focus rings are all black/grey.

The look, light mode: a grey page ground (zinc-100), white cards and sidebar with no
borders between them, black primary buttons, muted zinc-500 secondary text. Dark mode:
a zinc-950 ground, a white (zinc-50) primary, and translucent status tints.

Colors come from three sources, in this order of preference:

1. **PrimeVue semantic variables** (`--p-text-color`, `--p-content-background`, …),
   produced by `AppPreset`. They flip with `.dark-mode` by themselves.
2. **d1 custom variables** in `resources/css/app.css`: `--p-surface-ground`, the
   status palette and the avatar tints. Each is defined for light and `.dark-mode`.
3. **Nothing else.** No raw hex in components.

## `AppPreset` (PrimeVue 4, `@primeuix/themes`)

```typescript
// resources/js/theme/appPreset.ts
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const zinc = (n: number) => `{zinc.${n}}`
const zincScale = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, zinc(n)]),
)

/**
 * Noir on zinc. Density: the root font is 14px (typography.md), so every Aura rem
 * token already renders at 14/16. The overrides below trim only the padding that
 * still reads loose at that size. Controls land at ~32px (size="small" ~27px) and
 * table rows at ~35px (~31px small). Tune density HERE, as tokens, never as CSS
 * overrides on .p-* classes.
 */
export const AppPreset = definePreset(Aura, {
  semantic: {
    primary: zincScale,

    formField: {
      paddingX: '0.75rem',
      paddingY: '0.3125rem',            // ~32px controls
      sm: { fontSize: '0.875rem', paddingX: '0.5rem', paddingY: '0.25rem' },  // ~27px (grids)
    },
    list: {
      option: { padding: '0.4rem 0.75rem' },
      optionGroup: { padding: '0.4rem 0.75rem' },
    },
    navigation: {
      item: { padding: '0.4rem 0.75rem' },
      submenuLabel: { padding: '0.4rem 0.75rem' },
    },
    overlay: {
      modal: { padding: '1rem' },
    },

    colorScheme: {
      light: {
        surface: { 0: '#ffffff', ...zincScale },
        primary: {
          color: '{zinc.950}',
          inverseColor: '#ffffff',
          hoverColor: '{zinc.900}',
          activeColor: '{zinc.800}',
        },
        highlight: {                      // selected option / row / toggle
          background: '{zinc.100}',
          focusBackground: '{zinc.200}',
          color: '{zinc.800}',
          focusColor: '{zinc.900}',
        },
      },
      dark: {
        surface: { 0: '#ffffff', ...zincScale },
        primary: {
          color: '{zinc.50}',
          inverseColor: '{zinc.950}',
          hoverColor: '{zinc.100}',
          activeColor: '{zinc.200}',
        },
        highlight: {
          background: 'rgba(250, 250, 250, .16)',
          focusBackground: 'rgba(250, 250, 250, .24)',
          color: 'rgba(255, 255, 255, .87)',
          focusColor: 'rgba(255, 255, 255, .87)',
        },
      },
    },
  },

  components: {
    // Square icon-only buttons that match the ~32px / ~27px control heights.
    button: { root: { iconOnlyWidth: '2.27rem', sm: { iconOnlyWidth: '1.96rem' } } },
    datatable: {
      header:     { padding: '0.5rem 0.75rem', sm: { padding: '0.25rem 0.5rem' } },
      headerCell: { padding: '0.5rem 0.75rem', sm: { padding: '0.3rem 0.5rem' } },
      bodyCell:   { padding: '0.5rem 0.75rem', sm: { padding: '0.3rem 0.5rem' } },
      footerCell: { padding: '0.5rem 0.75rem', sm: { padding: '0.3rem 0.5rem' } },
      footer:     { padding: '0.5rem 0.75rem', sm: { padding: '0.25rem 0.5rem' } },
    },
    paginator: { root: { padding: '0.375rem 0.75rem' }, navButton: { width: '2.25rem', height: '2.25rem' } },
    card: { body: { padding: '1rem' } },
    tabs: { tab: { padding: '0.625rem 1rem' }, tabpanel: { padding: '0.75rem 1rem 1rem 1rem' } },
    panel: {
      header: { padding: '0.75rem 1rem' },
      toggleableHeader: { padding: '0.25rem 1rem' },
      content: { padding: '0 1rem 1rem 1rem' },
      footer: { padding: '0 1rem 1rem 1rem' },
    },
    accordion: { header: { padding: '0.75rem 1rem' }, content: { padding: '0 1rem 1rem 1rem' } },
    fieldset: { root: { padding: '0 1rem 1rem 1rem' } },
    toolbar: { root: { padding: '0.5rem' } },
    drawer: { title: { fontSize: '1.25rem' } },
    // Accessibility floor: nothing under 11px (0.786rem at the 14px root).
    // Aura's badge (0.75rem / sm 0.625rem) and progress label would render at 10.5px / 8.75px.
    badge: { root: { fontSize: '0.786rem' }, sm: { fontSize: '0.786rem' } },
    progressbar: { label: { fontSize: '0.786rem' } },
  },
})
```

Wire it in `app.ts` with `darkModeSelector: '.dark-mode'` (`shell.md` → "Boot").

The preset sets the surface ramp to the same zinc steps in both schemes. Aura picks
different steps per scheme for its semantic tokens (dark mode reads `surface.900`
for `content.background`, `surface.700` for borders, and so on). Always use those
semantic tokens and never a fixed step, so the flip happens for you.

### Resolved values

| Variable | Light | Dark | Use |
|---|---|---|---|
| `--p-primary-color` | zinc-950 `#09090b` | zinc-50 `#fafafa` | Primary button, focus ring, avatar disc, current step |
| `--p-primary-contrast-color` | `#ffffff` | zinc-950 | Text on primary |
| `--p-text-color` | zinc-700 | `#ffffff` (Aura dark) | Body text, active nav item |
| `--p-text-muted-color` | zinc-500 | zinc-400 | Labels, meta, idle nav items, icons |
| `--p-content-background` | `#ffffff` | zinc-900 | Cards, sidebar, topbar, panels |
| `--p-content-hover-background` | zinc-100 | zinc-800 | Hover row, active sidebar pill |
| `--p-content-border-color` | zinc-200 | zinc-700 | Hairlines, topbar inset edge, tile borders |
| `--p-highlight-background` | zinc-100 | `rgba(250,250,250,.16)` | Selected option / row |
| `--p-surface-ground` (custom) | zinc-100 `#f4f4f5` | zinc-950 `#09090b` | Page background behind cards |

## `--p-surface-ground`

This is not a PrimeVue 4 token. d1 defines it in `app.css` for the page ground (the
body, `DefaultLayout`, `AuthLayout`'s neighbours, `ErrorLayout`, `PublicLayout`):

```css
/* resources/css/app.css */
:root      { --p-surface-ground: var(--p-surface-100); }
.dark-mode { --p-surface-ground: var(--p-surface-950); }
body       { background: var(--p-surface-ground); color: var(--p-text-color); }
```

Cards sit on it in `--p-content-background` with **no border** (`spacing.md` →
`.card`). The contrast between ground and card is the separation.

## Status palette (7 tones)

The **one** palette for anything that colors a status. These are deliberate accents,
so they are literal values. They are not derived from the preset.

```css
/* resources/css/app.css */
:root {
  --status-gray-bg:   #f1f1f3; --status-gray-fg:   #52525b;
  --status-blue-bg:   #e8f1fb; --status-blue-fg:   #1d5fa0;
  --status-amber-bg:  #fdf3d9; --status-amber-fg:  #8a6410;
  --status-green-bg:  #e5f5ea; --status-green-fg:  #1d7a3e;
  --status-red-bg:    #fdecea; --status-red-fg:    #b42318;
  --status-purple-bg: #f0ebfa; --status-purple-fg: #5b3fa0;
  --status-teal-bg:   #e5f2f6; --status-teal-fg:   #1f6f86;
}
.dark-mode {
  --status-gray-bg:   #27272a;                   --status-gray-fg:   #d4d4d8;
  --status-blue-bg:   rgba(96, 165, 250, 0.16);  --status-blue-fg:   #93c5fd;
  --status-amber-bg:  rgba(250, 204, 21, 0.14);  --status-amber-fg:  #fcd34d;
  --status-green-bg:  rgba(74, 222, 128, 0.15);  --status-green-fg:  #86efac;
  --status-red-bg:    rgba(248, 113, 113, 0.16); --status-red-fg:    #fca5a5;
  --status-purple-bg: rgba(167, 139, 250, 0.18); --status-purple-fg: #c4b5fd;
  --status-teal-bg:   rgba(34, 211, 238, 0.14);  --status-teal-fg:   #67e8f9;
}
```

| Tone | Meaning | Typical statuses |
|---|---|---|
| `gray` | Not started, inert, unknown | draft, not invoiced |
| `blue` | Issued / in the counterpart's hands | open, sent, submitted, confirmed, posted |
| `amber` | In progress, partial, waiting | pending, partial, processing, in progress |
| `green` | Done, successful | accepted, approved, paid, delivered, completed, closed |
| `red` | Failed, negative, ended badly | overdue, expired, rejected, cancelled, void |
| `purple` | Handed on to the next document/stage | converted, invoiced, billed, picked, packed |
| `teal` | Moving / scheduled | shipped, in transit, scheduled |

The status → tone mapping lives in **one** module (`statusTones.ts`, see
`components.md`). Render it with `StatusChip`. Anything else that needs a status
color (a KPI dot, a bar, an alert value) reads the same pair:

```typescript
export const toneVars = (tone: StatusTone) => ({
  background: `var(--status-${tone}-bg)`,
  color: `var(--status-${tone}-fg)`,
})
```

```html
<!-- Tailwind 4 arbitrary-variable syntax -->
<span class="bg-(--status-red-bg) text-(--status-red-fg) rounded-md px-2 py-0.5">Overdue</span>
```

Do **not** use PrimeVue `Tag`/`Badge` `severity` colors for document statuses in d1.
`Badge` stays for counts (the notification bell). Status pills are `StatusChip`.

## Avatar tints

Initials avatars (`ListAvatar`, `components.md`) use six stable tints. Each tint is
picked by hashing the record id, so an avatar keeps its color when a list re-sorts:

```css
:root {
  --avatar-tint-0-bg: #e8eefc; --avatar-tint-0-fg: #2f4fb5;
  --avatar-tint-1-bg: #fbeee4; --avatar-tint-1-fg: #a2531c;
  --avatar-tint-2-bg: #e6f4ec; --avatar-tint-2-fg: #23794a;
  --avatar-tint-3-bg: #f3e8f8; --avatar-tint-3-fg: #7c3a9e;
  --avatar-tint-4-bg: #fdf3d9; --avatar-tint-4-fg: #8a6410;
  --avatar-tint-5-bg: #e5f2f6; --avatar-tint-5-fg: #1f6f86;
}
.dark-mode {
  --avatar-tint-0-bg: rgba(129, 140, 248, 0.18); --avatar-tint-0-fg: #a5b4fc;
  --avatar-tint-1-bg: rgba(251, 146, 60, 0.16);  --avatar-tint-1-fg: #fdba74;
  --avatar-tint-2-bg: rgba(74, 222, 128, 0.15);  --avatar-tint-2-fg: #86efac;
  --avatar-tint-3-bg: rgba(216, 180, 254, 0.16); --avatar-tint-3-fg: #d8b4fe;
  --avatar-tint-4-bg: rgba(250, 204, 21, 0.14);  --avatar-tint-4-fg: #fde047;
  --avatar-tint-5-bg: rgba(34, 211, 238, 0.14);  --avatar-tint-5-fg: #67e8f9;
}
```

## Tailwind 4 wiring

```css
/* resources/css/app.css (color part) */
@layer theme, base, primevue, components, utilities;
@import "tailwindcss";
@plugin "tailwindcss-primeui";
@custom-variant dark (&:where(.dark-mode, .dark-mode *));
```

- `tailwindcss-primeui` gives utilities bound to the preset: `bg-primary`,
  `text-primary-contrast`, `text-color`, `text-muted-color`, `bg-emphasis`,
  `bg-highlight`, `border-surface`. These flip with dark mode. Prefer them over the
  raw `bg-surface-<n>` steps. A fixed step does **not** flip, so pair it with a
  `dark:` variant if you use one.
- For d1's custom variables, use Tailwind 4's variable shorthand:
  `bg-(--p-surface-ground)`, `text-(--status-green-fg)`,
  `border-(--p-content-border-color)`.
- Tailwind's default palette (`bg-blue-500`, `text-red-600`, …) is **not** used in d1.
  It bypasses both the preset and the status palette.

## Usage rules

- **Never write a raw hex or rgb in a component.** Read `--p-*` semantic variables
  (structure, text, borders) or `--status-*` (meaning). The only literals live in
  `app.css` (status, avatar tints) and in `AppPreset`.
- **Never read a fixed surface step for text or backgrounds** (`--p-surface-200`)
  when a semantic variable exists (`--p-content-border-color`). Fixed steps do not
  flip. The exceptions are the input/breadcrumb hairlines the shell already uses, and
  each one needs a `.dark-mode` counterpart.
- Primary is black. Do not introduce a brand hue for buttons, links or the active
  nav. Emphasis comes from weight, size and the black primary button.
- Use `color-mix(in srgb, var(--p-primary-color) 12%, transparent)` for a tint of
  primary that must work in both schemes. A fixed `--p-primary-50` disappears on the
  dark surface.
- Destructive actions use PrimeVue `severity="danger"`. Danger text in menus uses
  `--p-red-500`. Neither is a status, so neither uses the status palette.
- `::selection` is `--p-primary-100` on `--p-primary-900`. Focus rings are
  `--p-primary-color` (`spacing.md` → globals).
