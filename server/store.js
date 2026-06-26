// Dual-mode store: Postgres when DATABASE_URL is set, JSON file otherwise.
//
// JSON mode works fine for development and free-tier deploys where you don't
// mind losing data on redeploy. Set DATABASE_URL to switch to Postgres (Neon,
// Render Postgres, etc.) — the table is auto-created on first boot.
import { randomBytes } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, "db.json")

// ── JSON file backend ──────────────────────────────────────────────────────

async function readRawJson() {
  if (!existsSync(DB_PATH)) return { users: [] }
  try {
    return JSON.parse(await readFile(DB_PATH, "utf8"))
  } catch {
    return { users: [] }
  }
}

async function writeRawJson(data) {
  await writeFile(DB_PATH, JSON.stringify(data, null, 2))
}

// ── Postgres backend ───────────────────────────────────────────────────────

let pool = null

async function getPool() {
  if (pool) return pool
  const { default: pg } = await import("pg")
  const DATABASE_URL = process.env.DATABASE_URL
  const ssl = /localhost|127\.0\.0\.1/.test(DATABASE_URL || "")
    ? false
    : { rejectUnauthorized: false }
  pool = new pg.Pool({ connectionString: DATABASE_URL, ssl, max: 10 })
  pool.on("error", (err) => console.error("Postgres pool error:", err.message))
  return pool
}

function rowToUser(r) {
  if (!r) return null
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
    verified: r.verified,
    verifyToken: r.verify_token,
    verifyTokenExpires: r.verify_token_expires ? Number(r.verify_token_expires) : null,
    favorites: r.favorites || [],
    orders: r.orders || [],
    resetOtp: r.reset_otp,
    resetOtpExpires: r.reset_otp_expires ? Number(r.reset_otp_expires) : null,
    resetOtpUsed: r.reset_otp_used,
    createdAt: r.created_at,
  }
}

const COLS = {
  id: "id", email: "email", name: "name",
  passwordHash: "password_hash", verified: "verified",
  verifyToken: "verify_token", verifyTokenExpires: "verify_token_expires",
  favorites: "favorites", orders: "orders",
  resetOtp: "reset_otp", resetOtpExpires: "reset_otp_expires",
  resetOtpUsed: "reset_otp_used", createdAt: "created_at",
}
const JSONB_KEYS = new Set(["favorites", "orders"])
const bind = (k, v) => (JSONB_KEYS.has(k) && v != null ? JSON.stringify(v) : v)
const defaultFor = (k) => JSONB_KEYS.has(k) ? [] : k === "verified" ? false : null

// ── Public API — same shape regardless of backend ─────────────────────────

const usePostgres = !!process.env.DATABASE_URL

export async function initStore() {
  if (!usePostgres) {
    if (!existsSync(DB_PATH)) await writeRawJson({ users: [] })
    console.log("  Store: JSON file →", DB_PATH)
    return
  }
  try {
    const pg = await getPool()
    await pg.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                   text PRIMARY KEY,
        email                text UNIQUE NOT NULL,
        name                 text NOT NULL,
        password_hash        text NOT NULL,
        verified             boolean NOT NULL DEFAULT false,
        verify_token         text,
        verify_token_expires bigint,
        favorites            jsonb NOT NULL DEFAULT '[]',
        orders               jsonb NOT NULL DEFAULT '[]',
        reset_otp            text,
        reset_otp_expires    bigint,
        reset_otp_used       boolean,
        created_at           timestamptz NOT NULL DEFAULT now()
      );
    `)
    console.log("  Store: Postgres ✓")
  } catch (err) {
    console.error("  ✖ Store init failed —", err.message)
    process.exit(1)
  }
}

export async function findUserByEmail(email) {
  if (!usePostgres) {
    const { users } = await readRawJson()
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
  }
  const pg = await getPool()
  const { rows } = await pg.query("SELECT * FROM users WHERE lower(email)=lower($1)", [email])
  return rowToUser(rows[0])
}

export async function findUserByVerifyToken(token) {
  if (!usePostgres) {
    const { users } = await readRawJson()
    return users.find((u) => u.verifyToken === token) || null
  }
  const pg = await getPool()
  const { rows } = await pg.query("SELECT * FROM users WHERE verify_token=$1", [token])
  return rowToUser(rows[0])
}

export async function createUser(user) {
  if (!usePostgres) {
    const data = await readRawJson()
    data.users.push(user)
    await writeRawJson(data)
    return user
  }
  const pg = await getPool()
  const keys = Object.keys(COLS)
  const cols = keys.map((k) => COLS[k])
  const vals = keys.map((k) => bind(k, user[k] ?? defaultFor(k)))
  const params = keys.map((_, i) => `$${i + 1}`)
  const { rows } = await pg.query(
    `INSERT INTO users (${cols.join(",")}) VALUES (${params.join(",")}) RETURNING *`,
    vals
  )
  return rowToUser(rows[0])
}

export async function updateUserByEmail(email, patch) {
  if (!usePostgres) {
    const data = await readRawJson()
    const idx = data.users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase())
    if (idx === -1) return null
    data.users[idx] = { ...data.users[idx], ...patch }
    await writeRawJson(data)
    return data.users[idx]
  }
  const pg = await getPool()
  const entries = Object.entries(patch).filter(([k]) => COLS[k])
  if (!entries.length) return findUserByEmail(email)
  const sets = []; const vals = []; let i = 1
  for (const [k, v] of entries) { sets.push(`${COLS[k]}=$${i++}`); vals.push(bind(k, v)) }
  vals.push(email)
  const { rows } = await pg.query(
    `UPDATE users SET ${sets.join(",")} WHERE lower(email)=lower($${i}) RETURNING *`,
    vals
  )
  return rowToUser(rows[0])
}

// Used by /api/verify (token scan — only needed in JSON mode; Postgres uses findUserByVerifyToken)
export async function readRaw() {
  if (!usePostgres) return readRawJson()
  const pg = await getPool()
  const { rows } = await pg.query("SELECT * FROM users")
  return { users: rows.map(rowToUser) }
}

export function publicUser(user) {
  if (!user) return null
  const { passwordHash, verifyToken, verifyTokenExpires, resetOtp, resetOtpExpires, resetOtpUsed, ...rest } = user
  return rest
}

export const newId = (prefix) => `${prefix}_${randomBytes(4).toString("hex")}`
