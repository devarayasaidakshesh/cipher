import { useEffect, useState } from "react"

// Decode animation: scrambles glyphs then resolves to the target text.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/%"

export default function CipherWordmark({ text = "CIPHER", className = "" }) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    let frame = 0
    const totalFrames = text.length * 4
    const id = setInterval(() => {
      frame++
      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " "
            const resolvedAt = i * 2
            if (frame >= resolvedAt) return char
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          })
          .join("")
      )
      if (frame >= totalFrames) {
        setDisplay(text)
        clearInterval(id)
      }
    }, 45)
    return () => clearInterval(id)
  }, [text])

  return <span className={className}>{display}</span>
}
