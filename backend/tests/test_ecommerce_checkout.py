"""
E-commerce checkout: cart, discounts, mock payment, order confirmation, email stub.

Aligned with docs/ecommerce-checkout-test-cases.md.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.extensions import db
from app.models.cart import CartItem
from app.models.discount import DiscountCode
from app.models.order import Order


def _post_product(client, headers, **kwargs):
    payload = {
        "sku": kwargs.get("sku", "T-SKU"),
        "name": kwargs.get("name", "Item"),
        "description": "t",
        "price_cents": kwargs.get("price_cents", 1000),
        "stock_quantity": kwargs.get("stock_quantity", 20),
    }
    return client.post("/api/catalog/products", json=payload, headers=headers)


def _ensure_flat500_discount(client) -> None:
    """Test DB may not run catalog seed; FLAT500 is required for min-order tests."""
    with client.application.app_context():
        if DiscountCode.query.filter(DiscountCode.code == "FLAT500").first():
            return
        db.session.add(
            DiscountCode(
                code="FLAT500",
                amount_off_cents=500,
                min_order_cents=2000,
                active=True,
            )
        )
        db.session.commit()


def _first_product_id(client) -> int:
    r = client.get("/api/catalog/products")
    assert r.status_code == 200
    products = r.get_json()["products"]
    assert products, "seed or create at least one product"
    return products[0]["id"]


@pytest.fixture
def admin_headers(client, auth_headers):
    headers = auth_headers(email="ec_admin@example.com", name="EC Admin")
    from app.models.user import User, UserRole

    with client.application.app_context():
        u = User.query.filter_by(email="ec_admin@example.com").first()
        assert u
        u.role = UserRole.ADMIN.value
        db.session.commit()
    return headers


class TestCartAuthentication:
    def test_cart_without_token_returns_401(self, client) -> None:
        assert client.get("/api/cart").status_code == 401


class TestCartPositiveAndNegative:
    def test_add_item_get_cart_update_remove(
        self, client, auth_headers, admin_headers
    ) -> None:
        h = auth_headers(email="cartuser@example.com")
        assert _post_product(client, admin_headers, sku="CART-1").status_code == 201
        pid = _first_product_id(client)

        r = client.post(
            "/api/cart/items",
            json={"product_id": pid, "quantity": 2},
            headers=h,
        )
        assert r.status_code == 200
        data = r.get_json()
        assert len(data["items"]) == 1
        assert data["items"][0]["quantity"] == 2

        r = client.get("/api/cart", headers=h)
        assert r.status_code == 200

        r = client.put(
            f"/api/cart/items/{pid}",
            json={"quantity": 1},
            headers=h,
        )
        assert r.status_code == 200
        assert r.get_json()["items"][0]["quantity"] == 1

        r = client.delete(f"/api/cart/items/{pid}", headers=h)
        assert r.status_code == 200
        assert r.get_json()["items"] == []

    def test_add_unknown_product_returns_404(self, client, auth_headers) -> None:
        h = auth_headers()
        r = client.post(
            "/api/cart/items",
            json={"product_id": 999999, "quantity": 1},
            headers=h,
        )
        assert r.status_code == 404

    def test_add_non_numeric_product_id_returns_400(self, client, auth_headers) -> None:
        h = auth_headers()
        r = client.post(
            "/api/cart/items",
            json={"product_id": "1; DROP TABLE cart_items;--", "quantity": 1},
            headers=h,
        )
        assert r.status_code == 400


class TestDiscountCodes:
    def test_apply_unknown_code_returns_404(self, client, auth_headers, admin_headers) -> None:
        h = auth_headers(email="disc1@example.com")
        assert _post_product(client, admin_headers, sku="D-1").status_code == 201
        pid = _first_product_id(client)
        assert (
            client.post(
                "/api/cart/items",
                json={"product_id": pid, "quantity": 1},
                headers=h,
            ).status_code
            == 200
        )
        r = client.post(
            "/api/cart/discount",
            json={"code": "NOT_A_REAL_CODE"},
            headers=h,
        )
        assert r.status_code == 404

    def test_apply_sql_like_code_is_literal_not_injection(
        self, client, auth_headers, admin_headers
    ) -> None:
        h = auth_headers(email="disc2@example.com")
        assert _post_product(client, admin_headers, sku="D-2").status_code == 201
        pid = _first_product_id(client)
        client.post("/api/cart/items", json={"product_id": pid, "quantity": 1}, headers=h)
        r = client.post(
            "/api/cart/discount",
            json={"code": "SAVE10' OR '1'='1"},
            headers=h,
        )
        assert r.status_code == 404

    def test_flat500_requires_min_order(self, client, auth_headers, admin_headers) -> None:
        """FLAT500 needs subtotal >= 2000 cents; sticker-only cart should fail."""
        _ensure_flat500_discount(client)
        h = auth_headers(email="disc3@example.com")
        r = _post_product(
            client,
            admin_headers,
            sku="CHEAP-1",
            price_cents=499,
            stock_quantity=50,
        )
        assert r.status_code == 201
        cheap_id = r.get_json()["id"]
        assert (
            client.post(
                "/api/cart/items",
                json={"product_id": cheap_id, "quantity": 1},
                headers=h,
            ).status_code
            == 200
        )
        r = client.post("/api/cart/discount", json={"code": "FLAT500"}, headers=h)
        assert r.status_code == 400


class TestCheckoutPaymentAndConfirmation:
    def test_checkout_empty_cart_returns_400(self, client, auth_headers) -> None:
        h = auth_headers(email="pay1@example.com")
        r = client.post(
            "/api/checkout",
            json={
                "payment_method": "card",
                "card_last4": "4242",
                "cardholder_name": "Test User",
            },
            headers=h,
        )
        assert r.status_code == 400
        assert r.get_json().get("code") == "EMPTY_CART"

    def test_checkout_invalid_payment_fields(self, client, auth_headers, admin_headers) -> None:
        h = auth_headers(email="pay2@example.com")
        assert _post_product(client, admin_headers, sku="P-1").status_code == 201
        pid = _first_product_id(client)
        client.post("/api/cart/items", json={"product_id": pid, "quantity": 1}, headers=h)

        r = client.post(
            "/api/checkout",
            json={
                "payment_method": "paypal",
                "card_last4": "4242",
                "cardholder_name": "Test User",
            },
            headers=h,
        )
        assert r.status_code == 400

        r = client.post(
            "/api/checkout",
            json={
                "payment_method": "card",
                "card_last4": "42",
                "cardholder_name": "Test User",
            },
            headers=h,
        )
        assert r.status_code == 400

        r = client.post(
            "/api/checkout",
            json={
                "payment_method": "card",
                "card_last4": "4242",
                "cardholder_name": "X",
            },
            headers=h,
        )
        assert r.status_code == 400

    def test_checkout_declined_card_returns_402(self, client, auth_headers, admin_headers) -> None:
        h = auth_headers(email="pay3@example.com")
        assert _post_product(client, admin_headers, sku="P-2").status_code == 201
        pid = _first_product_id(client)
        client.post("/api/cart/items", json={"product_id": pid, "quantity": 1}, headers=h)
        r = client.post(
            "/api/checkout",
            json={
                "payment_method": "card",
                "card_last4": "0000",
                "cardholder_name": "Declined User",
            },
            headers=h,
        )
        assert r.status_code == 402
        assert r.get_json().get("code") == "PAYMENT_DECLINED"

    @patch("app.tasks.background.send_email")
    def test_checkout_success_creates_order_sends_email_clears_cart(
        self, mock_send, client, auth_headers, admin_headers
    ) -> None:
        h = auth_headers(email="pay4@example.com")
        assert _post_product(client, admin_headers, sku="P-3").status_code == 201
        pid = _first_product_id(client)
        r0 = client.post("/api/cart/items", json={"product_id": pid, "quantity": 1}, headers=h)
        assert r0.status_code == 200

        r = client.post(
            "/api/checkout",
            json={
                "payment_method": "card",
                "card_last4": "4242",
                "cardholder_name": "Jane Q Customer",
            },
            headers=h,
        )
        assert r.status_code == 200
        body = r.get_json()
        assert body["status"] == "ok"
        assert body["email_notification"] == "queued"
        oid = body["order"]["id"]
        assert body["order"]["payment_reference"].startswith("pay_mock_")

        mock_send.assert_called()
        subj = mock_send.call_args[0][1]
        assert "Order #" in subj

        with client.application.app_context():
            order = db.session.get(Order, oid)
            assert order is not None
            assert order.status == "confirmed"
            assert order.payment_reference is not None
            assert CartItem.query.filter_by(user_id=int(order.user_id)).count() == 0

        r = client.get("/api/cart", headers=h)
        assert r.get_json()["items"] == []


class TestCheckoutSecurity:
    def test_checkout_without_auth_returns_401(self, client) -> None:
        assert (
            client.post(
                "/api/checkout",
                json={
                    "payment_method": "card",
                    "card_last4": "4242",
                    "cardholder_name": "No Auth",
                },
            ).status_code
            == 401
        )
