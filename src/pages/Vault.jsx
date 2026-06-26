import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { useProducts } from "@/context/ProductsContext"
import VaultBreadcrumb from "@/components/vault/VaultBreadcrumb"
import GenderSelect from "@/components/vault/GenderSelect"
import CategorySelect from "@/components/vault/CategorySelect"
import VaultGrid from "@/components/vault/VaultGrid"
import HangingCards from "@/components/vault/HangingCards"

// The Vault — an immersive shopping surface that replaces the plain PLP.
// State lives in the URL (?gender=&category=) so back/forward and deep links
// work. Steps: gender select → subcategory → product grid.
export default function Vault() {
  const { catalog, status } = useProducts()
  const [params, setParams] = useSearchParams()
  const gender = params.get("gender")
  const category = params.get("category")
  // Reduced-motion users get the 2D category list + grid (no 3D chest). The
  // Chest is the motion-on path and also a fallback safety net.
  const reduce = useReducedMotion()

  // Functional updaters so callers (the Chest, which stays mounted across
  // category changes) never capture a stale `params` closure.
  const setGender = (g) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (g) p.set("gender", g)
      else p.delete("gender")
      p.delete("category")
      return p
    })
  const setCategory = (c) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (c) p.set("category", c)
      else p.delete("category")
      return p
    })

  if (status === "loading" && !catalog.length) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center bg-ink font-mono text-sm text-muted">
        // decoding vault…
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col overflow-hidden bg-ink">
      <VaultBreadcrumb
        gender={gender}
        category={category}
        onHome={() => setParams({})}
      />

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!gender ? (
            <motion.div
              key="gender"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <GenderSelect catalog={catalog} onPick={setGender} />
            </motion.div>
          ) : reduce ? (
            // reduced-motion: the 2D category list → product grid path
            !category ? (
              <motion.div
                key="cat"
                className="absolute inset-0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <CategorySelect
                  gender={gender}
                  catalog={catalog}
                  onPick={setCategory}
                  onBack={() => setGender(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                className="absolute inset-0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <VaultGrid
                  gender={gender}
                  category={category}
                  catalog={catalog}
                  onBack={() => setCategory(null)}
                />
              </motion.div>
            )
          ) : (
            // 3D hanging-cards wardrobe — handles BOTH closed (!category) and
            // open (category) states in one mounted component; pull a card's
            // knot to breach that category (no x-slide swap).
            <motion.div
              key="rail"
              className="absolute inset-0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <HangingCards
                gender={gender}
                category={category}
                catalog={catalog}
                onPick={setCategory}
                onBack={() => setCategory(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
