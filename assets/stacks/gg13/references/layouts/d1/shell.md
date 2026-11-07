# D1 layout — app shell

The app frame for the **d1** layout: a dense, monochrome back-office shell. A fixed
220px sidebar on the left (64px when collapsed), a 48px sticky topbar, and a grey
page ground with white cards. Black (zinc-950) is the primary color. Color comes
only from the status palette (see `colors.md`).

This file covers the layout registry, the four layouts, `AppSidebar`, `AppTopbar`,
dark mode, global overlays and router conventions. The menu data model is in
`navigation.md`. Tokens are in `colors.md`, `typography.md` and `spacing.md`. Shared
components are in `components.md`. Breakpoints, grids and responsive PrimeVue
components are shared by every layout and stay in
`../../design-system/responsive.md`.

## File map

```
resources/
  css/app.css                      Tailwind 4 entry + every d1 token and global (colors/typography/spacing.md)
  views/app.blade.php              Blade shell: fonts, window.appConfig, @vite
  js/
    app.ts                         PrimeVue + AppPreset, Pinia, router, services, initDarkMode()
    App.vue                        Toast, ConfirmDialog, <component :is="layout">
    layouts/
      registry.ts                  resolveLayout / registerLayout
      DefaultLayout.vue            sidebar + topbar + content
      AuthLayout.vue               split screen: image left, 440px panel right
      PublicLayout.vue             full-bleed, page owns header/footer
      ErrorLayout.vue              centred, max 500px
    components/layout/
      AppSidebar.vue  AppTopbar.vue  GlobalSearch.vue  NotificationBell.vue
    composables/useDarkMode.ts
    menu/                          types.ts, coreMenu.ts, registry.ts, useAppMenu.ts (navigation.md)
    router/index.ts  router/guards.ts
    stores/auth.ts                 Sanctum session user (../../rules/vue.md, ADR-002)
```

## Layout registry (`meta.layout`)

Routes are **flat**. They are not children of a layout route. Each route names its
frame with a string key in `meta.layout`. `App.vue` looks the key up in a registry
and wraps `<RouterView />` in that component.

```typescript
// resources/js/layouts/registry.ts
import type { Component } from 'vue'
import DefaultLayout from './DefaultLayout.vue'
import AuthLayout from './AuthLayout.vue'
import ErrorLayout from './ErrorLayout.vue'
import PublicLayout from './PublicLayout.vue'

export type LayoutKey = 'default' | 'auth' | 'error' | 'public' | (string & {})

const layouts: Record<string, Component> = {
  default: DefaultLayout,
  auth: AuthLayout,
  error: ErrorLayout,
  public: PublicLayout,
}

/** Optional extension point: a print view, a kiosk shell. Call before app.mount(). */
export function registerLayout(name: string, component: Component): void {
  if (layouts[name]) {
    const message = `[layouts] "${name}" is already registered.`
    if (import.meta.env.DEV) throw new Error(message)
    console.error(message)
    return
  }
  layouts[name] = component
}

/** Unknown or missing keys fall back to the default layout. They never render nothing. */
export function resolveLayout(name?: string): Component {
  return layouts[name ?? 'default'] ?? DefaultLayout
}
```

```vue
<!-- resources/js/App.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { resolveLayout } from '@/layouts/registry'

const route = useRoute()

// Before the first navigation resolves, route.matched is empty (START_LOCATION).
// Render a bare <div> then, NOT DefaultLayout. Otherwise the shell mounts for one
// tick on guest/public pages and fires its authenticated calls (notification
// count, search), and a 401 from them bounces a guest to /login.
const layout = computed(() =>
  route.matched.length ? resolveLayout(route.meta.layout) : 'div',
)
</script>

<template>
  <Toast position="top-right" />
  <ConfirmDialog />
  <component :is="layout">
    <RouterView />
  </component>
</template>
```

Rules:

- Every route sets `meta.layout`. The keys are `'default'` (authenticated app),
  `'auth'` (login, forgot/reset password), `'public'` (signed-link customer pages) and
  `'error'` (403/404).
- `Toast` and `ConfirmDialog` are mounted **once**, in `App.vue`, outside the layout
  component. A layout switch (login → dashboard) must not unmount them. Pages never
  mount their own `Toast`/`ConfirmDialog`. They call `useToast()` / `useConfirm()`.
- Do not use a nested layout route (`{ path: '/', component: MainLayout, children }`)
  in this layout. That is the classic layout's pattern.

## Boot (`app.ts`)

```typescript
// resources/js/app.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import Ripple from 'primevue/ripple'
import 'primeicons/primeicons.css'
import App from './App.vue'
import router from './router'
import { AppPreset } from './theme/appPreset'        // colors.md
import { initDarkMode } from './composables/useDarkMode'

initDarkMode() // apply .dark-mode to <html> BEFORE mount, on every layout (auth pages included)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: AppPreset,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark-mode',
      cssLayer: { name: 'primevue', order: 'theme, base, primevue, components, utilities' },
    },
  },
  ripple: true,
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)
app.directive('ripple', Ripple)
app.mount('#app')
```

The auth store is **not** hydrated here. The first navigation guard awaits it (see
"Router conventions"). Until that navigation resolves, `App.vue` renders the bare
`<div>`.

## Layouts

### `DefaultLayout` — the authenticated app

```
┌──────────┬───────────────────────────────────────────────┐
│ App      │ ☰  ⌂ › Orders          [ Search…    ]  ☾ 🔔 (AB)│  48px sticky topbar
│          ├───────────────────────────────────────────────┤
│ Dashboard│                                               │
│ Sales  ▾ │   <slot />  (padding var(--layout-content-     │
│   Orders │              padding), ground --p-surface-    │
│   Invo.. │              ground)                          │
│ Catalog ▸│                                               │
│          │                                               │
│  v1.4.0  │                                               │
└──────────┴───────────────────────────────────────────────┘
 220px fixed (64px collapsed; off-canvas < 992px)
```

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed'   // UI preference: localStorage is fine
const DRAWER_BREAKPOINT = 992

const sidebarCollapsed = ref(readCollapsed())
const mobileSidebarOpen = ref(false)

function readCollapsed(): boolean {
  try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true' } catch { return false }
}
watch(sidebarCollapsed, (v) => {
  try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(v)) } catch { /* private mode */ }
})

// One button, two behaviours: drawer below 992px, collapse above.
function toggleSidebar(): void {
  if (window.innerWidth < DRAWER_BREAKPOINT) mobileSidebarOpen.value = !mobileSidebarOpen.value
  else sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="layout-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <AppSidebar v-model:collapsed="sidebarCollapsed" v-model:mobileOpen="mobileSidebarOpen" />
    <div class="layout-main">
      <AppTopbar @toggle-sidebar="toggleSidebar" />
      <main class="layout-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-wrapper { display: flex; min-height: 100vh; background: var(--p-surface-ground); }
.layout-main {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  margin-left: 220px;                               /* = sidebar width */
  transition: margin-left var(--transition-slow);
}
.sidebar-collapsed .layout-main { margin-left: 64px; }
.layout-content { flex: 1; padding: var(--layout-content-padding); background: var(--p-surface-ground); }
@media (max-width: 991px) {
  .layout-main, .sidebar-collapsed .layout-main { margin-left: 0; }
}
</style>
```

- The content column has **no max-width**. Lists and tables use the full width.
  Narrow pages (forms, settings) cap themselves.
- Full-height list pages size themselves to the viewport with
  `calc(100vh - var(--layout-topbar-height) - 2 * var(--layout-content-padding))`.
  This is why the topbar height and the content padding are tokens (see `spacing.md`).

### `AuthLayout` — split screen

Background image on the left, a 440px full-height panel on the right. The form is
capped at 340px inside the panel. Below 768px the image becomes a 180px band on top
and the panel takes the full width.

```vue
<template>
  <div class="auth-layout">
    <div class="auth-bg" aria-hidden="true"></div>
    <div class="auth-panel">
      <div class="auth-panel-inner">
        <div class="auth-brand">
          <h1 class="brand-name">{{ appName }}</h1>
          <p class="brand-tagline">{{ tagline }}</p>
        </div>
        <div class="auth-content"><slot /></div>
        <div class="auth-footer"><p>&copy; {{ year }} {{ appName }}. All rights reserved.</p></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout { display: flex; min-height: 100vh; }
.auth-bg {
  flex: 1;
  background: #1a1a1a url('/images/login-bg.webp') center / cover no-repeat;
}
.auth-panel {
  width: 440px; min-height: 100vh; padding: 2rem;
  display: flex; align-items: center; justify-content: center;
  background: var(--p-content-background);
  border-left: 1px solid var(--p-content-border-color);
}
.auth-panel-inner { width: 100%; max-width: 340px; }
.auth-brand { margin-bottom: 2.5rem; }
.brand-name { margin: 0; font-size: 1.75rem; font-weight: 600; letter-spacing: -0.03em; color: var(--p-text-color); }
.brand-tagline { margin: 0.25rem 0 0; font-size: var(--text-sm); color: var(--p-text-muted-color); }
.auth-content { margin-bottom: 2rem; }
.auth-footer { padding-top: 1.5rem; border-top: 1px solid var(--p-content-border-color); }
.auth-footer p { margin: 0; font-size: var(--text-xs); color: var(--p-text-muted-color); }
@media (max-width: 768px) {
  .auth-layout { flex-direction: column; }
  .auth-bg { flex: none; height: 180px; }
  .auth-panel { width: 100%; min-height: auto; flex: 1; border-left: none; border-top: 1px solid var(--p-content-border-color); }
}
</style>
```

The login form itself (fields, Sanctum CSRF + session login) follows
`../../blueprints/login.md`. Only the frame differs. The brand name is an `h1`, so the
form card does not repeat a page title.

### `PublicLayout` — full-bleed customer pages

For signed-link pages a customer opens without logging in (pay an invoice, view a
quote). The layout adds only a full-height column on the ground color. The page
brings its own header, footer and width.

```css
.public-layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--p-surface-ground); }
```

Never mount `AppSidebar`/`AppTopbar` or call authenticated APIs from a public page.

### `ErrorLayout` — 403 / 404

```css
.error-layout { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; background: var(--p-surface-ground); }
.error-container { text-align: center; max-width: 500px; }
```

The error pages use it: `forbidden` (`/forbidden`) and `not-found` (the catch-all).

## `AppSidebar`

| | |
|---|---|
| Props | `collapsed: boolean`, `mobileOpen: boolean` |
| Emits | `update:collapsed`, `update:mobileOpen` (used with `v-model:collapsed` / `v-model:mobileOpen`) |
| Data | `useAppMenu().menuItems`: the permission-filtered tree (`navigation.md`) |
| Width | 220px; 64px collapsed (icons only, labels and chevrons hidden) |
| Position | `fixed`, full height, `z-index: 200`, background `--p-content-background`, **no border** (the white column against the grey ground is the separation) |
| < 992px | Off-canvas: `translateX(-100%)`. `mobileOpen` slides it in at full 220px over a blurred overlay (`z-index: 199`). Clicking the overlay or navigating closes it. |

Structure, top to bottom:

1. **Brand.** The app name as text (`appConfig.name`), 1.125rem/600, letter-spacing
   −0.03em, in a row `--layout-topbar-height` tall so it lines up with the topbar.
   No logo tile. Hidden when collapsed.
2. **Nav** (`flex: 1; overflow-y: auto; padding: .5rem .625rem`). Two levels only:
   - a **leaf** (`role="link"`): icon + label, navigates on click/Enter/Space;
   - a **group** (`role="button"`, `aria-expanded`): icon + label + chevron
     (`pi-chevron-right` / `pi-chevron-down`, 40% opacity). It toggles its child list.
     When collapsed, groups do not expand.
   - **Section headings** inside a group: printed above the first child of each run
     of children that share `section`. They are 10.5px uppercase, letter-spacing
     .06em, muted, `role="presentation"`.
3. **Footer.** `v{{ version }}` centred, `--text-xs`, muted. Hidden when collapsed.

Active state: an entry is active when `route.name === item.route.name`. A group is
active when any child is. The active entry is a **grey pill**
(`--p-content-hover-background`, text `--p-text-color`, weight 500). Hover uses the
same pill. There is **no coloured bar, no primary-tinted background and no left
border**. The group that contains the active route expands by itself (see
`navigation.md`).

Key template and CSS:

```vue
<li
  v-if="!item.items"
  class="menu-item"
  :class="{ active: isActive(item) }"
  role="link"
  tabindex="0"
  :aria-label="collapsed ? item.label : undefined"
  :aria-current="isActive(item) ? 'page' : undefined"
  @click="navigateTo(item)"
  @keydown.enter="onEntryKey($event, () => navigateTo(item))"
  @keydown.space="onEntryKey($event, () => navigateTo(item))"
  v-ripple
>
  <i v-if="item.icon" :class="item.icon" aria-hidden="true"></i>
  <span v-if="!collapsed" class="menu-label">{{ item.label }}</span>
</li>

<!-- inside an expanded group -->
<template v-for="(child, ci) in item.items" :key="child.key">
  <li
    v-if="child.section && child.section !== item.items[ci - 1]?.section"
    class="submenu-heading"
    role="presentation"
  >{{ child.section }}</li>
  <li class="menu-item submenu-item" ...>…</li>
</template>
```

```typescript
/** Enter / Space on a focusable <li>/<div> acts like a click. */
function onEntryKey(e: KeyboardEvent, run: () => void): void {
  if (e.target !== e.currentTarget) return
  e.preventDefault()
  run()
}

function navigateTo(item: MenuItem): void {
  if (!item.route) return
  router.push(item.route)
  emit('update:mobileOpen', false)
}
```

```css
.app-sidebar {
  position: fixed; top: 0; left: 0; height: 100vh; width: 220px;
  display: flex; flex-direction: column; overflow: hidden; z-index: 200;
  background: var(--p-content-background);
  transition: width var(--transition-slow);
}
.app-sidebar.sidebar-collapsed { width: 64px; }
.sidebar-overlay { position: fixed; inset: 0; z-index: 199; background: rgb(0 0 0 / 0.3); backdrop-filter: blur(4px); }

.menu-item {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.4rem 0.75rem; margin-bottom: 1px;
  border-radius: var(--radius-md);
  color: var(--p-text-muted-color); font-size: var(--text-sm);
  cursor: pointer; white-space: nowrap;
  transition: all var(--transition-fast);
}
.menu-item:hover,
.menu-item.active { background: var(--p-content-hover-background); color: var(--p-text-color); }
.menu-item.active { font-weight: 500; }
.menu-item i { width: 20px; flex-shrink: 0; text-align: center; font-size: 0.957rem; color: var(--p-text-muted-color); }
.menu-item:hover i, .menu-item.active i { color: var(--p-text-color); }
.menu-item:focus { outline: none; }
.menu-item:focus-visible { outline: 2px solid var(--p-primary-color); outline-offset: -2px; }
.menu-label { font-size: var(--text-base); font-weight: var(--fw-medium); }
.submenu-item { padding-left: 2.5rem; }
.submenu-heading {
  padding: 0.6rem 0.75rem 0.2rem 2.5rem;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--p-text-muted-color); opacity: 0.8;
}
.sidebar-footer { padding: 0.75rem 1rem; text-align: center; }
.version-text { font-size: var(--text-xs); color: var(--p-text-muted-color); }

@media (max-width: 991px) {
  .app-sidebar { transform: translateX(-100%); }
  .app-sidebar.mobile-open { transform: translateX(0); width: 220px; }
}
```

Labels fade with `<transition name="fade">`. The submenu opens with a `slide-down`
transition (opacity + `max-height`).

## `AppTopbar`

| | |
|---|---|
| Emits | `toggleSidebar` (the layout decides drawer vs collapse) |
| Height | exactly `--layout-topbar-height` (48px), `position: sticky; top: 0; z-index: 100` |
| Background | solid `--p-content-background`. A transparent sticky bar lets scrolled content show through. |
| Bottom edge | `box-shadow: inset 0 -1px 0 var(--p-content-border-color)`. Do **not** use `border-bottom`: it would make the bar 49px and break every viewport-height calc. |

Three zones in one flex row (`justify-content: space-between; gap: 1rem; padding: 0 var(--layout-content-padding)`):

| Zone | Content |
|---|---|
| Left | `Button icon="pi pi-bars" severity="secondary" text rounded aria-label="Toggle sidebar"`, then a PrimeVue `Breadcrumb` (≥ 768px only) |
| Centre | `GlobalSearch`, `flex: 1; max-width: 480px; margin: 0 auto` (≥ 768px only) |
| Right | mobile search button (< 768px only), dark-mode toggle (`pi-moon`/`pi-sun`, tooltip "Dark Mode"/"Light Mode"), `NotificationBell`, avatar button → popup `Menu` |

### Breadcrumb from `route.matched`

```typescript
const breadcrumbHome = { icon: 'pi pi-home', route: { name: 'dashboard' } }

// Every matched record with a meta.title becomes a crumb; the last one is the
// current page (not a link). Records without a title (path-only parents) are skipped.
const breadcrumbItems = computed<MenuItem[]>(() => {
  const titled = route.matched.filter((r) => r.meta.title)
  return titled.map((r, i) => ({
    label: r.meta.title,
    route: i < titled.length - 1 ? { name: r.name } : undefined,
  }))
})
```

```vue
<Breadcrumb :home="breadcrumbHome" :model="breadcrumbItems" class="topbar-breadcrumb hidden md:flex">
  <template #item="{ item }">
    <RouterLink v-if="item.route" :to="item.route" class="crumb-link">
      <span v-if="item.icon" :class="item.icon" />
      <span v-if="item.label">{{ item.label }}</span>
    </RouterLink>
    <span v-else class="crumb-current">{{ item.label }}</span>
  </template>
</Breadcrumb>
```

Flat routes give "⌂ › Orders". For a deeper trail ("⌂ › Orders › SO-1042"), nest the
detail route under a titled path-only parent, or set `meta.title` dynamically from the
page. The breadcrumb is transparent, has no padding and no border. Its text is
`--text-sm` in `--p-text-secondary-color`, and the separators are `--p-surface-300`.

### Global search

`GlobalSearch.vue` (props `shortcut = true`, `autofocus = false`, `placeholder`; emits
`navigated`):

- An `IconField` + `InputText` with a search icon, full width, on
  `--p-content-background` with a `--p-surface-200` border. The border turns
  `--p-primary-color` on focus.
- Searches only after ≥ 2 characters, debounced 250ms. A newer query aborts the older
  request (`AbortController`). Results come from `GET /api/v1/search` and are grouped.
- A result whose `route.name` the router does not know (`router.hasRoute`) is
  dropped, never dead-linked. The server already filters by the user's permissions.
- Keyboard: ↑/↓ move and wrap, Enter opens the active result (or the first one), Esc
  closes and then clears. Ctrl+K / Cmd+K focuses the box from anywhere. Only the
  desktop instance listens for the shortcut (`shortcut` prop).
- ARIA: `role="combobox"` on the input, `aria-activedescendant`, `role="listbox"`
  results.

Below 768px the centre zone is hidden. A search icon button on the right toggles a
**mobile search bar** that slides down under the topbar (`padding: .75rem 1.25rem`,
top border `--p-surface-200`). It contains
`<GlobalSearch :shortcut="false" autofocus @navigated="showMobileSearch = false" />`
and a close button.

### Notification bell

`NotificationBell.vue`: a `text rounded` icon button with a PrimeVue `Badge`. The
badge shows 1–99, then "99+", and is hidden at 0. It polls the unread count every 60s
(skipped while `document.hidden`, refreshed on `visibilitychange`). No websockets.
Opening the dropdown loads the latest 20. Clicking an item marks it read
(optimistically) and opens its route if `router.hasRoute` knows it. "Mark all read"
clears the badge. Esc or an outside click closes it.

### Avatar menu

```vue
<Button severity="secondary" text rounded class="user-button" aria-label="User menu" aria-haspopup="true" @click="userMenu.toggle($event)">
  <Avatar :label="initials" shape="circle" class="user-avatar" />
</Button>
<Menu ref="userMenu" :model="userMenuItems" popup class="user-menu-popup" />
```

```typescript
const userMenuItems = computed<MenuItem[]>(() => [
  { label: auth.user?.name ?? 'User', class: 'user-menu-header', disabled: true },
  { label: auth.user?.email ?? '', class: 'user-menu-email', disabled: true },
  { separator: true },
  { label: 'My profile', icon: 'pi pi-user', command: () => router.push({ name: 'profile' }) },
  { separator: true },
  {
    label: 'Sign out', icon: 'pi pi-sign-out', class: 'text-danger',
    command: async () => { await auth.logout(); router.push({ name: 'login' }) },   // Sanctum: POST /logout ends the session
  },
])
```

```css
.user-avatar { width: 30px; height: 30px; font-size: var(--text-xs); font-weight: var(--fw-semibold);
  background: var(--p-primary-color); color: var(--p-primary-contrast-color); }   /* black disc, white initials */
:deep(.user-menu-popup) { min-width: 220px; border-radius: var(--radius-lg); }
:deep(.user-menu-popup .user-menu-header .p-menuitem-link) { font-weight: var(--fw-semibold); color: var(--p-text-color); }
:deep(.user-menu-popup .user-menu-email .p-menuitem-link) { font-size: var(--text-xs); color: var(--p-text-secondary-color); padding-top: 0; }
:deep(.user-menu-popup .text-danger .p-menuitem-link) { color: var(--p-red-500); }
```

The initials are the first letters of the first two words of the name, upper-cased.

## Dark mode

There is one switch. The class `.dark-mode` goes on `<html>`. PrimeVue keys off it
through `darkModeSelector: '.dark-mode'`, `app.css` overrides tokens under
`.dark-mode`, and Tailwind's `dark:` variant points at the same class:

```css
/* resources/css/app.css */
@custom-variant dark (&:where(.dark-mode, .dark-mode *));
.dark-mode { color-scheme: dark; }
```

```typescript
// resources/js/composables/useDarkMode.ts
import { ref, watch } from 'vue'

const DARK_MODE_KEY = 'dark_mode'               // UI preference: localStorage is fine
const isDarkMode = ref(false)                   // module scope: one state for the whole app
let initialised = false

function stored(): string | null {
  try { return localStorage.getItem(DARK_MODE_KEY) } catch { return null }
}
function apply(dark: boolean): void {
  document.documentElement.classList.toggle('dark-mode', dark)
}

/** Call once from app.ts before mount. Follows the OS until the user picks. */
export function initDarkMode(): void {
  if (initialised) return
  initialised = true
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const saved = stored()
  isDarkMode.value = saved !== null ? saved === 'true' : media.matches
  apply(isDarkMode.value)
  media.addEventListener('change', (e) => {
    if (stored() === null) { isDarkMode.value = e.matches; apply(e.matches) }
  })
}

export function useDarkMode() {
  /** An explicit user choice: persisted, and stops following the OS. */
  function setDarkMode(value: boolean): void {
    isDarkMode.value = value
    try { localStorage.setItem(DARK_MODE_KEY, String(value)) } catch { /* ignore */ }
    apply(value)
  }
  const toggleDarkMode = () => setDarkMode(!isDarkMode.value)
  return { isDarkMode, setDarkMode, toggleDarkMode }
}
```

- Only an explicit toggle writes `localStorage`. Until then the app follows
  `prefers-color-scheme`, including live OS changes.
- To avoid a light flash on reload, the Blade shell can set the class before any CSS
  paints: an inline `<script>` in `<head>` that reads `localStorage.dark_mode`
  (falling back to `matchMedia`) and calls
  `document.documentElement.classList.add('dark-mode')`.
- Components never test `isDarkMode` to pick colors. They read `--p-*` and
  `--status-*` variables, which flip by themselves (`colors.md`).

## Router conventions

```typescript
// resources/js/router/meta.d.ts
import 'vue-router'
declare module 'vue-router' {
  interface RouteMeta {
    title?: string                 // document.title + breadcrumb
    layout?: 'default' | 'auth' | 'error' | 'public' | (string & {})
    requiresAuth?: boolean
    guest?: boolean                // login / forgot password: signed-in users are sent away
    permission?: string            // same slug as the menu entry (navigation.md)
    anyPermission?: string[]
  }
}
```

```typescript
// resources/js/router/index.ts (excerpt)
const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: 'Login', layout: 'auth', guest: true } },
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'Dashboard', layout: 'default', requiresAuth: true } },

  // <resource>.index | .create | .show | .edit — flat, one record each
  { path: '/orders', name: 'orders.index', component: () => import('@/views/orders/OrdersListView.vue'),
    meta: { title: 'Orders', layout: 'default', requiresAuth: true, permission: 'order:view' } },
  { path: '/orders/create', name: 'orders.create', component: () => import('@/views/orders/OrderFormView.vue'),
    meta: { title: 'New Order', layout: 'default', requiresAuth: true, permission: 'order:create' } },
  { path: '/orders/:id', name: 'orders.show', component: () => import('@/views/orders/OrderShowView.vue'),
    meta: { title: 'Order', layout: 'default', requiresAuth: true, permission: 'order:view' } },
  { path: '/orders/:id/edit', name: 'orders.edit', component: () => import('@/views/orders/OrderFormView.vue'),
    meta: { title: 'Edit Order', layout: 'default', requiresAuth: true, permission: 'order:update' } },

  { path: '/forbidden', name: 'forbidden', component: () => import('@/views/errors/ForbiddenView.vue'),
    meta: { title: 'Forbidden', layout: 'error' } },
]

const appName = window.appConfig?.name ?? 'App'

// The catch-all is kept in its own array and appended LAST: vue-router matches in
// registration order, so anything after /:pathMatch(.*)* would be unreachable.
const errorRoutes: RouteRecordRaw[] = [
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/errors/NotFoundView.vue'),
    meta: { title: 'Not Found', layout: 'error' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [...routes, ...errorRoutes],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    // Deep link to a form section: /orders/12/edit#section-terms. The form loads
    // async, so wait for the element, scroll to it and highlight it.
    if (/^#section-[\w-]+$/.test(to.hash)) void scrollToSectionHash(to.hash)
    return { top: 0 }
  },
})

router.beforeEach(authGuard)                    // guards.ts
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | ${appName}` : appName
})
```

```typescript
// resources/js/router/guards.ts — return-value guards (no `next` callback)
import type { RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export async function authGuard(to: RouteLocationNormalized) {
  const auth = useAuthStore()
  // Hydrate once per page load from the Sanctum session cookie (GET /api/user).
  // 401 → user stays null. Nothing about the session lives in localStorage.
  if (!auth.hydrated) await auth.fetchUser()

  if (to.meta.guest && auth.isAuthenticated) return { name: 'dashboard' }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.permission && !auth.hasPermission(to.meta.permission)) return { name: 'forbidden' }
  if (to.meta.anyPermission && !auth.hasAnyPermission(to.meta.anyPermission)) return { name: 'forbidden' }
  return true
}
```

`scrollToSectionHash(hash)` polls for `document.getElementById(hash.slice(1))` every
100ms for up to 5s. When it finds the element it calls
`scrollIntoView({ behavior: 'smooth', block: 'start' })` and adds `is-highlight` for
1.8s. Form section cards render `id="section-<key>"`.

Rules:

- Names are `<resource>.index | .create | .show | .edit` (kebab-case resource:
  `purchase-orders.index`). Menu entries, search results and notifications link
  **by name**, never by path.
- Every route has `meta.title` and `meta.layout`. `document.title` is
  `"<title> | <app name>"`.
- A route's `meta.permission` uses the **same slug** as its menu entry, so a user who
  sees an entry can always open it (`navigation.md`).
- The auth store exposes `user`, `hydrated`, `isAuthenticated` (= `!!user`),
  `hasPermission`, `hasAnyPermission`, `fetchUser`, `login` and `logout`. Permissions
  come with the `/api/user` payload. The 401 interceptor in the API client must not
  redirect while `fetchUser` is hydrating. A guest on `/login` is expected to get a 401.
- The Laravel SPA catch-all (`Route::view('/{any?}', 'app')…`) is in
  `../../rules/vue.md`.

## Blade shell

```blade
{{-- resources/views/app.blade.php --}}
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name') }}</title>
    {{-- fonts: typography.md --}}
    <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|jetbrains-mono:400,500,600,700&display=swap" rel="stylesheet" />
    <script>
        window.appConfig = @json(['name' => config('app.name'), 'version' => config('app.version')]);
    </script>
    @vite(['resources/css/app.css', 'resources/js/app.ts'])
</head>
<body class="antialiased">
    <div id="app"></div>
</body>
</html>
```

`useAppConfig()` reads `window.appConfig` (declare it in `env.d.ts`). It supplies the
sidebar brand, the version footer and the `document.title` suffix.

## How to recognise this layout

Any two of these mean d1:

- `resources/js/layouts/registry.ts` or `resources/js/extensions/layouts.ts`, or any
  `resolveLayout()` registry, with `App.vue` rendering
  `<component :is="layout">` from `route.meta.layout` string keys
  (`'default' | 'auth' | 'error' | 'public'`), and flat routes with no layout parent route.
- `resources/js/components/layout/AppSidebar.vue` and `AppTopbar.vue`, plus
  `layouts/DefaultLayout.vue` / `AuthLayout.vue`.
- A PrimeVue preset built with `definePreset(Aura, …)` whose `primary` maps to
  `{zinc.*}` (the Noir pattern), with light `primary.color: '{zinc.950}'`.
- `darkModeSelector: '.dark-mode'` and a `.dark-mode` class on `<html>`.
- `--status-<tone>-bg/-fg` variables, `--layout-topbar-height`, and
  `html { font-size: 87.5% }`.

`MainLayout.vue` with a nested layout route and a blue primary is the classic layout,
not d1.
