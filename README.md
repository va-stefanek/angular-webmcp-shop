# Angular WebMCP Shop

A small ecommerce demo (catalog, cart, checkout) built to show how to integrate **WebMCP** into
an Angular application using Angular's own experimental support for it — not a UI showcase.

## What is WebMCP?

[WebMCP](https://github.com/webmachinelearning/webmcp) is a W3C Web Machine Learning Community
Group specification that lets a web page register **tools** — named, schema-described JavaScript
functions — that an AI agent can discover and call directly, instead of scraping the DOM or
driving the UI like a human would. A page calls `document.modelContext.registerTool(...)`; an
agent (a browser extension, or eventually the browser itself) calls `getTools()` and then invokes
whichever tool it needs.

Native browser support is very early: Chrome/Edge ship it behind
`chrome://flags/#enable-webmcp-testing`, with an origin trial from Chrome 149. This app installs
the [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) package (see
`src/app/core/webmcp-runtime.ts`) so every tool below works in any modern browser today — no flags
needed. It's a strict polyfill of the same `document.modelContext` API, so nothing here changes
once native support lands.

## Angular's WebMCP APIs

Angular (v22.1+) ships **experimental** first-class support for WebMCP in `@angular/core` and
`@angular/forms/signals`. These are thin, ergonomic wrappers around the browser API — they handle
dependency injection and automatic cleanup for you, but they still require the underlying
`document.modelContext` runtime to exist (native or polyfilled):

| API | Where it lives | What it's for |
|---|---|---|
| `provideExperimentalWebMcpTools(tools)` | `@angular/core` | Register one or more tools scoped to wherever the providers array lives (bootstrap, a route, a component) |
| `declareExperimentalWebMcpTool(tool)` | `@angular/core` | Register a single tool imperatively, e.g. from a service constructor; ties its lifetime to the current injector via `DestroyRef` |
| `provideExperimentalWebMcpForms()` | `@angular/forms/signals` | Opt every Signal Form into WebMCP registration |
| `experimentalWebMcpTool: { name, description }` | `form(...)` options | Auto-derives a tool + JSON Schema from a Signal Form's model and validators |
| `withExperimentalAutoCleanupInjectors()` | `@angular/router` | Required for route-level `providers` (and therefore route-scoped tools) to actually tear down when a route deactivates |

All of it is marked `@experimental` and the underlying spec is a Community Group draft — expect
the API surface to change. Every non-obvious behavior below was confirmed by reading the installed
`@angular/core` / `@angular/forms` source, not just the docs, because the docs and the shipped
implementation don't always agree at this stage (see the "gotchas" section).

## The four registration patterns, and when to reach for each

**1. App-wide tools — `src/app/core/catalog.tools.ts` + `app.config.ts`**
Stateless, read-only catalog lookups (`search_products`, `get_product_details`,
`list_categories`) that should be callable from any page, for the app's whole lifetime. Registered
once at bootstrap via `provideExperimentalWebMcpTools`.

**2. Service-level tools — `src/app/services/cart.service.ts`**
`CartService` is `providedIn: 'root'`, so it's instantiated exactly once; its constructor calls
`declareExperimentalWebMcpTool` for `add_to_cart`, `add_products_to_cart`, `remove_from_cart`,
`update_cart_item_quantity`, `view_cart`, and `clear_cart`. This is the right pattern for tools
that read/write a service's own state — and importantly, **never register a tool from a component
that can have more than one instance** (a list row, a repeated card): WebMCP throws if the same
tool name is registered twice.

**3. Route-scoped tools — `src/app/features/product-detail/product-detail.tools.ts` +
`app.routes.ts`**
The product detail route registers `view_current_product` and `add_current_product_to_cart` via
its own `providers` array. Combined with `withExperimentalAutoCleanupInjectors()` on
`provideRouter`, these tools exist **only while that page is open** — navigate to the cart and an
agent can no longer call `add_current_product_to_cart`, because it's genuinely unregistered, not
just hidden. Verified in the browser: the Agent Console's tool count goes from 8 → 10 on opening a
product page, and back to 8 on navigating away.

**4. Signal Forms — `src/app/features/checkout-page/checkout-page.ts`**
`provideExperimentalWebMcpForms()` (in `app.config.ts`) plus `experimentalWebMcpTool: { name,
description }` on a `form(...)` call registers `submit_checkout` with a JSON Schema **inferred
from the form's own validators** (`required`, `email`, `minLength`) — there's no separate schema
to keep in sync. Calling the tool fills every field, runs the same validation the UI would, and
invokes the same `submission.action` a manual form submit would.

## Shape tools around tasks, not around buttons

The easiest mistake is to mirror the UI one-to-one: one tool per button. Do that and an agent
inherits exactly the tedium a human has, which is why calling tools can feel pointlessly slow —
a single `search_products` round trip is genuinely slower than typing in the search box yourself.

The comparison that matters isn't *agent vs. human*, it's *agent with tools vs. agent without
them*. Without WebMCP an agent drives the page by screenshotting, guessing coordinates and
simulating clicks — slow, and brittle the moment the CSS changes. Filling this app's checkout
form that way took a dozen-plus round trips and several mis-clicks; `submit_checkout` does it in
one call, first try, with the real validation running.

Tools earn their keep where step count or expressiveness beats a human's mouse:

- **Batches** — `add_products_to_cart` takes a list, so "2 of each Audio product" is one call
  instead of nine clicks. Note it deliberately coexists with the single-item `add_to_cart`, and
  both descriptions say which to prefer; overlapping tools need that disambiguation written into
  the description, since it's all the model has to choose between them.
- **Queries the UI can't express** — "best rating-per-dollar in each category" has no filter and
  never will, because you can't anticipate every question. An agent composes them from structured
  results.
- **Multi-step flows** — search, add, then check out spans three screens for a human, one
  sentence for an agent.

Batch tools should also report **partial failure** rather than aborting: `add_products_to_cart`
adds every valid item and tells the caller which IDs it skipped, so one bad ID doesn't discard
the rest.

## The Agent Console

Every page has a "🤖 Agent Console" button (`src/app/shared/agent-console`). It calls
`document.modelContext.getTools()` / `executeTool()` — the exact same calls a real AI agent would
make — so you can inspect every currently-registered tool's schema and run it by hand, live, and
see the app's real state change (cart badge, form submission, etc.) as a result. It's a stand-in
for an agent, not part of the WebMCP spec: `executeTool` is a polyfill convenience for exactly this
kind of in-page testing.

## Gotchas found while building this (verified against source, not just docs)

- **Angular doesn't polyfill anything.** `declareExperimentalWebMcpTool` literally does
  `globalThis.document.modelContext ?? globalThis.navigator.modelContext` and silently returns if
  neither exists. Without `src/app/core/webmcp-runtime.ts` installing the polyfill before
  `bootstrapApplication`, every tool registration in this app would be a no-op.
- **`provideExperimentalWebMcpTools` infers one schema type for its whole array.** Passing several
  tools with different `inputSchema` shapes as a pre-declared `const` array breaks TypeScript's
  literal inference (you get `type: string` instead of `type: "object"`, then a confusing
  structural error). The fix used throughout this repo: one `provideExperimentalWebMcpTools([...])`
  call per tool, with the object literal written inline so contextual typing applies. Compare
  `catalog.tools.ts` (does this) with `cart.service.ts` (calls `declareExperimentalWebMcpTool`
  once per tool directly, which never has this problem).
- **`RegisteredTool.inputSchema` can be a JSON string OR a parsed object**, depending on the
  runtime/version (`@mcp-b/webmcp-types` documents this explicitly — it's mid-rollout in Chrome
  itself, not just a polyfill quirk). `agent-console.ts`'s `parseInputSchema()` branches on
  `typeof` for exactly this reason; don't assume either shape.
- **A Signal Form's WebMCP tool registers as soon as the component is created**, regardless of
  what your template conditionally renders. `checkout-page.ts` guards its `submission.action`
  against an empty cart explicitly — otherwise an agent could call `submit_checkout` on an empty
  cart before the "your cart is empty" UI branch would ever let a human do the same.
- **Angular does not validate a tool's arguments against its own `inputSchema` at runtime.** Every
  tool's `execute` in this app checks its inputs by hand (see `cart.service.ts`) rather than
  trusting the schema was honored.

## Running this app

Requires Node `^22.22.3 || ^24.15.0 || >=26.0.0` (see `.nvmrc`).

```bash
npm install
npm start      # ng serve, http://localhost:4200
npm test       # vitest
npm run build  # production build
```
