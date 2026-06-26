import { createContext, useContext, useState, useCallback, useRef } from "react"

// Lightweight control for the global auth modal. Nav (and anywhere else) calls
// openAuth("signup" | "login") to surface the modal; the modal itself lives in
// Layout so there's only ever one instance.
const AuthModalContext = createContext(null)

export function AuthModalProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState("signup") // "signup" | "login"
  const onSuccessRef = useRef(null)

  const openAuth = useCallback((m = "signup", onSuccess = null) => {
    setMode(m)
    onSuccessRef.current = onSuccess
    setOpen(true)
  }, [])

  const closeAuth = useCallback(() => {
    setOpen(false)
    onSuccessRef.current = null
  }, [])

  // Returns true if a vault callback was waiting (caller should skip default redirect)
  const resolveSuccess = useCallback(() => {
    const cb = onSuccessRef.current
    onSuccessRef.current = null
    setOpen(false)
    if (cb) { cb(); return true }
    return false
  }, [])

  return (
    <AuthModalContext.Provider value={{ open, mode, openAuth, closeAuth, setMode, resolveSuccess }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export const useAuthModal = () => {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider")
  return ctx
}
