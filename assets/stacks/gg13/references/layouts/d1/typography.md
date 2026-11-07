# D1 layout — typography

Two faces, one root size:

- **Inter** for every piece of UI text: labels, body, headings, buttons, menu.
- **JetBrains Mono** for numbers: amounts, quantities, dates, document numbers, codes,
  KPI values and counts. Never use it for prose, labels, names or headings.
- The root font size is **14px** (`html { font-size: 87.5% }`). The UI is compact by
  design, and every rem-based size in the app scales from that root.

## Font loading

Fonts load in the Blade shell, before the Vite bundle (`shell.md` → "Blade shell"):

```blade
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
<link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|jetbrains-mono:400,500,600,700&display=swap" rel="stylesheet" />
```

Bunny Fonts is a GDPR-friendly mirror of Google Fonts. Self-hosting the same weights
with `@font-face` in `app.css` works too. `display=swap` is required. This applies to
the web UI only: PDF, email and export templates keep their own fonts.

## Tokens

```css
/* resources/css/app.css */

/* `static` emits every variable even when no utility uses it, because scoped
   component CSS reads var(--text-sm) etc. directly. */
@theme static {
  /* Tailwind font utilities: font-sans, font-mono */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;

  /* Type scale. Same names as Tailwind's text-* scale, so `text-sm` and
     `var(--text-sm)` are the same size. Pixel values assume the 14px root. */
  --text-xs:   0.857rem;  /* 12px  table meta, timestamps, chips */
  --text-sm:   0.929rem;  /* 13px  labels, inputs, secondary text, sidebar items */
  --text-base: 1rem;      /* 14px  body text, table cells, sidebar labels */
  --text-lg:   1.286rem;  /* 18px  section headers */
  --text-xl:   1.429rem;  /* 20px  page titles */
  --text-2xl:  1.714rem;  /* 24px  hero / hub titles */
}

:root {
  --font-primary: var(--font-sans);
  --font-text: var(--font-sans);                 /* alias read by list/stepper components */
  --font-numeric: 'JetBrains Mono', ui-monospace, monospace;
  /* JetBrains Mono is wider than Inter, so numeric runs are set slightly smaller
     and amount columns do not grow. Relative, so it follows its context. */
  --font-numeric-scale: 0.93em;

  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
}

@layer base {
  html {
    font-size: 87.5%;              /* 14px root: the density lever. Set here ONLY. */
    -webkit-text-size-adjust: none; text-size-adjust: none;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  }
  body {
    font-family: var(--font-sans);
    font-size: var(--text-base);
    font-weight: var(--fw-normal);
    line-height: 1.5;
    color: var(--p-text-color);
  }
  h1, h2, h3, h4, h5, h6 {
    font-weight: var(--fw-semibold);
    line-height: 1.4;
    letter-spacing: -0.015em;
    color: var(--p-text-color);
  }
}
```

PrimeVue components inherit `font-family` from `body`. No `--p-font-family` override
is needed.

## The 14px root and what it changes

`html { font-size: 87.5% }` makes `1rem = 14px`. Everything in rem shrinks to 14/16
together:

- **Aura tokens.** Controls, paddings and radii in the preset are rem, so PrimeVue is
  denser before any override. `AppPreset` only trims what still looks loose
  (`colors.md`).
- **Tailwind utilities.** Tailwind 4 spacing is `calc(var(--spacing) * n)` with
  `--spacing: 0.25rem`, so `p-4` is **14px**, not 16px, and `gap-2` is 7px. Sizes
  you read in a mock-up in px need converting: `px ÷ 14 = rem`.
- **Media queries do not change.** `rem`/`em` in `@media` resolve against the
  browser default (16px), not the `html` font size. `md:` is still 768px and `lg:`
  is still 1024px.
- **The 11px floor.** Nothing in the app renders below 11px (0.786rem). Aura's badge
  and progress-bar label tokens are raised to that in `AppPreset`. Hand-written CSS
  that needs a tiny size uses px (`10.5px` sidebar section headings is the one
  exception, uppercase and letter-spaced) or `max(…, 11px)`.

Set the root size in `app.css` only. Do not repeat it in `App.vue` or a layout: a
second rule loses the cascade unpredictably.

## Type scale in use

| Element | Size | Weight | Other |
|---|---|---|---|
| Page title (`.page-header h1`) | `--text-xl` (20px) | 600 | letter-spacing −0.025em, margin-bottom `--space-1` |
| Page subtitle (`.page-header p`) | `--text-sm` (13px) | 400 | `--p-text-muted-color` |
| Hub title (`InnerNavHub`) | 1.5rem (21px) | 600 | letter-spacing −0.01em |
| Section header | `--text-lg` (18px) | 600 | |
| Detail group heading (`DetailGroup`) | `--text-sm` | 600 | hairline rule to the right |
| Body, table cell | `--text-base` (14px) | 400 | line-height 1.5 |
| Form label (`.field label`) | `--text-sm` | 600 | `--p-text-color` |
| Detail label (`dt`) | `--text-xs` | 500 | muted |
| Detail value (`dd`) | `--text-base` | 500 | |
| Sidebar item | `--text-base` label, 500 | 500 (600 brand) | brand 1.125rem, −0.03em |
| Sidebar section heading | 10.5px | 600 | uppercase, letter-spacing .06em, muted |
| Inner-nav / hub group label | 0.786rem (11px) | 600 | uppercase, letter-spacing .06em, muted |
| Status chip | 11.3px (`sm`) / 11.6px (`md`) | 500 | |
| KPI tile label / value | 12.5px / 15px | 400 / 600 | value in the numeric face |
| Meta, timestamps, version | `--text-xs` (12px) | 400 | muted |
| Auth brand | 1.75rem | 600 | letter-spacing −0.03em |

Three weights only: 400, 500, 600. 700 is loaded for PDFs and exceptional emphasis
and is not used in the app UI. Headings get a slight negative letter-spacing. Body
text gets none.

Tailwind equivalents: `text-xs|sm|base|lg|xl|2xl` map to the scale above,
`font-normal|medium|semibold` to the weights, `tracking-tight` for titles.

## Numeric face

```css
/* resources/css/app.css */
@layer components {
  /* Amounts, quantities, dates, document numbers, KPI values: put .num on the
     element that holds the number. Never on prose, labels, names or headings. */
  .num {
    font-family: var(--font-numeric);
    font-variant-numeric: tabular-nums lining-nums;
    font-size: max(var(--font-numeric-scale), 11px);
  }
  /* A number inside a numeric context must not shrink twice. */
  :is(.num, .col-num) .num { font-size: inherit; }

  /* Every InputNumber (money, qty, rates) types in the numeric face. */
  .p-inputnumber-input {
    font-family: var(--font-numeric);
    font-variant-numeric: tabular-nums lining-nums;
  }

  /* DataTable numeric column: one class on <Column class="col-num"> reaches
     header, body and footer cells. Right-aligned, numeric face in the body. */
  .p-datatable :is(th, td):is(.col-num, .col-right) { text-align: right; }
  .p-datatable :is(th, td).col-center { text-align: center; }
  .p-datatable th:is(.col-num, .col-right) > .p-datatable-column-header-content { justify-content: flex-end; }
  .p-datatable th.col-center > .p-datatable-column-header-content { justify-content: center; }
  .p-datatable td.col-num {
    font-family: var(--font-numeric);
    font-variant-numeric: tabular-nums lining-nums;
    font-size: max(var(--font-numeric-scale), 11px);
  }
  /* Words inside a numeric cell ("No price", a chip, a button) stay in Inter. */
  .p-datatable td.col-num :is(.text-muted-color, .p-tag, .p-badge, .p-button, a, small, em, [class*="chip"]) {
    font-family: var(--font-sans);
  }
  .p-datatable td.col-num :is(.p-inputnumber-input, .p-inputtext) { text-align: right; }
}
```

| Column / value | Class |
|---|---|
| Amount, qty, rate, % | `<Column class="col-num">` |
| Right-aligned but not a number (action cluster) | `col-right` |
| Centred (status chip, icon, checkbox) | `col-center` |
| Text | nothing, left is the default |
| A number outside a table (`<span>`, KPI value, document number in a title) | `.num` |
| Code / SKU / UPC in a detail field | `DetailField mono` (`components.md`) |

PrimeVue 4 wraps each header label in `.p-datatable-column-header-content` (a flex
box). `text-align` alone never moves a header, so the `justify-content` rules above
are what align the header with its body.

Document numbers stay in the numeric face even inside a heading: `<h1>Order
<span class="num">SO-1042</span></h1>`. Only the number is mono, never the word.

## Rules

- Use the `--text-*` scale (or the matching Tailwind `text-*`). Do not invent px sizes
  in pages. Sizes in px exist only inside the shared components listed above.
- Never set `font-family` in a page component. `.num`, `col-num` and `mono` are the
  only switches.
- Never go below 11px.
- Do not mix in a third family. Icons are PrimeIcons
  (`../../design-system/icons.md`).
