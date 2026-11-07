# D1 layout — spacing, radius, elevation

d1 is a **dense** back-office layout. The density comes from the 14px root
(`typography.md`) plus a few preset token trims (`colors.md` → `AppPreset`). There are
no CSS overrides on PrimeVue classes. Elevation is almost flat: cards are separated
from the grey ground by color, not by borders or shadows.

Every token below lives in `resources/css/app.css`. Values in rem are shown in px at
the 14px root.

## Tokens

```css
/* resources/css/app.css */

/* Tailwind namespaces: these also drive rounded-* and shadow-* utilities. */
@theme static {
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;

  /* Minimal shadows: used only on overlays and floating bars, never on cards. */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
}

:root {
  /* Spacing scale for scoped component CSS. In templates, use Tailwind's
     padding, gap and margin utilities (same 0.25rem step:
     --space-4 == p-4 == 14px). */
  --space-1: 0.25rem;   /*  3.5px */
  --space-2: 0.5rem;    /*  7px  */
  --space-3: 0.75rem;   /* 10.5px */
  --space-4: 1rem;      /* 14px  */
  --space-5: 1.25rem;   /* 17.5px */
  --space-6: 1.5rem;    /* 21px  */
  --space-8: 2rem;      /* 28px  */
  --space-10: 2.5rem;   /* 35px  */
  --space-12: 3rem;     /* 42px  */

  --radius-full: 9999px;

  --transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);  /* hover, focus */
  --transition-base: 180ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 280ms cubic-bezier(0.4, 0, 0.2, 1);  /* sidebar width, theme switch, slide-downs */

  /* App shell metrics: ONE source, because full-height list pages size
     themselves with calc(100vh - topbar - 2 x gutter). */
  --layout-topbar-height: 48px;
  --layout-content-padding: 1rem;   /* 14px gutter around the page */
}
```

| Token | Value | Used by |
|---|---|---|
| `--layout-topbar-height` | 48px | Topbar height, sidebar brand row, viewport calcs |
| `--layout-content-padding` | 1rem (14px) | `DefaultLayout` content padding, topbar side padding |
| Sidebar width | 220px / 64px | `AppSidebar`, `.layout-main` margin (literal in the shell; change both together) |
| `--radius-md` | 6px | Sidebar items, status chips |
| `--radius-lg` | 8px | KPI tiles, avatar menu, inner-nav card |
| `--radius-xl` / `.card` | 10px | Cards |
| `--radius-full` | pill | Search box, count pills, stepper pills |

## Density rule

**Tune density through preset tokens, never through `.p-*` CSS overrides.**

- Padding, control height and font size of PrimeVue components are set in
  `AppPreset` (`formField`, `list`, `navigation`, `overlay`, and the `components`
  block for `button`, `datatable`, `paginator`, `card`, `tabs`, `panel`,
  `accordion`, `fieldset`, `toolbar`, `drawer`, `badge`, `progressbar`).
- Do not write `.p-inputtext { padding: … }` or `.p-datatable td { padding: … }` in
  `app.css` or with `:deep()`. Overrides like these fight the token system, miss the
  `sm` variants and break when Aura changes its selectors.
- `:deep()` only works inside a `<style scoped>` block. In a global file it is dropped
  silently.
- Per-instance tweaks use the component's `pt` / `dt` props, not a global rule.

The global CSS rules that do target PrimeVue are alignment and typeface rules
(`col-num`, `.p-inputnumber-input` font), not spacing (`typography.md`).

## Resulting sizes

| Element | Default | `size="small"` |
|---|---|---|
| InputText / Select / DatePicker / InputNumber | ~32px tall | ~27px |
| Button (with label) | ~32px | ~27px |
| Icon-only button | 2.27rem ≈ 32px square | 1.96rem ≈ 27px |
| DataTable body row | ~35px | ~31px |
| Paginator nav button | 2.25rem ≈ 31.5px | |
| Select / Menu option | 0.4rem × 0.75rem padding | |
| Topbar | 48px | |
| Sidebar item | ~30px (0.4rem × 0.75rem padding) + 1px gap | |
| KPI tile (`ListKpi`) | 40px | |
| Status chip | ~19px (`sm`), ~23px (`md`) | |

Use `size="small"` for controls inside table cells, filter bars and line-item grids.
Use the default size everywhere else.

## Globals

```css
/* resources/css/app.css */
@layer components {
  /* A white panel on the grey ground. No border, no shadow. */
  .card {
    background: var(--p-content-background);
    border: none;
    border-radius: var(--radius-xl);    /* 10px */
    padding: var(--space-5);            /* 17.5px */
  }

  /* Title + subtitle on the left, actions on the right. */
  .page-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); }
  .page-header h1 { margin: 0 0 var(--space-1); font-size: var(--text-xl); font-weight: var(--fw-semibold); letter-spacing: -0.025em; }
  .page-header p { margin: 0; font-size: var(--text-sm); color: var(--p-text-muted-color); }
  .page-header .header-actions { display: flex; align-items: center; gap: var(--space-2); }
  @media (max-width: 576px) { .page-header { flex-direction: column; align-items: flex-start; } }

  /* Toolbar row above a table inside a card. */
  .table-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); margin-bottom: var(--space-3); }
  @media (max-width: 576px) { .table-header { flex-direction: column; align-items: stretch; } }

  /* A page that fills the viewport: its card scrolls internally. */
  .list-view-layout {
    display: flex; flex-direction: column; gap: var(--space-4);
    height: calc(100vh - var(--layout-topbar-height) - 2 * var(--layout-content-padding));
  }
  .list-view-layout > .card { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
}
```

These are in `@layer components`, so a Tailwind utility on the same element
(`class="card p-0"`) wins.

```html
<div class="page-header mb-4">
  <div>
    <h1>Orders</h1>
    <p>Every sales order, newest first.</p>
  </div>
  <div class="header-actions">
    <Button icon="pi pi-question-circle" severity="secondary" text rounded aria-label="Help" />
    <Button label="New order" icon="pi pi-plus" @click="router.push({ name: 'orders.create' })" />
  </div>
</div>
<div class="card">…</div>
```

### Scrollbar, focus, selection

```css
@layer base {
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--p-surface-300); border-radius: var(--radius-full); }
  ::-webkit-scrollbar-thumb:hover { background: var(--p-surface-400); }
  * { scrollbar-width: thin; scrollbar-color: var(--p-surface-300) transparent; }

  :focus-visible { outline: 2px solid var(--p-primary-color); outline-offset: 2px; border-radius: var(--radius-sm); }
  ::selection { background-color: var(--p-primary-100); color: var(--p-primary-900); }

  #app { isolation: isolate; min-height: 100vh; }
}

/* Theme switch fades rather than snaps. */
html { transition: background-color var(--transition-slow), color var(--transition-slow); }
body, .app-sidebar, .app-topbar, .card {
  transition: background-color var(--transition-slow), border-color var(--transition-slow), color var(--transition-slow);
}
```

Focus is visible only for keyboard users (`:focus-visible`), as a 2px black ring
(white in dark mode). Sidebar items use an inset ring (`outline-offset: -2px`) so it
is not clipped by `overflow: hidden`.

## Spacing rules

- Page rhythm: `.page-header` → 14px (`mb-4`) → content. Between stacked cards use
  `gap-4` (14px). Inside a card use `gap-3` (10.5px) for related groups.
- Form grids: two columns with `gap: var(--space-3) var(--space-4)`, one column below
  768px. Label-to-control gap is 0.375rem. The form field structure is in
  `../../design-system/forms.md`.
- Detail grids (`DetailGroup`): `gap: 1rem 1.5rem`, three columns, two at ≤ 860px and
  one at ≤ 520px (`components.md`).
- Do not add borders to cards or shadows to cards. If two white areas touch, separate
  them with a `--p-content-border-color` hairline.
- Shadows belong to things that float: popovers, menus, a sticky bulk-action bar.
  PrimeVue overlays bring their own shadows from the preset.
- Animate with the `--transition-*` tokens. Nothing in the shell animates longer than
  280ms.
