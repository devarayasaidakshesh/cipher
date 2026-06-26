import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react"
import { api, setToken, getToken } from "@/lib/api"

// Auth, favorites, and orders are now backed by the Express API.
// The CART stays local (guests can shop, then sign in at checkout).
const StoreContext = createContext(null)

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => load("cipher.cart", []))
  const [user, setUser] = useState(null) // null until confirmed
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState("")

  // On mount: if we have a stored token, fetch the user
  useEffect(() => {
    if (!getToken()) {
      setAuthReady(true)
      return
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken("")) // token expired/invalid
      .finally(() => setAuthReady(true))
  }, [])

  useEffect(() => localStorage.setItem("cipher.cart", JSON.stringify(cart)), [cart])

  // ---- Cart (local) ----
  const addToCart = useCallback((item) => {
    const key = `${item.productId}|${item.size}|${item.colorway}`
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key)
      return existing
        ? prev.map((i) => (i.key === key ? { ...i, qty: i.qty + item.qty } : i))
        : [...prev, { key, ...item }]
    })
  }, [])

  const setQty = useCallback((key, qty) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, qty: Math.max(0, qty) } : i))
        .filter((i) => i.qty > 0)
    )
  }, [])

  const removeFromCart = useCallback((key) => setCart((prev) => prev.filter((i) => i.key !== key)), [])
  const clearCart = useCallback(() => setCart([]), [])

  // ---- Auth ----
  // Register creates a PENDING (unverified) account — no login yet.
  const register = useCallback(async (email, password, name) => {
    setAuthError("")
    try {
      await api.register(email, password, name)
      return { pending: true, email }
    } catch (e) {
      setAuthError(e.message)
      throw e
    }
  }, [])

  const verify = useCallback(async (token) => {
    setAuthError("")
    const { token: jwt, user } = await api.verify(token)
    setToken(jwt)
    setUser(user)
    return user
  }, [])

  const resendVerify = useCallback((email) => api.resendVerify(email), [])

  const login = useCallback(async (email, password) => {
    setAuthError("")
    try {
      const { token, user } = await api.login(email, password)
      setToken(token)
      setUser(user)
      return user
    } catch (e) {
      setAuthError(e.message)
      throw e
    }
  }, [])

  const logout = useCallback(() => {
    setToken("")
    setUser(null)
  }, [])

  // ---- Favorites (server) ----
  const toggleWish = useCallback(
    async (productId) => {
      if (!user) return
      // optimistic toggle
      const wasWished = user.favorites.includes(productId)
      setUser((u) => ({
        ...u,
        favorites: wasWished
          ? u.favorites.filter((id) => id !== productId)
          : [...u.favorites, productId],
      }))
      try {
        const { user: fresh } = await api.toggleFavorite(productId)
        setUser(fresh)
      } catch {
        // revert on failure
        setUser((u) => ({
          ...u,
          favorites: wasWished
            ? [...u.favorites, productId]
            : u.favorites.filter((id) => id !== productId),
        }))
      }
    },
    [user]
  )

  const isWished = useCallback((id) => !!user?.favorites.includes(id), [user])

  // ---- Orders (server) ----
  const placeOrder = useCallback(
    async (items, total, address) => {
      const { order, user: fresh } = await api.createOrder(items, total, address)
      setUser(fresh)
      setCart([])
      return order
    },
    []
  )

  const value = useMemo(() => {
    const cartCount = cart.reduce((n, i) => n + i.qty, 0)
    const cartSubtotal = cart.reduce((n, i) => n + i.qty * i.price, 0)
    return {
      cart,
      cartCount,
      cartSubtotal,
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      user,
      authReady,
      authError,
      register,
      verify,
      resendVerify,
      login,
      logout,
      wishlist: user?.favorites || [],
      toggleWish,
      isWished,
      orders: user?.orders || [],
      placeOrder,
    }
  }, [cart, user, authReady, authError, addToCart, setQty, removeFromCart, clearCart, register, verify, resendVerify, login, logout, toggleWish, isWished, placeOrder])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
