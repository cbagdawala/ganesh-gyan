# Testing Principles

Stack-neutral principles. Your stack pack's `references/rules/testing.md` shows how to apply them.

## Why

Tests let you change code without fear. They document intended behaviour, catch regressions before users do, and make refactoring safe. A feature is not done until its tests pass.

## Test Types

| Type | Scope | Use for |
|---|---|---|
| Feature / HTTP | A full request through routing, validation, authorization, business logic and the database | Every endpoint and user-facing flow |
| Unit | One class or function in isolation | Services, actions, value objects, calculations, edge-case logic |
| Integration | Your code against a real dependency (database, queue, file store) | Repositories, complex queries, adapters |
| End-to-end | The running app through a browser | A few critical journeys (login, checkout), not every screen |

Prefer many fast feature and unit tests and few slow end-to-end tests.

## Organization

- Mirror the application structure: a test file per controller/resource, service and action.
- Separate feature and unit tests into their own folders.
- Group related tests (for example, all authentication tests) in a sub-folder.
- Keep shared helpers and setup in one place; do not copy setup between files.
- Name test files after the unit under test with a consistent suffix.

## What to Test for Every Endpoint

- [ ] Happy path: correct status code and response shape
- [ ] Response envelope and pagination metadata on lists
- [ ] Search, filter and sort parameters each change the result as expected
- [ ] Unauthenticated request is rejected (401)
- [ ] Authenticated user without permission is rejected (403)
- [ ] Missing record returns 404
- [ ] Each required field and each validation rule returns 422 with the field named
- [ ] Sensitive fields (passwords, tokens, secrets) never appear in the response
- [ ] Side effects happen: record persisted, event raised, notification or job queued

## What to Test in Units

- Valid input produces the expected result.
- Each business rule and branch, including boundaries (zero, empty, maximum, null).
- Invalid input or conflicting state fails with the expected error.
- Events, notifications and jobs are dispatched (or not) as intended.
- Values are transformed correctly (hashing, rounding, formatting, state transitions).

## Writing Good Tests

1. **Arrange, Act, Assert.** Set up data, perform one action, then assert. Keep the three parts visible.
2. **One behaviour per test.** Several assertions are fine if they describe the same behaviour.
3. **Independent and repeatable.** No test depends on another test's data or on run order.
4. **Build data with factories,** using named states for meaningful variations (admin, shipped, published). Create only the records the test needs.
5. **Assert on behaviour, not implementation.** Check outputs, responses and persisted state, not private method calls.
6. **Assert exact values and shapes,** not just "it did not crash".
7. **Parameterize repetitive cases** (each required field, each role, each status) with data sets instead of copy-pasted tests.
8. **Keep tests fast.** Slow suites stop being run.

## Database State

- Reset the database between tests so each starts clean (transaction rollback or re-migration).
- Use the slower full re-migration strategy only where transactions do not work (for example, tests that cross connections or run queued work).
- Never run tests against a shared or production database.

## Test Doubles

- Fake or mock anything outside your process: mail, notifications, queues, events (when asserting dispatch), payment gateways, third-party HTTP APIs, file storage.
- Never call real external services from the test suite.
- Test failure paths of external calls too: timeouts, error responses, invalid data. The app must fail gracefully with a clear error code.
- Do not mock the unit under test, and avoid mocking simple value objects.

## Naming

Write test names as sentences that describe behaviour, so a failing test reads as a bug report.

| Kind | Pattern | Example |
|---|---|---|
| Capability | "can ..." | can list users when authenticated |
| Response | "returns ..." | returns 403 when user lacks permission |
| Error | "throws ..." | throws a conflict error when email exists |
| Negative | "does not ..." | does not expose password in response |
| Unit behaviour | present tense verb | hashes the password before saving |

## Coverage

- Aim for more than 80% coverage on critical paths: authentication, authorization, billing and data mutations.
- Coverage is a signal, not a goal. A covered line with no meaningful assertion proves nothing.
- Every bug fix ships with a test that fails without the fix.

## Do / Don't

| Do | Don't |
|---|---|
| Write the test with the feature | Leave tests "for later" |
| Test authorization and validation failures | Test only the happy path |
| Use factories and data sets | Hard-code ids or share fixtures across tests |
| Fake external services | Hit real APIs, mail servers or payment gateways |
| Keep tests readable and short | Hide the important setup in deep helper chains |
| Run the full suite before merging | Merge with skipped or failing tests |
