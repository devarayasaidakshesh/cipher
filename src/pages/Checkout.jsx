import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore } from "@/context/StoreContext"

const SHIPPING = 9
const FREE_OVER = 150

const field = "border border-line bg-ink-2 px-4 py-3 text-sm focus:border-signal focus:outline-none w-full"

export default function Checkout() {
  const { cart, cartSubtotal, placeOrder, user, authReady } = useStore()
  const [placed, setPlaced] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState("")

  const [addr, setAddr] = useState({
    firstName: "", lastName: "", address: "", city: "", postal: "", country: "",
  })

  const shipping = cartSubtotal >= FREE_OVER || cartSubtotal === 0 ? 0 : SHIPPING
  const total = cartSubtotal + shipping

  const set = (key) => (e) => setAddr((a) => ({ ...a, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError("")
    if (!user) return
    setPlacing(true)
    try {
      const order = await placeOrder(cart, total, addr)
      setPlaced(order)
    } catch (err) {
      setError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  if (authReady && !user && !placed) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ auth.required</p>
        <h1 className="mt-4 font-display text-4xl font-bold">Sign in to checkout</h1>
        <p className="mt-4 text-ash">Your order will be saved to your account so you can track it.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/signup" className="bg-signal px-6 py-3 font-mono text-xs uppercase tracking-widest text-ink">Sign up</Link>
          <Link to="/account" className="border border-line px-6 py-3 font-mono text-xs uppercase tracking-widest text-bone hover:border-signal">Sign in</Link>
        </div>
      </div>
    )
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ transmission received</p>
        <h1 className="mt-4 font-display text-5xl font-bold">Order Decoded.</h1>
        <p className="mt-4 text-ash">
          Your order <span className="font-mono text-bone">{placed.id}</span> is being compiled.
          A confirmation has been encrypted to your inbox.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/shop" className="bg-signal px-8 py-4 font-mono text-xs uppercase tracking-widest text-ink">
            Continue shopping
          </Link>
          <Link to="/account" className="border border-line px-8 py-4 font-mono text-xs uppercase tracking-widest text-bone hover:border-signal">
            View orders
          </Link>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-32 text-center">
        <p className="font-mono text-sm text-ash">// cart.empty</p>
        <h1 className="mt-4 font-display text-4xl font-bold">Nothing to decode.</h1>
        <Link to="/shop" className="mt-6 inline-block text-signal hover:underline">← Back to shop</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-10 font-display text-4xl font-bold">Checkout</h1>
      <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
        <form onSubmit={submit} className="space-y-8">
          <section>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-signal">▸ Shipping</h2>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="First name" value={addr.firstName} onChange={set("firstName")} className={field} />
              <input required placeholder="Last name"  value={addr.lastName}  onChange={set("lastName")}  className={field} />
              <input required placeholder="Address"    value={addr.address}   onChange={set("address")}   className={`col-span-2 ${field}`} />
              <input required placeholder="City"       value={addr.city}      onChange={set("city")}      className={field} />
              <input required placeholder="Postal code" value={addr.postal}   onChange={set("postal")}    className={field} />
              <input required placeholder="Country"    value={addr.country}   onChange={set("country")}   className={`col-span-2 ${field}`} />
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-signal">▸ Payment</h2>
            <input placeholder="Card number" className={field} />
            <div className="mt-3 grid grid-cols-3 gap-3">
              <input placeholder="MM / YY" className={field} />
              <input placeholder="CVC"     className={field} />
              <input placeholder="ZIP"     className={field} />
            </div>
            <p className="mt-3 font-mono text-xs text-ash">// mock checkout — no real charge</p>
          </section>

          <button
            type="submit"
            disabled={placing}
            className="w-full bg-signal py-4 font-mono text-xs uppercase tracking-widest text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {placing ? "Placing order…" : `Place order · $${total}`}
          </button>
          {error && <p className="font-mono text-xs text-signal">// {error}</p>}
        </form>

        <aside className="h-fit border border-line bg-ink-2 p-6">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-ash">Order summary</h2>
          <ul className="space-y-4">
            {cart.map((i) => (
              <li key={i.key} className="flex gap-3">
                <img src={i.img} alt={i.name} className="h-16 w-14 bg-bone p-1 object-contain" />
                <div className="flex-1">
                  <p className="font-display text-sm font-semibold">{i.name}</p>
                  <p className="font-mono text-xs text-ash">{i.size} · {i.colorway} · ×{i.qty}</p>
                </div>
                <p className="font-mono text-sm">${i.price * i.qty}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 border-t border-line pt-4 font-mono text-sm">
            <div className="flex justify-between text-ash"><span>Subtotal</span><span>${cartSubtotal}</span></div>
            <div className="flex justify-between text-ash">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : `$${shipping}`}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-bone">
              <span>Total</span><span className="text-signal">${total}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
