import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthModal } from "@/context/AuthModalContext"
import { useStore } from "@/context/StoreContext"
import { api } from "@/lib/api"

// mode: "signup" | "login" | "forgot-email" | "forgot-otp" | "forgot-reset"
export default function AuthModal() {
  const { open, mode, setMode, closeAuth, resolveSuccess } = useAuthModal()
  const { register, login } = useStore()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  // email domain validation state
  const [emailStatus, setEmailStatus] = useState(null) // null | "checking" | "ok" | "bad"
  const emailTimer = useRef(null)

  // forgot password state
  const [forgotEmail, setForgotEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const reset = () => {
    setName(""); setEmail(""); setPassword(""); setError("")
    setEmailStatus(null); setForgotEmail(""); setOtp(""); setResetToken(""); setNewPassword("")
  }

  const close = () => { reset(); closeAuth() }

  const switchTo = (m) => { setError(""); setMode(m) }

  // Validate email domain on blur (debounced)
  const onEmailChange = (val) => {
    setEmail(val)
    setEmailStatus(null)
    clearTimeout(emailTimer.current)
    if (!val.includes("@")) return
    setEmailStatus("checking")
    emailTimer.current = setTimeout(async () => {
      try {
        const { valid } = await api.validateEmail(val)
        setEmailStatus(valid ? "ok" : "bad")
      } catch {
        setEmailStatus(null)
      }
    }, 600)
  }

  // ── Sign up / Sign in submit ──────────────────────────────────────────────
  const submit = async (e) => {
    e.preventDefault()
    if (emailStatus === "bad") return setError("This email domain doesn't appear to exist.")
    setError("")
    setBusy(true)
    try {
      if (mode === "signup") {
        await register(email, password, name)
        localStorage.setItem("cipher.pendingEmail", email)
        close()
        navigate("/verify-pending")
      } else {
        await login(email, password)
        reset()
        const handled = resolveSuccess()
        if (!handled) navigate("/account")
      }
    } catch (err) {
      if (err.data?.needsVerification) { close(); navigate("/verify-pending"); return }
      setError(err.message || "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  // ── Forgot — step 1: send OTP ─────────────────────────────────────────────
  const submitForgotEmail = async (e) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      await api.forgotPassword(forgotEmail)
      switchTo("forgot-otp")
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  // ── Forgot — step 2: verify OTP ──────────────────────────────────────────
  const submitOtp = async (e) => {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      const { resetToken: tok } = await api.verifyOtp(forgotEmail, otp)
      setResetToken(tok)
      switchTo("forgot-reset")
    } catch (err) {
      setError(err.message || "Incorrect code")
    } finally {
      setBusy(false)
    }
  }

  // ── Forgot — step 3: set new password ────────────────────────────────────
  const submitReset = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) return setError("Password must be at least 6 characters")
    setError("")
    setBusy(true)
    try {
      await api.resetPassword(resetToken, newPassword)
      reset()
      switchTo("login")
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  const emailIndicator = emailStatus === "checking"
    ? <span className="text-ash">checking…</span>
    : emailStatus === "ok"
    ? <span className="text-signal">✓ valid</span>
    : emailStatus === "bad"
    ? <span style={{ color: "#ff4d4d" }}>✗ domain not found</span>
    : null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-6 backdrop-blur-[3px]"
          onClick={close}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-sm border border-line bg-ink-3 p-8"
          >
            {/* ── Close button (shared) ── */}
            <button
              type="button"
              onClick={close}
              className="absolute right-6 top-6 text-ash transition-colors hover:text-bone"
              aria-label="Close"
              style={{ position: "absolute" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {/* ══ SIGNUP / LOGIN ══════════════════════════════════════════ */}
            {(mode === "signup" || mode === "login") && (
              <form onSubmit={submit}>
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-signal">
                    {mode === "signup" ? "// AUTH.REGISTER" : "// AUTH.ACCESS"}
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-extrabold uppercase tracking-tight">
                    {mode === "signup" ? "Join the Vault" : "Welcome Back"}
                  </h2>
                </div>

                <div className="space-y-3">
                  {mode === "signup" && (
                    <label className="block">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Callsign</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="your handle"
                        className="mt-1 w-full border border-line bg-ink px-3 py-2.5 font-body text-sm outline-none transition-colors focus:border-signal"
                      />
                    </label>
                  )}
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Email</span>
                      <span className="font-mono text-[9px]">{emailIndicator}</span>
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                      placeholder="you@signal.io"
                      className="mt-1 w-full border border-line bg-ink px-3 py-2.5 font-body text-sm outline-none transition-colors focus:border-signal"
                      style={{ borderColor: emailStatus === "bad" ? "#ff4d4d" : emailStatus === "ok" ? "#c8ff00" : "" }}
                    />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Password</span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full border border-line bg-ink px-3 py-2.5 font-body text-sm outline-none transition-colors focus:border-signal"
                    />
                  </label>
                </div>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => switchTo("forgot-email")}
                    className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ash transition-colors hover:text-signal"
                  >
                    Forgot password?
                  </button>
                )}

                {error && <p className="mt-3 font-mono text-[11px]" style={{ color: "#ff4d4d" }}>{error}</p>}

                <button
                  type="submit"
                  disabled={busy || emailStatus === "bad"}
                  className="mt-6 w-full bg-signal py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-signal-hover disabled:opacity-50"
                >
                  {busy ? "TRANSMITTING…" : mode === "signup" ? "REGISTER →" : "SIGN IN →"}
                </button>

                <p className="mt-5 text-center font-body text-[13px] text-ash">
                  {mode === "signup" ? (
                    <>Already have an account?{" "}
                      <button type="button" onClick={() => switchTo("login")} className="font-mono text-[12px] uppercase tracking-[0.1em] text-signal transition-opacity hover:opacity-70">Sign In</button>
                    </>
                  ) : (
                    <>New here?{" "}
                      <button type="button" onClick={() => switchTo("signup")} className="font-mono text-[12px] uppercase tracking-[0.1em] text-signal transition-opacity hover:opacity-70">Sign Up</button>
                    </>
                  )}
                </p>

                <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                  {mode === "signup" ? "// verify your signal via email link" : "// encrypted access only"}
                </p>
              </form>
            )}

            {/* ══ FORGOT — STEP 1: enter email ══════════════════════════════ */}
            {mode === "forgot-email" && (
              <form onSubmit={submitForgotEmail}>
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-signal">// AUTH.RESET</p>
                  <h2 className="mt-1 font-display text-3xl font-extrabold uppercase tracking-tight">Reset Signal</h2>
                  <p className="mt-2 font-mono text-[11px] text-ash leading-relaxed">
                    Enter your email — we'll send a one-time code.
                  </p>
                </div>

                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">Email</span>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@signal.io"
                    className="mt-1 w-full border border-line bg-ink px-3 py-2.5 font-body text-sm outline-none transition-colors focus:border-signal"
                  />
                </label>

                {error && <p className="mt-3 font-mono text-[11px]" style={{ color: "#ff4d4d" }}>{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 w-full bg-signal py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-signal-hover disabled:opacity-50"
                >
                  {busy ? "SENDING…" : "SEND CODE →"}
                </button>

                <button type="button" onClick={() => switchTo("login")} className="mt-4 w-full text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ash hover:text-signal">
                  ← Back to sign in
                </button>
              </form>
            )}

            {/* ══ FORGOT — STEP 2: enter OTP ════════════════════════════════ */}
            {mode === "forgot-otp" && (
              <form onSubmit={submitOtp}>
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-signal">// AUTH.VERIFY</p>
                  <h2 className="mt-1 font-display text-3xl font-extrabold uppercase tracking-tight">Enter Code</h2>
                  <p className="mt-2 font-mono text-[11px] text-ash leading-relaxed">
                    A 6-digit code was sent to<br/>
                    <span className="text-bone">{forgotEmail}</span>.<br/>
                    It expires in 10 minutes.
                  </p>
                </div>

                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">One-Time Code</span>
                  <input
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="mt-1 w-full border border-line bg-ink px-3 py-2.5 font-mono text-2xl tracking-[0.4em] outline-none transition-colors focus:border-signal text-center"
                  />
                </label>

                {error && <p className="mt-3 font-mono text-[11px]" style={{ color: "#ff4d4d" }}>{error}</p>}

                <button
                  type="submit"
                  disabled={busy || otp.length !== 6}
                  className="mt-6 w-full bg-signal py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-signal-hover disabled:opacity-50"
                >
                  {busy ? "VERIFYING…" : "VERIFY CODE →"}
                </button>

                <button
                  type="button"
                  onClick={() => { setError(""); submitForgotEmail({ preventDefault: () => {} }) }}
                  className="mt-3 w-full text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ash hover:text-signal"
                >
                  Resend code
                </button>
              </form>
            )}

            {/* ══ FORGOT — STEP 3: new password ═════════════════════════════ */}
            {mode === "forgot-reset" && (
              <form onSubmit={submitReset}>
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-signal">// AUTH.REKEY</p>
                  <h2 className="mt-1 font-display text-3xl font-extrabold uppercase tracking-tight">New Password</h2>
                  <p className="mt-2 font-mono text-[11px] text-ash leading-relaxed">
                    Set a new password for your account.
                  </p>
                </div>

                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">New Password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="mt-1 w-full border border-line bg-ink px-3 py-2.5 font-body text-sm outline-none transition-colors focus:border-signal"
                  />
                </label>

                {error && <p className="mt-3 font-mono text-[11px]" style={{ color: "#ff4d4d" }}>{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 w-full bg-signal py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-signal-hover disabled:opacity-50"
                >
                  {busy ? "SAVING…" : "SET PASSWORD →"}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
