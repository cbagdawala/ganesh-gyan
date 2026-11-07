# D1 layout — navigation

The d1 sidebar menu is **data**. The core menu is a typed tree in
`resources/js/menu/coreMenu.ts`. Optional contributions are merged into it by
`mergeMenu`. `buildMenu` filters the tree for the current user and router. The
sidebar (`shell.md` → `AppSidebar`) only renders what `useAppMenu()` returns. Nothing
in `AppSidebar.vue` checks a permission.

```
coreMenu ──┐
           ├─ mergeMenu() ── once, at module scope (build-time data only)
contribs ──┘        │
                    ▼
               buildMenu(tree, auth, hasRoute) ── per render, inside a computed
                    │
                    ▼
            useAppMenu().menuItems ──► AppSidebar
```

## Types

```typescript
// resources/js/menu/types.ts
export interface MenuItem {
  /** Unique across the whole tree. Contributed keys are namespaced `<source>:<key>`. */
  key: string
  label: string
  /** PrimeIcons class string, e.g. 'pi pi-box'. */
  icon?: string
  /** Always a NAMED route. Active state compares names (see "Active state"). */
  route?: { name: string }

  // Gating: every condition present must pass (AND).
  /** Requires this exact permission. Same slug as the route's meta.permission. */
  permission?: string
  /** Requires at least one of these permissions. */
  anyPermission?: string[]
  /** Requires a signed-in user but no particular permission. */
  requiresAuth?: boolean

  /** Sort weight within its level. Groups step by 100, children by 10. */
  order?: number

  /**
   * Sub-heading inside a group. The sidebar prints it above the first visible
   * child of each run of children sharing a section, so a pruned child never
   * leaves an orphan heading. The tree stays two levels deep.
   */
  section?: string

  /** Children make this a group. Groups carry no gate of their own. */
  items?: MenuItem[]
}

/** One entry added from outside coreMenu.ts (a feature module, a plugin). */
export interface MenuContribution {
  /** Inject into an existing core group by key. Omit to add a top-level node. */
  targetGroup?: string
  order?: number
  item: MenuItem
}

/**
 * The subset of the auth store the filter needs. It is declared structurally,
 * not imported, so buildMenu() can be unit-tested against plain fixtures.
 */
export interface MenuAuthGate {
  isAuthenticated: boolean
  hasPermission(permission: string): boolean
  hasAnyPermission(permissions: string[]): boolean
}
```

## Authoring the core menu

```typescript
// resources/js/menu/coreMenu.ts
import type { MenuItem } from './types'

/**
 * Ordering: top-level nodes step by 100, children by 10. That leaves room for a
 * contribution to slot in between (e.g. order 15) without renumbering.
 */
export const coreMenu: MenuItem[] = [
  // Leaf with no permission: every signed-in user sees it.
  { key: 'dashboard', label: 'Dashboard', icon: 'pi pi-th-large', route: { name: 'dashboard' }, order: 100 },

  {
    key: 'sales', label: 'Sales', icon: 'pi pi-chart-line', order: 200,
    items: [
      { key: 'quotes',   label: 'Quotes',   icon: 'pi pi-file',         route: { name: 'quotes.index' },   permission: 'quote:view',   order: 10 },
      { key: 'orders',   label: 'Orders',   icon: 'pi pi-shopping-bag', route: { name: 'orders.index' },   permission: 'order:view',   order: 20 },
      { key: 'invoices', label: 'Invoices', icon: 'pi pi-receipt',      route: { name: 'invoices.index' }, permission: 'invoice:view', order: 30 },
    ],
  },

  {
    key: 'catalog', label: 'Catalog', icon: 'pi pi-box', order: 300,
    items: [
      // One permission may gate several entries. Order is authored, not derived from it.
      { key: 'products',   label: 'Products',   icon: 'pi pi-box',  route: { name: 'products.index' },   permission: 'product:view', order: 10 },
      { key: 'categories', label: 'Categories', icon: 'pi pi-sitemap', route: { name: 'categories.index' }, permission: 'product:view', order: 20 },
    ],
  },

  {
    key: 'customers', label: 'Customers', icon: 'pi pi-users', route: { name: 'customers.index' },
    permission: 'customer:view', order: 400,
  },

  {
    key: 'settings', label: 'Settings', icon: 'pi pi-cog', order: 900,
    items: [
      // `section` prints "ACCESS" / "SYSTEM" headings inside the group.
      { key: 'users',   label: 'Users',   icon: 'pi pi-user',   route: { name: 'users.index' },   permission: 'user:view', section: 'Access', order: 10 },
      { key: 'roles',   label: 'Roles',   icon: 'pi pi-shield', route: { name: 'roles.index' },   permission: 'role:view', section: 'Access', order: 20 },
      { key: 'general', label: 'General', icon: 'pi pi-sliders-h', route: { name: 'settings.general' }, permission: 'settings:manage', section: 'System', order: 30 },
      { key: 'activity', label: 'Activity log', icon: 'pi pi-history', route: { name: 'activity.index' },
        anyPermission: ['activity:view', 'settings:manage'], section: 'System', order: 40 },
    ],
  },
]
```

Rules:

- **Two levels, no more.** A group's children are leaves. The sidebar does not render
  a third level, and `mergeMenu` rejects one.
- **Groups have no permission.** A group appears if and only if at least one child
  survives the gate. Do not put `permission` on a group "to be safe". It would hide the
  group from a user who can see one child.
- Leaves link by **route name** (`{ name: 'orders.index' }`), never by path.
- Keep `key`s unique across the whole tree. Keys are Vue `:key`s and the expand-state
  map keys.
- Use `section` for headings inside a long group. Do not nest groups and do not add
  separator items.

## `buildMenu` — gate, prune, sort

```typescript
// resources/js/menu/registry.ts
import type { MenuAuthGate, MenuItem } from './types'

const byOrder = (a: MenuItem, b: MenuItem) => (a.order ?? 0) - (b.order ?? 0)  // stable: ties keep authored order

/**
 * `hasRoute` hides an entry whose route name is not registered. A menu may be
 * authored ahead of the feature that adds the route, and a link to an unknown
 * name throws at render. useAppMenu passes router.hasRoute; the default keeps
 * pure-tree unit tests independent of the router.
 */
export function buildMenu(
  tree: MenuItem[],
  auth: MenuAuthGate,
  hasRoute: (name: string) => boolean = () => true,
): MenuItem[] {
  const visible = (item: MenuItem): boolean =>
    (!item.route || hasRoute(item.route.name)) &&
    (!item.requiresAuth || auth.isAuthenticated) &&
    (!item.permission || auth.hasPermission(item.permission)) &&
    (!item.anyPermission || auth.hasAnyPermission(item.anyPermission))

  return [...tree].sort(byOrder).flatMap((node) => {
    if (!visible(node)) return []
    if (!node.items) return [node]                        // leaf
    const items = node.items.filter(visible).sort(byOrder)
    return items.length ? [{ ...node, items }] : []       // prune empty groups
  })
}
```

`buildMenu` is pure: no Vue, no store, no router import. It never mutates its input.

## `mergeMenu` — contributions

Use this when a feature module (or a package) adds entries without editing
`coreMenu.ts`. It is optional. A project with one menu file can skip it.

```typescript
export const CONTRIB_DEFAULT_ORDER = 10_000   // after core unless an order is given

function reject(message: string): void {
  if (import.meta.env.DEV) throw new Error(message)   // loud in dev
  console.error(message)                              // degrade, never white-screen, in prod
}

export function mergeMenu(
  core: MenuItem[],
  contributions: { source: string; contribution: MenuContribution }[],
): MenuItem[] {
  const tree = core.map((n) => ({ ...n, items: n.items ? [...n.items] : undefined }))
  const groups = new Map(tree.filter((n) => n.items).map((n) => [n.key, n]))
  const seen = new Set(collectKeys(tree))

  for (const { source, contribution } of contributions) {
    const item = namespace(contribution.item, source)             // key → `${source}:${key}`, recursively
    item.order = contribution.order ?? contribution.item.order ?? CONTRIB_DEFAULT_ORDER

    if (item.items?.some((c) => c.items?.length)) { reject(`[menu] ${source}: three-level menus are not supported`); continue }
    if (seen.has(item.key)) { reject(`[menu] ${source}: duplicate key "${item.key}"`); continue }

    if (contribution.targetGroup) {
      const group = groups.get(contribution.targetGroup)
      if (!group?.items) { reject(`[menu] ${source}: unknown target group "${contribution.targetGroup}"`); continue }
      group.items.push(item)
    } else {
      tree.push(item)
      if (item.items) groups.set(item.key, item)
    }
    collectKeys([item]).forEach((k) => seen.add(k))
  }
  return tree
}
```

**Merge first, filter second.** Merging runs against the *unfiltered* core tree, so
"unknown target group" can only mean a real typo. If you merged after permission
filtering, a contribution aimed at a group the current user cannot see would be
dropped as a typo. The menu would then work for an admin and silently lose entries for
everyone else.

## `useAppMenu`

```typescript
// resources/js/menu/useAppMenu.ts
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { coreMenu } from './coreMenu'
import { buildMenu, mergeMenu } from './registry'
import { menuContributions } from './contributions'   // [] if unused

// Merged ONCE: it depends only on code, never on the user.
const mergedMenu = mergeMenu(coreMenu, menuContributions)

export function useAppMenu() {
  const auth = useAuthStore()
  const router = useRouter()
  // No router installed (bare component mount in a test): hide nothing on that account.
  const hasRoute = (name: string) => (router ? router.hasRoute(name) : true)

  const menuItems = computed(() =>
    buildMenu(
      mergedMenu,
      {
        isAuthenticated: auth.isAuthenticated,
        hasPermission: (p) => auth.hasPermission(p),
        hasAnyPermission: (ps) => auth.hasAnyPermission(ps),
      },
      hasRoute,
    ),
  )
  return { menuItems }
}
```

The computed re-runs when the auth store's user or permissions change, so the sidebar
updates after login, logout or a refreshed `/api/user`, with no reload.

## Active state and auto-expand

```typescript
// AppSidebar.vue
const expandedKeys = ref<Record<string, boolean>>({})

/** Active = same route NAME. A group is active when any child is. */
function isActive(item: MenuItem): boolean {
  if (item.route) return route.name === item.route.name
  return item.items?.some(isActive) ?? false
}

// Watch the menu as well as the route. After a hard reload the route resolves
// before the user (and therefore the group) exists. Expansion is additive: it
// never collapses a group the user opened.
watch([() => route.name, menuItems], () => {
  for (const node of menuItems.value) {
    if (node.items?.some(isActive)) expandedKeys.value[node.key] = true
  }
}, { immediate: true })
```

Rules:

- **Two entries must never share a route name.** Both would highlight and both
  groups would auto-expand. If two labels need the same screen, give one its own
  route name (a redirect or an alias record) or keep one entry.
- Active state uses **names only**, not path prefixes. `orders.show` does not
  highlight "Orders". To highlight the list entry while on a detail or form page, add
  an optional `activeFor?: string[]` of extra route names to `MenuItem` and check it in
  `isActive`. Do not switch to path matching.
- Query strings and params do not affect the active state.

## Route permission slug == menu permission slug

The menu gate and the route guard must use **the same slug** (`order:view` on both
the `orders.index` entry and the `orders.index` route `meta.permission`):

- If the menu is looser than the route, a user sees an entry that lands on
  `forbidden`.
- If the menu is stricter, a user can open a page that has no way in from the sidebar.
- Both should match the API's `permission:` middleware / policy ability
  (`../../rules/authorization.md`). The front-end gate is UX. The server is the
  authority.

When a route needs any of several permissions, use `anyPermission` on both the route
meta and the menu entry, with the same list.

## Unit-testing the tree

The menu is plain data, so pin it with a Vitest spec that has no router and no DOM.
Test the authored tree (catches accidental regrouping) and the filter rules (catches
gate regressions).

```typescript
// resources/js/__tests__/menu/coreMenu.spec.ts
import { describe, it, expect } from 'vitest'
import { coreMenu } from '@/menu/coreMenu'
import { buildMenu } from '@/menu/registry'
import type { MenuAuthGate } from '@/menu/types'

const gate = (perms: string[]): MenuAuthGate => ({
  isAuthenticated: true,
  hasPermission: (p) => perms.includes(p),
  hasAnyPermission: (ps) => ps.some((p) => perms.includes(p)),
})
const keys = (items: { key: string }[]) => items.map((i) => i.key)

describe('core menu', () => {
  it('keeps the top-level order', () => {
    const all = gate(['quote:view', 'order:view', 'invoice:view', 'product:view', 'customer:view', 'user:view', 'role:view', 'settings:manage'])
    expect(keys(buildMenu(coreMenu, all))).toEqual(['dashboard', 'sales', 'catalog', 'customers', 'settings'])
  })

  it('shows Dashboard to a user with no permissions and prunes every empty group', () => {
    expect(keys(buildMenu(coreMenu, gate([])))).toEqual(['dashboard'])
  })

  it('one permission yields several entries', () => {
    const catalog = buildMenu(coreMenu, gate(['product:view'])).find((n) => n.key === 'catalog')
    expect(keys(catalog!.items!)).toEqual(['products', 'categories'])
  })

  it('anyPermission admits either slug', () => {
    const settings = buildMenu(coreMenu, gate(['activity:view'])).find((n) => n.key === 'settings')
    expect(keys(settings!.items!)).toEqual(['activity'])
  })

  it('hides entries whose route is not registered', () => {
    const menu = buildMenu(coreMenu, gate(['order:view', 'invoice:view']), (name) => name !== 'invoices.index')
    expect(keys(menu.find((n) => n.key === 'sales')!.items!)).toEqual(['orders'])
  })

  it('never reuses a route name', () => {
    const names = coreMenu.flatMap((n) => [n, ...(n.items ?? [])]).flatMap((i) => (i.route ? [i.route.name] : []))
    expect(new Set(names).size).toBe(names.length)
  })

  it('every menu route name exists in the router with the same permission', async () => {
    const { default: router } = await import('@/router')
    for (const item of coreMenu.flatMap((n) => n.items ?? [n]).filter((i) => i.route)) {
      const record = router.getRoutes().find((r) => r.name === item.route!.name)
      expect(record, item.route!.name).toBeDefined()
      if (item.permission) expect(record!.meta.permission).toBe(item.permission)
    }
  })
})
```

For `mergeMenu`, test the four rejection paths (three levels, duplicate key, unknown
target group, valid injection lands at the given `order`) with `import.meta.env.DEV`
true, so that each one throws.
