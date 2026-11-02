# Documentation Principles

Stack-neutral principles. Your stack pack's `references/rules/documentation.md` shows how to apply them.

## Why Document

Documentation exists so that the next person (or agent) can understand, run, and change the system without asking the author. Write for a competent developer who is new to this codebase.

- Document **intent and contracts**, not mechanics the code already shows.
- Keep documentation next to what it describes, so it changes in the same commit.
- Outdated documentation is a bug. Fix or delete it.

## What to Document

| Artifact | Document | Where |
|---|---|---|
| Public classes, functions, methods | Purpose, parameters, return value, errors raised | Doc comments in the code |
| Data shapes passed between layers | Fields, types, which are optional | Doc comments or type definitions |
| API endpoints | Path, method, auth, parameters, request and response shapes, error codes | Machine-readable API spec (e.g. OpenAPI) generated from or kept beside the code |
| UI components | Purpose, inputs (props), outputs (events), usage example | Doc comment at the top of the component |
| Non-obvious UI configuration | Why a component is configured the way it is | Short comment beside the markup |
| Setup, configuration, commands | How to install, configure, run, test, deploy | `README.md` |
| Environment variables | Name, meaning, default, whether required | `README.md` and the example environment file |
| Releases | What changed, for users and operators | `CHANGELOG.md` |
| Significant decisions | Context, options, decision, consequences | Architecture Decision Records |

### What not to document

- Restatements of the code (`// returns the user` above `return user`).
- Private helpers whose name and types already say everything.
- Temporary notes, to-do lists, or personal reminders. Use the issue tracker.

## Doc Comments

- Every public class, method, and property carries a doc comment.
- Start with a one-line summary in the imperative or descriptive voice ("Create a new user account.").
- Describe each parameter, the return value, and every error the caller must handle.
- Describe structured parameters (maps, option objects) field by field.
- Prefer real types in signatures over types written only in comments; use comments for what types cannot express (units, ranges, limits such as "max 100").
- Add an `@example` (or equivalent) for components and utilities that others will reuse.

## API Documentation

- Every endpoint is documented in a machine-readable spec that can render as browsable docs.
- Document authentication, all parameters, success responses, and error responses (at least 401, 403, 404, 422 where they apply).
- Define shared schemas (resource shape, pagination meta, error envelope) once and reference them.
- Regenerate or update the spec in the same change that alters the endpoint.
- Version the API and mark deprecated endpoints, with the replacement, before removing them.

## README

### When to Update the README

- Adding new environment variables
- Changing the database schema in a way that affects setup or seeding
- Adding new API endpoints or changing existing ones
- Installing new packages or changing dependencies
- Updating build or deploy instructions
- Adding new development setup steps

### README Structure

A project README answers, in order:

1. **What is this?** Name and one-paragraph description.
2. **Tech stack.** Languages, frameworks, databases, key services.
3. **Prerequisites.** Runtime versions and services required.
4. **Installation.** Numbered, copy-pasteable steps from clone to running app.
5. **Environment variables.** Table of name, description, default.
6. **Development.** How to run tests, the dev server, formatters, and linters.
7. **API documentation.** Where to find it.
8. **Deployment** (if not documented elsewhere).

Keep it accurate enough that a new developer can go from clone to a running app by following it literally.

## Changelog

Maintain `CHANGELOG.md` in [Keep a Changelog](https://keepachangelog.com/) format.

- Keep an `[Unreleased]` section at the top and add entries as changes merge.
- Use the categories Added, Changed, Deprecated, Removed, Fixed, Security.
- Write entries for the reader of the release, not the author of the commit.
- Reference issue or PR numbers where applicable: `Fixed #123: login redirect loop`.
- Move `[Unreleased]` entries under a dated version heading before tagging a release.

```markdown
## [Unreleased]

### Added
- Order status tracking endpoint

### Fixed
- Pagination not resetting when filters change

## [1.2.0] - 2024-03-15

### Added
- Order cancellation flow
```

## Architecture Decision Records (ADRs)

Record any decision that is significant, hard to reverse, or likely to be questioned later: architectural patterns, authentication approach, module structure, API format, major dependencies.

- One decision per file, numbered sequentially: `ADR-001-service-layer.md`.
- Store them in the pack's `references/decisions/` (or the project's `docs/decisions/`).
- ADRs are immutable once accepted. To change a decision, write a new ADR that supersedes the old one and update the old one's status.

### ADR Template

```markdown
# ADR-NNN: Title

## Status
Proposed | Accepted | Superseded by ADR-NNN

## Context
The problem and the forces at play.

## Decision
What we decided, stated plainly.

## Alternatives Considered
Options rejected, and why.

## Consequences
What becomes easier, what becomes harder, follow-up work.
```

## Documentation Review

### When to Review Documentation

- Before merging a PR that changes functionality
- Before every release
- When adding new environment variables
- When changing API contracts

### Documentation Checklist

- [ ] Doc comments on all public classes and methods
- [ ] API endpoints documented in the API spec
- [ ] Component inputs and outputs documented
- [ ] README reflects current setup and configuration
- [ ] Environment variables documented
- [ ] CHANGELOG updated
- [ ] Significant decisions captured as ADRs
- [ ] No outdated code examples in documentation
