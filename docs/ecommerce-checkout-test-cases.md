# E-commerce checkout — test case specification

This document describes **positive**, **negative**, **edge**, and **security** scenarios for the TaskFlow store flow: **cart**, **discount codes**, **mock payment**, **order confirmation**, and **email notifications** (async stub). It aligns with:

- `GET/POST/PUT/DELETE /api/cart…`, `POST/DELETE /api/cart/discount`
- `POST /api/checkout`
- Celery task `tasks.send_order_confirmation_email` → `app.services.email_stub.send_email`

**Legend:** **HTTP** = expected status; **JWT** = `Authorization: Bearer <token>`.

---

## 1. Test data catalogue

| ID | Item | Value | Notes |
|----|------|--------|--------|
| TD-PROD-01 | Product | Demo catalog SKU (e.g. `DEMO-NOTEBOOK`) | Seeded when DB empty; or create via admin `POST /api/catalog/products` |
| TD-DISC-01 | Code | `SAVE10` | 10% off, no minimum |
| TD-DISC-02 | Code | `FLAT500` | $5.00 off, **min order $20.00** (`min_order_cents`: 2000) |
| TD-PAY-OK | `card_last4` | `4242` | Mock success |
| TD-PAY-DECL | `card_last4` | `0000` | Mock decline → **402** `PAYMENT_DECLINED` |
| TD-PAY-BAD | `card_last4` | `42`, `424`, `abcd` | Validation → **400** |

---

## 2. Cart — add / update / remove

All cart routes require **JWT** unless noted.

### 2.1 Positive

| TC-ID | Scenario | Steps | Expected HTTP | Expected result |
|-------|-----------|-------|---------------|-----------------|
| CART-P-01 | Add first line | `POST /api/cart/items` `{ "product_id", "quantity": 1 }` | **200** | Response includes `items` with line, `subtotal_cents`, `total_cents` |
| CART-P-02 | Increase quantity | Same `POST` again for same product | **200** | Quantity increases; subtotal reflects sum |
| CART-P-03 | Set quantity | `PUT /api/cart/items/<product_id>` `{ "quantity": n }` | **200** | Line quantity = `n` |
| CART-P-04 | Remove line | `PUT … { "quantity": 0 }` or `DELETE /api/cart/items/<product_id>` | **200** | Line removed; totals updated |
| CART-P-05 | List cart | `GET /api/cart` | **200** | `items`, `subtotal_cents`, `discount_cents`, `total_cents`, `discount` |

### 2.2 Negative

| TC-ID | Scenario | Input | Expected HTTP |
|-------|-----------|--------|----------------|
| CART-N-01 | No JWT | Any cart route without `Authorization` | **401** |
| CART-N-02 | Unknown product | `product_id` not in catalog | **404** |
| CART-N-03 | Insufficient stock | Quantity &gt; `stock_quantity` | **400** `INSUFFICIENT_STOCK` |
| CART-N-04 | Invalid `product_id` type | Non-integer, non-numeric string | **400** `VALIDATION_ERROR` |
| CART-N-05 | Invalid quantity | `quantity` &lt; 1 on add | **400** |

### 2.3 Edge

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| CART-E-01 | Empty cart `GET` | **200**, `items: []`, totals 0 |
| CART-E-02 | Add then remove all lines | Cart empty; checkout must fail with empty cart (see checkout) |

### 2.4 Security

| TC-ID | Scenario | Expected result |
|-------|-----------|-----------------|
| CART-S-01 | SQL injection in `product_id` body | String such as `1 OR 1=1` / `'; DROP TABLE--` rejected (**400**); IDs resolved via ORM / typed parsing, not string concatenation |
| CART-S-02 | Path tampering | `PUT /api/cart/items/<id>` only affects that `product_id`; cannot alter other users’ carts (JWT scopes rows by `user_id`) |

---

## 3. Discount codes

### 3.1 Positive

| TC-ID | Scenario | Steps | Expected HTTP | Expected result |
|-------|-----------|-------|---------------|-----------------|
| DISC-P-01 | Apply valid code | `POST /api/cart/discount` `{ "code": "SAVE10" }` with cart subtotal &gt; 0 | **200** | `discount_cents` &gt; 0 when applicable; `discount` meta includes `code` |
| DISC-P-02 | Case-insensitive match | Body `save10` / `SAVE10` | **200** | Same as above (normalized server-side) |
| DISC-P-03 | Clear code | `DELETE /api/cart/discount` | **200** | `discount_cents` 0; code removed from session |

### 3.2 Negative

| TC-ID | Scenario | Expected HTTP |
|-------|-----------|----------------|
| DISC-N-01 | Unknown code | **404** or **400** with message “Unknown” / invalid |
| DISC-N-02 | Below minimum order | `FLAT500` with subtotal &lt; $20 | **400** (min order message) |
| DISC-N-03 | Empty `code` | **400** `VALIDATION_ERROR` |

### 3.3 Edge

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| DISC-E-01 | Subtotal changes after apply | If cart drops below min, next `GET` may clear discount and return `discount.cleared` + message |
| DISC-E-02 | Max uses exceeded | If `uses_count` ≥ `max_uses`, apply fails |

### 3.4 Security

| TC-ID | Scenario | Expected result |
|-------|-----------|-----------------|
| DISC-S-01 | SQL injection in `code` field | Treated as literal string; lookup via ORM / `func.upper` — no executable SQL from payload |
| DISC-S-02 | No JWT | **401** on `POST/DELETE /api/cart/discount` |

---

## 4. Payment processing (mock) and checkout

`POST /api/checkout` body:

```json
{
  "payment_method": "card",
  "card_last4": "4242",
  "cardholder_name": "Jane Doe"
}
```

### 4.1 Positive

| TC-ID | Scenario | Expected HTTP | Expected result |
|-------|-----------|---------------|-----------------|
| CHK-P-01 | Successful payment | Non-empty cart, valid card fields, `card_last4` ≠ `0000` | **200** | `order.id`, `subtotal_cents`, `discount_cents`, `total_cents`, `payment_reference` (`pay_mock_…`), `email_notification`: `queued` |
| CHK-P-02 | Stock decremented | After checkout | Product `stock_quantity` reduced by line quantities |
| CHK-P-03 | Cart cleared | After success | No `cart_items` for user; discount session cleared |
| CHK-P-04 | Discount usage | Checkout with discount | `DiscountCode.uses_count` incremented when `discount_cents` &gt; 0 |

### 4.2 Negative

| TC-ID | Scenario | Expected HTTP |
|-------|-----------|----------------|
| CHK-N-01 | No JWT | **401** |
| CHK-N-02 | Empty cart | **400** `EMPTY_CART` |
| CHK-N-03 | Wrong `payment_method` | **400** (must be `card`) |
| CHK-N-04 | Invalid `card_last4` (not 4 digits) | **400** |
| CHK-N-05 | Short `cardholder_name` | **400** |
| CHK-N-06 | Declined card | `card_last4`: `0000` → **402** `PAYMENT_DECLINED` |
| CHK-N-07 | Insufficient stock at pay time | Race / concurrent sale | **400** `INSUFFICIENT_STOCK` |

### 4.3 Edge

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| CHK-E-01 | $0 total after discount | **200** if business allows; else document policy |
| CHK-E-02 | Duplicate submit | Idempotency not guaranteed; document risk of double order if client retries |

### 4.4 Security

| TC-ID | Scenario | Expected result |
|-------|-----------|-----------------|
| CHK-S-01 | Payment fields are validated | Length and digit checks on `card_last4`; no full PAN stored |
| CHK-S-02 | User isolation | Order created only for JWT subject; no `user_id` in body to spoof |
| CHK-S-03 | Injection in JSON | Malicious strings in `cardholder_name` / body stored or logged without executing SQL (ORM) |

---

## 5. Order confirmation (API response)

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| CONF-P-01 | Response includes human message | `order.confirmation_message` references cardholder first name and email |
| CONF-P-02 | Order persisted | `GET /api/orders/<id>` returns **200** for owner; `status` **confirmed** after checkout |
| CONF-N-01 | Other user cannot read order | **403** on `GET /api/orders/<id>` for non-owner non-admin |

---

## 6. Email notifications

Implementation: Celery `send_order_confirmation_email` → `send_email` stub (log + optional debug in development).

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| EM-P-01 | Task queued on success | Response `email_notification`: `queued`; with eager Celery, task runs in-process |
| EM-P-02 | Email contains order summary | Stub receives subject/body with order id, totals, line items |
| EM-N-01 | Missing order id | Task no-ops safely if order deleted |
| EM-S-01 | No raw card data in email | Body must not include full PAN; mock uses last4 only in API, not emailed |

---

## 7. Traceability (UI ↔ API)

| User action (Store tab) | API |
|-------------------------|-----|
| Add to cart | `POST /api/cart/items` |
| Change qty / remove | `PUT /api/cart/items/:id`, `DELETE …` |
| Apply / remove promo | `POST /api/cart/discount`, `DELETE /api/cart/discount` |
| Pay | `POST /api/checkout` |
| View orders | `GET /api/orders` |

---

## 8. Automation mapping

| Area | Automated tests |
|------|-------------------|
| Cart, discount, checkout, security samples | `backend/tests/test_ecommerce_checkout.py` |
| Catalog / orders (CRUD) | `backend/tests/test_api_rest_comprehensive.py` |
| Email stub | `test_checkout_success_creates_order_sends_email_clears_cart` patches `app.tasks.background.send_email` (where the Celery task holds the reference) |

The **FLAT500** minimum-order scenario is covered by inserting `FLAT500` in the test DB when missing (isolated pytest DBs may not run catalog seed).

Run:

```bash
cd backend && PYTHONPATH=. python -m pytest tests/test_ecommerce_checkout.py -v
```

---

## 9. Revision

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-04-11 | Initial e-commerce checkout matrix |
