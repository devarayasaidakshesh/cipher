import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "@/context/StoreContext"
import { useAuthModal } from "@/context/AuthModalContext"

export default function Account() {
  const { user, login, logout, orders, wishlist, authReady } = useStore()
  const { openAuth } = useAuthModal()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [needsVerify, setNeedsVerify] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!authReady) {
    return <div className="mx-auto max-w-md px-6 py-32 text-center font-mono text-sm text-ash">// restoring session…</div>
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ access</p>
        <h1 className="mb-6 mt-2 font-display text-4xl font-bold">Sign in</h1>
        <p className="mb-8 text-ash">Enter your credentials to access your account.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setError("")
            setNeedsVerify(false)
            setLoading(true)
            try {
              await login(email, password)
            } catch (err) {
              setError(err.message)
              if (err.data?.needsVerification) {
                setNeedsVerify(true)
                localStorage.setItem("cipher.pendingEmail", email)
              }
            } finally {
              setLoading(false)
            }
          }}
          className="space-y-4"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-line bg-ink-2 px-4 py-3 text-sm focus:border-signal focus:outline-none"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-line bg-ink-2 px-4 py-3 text-sm focus:border-signal focus:outline-none"
          />
          {error && <p className="font-mono text-xs text-signal">// {error}</p>}
          {needsVerify && (
            <Link to="/verify-pending" className="block text-center font-mono text-xs text-signal underline underline-offset-4 hover:opacity-80">
              Resend verification link →
            </Link>
          )}
          <button
            disabled={loading}
            className="w-full bg-signal py-3 font-mono text-xs uppercase tracking-widest text-ink disabled:opacity-50"
          >
            {loading ? "Decoding…" : "Decode access"}
          </button>
        </form>
        <p className="mt-6 font-mono text-xs text-ash">
          No account yet?{" "}
          <button onClick={() => openAuth("signup")} className="text-signal hover:underline">Sign up</button>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ user.session</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Hi, {user.name}</h1>
          <p className="font-mono text-xs text-ash">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-ash hover:border-signal hover:text-signal"
        >
          Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="border border-line bg-ink-2 p-6">
          <p className="font-display text-3xl font-bold text-signal">{orders.length}</p>
          <p className="font-mono text-xs text-ash">Orders</p>
        </div>
        <div className="border border-line bg-ink-2 p-6">
          <p className="font-display text-3xl font-bold text-signal">{wishlist.length}</p>
          <p className="font-mono text-xs text-ash">Saved pieces</p>
        </div>
        <div className="border border-line bg-ink-2 p-6">
          <p className="font-display text-3xl font-bold text-signal">
            ${orders.reduce((n, o) => n + o.total, 0)}
          </p>
          <p className="font-mono text-xs text-ash">Total spent</p>
        </div>
      </div>

      {/* Orders */}
      <div className="mt-12">
        <h2 className="mb-6 font-display text-2xl font-bold">Order History</h2>
        {orders.length === 0 ? (
          <p className="font-mono text-sm text-ash">// no.orders yet — your past orders will appear here</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="border border-line bg-ink-2 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-bone">{o.id}</p>
                    <p className="font-mono text-xs text-ash">{o.date} · {o.items.length} item(s)</p>
                  </div>
                  <p className="font-mono text-sm text-signal">${o.total}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.items.map((i) => (
                    <img key={i.key} src={i.img} alt={i.name} className="h-12 w-10 bg-bone p-1 object-contain" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
