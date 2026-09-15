import { EnvironmentProviders, inject, provideExperimentalWebMcpTools } from '@angular/core';
import { ProductService } from '../services/product.service';

/**
 * App-wide WebMCP tools, registered once at bootstrap via `provideExperimentalWebMcpTools`
 * in `app.config.ts`. This is the right place for tools that are stateless from the caller's
 * perspective and should be available on every page — read-only catalog lookups here, as
 * opposed to `CartService`'s stateful tools (service-level pattern) or the product detail
 * route's page-scoped tool (route-level pattern). See the README for when to reach for each.
 *
 * Each tool gets its own `provideExperimentalWebMcpTools([...])` call, one array literal per
 * call. `provideExperimentalWebMcpTools` infers each tool's argument types from a *single*
 * shared type parameter for the whole array it's given, so mixing several differently-shaped
 * `inputSchema`s in one array defeats that inference — one tool per call sidesteps it entirely
 * and happens to keep each registration independently readable besides.
 *
 * `execute` runs inside the app's injection context, so it's safe to `inject()` services here
 * exactly as you would in a constructor.
 */
export const CATALOG_TOOL_PROVIDERS: EnvironmentProviders[] = [
  provideExperimentalWebMcpTools([
    {
      name: 'search_products',
      description:
        'Search the product catalog by free-text query and/or category. Returns id, name, price, ' +
        'rating and stock for each match — use get_product_details for the full description. ' +
        'Also updates the catalog page\'s own search box and category filter, if it is open.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Free-text search across product name and description.' },
          category: { type: 'string', description: 'Exact category name, e.g. "Audio" or "Home".' },
        },
        additionalProperties: false,
      },
      execute: ({ query, category }) => {
        // Writing to the same signals the catalog page reads (ProductService.filterQuery /
        // filterCategory) is what makes this call move the on-screen search box and category
        // pills — not just return text to the caller. See ProductService for the shared state.
        const productService = inject(ProductService);
        productService.setFilter(query, category);
        const products = productService.filteredProducts();
        if (products.length === 0) {
          return { content: [{ type: 'text', text: 'No products matched.' }] };
        }
        const lines = products.map(
          (p) => `- ${p.id}: ${p.name} — $${p.price.toFixed(2)} (${p.category}, ★${p.rating}, ${p.stock} in stock)`,
        );
        return {
          content: [{ type: 'text', text: `Found ${products.length} product(s):\n${lines.join('\n')}` }],
          structuredContent: { products },
        };
      },
    },
  ]),

  provideExperimentalWebMcpTools([
    {
      name: 'get_product_details',
      description: 'Get the full details of a single product by its product ID.',
      inputSchema: {
        type: 'object',
        properties: { productId: { type: 'string', description: 'The product ID, e.g. "aurora-headphones".' } },
        required: ['productId'],
        additionalProperties: false,
      },
      execute: ({ productId }) => {
        const product = inject(ProductService).getById(productId);
        if (!product) {
          return { isError: true, content: [{ type: 'text', text: `No product found with ID "${productId}".` }] };
        }
        return {
          content: [
            {
              type: 'text',
              text:
                `${product.name} (${product.id})\n` +
                `Category: ${product.category}\nPrice: $${product.price.toFixed(2)}\n` +
                `Rating: ★${product.rating}\nStock: ${product.stock}\n\n${product.description}`,
            },
          ],
          structuredContent: { product },
        };
      },
    },
  ]),

  provideExperimentalWebMcpTools([
    {
      name: 'list_categories',
      description: 'List every product category available in the store.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => {
        const categories = inject(ProductService).categories();
        return { content: [{ type: 'text', text: categories.join(', ') }], structuredContent: { categories } };
      },
    },
  ]),
];
