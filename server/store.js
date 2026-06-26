// Postgres-backed user store.
//
// One `users` table; favorites + orders are JSONB columns (good enough for a
// small store — normalize orders into their own table when volume grows). The
// exported API mirrors the old JSON-file version (so index.js barely changes),
// with findUserByVerifyToken replacing the readRaw() full-table scan.
//
// This swaps the ephemeral db.json for a managed DB so user data persists
// across restarts (Render's free disk is wiped on every redeploy — see
// DEPLOY.md). Wire up by setting DATABASE_URL in server/.env.
import pg from "pg"
import { randomBytes } from "node:crypto"

const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL

function isLocal(url = "") {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)
}

// Hosted Postgres (Neon, Render) requires SSL; a local server usually doesn't.
// Override either way with PGSSL=true|false.
const ssl =
  process.env.PGSSL === "true"
    ? { rejectUnauthorized: false }
    : process.env.PGSSL === "false"
      ? false
      : isLocal(DATABASE_URL)
        ? false
        : { rejectUnauthorized: false }

export const pool = new Pool({ connectionString: DATABASE_URL, ssl, max: 10 })

pool.on("error", (err) => {
  console.error("Postgres pool error:", err.message)
})

// camelCase (JS) ↔ snake_case (columns). favorites/orders are JSONB.
const COLS = {
  id: "id",
  email: "email",
  name: "name",
  passwordHash: "password_hash",
  verified: "verified",
  verifyToken: "verify_token",
  verifyTokenExpires: "verify_token_expires",
  favorites: "favorites",
  orders: "orders",
  resetOtp: "reset_otp",
  resetOtpExpires: "reset_otp_expires",
  resetOtpUsed: "reset_otp_used",
  createdAt: "created_at",
}
const JSONB_KEYS = new Set(["favorites", "orders"])

function rowToUser(r) {
  if (!r) return null
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
    verified: r.verified,
    verifyToken: r.verify_token,
    verifyTokenExpires: r.verify_token_expires,
    favorites: r.favorites || [],
    orders: r.orders || [],
    resetOtp: r.reset_otp,
    resetOtpExpires: r.reset_otp_expires,
    resetOtpUsed: r.reset_otp_used,
    createdAt: r.created_at,
  }
}

// JSONB columns need a stringified value; everything else passes through.
function bind(key, val) {
  if (JSONB_KEYS.has(key) && val != null) return JSON.stringify(val)
  return val
}

function defaultFor(key) {
  if (JSONB_KEYS.has(key)) return []
  if (key === "verified") return false
  return null
}

// Create the table on boot so there's no manual SQL step.
export async function initStore() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                   text PRIMARY KEY,
      email                text UNIQUE NOT NULL,
      name                 text NOT NULL,
      password_hash        text NOT NULL,
      verified             boolean NOT NULL DEFAULT false,
      verify_token         text,
      verify_token_expires bigint,
      favorites            jsonb NOT NULL DEFAULT '[]'::jsonb,
      orders               jsonb NOT NULL DEFAULT '[]'::jsonb,
      reset_otp            text,
      reset_otp_expires    bigint,
      reset_otp_used       boolean,
      created_at           timestamptz NOT NULL DEFAULT now()
    );
  `)
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE lower(email) = lower($1)",
    [email]
  )
  return rowToUser(rows[0])
}

export async function findUserByVerifyToken(token) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE verify_token = $1",
    [token]
  )
  return rowToUser(rows[0])
}

export async function createUser(user) {
  const keys = Object.keys(COLS)
  const cols = keys.map((k) => COLS[k])
  const vals = keys.map((k) => bind(k, user[k] ?? defaultFor(k)))
  const params = keys.map((_, i) => `$${i + 1}`)
  const { rows } = await pool.query(
    `INSERT INTO users (${cols.join(", ")}) VALUES (${params.join(", ")}) RETURNING *`,
    vals
  )
  return rowToUser(rows[0])
}

export async function updateUserByEmail(email, patch) {
  const entries = Object.entries(patch).filter(([k]) => COLS[k])
  if (entries.length === 0) return findUserByEmail(email)
  const sets = []
  const vals = []
  let i = 1
  for (const [k, v] of entries) {
    sets.push(`${COLS[k]} = $${i++}`)
    vals.push(bind(k, v))
  }
  vals.push(email)
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(", ")} WHERE lower(email) = lower($${i}) RETURNING *`,
    vals
  )
  return rowToUser(rows[0])
}

// Strip secrets before sending to the client.
export function publicUser(user) {
  if (!user) return null
  const {
    passwordHash,
    verifyToken,
    verifyTokenExpires,
    resetOtp,
    resetOtpExpires,
    resetOtpUsed,
    ...rest
  } = user
  return rest
}

export const newId = (prefix) => `${prefix}_${randomBytes(4).toString("hex")}`
