import "dotenv/config"
import express from "express"
import cors from "cors"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import { randomInt } from "crypto"
import { promises as dns } from "dns"
import {
  findUserByEmail,
  createUser,
  updateUserByEmail,
  publicUser,
  newId,
  readRaw,
} from "./store.js"

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me"

// Gmail transporter — only built if credentials are present in .env
const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })
    : null

function sign(user) {
  return jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "7d" })
}

function auth(req, res, next) {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: "No token provided" })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

// ── Email domain validation via DNS MX lookup ──────────────────────────────
// Confirms the domain has mail servers — catches typos & fake domains.
// Cannot confirm the specific mailbox exists (Google doesn't expose that).
async function isDomainValid(email) {
  const domain = email.split("@")[1]
  if (!domain) return false
  try {
    const records = await dns.resolveMx(domain)
    return Array.isArray(records) && records.length > 0
  } catch {
    return false
  }
}

// ── Shared email wrapper ───────────────────────────────────────────────────
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log(`⚠  Gmail not configured — would send "${subject}" to ${to}`)
    return
  }
  try {
    await transporter.sendMail({
      from: `"CIPHER//" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`✉  "${subject}" → ${to}`)
  } catch (err) {
    console.error("Email send failed:", err.message)
  }
}

// ── Email templates ────────────────────────────────────────────────────────

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>CIPHER//</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:'Space Mono',monospace,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0e0e10;border:1px solid #1f1f27;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #1f1f27;">
            <span style="font-size:22px;font-weight:700;color:#c8ff00;letter-spacing:0.04em;">CIPHER//</span>
            <span style="display:block;font-size:9px;color:#5a5a68;letter-spacing:0.3em;margin-top:4px;text-transform:uppercase;">DECODE THE FIT</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #1f1f27;">
            <p style="margin:0;font-size:10px;color:#3d3d4a;letter-spacing:0.15em;text-transform:uppercase;">
              CIPHER// Transmission · Do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function sendVerificationEmail(to, name, verifyToken) {
  const link = `${FRONTEND_URL}/verify?token=${verifyToken}`
  return sendMail(
    to,
    "CIPHER// — Verify your signal",
    baseTemplate(`
      <p style="margin:0 0 6px;font-size:10px;color:#c8ff00;letter-spacing:0.25em;text-transform:uppercase;">// AUTH.REGISTER</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#f0f0ed;letter-spacing:-0.01em;">Verify your signal, ${name}.</h1>
      <p style="margin:0 0 28px;font-size:13px;line-height:1.8;color:#8a8a9a;">
        You're one step away from accessing the vault.<br/>
        Confirm your email to activate your CIPHER account.
        This link is single-use and expires in 24 hours.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#c8ff00;color:#080808;padding:14px 32px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-decoration:none;text-transform:uppercase;">
        VERIFY MY EMAIL →
      </a>
      <p style="margin:24px 0 0;font-size:11px;color:#5a5a68;line-height:1.7;">
        Button not working? Copy this link:<br/>
        <span style="color:#c8ff00;word-break:break-all;">${link}</span>
      </p>
    `)
  )
}

function sendOtpEmail(to, name, otp) {
  return sendMail(
    to,
    "CIPHER// — Password Reset Code",
    baseTemplate(`
      <p style="margin:0 0 6px;font-size:10px;color:#c8ff00;letter-spacing:0.25em;text-transform:uppercase;">// AUTH.RESET</p>
      <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#f0f0ed;letter-spacing:-0.01em;">Reset your password, ${name}.</h1>
      <p style="margin:0 0 28px;font-size:13px;line-height:1.8;color:#8a8a9a;">
        Use the one-time code below to reset your password.<br/>
        This code expires in <strong style="color:#f0f0ed;">10 minutes</strong> and cannot be reused.
      </p>
      <div style="background:#080808;border:1px solid #c8ff00;padding:24px 32px;text-align:center;margin-bottom:28px;">
        <span style="font-size:36px;font-weight:700;color:#c8ff00;letter-spacing:0.3em;">${otp}</span>
        <p style="margin:8px 0 0;font-size:10px;color:#5a5a68;letter-spacing:0.2em;text-transform:uppercase;">ONE-TIME CODE</p>
      </div>
      <p style="margin:0;font-size:11px;color:#5a5a68;line-height:1.7;">
        If you didn't request a password reset, ignore this email —
        your account remains secure.
      </p>
    `)
  )
}

function sendOrderConfirmationEmail(to, name, order) {
  const { id, date, items, total, address } = order

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #1a1a22;">
          <span style="font-size:13px;color:#f0f0ed;font-weight:600;">${item.name}</span><br/>
          <span style="font-size:11px;color:#5a5a68;letter-spacing:0.1em;">${item.size} · ${item.colorway} · ×${item.qty}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #1a1a22;text-align:right;font-size:13px;color:#c8ff00;white-space:nowrap;">
          $${(item.price * item.qty).toFixed(2)}
        </td>
      </tr>`
    )
    .join("")

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const shipping = total - subtotal

  const addressBlock = address
    ? `
      <div style="margin-top:28px;padding:20px 24px;background:#080808;border:1px solid #1f1f27;">
        <p style="margin:0 0 10px;font-size:10px;color:#c8ff00;letter-spacing:0.25em;text-transform:uppercase;">// SHIPPING TO</p>
        <p style="margin:0;font-size:13px;color:#8a8a9a;line-height:1.8;">
          ${address.firstName} ${address.lastName}<br/>
          ${address.address}<br/>
          ${address.city}, ${address.postal}<br/>
          ${address.country}
        </p>
      </div>`
    : ""

  return sendMail(
    to,
    `CIPHER// — Order ${id} confirmed`,
    baseTemplate(`
      <p style="margin:0 0 6px;font-size:10px;color:#c8ff00;letter-spacing:0.25em;text-transform:uppercase;">// ORDER.CONFIRMED</p>
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#f0f0ed;">Order Decoded, ${name}.</h1>
      <p style="margin:0 0 28px;font-size:13px;color:#5a5a68;letter-spacing:0.1em;">
        <span style="color:#8a8a9a;">Order</span> <span style="color:#c8ff00;">${id}</span>
        &nbsp;·&nbsp; ${date}
      </p>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="text-align:left;font-size:10px;color:#5a5a68;letter-spacing:0.2em;text-transform:uppercase;padding-bottom:12px;">Item</th>
          <th style="text-align:right;font-size:10px;color:#5a5a68;letter-spacing:0.2em;text-transform:uppercase;padding-bottom:12px;">Price</th>
        </tr>
        ${itemRows}
        <tr>
          <td style="padding:12px 0 4px;font-size:12px;color:#5a5a68;">Subtotal</td>
          <td style="padding:12px 0 4px;text-align:right;font-size:12px;color:#8a8a9a;">$${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:#5a5a68;">Shipping</td>
          <td style="padding:4px 0;text-align:right;font-size:12px;color:#8a8a9a;">${shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</td>
        </tr>
        <tr>
          <td style="padding:16px 0 0;border-top:1px solid #1f1f27;font-size:14px;font-weight:700;color:#f0f0ed;">Total</td>
          <td style="padding:16px 0 0;border-top:1px solid #1f1f27;text-align:right;font-size:16px;font-weight:700;color:#c8ff00;">$${total.toFixed(2)}</td>
        </tr>
      </table>

      ${addressBlock}

      <p style="margin:28px 0 0;font-size:12px;color:#5a5a68;line-height:1.7;">
        Your garments are being compiled. You'll receive a shipping update
        once your order leaves our facility.<br/>
        Questions? Reply to this email or visit your account page.
      </p>
    `)
  )
}

// ============ ROUTES ============

// Email domain validation — checks MX records, not the specific inbox.
app.post("/api/validate-email", async (req, res) => {
  const { email } = req.body
  if (!email || !email.includes("@"))
    return res.json({ valid: false, reason: "Invalid email format" })
  const valid = await isDomainValid(email)
  res.json({ valid, reason: valid ? null : "Email domain has no mail servers" })
})

// Register → create a PENDING (unverified) account + send magic-link email.
app.post("/api/register", async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" })
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" })

  const existing = await findUserByEmail(email)
  if (existing) {
    if (existing.verified)
      return res.status(409).json({ error: "Email already registered" })
    // Unverified — resend a fresh verification link
    const verifyToken = newId("vrf")
    await updateUserByEmail(email, {
      verifyToken,
      verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
      passwordHash: await bcrypt.hash(password, 10),
      name: name || existing.name,
    })
    await sendVerificationEmail(email, name || existing.name, verifyToken)
    return res.status(200).json({ pending: true, email })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const verifyToken = newId("vrf")
  const user = {
    id: newId("usr"),
    email,
    name: name || email.split("@")[0],
    passwordHash,
    verified: false,
    verifyToken,
    verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
    favorites: [],
    orders: [],
    createdAt: new Date().toISOString(),
  }
  await createUser(user)
  await sendVerificationEmail(email, user.name, verifyToken)
  res.status(201).json({ pending: true, email })
})

// Verify email via the magic link token → activate account + log in.
app.post("/api/verify", async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: "Verification token required" })
  const data = await readRaw()
  const user = data.users.find((u) => u.verifyToken === token)
  if (!user) return res.status(400).json({ error: "Invalid verification link" })
  if (!user.verifyTokenExpires || user.verifyTokenExpires < Date.now())
    return res.status(400).json({ error: "This verification link has expired" })
  const updated = await updateUserByEmail(user.email, {
    verified: true,
    verifyToken: null,
    verifyTokenExpires: null,
  })
  res.json({ token: sign(updated), user: publicUser(updated) })
})

// Re-send a verification link.
app.post("/api/verify/resend", async (req, res) => {
  const { email } = req.body
  const user = await findUserByEmail(email)
  if (!user || user.verified) return res.status(200).json({ ok: true })
  const verifyToken = newId("vrf")
  await updateUserByEmail(email, {
    verifyToken,
    verifyTokenExpires: Date.now() + 24 * 60 * 60 * 1000,
  })
  await sendVerificationEmail(email, user.name, verifyToken)
  res.json({ ok: true })
})

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body
  const user = await findUserByEmail(email)
  if (!user) return res.status(401).json({ error: "Invalid email or password" })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: "Invalid email or password" })
  if (!user.verified)
    return res.status(403).json({ error: "Please verify your email before signing in", needsVerification: true })
  res.json({ token: sign(user), user: publicUser(user) })
})

// ── Forgot password — step 1: request OTP ─────────────────────────────────
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: "Email is required" })

  const user = await findUserByEmail(email)
  // Always respond OK — don't reveal whether the email exists
  if (!user || !user.verified) return res.json({ ok: true })

  // Generate a unique 6-digit OTP using crypto.randomInt (never the same twice)
  const otp = randomInt(100000, 1000000).toString()
  await updateUserByEmail(email, {
    resetOtp: otp,
    resetOtpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    resetOtpUsed: false,
  })
  await sendOtpEmail(email, user.name, otp)
  res.json({ ok: true })
})

// ── Forgot password — step 2: verify OTP ──────────────────────────────────
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" })

  const user = await findUserByEmail(email)
  if (!user || !user.resetOtp || user.resetOtpUsed)
    return res.status(400).json({ error: "Invalid or expired code" })
  if (user.resetOtpExpires < Date.now())
    return res.status(400).json({ error: "Code has expired — request a new one" })
  if (user.resetOtp !== otp.trim())
    return res.status(400).json({ error: "Incorrect code" })

  // Issue a short-lived reset token (5 min) so the user can set a new password
  const resetToken = jwt.sign({ email, purpose: "reset" }, JWT_SECRET, { expiresIn: "5m" })
  // Mark OTP as used so it can't be replayed
  await updateUserByEmail(email, { resetOtpUsed: true })
  res.json({ resetToken })
})

// ── Forgot password — step 3: set new password ────────────────────────────
app.post("/api/auth/reset-password", async (req, res) => {
  const { resetToken, password } = req.body
  if (!resetToken || !password)
    return res.status(400).json({ error: "Reset token and new password are required" })
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" })

  let payload
  try {
    payload = jwt.verify(resetToken, JWT_SECRET)
  } catch {
    return res.status(400).json({ error: "Reset link has expired — start over" })
  }
  if (payload.purpose !== "reset")
    return res.status(400).json({ error: "Invalid token" })

  const passwordHash = await bcrypt.hash(password, 10)
  const updated = await updateUserByEmail(payload.email, {
    passwordHash,
    resetOtp: null,
    resetOtpExpires: null,
    resetOtpUsed: null,
  })
  res.json({ token: sign(updated), user: publicUser(updated) })
})

// Get current user
app.get("/api/me", auth, async (req, res) => {
  const user = await findUserByEmail(req.user.email)
  if (!user) return res.status(404).json({ error: "User not found" })
  res.json({ user: publicUser(user) })
})

// Toggle a product in favorites
app.post("/api/wishlist/toggle", auth, async (req, res) => {
  const { productId } = req.body
  if (!productId) return res.status(400).json({ error: "productId required" })
  const user = await findUserByEmail(req.user.email)
  if (!user) return res.status(404).json({ error: "User not found" })
  const favorites = user.favorites.includes(productId)
    ? user.favorites.filter((id) => id !== productId)
    : [...user.favorites, productId]
  const updated = await updateUserByEmail(req.user.email, { favorites })
  res.json({ user: publicUser(updated) })
})

// Create an order + send confirmation email
app.post("/api/orders", auth, async (req, res) => {
  const { items, total, address } = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: "items required" })
  const user = await findUserByEmail(req.user.email)
  if (!user) return res.status(404).json({ error: "User not found" })

  const order = {
    id: "ORD-" + newId("").toUpperCase(),
    date: new Date().toLocaleDateString(),
    items,
    total,
    address: address || null,
  }
  const orders = [order, ...(user.orders || [])]
  const updated = await updateUserByEmail(req.user.email, { orders })

  // Send order confirmation email (non-blocking)
  sendOrderConfirmationEmail(user.email, user.name, order)

  res.json({ order, user: publicUser(updated) })
})

app.listen(PORT, () => {
  console.log(`\n  CIPHER API ▸ http://localhost:${PORT}`)
  console.log(`  Gmail mailer: ${transporter ? "enabled ✓" : "disabled (set GMAIL creds in .env)"}\n`)
})
