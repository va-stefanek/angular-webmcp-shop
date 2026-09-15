import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import { CartService } from '../../services/cart.service';
import { ShippingDetails } from '../../models/product.model';

@Component({
  selector: 'app-checkout-page',
  imports: [RouterLink, FormField, FormRoot],
  templateUrl: './checkout-page.html',
})
export class CheckoutPage {
  readonly cartService = inject(CartService);

  readonly orderPlaced = signal(false);
  readonly orderTotal = signal(0);

  readonly hasItems = computed(() => this.cartService.items().length > 0);

  private readonly model = signal<ShippingDetails>({
    fullName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
  });

  /**
   * `provideExperimentalWebMcpForms()` (see app.config.ts) plus `experimentalWebMcpTool` below is
   * the fourth WebMCP registration pattern in this app: Angular derives a JSON Schema straight
   * from these validators (required/email/minLength) and registers a `submit_checkout` tool that
   * fills every field and submits the form exactly as this page's own submit button does — no
   * separate tool-definition code to keep in sync with the form.
   */
  readonly checkoutForm = form(
    this.model,
    (f) => {
      required(f.fullName, { message: 'Full name is required.' });
      required(f.email, { message: 'Email is required.' });
      email(f.email, { message: 'Enter a valid email address.' });
      required(f.address, { message: 'Address is required.' });
      required(f.city, { message: 'City is required.' });
      required(f.postalCode, { message: 'Postal code is required.' });
      minLength(f.postalCode, 3, { message: 'Postal code looks too short.' });
    },
    {
      experimentalWebMcpTool: {
        name: 'submit_checkout',
        description:
          "Fill in the shopper's shipping details (full name, email, address, city, postal code) " +
          'and place the order for everything currently in the cart.',
      },
      submission: {
        // `form()` registers this tool as soon as the component is created, regardless of
        // whether the empty-cart branch in the template is showing — guard here too, or an
        // agent could "place a $0.00 order" by calling submit_checkout on an empty cart.
        action: async () => {
          if (!this.hasItems()) return;
          this.orderTotal.set(this.cartService.subtotal());
          this.cartService.clear();
          this.orderPlaced.set(true);
        },
      },
    },
  );
}
