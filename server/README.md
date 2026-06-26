# CIPHER server

Express API backing the CIPHER storefront: email-verification auth, catalog,
cart, and orders. File-backed store (`db.json`) — no external database needed
for development.

## Run

```bash
npm install
cp .env.example .env   # fill in GMAIL_*, JWT_SECRET, PORT
npm run dev            # node --watch (auto-restart on edit)
# or: npm start         (production)
```

Listens on `PORT` (default 4000).

## Environment

See `.env.example`:

- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — Gmail App Password used to send
  verification emails. Omit both to run without a mailer (verification emails
  are skipped, tokens are logged instead).
- `JWT_SECRET` — signs login tokens. Use a long random string in production.
- `PORT` — HTTP port (default 4000).

## Data

`db.json` is the file store (users, products, orders). It is **gitignored** —
seed products via the admin panel at `/admin` or write the file directly.

## Scripts

| script        | description              |
|---------------|--------------------------|
| `npm run dev` | API with `node --watch`  |
| `npm start`   | API (production)         |
