import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useStore } from "@/context/StoreContext"
import { useAuthModal } from "@/context/AuthModalContext"

// Landing page for the magic-link click. Reads ?token= and activates the account.
export default function Verify() {
  const [params] = useSearchParams()
  const token = params.get("token")
  const { verify } = useStore()
  const { openAuth } = useAuthModal()
  const navigate = useNavigate()
  const [status, setStatus] = useState("verifying") // verifying | success | error
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token found in the link.")
      return
    }
    verify(token)
      .then(() => {
        setStatus("success")
        // give them a moment to read it, then head to the shop
        setTimeout(() => navigate("/shop"), 2500)
      })
      .catch((e) => {
        setStatus("error")
        setMessage(e.message || "Verification failed.")
      })
  }, [token, verify, navigate])

  if (status === "verifying") {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ verifying.signal…</p>
        <h1 className="mt-4 font-display text-3xl font-bold">Decoding access…</h1>
        <p className="mt-3 text-ash">Confirming your email with the server.</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ access.granted</p>
        <h1 className="mt-4 font-display text-4xl font-bold">Email Verified.</h1>
        <p className="mt-4 text-ash">You're signed in. Taking you to the shop…</p>
        <Link to="/shop" className="mt-8 inline-block bg-signal px-8 py-4 font-mono text-xs uppercase tracking-widest text-ink">
          Enter Shop →
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-32 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ verification.failed</p>
      <h1 className="mt-4 font-display text-4xl font-bold">Couldn't verify.</h1>
      <p className="mt-4 text-ash">{message}</p>
      <p className="mt-2 text-ash">The link may be invalid, already used, or expired.</p>
      <button onClick={() => openAuth("signup")} className="mt-8 inline-block text-signal hover:underline">← Back to sign up</button>
    </div>
  )
}
