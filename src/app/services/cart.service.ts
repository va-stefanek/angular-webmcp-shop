import { Injectable, computed, inject, signal } from '@angular/core';
import { CartItem } from '../models/product.model';
import { ProductService } from './product.service';

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
}
