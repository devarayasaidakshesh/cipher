import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "@/context/StoreContext"

// Shown right after registering: "we sent you an email — click the link to activate."
export default function VerifyPending() {
  const { resendVerify } = useStore()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const resend = async () => {
    setSending(true)
    try {
      await resendVerify(localStorage.getItem("cipher.pendingEmail") || "")
      setSent(true)
      setTimeout(() => setSent(false), 5000)
    } catch {
      // ignore — server doesn't leak whether email exists
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ pending.activation</p>
      <h1 className="mt-4 font-display text-4xl font-bold">Check your inbox.</h1>
      <p className="mt-4 text-ash">
        We sent a verification link to your email. Click <span className="text-bone">VERIFY MY EMAIL</span> to
        activate your account.
      </p>
      <p className="mt-2 font-mono text-xs text-ash">
        No activation, no account — a real inbox is required.
      </p>

      <div className="mt-10 flex justify-center gap-3">
        <button
          onClick={resend}
          disabled={sending}
          className="border border-line px-6 py-3 font-mono text-xs uppercase tracking-widest text-ash hover:border-signal hover:text-signal disabled:opacity-50"
        >
          {sending ? "Sending…" : sent ? "Resent ✓" : "Resend link"}
        </button>
        <Link to="/account" className="bg-signal px-6 py-3 font-mono text-xs uppercase tracking-widest text-ink">
          Sign in
        </Link>
      </div>
      <p className="mt-8 text-ash text-sm">Didn't get it? Check spam / promotions.</p>
    </div>
  )
}
