# Deploying CIPHER

CIPHER is two programs: a **static frontend** (`src/`, built by Vite into `dist/`)
and a **Node/Express API** (`server/`). They can deploy as **one** service or
**two**. Pick one option below.

> GitHub only stores code — it does not run your app. You deploy to a host.

---

## Option A — Single host (recommended for a demo/portfolio)

One Render web service runs the API **and** serves the built frontend. The
frontend calls `/api/*` same-origin, so there's no CORS and no second URL to
wire up. `render.yaml` (repo root) is pre-configured for this.

1. Push the repo to GitHub.
2. Render dashboard → **New → Blueprint** → select the repo.
3. Set the three secrets (marked `sync: false` in `render.yaml`):
   - `JWT_SECRET` — any long random string
   - `GMAIL_USER` / `GMAIL_APP_PASSWORD` — for verification emails (optional)
4. **Apply.** Build: `npm install && npm run build && cd server && npm install`.
   Start: `node server/index.js`.
5. Visit the Render URL. Done.

**How it works:** `server/index.js` checks for `../dist`; if present (production
build), it serves those static files and falls back non-`/api` requests to
`index.html` (SPA routing). `src/lib/api.js` uses `VITE_API_URL ?? ""` in
production → requests go to `/api/*` on the same host.

### ⚠️ `db.json` does not persist on Render free

`server/store.js` writes to a local file. Render free web services have an
**ephemeral filesystem** — every restart/redeploy wipes `db.json` (all users &
orders vanish). For a demo that's acceptable. For real users, replace
`store.js`'s `read()`/`write()` with a managed database (e.g. Postgres on
[Neon](https://neon.tech) or Render's own Postgres). The `store.js` API is
small (`findUserByEmail`, `createUser`, `updateUserByEmail`, `readRaw`,
`publicUser`, `newId`) — port those to SQL and you're done.

---

## Option B — Two hosts (frontend on Vercel, API on Render)

Use this if you want the frontend on a fast static CDN with no cold starts, and
the API as a separate service.

### Frontend → Vercel

1. Vercel dashboard → **Add New → Project** → import the repo.
2. Framework preset: **Vite**. Build: `npm run build`. Output: `dist`.
3. Set env var `VITE_API_URL` = your deployed API URL (from the Render step
   below), e.g. `https://cipher-api.onrender.com`. **This is a build-time
   variable** — set it before the first deploy, and redeploy if you change it.
4. Add a `vercel.json` for SPA routing (client-side routes like `/vault`):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### API → Render

1. Render → **New → Web Service** → repo, root directory `server/`.
2. Build: `npm install`. Start: `npm start`.
3. Env vars: `JWT_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`. (`PORT` is
   injected by Render.) `cors()` is already open to all origins in
   `server/index.js`, so the Vercel frontend can call it.

The API free tier spins down after 15 min of inactivity → first request after
idle takes ~30–60 s to cold-start. The frontend (Vercel static) never cold-starts.

---

## Environment variables reference

| Where | Var | Required | Notes |
|---|---|---|---|
| Frontend (build) | `VITE_API_URL` | Option B only | Empty/unset = same-origin (Option A); API URL (Option B). Build-time. |
| Server (runtime) | `JWT_SECRET` | yes | Signs login tokens. Use a long random string. |
| Server (runtime) | `GMAIL_USER` | no | Gmail address for sending verification emails. |
| Server (runtime) | `GMAIL_APP_PASSWORD` | no | Gmail App Password (not your normal password). Omit both to skip email. |
| Server (runtime) | `PORT` | no | Provided by the host; defaults to 4000 locally. |
| Server (runtime) | `FRONTEND_URL` | no | Base URL used in verification email links. Defaults to `http://localhost:5173`. Set to your frontend URL in production. |

> All secrets are gitignored (`.env`, `server/.env`). Never commit them — set
> them in the host dashboard.

---

## Local dev (for reference)

```bash
npm install                  # frontend deps
cd server && npm install && cd ..   # API deps
cp .env.example .env         # frontend (VITE_API_URL=http://localhost:4000)
cp server/.env.example server/.env  # API secrets
npm run dev                  # frontend → http://localhost:5173
cd server && npm run dev     # API → http://localhost:4000 (separate terminal)
```
