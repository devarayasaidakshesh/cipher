import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useEffect } from "react"
import Layout from "@/components/layout/Layout"
import Home from "@/pages/Home"
import Vault from "@/pages/Vault"
import ProductDetail from "@/pages/ProductDetail"
import Checkout from "@/pages/Checkout"
import Wishlist from "@/pages/Wishlist"
import Account from "@/pages/Account"
import Verify from "@/pages/Verify"
import VerifyPending from "@/pages/VerifyPending"
import Admin from "@/pages/Admin"

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

// Redirects to /verify-pending if the user has registered but not verified yet
function PendingGuard({ children }) {
  const { pathname } = useLocation()
  const isPending = !!localStorage.getItem("cipher.pendingEmail")
  const allowed = pathname === "/verify-pending" || pathname.startsWith("/verify")
  if (isPending && !allowed) return <Navigate to="/verify-pending" replace />
  return children
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<PendingGuard><Home /></PendingGuard>} />
          <Route path="/vault" element={<PendingGuard><Vault /></PendingGuard>} />
          <Route path="/shop" element={<Navigate to="/vault" replace />} />
          <Route path="/product/:id" element={<PendingGuard><ProductDetail /></PendingGuard>} />
          <Route path="/checkout" element={<PendingGuard><Checkout /></PendingGuard>} />
          <Route path="/wishlist" element={<PendingGuard><Wishlist /></PendingGuard>} />
          <Route path="/account" element={<PendingGuard><Account /></PendingGuard>} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify-pending" element={<VerifyPending />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<PendingGuard><Home /></PendingGuard>} />
        </Route>
      </Routes>
    </>
  )
}
