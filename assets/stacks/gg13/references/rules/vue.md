# Vue 3 Conventions

## Script Setup

All Vue components use `<script setup lang="ts">`. Composition API is mandatory.

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { useUserStore } from '@/stores/user'
import { formatDate } from '@/utils/date'
import type { User } from '@/types/user'

interface Props {
  userId: number
  editable?: boolean
  compact?: boolean
}

interface Emits {
  (e: 'updated', user: User): void
  (e: 'deleted', userId: number): void
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
  compact: false,
})

const emit = defineEmits<Emits>()

const toast = useToast()
const userStore = useUserStore()

const isLoading = ref(false)
const isEditing = ref(false)
const errorMessage = ref<string | null>(null)

const displayName = computed(() => {
  const user = userStore.getUserById(props.userId)
  return user?.name ?? 'Unknown'
})

onMounted(async () => {
  await userStore.fetchUser(props.userId)
})

async function handleEdit() {
  isEditing.value = true
}

async function handleSave(updated: User) {
  try {
    await userStore.updateUser(props.userId, updated)
    emit('updated', updated)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User updated successfully',
      life: 3000,
    })
    isEditing.value = false
  } catch (error) {
    errorMessage.value = 'Failed to update user'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not update user',
      life: 5000,
    })
  }
}
</script>
```

## Template Structure

- Keep templates under 100 lines; extract complex UI into sub-components
- Use PrimeVue components for standard UI elements
- Use `v-bind:class` / `v-bind:style` for dynamic classes/styles
- Use key attributes on v-for lists

```vue
<template>
  <div :class="['user-card', { 'user-card--compact': compact }]">
    <div v-if="isLoading" class="user-card__loading">
      <ProgressBar mode="indeterminate" />
    </div>

    <div v-else-if="errorMessage" class="user-card__error">
      <Message severity="error" :text="errorMessage" />
    </div>

    <div v-else class="user-card__content">
      <Avatar :label="displayName[0]" size="large" />
      <div class="user-card__info">
        <h3>{{ displayName }}</h3>
        <p>{{ user.email }}</p>
      </div>

      <div v-if="editable" class="user-card__actions">
        <Button
          v-if="!isEditing"
          label="Edit"
          icon="pi pi-pencil"
          text
          @click="handleEdit"
        />
        <Button
          v-if="isEditing"
          label="Save"
          icon="pi pi-check"
          severity="success"
          @click="handleSave(user)"
        />
        <Button
          label="Delete"
          icon="pi pi-trash"
          severity="danger"
          @click="emit('deleted', userId)"
        />
      </div>
    </div>
  </div>
</template>
```

## PrimeVue Components

### Core Components

PrimeVue is the UI library. Use PrimeVue components for all standard UI patterns:

| Pattern | PrimeVue Component |
|---|---|
| Tables | `DataTable` + `Column` |
| Forms | `InputText`, `Textarea`, `Select`, `Checkbox`, `RadioButton`, `ToggleButton` |
| Navigation | `Menubar`, `TieredMenu`, `Stepper`, `Breadcrumb`, `Tabs` (+ `TabList`/`Tab`/`TabPanels`/`TabPanel`) |
| Feedback | `Message`, `Toast`, `ProgressBar`, `Skeleton` |
| Overlays | `Dialog`, `Drawer`, `Popover`, `Tooltip`, `ConfirmDialog`, `ConfirmPopup` |
| Data Display | `Tag`, `Badge`, `Avatar`, `Carousel`, `Tree`, `TreeSelect` |
| Charts | `Chart` (Chart.js wrapper, ships in core `primevue`) |
| File Upload | `FileUpload` |
| Date | `DatePicker` |
| Password | `Password` |
| Select | `MultiSelect`, `Select` |
| Layout | `Panel`, `Accordion`, `Fieldset`, `Divider` |

### PrimeVue Configuration

Configure PrimeVue in the app entry point:

```typescript
// resources/js/app.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css' // PrimeIcons font — without it every `pi pi-*` icon is blank
import App from './App.vue'
import router from './router'
// resources/css/app.css is its own Vite input, loaded by @vite in the Blade shell

const TailwindPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{sky.50}',
      100: '{sky.100}',
      200: '{sky.200}',
      300: '{sky.300}',
      400: '{sky.400}',
      500: '{sky.500}',
      600: '{sky.600}',
      700: '{sky.700}',
      800: '{sky.800}',
      900: '{sky.900}',
      950: '{sky.950}',
    },
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: TailwindPreset,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark', // official PrimeVue 4 option — 'darkModeClass' does not exist (falls back to 'system')
      cssLayer: false,
    },
  },
})
app.use(ToastService)
app.use(ConfirmationService)
app.mount('#app')
```

### Tailwind CSS 4 + PrimeVue 4 Integration

Tailwind CSS 4 is **CSS-first**: there is no required `tailwind.config.js`.
Import Tailwind and configure design tokens directly in your stylesheet with
`@import "tailwindcss";` and the `@theme` directive. Integrate PrimeVue's
utilities via the `tailwindcss-primeui` plugin (loaded with the Tailwind 4
`@plugin` directive), and reconcile the two style systems with CSS layers:

```css
/* resources/css/app.css */

/* Declare the layer order BEFORE importing Tailwind v4, so `primevue` sits
   between Tailwind's `base` (preflight) and `utilities`. Tailwind v4 populates
   the REAL layers `theme, base, components, utilities` — the v3-era names
   `tailwind-base`/`tailwind-utilities` never intercept preflight, so
   preflight's `button { background: transparent }` wins the cascade and every
   PrimeVue Button renders transparent. Pair this order with the PrimeVue
   `cssLayer` option below. */
@layer theme, base, primevue, components, utilities;

@import "tailwindcss";
@plugin "tailwindcss-primeui";

/* Class-driven dark mode: keys Tailwind's `dark:` variant off the same `.dark`
   class PrimeVue's darkModeSelector uses — without this, Tailwind defaults to
   the OS media query and the two systems disagree. */
@custom-variant dark (&:where(.dark, .dark *));

/* Design tokens (replaces the JS theme.extend config from Tailwind 3) */
@theme {
  --color-brand-500: #0ea5e9;
  --font-sans: "Inter", sans-serif;
}
```

Build wiring uses the **`@tailwindcss/vite`** plugin (Tailwind 4 no longer needs
`postcss`/`autoprefixer`), alongside `laravel-vite-plugin` and
`@vitejs/plugin-vue`. The plugin versions must line up (`laravel-vite-plugin`
3.x ↔ Vite 8):

```typescript
// vite.config.ts
import { defineConfig } from 'vite'          // vite ^8
import laravel from 'laravel-vite-plugin'    // ^3  (requires Vite 8)
import vue from '@vitejs/plugin-vue'         // ^6
import tailwindcss from '@tailwindcss/vite'  // ^4

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/js/app.ts', 'resources/css/app.css'],
      refresh: true,
    }),
    vue(),
    tailwindcss(),
  ],
  resolve: { alias: { '@': '/resources/js' } },
})
```

PrimeVue 4 theming is preset-based via `@primeuix/themes` (`^2.0.3`; migrating an older
project? see "Migrating" in `rules/project.md`) and `definePreset`
(shown above) — the old PrimeVue 3 approach of importing a prebuilt theme CSS
file and a `primeflex` utility library is gone. To let Tailwind utility classes
win over component styles, enable the CSS layer in the PrimeVue config:

```typescript
app.use(PrimeVue, {
  theme: {
    preset: TailwindPreset,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark', // official PrimeVue 4 option — 'darkModeClass' does not exist (falls back to 'system')
      cssLayer: { name: 'primevue', order: 'theme, base, primevue, components, utilities' },
    },
  },
})
```

### PrimeVue Table

```vue
<template>
  <DataTable
    :value="users"
    :loading="isLoading"
    :paginator="true"
    :rows="20"
    :rows-per-page-options="[10, 20, 50]"
    paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
    sort-mode="single"
    @sort="onSort"
  >
    <Column field="name" header="Name" sortable />
    <Column field="email" header="Email" sortable />
    <Column field="role" header="Role" :body="renderRole" />
    <Column header="Actions">
      <template #body="slotProps">
        <Button icon="pi pi-pencil" text @click="editUser(slotProps.data)" />
        <Button icon="pi pi-trash" text severity="danger" @click="deleteUser(slotProps.data)" />
      </template>
    </Column>
  </DataTable>
</template>
```

## Pinia Stores

Centralized state management for shared application state.

```typescript
// resources/js/stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'
import type { User } from '@/types/user'
import type { PaginatedResponse } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>([])
  const isLoading = ref(false)

  // Sanctum SPA auth is cookie-based — there is no token in JS to track.
  // Authentication state is derived from whether we have a current user.
  const isAuthenticated = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const displayName = computed(() => currentUser.value?.name ?? '')

  async function login(email: string, password: string): Promise<void> {
    // 1. Prime the XSRF-TOKEN cookie, 2. authenticate — Laravel sets the
    // httpOnly session cookie in the response. No token is stored client-side.
    await api.get('/sanctum/csrf-cookie', { baseURL: '/' })
    const response = await api.post('/auth/login', { email, password })
    currentUser.value = response.data.data.user
  }

  // Call on app boot to restore the session from the cookie (if any).
  async function fetchCurrentUser(): Promise<void> {
    try {
      const response = await api.get('/auth/user')
      currentUser.value = response.data.data
    } catch {
      currentUser.value = null
    }
  }

  async function logout(): Promise<void> {
    await api.post('/auth/logout')
    currentUser.value = null
    users.value = []
  }

  async function fetchUser(id: number): Promise<void> {
    isLoading.value = true
    try {
      const response = await api.get(`/users/${id}`)
      const userData = response.data.data
      users.value = users.value.map((u) =>
        u.id === userData.id ? userData : u
      )
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAll(filters: Record<string, string> = {}): Promise<void> {
    isLoading.value = true
    try {
      const response = await api.get<PaginatedResponse<User>>('/users', { params: filters })
      users.value = response.data.data
    } finally {
      isLoading.value = false
    }
  }

  async function updateUser(id: number, data: Partial<User>): Promise<void> {
    const response = await api.patch(`/users/${id}`, data)
    const updated = response.data.data
    users.value = users.value.map((u) => (u.id === id ? updated : u))
    if (currentUser.value?.id === id) {
      currentUser.value = updated
    }
  }

  async function deleteUser(id: number): Promise<void> {
    await api.delete(`/users/${id}`)
    users.value = users.value.filter((u) => u.id !== id)
    if (currentUser.value?.id === id) {
      await logout()
    }
  }

  return {
    currentUser,
    users,
    isLoading,
    isAuthenticated,
    isAdmin,
    displayName,
    login,
    logout,
    fetchCurrentUser,
    fetchUser,
    fetchAll,
    updateUser,
    deleteUser,
  }
})
```

## Vue Router

Client-side routing with lazy-loaded routes.

```typescript
// resources/js/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/users/UserListPage.vue'),
        meta: { permission: 'user:view' },
      },
      {
        path: 'users/create',
        name: 'users.create',
        component: () => import('@/pages/users/UserCreatePage.vue'),
        meta: { permission: 'user:create' },
      },
      {
        path: 'users/:id/edit',
        name: 'users.edit',
        component: () => import('@/pages/users/UserEditPage.vue'),
        meta: { permission: 'user:update' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.guest && userStore.isAuthenticated) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
```

### Laravel SPA Catch-All Route

History mode (`createWebHistory`) only works if Laravel returns the SPA shell for
every client-side path. Without this route, a refresh or deep link such as
`/projects/12` hits Laravel's 404 instead of Vue Router:

```php
// routes/web.php — SPA shell: every non-API web path is handled by Vue Router.
Route::view('/{any?}', 'app')
    ->where('any', '^(?!(api|sanctum|up)(/|$)).*$')
    ->name('spa');
```

The exclusion is anchored to a whole path segment — `(api|sanctum|up)(/|$)`. The
naive `^(?!api|sanctum|up).*$` also swallows real pages such as
`/api-documentation` or `/updates`. Keep the list in sync with every other
non-SPA prefix the app registers (e.g. `broadcasting`, `storage`, `telescope`,
`horizon`). Register it **last** in `routes/web.php`. The `app` view is the Blade
shell (`resources/views/app.blade.php`, see `rules/architecture.md`) — minimally
`@vite(['resources/css/app.css', 'resources/js/app.ts'])` in the head and
`<div id="app"></div>` in the body.

## Axios API Client (Sanctum Session Cookies)

Centralized HTTP client for the Sanctum SPA session guard. Authentication rides
on the browser's `httpOnly` session cookie, so the client stores no tokens — it
only needs `withCredentials: true` so cookies (and the `X-XSRF-TOKEN` header
Axios derives from the `XSRF-TOKEN` cookie) are sent on every request.

```typescript
// resources/js/api/client.ts
import axios from 'axios'
import router from '@/router'
import { useUserStore } from '@/stores/user'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  timeout: 15_000,
  // Send/receive the Sanctum session + XSRF cookies. Axios reads the
  // XSRF-TOKEN cookie and sets the X-XSRF-TOKEN header automatically.
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// No request interceptor is needed to attach a token — the browser sends the
// session cookie automatically.

// Handle auth/permission errors centrally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const userStore = useUserStore()

    if (error.response?.status === 401) {
      // Session missing or expired — there is no refresh flow for a session
      // cookie; send the user back to log in.
      userStore.$reset?.()
      router.push({ name: 'login' })
    }

    if (error.response?.status === 419) {
      // CSRF token mismatch/expired — re-prime the cookie and let the caller retry.
      await api.get('/sanctum/csrf-cookie', { baseURL: '/' })
    }

    if (error.response?.status === 403) {
      // Permission denied — show appropriate message
      console.warn('Insufficient permissions')
    }

    return Promise.reject(error)
  }
)

export default api
```

`import.meta.env.VITE_API_URL` only type-checks when the variable is declared.
Add an env declaration file next to the entry point:

```typescript
// resources/js/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## API Service Layer

Separate API calls into service files for each domain.

```typescript
// resources/js/api/services/userApi.ts
import api from '@/api/client'
import type { User } from '@/types/user'
import type { PaginatedResponse, ApiResponse } from '@/types/api'

export async function fetchUsers(params: Record<string, string>): Promise<PaginatedResponse<User>> {
  const response = await api.get<PaginatedResponse<User>>('/users', { params })
  return response.data
}

export async function fetchUser(id: number): Promise<User> {
  const response = await api.get<ApiResponse<User>>(`/users/${id}`)
  return response.data.data
}

export async function createUser(data: Partial<User>): Promise<User> {
  const response = await api.post<ApiResponse<User>>('/users', data)
  return response.data.data
}

export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const response = await api.patch<ApiResponse<User>>(`/users/${id}`, data)
  return response.data.data
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`)
}
```

## Composables Pattern

Extract reusable logic into composables (functions starting with `use`).

```typescript
// resources/js/composables/usePagination.ts
import { ref, computed, type Ref } from 'vue'

interface PaginationState {
  page: number
  perPage: number
  total: number
  lastPage: number
}

export function usePagination(initialPage: number = 1, initialPerPage: number = 20) {
  const state = ref<PaginationState>({
    page: initialPage,
    perPage: initialPerPage,
    total: 0,
    lastPage: 1,
  })

  const hasNextPage = computed(() => state.value.page < state.value.lastPage)
  const hasPreviousPage = computed(() => state.value.page > 1)

  function goToPage(page: number): void {
    state.value.page = page
  }

  function setPerPage(perPage: number): void {
    state.value.perPage = perPage
    state.value.page = 1
  }

  function updateMeta(total: number, lastPage: number): void {
    state.value.total = total
    state.value.lastPage = lastPage
  }

  return {
    state,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    setPerPage,
    updateMeta,
  }
}

// resources/js/composables/useDebounce.ts
import { ref, watch } from 'vue'

export function useDebounce<T>(value: Ref<T>, delay: number = 300): Ref<T> {
  const debounced = ref(value.value) as Ref<T>

  watch(value, (newValue) => {
    const timer = setTimeout(() => {
      debounced.value = newValue
    }, delay)
    return () => clearTimeout(timer)
  })

  return debounced
}
```

## Component Naming

- PascalCase for component file names and component names: `UserProfileCard.vue`
- Use descriptive, meaningful names — avoid generic names like `Container.vue`, `Wrapper.vue`
- Prefix shared UI components with a scope (e.g., `DataTable`, `DataTableColumn`)
- Page components go in `pages/`, reusable components in `components/`

```
resources/js/components/
├── ui/                    # Generic UI components (Button, Input, Modal)
├── layout/                # Layout components (Sidebar, Header, Footer)
└── features/              # Feature-specific components (OrderCard, UserTable)
```

## Props and Emits

Always define props and emits with TypeScript types.

```typescript
interface ProductCardProps {
  product: Product
  showPrice?: boolean
  onAddToCart?: (product: Product) => void
}

interface ProductCardEmits {
  (e: 'add-to-cart', product: Product): void
  (e: 'view-details', productId: number): void
}

const props = withDefaults(defineProps<ProductCardProps>(), {
  showPrice: true,
})

const emit = defineEmits<ProductCardEmits>()
```

## Lazy Loading

Lazy-load routes for code splitting:

```typescript
// router — already shown above
// Uses dynamic imports: () => import('@/pages/SomePage.vue')
```

Lazy-load heavy PrimeVue components when not immediately visible:

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() =>
  import('@/components/charts/RevenueChart.vue')
)
</script>
```

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"],
    "paths": { "@/*": ["./resources/js/*"] }
  },
  "include": ["resources/js/**/*.ts", "resources/js/**/*.d.ts", "resources/js/**/*.vue"],
  "exclude": ["node_modules", "vendor", "public"]
}
```

A Laravel app keeps its frontend in `resources/js/` — there is no `src/`. The
`paths` alias must match the Vite alias (`'@' → /resources/js`), or `vue-tsc`
cannot resolve any `@/...` import. `"types": ["vite/client"]` supplies the
`import.meta.env` / asset-import types; declare the app's own `VITE_*` variables
in `resources/js/env.d.ts` (see the Axios client above).

Wire the check as an npm script and run it in CI / before every PR:

```json
// package.json
"scripts": {
  "typecheck": "vue-tsc --noEmit"
}
```
