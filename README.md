# CIPHER

> Decode the fit. Techwear streetwear for the encoded generation.

CIPHER is an immersive streetwear storefront. The centerpiece is **the Vault** —
an interactive 3D shopping surface (gender → category → product grid) where you
pull a neon rope to "breach" each category, replacing the traditional product
listing page. Built with Vite + React 19 + React Three Fiber, backed by a small
Express API for auth, catalog, and orders.

## Tech stack

**Frontend** (repo root)
- Vite 8, React 19
- Tailwind CSS v4 (via `@tailwindcss/vite`, config inline in `src/index.css`)
- React Router 7
- React Three Fiber + three.js + drei (3D hero, vault, product viewer)
- Framer Motion (transitions / breach overlays)

**Backend** (`server/`)
- Express 4
- bcryptjs + jsonwebtoken (auth)
- nodemailer (email verification via Gmail)
- File-backed store (`server/db.json`)

## Monorepo layout

```
cipher/
├─ src/                  # frontend
│  ├─ components/
│  │  ├─ layout/         # Layout, Navbar, Footer, CartDrawer, AuthModal, CartSignalEffect
│  │  ├─ brand/          # CipherMark, CipherWordmark, CipherBg, CipherBackdrop, TechTags
│  │  ├─ three/          # R3F scenes (hero, vault ropes, product stage, …)
│  │  └─ vault/          # the Vault feature module (gender/category/grid)
│  ├─ context/           # StoreContext, ProductsContext, AuthModalContext
│  ├─ data/              # fakestore catalog + garment SVG generator
│  ├─ lib/               # api client
│  └─ pages/             # routes (Home, Vault, ProductDetail, …)
├─ server/               # Express API (auth, catalog, orders)
├─ index.html
└─ vite.config.js        # @/ alias → ./src
```

Imports use the `@/` path alias (configured in `vite.config.js` + `jsconfig.json`),
so deep `../../` chains are gone — e.g. `import { useStore } from "@/context/StoreContext"`.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
# 1. Install frontend deps
npm install

# 2. Install server deps
cd server && npm install && cd ..
```

### Environment

Copy the example env files and fill in values:

```bash
# Frontend
cp .env.example .env              # set VITE_API_URL (defaults to http://localhost:4000)

# Server
cp server/.env.example server/.env
#  → GMAIL_USER, GMAIL_APP_PASSWORD (Gmail App Password for verification emails)
#  → JWT_SECRET (any long random string)
#  → PORT (default 4000)
```

> The server's `db.json` data file is gitignored — seed it manually or via the
> admin panel at `/admin` once running.

## Development

Run the frontend and the API in two terminals:

```bash
# Terminal 1 — frontend (Vite)
npm run dev

# Terminal 2 — API (node --watch)
cd server && npm run dev
```

Frontend: http://localhost:5173 · API: http://localhost:4000

## Scripts

**Frontend** (root)

| script          | description              |
|-----------------|--------------------------|
| `npm run dev`   | Vite dev server          |
| `npm run build` | Production build → dist/ |
| `npm run lint`  | Oxlint                   |
| `npm run preview` | Preview the build      |

**Server** (`server/`)

| script          | description              |
|-----------------|--------------------------|
| `npm run dev`   | API with `node --watch`  |
| `npm start`     | API (production)         |

## Routes

| path             | description                                  |
|------------------|----------------------------------------------|
| `/`              | Landing — 3D hero, "enter the vault"         |
| `/vault`         | The Vault — pull a rope to breach a category |
| `/product/:id`   | 3D product viewer + details                  |
| `/checkout`      | Cart review + shipping                       |
| `/wishlist`      | Saved items                                  |
| `/account`       | Profile + orders                             |
| `/admin`         | Catalog CRUD (seed/manage products)          |
| `/verify`        | Email verification landing                   |
| `/shop`, `/signup` | Redirect to `/vault` / `/` (legacy)        |

## Deployment

- **Frontend:** static — `npm run build` and serve `dist/` from any static host
  (Vercel, Netlify, Cloudflare Pages). Set `VITE_API_URL` to the deployed API URL.
- **Server:** run the Node process (`npm start`) on your host; set the env vars
  (`GMAIL_*`, `JWT_SECRET`, `PORT`) in the host's config.
- Vite SPA: ensure SPA fallback to `index.html` for client-side routes.

## License

MIT — see [LICENSE](./LICENSE).

---

<!-- TODO: update the repository/homepage URLs in package.json once the GitHub repo exists. -->
