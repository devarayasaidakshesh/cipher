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

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          {/* The Vault replaces the old Shop PLP */}
          <Route path="/vault" element={<Vault />} />
          <Route path="/shop" element={<Navigate to="/vault" replace />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<Account />} />
          {/* Signup is now a modal triggered from the nav; keep verify routes */}
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify-pending" element={<VerifyPending />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </>
  )
}
