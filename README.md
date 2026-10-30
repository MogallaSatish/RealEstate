# EstateHub

EstateHub is a full-stack real estate marketplace for buying, selling, renting, and leasing properties in India. The first market is Vijayawada, Andhra Pradesh, with data and search designed for expansion across Indian cities.

This is not a static prototype. The platform includes a React frontend, an Express REST API, MongoDB Atlas via Mongoose, authentication, listing moderation, inquiries, appointments, messaging, notifications, Cloudinary media, and a **sandbox UPI payment adapter** for paid platform services.

## Technology stack

| Layer | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Lucide React |
| Backend | Node.js, Express, TypeScript, REST `/api/v1` |
| Database | MongoDB Atlas + Mongoose only |
| Media | Cloudinary |
| Payments | UPI (sandbox adapter until merchant credentials are configured) |
| Email | Nodemailer |
| Realtime | Socket.IO |
| Maps | Google Maps (optional API key) |

**Not used:** Prisma, SQLite, PostgreSQL, MySQL, Razorpay, Stripe, PayPal.

## Repository layout

```
client/     Public website and role dashboards
server/     Express API, Socket.IO, Mongoose models, jobs
docs/       API, database, and deployment documentation
```

## Quick start

1. Create a MongoDB Atlas cluster, database user, and network access rule.
2. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.
3. Fill `MONGODB_URI` and JWT secrets. Keep Cloudinary, SMTP, Maps, and UPI keys optional for local demo.
4. Install and run:

```bash
cd server
npm install
npm run seed
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`  
Health: `GET http://localhost:5000/api/v1/health`

## Demo accounts (development seed)

Passwords for seeded users: `EstateHub#2026`

| Role | Email |
| --- | --- |
| Admin | `admin@estatehub.in` |
| Admin | `moderator@estatehub.in` |
| Agent | `agent1@estatehub.in` … `agent5@estatehub.in` |
| Owner | `owner1@estatehub.in` … `owner10@estatehub.in` |
| Buyer | `buyer1@estatehub.in` … `buyer10@estatehub.in` |
| Tenant | `tenant1@estatehub.in` … `tenant10@estatehub.in` |

Seeded listings are marked as **demo data**. Do not use these passwords in production.

## Paid services and UPI

Browsing, search, ordinary inquiries, and visit requests are free.

UPI is used only for platform charges such as featured listings, premium listing packages, and agent subscriptions.

Until a live UPI merchant is configured, the server uses a **clearly labeled sandbox**. Sandbox payments are never treated as live money movement. See [docs/API.md](docs/API.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Implementation checklist](docs/IMPLEMENTATION_CHECKLIST.md)
- [API](docs/API.md)
- [Database](docs/DATABASE.md)
- [Deployment](docs/DEPLOYMENT.md)

## Scripts

### Server

- `npm run dev` — start API with reload
- `npm run build` — compile TypeScript
- `npm start` — run compiled server
- `npm run seed` — load Indian demo data
- `npm test` — API tests

### Client

- `npm run dev` — Vite development server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm test` — frontend tests
