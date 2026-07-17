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
| Pest | 3.x | PHP testing framework (PHPUnit alternative) |
| Artisan Queue | Redis/Database | Async job processing |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Vue 3 | 3.5+ | UI framework with Composition API |
| Vite | 7.x | Build tool, HMR, asset bundling |
| PrimeVue | 4.x | UI component library (Tailwind-based) |
| Pinia | 3.x | State management |
| Vue Router | 4.x | Client-side routing |
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
- `@primevue/themes` — PrimeVue themes
- `vite` — Build tool
- `@vitejs/plugin-vue` — Vue support for Vite
- `tailwindcss` — Utility CSS
- `typescript` — TypeScript support
