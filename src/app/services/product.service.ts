import { Injectable, computed, signal } from '@angular/core';
import { PRODUCTS } from '../data/products.data';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly _products = signal<Product[]>(PRODUCTS);

  readonly products = this._products.asReadonly();

  readonly categories = computed(() => [...new Set(this._products().map((p) => p.category))].sort());

  /**
   * Shared filter state — read by the catalog page's search box and category pills, and written
   * by the `search_products` WebMCP tool (see core/catalog.tools.ts). Because both sides read
   * the same signals, a tool call visibly updates the on-screen controls and grid, not just the
   * text returned to the agent. It lives here (root-provided, app-lifetime) rather than as local
   * component state precisely so the tool can reach it without the catalog page needing to be
   * open — like `CartService`, just for filter state instead of cart contents.
   */
  private readonly _filterQuery = signal('');
  private readonly _filterCategory = signal<string | undefined>(undefined);
  readonly filterQuery = this._filterQuery.asReadonly();
  readonly filterCategory = this._filterCategory.asReadonly();

  readonly filteredProducts = computed(() => this.search(this._filterQuery(), this._filterCategory()));

  getById(id: string): Product | undefined {
    return this._products().find((p) => p.id === id);
  }

  search(query?: string, category?: string): Product[] {
    const normalizedQuery = query?.trim().toLowerCase();
    return this._products().filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery);
      const matchesCategory = !category || product.category.toLowerCase() === category.toLowerCase();
      return matchesQuery && matchesCategory;
    });
  }

  setFilter(query: string | undefined, category: string | undefined): void {
    this._filterQuery.set(query ?? '');
    this._filterCategory.set(category);
  }
}
