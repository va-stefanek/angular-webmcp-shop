# Aurora Goods — baseline branch (no WebMCP)

This is the **control group** for the WebMCP demo on `master`. Same Angular 22 app, same
catalog, cart and checkout, same UI — with every trace of WebMCP removed. Nothing here registers
a tool, so an AI agent has only one way in: look at the screen and click, exactly like a person.

Use it to answer the question the WebMCP demo keeps provoking — *"couldn't the agent just do this
itself?"* — by making it actually try.

## What was removed relative to `master`

| Removed | Was |
|---|---|
| `src/app/core/catalog.tools.ts` | App-wide `search_products` / `get_product_details` / `list_categories` |
| `src/app/core/webmcp-runtime.ts` | Installed `@mcp-b/webmcp-polyfill` before bootstrap |
| `src/app/features/product-detail/product-detail.tools.ts` | Route-scoped tools for the open product |
| `src/app/shared/agent-console/` | In-app panel for inspecting and running registered tools |
| Tool registrations in `cart.service.ts` | `add_to_cart`, `add_products_to_cart`, `view_cart`, … |
| `experimentalWebMcpTool` in `checkout-page.ts` | Auto-generated `submit_checkout` from Signal Forms |
| `provideExperimentalWebMcpForms()`, tool providers, `withExperimentalAutoCleanupInjectors()` | Wiring in `app.config.ts` / `app.routes.ts` |
| `@mcp-b/webmcp-polyfill`, `@mcp-b/webmcp-types` | Dependencies |

Deliberately **kept**: the shared filter state in `ProductService`. That's ordinary Angular
architecture, not a WebMCP concession — keeping it makes the two branches differ only by the
agent integration, which is the whole point of a control group.

## Running both side by side

The comparison only lands if both versions are up at once. From two checkouts of this repo:

```bash
# terminal 1 — WebMCP version
git switch master && npm install && ng serve --port 4500

# terminal 2 — this baseline (use a git worktree to avoid a second clone)
git worktree add ../aurora-baseline no-webmcp
cd ../aurora-baseline && npm install && ng serve --port 4600
```

Then give an agent the same task against each and compare what it takes:

> Add 2 of each Audio product to the cart, then check out as Ada Lovelace,
> ada@example.com, 123 Analytical Engine Way, London, SW1A.

On `master` that's roughly three tool calls with validated, structured arguments. Here the agent
has to screenshot the page, find each control by eye, guess coordinates, click, verify, scroll,
navigate, type into five form fields, and re-check its own work after every step — far more round
trips, and each one is a chance to mis-click or misread. Watch especially what happens when a
field is below the fold, or when the click lands a few pixels off.

That gap — not raw speed on a single lookup — is the argument for WebMCP.
