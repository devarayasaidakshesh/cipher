// CIPHER garment illustrations.
// Each garment is a parameterized SVG: pass a colorway hex + product code and get
// back a data-URI image that looks like an actual product photo, not a flat swatch.
//
// All silhouettes share a consistent artboard (800x1000), a studio backdrop with
// subtle scanlines, a CIPHER glyph, and the product code printed as a "label".
// They render with zero external assets — same inline-SVG-data-URI approach as before.

const STUDIO_BG = "#111113" // ink-2
const STUDIO_FLOOR = "#0a0a0b"

// Convert "#c6ff00" -> { fill, shade, light } for shading a flat hex into a
// garment with a slightly darker shadow side + lighter highlight.
function shades(hex) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const shade = (c) => Math.max(0, Math.round(c * 0.7))
  const light = (c) => Math.min(255, Math.round(c + (255 - c) * 0.25))
  const to = (r2, g2, b2) => `#${[r2, g2, b2].map((n) => n.toString(16).padStart(2, "0")).join("")}`
  return {
    fill: hex,
    shade: to(shade(r), shade(g), shade(b)),
    light: to(light(r), light(g), light(b)),
  }
}

const isDark = (hex) => {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 90
}

// Shared frame: studio backdrop, scanlines, floor reflection, CIPHER watermark.
function frame(inner, code) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stop-color='${STUDIO_BG}'/>
        <stop offset='0.7' stop-color='${STUDIO_BG}'/>
        <stop offset='1' stop-color='${STUDIO_FLOOR}'/>
      </linearGradient>
      <linearGradient id='floor' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stop-color='${STUDIO_FLOOR}'/>
        <stop offset='1' stop-color='${STUDIO_BG}'/>
      </linearGradient>
      <pattern id='scan' width='4' height='4' patternUnits='userSpaceOnUse'>
        <rect width='4' height='4' fill='none'/>
        <rect width='4' height='1' fill='#ffffff' fill-opacity='0.025'/>
      </pattern>
    </defs>

    <rect width='800' height='1000' fill='url(#bg)'/>
    ${inner}
    <rect width='800' height='1000' fill='url(#scan)'/>
    <ellipse cx='400' cy='930' rx='230' ry='26' fill='#000000' fill-opacity='0.45'/>

    <text x='40' y='60' font-family='monospace' font-size='14' font-weight='700'
      letter-spacing='3' fill='#c6ff00' fill-opacity='0.9'>CIPHER//</text>
    <text x='760' y='60' font-family='monospace' font-size='14' font-weight='700'
      letter-spacing='2' fill='#8a8a93' text-anchor='end'>${code}</text>

    <rect x='40' y='40' width='720' height='920' fill='none'
      stroke='#26262c' stroke-width='1'/>
    <text x='400' y='970' font-family='monospace' font-size='11'
      letter-spacing='4' fill='#8a8a93' fill-opacity='0.6' text-anchor='middle'>
      DECODE THE FIT</text>
  </svg>`
}

// ---- Silhouettes ---------------------------------------------------------
// Each returns the garment paths only (drawn around cx=400, centered vertically).

function tee(c) {
  return `
    <path d='M250 320 L300 270 Q400 240 500 270 L550 320 L600 360 L560 410 L540 390
      L540 700 Q400 740 260 700 L260 390 L240 410 L200 360 Z' fill='${c.shade}'/>
    <path d='M260 390 L260 700 Q400 740 540 700 L540 390 L500 270 Q400 245 300 270 Z'
      fill='${c.fill}'/>
    <path d='M300 270 Q400 295 500 270 L500 300 Q400 322 300 300 Z' fill='${c.shade}'/>
    <path d='M335 268 Q400 290 465 268' fill='none' stroke='${c.light}' stroke-width='3'
      stroke-opacity='0.5'/>
    <path d='M540 392 L560 412 L600 362 L560 322 Z' fill='${c.shade}'/>
    <path d='M260 392 L240 412 L200 362 L240 322 Z' fill='${c.shade}'/>
    <text x='400' y='500' font-family='monospace' font-size='34' font-weight='700'
      letter-spacing='6' fill='${isDark(c.fill) ? c.light : c.shade}' fill-opacity='0.55'
      text-anchor='middle'>CIPHER</text>`
}

function hoodie(c) {
  return `
    <path d='M240 300 L300 250 Q400 225 500 250 L560 300 L620 360 L580 420 L555 400
      L555 720 Q400 760 245 720 L245 400 L220 420 L180 360 Z' fill='${c.shade}'/>
    <path d='M245 400 L245 720 Q400 760 555 720 L555 400 L500 250 Q400 230 300 250 Z'
      fill='${c.fill}'/>
    <path d='M345 250 Q400 360 455 250 Q470 248 470 270 Q400 400 330 270 Q330 248 345 250 Z'
      fill='${c.shade}'/>
    <path d='M400 280 Q400 360 400 420' fill='none' stroke='${c.light}' stroke-width='3'
      stroke-opacity='0.4'/>
    <rect x='340' y='430' width='120' height='150' rx='8' fill='${c.shade}'/>
    <rect x='350' y='440' width='100' height='130' rx='4' fill='${c.fill}'
      stroke='${c.shade}' stroke-width='2'/>
    <path d='M300 250 Q400 270 500 250' fill='none' stroke='${c.light}' stroke-width='3'
      stroke-opacity='0.4'/>
    <path d='M245 402 L220 422 L180 362 L225 322 Z' fill='${c.shade}'/>
    <path d='M555 402 L580 422 L620 362 L575 322 Z' fill='${c.shade}'/>
    <text x='400' y='640' font-family='monospace' font-size='30' font-weight='700'
      letter-spacing='5' fill='${isDark(c.fill) ? c.light : c.shade}' fill-opacity='0.5'
      text-anchor='middle'>CIPHER</text>`
}

function cargo(c) {
  return `
    <path d='M280 220 L520 220 L540 470 L525 820 L445 820 L420 470 L380 470 L355 820
      L275 820 L260 470 Z' fill='${c.shade}'/>
    <path d='M290 225 L510 225 L525 470 L510 815 L450 815 L420 475 L380 475 L350 815
      L290 815 L275 470 Z' fill='${c.fill}'/>
    <rect x='300' y='225' width='200' height='14' fill='${c.shade}'/>
    <rect x='340' y='430' width='120' height='10' fill='${c.shade}'/>
    <rect x='305' y='350' width='70' height='90' rx='4' fill='${c.shade}' stroke='${c.light}'
      stroke-width='1.5' stroke-opacity='0.3'/>
    <rect x='425' y='350' width='70' height='90' rx='4' fill='${c.shade}' stroke='${c.light}'
      stroke-width='1.5' stroke-opacity='0.3'/>
    <line x1='305' y1='380' x2='375' y2='380' stroke='${c.light}' stroke-width='1' stroke-opacity='0.4'/>
    <line x1='425' y1='380' x2='495' y2='380' stroke='${c.light}' stroke-width='1' stroke-opacity='0.4'/>
    <text x='400' y='280' font-family='monospace' font-size='22' font-weight='700'
      letter-spacing='4' fill='${isDark(c.fill) ? c.light : c.shade}' fill-opacity='0.5'
      text-anchor='middle'>CIPHER</text>`
}

function jacket(c) {
  return `
    <path d='M230 300 L295 255 Q400 235 505 255 L570 300 L640 370 L600 440 L560 415
      L560 730 Q400 770 240 730 L240 415 L200 440 L160 370 Z' fill='${c.shade}'/>
    <path d='M240 415 L240 730 Q400 770 560 730 L560 415 L505 255 Q400 240 295 255 Z'
      fill='${c.fill}'/>
    <path d='M295 255 Q400 320 505 255' fill='none' stroke='${c.light}' stroke-width='3'
      stroke-opacity='0.4'/>
    <path d='M400 275 L400 740' fill='none' stroke='${c.shade}' stroke-width='4'/>
    <path d='M400 275 L340 360 L360 380 L400 320 L440 380 L460 360 Z' fill='${c.shade}'/>
    <line x1='280' y1='560' x2='390' y2='560' stroke='${c.shade}' stroke-width='3'/>
    <line x1='410' y1='560' x2='520' y2='560' stroke='${c.shade}' stroke-width='3'/>
    <rect x='270' y='540' width='130' height='40' fill='${c.shade}' fill-opacity='0.6'/>
    <rect x='400' y='540' width='130' height='40' fill='${c.shade}' fill-opacity='0.6'/>
    <path d='M240 417 L200 442 L160 372 L205 332 Z' fill='${c.shade}'/>
    <path d='M560 417 L600 442 L640 372 L595 332 Z' fill='${c.shade}'/>
    <text x='400' y='690' font-family='monospace' font-size='26' font-weight='700'
      letter-spacing='5' fill='${isDark(c.fill) ? c.light : c.shade}' fill-opacity='0.5'
      text-anchor='middle'>CIPHER</text>`
}

function cap(c) {
  return `
    <path d='M250 480 Q400 360 550 480 L560 510 Q400 470 240 510 Z' fill='${c.shade}'/>
    <path d='M260 505 Q400 470 540 505 L540 560 Q400 540 260 560 Z' fill='${c.fill}'/>
    <ellipse cx='400' cy='560' rx='150' ry='40' fill='${c.shade}'/>
    <ellipse cx='400' cy='555' rx='140' ry='34' fill='${c.fill}'/>
    <path d='M400 380 L400 505' fill='none' stroke='${c.light}' stroke-width='3'
      stroke-opacity='0.4'/>
    <text x='400' y='470' font-family='monospace' font-size='30' font-weight='700'
      letter-spacing='2' fill='${isDark(c.fill) ? c.light : c.shade}' fill-opacity='0.6'
      text-anchor='middle'>C</text>`
}

function bag(c) {
  return `
    <path d='M300 360 Q400 280 500 360' fill='none' stroke='${c.shade}' stroke-width='14'/>
    <rect x='270' y='360' width='260' height='340' rx='18' fill='${c.shade}'/>
    <rect x='282' y='372' width='236' height='316' rx='12' fill='${c.fill}'/>
    <rect x='330' y='430' width='140' height='110' rx='8' fill='${c.shade}'/>
    <rect x='340' y='440' width='120' height='90' rx='4' fill='${c.fill}'
      stroke='${c.light}' stroke-width='1.5' stroke-opacity='0.3'/>
    <rect x='350' y='580' width='100' height='10' fill='${c.shade}'/>
    <text x='400' y='660' font-family='monospace' font-size='22' font-weight='700'
      letter-spacing='4' fill='${isDark(c.fill) ? c.light : c.shade}' fill-opacity='0.5'
      text-anchor='middle'>CIPHER</text>`
}

// Generic fallback (a folded-garment shape) for unknown types.
function generic(c) {
  return `
    <path d='M250 350 Q400 300 550 350 L580 500 Q400 560 220 500 Z' fill='${c.shade}'/>
    <path d='M260 360 Q400 320 540 360 L560 490 Q400 545 240 490 Z' fill='${c.fill}'/>
    <path d='M400 330 L400 540' fill='none' stroke='${c.light}' stroke-width='2'
      stroke-opacity='0.4'/>
    <text x='400' y='440' font-family='monospace' font-size='26' font-weight='700'
      letter-spacing='5' fill='${isDark(c.fill) ? c.light : c.shade}' fill-opacity='0.5'
      text-anchor='middle'>CIPHER</text>`
}

const SILHOUETTES = {
  Tee: tee,
  Hoodie: hoodie,
  Cargo: cargo,
  Pant: cargo, // trousers share the leg silhouette
  Shell: jacket,
  Jacket: jacket,
  Cap: cap,
  Bag: bag,
}

// Public: build a garment image data-URI for a product type + colorway.
export function garmentImage(type, colorway) {
  const draw = SILHOUETTES[type] || generic
  const c = shades(colorway.hex)
  const svg = frame(draw(c), colorway.name?.toUpperCase().slice(0, 16) || "PIECE")
  return `data:image/svg+xml,` + encodeURIComponent(svg)
}

// Map a product -> list of colorways each carrying a generated garment image.
export function withImages(product) {
  return {
    ...product,
    colorways: product.colorways.map((cw) => ({ ...cw, img: garmentImage(product.type, cw) })),
  }
}
