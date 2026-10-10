const base = { "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
export const MoonIcon = () => (
  <svg {...base} width="17" height="17" viewBox="0 0 24 24">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);
export const SunIcon = () => (
  <svg {...base} width="17" height="17" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const BookIcon = () => (
  <svg {...base} width="17" height="17" viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </svg>
);
export const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const ExternalIcon = () => (
  <svg {...base} width="13" height="13" viewBox="0 0 24 24">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
export const AlertIcon = () => (
  <svg {...base} width="20" height="20" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </svg>
);
