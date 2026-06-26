// Tiny JSON-file "database" for users + their per-customer data.
// Good enough for a learning project — swap for Postgres/Mongo in production.
import { readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { randomBytes } from "node:crypto"

const DB_PATH = new URL("./db.json", import.meta.url)

async function read() {
  if (!existsSync(DB_PATH)) return { users: [] }
  return JSON.parse(await readFile(DB_PATH, "utf-8"))
}

export async function readRaw() {
  return read()
}

async function write(data) {
  await writeFile(DB_PATH, JSON.stringify(data, null, 2))
}

export async function findUserByEmail(email) {
  const { users } = await read()
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
}

export async function createUser(user) {
  const data = await read()
  data.users.push(user)
  await write(data)
  return user
}

export async function updateUserByEmail(email, patch) {
  const data = await read()
  const idx = data.users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase())
  if (idx === -1) return null
  data.users[idx] = { ...data.users[idx], ...patch }
  await write(data)
  return data.users[idx]
}

// strip secrets before sending to the client
export function publicUser(user) {
  const { passwordHash, verifyToken, verifyTokenExpires, ...rest } = user
  return rest
}

export const newId = (prefix) =>
  `${prefix}_${randomBytes(4).toString("hex")}`
