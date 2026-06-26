import { useState } from "react"
import { useProducts } from "@/context/ProductsContext"
import { SIZES, garmentTypes } from "@/data/fakestore"
import { garmentImage } from "@/data/garments"

const blank = {
  id: "",
  code: "",
  name: "",
  category: "Tops",
  type: "",
  price: 0,
  drop: "DROP_01",
  description: "",
  sizes: ["S", "M", "L", "XL"],
  stock: { S: 0, M: 0, L: 0, XL: 0 },
  colorways: [
    { name: "Void Black", hex: "#0a0a0b", img: "" },
  ],
}

export default function Admin() {
  const { catalog, status, upsert, remove, reset } = useProducts()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)

  const startNew = () => { setEditing("new"); setDraft({ ...blank }) }
  const startEdit = (p) => { setEditing(p.id); setDraft(JSON.parse(JSON.stringify(p))) }

  const handleReset = () => {
    if (window.confirm("Re-fetch the catalog from FakeStoreAPI? Local edits will be lost.")) {
      reset()
    }
  }

  const save = (e) => {
    e.preventDefault()
    if (!draft.id || !draft.name) return
    // Generate a garment silhouette per colorway from the chosen type so the
    // new product renders the same illustrated imagery as the seed catalog.
    const colorways = draft.colorways.map((c) => ({
      name: c.name,
      hex: c.hex,
      img: garmentImage(draft.type || "Tee", { name: c.name, hex: c.hex }),
    }))
    upsert({ ...draft, code: draft.code || draft.id, colorways })
    setEditing(null)
    setDraft(null)
  }

  const field = (key, val) => setDraft((d) => ({ ...d, [key]: val }))

  const toggleSize = (s) =>
    setDraft((d) => ({
      ...d,
      sizes: d.sizes.includes(s)
        ? d.sizes.filter((x) => x !== s)
        : [...d.sizes, s],
      stock: d.sizes.includes(s) ? d.stock : { ...d.stock, [s]: d.stock[s] ?? 0 },
    }))

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-end justify-between border-b border-line pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ admin.console</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Catalog Manager</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} disabled={status === "loading"} className="border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-ash hover:border-signal hover:text-signal disabled:opacity-40">
            {status === "loading" ? "Syncing…" : "Reset catalog"}
          </button>
          <button onClick={startNew} className="bg-signal px-4 py-2 font-mono text-xs uppercase tracking-widest text-ink">
            + New product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-line text-ash">
              <th className="py-3 pr-4">Code</th>
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Category</th>
              <th className="py-3 pr-4">Price</th>
              <th className="py-3 pr-4">Stock</th>
              <th className="py-3 pr-4">Drop</th>
              <th className="py-3"></th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((p) => {
              const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0)
              return (
                <tr key={p.id} className="border-b border-line/50">
                  <td className="py-3 pr-4 text-signal">{p.code}</td>
                  <td className="py-3 pr-4 text-bone">{p.name}</td>
                  <td className="py-3 pr-4 text-ash">{p.category}</td>
                  <td className="py-3 pr-4 text-bone">${p.price}</td>
                  <td className="py-3 pr-4 text-ash">{totalStock}</td>
                  <td className="py-3 pr-4 text-ash">{p.drop}</td>
                  <td className="py-3">
                    <button onClick={() => startEdit(p)} className="text-bone hover:text-signal">Edit</button>
                    <button onClick={() => remove(p.id)} className="ml-3 text-ash hover:text-signal">Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Editor modal */}
      {editing && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6" onClick={() => setEditing(null)}>
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-line bg-ink-2 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">
                {editing === "new" ? "New product" : `Edit ${draft.code}`}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="text-ash hover:text-bone">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-ash">ID / Code</span>
                <input value={draft.id} onChange={(e) => field("id", e.target.value)} disabled={editing !== "new"}
                  className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm focus:border-signal focus:outline-none disabled:opacity-50" />
              </label>
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-ash">Name</span>
                <input value={draft.name} onChange={(e) => field("name", e.target.value)}
                  className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm focus:border-signal focus:outline-none" />
              </label>
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-ash">Category</span>
                <select value={draft.category} onChange={(e) => field("category", e.target.value)}
                  className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm focus:border-signal focus:outline-none">
                  {["Tops", "Bottoms", "Outerwear", "Accessories"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-ash">Type (silhouette)</span>
                <select value={draft.type} onChange={(e) => field("type", e.target.value)}
                  className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm focus:border-signal focus:outline-none">
                  <option value="">— select —</option>
                  {garmentTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-ash">Price ($)</span>
                <input type="number" value={draft.price} onChange={(e) => field("price", Number(e.target.value))}
                  className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm focus:border-signal focus:outline-none" />
              </label>
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-widest text-ash">Drop</span>
                <select value={draft.drop} onChange={(e) => field("drop", e.target.value)}
                  className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm focus:border-signal focus:outline-none">
                  {["DROP_01", "DROP_02"].map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="font-mono text-xs uppercase tracking-widest text-ash">Description</span>
              <textarea value={draft.description} onChange={(e) => field("description", e.target.value)} rows={2}
                className="mt-1 w-full border border-line bg-ink px-3 py-2 text-sm focus:border-signal focus:outline-none" />
            </label>

            {/* Sizes + stock */}
            <div className="mt-6">
              <p className="font-mono text-xs uppercase tracking-widest text-ash">Sizes & stock</p>
              <div className="mt-2 space-y-2">
                {SIZES.map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <label className="flex w-16 items-center gap-2 font-mono text-xs text-bone">
                      <input type="checkbox" checked={draft.sizes.includes(s)} onChange={() => toggleSize(s)} />
                      {s}
                    </label>
                    {draft.sizes.includes(s) && (
                      <input
                        type="number"
                        value={draft.stock[s] ?? 0}
                        onChange={(e) => setDraft((d) => ({ ...d, stock: { ...d.stock, [s]: Number(e.target.value) } }))}
                        className="w-24 border border-line bg-ink px-3 py-1 text-xs focus:border-signal focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Colorways */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase tracking-widest text-ash">Colorways</p>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, colorways: [...d.colorways, { name: "", hex: "#000000", img: "" }] }))}
                  className="font-mono text-xs text-signal hover:underline"
                >+ Add</button>
              </div>
              <div className="mt-2 space-y-2">
                {draft.colorways.map((cw, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="color" value={cw.hex}
                      onChange={(e) => setDraft((d) => {
                        const c = [...d.colorways]; c[i] = { ...c[i], hex: e.target.value }; return { ...d, colorways: c }
                      })}
                      className="h-8 w-10 border border-line bg-ink" />
                    <input value={cw.name} placeholder="Colour name"
                      onChange={(e) => setDraft((d) => {
                        const c = [...d.colorways]; c[i] = { ...c[i], name: e.target.value }; return { ...d, colorways: c }
                      })}
                      className="flex-1 border border-line bg-ink px-3 py-1 text-xs focus:border-signal focus:outline-none" />
                    <button type="button" onClick={() => setDraft((d) => ({ ...d, colorways: d.colorways.filter((_, j) => j !== i) }))}
                      className="text-ash hover:text-signal">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button type="submit" className="flex-1 bg-signal py-3 font-mono text-xs uppercase tracking-widest text-ink">
                Save product
              </button>
              <button type="button" onClick={() => setEditing(null)}
                className="border border-line px-6 font-mono text-xs uppercase tracking-widest text-ash hover:border-signal hover:text-signal">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
