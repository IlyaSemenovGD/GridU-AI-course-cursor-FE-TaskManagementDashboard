# User Profile Management — Test Case Specification

This document describes **positive**, **negative**, **edge**, and **security** test scenarios for user registration, profile updates, password changes, and account deletion. It aligns with the Flask API (`/api/auth/register`, `/api/auth/login`, `PUT /api/users/me`, `POST /api/users/me/password`, `DELETE /api/users/me`) and the React settings UI.

**Legend:** **HTTP** = expected status code; **DB** = database expectation; **JWT** = `Authorization: Bearer <token>`.

---

## 1. Test data catalogue (reusable)

| ID | Field | Value | Notes |
|----|--------|--------|--------|
| TD-NAME-01 | `name` | `Alice Tester` | Valid display name |
| TD-NAME-02 | `name` | `A` | Single character (min length check if enforced) |
| TD-EMAIL-01 | `email` | `alice.valid@example.com` | RFC-valid, normalized to lower case in storage |
| TD-EMAIL-02 | `email` | `Bob@Example.COM` | Mixed case; expect normalized `@example.com` domain |
| TD-EMAIL-03 | `email` | `not-an-email` | Invalid format |
| TD-EMAIL-04 | `email` | `taken@example.com` | Already registered (for conflict tests) |
| TD-PWD-01 | `password` | `password12` | ≥ 8 chars; meets registration schema |
| TD-PWD-02 | `password` | `short` | 5 chars; below minimum |
| TD-PWD-03 | `password` | `Str0ng!New99` | Strong password for change-password |
| TD-PWD-04 | `current_password` | `wrongguess` | Intentionally incorrect for negative tests |

---

## 2. User registration (`POST /api/auth/register`)

### 2.1 Positive

| TC-ID | Scenario | Preconditions | Input body | Expected HTTP | Expected result |
|-------|-----------|----------------|------------|---------------|-----------------|
| REG-P-01 | Happy path | Email not in DB | `{ "name": TD-NAME-01, "email": TD-EMAIL-01, "password": TD-PWD-01 }` | **201** | JSON includes `id`, `email`, `full_name`, `username`, `access_token`; user row exists with bcrypt hash |
| REG-P-02 | Email normalization | Same as REG-P-01 but `email`: `User@Example.COM` | — | **201** | Stored email lowercased / normalized consistently |
| REG-P-03 | Minimum length password (8) | Email unique | `password`: `12345678` | **201** | Exactly 8 characters accepted |

### 2.2 Negative

| TC-ID | Scenario | Input | Expected HTTP | Expected result |
|-------|-----------|--------|----------------|-----------------|
| REG-N-01 | Password too short | `password`: TD-PWD-02 | **400** | Validation error; no user created |
| REG-N-02 | Missing `name` | Omit `name` | **400** | Marshmallow errors |
| REG-N-03 | Missing `email` | Omit `email` | **400** | Validation error |
| REG-N-04 | Missing `password` | Omit `password` | **400** | Validation error |
| REG-N-05 | Invalid email format | `email`: TD-EMAIL-03 | **400** | Validation error |
| REG-N-06 | Duplicate email | Same email as existing user | **409** | Message indicates account exists; no second user |

### 2.3 Edge

| TC-ID | Scenario | Input | Expected HTTP | Notes |
|-------|-----------|--------|----------------|-------|
| REG-E-01 | Very long name | `name`: 120+ chars if schema max 120 | **400** or **201** | Match `UserRegisterSchema` / `User` column limit |
| REG-E-02 | Email with plus tag | `alice+tag@example.com` | **201** | Treated as distinct from `alice@example.com` if allowed |
| REG-E-03 | Empty JSON body | `{}` | **400** | All required fields missing |

### 2.4 Security

| TC-ID | Scenario | Expected result |
|-------|-----------|-----------------|
| REG-S-01 | Password not returned in response | Response JSON must **not** contain plaintext `password` or `password_hash` |
| REG-S-02 | Stored hash is bcrypt | `password_hash` starts with `$2` and verifies with `bcrypt.checkpw` |
| REG-S-03 | No authentication required to register | **201** without `Authorization` header (public endpoint) |

---

## 3. Profile update (`PUT /api/users/me`)

Requires **JWT** for the acting user.

### 3.1 Positive

| TC-ID | Scenario | Input | Expected HTTP | Expected result |
|-------|-----------|--------|----------------|-----------------|
| PROF-P-01 | Update full name only | `{ "full_name": "New Name" }` | **200** | `full_name` updated; `email` unchanged |
| PROF-P-02 | Update email only | `{ "email": "newunique@example.com" }` | **200** | Email updated and normalized |
| PROF-P-03 | Update both | `{ "full_name": "...", "email": "..." }` | **200** | Both fields persisted |
| PROF-P-04 | Frontend session sync | After **200**, client merges API user into session | — | Header shows new name/email |

### 3.2 Negative

| TC-ID | Scenario | Input | Expected HTTP |
|-------|-----------|--------|----------------|
| PROF-N-01 | No JWT | Valid body, no `Authorization` | **401** |
| PROF-N-02 | Empty body (no fields) | `{}` | **400** | “Provide full_name and/or email” |
| PROF-N-03 | Email already used by another user | `email`: TD-EMAIL-04 (other account) | **409** |
| PROF-N-04 | Invalid email format | `email`: TD-EMAIL-03 | **400** |

### 3.3 Edge

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| PROF-E-01 | Whitespace in `full_name` | Trimmed on save |
| PROF-E-02 | Same email as current user (no-op change) | **200** or acceptable no-op; no false **409** |
| PROF-E-03 | `Content-Type` missing / wrong | **400** or Flask default behavior |

### 3.4 Security

| TC-ID | Scenario | Expected result |
|-------|-----------|-----------------|
| PROF-S-01 | User A cannot call `PUT /api/users/<B>` for B≠A without admin | **403** (admin-only or self-only rules) |
| PROF-S-02 | IDOR | Attacker cannot change another user’s profile via `/users/me` (always self) | Only self identity from JWT |
| PROF-S-03 | XSS stored in `full_name` | If UI renders unsanitized, risk; API stores string—verify FE escapes or sanitizes |

---

## 4. Password change (`POST /api/users/me`)

### 4.1 Positive

| TC-ID | Scenario | Input | Expected HTTP | Expected result |
|-------|-----------|--------|----------------|-----------------|
| PWD-P-01 | Valid change | `current_password`: TD-PWD-01, `new_password`: TD-PWD-03 | **200** | `check_password(new)` succeeds; old password fails |
| PWD-P-02 | New password minimum length (8) | `new_password`: `12345678` | **200** | Accepted |

### 4.2 Negative

| TC-ID | Scenario | Input | Expected HTTP |
|-------|-----------|--------|----------------|
| PWD-N-01 | Wrong current password | `current_password`: TD-PWD-04 | **401** |
| PWD-N-02 | New password too short | `new_password`: `short` | **400** |
| PWD-N-03 | Missing `current_password` | — | **400** |
| PWD-N-04 | Missing `new_password` | — | **400** |
| PWD-N-05 | No JWT | — | **401** |

### 4.3 Edge

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| PWD-E-01 | New password equals current | **200** (allowed) or policy rejects—document actual behavior |
| PWD-E-02 | Unicode / emoji in new password | If allowed by schema, **200**; else **400** |

### 4.4 Security

| TC-ID | Scenario | Expected result |
|-------|-----------|-----------------|
| PWD-S-01 | No step-up without current password | Cannot change password without proving possession of old password |
| PWD-S-02 | Tokens not invalidated after change | Optional product decision; document if JWT remains valid until expiry |
| PWD-S-03 | Rate limiting | Same IP/user repeated failures → **429** if limiter enabled |

---

## 5. Account deletion (`DELETE /api/users/me`)

Body: `{ "password": "<current password>" }`.

### 5.1 Positive

| TC-ID | Scenario | Input | Expected HTTP | Expected result |
|-------|-----------|--------|----------------|-----------------|
| DEL-P-01 | Correct password | `password`: user’s real password | **204** | User row removed; related data purged per `purge_user_account` |
| DEL-P-02 | Subsequent `/api/users/me` with same JWT | — | **404** | User no longer exists |

### 5.2 Negative

| TC-ID | Scenario | Input | Expected HTTP |
|-------|-----------|--------|----------------|
| DEL-N-01 | Wrong password | `password`: TD-PWD-04 | **401** |
| DEL-N-02 | Missing `password` key | `{}` | **400** |
| DEL-N-03 | No JWT | — | **401** |

### 5.3 Edge

| TC-ID | Scenario | Expected |
|-------|-----------|----------|
| DEL-E-01 | User with tasks/projects | **204**; owned projects/tasks removed per cascade rules |
| DEL-E-02 | Support tickets as customer | Tickets deleted or unlinked per implementation |

### 5.4 Security

| TC-ID | Scenario | Expected result |
|-------|-----------|-----------------|
| DEL-S-01 | Must confirm password | Prevents deletion with only a stolen session token (needs password) |
| DEL-S-02 | No arbitrary user deletion | `DELETE` only `/users/me`, not `/users/:id` for non-admin self-service |
| DEL-S-03 | Idempotency | Second delete with same token → **404** on `/users/me` |

---

## 6. Traceability (API ↔ UI)

| User action (UI) | API |
|------------------|-----|
| Register form submit | `POST /api/auth/register` |
| Settings → Save profile | `PUT /api/users/me` |
| Settings → Update password | `POST /api/users/me/password` |
| Settings → Privacy → Delete account | `DELETE /api/users/me` |

---

## 7. Suggested automation mapping

| Section | Automated in |
|---------|--------------|
| REG-P/N (pytest) | `backend/tests/test_auth.py`, `backend/tests/test_profile_management.py` |
| REG-P/N/S (unittest) | `backend/tests/test_profile_management_unittest.py` |
| PROF-P/N | `test_profile_management.py` + unittest module |
| PWD-* | `test_profile_management.py` + unittest module |
| DEL-* | `test_profile_management.py` + unittest module |

Use **pytest** `client` fixture with isolated DB per test (existing `conftest.py`) for pytest modules.

### 7.1 Unittest suite

Structured **`unittest.TestCase`** subclasses with **`setUp` / `tearDown`**, shared mock data, and a common base class. Full file list, class/method inventory, and run commands: **[profile-management-unit-tests.md](profile-management-unit-tests.md)**.

Quick run:

```bash
cd backend && PYTHONPATH=. python -m unittest tests.test_profile_management_unittest -v
```

Pytest also collects these classes: `pytest tests/test_profile_management_unittest.py -v`.

---

## 8. Revision

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-04-11 | Initial matrix for TaskFlow profile management |
