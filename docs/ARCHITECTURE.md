# EstateHub architecture

## Goals

- Serve property discovery for India, starting with Vijayawada.
- Separate public browsing from authenticated owner, agent, buyer, tenant, and admin work.
- Keep MongoDB Atlas as the only application database.
- Enforce authorization on the server. Never trust client-supplied roles, ownership, approval, payment, or subscription state.

## System context

```
Browser (React SPA)
    |  HTTPS + HTTP-only JWT cookies
    v
Express API /api/v1  +  Socket.IO /realtime
    |                         |
    |                         +--> in-app messages and notifications
    v
MongoDB Atlas (Mongoose)
    |
    +--> Cloudinary (images/docs)
    +--> SMTP (Nodemailer)
    +--> UPI merchant or sandbox adapter
    +--> Google Maps (client display only)
```

## Frontend

- Public layout: header, search, listings, legal pages.
- Auth layout: login, register, verify, reset.
- Role layouts: buyer/tenant, owner/agent, admin.
- TanStack Query for server state.
- React Hook Form + Zod for forms.
- Protected routes check session from `/auth/me`.

## Backend layers

```
routes -> middleware (auth, roles, validate) -> controllers -> services -> repositories/models
```

- Controllers stay thin.
- Services own business rules and ownership checks.
- Repositories wrap Mongoose queries.
- Integrations isolate Cloudinary, mail, and UPI.

## Security

- bcrypt password hashes.
- Access JWT (15m) + refresh JWT (7d) in HTTP-only cookies.
- Helmet, CORS allowlist, rate limits, Zod validation.
- Listing approval and payment status change only in trusted services.
- Private documents are stored with Cloudinary authenticated/private delivery and served through authorized API routes.

## Money

INR amounts are stored as integer **paise** (₹1 = 100 paise). Display layers convert to rupees.

## Time

All dates persist in UTC. The UI formats in `Asia/Kolkata` unless the user profile specifies another zone.

## Environments

`NODE_ENV=development|test|production` with separate Atlas databases recommended (`estatehub-dev`, `estatehub-prod`).
