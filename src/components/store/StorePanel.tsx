import { useCallback, useEffect, useState } from 'react'
import type { Session } from '../../lib/auth'
import {
  addToCart,
  applyDiscountCode,
  clearDiscount,
  fetchCart,
  fetchStoreProducts,
  formatMoney,
  postCheckout,
  setCartLineQuantity,
} from '../../lib/storeApi'
import type { CartResponse, StoreProduct } from '../../types/store'

type Step = 'browse' | 'checkout' | 'success'

type Props = {
  session: Session
}

export function StorePanel({ session }: Props) {
  const [step, setStep] = useState<Step>('browse')
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [cart, setCart] = useState<CartResponse | null>(null)
  const [discountInput, setDiscountInput] = useState('')
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [cardLast4, setCardLast4] = useState('4242')
  const [cardName, setCardName] = useState(session.name)
  const [lastConfirmation, setLastConfirmation] = useState<{
    orderId: number
    total: string
    paymentRef: string
    message: string
    emailQueued: boolean
  } | null>(null)

  const refresh = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([fetchStoreProducts(), fetchCart()])
    if (pRes.ok) setProducts(pRes.products)
    else setLoadError(pRes.error)
    if (cRes.ok) setCart(cRes.cart)
    else if (cRes.error === 'Sign in required') setCart(null)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onAdd = async (productId: number) => {
    setBusy(true)
    setDiscountError(null)
    const res = await addToCart(productId, 1)
    setBusy(false)
    if (res.ok) setCart(res.cart)
    else setDiscountError(res.error)
  }

  const onQtyChange = async (productId: number, qty: number) => {
    setBusy(true)
    const res = await setCartLineQuantity(productId, qty)
    setBusy(false)
    if (res.ok) setCart(res.cart)
    else setDiscountError(res.error)
  }

  const onApplyDiscount = async () => {
    if (!discountInput.trim()) return
    setBusy(true)
    setDiscountError(null)
    const res = await applyDiscountCode(discountInput)
    setBusy(false)
    if (res.ok) {
      setCart(res.cart)
      setDiscountInput('')
    } else setDiscountError(res.error)
  }

  const onClearDiscount = async () => {
    setBusy(true)
    const res = await clearDiscount()
    setBusy(false)
    if (res.ok) setCart(res.cart)
  }

  const onPay = async () => {
    setCheckoutError(null)
    setBusy(true)
    const res = await postCheckout({
      payment_method: 'card',
      card_last4: cardLast4.replace(/\D/g, '').slice(0, 4),
      cardholder_name: cardName.trim(),
    })
    setBusy(false)
    if (res.ok) {
      setLastConfirmation({
        orderId: res.data.order.id,
        total: formatMoney(res.data.order.total_cents),
        paymentRef: res.data.order.payment_reference,
        message: res.data.order.confirmation_message,
        emailQueued: res.data.email_notification === 'queued',
      })
      setCart(null)
      setStep('success')
      void refresh()
    } else {
      setCheckoutError(res.error)
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        Could not load the store: {loadError}
      </div>
    )
  }

  if (step === 'success' && lastConfirmation) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Order confirmed
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Thank you!
          </h2>
          <dl className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <div className="flex justify-between gap-4">
              <dt>Order</dt>
              <dd className="font-mono">#{lastConfirmation.orderId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Total charged</dt>
              <dd className="font-semibold">{lastConfirmation.total}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Payment ref</dt>
              <dd className="font-mono text-xs">{lastConfirmation.paymentRef}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {lastConfirmation.message}
          </p>
          {lastConfirmation.emailQueued && (
            <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
              A confirmation email was sent to{' '}
              <span className="font-medium">{session.email}</span> (async delivery via
              worker; check server logs in development).
            </p>
          )}
        </div>
        <button
          type="button"
          className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700"
          onClick={() => {
            setStep('browse')
            setLastConfirmation(null)
            void refresh()
          }}
        >
          Continue shopping
        </button>
      </div>
    )
  }

  if (step === 'checkout') {
    return (
      <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Payment
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Demo gateway: use any 4 digits except <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">0000</code>{' '}
            (declined). <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">4242</code> works.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="card-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name on card
              </label>
              <input
                id="card-name"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                autoComplete="cc-name"
              />
            </div>
            <div>
              <label htmlFor="card-last4" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Last 4 digits
              </label>
              <input
                id="card-last4"
                inputMode="numeric"
                maxLength={4}
                className="mt-1 w-full max-w-[12rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none ring-violet-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                autoComplete="cc-number"
              />
            </div>
          </div>
          {checkoutError && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {checkoutError}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              onClick={() => setStep('browse')}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              onClick={() => void onPay()}
              disabled={busy || cardLast4.length !== 4 || cardName.trim().length < 2}
            >
              {busy ? 'Processing…' : 'Pay now'}
            </button>
          </div>
        </div>
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Order summary</h3>
          {cart && <CartSummaryBlock cart={cart} />}
        </aside>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_min(24rem,100%)]">
        <section aria-labelledby="store-products-heading">
          <h2 id="store-products-heading" className="sr-only">
            Products
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {p.description || '—'}
                </p>
                <p className="mt-3 text-lg font-semibold text-violet-700 dark:text-violet-300">
                  {formatMoney(p.price_cents)}
                </p>
                <p className="text-xs text-zinc-500">{p.stock_quantity} in stock</p>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void onAdd(p.id)}
                  disabled={busy || p.stock_quantity < 1}
                >
                  {p.stock_quantity < 1 ? 'Out of stock' : 'Add to cart'}
                </button>
              </li>
            ))}
          </ul>
          {products.length === 0 && !loadError && (
            <p className="text-sm text-zinc-500">No products yet. Ask an admin to add catalog items.</p>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Cart</h2>
            {cart ? (
              <>
                <CartSummaryBlock cart={cart} onQtyChange={onQtyChange} busy={busy} />
                {cart.discount && 'cleared' in cart.discount && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    {cart.discount.message}
                  </p>
                )}
                <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <label htmlFor="discount-code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Discount code
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="discount-code"
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      placeholder="SAVE10, FLAT500…"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
                      onClick={() => void onApplyDiscount()}
                      disabled={busy}
                    >
                      Apply
                    </button>
                  </div>
                  {cart.discount && 'code' in cart.discount && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-violet-600 hover:underline dark:text-violet-400"
                      onClick={() => void onClearDiscount()}
                      disabled={busy}
                    >
                      Remove code {cart.discount.code}
                    </button>
                  )}
                  {discountError && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{discountError}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  disabled={busy || !cart.items.length}
                  onClick={() => {
                    setCheckoutError(null)
                    setStep('checkout')
                  }}
                >
                  Proceed to checkout
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Loading cart…</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function CartSummaryBlock({
  cart,
  onQtyChange,
  busy,
}: {
  cart: CartResponse
  onQtyChange?: (productId: number, qty: number) => void
  busy?: boolean
}) {
  return (
    <>
      <ul className="mt-3 space-y-3">
        {cart.items.length === 0 && (
          <li className="text-sm text-zinc-500">Your cart is empty.</li>
        )}
        {cart.items.map((line) => (
          <li
            key={line.product_id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 text-sm dark:border-zinc-800"
          >
            <div className="min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{line.name}</p>
              <p className="text-xs text-zinc-500">{line.sku}</p>
            </div>
            <div className="flex items-center gap-2">
              {onQtyChange ? (
                <input
                  type="number"
                  min={0}
                  className="w-14 rounded border border-zinc-300 bg-white px-2 py-1 text-center text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  value={line.quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isNaN(v)) void onQtyChange(line.product_id, v)
                  }}
                  disabled={busy}
                  aria-label={`Quantity for ${line.name}`}
                />
              ) : (
                <span className="text-zinc-600 dark:text-zinc-400">×{line.quantity}</span>
              )}
              <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                {formatMoney(line.line_subtotal_cents)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatMoney(cart.subtotal_cents)}</dd>
        </div>
        {cart.discount_cents > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <dt>Discount</dt>
            <dd className="tabular-nums">−{formatMoney(cart.discount_cents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(cart.total_cents)}</dd>
        </div>
      </dl>
    </>
  )
}
