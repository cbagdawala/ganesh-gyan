# Project Overview

## Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Laravel | 13 (latest) | PHP web framework, API routing, Eloquent ORM, task scheduling |
| PHP | 8.3+ | Runtime with typed properties, enums, fibers |
| MySQL | 8.0+ | Primary relational database |
| Redis | 7.x+ | Caching, sessions, queue driver (Redis 8 is GA in 2026) |
| Laravel Sanctum | 4.x | First-party API/SPA authentication (cookie sessions + personal access tokens) |
| Pest | 4.x | PHP testing framework (PHPUnit alternative) |
| Artisan Queue | Redis/Database | Async job processing |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Vue 3 | 3.5+ | UI framework with Composition API |
| Vite | 8.x | Build tool, HMR, asset bundling |
| PrimeVue | 4.x | UI component library (Tailwind-based) |
| Pinia | 4.x | State management |
| Vue Router | 5.x | Client-side routing |
| Axios | 1.x | HTTP client (`withCredentials` for Sanctum cookies / Bearer interceptor for token mode) |
| TypeScript | 5.x | Typed Vue components (recommended) |
| Tailwind CSS | 4.x | Utility-first CSS framework (CSS-first config via `@theme`) |

### Architecture Pattern

- **Backend**: Laravel MVC with Service Layer pattern
- **Frontend**: Single Page Application (Vue SPA)
- **Communication**: RESTful API with Sanctum authentication (httpOnly cookie session for the web SPA; personal access tokens for mobile/third-party clients)
- **Shell**: Blade templates serve as SPA entry point (single `<div id="app">` with Vue mounted)

### Development Tooling

| Tool | Purpose |
|---|---|
| Composer | PHP dependency management |
| npm / pnpm | Node.js dependency management |
| Vite | Frontend build and HMR |
| Pest PHP | Testing framework |
| PHP CS Fixer | Automated code style enforcement |
| ESLint + Prettier | Frontend code formatting |
| Laravel Pint | Laravel-specific code style fixes |
| Docker / Mutagen | Local development environment |
| Herd / Valet | PHP development server (dev only) |

### Key Package Dependencies

**PHP (composer.json):**
- `laravel/framework` — Core framework (v13)
- `laravel/sanctum` — Primary API/SPA authentication (cookie sessions + personal access tokens)
- `predis/predis` — Redis client
- `spatie/laravel-permission` — Role/permission management
- `spatie/laravel-activitylog` — Audit trail
- `maatwebsite/excel` — Import/export if needed

**Frontend (package.json):**
- `vue` — Vue 3 core
- `vue-router` — Routing
- `pinia` — State management
- `axios` — HTTP client
- `primevue` — UI components
- `@primeuix/themes` — PrimeVue 4 theme presets (`definePreset`, `Aura`, …)
- `primeicons` — PrimeIcons font (`pi pi-*`); import `primeicons/primeicons.css` in the app entry
- `vite` — Build tool
- `@vitejs/plugin-vue` — Vue support for Vite
- `tailwindcss` — Utility CSS
- `tailwindcss-primeui` — Tailwind 4 plugin for PrimeVue utilities (`@plugin "tailwindcss-primeui";`)
- `typescript` — TypeScript support
- `vue-tsc` — Type-checks `.vue` files (`npm run typecheck` → `vue-tsc --noEmit`)

### Exact versions (verified compatible — always use these pins)

These pins install together cleanly on a fresh Laravel 13 app. **Do not invent
version numbers** — mismatches cause peer-dependency failures. Two facts are
load-bearing:
- **`laravel-vite-plugin` 3.x requires Vite 8** (the ladder: plugin 1.x→Vite 5/6, 2.x→Vite 7, 3.x→Vite 8). Never pair a v1/v2 plugin with Vite 8, or Vite 7 with the v3 plugin.
- **Pinia ships as `pinia` (v4).** There is **no** `@pinia/vue` package — installing it 404s.

**`composer.json` — `require`:**
```json
"php": "^8.3",
"laravel/framework": "^13.0",
"laravel/sanctum": "^4.0",
"spatie/laravel-permission": "^8.0",
"spatie/laravel-activitylog": "^5.0",
"predis/predis": "^3.0",
"maatwebsite/excel": "^3.1"
```
> `spatie/laravel-activitylog` ^5 needs PHP 8.4; pin `^4` to stay on PHP 8.3.

**`composer.json` — `require-dev`:**
```json
"pestphp/pest": "^4.0",
"pestphp/pest-plugin-laravel": "^4.0",
"laravel/pint": "^1.0"
```

**`package.json` — `dependencies`:**
```json
"vue": "^3.5",
"vue-router": "^5.0",
"pinia": "^4.0",
"axios": "^1.7",
"primevue": "^4.2",
"@primeuix/themes": "^2.0.3",
"primeicons": "^8.0",
"chart.js": "^4.4",
"vue-chartjs": "^5.3"
```

**`package.json` — `devDependencies`:**
```json
"vite": "^8.0",
"laravel-vite-plugin": "^3.0",
"@vitejs/plugin-vue": "^6.0",
"tailwindcss": "^4.0",
"@tailwindcss/vite": "^4.0",
"typescript": "^5.9",
"vue-tsc": "^3.3",
"tailwindcss-primeui": "^0.6"
```
> PrimeVue 5 and TypeScript 7 exist but are intentionally not adopted here: the
> UI guidance is written for PrimeVue 4, and Vue tooling targets TypeScript 5.x.
> The same applies to the theme package: pin **`@primeuix/themes` `^2.0.3`** — the
> 2.x line is what PrimeVue 4.5.x uses internally. **Do not** install 3.x (npm
> `latest` is 3.0.1): treat `@primeuix/themes` 3.x as the PrimeVue 5 line.
> Tailwind 4 uses the `@tailwindcss/vite` plugin — **no** `postcss`/`autoprefixer`
> entries are needed.

**`package.json` — `scripts`:**
```json
"typecheck": "vue-tsc --noEmit"
```
`npm run typecheck` is the TypeScript gate for PRs and CI. The `tsconfig.json`
it relies on (paths under `resources/js/`, `vite/client` types) is in `rules/vue.md`.

### Migrating from `@primevue/themes`

`@primevue/themes` is deprecated on npm ("no longer maintained, migrate to
@primeuix/themes"). It was only a thin wrapper — `@primevue/themes@4.5.4` just
depends on `@primeuix/themes@2.0.3` — so the API is identical (`definePreset`,
`Aura`, `Lara`, `Nora`, `usePreset`, …); only the import path changes. For a
project still on the old package:

```bash
npm uninstall @primevue/themes
npm install @primeuix/themes@^2.0.3
# update the import lines ('@primevue/themes' → '@primeuix/themes',
# '@primevue/themes/aura' → '@primeuix/themes/aura', same for /lara, /nora, …),
# then clear Vite's pre-bundle cache and restart the dev server:
rm -rf node_modules/.vite
```

Do not skip the cache step: Vite's optimized-deps cache still references the
removed package, so re-optimization fails with `ENOENT` on
`node_modules/@primevue/themes/index.mjs` and the browser hangs on
`504 (Outdated Optimize Dep)` responses.
