export interface Product {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly price: number;
  readonly rating: number;
  readonly stock: number;
  readonly emoji: string;
  readonly description: string;
}

export interface CartItem {
  readonly productId: string;
  readonly quantity: number;
}

export interface ShippingDetails {
  readonly fullName: string;
  readonly email: string;
  readonly address: string;
  readonly city: string;
  readonly postalCode: string;
}
