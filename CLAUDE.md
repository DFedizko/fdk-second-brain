# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project, stack and commands

Read [`TECHNOLOGIES.md`](TECHNOLOGIES.md) first. It describes what this project is, the chosen technologies and libraries, and the commands to install, test, typecheck and run. Use only the technologies it lists as decided; propose anything new to the user before adding it.

## Tests

**Strict TDD (Kent Beck): never write production code without a failing test written first.** Red → green → refactor.

Before writing or changing any test, read [`test/CLAUDE.md`](test/CLAUDE.md). It covers the TDD cycle, the folder layout, test doubles, FIRST, AAA, the test pyramid, and real adapters vs. fakes.

## Architecture: hexagonal (ports and adapters)

The core must not know about any communication protocol (MCP, HTTP, queues), any infrastructure or any library. It has to keep working if the protocol or the infrastructure is swapped.

```
src/
  domain/          entities, value objects, domain errors (pure TypeScript, no imports from outside domain/)
  application/
    ports/         interfaces the use cases depend on (e.g. OrderRepository, PaymentGateway, Clock)
    use-cases/     one class per use case (e.g. PlaceOrder, CancelOrder); depend only on domain and ports
  adapters/
    inbound/       drive the use cases: MCP tools, HTTP routes, CLI commands, queue consumers
    outbound/      implement ports: database repositories, external API clients, etc.
  main/            composition root: bootstrap, environment validation, root DI container
  shared/          code used by more than one part of the app
    domain/        shared value objects, domain errors and constants (pure, no libraries)
    contracts/     shared interfaces and types: common port interfaces, DTOs, result types (pure, no libraries)
    adapters/      adapters reused by several modules (e.g. an HTTP client, a logger)
```

All production code lives in `src/`. Code goes into `shared/` only when more than one part of the app uses it; otherwise it stays next to its only user. `shared/` follows the same dependency rule: `shared/domain` and `shared/contracts` import no libraries and nothing outside themselves. Any layer may use them. Only adapters and `main/` may use `shared/adapters`.

Dependency direction: `adapters → application → domain`. Never the reverse. Concrete classes are wired together only by the dependency-injection containers, which live in outer layers next to the module they wire, each with its own symbols file beside it. The details are in `TECHNOLOGIES.md`. Configuration (environment variables) is validated once at bootstrap and injected; no class reads the environment directly. Inbound adapters translate protocol input into use-case input and use-case output back into the protocol's format. They contain no business rules.

## Code rules

- **Dependency inversion always.** Classes receive their collaborators through the constructor, typed by a port interface. Never `new` a concrete dependency inside a class.
- **OOP first.** Model behaviour with classes. Use standalone functions only for small, specific cases, such as a pure helper with no state.
- **SOLID.** In particular: one responsibility per class, small focused interfaces, and extend by adding new adapters, not by editing use cases.
- **No generator functions** (`function*`, `yield`) unless there's no reasonable alternative.
- **No `for` / `while` loops.** Use array methods: `map`, `filter`, `reduce`, `forEach`, `some`, `every`, `find`, `flatMap`, `Promise.all`.
- **Extract logic into declarative private methods** named with an imperative verb (`buildSearchQuery`, `rejectInvalidPath`). The callback of a loop method that does more than one trivial expression becomes its own named method.
- **At most 300 lines per file**, and each file has a single responsibility. Split before you reach the limit.
- **No magic numbers or strings.** Name them as `UPPER_SNAKE_CASE` constants (`MAX_SEARCH_RESULTS`, `NOTE_EXTENSION`).
- **No comments.** The code must explain itself through names. A comment is allowed only, and rarely, to explain a *decision* (why), never what the code does.
- **Identifiers have at most 30 characters**: variables, functions, classes, interfaces, constants and files.
