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
      submission: {
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
