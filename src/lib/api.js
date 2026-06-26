// Thin API client for the CIPHER backend.
// - Dev: VITE_API_URL (from .env) points at the local API, e.g. http://localhost:4000.
// - Prod (single-host): leave VITE_API_URL unset → "" → calls are same-origin
//   ("/api/..."), so the frontend and API share one URL.
// - Prod (two-host): set VITE_API_URL to the deployed API URL.
const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "")

let token = localStorage.getItem("cipher.token") || ""

export function setToken(t) {
  token = t
  if (t) localStorage.setItem("cipher.token", t)
  else localStorage.removeItem("cipher.token")
}

export function getToken() {
  return token
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  register: (email, password, name) => request("/api/register", { method: "POST", body: { email, password, name } }),
  login: (email, password) => request("/api/login", { method: "POST", body: { email, password } }),
  verify: (token) => request("/api/verify", { method: "POST", body: { token } }),
  resendVerify: (email) => request("/api/verify/resend", { method: "POST", body: { email } }),
  validateEmail: (email) => request("/api/validate-email", { method: "POST", body: { email } }),
  forgotPassword: (email) => request("/api/auth/forgot-password", { method: "POST", body: { email } }),
  verifyOtp: (email, otp) => request("/api/auth/verify-otp", { method: "POST", body: { email, otp } }),
  resetPassword: (resetToken, password) => request("/api/auth/reset-password", { method: "POST", body: { resetToken, password } }),
  me: () => request("/api/me"),
  toggleFavorite: (productId) => request("/api/wishlist/toggle", { method: "POST", body: { productId } }),
  createOrder: (items, total, address) => request("/api/orders", { method: "POST", body: { items, total, address } }),
}
