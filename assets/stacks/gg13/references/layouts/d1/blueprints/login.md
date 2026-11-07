# d1 blueprint: login (`AuthLayout`)

> **Layout override.** This file replaces the **page markup** of
> [`../../../blueprints/login.md`](../../../blueprints/login.md) for projects on the `d1`
> layout. The auth controller, form requests, user model, routes, Sanctum configuration
> and Pest tests still come from that shared blueprint; the session flow from
> [`../../../rules/api.md`](../../../rules/api.md) ("Authentication Handling") and the
> user store and Axios client from [`../../../rules/vue.md`](../../../rules/vue.md).
> Precedence rules: [`../../README.md`](../../README.md).
>
> Related d1 files: [`../shell.md`](../shell.md) (how layouts are mounted),
> [`../colors.md`](../colors.md), [`../typography.md`](../typography.md).

Authentication is the Sanctum **stateful session**: `GET /sanctum/csrf-cookie`, then
`POST /auth/login` through the gg13 Axios client (`withCredentials`, `withXSRFToken`).
The session lives in an `httpOnly` cookie. Nothing is written to `localStorage` or
`sessionStorage`, and no `Authorization` header is set.

---

## 1. `AuthLayout`: split screen

```
desktop (≥ 768px)
┌────────────────────────────────────────────┬──────────────────────┐
│                                            │      440px panel     │
│                                            │  ┌── max 340px ───┐  │
│          cover image (flex: 1)             │  │ Brand           │  │
│          background-size: cover            │  │ tagline         │  │
│          dark fallback colour              │  │                 │  │
│                                            │  │ <slot />        │  │  the page (login, forgot…)
│                                            │  │                 │  │
│                                            │  │ ─────────────── │  │
│                                            │  │ © 2026 Name     │  │  #footer
│                                            │  └─────────────────┘  │
└────────────────────────────────────────────┴──────────────────────┘

mobile (< 768px)
┌──────────────────────────┐
│ cover, 180px high        │
├──────────────────────────┤
│ panel, full width,       │
│ border-top, grows        │
└──────────────────────────┘
```

- **Cover** fills the remaining width, `background-size: cover`, centred, with a near-black
  fallback (`#1a1a1a`) while the image loads or when it is missing. It is decorative:
  a CSS background, no `alt` text, `aria-hidden`.
- **Panel**: 440px wide, full viewport height, content vertically centred, the preset's
  content background, a 1px left border in `--p-content-border-color`, 2rem padding.
- **Inner column**: `max-width: 340px`, full width below that. Brand block (name 1.75rem /
  600 / `-0.03em`, tagline small muted) with 2.5rem below it; the slot with 2rem below it;
  a footer with a top border, 1.5rem padding above, extra-small muted text.
- **Mobile** (< 768px): the layout stacks; the cover becomes a 180px band on top; the
  panel takes the full width, loses its left border, gains a top border and grows to fill
  the screen.
- Dark mode needs nothing extra: every colour is a `--p-*` variable.

```vue
<!-- resources/js/layouts/AuthLayout.vue -->
<script setup lang="ts">
withDefaults(defineProps<{
  appName?: string
  tagline?: string | null
  /** Cover image URL (public/ or a Vite import). */
  coverUrl?: string
}>(), {
  appName: import.meta.env.VITE_APP_NAME ?? 'App',
  tagline: null,
  coverUrl: '/images/auth-cover.jpg',
})
const year = new Date().getFullYear()
</script>

<template>
  <div class="flex min-h-screen flex-col md:flex-row">
    <!-- Cover: decorative -->
    <div
      class="h-[180px] flex-none bg-[#1a1a1a] bg-cover bg-center md:h-auto md:flex-1"
      :style="{ backgroundImage: `url('${coverUrl}')` }"
      aria-hidden="true"
    />

    <!-- Panel -->
    <main
      class="flex w-full flex-1 items-center justify-center border-t border-[var(--p-content-border-color)]
             bg-[var(--p-content-background)] p-8
             md:min-h-screen md:w-[440px] md:flex-none md:border-t-0 md:border-l"
    >
      <div class="w-full max-w-[340px]">
        <div class="mb-10">
          <slot name="brand">
            <p class="m-0 text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--p-text-color)]">{{ appName }}</p>
            <p v-if="tagline" class="mt-1 mb-0 text-sm text-[var(--p-text-muted-color)]">{{ tagline }}</p>
          </slot>
        </div>

        <div class="mb-8">
          <slot />
        </div>

        <footer class="border-t border-[var(--p-content-border-color)] pt-6">
          <slot name="footer">
            <p class="m-0 text-xs text-[var(--p-text-muted-color)]">&copy; {{ year }} {{ appName }}. All rights reserved.</p>
          </slot>
        </footer>
      </div>
    </main>
  </div>
</template>
```

| Prop | Default | Notes |
|---|---|---|
| `appName` | `VITE_APP_NAME` | Brand text and footer |
| `tagline` | `null` | Muted line under the brand |
| `coverUrl` | `/images/auth-cover.jpg` | Pick a calm, dark, low-detail image; the panel carries the content |

| Slot | Content |
|---|---|
| `#brand` | Replaces the brand block (a logo `<img>` with real `alt`) |
| default | The page: login, forgot password, reset password, two-factor challenge |
| `#footer` | Replaces the copyright line (links to terms / privacy) |

The brand is a `<p>`, not an `<h1>`: each page in the slot owns the page's single `h1`.

### Routing

Guest pages are children of one layout route that mounts `AuthLayout`. Absolute child
paths keep the URLs short:

```ts
// resources/js/router/index.ts (guest part)
{
  path: '/auth',
  component: () => import('@/layouts/AuthLayout.vue'),
  meta: { guest: true },
  children: [
    { path: '/login', name: 'login', component: () => import('@/pages/auth/LoginPage.vue'), meta: { guest: true, title: 'Sign in' } },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/pages/auth/ForgotPasswordPage.vue'), meta: { guest: true, title: 'Forgot password' } },
    { path: '/reset-password/:token', name: 'reset-password', component: () => import('@/pages/auth/ResetPasswordPage.vue'), meta: { guest: true } },
  ],
},
```

The `beforeEach` guard from [`../../../rules/vue.md`](../../../rules/vue.md) ("Vue Router")
applies unchanged: `meta.guest` sends a signed-in user to the dashboard, `requiresAuth`
sends a guest to `login` with `?redirect=`. If [`../shell.md`](../shell.md) selects layouts
by `route.meta.layout` instead of a layout route, register `AuthLayout` there as `auth`
and give these routes `meta: { layout: 'auth', guest: true }`.

---

## 2. Login page

```
Sign in                                   ← h1, 1.5rem / 600
Enter your email and password.            ← sm, muted
[Message: Those credentials do not match.]← only after a failed attempt
Email
[you@company.com                     ]
Password
[••••••••                         👁 ]
[☐] Remember me          Forgot password?
[               Sign in              ]   ← full width, ink (d1 primary)
```

- Labels above inputs (`text-sm font-medium`), 1.125rem between fields, 0.375rem between a
  label and its control.
- Field errors under the control (`<small>`, `--p-red-600`), the control marked
  `:invalid`, `aria-invalid` and `aria-describedby`.
- A credential failure (401 / 422 on `email` with "These credentials do not match") or a
  throttle (429) shows **one** inline `Message severity="error"` above the form, announced
  (`role="alert"`). Do not use a toast for it: it disappears and is away from the form.
- "Forgot password?" is a muted text link that underlines on hover.
- The submit button is full width with `:loading`; Enter submits (it is a real `<form>`).
- After success, go to `?redirect=` (only a same-origin path that starts with `/` and not
  `//`), else the dashboard.

```ts
// resources/js/stores/user.ts: extend login with "remember me"
async function login(email: string, password: string, remember = false): Promise<void> {
  await api.get('/sanctum/csrf-cookie', { baseURL: '/' })        // prime XSRF-TOKEN
  const response = await api.post('/auth/login', { email, password, remember_me: remember })
  currentUser.value = response.data.data.user                     // session cookie is httpOnly
}
```

`remember_me` is the field name the shared login blueprint's `LoginRequest` validates; if
the controller reads `remember`, send that instead.

```vue
<!-- resources/js/pages/auth/LoginPage.vue -->
<script setup lang="ts">
import { reactive, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useUserStore } from '@/stores/user'
import { apiErrorMessage, validationErrors, type FieldErrors } from '@/utils/validation'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const form = reactive({ email: '', password: '', remember: false })
const errors = ref<FieldErrors>({})
const formError = ref<string | null>(null)
const submitting = ref(false)
const uid = useId()

/** Only same-origin paths: never redirect to another site. */
function safeRedirect(raw: unknown): string {
  const v = typeof raw === 'string' ? raw : ''
  return v.startsWith('/') && !v.startsWith('//') ? v : '/'
}

async function submit() {
  errors.value = {}
  formError.value = null
  submitting.value = true
  try {
    await userStore.login(form.email, form.password, form.remember)
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    const status = isAxiosError(e) ? e.response?.status : undefined
    const fields = validationErrors(e)
    if (fields) {
      // Laravel reports wrong credentials as a 422 on `email`: show it once, above the form.
      const credentials = fields.email?.find(m => /credentials/i.test(m))
      if (credentials) formError.value = credentials
      else errors.value = fields
    } else if (status === 429) {
      formError.value = apiErrorMessage(e, 'Too many attempts. Wait a minute and try again.')
    } else if (status === 401 || status === 403) {
      formError.value = apiErrorMessage(e, 'You cannot sign in with these details.')
    } else {
      formError.value = 'Sign-in failed. Check your connection and try again.'
    }
    form.password = ''
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <header class="mb-7">
      <h1 class="m-0 mb-1.5 text-2xl font-semibold text-[var(--p-text-color)]">Sign in</h1>
      <p class="m-0 text-sm text-[var(--p-text-muted-color)]">Enter your email and password.</p>
    </header>

    <Message v-if="formError" severity="error" :closable="false" role="alert" class="mb-4">{{ formError }}</Message>

    <form class="flex flex-col gap-[1.125rem]" novalidate @submit.prevent="submit">
      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-email`" class="text-sm font-medium text-[var(--p-text-color)]">Email</label>
        <InputText
          :id="`${uid}-email`"
          v-model="form.email"
          type="email"
          autocomplete="username"
          placeholder="you@company.com"
          fluid
          :invalid="!!errors.email"
          :aria-describedby="errors.email ? `${uid}-email-err` : undefined"
        />
        <small v-if="errors.email" :id="`${uid}-email-err`" class="text-[var(--p-red-600)]">{{ errors.email[0] }}</small>
      </div>

      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-password`" class="text-sm font-medium text-[var(--p-text-color)]">Password</label>
        <Password
          v-model="form.password"
          :input-id="`${uid}-password`"
          :feedback="false"
          toggle-mask
          autocomplete="current-password"
          fluid
          :invalid="!!errors.password"
          :aria-describedby="errors.password ? `${uid}-password-err` : undefined"
        />
        <small v-if="errors.password" :id="`${uid}-password-err`" class="text-[var(--p-red-600)]">{{ errors.password[0] }}</small>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.remember" :input-id="`${uid}-remember`" binary />
          <label :for="`${uid}-remember`" class="cursor-pointer text-sm text-[var(--p-text-color)]">Remember me</label>
        </div>
        <RouterLink
          :to="{ name: 'forgot-password' }"
          class="text-sm text-[var(--p-text-muted-color)] no-underline hover:text-[var(--p-text-color)] hover:underline"
        >
          Forgot password?
        </RouterLink>
      </div>

      <Button type="submit" label="Sign in" fluid :loading="submitting" />
    </form>
  </div>
</template>
```

The **Forgot password** and **Reset password** pages use the same structure in the same
layout: an `h1`, one muted sentence, the fields, one full-width button, and a "Back to sign
in" text link. The forgot page always answers with the same neutral sentence ("If an
account exists for that email, we have sent a reset link."), whatever the server found.

---

## 3. Checklist

1. The router mounts `AuthLayout` for every guest page; none of them renders the app
   shell.
2. Login goes through `userStore.login` → `/sanctum/csrf-cookie` + `POST /auth/login`;
   nothing is stored in web storage.
3. `?redirect=` is checked to be a same-origin path.
4. Credential and throttle failures show one inline `Message`; field errors come from
   `validationErrors()` (gg13 `error.details`, or Laravel's `errors`).
5. The password field is cleared after a failed attempt; `autocomplete` is `username` /
   `current-password`.
6. The cover image is decorative and does not hold any text the user needs.
