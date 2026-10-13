import { Injectable, computed, declareExperimentalWebMcpTool, inject, signal } from '@angular/core';
import { CartItem } from '../models/product.model';
import { ProductService } from './product.service';

/**
 * WebMCP tools are registered here, in the service's constructor, rather than in a component.
 * This is Angular's "service-level dynamic registration" pattern: `CartService` is
 * `providedIn: 'root'`, so it is instantiated exactly once, which keeps `registerTool()` from
 * ever being called twice with the same tool name (WebMCP throws if a name collides).
 * Never register tools from a component that can be created more than once (e.g. one instance
 * per list row) — use a route-scoped or app-scoped provider instead.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly productService = inject(ProductService);

  private readonly _items = signal<CartItem[]>([]);
  readonly items = this._items.asReadonly();

  readonly itemCount = computed(() => this._items().reduce((sum, item) => sum + item.quantity, 0));

  readonly subtotal = computed(() =>
    this._items().reduce((sum, item) => {
      const product = this.productService.getById(item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0),
  );

  constructor() {
    declareExperimentalWebMcpTool({
      name: 'view_cart',
      description: "Read the shopper's current cart: line items, quantities, and the subtotal.",
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => ({ content: [{ type: 'text', text: this.describeCart() }] }),
    });

    declareExperimentalWebMcpTool({
      name: 'add_to_cart',
      description:
        'Add a single product to the cart by its product ID. Increases quantity if already present. ' +
        'To add several different products, use add_products_to_cart instead of calling this repeatedly.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'The product ID, e.g. "aurora-headphones".' },
          quantity: { type: 'number', description: 'How many units to add. Defaults to 1.' },
        },
        required: ['productId'],
        additionalProperties: false,
      },
      execute: ({ productId, quantity }) => {
        const qty = typeof quantity === 'number' && quantity > 0 ? Math.floor(quantity) : 1;
        const product = this.productService.getById(String(productId));
        if (!product) {
          return { isError: true, content: [{ type: 'text', text: `No product found with ID "${productId}".` }] };
        }
        this.add(product.id, qty);
        return {
          content: [{ type: 'text', text: `Added ${qty} × "${product.name}" to the cart. ${this.describeCart()}` }],
        };
      },
    });

    /**
     * The tool worth designing for: one call replaces a whole sequence of UI interactions
     * ("add 2 of each of the three Audio products" = 6 clicks across the catalog, or 1 call).
     * Tools should be shaped around the *task* an agent is asked to perform, not around the
     * individual buttons a human happens to click — mirroring the UI one-to-one gives agents
     * the same tedium a human has, which is most of why calling tools can feel pointlessly slow.
     *
     * Partial failure is reported rather than aborting the whole batch: an unknown ID shouldn't
     * discard the items that were valid, but the agent still needs to know what didn't land.
     */
    declareExperimentalWebMcpTool({
      name: 'add_products_to_cart',
      description:
        'Add several products to the cart in one call. Each entry takes a productId and an optional ' +
        'quantity. Prefer this over repeated add_to_cart calls whenever adding more than one product.',
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'The products to add.',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string', description: 'The product ID, e.g. "aurora-headphones".' },
                quantity: { type: 'number', description: 'How many units to add. Defaults to 1.' },
              },
              required: ['productId'],
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
      execute: ({ items }) => {
        if (!Array.isArray(items) || items.length === 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'items must be a non-empty array of { productId, quantity }.' }],
          };
        }

        const added: string[] = [];
        const skipped: string[] = [];

        for (const item of items) {
          const product = this.productService.getById(String(item?.productId ?? ''));
          if (!product) {
            skipped.push(String(item?.productId ?? '(missing productId)'));
            continue;
          }
          const qty = typeof item?.quantity === 'number' && item.quantity > 0 ? Math.floor(item.quantity) : 1;
          this.add(product.id, qty);
          added.push(`${qty} × ${product.name}`);
        }

        if (added.length === 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: `No product IDs matched: ${skipped.join(', ')}.` }],
          };
        }

        const skippedNote = skipped.length > 0 ? ` Skipped unknown product IDs: ${skipped.join(', ')}.` : '';
        return {
          content: [{ type: 'text', text: `Added ${added.join(', ')}.${skippedNote}\n\n${this.describeCart()}` }],
        };
      },
    });

    declareExperimentalWebMcpTool({
      name: 'update_cart_item_quantity',
      description: 'Set the quantity of a product already in the cart. Setting quantity to 0 removes it.',
      inputSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string', description: 'The product ID to update.' },
          quantity: { type: 'number', description: 'The new quantity (0 removes the item).' },
        },
        required: ['productId', 'quantity'],
        additionalProperties: false,
      },
      execute: ({ productId, quantity }) => {
        if (typeof quantity !== 'number' || quantity < 0) {
          return { isError: true, content: [{ type: 'text', text: 'quantity must be a number >= 0.' }] };
        }
        const found = this._items().some((item) => item.productId === productId);
        if (!found) {
          return { isError: true, content: [{ type: 'text', text: `"${productId}" is not in the cart.` }] };
        }
        this.setQuantity(String(productId), Math.floor(quantity));
        return { content: [{ type: 'text', text: this.describeCart() }] };
      },
    });

    declareExperimentalWebMcpTool({
      name: 'remove_from_cart',
      description: 'Remove a product from the cart entirely, regardless of quantity.',
      inputSchema: {
        type: 'object',
        properties: { productId: { type: 'string', description: 'The product ID to remove.' } },
        required: ['productId'],
        additionalProperties: false,
      },
      execute: ({ productId }) => {
        this.remove(String(productId));
        return { content: [{ type: 'text', text: this.describeCart() }] };
      },
    });

    declareExperimentalWebMcpTool({
      name: 'clear_cart',
      description: 'Remove every item from the cart.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => {
        this.clear();
        return { content: [{ type: 'text', text: 'Cart cleared.' }] };
      },
    });
  }

  add(productId: string, quantity = 1): void {
    this._items.update((items) => {
      const existing = items.find((item) => item.productId === productId);
      if (existing) {
        return items.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...items, { productId, quantity }];
    });
  }

  setQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this._items.update((items) => items.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
  }

  remove(productId: string): void {
    this._items.update((items) => items.filter((item) => item.productId !== productId));
  }

  clear(): void {
    this._items.set([]);
  }

  private describeCart(): string {
    const items = this._items();
    if (items.length === 0) {
      return 'The cart is empty.';
    }
    const lines = items.map((item) => {
      const product = this.productService.getById(item.productId);
      const name = product?.name ?? item.productId;
      return `- ${item.quantity} × ${name} (${item.productId})`;
    });
    return [`Cart (${this.itemCount()} items, subtotal $${this.subtotal().toFixed(2)}):`, ...lines].join('\n');
  }
}
