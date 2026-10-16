/** Garment glyphs drawn on lucide's 24 px grid and stroke, for consistency. */
type P = { className?: string; "aria-hidden"?: boolean };

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const PantsIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 3h12l1 18h-5l-2-11-2 11H5z" />
    <path d="M6 7h12" />
  </svg>
);

export const SuitIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 3 4 6v15h16V6l-4-3" />
    <path d="m8 3 4 7 4-7" />
    <path d="M12 10v11" />
    <path d="M9 3h6" />
  </svg>
);

export const CoatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 3 5 5 3 21h6l1-8" />
    <path d="m15 3 4 2 2 16h-6l-1-8" />
    <path d="M9 3c0 2 1.5 3 3 3s3-1 3-3" />
    <path d="M12 6v15" />
  </svg>
);

export const DressIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 3v4l-1 3h8l-1-3V3" />
    <path d="M8 10 5 21h14l-3-11" />
  </svg>
);
