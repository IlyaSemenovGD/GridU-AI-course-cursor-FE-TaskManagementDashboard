# Profile management — unit tests

This document describes the **`unittest`-style** suite that exercises registration, profile updates, password change, and account deletion against the Flask API with an isolated SQLite database per test.

## Layout

| Path | Role |
|------|------|
| `backend/tests/profile_unittest_base.py` | `ProfileManagementTestCase`: `testing` app, `setUp` / `tearDown` (drop/create tables, Flask test client), `register_and_headers()` |
| `backend/tests/fixtures/profile_mock_data.py` | Shared constants (`VALID_PASSWORD`, `WRONG_PASSWORD`, …) and payload builders; aligned with TD-* identifiers in [user-profile-management-test-cases.md](user-profile-management-test-cases.md) |
| `backend/tests/test_profile_management_unittest.py` | Test classes grouped by feature (see below) |

## Test classes and methods

**Registration**

- `TestRegistrationPositive` — `test_register_returns_201_with_token_and_user_fields`, `test_register_minimum_length_password_eight_chars`
- `TestRegistrationNegative` — short password **400**, duplicate email **409**
- `TestRegistrationSecurity` — response must not include `password` or `password_hash`

**Profile (`PUT /api/users/me`)**

- `TestProfileUpdatePositive` — update `full_name` and `email` with JWT
- `TestProfileUpdateNegative` — no token **401**, empty body **400**, email taken by another user **409**

**Password (`POST /api/users/me/password`)**

- `TestPasswordChange` — wrong current password **401**, successful change updates stored hash, new password too short **400**

**Account deletion (`DELETE /api/users/me`)**

- `TestAccountDeletion` — wrong password **401**, correct password **204** and user removed, missing password **400**

## How to run

From the repository root:

```bash
cd backend && PYTHONPATH=. python -m unittest tests.test_profile_management_unittest -v
```

Pytest discovers the same `TestCase` subclasses:

```bash
cd backend && pytest tests/test_profile_management_unittest.py -v
```

## Related

- Pytest-focused cases live in `backend/tests/test_profile_management.py` (shared `conftest.py` client/DB patterns).
- Full manual test matrix and API traceability: [user-profile-management-test-cases.md](user-profile-management-test-cases.md).
