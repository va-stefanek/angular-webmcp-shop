import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink],
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);

  readonly id = input.required<string>();
  readonly tab = input.required<string>()
  readonly product = computed(() => this.productService.getById(this.id()));

  constructor() {
    effect(() => {
      console.log(this.tab())
      console.log(this.id());
    });
  }

  addToCart(): void {
    const product = this.product();
    if (product) {
      this.cartService.add(product.id);
    }
  }
}
