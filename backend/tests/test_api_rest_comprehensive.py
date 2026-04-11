"""
Comprehensive REST API tests: users, product catalog, orders.

Covers authentication, authorization, validation, error responses, rate limiting,
and response-time budgets (see performance tests).
"""

from __future__ import annotations

import statistics
import time
from typing import Any

import pytest

from app.extensions import db
from app.models.product import Product


def _post_product(
    client: Any,
    headers: dict[str, str],
    *,
    sku: str = "SKU-1",
    name: str = "Widget",
    price_cents: int = 999,
    stock_quantity: int = 10,
) -> Any:
    return client.post(
        "/api/catalog/products",
        json={
            "sku": sku,
            "name": name,
            "description": "Test product",
            "price_cents": price_cents,
            "stock_quantity": stock_quantity,
        },
        headers=headers,
    )


# --- User management ---


class TestUserManagementAuthentication:
    """JWT required where applicable; missing/invalid token rejected."""

    def test_get_me_without_token_returns_401(self, client) -> None:
        r = client.get("/api/users/me")
        assert r.status_code == 401

    def test_get_me_with_valid_token_returns_200(self, client, auth_headers) -> None:
        h = auth_headers()
        r = client.get("/api/users/me", headers=h)
        assert r.status_code == 200
        data = r.get_json()
        assert data["email"] == "testuser@example.com"

    def test_put_me_without_token_returns_401(self, client) -> None:
        r = client.put("/api/users/me", json={"full_name": "X"})
        assert r.status_code == 401


class TestUserManagementAuthorization:
    """Role-based access: admin-only user listing."""

    def test_list_users_forbidden_for_customer(self, client, auth_headers) -> None:
        h = auth_headers()
        r = client.get("/api/users", headers=h)
        assert r.status_code == 403
        body = r.get_json()
        assert body.get("code") == "FORBIDDEN" or "Forbidden" in str(body)

    def test_list_users_allowed_for_admin(self, client, admin_headers) -> None:
        r = client.get("/api/users", headers=admin_headers)
        assert r.status_code == 200
        data = r.get_json()
        assert "users" in data
        assert len(data["users"]) >= 1


class TestUserManagementValidation:
    """Input validation on profile update."""

    def test_put_me_empty_body_returns_400(self, client, auth_headers) -> None:
        h = auth_headers()
        r = client.put("/api/users/me", json={}, headers=h)
        assert r.status_code == 400


# --- Product catalog ---


class TestProductCatalogAuthentication:
    """Catalog reads are public; writes require admin JWT."""

    def test_list_products_unauthenticated_ok(self, client) -> None:
        r = client.get("/api/catalog/products")
        assert r.status_code == 200
        assert r.get_json() == {"products": []}

    def test_create_product_without_token_returns_401(self, client) -> None:
        r = client.post(
            "/api/catalog/products",
            json={"sku": "A", "name": "N", "price_cents": 100},
        )
        assert r.status_code == 401

    def test_create_product_as_customer_returns_403(
        self, client, auth_headers
    ) -> None:
        r = _post_product(client, auth_headers())
        assert r.status_code == 403

    def test_create_product_as_admin_returns_201(self, client, admin_headers) -> None:
        r = _post_product(client, admin_headers, sku="SKU-ADMIN-1")
        assert r.status_code == 201
        data = r.get_json()
        assert data["sku"] == "SKU-ADMIN-1"
        assert data["price_cents"] == 999


class TestProductCatalogCrud:
    """GET/POST/PUT/DELETE product lifecycle."""

    def test_get_product_404(self, client) -> None:
        r = client.get("/api/catalog/products/999")
        assert r.status_code == 404

    def test_put_delete_product_flow(self, client, admin_headers) -> None:
        r = _post_product(client, admin_headers, sku="SKU-CRUD", price_cents=500)
        assert r.status_code == 201
        pid = r.get_json()["id"]

        r = client.get(f"/api/catalog/products/{pid}")
        assert r.status_code == 200

        r = client.put(
            f"/api/catalog/products/{pid}",
            json={"name": "Updated name"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.get_json()["name"] == "Updated name"

        r = client.delete(f"/api/catalog/products/{pid}", headers=admin_headers)
        assert r.status_code == 204

        r = client.get(f"/api/catalog/products/{pid}")
        assert r.status_code == 404


class TestProductCatalogValidation:
    """Malformed payloads and conflicts."""

    def test_create_product_invalid_body_returns_400(self, client, admin_headers) -> None:
        r = client.post(
            "/api/catalog/products",
            json={"sku": "", "name": "X", "price_cents": 0},
            headers=admin_headers,
        )
        assert r.status_code == 400
        body = r.get_json()
        assert body.get("code") == "VALIDATION_ERROR"

    def test_create_duplicate_sku_returns_409(self, client, admin_headers) -> None:
        assert _post_product(client, admin_headers, sku="SKU-DUP").status_code == 201
        r = _post_product(client, admin_headers, sku="sku-dup")
        assert r.status_code == 409


# --- Orders ---


class TestOrdersAuthentication:
    def test_list_orders_without_token_returns_401(self, client) -> None:
        assert client.get("/api/orders").status_code == 401

    def test_create_order_without_token_returns_401(self, client) -> None:
        r = client.post(
            "/api/orders",
            json={"items": [{"product_id": 1, "quantity": 1}]},
        )
        assert r.status_code == 401


class TestOrdersAuthorization:
    """Users see only their orders; admins see all; cross-user GET is forbidden."""

    def test_customer_cannot_read_others_order(
        self, client, admin_headers, customer_headers, auth_headers
    ) -> None:
        r = _post_product(client, admin_headers, sku="ORD-SKU", stock_quantity=5)
        pid = r.get_json()["id"]
        r = client.post(
            "/api/orders",
            json={"items": [{"product_id": pid, "quantity": 1}]},
            headers=customer_headers,
        )
        assert r.status_code == 201
        oid = r.get_json()["id"]

        r = client.get(f"/api/orders/{oid}", headers=admin_headers)
        assert r.status_code == 200

        other = auth_headers(email="other@example.com", name="Other")
        r = client.get(f"/api/orders/{oid}", headers=other)
        assert r.status_code == 403


class TestOrdersCrud:
    """POST order, list, stock decrement, DELETE pending."""

    def test_full_order_flow(self, client, admin_headers, customer_headers) -> None:
        r = _post_product(client, admin_headers, sku="FLOW-1", stock_quantity=3)
        pid = r.get_json()["id"]

        r = client.post(
            "/api/orders",
            json={"items": [{"product_id": pid, "quantity": 2}]},
            headers=customer_headers,
        )
        assert r.status_code == 201
        order = r.get_json()
        assert order["total_cents"] == 999 * 2
        assert order["status"] == "pending"
        oid = order["id"]

        with client.application.app_context():
            p = db.session.get(Product, pid)
            assert p is not None and p.stock_quantity == 1

        r = client.get("/api/orders", headers=customer_headers)
        assert r.status_code == 200
        ids = [o["id"] for o in r.get_json()["orders"]]
        assert oid in ids

        r = client.delete(f"/api/orders/{oid}", headers=customer_headers)
        assert r.status_code == 204

        with client.application.app_context():
            p = db.session.get(Product, pid)
            assert p is not None and p.stock_quantity == 3


class TestOrdersValidation:
    def test_order_unknown_product_returns_404(self, client, customer_headers) -> None:
        r = client.post(
            "/api/orders",
            json={"items": [{"product_id": 99999, "quantity": 1}]},
            headers=customer_headers,
        )
        assert r.status_code == 404

    def test_order_insufficient_stock_returns_400(
        self, client, admin_headers, customer_headers
    ) -> None:
        r = _post_product(client, admin_headers, sku="LOW", stock_quantity=1)
        pid = r.get_json()["id"]
        r = client.post(
            "/api/orders",
            json={"items": [{"product_id": pid, "quantity": 5}]},
            headers=customer_headers,
        )
        assert r.status_code == 400
        assert r.get_json().get("code") == "INSUFFICIENT_STOCK"

    def test_order_empty_items_returns_400(self, client, customer_headers) -> None:
        r = client.post("/api/orders", json={"items": []}, headers=customer_headers)
        assert r.status_code == 400


class TestOrdersAdminWorkflow:
    """Admin updates order status (cancel restores stock)."""

    def test_admin_cancel_order_restores_stock(
        self, client, admin_headers, customer_headers
    ) -> None:
        r = _post_product(client, admin_headers, sku="ADM-1", stock_quantity=5)
        pid = r.get_json()["id"]
        r = client.post(
            "/api/orders",
            json={"items": [{"product_id": pid, "quantity": 2}]},
            headers=customer_headers,
        )
        oid = r.get_json()["id"]

        r = client.put(
            f"/api/orders/{oid}",
            json={"status": "cancelled"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.get_json()["status"] == "cancelled"

        with client.application.app_context():
            p = db.session.get(Product, pid)
            assert p is not None and p.stock_quantity == 5


# --- Rate limiting ---


class TestRateLimiting:
    """
    Default limiter applies to non-exempt routes (100/minute per IP or JWT user).
    Uses ``testing_ratelimit`` config so the limiter is enabled at app init; the
    101st request in a window should return 429.
    """

    def test_101st_request_returns_429(self, client_ratelimit) -> None:
        last = None
        for _ in range(101):
            last = client_ratelimit.get("/api/catalog/products")
        assert last is not None
        assert last.status_code == 429
        body = last.get_json()
        assert body.get("code") == "RATE_LIMIT_EXCEEDED"


# --- Performance ---


class TestApiPerformance:
    """
    Smoke performance budget: median response time under 500ms for catalog GET.
    Uses a warm-up request; in-memory SQLite should be well under budget.
    """

    @pytest.mark.performance
    def test_catalog_list_median_under_500ms(self, client, admin_headers) -> None:
        _post_product(client, admin_headers, sku="PERF-1")
        client.get("/api/catalog/products")
        times: list[float] = []
        for _ in range(10):
            t0 = time.perf_counter()
            r = client.get("/api/catalog/products")
            times.append(time.perf_counter() - t0)
            assert r.status_code == 200
        median_s = statistics.median(times)
        assert median_s < 0.5, f"median {median_s:.3f}s exceeds 500ms"
