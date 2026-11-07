# Layouts

A **layout** is the look and frame of the app: the shell (layout component,
sidebar, topbar, navigation), the design values (colors, typography, spacing,
PrimeVue preset) and any page markup that differs from the shared blueprints.
Everything else in this pack — rules, API, services, tests, and the component
guidance in `design-system/` — is shared by every layout.

| Layout | Folder | Summary |
|---|---|---|
| `classic` (default) | `classic/` | The original gg13 layout: `MainLayout.vue`, sidebar + header, blue primary palette, Inter |

## Which layout is active

Work this out once per task, before any UI work:

1. **Declared.** The project's `CLAUDE.md` / `AGENTS.md` (or another agent
   instructions file) contains a line `gg13-layout: <id>`. Use it.
2. **Detected.** No declaration: look for the fingerprint listed in each layout's
   `shell.md` ("How to recognise this layout"). Use the one that matches.
3. **Default.** Nothing declared or detected (e.g. a new project): use `classic`.
4. **Conflict.** Signals disagree, or a project mixes layouts: ask the user. Never
   blend two layouts in one project.

When starting a new project on a non-default layout, add the `gg13-layout:` line to
its agent instructions file so later sessions don't have to guess.

## Precedence

Most specific wins:

```
layouts/<id>/…   >   design-system/… and blueprints/…   >   rules/…   >   principles/…
```

- A layout file overrides a shared file on the same topic (e.g.
  `layouts/<id>/blueprints/listing.md` overrides the markup in
  `blueprints/listing.md`; the data flow, API and tests still come from the shared one).
- A layout never overrides stack conventions: Sanctum, `@primeuix/themes`,
  Tailwind CSS 4, PrimeVue 4 component names and the API format stay as in `rules/`.

## Layout folder contract

Every `layouts/<id>/` has at least:

| File | Holds |
|---|---|
| `shell.md` | Layout component(s), routing to them, sidebar/topbar/navigation, responsive collapse, how to recognise the layout |
| `colors.md` | Color tokens, dark mode, PrimeVue preset |
| `typography.md` | Font families and type scale |
| `spacing.md` | Spacing scale and usage |

Optional: `components.md` (layout-specific shared components), `blueprints/<name>.md`
(page markup that differs from `../blueprints/<name>.md`).
