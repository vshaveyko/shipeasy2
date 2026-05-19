// Polylang-specific icons (Lucide-style, stroke=currentColor).
// Reuses Icon helper from icons.jsx.

const IconGlobe = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20" />
    <path d="M12 2a14.5 14.5 0 0 1 0 20" />
    <path d="M2 12h20" />
  </Icon>
);
const IconLanguages = (p) => (
  <Icon {...p}>
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </Icon>
);
const IconCursor = (p) => (
  <Icon {...p}>
    <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
  </Icon>
);
const IconWand = (p) => (
  <Icon {...p}>
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9h2" />
    <path d="M20 9h2" />
    <path d="M17.8 11.8 19 13" />
    <path d="M15 9h.01" />
    <path d="M17.8 6.2 19 5" />
    <path d="m3 21 9-9" />
    <path d="M12.2 6.2 11 5" />
  </Icon>
);
const IconKey = (p) => (
  <Icon {...p}>
    <path d="m21 2-9.6 9.6" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </Icon>
);
const IconCloud = (p) => (
  <Icon {...p}>
    <path d="M17.5 19a4.5 4.5 0 1 0-1.41-8.78 6 6 0 0 0-11.59 2.06A4 4 0 0 0 5 19h12.5z" />
  </Icon>
);
const IconCode = (p) => (
  <Icon {...p}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Icon>
);
const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);
const IconType = (p) => (
  <Icon {...p}>
    <path d="M14 4v16" />
    <path d="M4 7V5h16v2" />
    <path d="M9 20h6" />
  </Icon>
);

Object.assign(window, {
  IconGlobe,
  IconLanguages,
  IconCursor,
  IconWand,
  IconKey,
  IconCloud,
  IconCode,
  IconSearch,
  IconType,
});
