# API documentation

Base URL: `/api/v1`

Unless noted, JSON request bodies. Authenticated routes require a valid access cookie (or `Authorization: Bearer`).

## Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | no | Create account |
| POST | `/auth/login` | no | Login |
| POST | `/auth/logout` | yes | Clear cookies |
| POST | `/auth/refresh` | refresh cookie | New access token |
| GET | `/auth/me` | yes | Current user |
| POST | `/auth/forgot-password` | no | Email reset link |
| POST | `/auth/reset-password` | no | Set new password |
| POST | `/auth/verify-email` | no | Confirm email |
| POST | `/auth/resend-verification` | yes | Resend email |
| PATCH | `/auth/change-password` | yes | Change password |

### Register body

```json
{
  "fullName": "Priya Rao",
  "email": "priya@example.com",
  "mobile": "9876543210",
  "password": "StrongPass#1",
  "confirmPassword": "StrongPass#1",
  "role": "buyer"
}
```

Roles accepted at register: `buyer`, `tenant`, `owner`, `agent`. Admin cannot self-register.

## Properties (public)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/properties` | Search, filter, paginate |
| GET | `/properties/featured` | Featured approved listings |
| GET | `/properties/suggestions` | Debounced typeahead |
| GET | `/properties/:slug` | Public detail |
| GET | `/properties/:id/similar` | Similar listings |

Query params: `q`, `city`, `locality`, `purpose`, `propertyType`, `minPrice`, `maxPrice`, `bedrooms`, `bathrooms`, `furnishing`, `verified`, `listedByRole`, `minArea`, `maxArea`, `parking`, `amenities`, `sort`, `page`, `limit`.

Prices in query are **rupees**; the API converts to paise.

## Owner / agent listings

| Method | Path | Roles |
| --- | --- | --- |
| POST | `/listings` | owner, agent, admin |
| GET | `/listings/mine` | owner, agent, admin |
| GET | `/listings/:id` | owner of record, agent of record, admin |
| PATCH | `/listings/:id` | same |
| DELETE | `/listings/:id` | same |
| POST | `/listings/:id/submit` | same |
| POST | `/listings/:id/status` | same (sold/rented/unavailable) |
| POST | `/listings/:id/images` | same |
| DELETE | `/listings/:id/images/:imageId` | same |
| PATCH | `/listings/:id/images/order` | same |

## Favorites, views, inquiries, appointments

See route files under `server/src/routes`. All mutating routes check authentication and ownership.

## Payments (UPI sandbox or merchant)

1. `POST /payments/orders` creates a **pending** payment and UPI intent / QR payload.
2. User pays in a UPI app.
3. Provider webhook `POST /payments/webhook` verifies signature and amount.
4. Sandbox-only: `POST /payments/sandbox/confirm` with `SANDBOX_CONFIRM_KEY` to simulate a verified credit. This route is disabled when `UPI_SANDBOX=false`.

Services activate **only** after verified success.

## Health

`GET /health` → `{ "ok": true, "db": "connected", "env": "development" }`
