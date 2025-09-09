# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

> **All development work and commands must be run from the `/convex` directory.**
>
> All source code and tests are in `src/convex`.

### Package Management

**Important**: Use **Bun** for all package management and scripts.  
Do **not** use pnpm or npm.

- `bun install` — Install dependencies
- `bun add <package>` — Add a new dependency
- `bun remove <package>` — Remove a dependency

### Build and Run

- `bun run build` — Build the project for production (outputs to `./dist`)
- `bun run start` — Run the application in production mode

> ⚠️ **DO NOT USE**: There is no `dev` mode. Never run a development server during development.  
> Use tests to validate code, not a running dev server.

### Code Quality

- `bun run format` — Format code (typically runs dprint or equivalent)
- `bun run typecheck` — Run TypeScript type checking (no emit)
- `bun run lint` — Run ESLint on all TypeScript/JavaScript files
- `bun run lint:fix` — Run ESLint with automatic fixes

### Testing

- `bun run test` — Run all tests once
- `bun run test:watch` — Run tests in watch mode
- Uses Vitest as the test runner
- Test files: `src/convex/**/*.test.ts`

**CRITICAL DEVELOPMENT RULE**: After EVERY file change in `src/convex`, you MUST:

1. Run `bun run format` immediately
2. Run `bun run typecheck` immediately
3. Fix **ALL** formatting, lint, and type errors before proceeding
4. Do **NOT** continue development until both commands pass without errors

This is non-negotiable and applies to every single file modification.

### Directory Structure

- All code and tests: `src/convex/`
- Main entry point: `src/convex/index.ts`
- Run all commands from the `/convex` directory

### Documentation

> **Document only modules and services.**  
> Use standard JSDoc for all public modules and services.

- Each exported function, class, or constant in a module/service **must** have a JSDoc block with:
  - `@category` — The category of the module/service (e.g., Domain Service, Repository, Utility)
  - `@since` — The version the API was introduced (e.g., 0.1.0)
  - `@example` — At least one runnable example demonstrating real usage

---

## Project Architecture

### Technology Stack

- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript with ES2022 target
- **Module System**: ESNext with bundler module resolution

### Code Style and Linting

- Strict ESLint configuration
- Uses a formatter (dprint or Prettier) via an ESLint rule
- Import sorting and destructuring key sorting enforced
- Line width: 120 characters, 2-space indentation
- ASI (Automatic Semicolon Insertion) style, double quotes, no trailing commas

### TypeScript Configuration

- Strict mode enabled with bundler module resolution
- Allows importing `.ts` extensions (Bun runtime feature)
- No emit configuration (build handled by Bun runtime)
- Incremental compilation with build info caching for faster type checking

### Project Structure

- `src/convex/` — Source code directory (all code lives here)
- `src/convex/index.ts` — Main entry point
- Single-file project structure currently (expandable)

---

## Development Workflow — Spec-Driven Development

This project follows a **spec-driven development** approach where every feature is thoroughly specified before implementation.

**CRITICAL RULE: NEVER IMPLEMENT WITHOUT FOLLOWING THE COMPLETE SPEC FLOW**

### Mandatory Workflow Steps

**AUTHORIZATION PROTOCOL**: Before proceeding to any phase (2-5), you MUST:

1. Present the completed work from the current phase
2. Explicitly ask for user authorization to proceed
3. Wait for clear user approval before continuing
4. NEVER assume permission or proceed automatically

### Phase-by-Phase Process

**Phase 1**: Create `instructions.md` (initial requirements capture)

- Create feature folder and capture user requirements
- Document user stories, acceptance criteria, constraints

**Phase 2**: Derive `requirements.md` from instructions — **REQUIRES USER APPROVAL**

- Structured analysis of functional/non-functional requirements
- STOP and ask for authorization before proceeding to Phase 3

**Phase 3**: Create `design.md` from requirements — **REQUIRES USER APPROVAL**

- Technical design and implementation strategy
- STOP and ask for authorization before proceeding to Phase 4

**Phase 4**: Generate `plan.md` from design — **REQUIRES USER APPROVAL**

- Implementation roadmap and task breakdown
- STOP and ask for authorization before proceeding to Phase 5

**Phase 5**: Execute implementation — **REQUIRES USER APPROVAL**

- Follow the plan exactly as specified
- NEVER start implementation without explicit user approval

### Specification Structure

#### Feature Directory Listing

**File**: `specs/README.md`

- **Purpose**: Simple directory listing of all features with completion status
- **Content**: Checkbox list with feature links and brief descriptions
- **Format**: `- [x] **[feature-name](./feature-name/)** - Brief feature description`
- **Keep Simple**: No detailed documentation, just directory navigation
- **Update**: Add new features as single line entries when created

#### Individual Feature Documentation

For each feature, create a folder `specs/[feature-name]/` containing:

#### 1. `instructions.md`

- **Purpose**: Capture initial feature requirements and user stories
- **Content**: Raw requirements, use cases, acceptance criteria
- **When**: Created first when a new feature is requested

#### 2. `requirements.md`

- **Purpose**: Detailed, structured requirements derived from instructions
- **Content**: Functional/non-functional requirements, constraints, dependencies
- **When**: Created after analyzing instructions.md

#### 3. `design.md`

- **Purpose**: Technical design and implementation strategy
- **Content**: Architecture decisions, API design, data models, error handling, operational concerns
- **When**: Created after requirements are finalized

#### 4. `plan.md`

- **Purpose**: Implementation plan and progress tracking
- **Content**: Task breakdown, development phases, progress updates, blockers/issues
- **When**: Created from design.md, updated throughout implementation

### File Templates

Each specification file should follow consistent templates:

- Include clear headings and structure
- Reference related specifications when applicable
- Maintain traceability from instructions → requirements → design → plan
- Update files as understanding evolves

### Best Practices

- **One feature per spec folder**: Keep features focused and manageable
- **Iterative refinement**: Specs can evolve but major changes should be documented
- **Cross-reference**: Link between instruction/requirement/design/plan files
- **Progress tracking**: Update plan.md regularly during implementation
- **Reliability-first design**: Consider robust error handling and clear failure modes in design phase
- **Ask clarifyng questions**: Ask as many questions as needed to develop a proper spec you can work with

---

### Problem-Solving Strategy

- **Break Down**: Split complex problems into smaller, manageable parts
- **Validate Frequently**: Run tests and type checks often during development
- **Simplest Solution**: Choose the simplest approach that meets requirements
- **Clarity Over Cleverness**: Prioritize readable, maintainable code

## Notes

- Vitest configured for unit and integration testing
- Project set up with Convex persistence
- Comprehensive implementation patterns documented for consistency and reusability
---

## Style Guide

### General Principles

- **Prefer Composition Over Inheritance**  
  Build functionality by composing small, focused functions and modules. Avoid class inheritance hierarchies; instead, use higher-order functions, closures, and module composition to share and extend behavior.

- **Immutability by Default**  
  - All data structures (objects, arrays, etc.) must be treated as immutable.
  - Use `const` for all variable declarations.
  - Use `readonly` in TypeScript types and interfaces to enforce immutability at compile time.
  - Never mutate function arguments or shared state.

- **Functional, Composable, and Lazy**  
  - Write pure functions whenever possible.
  - Favor function composition and point-free style for building complex logic from simple parts.
  - Use lazy evaluation (e.g., generators, thunks) for expensive or deferred computations.
  - Avoid side effects except at the boundaries (I/O, API calls, etc.).

- **Promise Chains: Simple and Readable**  
  - Build asynchronous flows using clear, linear Promise chains.
  - Avoid deeply nested callbacks or complex async/await logic.
  - Each `.then` should do one thing; chain for clarity.
  - Always handle errors explicitly with `.catch` or equivalent.

- **Declarative Over Imperative**  
  - Express logic in terms of *what* should happen, not *how*.
  - Use array methods (`map`, `filter`, `reduce`, etc.) and functional utilities instead of manual loops and mutation.

### TypeScript Practices

- Use `readonly` for all properties in interfaces and types.
- Prefer type aliases and interfaces for data modeling; avoid classes.
- Use union and intersection types for flexible, composable data structures.
- **All types (validations) should be defined as:**
  ```typescript
  const Type = validator
  export type Type = Readonly<typeof Type.type>
  ```
  in modules that provide both the type and methods to operate on it (typeclass-style).

---

### Example: Functional, Immutable, Composable

#### 1. Immutable Data Modeling

```typescript
// Domain types are readonly and created via pure constructors
export type UserId = Readonly<{ readonly value: string }>
export type User = Readonly<{
  readonly id: UserId
  readonly firstName: string
  readonly lastName: string
  readonly active: boolean
}>

export const createUserId = (value: string): UserId => ({ value }) as const

export const createUser = (params: {
  id: string
  firstName: string
  lastName: string
}): User =>
  Object.freeze({
    id: createUserId(params.id),
    firstName: params.firstName,
    lastName: params.lastName,
    active: false,
  })

// Usage (no mutation):
const u = createUser({ id: "u_1", firstName: "Ada", lastName: "Lovelace" })
// u.active = true // <- Type error (readonly), and Object.freeze prevents runtime mutation
```

#### 2. Pure Functions and Composition

```typescript
// Small, single-purpose pure functions
export const fullName = (user: User): string => `${user.firstName} ${user.lastName}`
export const activate = (user: User): User => ({ ...user, active: true } as const)
export const toGreeting = (name: string): string => `Hello, ${name}!`

// Minimal compose utility for left-to-right composition
export const pipe = <A>(a: A, ...fns: Array<(x: any) => any>) =>
  fns.reduce((acc, fn) => fn(acc), a) as unknown

// Compose behaviors declaratively
const greeting = pipe(createUser({ id: "u_2", firstName: "Grace", lastName: "Hopper" }), activate, fullName, toGreeting)
// => "Hello, Grace Hopper!"
```

#### 4. Promise Chains: Simple and Readable

```typescript
// Clear, linear async flow with explicit error handling
const fetchJson = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<unknown>
  })

const getUser = (id: string) => fetchJson(`/api/users/${id}`)
const getPosts = (userId: string) => fetchJson(`/api/users/${userId}/posts`)
const summarize = (user: any, posts: any[]) => ({
  user: { id: user.id, name: `${user.firstName} ${user.lastName}` },
  postCount: posts.length,
})

getUser("u_3")
  .then((user: any) =>
    getPosts(user.id).then((posts: any[]) => summarize(user, posts)),
  )
  .then((summary) => console.log("summary", summary))
  .catch((err) => console.error("failed", err))
```

#### 5. Declarative Transformations

```typescript
// Express intent with array methods instead of manual loops
const amounts = [10, 25, 30, 5]

const result = amounts
  .filter((n) => n >= 10) // keep valid amounts
  .map((n) => ({ gross: n, net: Math.round(n * 0.9) })) // apply 10% fee
  .reduce(
    (acc, x) => ({
      totalGross: acc.totalGross + x.gross,
      totalNet: acc.totalNet + x.net,
    }),
    { totalGross: 0, totalNet: 0 },
  )

// result => { totalGross: 65, totalNet: 59 }
```

#### 6. Discriminated Union Validator (Convex `v`) + ADTs and Thunks

```typescript
import { v } from "convex/values"
import type { Validator } from "convex/values"
import { pipe } from "effect/Function"

// Date format atom
export type DateFmt = "yyyy" | "yyyymm" | "yyyymmdd"

/**
 * Convex validator for Tracker objects.
 *
 * Validates all tracker variants using discriminated union pattern.
 *
 * @category Validators
 * @since 0.1.0
 */
export const Tracker = v.union(
  v.object({
    kind: v.literal("SimpleCounter"),
    key: v.string(),
    locationId: v.optional(v.id("locations")),
    lastIssuedAt: v.optional(v.number()),
    currentValue: v.number(),
    padLength: v.number(),
  }),
  v.object({
    kind: v.literal("PrefixedCounter"),
    key: v.string(),
    locationId: v.optional(v.id("locations")),
    lastIssuedAt: v.optional(v.number()),
    currentValue: v.number(),
    prefix: v.string(),
    padLength: v.number(),
  }),
  v.object({
    kind: v.literal("SuffixedCounter"),
    key: v.string(),
    locationId: v.optional(v.id("locations")),
    lastIssuedAt: v.optional(v.number()),
    currentValue: v.number(),
    suffix: v.string(),
    padLength: v.number(),
  }),
  v.object({
    kind: v.literal("WrappedCounter"),
    key: v.string(),
    locationId: v.optional(v.id("locations")),
    lastIssuedAt: v.optional(v.number()),
    currentValue: v.number(),
    prefix: v.string(),
    suffix: v.string(),
    padLength: v.number(),
  }),
  v.object({
    kind: v.literal("PrefixedDate"),
    key: v.string(),
    locationId: v.optional(v.id("locations")),
    lastIssuedAt: v.optional(v.number()),
    currentValue: v.number(),
    type: v.union(
      v.literal("yyyy"),
      v.literal("yyyymm"),
      v.literal("yyyymmdd"),
    ) as Validator<DateFmt>,
    separator: v.string(),
    padLength: v.number(),
  }),
  v.object({
    kind: v.literal("OnlyDate"),
    key: v.string(),
    locationId: v.optional(v.id("locations")),
    lastIssuedAt: v.optional(v.number()),
    currentValue: v.number(),
    type: v.union(
      v.literal("yyyy"),
      v.literal("yyyymm"),
      v.literal("yyyymmdd"),
    ) as Validator<DateFmt>,
  }),
)

/**
 * Tracker type representing all supported tracker variants.
 *
 * A discriminated union of tracker patterns for serial number generation.
 * Each variant has a different formatting strategy and optional features.
 *
 * @category Types
 * @since 0.1.0
 */
export type Tracker = Readonly<typeof Tracker.type>

// --- ADT Constructors (smart constructors for each variant) ---

export const makeSimpleCounter = (args: {
  key: string
  currentValue: number
  padLength: number
  locationId?: string
  lastIssuedAt?: number
}): Tracker => ({
  kind: "SimpleCounter",
  key: args.key,
  locationId: args.locationId ? ({ _id: args.locationId } as any) : undefined,
  lastIssuedAt: args.lastIssuedAt,
  currentValue: args.currentValue,
  padLength: args.padLength,
} as const)

export const makePrefixedCounter = (args: {
  key: string
  currentValue: number
  padLength: number
  prefix: string
  locationId?: string
  lastIssuedAt?: number
}): Tracker => ({
  kind: "PrefixedCounter",
  key: args.key,
  locationId: args.locationId ? ({ _id: args.locationId } as any) : undefined,
  lastIssuedAt: args.lastIssuedAt,
  currentValue: args.currentValue,
  prefix: args.prefix,
  padLength: args.padLength,
} as const)

export const makeSuffixedCounter = (args: {
  key: string
  currentValue: number
  padLength: number
  suffix: string
  locationId?: string
  lastIssuedAt?: number
}): Tracker => ({
  kind: "SuffixedCounter",
  key: args.key,
  locationId: args.locationId ? ({ _id: args.locationId } as any) : undefined,
  lastIssuedAt: args.lastIssuedAt,
  currentValue: args.currentValue,
  suffix: args.suffix,
  padLength: args.padLength,
} as const)

export const makeWrappedCounter = (args: {
  key: string
  currentValue: number
  padLength: number
  prefix: string
  suffix: string
  locationId?: string
  lastIssuedAt?: number
}): Tracker => ({
  kind: "WrappedCounter",
  key: args.key,
  locationId: args.locationId ? ({ _id: args.locationId } as any) : undefined,
  lastIssuedAt: args.lastIssuedAt,
  currentValue: args.currentValue,
  prefix: args.prefix,
  suffix: args.suffix,
  padLength: args.padLength,
} as const)

export const makePrefixedDate = (args: {
  key: string
  currentValue: number
  padLength: number
  type: DateFmt
  separator: string
  locationId?: string
  lastIssuedAt?: number
}): Tracker => ({
  kind: "PrefixedDate",
  key: args.key,
  locationId: args.locationId ? ({ _id: args.locationId } as any) : undefined,
  lastIssuedAt: args.lastIssuedAt,
  currentValue: args.currentValue,
  type: args.type,
  separator: args.separator,
  padLength: args.padLength,
} as const)

export const makeOnlyDate = (args: {
  key: string
  currentValue: number
  type: DateFmt
  locationId?: string
  lastIssuedAt?: number
}): Tracker => ({
  kind: "OnlyDate",
  key: args.key,
  locationId: args.locationId ? ({ _id: args.locationId } as any) : undefined,
  lastIssuedAt: args.lastIssuedAt,
  currentValue: args.currentValue,
  type: args.type,
} as const)

// --- Lazy (thunked) formatting helpers using pipe ---

const pad = (n: number, width: number) => n.toString().padStart(width, "0")

const formatDateBy = (fmt: DateFmt) => (d: Date): string =>
  fmt === "yyyy"
    ? `${d.getUTCFullYear()}`
    : fmt === "yyyymm"
      ? `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}`
      : `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`

export const nextValueThunk = (tracker: Tracker): (() => string) => {
  const nowThunk = () => new Date()
  const paddedThunk = (n: number, width: number) => () => pad(n, width)

  switch (tracker.kind) {
    case "SimpleCounter":
      return () => paddedThunk(tracker.currentValue + 1, tracker.padLength)()
    case "PrefixedCounter":
      return () => `${tracker.prefix}${paddedThunk(tracker.currentValue + 1, tracker.padLength)()}`
    case "SuffixedCounter":
      return () => `${paddedThunk(tracker.currentValue + 1, tracker.padLength)()}${tracker.suffix}`
    case "WrappedCounter":
      return () => `${tracker.prefix}${paddedThunk(tracker.currentValue + 1, tracker.padLength)()}${tracker.suffix}`
    case "PrefixedDate":
      return () =>
        pipe(
          nowThunk(),
          formatDateBy(tracker.type),
          (dateStr) => `${tracker.prefix ?? ""}${dateStr}${tracker.separator}${paddedThunk(tracker.currentValue + 1, tracker.padLength)()}`,
        )
    case "OnlyDate":
      return () =>
        pipe(
          nowThunk(),
          formatDateBy(tracker.type),
        )
  }
}

// Usage (lazy):
const t = makePrefixedCounter({ key: "order", currentValue: 41, padLength: 4, prefix: "ORD-" })
const compute = nextValueThunk(t) // no work yet
console.log(compute()) // performs formatting now, e.g. "ORD-0042"
```
