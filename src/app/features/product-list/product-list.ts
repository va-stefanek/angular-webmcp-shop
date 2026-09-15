import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink],
  templateUrl: './product-list.html',
})
export class ProductList {
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);

  readonly categories = this.productService.categories;
  // Reading the same signals the `search_products` tool writes to — see ProductService — is what
  // makes a tool call visibly move these controls instead of only returning text to the agent.
  readonly query = this.productService.filterQuery;
  readonly activeCategory = this.productService.filterCategory;
  readonly products = this.productService.filteredProducts;

  onQueryInput(value: string): void {
    this.productService.setFilter(value, this.activeCategory());
  }

  selectCategory(category: string | undefined): void {
    this.productService.setFilter(this.query(), category);
  }

  clearFilters(): void {
    this.productService.setFilter('', undefined);
  }

  addToCart(productId: string): void {
    this.cartService.add(productId);
  }
}
