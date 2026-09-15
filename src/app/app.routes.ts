import { Routes } from '@angular/router';
import { PRODUCT_DETAIL_TOOL_PROVIDERS } from './features/product-detail/product-detail.tools';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/product-list/product-list').then((m) => m.ProductList),
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./features/product-detail/product-detail').then((m) => m.ProductDetail),
    // Route-scoped WebMCP tools: only registered while this route is active. Requires
    // `withExperimentalAutoCleanupInjectors()` on `provideRouter` (see app.config.ts) so the
    // tool is actually unregistered when the shopper navigates away.
    providers: PRODUCT_DETAIL_TOOL_PROVIDERS,
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
