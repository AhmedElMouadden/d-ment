/**
 * Decorative composition used until authentic photography of the branches,
 * team and garments is supplied (see docs/VERIFICATION.md §9). Hidden from
 * assistive technology because it carries no information.
 */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 520" aria-hidden focusable="false" className={className}>
      <defs>
        <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" />
          <stop offset="1" stopColor="#f3efe6" />
        </linearGradient>
        <pattern id="weave" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 7h14M7 0v14" stroke="#1f4d3a" strokeOpacity=".06" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="480" height="520" rx="32" fill="url(#hero-bg)" />
      <rect width="480" height="520" rx="32" fill="url(#weave)" />
      {/* Garment rail */}
      <path d="M40 92h400" stroke="#143326" strokeWidth="6" strokeLinecap="round" />
      {/* Background garment */}
      <g transform="translate(300 92)" stroke="#4b6640" strokeWidth="3" fill="#fbf9f4" strokeLinejoin="round">
        <path d="M0 0v18" fill="none" />
        <path d="M0 18-58 46" fill="none" />
        <path d="M0 18l58 28" fill="none" />
        <path d="M-58 46-78 90l26 10 6-30v260h92V70l6 30 26-10-20-44L18 34H-18z" />
      </g>
      {/* Foreground shirt on hanger */}
      <g transform="translate(190 92)" stroke="#143326" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 0c0-14 18-14 18-28" fill="none" />
        <path d="M0 4-92 52h184z" fill="none" />
        <path
          d="M-34 46-96 74l-22 112 40 10 18-80v272h188V116l18 80 40-10-22-112-62-28c-6 18-20 28-34 28s-28-10-34-28z"
          fill="#ffffff"
        />
        <path d="M0 74v300" fill="none" strokeWidth="2.5" />
        <path d="M-34 46 0 92l34-46" fill="none" />
        {[120, 170, 220, 270, 320].map((y) => (
          <circle key={y} cx="10" cy={y} r="4" fill="#1f4d3a" stroke="none" />
        ))}
        <path d="M30 150h40v34H30z" fill="none" strokeWidth="2.5" />
      </g>
      {/* Water drop and leaf: the water-based process */}
      <g transform="translate(372 340)">
        <circle r="54" fill="#1f4d3a" />
        <path d="M0-30C12-14 22-2 22 12a22 22 0 0 1-44 0c0-14 10-26 22-42z" fill="#e3ece5" />
        <path d="M-8 14a10 10 0 0 0 10 10" stroke="#1f4d3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <g transform="translate(80 420) rotate(-24)">
        <path d="M0 0c26-30 70-30 92 0-22 30-66 30-92 0z" fill="#4b6640" />
        <path d="M6 0h80" stroke="#e3ece5" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
