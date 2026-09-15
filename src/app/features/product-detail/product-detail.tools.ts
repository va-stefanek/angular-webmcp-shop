import { EnvironmentProviders, inject, provideExperimentalWebMcpTools } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

/**
 * Route-scoped WebMCP tools: registered via this route's `providers` array in `app.routes.ts`
 * together with `withExperimentalAutoCleanupInjectors()` on the router. That combination is
 * what makes these tools exist only while a product detail page is open and disappear the
 * moment the shopper (or agent) navigates elsewhere — an agent can't call
 * "add_current_product_to_cart" from the cart page, because the tool simply isn't registered
 * there. Compare with `CATALOG_TOOL_PROVIDERS` (app-wide) and `CartService`'s tools (tied to a
 * singleton service) in the README.
 *
 * The current product id is read from `ActivatedRoute` inside `execute`, not captured at
 * registration time, so navigating between two product pages (`/product/a` -> `/product/b`)
 * without the route provider being torn down still resolves to the right product.
 *
 * As in catalog.tools.ts, each tool gets its own `provideExperimentalWebMcpTools([...])` call
 * so its `inputSchema` is inferred from an inline array literal rather than unified across tools.
 */
export const PRODUCT_DETAIL_TOOL_PROVIDERS: EnvironmentProviders[] = [
  provideExperimentalWebMcpTools([
    {
      name: 'view_current_product',
      description: "Get the full details of the product currently open in the shopper's browser tab.",
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => {
        const product = getCurrentProduct();
        if (!product) {
          return { isError: true, content: [{ type: 'text', text: 'No product is currently open.' }] };
        }
        return {
          content: [
            { type: 'text', text: `${product.name} (${product.id}) — $${product.price.toFixed(2)}\n${product.description}` },
          ],
          structuredContent: { product },
        };
      },
    },
  ]),

  provideExperimentalWebMcpTools([
    {
      name: 'add_current_product_to_cart',
      description: "Add the product currently open in the shopper's browser tab to the cart.",
      inputSchema: {
        type: 'object',
        properties: { quantity: { type: 'number', description: 'How many units to add. Defaults to 1.' } },
        additionalProperties: false,
      },
      execute: ({ quantity }) => {
        const product = getCurrentProduct();
        if (!product) {
          return { isError: true, content: [{ type: 'text', text: 'No product is currently open.' }] };
        }
        const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;
        inject(CartService).add(product.id, qty);
        return { content: [{ type: 'text', text: `Added ${qty} × "${product.name}" to the cart.` }] };
      },
    },
  ]),
];

function getCurrentProduct() {
  const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  return id ? inject(ProductService).getById(id) : undefined;
}
