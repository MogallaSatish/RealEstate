# Deployment

## Frontend (Vercel)

1. Root: `client`
2. Build: `npm run build`
3. Output: `dist`
4. Env: `VITE_API_URL=https://your-api.onrender.com/api/v1`
5. SPA fallback: rewrite all routes to `index.html`

## Backend (Render / Railway)

1. Root: `server`
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Persistent process required (Socket.IO).
5. Set env vars from `.env.example`.
6. Health check: `/api/v1/health`

## MongoDB Atlas

1. Create a project and cluster.
2. Database user with a strong password.
3. Network access: Render/Railway outbound IPs or `0.0.0.0/0` only if required, then tighten.
4. Separate databases: `estatehub-dev` and `estatehub-prod`.
5. Enable backups on the Atlas plan you choose.
6. Connection string goes only in server environment variables.

## Cloudinary

Unsigned uploads are not used. The API uploads with the secret and stores `publicId` + `url` in MongoDB.

## UPI

Do not enable production charges until a legitimate UPI merchant (or PSP that supports UPI with server-side verification) is contracted.

Keep `UPI_SANDBOX=true` until then. The UI labels checkout as **Sandbox**.

## CORS

Set `CLIENT_URL` to the Vercel origin. Credentials cookies require `sameSite=none; secure` in production HTTPS.

## Backups

Use Atlas automated snapshots plus periodic `mongodump` for critical collections (`users`, `properties`, `payments`, `auditlogs`).
