// Reusable CIPHER background: 60px grid overlay, 4 neon corner brackets, a
// downward scan line, and 6 floating hatched garment shapes. Used by the hero
// and the loading screen so they share one ambient language.

const SHAPES = [
  { rot: -18, left: 5, top: 10, w: 150, h: 190, dur: 6.2, delay: 0 },
  { rot: 14, left: 79, top: 7, w: 126, h: 158, dur: 7.8, delay: 1.5 },
  { rot: -10, left: 84, top: 53, w: 158, h: 204, dur: 5.8, delay: 0.8 },
  { rot: 22, left: 1, top: 58, w: 130, h: 168, dur: 8.1, delay: 2.1 },
  { rot: -22, left: 50, top: 3, w: 108, h: 142, dur: 6.7, delay: 1.0 },
  { rot: 8, left: 60, top: 70, w: 148, h: 192, dur: 7.2, delay: 0.4 },
]

function Bracket({ pos }) {
  const base = "absolute w-8 h-8 pointer-events-none"
  const map = {
    tl: "top-5 left-5 border-t border-l",
    tr: "top-5 right-5 border-t border-r",
    bl: "bottom-5 left-5 border-b border-l",
    br: "bottom-5 right-5 border-b border-r",
  }
  return <div className={`${base} ${map[pos]}`} style={{ borderColor: "rgba(200,255,0,0.35)" }} />
}

export default function CipherBg({ scan = true, float = true, brackets = true }) {
  return (
    <>
      {/* grid */}
      <div className="cipher-grid pointer-events-none absolute inset-0" />

      {/* floating hatched shapes */}
      {float && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {SHAPES.map((s, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: `${s.left}%`, top: `${s.top}%`, transform: `rotate(${s.rot}deg)` }}
            >
              <div
                className="cipher-float"
                style={{
                  width: s.w,
                  height: s.h,
                  border: "1px solid rgba(255,255,255,0.04)",
                  background:
                    "repeating-linear-gradient(-45deg,rgba(255,255,255,0.048) 0,rgba(255,255,255,0.048) 2px,transparent 2px,transparent 9px)",
                  animation: `cipherFloat ${s.dur}s ease-in-out ${s.delay}s infinite`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* scan line */}
      {scan && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
          <div
            className="absolute left-0 right-0 top-0 h-0.5"
            style={{
              background: "linear-gradient(90deg,transparent,#c8ff00,transparent)",
              animation: "cipherScan 13s linear 0s infinite",
            }}
          />
        </div>
      )}

      {/* corner brackets */}
      {brackets && (
        <>
          <Bracket pos="tl" />
          <Bracket pos="tr" />
          <Bracket pos="bl" />
          <Bracket pos="br" />
        </>
      )}
    </>
  )
}
