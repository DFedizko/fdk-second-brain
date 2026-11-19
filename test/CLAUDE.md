# Testing guide

The test runner's own rules (globals, imports, spies, time) are in [`TECHNOLOGIES.md`](../TECHNOLOGIES.md#test-tooling).

Every rule from the root `CLAUDE.md` applies to test code too: at most 300 lines per file, identifiers of at most 30 characters, no magic values, no comments, no `for` / `while` loops.

## TDD: no production code without a failing test first

Follow Kent Beck's cycle on every change, however small:

1. **Red:** write one test for the next behaviour and run it. It must fail, and for the expected reason.
2. **Green:** write the least production code that makes it pass.
3. **Refactor:** clean up the code and the test while everything stays green.

Never write or change production code that a failing test doesn't require. A bug fix starts with a test that reproduces the bug.

## Folder structure mirrors `src/`

`test/` has exactly the same folders as `src/`. The test level goes in the file name, not in the folders:

```
src/application/use-cases/save-note.ts
test/application/use-cases/save-note.unit.test.ts
test/application/use-cases/save-note.int.test.ts

src/adapters/inbound/mcp/mcp-server.ts
test/adapters/inbound/mcp/mcp-server.e2e.test.ts
```

Run one level by filtering on its suffix (the exact commands are in [`TECHNOLOGIES.md`](../TECHNOLOGIES.md)).

## Test doubles live in a folder next to the test

Constructors take ports, so every collaborator can be swapped for a double. Every double goes in a folder named after its kind, next to the test that uses it:

| Folder       | Kind  | Use it for                                                                         |
| ------------ | ----- | ---------------------------------------------------------------------------------- |
| `__dummy__/` | Dummy | Filling a parameter the test doesn't care about                                    |
| `__stub__/`  | Stub  | Returning fixed answers                                                            |
| `__spy__/`   | Spy   | Recording calls so the test can assert on them                                     |
| `__mock__/`  | Mock  | Pre-programmed expectations, verified by the double itself                         |
| `__fake__/`  | Fake  | A working, simplified implementation of a port (e.g. an in-memory note repository) |

```
test/application/use-cases/
  save-note.unit.test.ts
  __fake__/in-memory-note-repo.ts
  __stub__/fixed-clock.ts
```

When several folders share a double, put it in the nearest common parent folder, still inside the matching `__kind__/` folder. Doubles implement the real port interface, so the compiler catches any drift.

## FIRST

- **Fast:** unit tests touch no network, disk or real clock.
- **Independent:** no test depends on another test's state or on run order. Build fresh state in each test.
- **Repeatable:** same result on every machine, every run. Inject time, randomness and IDs through ports.
- **Self-validating:** pass or fail through assertions only. No logs to read.
- **Timely:** written before the production code (see TDD above).

## AAA: Arrange, Act, Assert

Each test has three blocks in this order, separated by a blank line, with no comments. **Act** is a single call. Assert one behaviour per test. Test names describe the behaviour, e.g. `"rejects a path outside the notes folder"`.

## The test pyramid

| Level       | Suffix          | How many | What it covers                                                                                                                         | Doubles                                                    |
| ----------- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Unit        | `.unit.test.ts` | Most     | Domain and use cases, one class at a time                                                                                              | Every port is a double                                     |
| Integration | `.int.test.ts`  | Some     | The main flows through real adapters, and the errors that only appear at the integration boundary (bad responses, conflicts, timeouts) | Real local infrastructure; external APIs faked (see below) |
| E2E         | `.e2e.test.ts`  | Few      | The app from the outside: real MCP tool calls and HTTP requests against the composed application                                       | Only external APIs are faked                               |

For each feature's e2e tests, cover the happy path, then add whatever else proves the feature works from the client's point of view. Decide per feature: auth failures, invalid input, and conflict responses are common candidates.

## Real adapters vs. fakes

- **Infrastructure we run** (database, MCP server, HTTP server, queue): use the real adapter in integration and e2e tests, against a local instance started by the test.
- **External APIs we don't own** (e.g. a code-hosting, payment or AI provider): never call them in tests. Build a high-fidelity fake adapter, combined with strongly typed mocks, that behaves as close to the real API as possible: same response shapes, status codes, headers and error bodies.
  - Before you write or change an integration, **look up the API's latest official documentation**.
  - Take the exact request and response types and example payloads from it. Prefer the provider's official type package when one exists.
  - Cover the documented errors too, not only success.
  - A short comment naming the docs URL and the date you checked them is allowed in the fake, as it records a decision.
