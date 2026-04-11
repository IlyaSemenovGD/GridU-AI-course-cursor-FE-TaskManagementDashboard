import { apiFetch } from './apiClient'
import type { CartResponse, CheckoutSuccess, StoreProduct } from '../types/store'

function parseJson<T>(r: Response): Promise<T> {
  return r.json() as Promise<T>
}

export async function fetchStoreProducts(): Promise<
  { ok: true; products: StoreProduct[] } | { ok: false; error: string }
> {
  const r = await apiFetch('/api/catalog/products')
  if (!r.ok) return { ok: false, error: await r.text() }
  const data = await parseJson<{ products: StoreProduct[] }>(r)
  return { ok: true, products: data.products }
}

export async function fetchCart(): Promise<
  { ok: true; cart: CartResponse } | { ok: false; error: string }
> {
  const r = await apiFetch('/api/cart')
  if (r.status === 401) return { ok: false, error: 'Sign in required' }
  if (!r.ok) return { ok: false, error: await r.text() }
  const cart = await parseJson<CartResponse>(r)
  return { ok: true, cart }
}

export async function addToCart(
  productId: number,
  quantity = 1,
): Promise<{ ok: true; cart: CartResponse } | { ok: false; error: string }> {
  const r = await apiFetch('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    const msg =
      typeof j === 'object' && j && 'message' in j
        ? String((j as { message?: string }).message)
        : await r.text()
    return { ok: false, error: msg || 'Could not update cart' }
  }
  const cart = await parseJson<CartResponse>(r)
  return { ok: true, cart }
}

export async function setCartLineQuantity(
  productId: number,
  quantity: number,
): Promise<{ ok: true; cart: CartResponse } | { ok: false; error: string }> {
  const r = await apiFetch(`/api/cart/items/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    const msg =
      typeof j === 'object' && j && 'message' in j
        ? String((j as { message?: string }).message)
        : await r.text()
    return { ok: false, error: msg || 'Could not update cart' }
  }
  const cart = await parseJson<CartResponse>(r)
  return { ok: true, cart }
}

export async function applyDiscountCode(
  code: string,
): Promise<{ ok: true; cart: CartResponse } | { ok: false; error: string }> {
  const r = await apiFetch('/api/cart/discount', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim() }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    const msg =
      typeof j === 'object' && j && 'message' in j
        ? String((j as { message?: string }).message)
        : await r.text()
    return { ok: false, error: msg || 'Invalid code' }
  }
  const cart = await parseJson<CartResponse>(r)
  return { ok: true, cart }
}

export async function clearDiscount(): Promise<
  { ok: true; cart: CartResponse } | { ok: false; error: string }
> {
  const r = await apiFetch('/api/cart/discount', { method: 'DELETE' })
  if (!r.ok) return { ok: false, error: await r.text() }
  const cart = await parseJson<CartResponse>(r)
  return { ok: true, cart }
}

export async function postCheckout(body: {
  payment_method: 'card'
  card_last4: string
  cardholder_name: string
}): Promise<
  | { ok: true; data: CheckoutSuccess }
  | { ok: false; error: string; status: number }
> {
  const r = await apiFetch('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const status = r.status
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    const msg =
      typeof j === 'object' && j && 'message' in j
        ? String((j as { message?: string }).message)
        : await r.text()
    return { ok: false, error: msg || 'Checkout failed', status }
  }
  const data = await parseJson<CheckoutSuccess>(r)
  return { ok: true, data }
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
