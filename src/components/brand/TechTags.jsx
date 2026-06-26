import { useEffect, useRef, useState } from "react"

// Interactive "tech tags" — monospace spec chips (240GSM, UV-INK, SEALED, …).
// On hover a chip decodes: characters scramble through glyphs then resolve,
// echoing the CIPHER wordmark. Respects prefers-reduced-motion (no scramble,
// just a color lift) and is tap-friendly on touch (decodes on focus too).

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/%<>"

function prefersReduced() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function TechTag({ label, tone = "default" }) {
  const [display, setDisplay] = useState(label)
  const [active, setActive] = useState(false)
  const timer = useRef(null)

  const run = () => {
    if (prefersReduced()) return
    let frame = 0
    const total = label.length * 3
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      frame++
      setDisplay(
        label
          .split("")
          .map((ch, i) =>
            frame >= i * 2 ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          )
          .join("")
      )
      if (frame >= total) {
        setDisplay(label)
        clearInterval(timer.current)
      }
    }, 40)
  }

  const start = () => {
    setActive(true)
    run()
  }
  const end = () => {
    setActive(false)
    clearInterval(timer.current)
    setDisplay(label)
  }

  useEffect(() => () => clearInterval(timer.current), [])

  const tones = {
    default: active
      ? "border-signal text-signal"
      : "border-line text-ash hover:text-bone",
    signal: "border-signal/60 text-signal",
  }

  return (
    <span
      onMouseEnter={start}
      onMouseLeave={end}
      onFocus={start}
      onBlur={end}
      tabIndex={0}
      className={`cursor-pointer select-none border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${tones[tone]}`}
    >
      {display}
    </span>
  )
}

// Spec library keyed by garment type. A product surfaces its own tech tags
// via <TechTags product={p} />, or render a fixed set via <TechTags tags={[...]} />.
export const TECH_SPECS = {
  Tee: ["240GSM", "BOXY-FIT", "ENCRYPTED-PRINT", "PRESHRUNK"],
  Hoodie: ["400GSM", "BRUSHED", "KANGAROO", "WOVEN-LABEL"],
  Cargo: ["6-POCKET", "RIPSTOP", "ADJ-HEM", "YKK-ZIP"],
  Pant: ["4WAY-STRETCH", "TAPERED", "HIDDEN-CORD", "DWR"],
  Shell: ["3-LAYER", "20K-MM", "SEALED", "CONCEALED-CARGO"],
  Cap: ["6-PANEL", "UNSTRUCTURED", "EMBROIDERED", "ADJ-STRAP"],
  Bag: ["500D", "MODULAR", "SLING", "RFID-FREE"],
}

export default function TechTags({ product, tags, className = "" }) {
  const list = tags || (product ? TECH_SPECS[product.type] || [] : []) || []
  if (!list.length) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {list.map((t) => (
        <TechTag key={t} label={t} />
      ))}
    </div>
  )
}
