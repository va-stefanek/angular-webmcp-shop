import { Injectable, computed, signal } from '@angular/core';
import { PRODUCTS } from '../data/products.data';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly _products = signal<Product[]>(PRODUCTS);

  readonly products = this._products.asReadonly();

  readonly categories = computed(() => [...new Set(this._products().map((p) => p.category))].sort());

  /** Shared filter state, read by the catalog page's search box and category pills. */
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
