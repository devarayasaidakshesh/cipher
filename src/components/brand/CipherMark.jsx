// CIPHER brand mark — a geometric "encoded C" monogram used as the logo badge.
// A bracketed glyph (think a C trapped in terminal brackets) that pairs with the
// decode-animated wordmark. Hover triggers a quick glitch skew (reduced-motion safe).

export default function CipherMark({ className = "", size = 28 }) {
  return (
    <span
      className={`group/mark inline-flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className="cipher-mark transition-transform duration-200 group-hover/mark:-skew-x-6 motion-reduce:transform-none"
      >
        <rect x="1" y="1" width="30" height="30" rx="6" className="fill-ink-3 stroke-line" strokeWidth="1.5" />
        {/* left bracket */}
        <path d="M9 10 H6 V22 H9" stroke="currentColor" strokeWidth="2" className="text-signal" strokeLinecap="square" fill="none" />
        {/* the C */}
        <path d="M22 11.5 A7 7 0 1 0 22 20.5" stroke="currentColor" strokeWidth="2.5" className="text-bone" strokeLinecap="round" fill="none" />
        {/* right bracket */}
        <path d="M23 10 H26 V22 H23" stroke="currentColor" strokeWidth="2" className="text-signal" strokeLinecap="square" fill="none" />
        {/* decode dot */}
        <circle cx="16" cy="16" r="1.4" className="fill-signal" />
      </svg>
    </span>
  )
}
