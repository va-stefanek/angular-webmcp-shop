import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-cart-page',
  imports: [RouterLink],
  templateUrl: './cart-page.html',
})
export class CartPage {
  private readonly productService = inject(ProductService);
  readonly cartService = inject(CartService);

  readonly lines = computed(() =>
    this.cartService
      .items()
      .map((item) => ({ item, product: this.productService.getById(item.productId) }))
      .filter((line) => line.product !== undefined),
  );
}
