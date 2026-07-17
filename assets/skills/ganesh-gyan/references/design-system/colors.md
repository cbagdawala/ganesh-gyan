# Color Palette

## Overview

Design tokens for the Laravel 13 + Vue 3 + PrimeVue application. All colors use CSS custom properties defined in `:root` and `.dark` selectors. PrimeVue theme tokens override the defaults where applicable.

## Primary Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-primary-50` | `#EEF5FF` | `#0C1A3A` | Subtle background fills |
| `--color-primary-100` | `#D6E4FF` | `#122250` | Hover backgrounds |
| `--color-primary-200` | `#B3CCFF` | `#1A2E6E` | Focus rings |
| `--color-primary-300` | `#80AEFF` | `#253D91` | Borders on focus |
| `--color-primary-400` | `#4287FF` | `#3B59D0` | Interactive hover states |
| `--color-primary-500` | `#0064F5` | `#4F72FF` | Primary actions, links, active states |
| `--color-primary-600` | `#0054D4` | `#6382FF` | Primary button background |
| `--color-primary-700` | `#0047B5` | `#7A94FF` | Pressed/solid states |
| `--color-primary-800` | `#083E94` | `#93A6FF` | Darker accent surfaces |
| `--color-primary-900` | `#0F387A` | `#B3BEFF` | Deepest accent |
| `--color-primary-950` | `#10274D` | `#D1D8FF` | Surface fills |

**PrimeVue override:**
```css
--p-primary-50: #EEF5FF;
--p-primary-100: #D6E4FF;
--p-primary-200: #B3CCFF;
--p-primary-300: #80AEFF;
--p-primary-400: #4287FF;
--p-primary-500: #0064F5;
--p-primary-600: #0054D4;
--p-primary-700: #0047B5;
--p-primary-800: #083E94;
--p-primary-900: #0F387A;
--p-primary-950: #10274D;
```

## Secondary Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-secondary-50` | `#F5F7FF` | `#0E1020` |
| `--color-secondary-100` | `#E8ECFF` | `#181B35` |
| `--color-secondary-200` | `#D1D9FF` | `#242850` |
| `--color-secondary-300` | `#A9B8FF` | `#333978` |
| `--color-secondary-400` | `#768CFF` | `#4C55B5` |
| `--color-secondary-500` | `#5067F8` | `#6372FF` |
| `--color-secondary-600` | `#4251E0` | `#7582FF` |
| `--color-secondary-700` | `#3744C1` | `#8B95FF` |
| `--color-secondary-800` | `#2F3A9F` | `#A3AAF5` |
| `--color-secondary-900` | `#2A3382` | `#BBC7FF` |
| `--color-secondary-950` | `#1A2151` | `#D4DBFF` |

## Success Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-success-50` | `#ECFDF3` | `#051A10` |
| `--color-success-100` | `#D1FAE5` | `#0A311E` |
| `--color-success-200` | `#A7F3D0` | `#114D2E` |
| `--color-success-300` | `#6EE7B7` | `#1C7A48` |
| `--color-success-400` | `#34D399` | `#26A15E` |
| `--color-success-500` | `#10B981` | `#34D399` |
| `--color-success-600` | `#059669` | `#4ADE80` |
| `--color-success-700` | `#047857` | `#6EE7B7` |
| `--color-success-800` | `#065F46` | `#A7F3D0` |
| `--color-success-900` | `#064E3B` | `#D1FAE5` |
| `--color-success-950` | `#052E1C` | `#ECFDF3` |

## Info Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-info-50` | `#ECFEFF` | `#041A1F` |
| `--color-info-100` | `#CFFEFE` | `#072F38` |
| `--color-info-200` | `#A6F9F9` | `#0B4D58` |
| `--color-info-300` | `#6EF2F2` | `#137A85` |
| `--color-info-400` | `#26E6E6` | `#1CA8B8` |
| `--color-info-500` | `#06B6D4` | `#26E6E6` |
| `--color-info-600` | `#0891B2` | `#2EE8E8` |
| `--color-info-700` | `#0E7490` | `#6EF2F2` |
| `--color-info-800` | `#155E75` | `#A6F9F9` |
| `--color-info-900` | `#164E63` | `#CFFEFE` |
| `--color-info-950` | `#082F49` | `#ECFEFF` |

## Warning Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-warning-50` | `#FFFBEB` | `#241500` |
| `--color-warning-100` | `#FEF3C7` | `#3D2400` |
| `--color-warning-200` | `#FDE68A` | `#5E3A00` |
| `--color-warning-300` | `#FCD34D` | `#8B5600` |
| `--color-warning-400` | `#FBBF24` | `#B87300` |
| `--color-warning-500` | `#F59E0B` | `#FCD34D` |
| `--color-warning-600` | `#D97706` | `#FDB022` |
| `--color-warning-700` | `#B45309` | `#FCD34D` |
| `--color-warning-800` | `#92400E` | `#FDE68A` |
| `--color-warning-900` | `#78350F` | `#FEF3C7` |
| `--color-warning-950` | `#451A03` | `#FFFBEB` |

## Danger Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--color-danger-50` | `#FEF2F2` | `#1C0A0A` |
| `--color-danger-100` | `#FEE2E2` | `#301111` |
| `--color-danger-200` | `#FECACA` | `#481919` |
| `--color-danger-300` | `#FCA5A5` | `#6E2626` |
| `--color-danger-400` | `#F87171` | `#993636` |
| `--color-danger-500` | `#EF4444` | `#F87171` |
| `--color-danger-600` | `#DC2626` | `#FA8282` |
| `--color-danger-700` | `#B91C1C` | `#FCA5A5` |
| `--color-danger-800` | `#991B1B` | `#FECACA` |
| `--color-danger-900` | `#7F1D1D` | `#FEE2E2` |
| `--color-danger-950` | `#450A0A` | `#FEF2F2` |

## Neutral Colors (Grays)

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--color-neutral-0` | `#FFFFFF` | — | Pure white |
| `--color-neutral-50` | `#F9FAFB` | `#0A0A0F` | Page background (light) |
| `--color-neutral-100` | `#F3F4F6` | `#111118` | Elevated surfaces |
| `--color-neutral-200` | `#E5E7EB` | `#1A1A24` | Borders, dividers |
| `--color-neutral-300` | `#D1D5DB` | `#262633` | Inactive borders |
| `--color-neutral-400` | `#9CA3AF` | `#404055` | Disabled text |
| `--color-neutral-500` | `#6B7280` | `#636380` | Secondary text |
| `--color-neutral-600` | `#4B5563` | `#9292AA` | Body text (dark bg) |
| `--color-neutral-700` | `#374151` | `#B8B8D0` | Headings (light bg) |
| `--color-neutral-800` | `#1F2937` | `#E0E0F0` | Strong text (light bg) |
| `--color-neutral-900` | `#111827` | `#F0F0FF` | Primary text (light bg) |
| `--color-neutral-950` | `#030712` | `#FAFAFF` | Darkest text |

**Dark mode defaults:**
```css
:root.dark {
  --color-neutral-50: #0A0A0F;
  --color-neutral-100: #111118;
  --color-neutral-200: #1A1A24;
  --color-neutral-300: #262633;
  --color-neutral-400: #404055;
  --color-neutral-500: #636380;
  --color-neutral-600: #9292AA;
  --color-neutral-700: #B8B8D0;
  --color-neutral-800: #E0E0F0;
  --color-neutral-900: #F0F0FF;
  --color-neutral-950: #FAFAFF;
}
```

## Semantic Mapping

Use semantic tokens rather than raw colors:

```css
--color-surface: var(--color-neutral-0);
--color-surface-raised: var(--color-neutral-100);
--color-surface-overlay: var(--color-neutral-0);
--color-border: var(--color-neutral-200);
--color-border-focus: var(--color-primary-500);
--color-text-primary: var(--color-neutral-900);
--color-text-secondary: var(--color-neutral-500);
--color-text-disabled: var(--color-neutral-400);
--color-text-inverse: var(--color-neutral-0);
--color-link: var(--color-primary-600);
--color-link-hover: var(--color-primary-700);
```

## Dark Mode Tokens

```css
:root.dark {
  --color-surface: var(--color-neutral-50);
  --color-surface-raised: var(--color-neutral-100);
  --color-surface-overlay: var(--color-neutral-100);
  --color-border: var(--color-neutral-200);
  --color-border-focus: var(--color-primary-400);
  --color-text-primary: var(--color-neutral-100);
  --color-text-secondary: var(--color-neutral-400);
  --color-text-disabled: var(--color-neutral-600);
  --color-text-inverse: var(--color-neutral-900);
  --color-link: var(--color-primary-400);
  --color-link-hover: var(--color-primary-300);
}
```

## Usage Rules

1. **Never hardcode hex values in templates.** Always use semantic CSS variables or PrimeVue design tokens.
2. **Text on colored backgrounds must meet WCAG AA contrast** (4.5:1 for normal text, 3:1 for large text).
3. **Use `--color-neutral-*` for all non-semantic text and backgrounds.**
4. **Use `--color-primary-*` only for interactive elements and brand moments.**
5. **Use semantic color tokens** (`--color-success-*` for success states, etc.) for feedback UI.
6. **Dark mode must be tested for every color combination** before commit.

## PrimeVue Theme Configuration

Tailwind CSS 4 is **CSS-first**: design tokens live in a `@theme` block in your CSS entry point, and a `tailwind.config.js` is **not required**. So the color scale above is defined as CSS custom properties (see the token tables), and PrimeVue is themed separately via a preset.

Define the PrimeVue preset where you register the plugin (e.g. `resources/js/app.js` / your PrimeVue setup file) — not in a Tailwind config:

```js
import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';

const AppPreset = definePreset(Aura, {
  primitive: {
    primary: {
      50: '{zinc.50}',
      100: '{zinc.100}',
      200: '{zinc.200}',
      300: '{zinc.300}',
      400: '{zinc.400}',
      500: '{zinc.500}',
      600: '{zinc.600}',
      700: '{zinc.700}',
      800: '{zinc.800}',
      900: '{zinc.900}',
      950: '{zinc.950}',
    },
  },
  semantic: {
    primary: {
      50: 'var(--color-primary-50, {primary.50})',
      100: 'var(--color-primary-100, {primary.100})',
      200: 'var(--color-primary-200, {primary.200})',
      300: 'var(--color-primary-300, {primary.300})',
      400: 'var(--color-primary-400, {primary.400})',
      500: 'var(--color-primary-500, {primary.500})',
      600: 'var(--color-primary-600, {primary.600})',
      700: 'var(--color-primary-700, {primary.700})',
      800: 'var(--color-primary-800, {primary.800})',
      900: 'var(--color-primary-900, {primary.900})',
      950: 'var(--color-primary-950, {primary.950})',
    },
  },
});
```
