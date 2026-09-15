import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart-page/cart-page').then((m) => m.CartPage),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout-page/checkout-page').then((m) => m.CheckoutPage),
  },
];
