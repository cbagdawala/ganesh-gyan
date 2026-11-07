# Classic layout — app shell

The app frame for the **classic** layout: which layout component the router mounts,
where the shell components live, and how navigation changes across breakpoints.
Breakpoints, grids, tables and responsive PrimeVue components are shared by every
layout and stay in `../../design-system/responsive.md`.

## Layout component and routing

Authenticated pages are children of one layout route. Guest pages (login) sit
outside it. The full router example is in `../../rules/vue.md` ("Vue Router").

```typescript
{
  path: '/',
  component: () => import('@/layouts/MainLayout.vue'),
  meta: { requiresAuth: true },
  children: [ /* dashboard, users, … */ ],
}
```

Shell components live in `resources/js/components/layout/` (Sidebar, Header, Footer);
layouts in `resources/js/layouts/` (see `../../rules/architecture.md`).

## Navigation

### Mobile: Hamburger Menu

```html
<!-- Mobile -->
<div class="md:hidden">
  <Button icon="pi pi-bars" plain @click="mobileMenuOpen = true" />
  <Drawer v-model:visible="mobileMenuOpen" position="left" :style="{ width: '280px' }">
    <NavMenu />
  </Drawer>
</div>

<!-- Desktop -->
<div class="hidden md:flex">
  <NavMenu />
</div>
```

- Mobile: hamburger icon opens drawer.
- Desktop: horizontal navigation bar.

### Tablet: Collapsed Sidebar

```html
<div class="hidden lg:flex lg:w-64">
  <Sidebar />
</div>
<div class="hidden lg:block lg:w-64" v-if="sidebarCollapsed">
  <Sidebar :collapsed="true" />
</div>
```

- Tablet: full sidebar.
- Desktop: collapsible sidebar (icons only).


## How to recognise this layout

- `resources/js/layouts/MainLayout.vue` mounts authenticated routes.
- Shell components in `resources/js/components/layout/` (`Sidebar.vue`, `Header.vue`).
- PrimeVue preset built from `Aura` with the blue primary scale in `colors.md`.

Projects with no `gg13-layout:` declaration and no other layout's fingerprint are
treated as classic.
