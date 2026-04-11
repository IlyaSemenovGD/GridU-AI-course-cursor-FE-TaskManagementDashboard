export type StoreProduct = {
  id: number
  sku: string
  name: string
  description: string | null
  price_cents: number
  stock_quantity: number
}

export type CartLine = {
  product_id: number
  sku: string
  name: string
  quantity: number
  unit_price_cents: number
  line_subtotal_cents: number
}

export type CartDiscountMeta =
  | {
      code: string
      discount_cents: number
      percent_off: number | null
      amount_off_cents: number | null
    }
  | { cleared: true; message: string }

export type CartResponse = {
  items: CartLine[]
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  discount: CartDiscountMeta | null
}

export type CheckoutSuccess = {
  status: string
  order: {
    id: number
    subtotal_cents: number
    discount_cents: number
    total_cents: number
    payment_reference: string
    confirmation_message: string
  }
  discount_applied: CartDiscountMeta | null
  email_notification: string
}
