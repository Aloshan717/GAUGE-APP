// ─── GAUGE THEMES ────────────────────────────────────────────────────────────
// Dark is black + green: near-black canvas, slightly lifted cards, one
// saturated green for actions and "on track", off-white text. Body fat and
// muscle keep their own hues so the three metrics never blur together.

export const NUM_FONT = "'Barlow Condensed', 'Inter', system-ui, sans-serif";

export const THEMES = {
  dark: {
    name:      "dark",
    pageBg:    "#000000",
    bg:        "#060807",
    surface:   "#0F1311",
    surface2:  "#161B18",
    surface3:  "#1F2622",
    text:      "#F1F5F2",
    divider:   "rgba(241,245,242,0.08)",
    accent:    "#2FE57D",
    accentInk: "#03130A",
    accent100: "rgba(47,229,125,0.10)",
    accent200: "rgba(47,229,125,0.18)",
    accent400: "rgba(47,229,125,0.45)",
    accent600: "#5CEFA0",
    n500:      "#59655E",
    n600:      "#86938B",
    n700:      "#B2BDB6",
    n800:      "#E2E8E4",
    ok:        "#2FE57D",
    warn:      "#FFC24B",
    bad:       "#FF5F57",
    fat:       "#FF9F43",
    muscle:    "#5AC8FA",
    glow:      "rgba(47,229,125,0.28)",
    shadow:    "0 1px 0 rgba(255,255,255,0.03) inset",
    radius:    "20px",
    radiusSm:  "12px",
  },
  light: {
    name:      "light",
    pageBg:    "#E6ECE8",
    bg:        "#F4F7F5",
    surface:   "#FFFFFF",
    surface2:  "#EEF3EF",
    surface3:  "#E1E8E3",
    text:      "#0B120E",
    divider:   "rgba(11,18,14,0.09)",
    accent:    "#0E9F4E",
    accentInk: "#FFFFFF",
    accent100: "rgba(14,159,78,0.09)",
    accent200: "rgba(14,159,78,0.16)",
    accent400: "rgba(14,159,78,0.42)",
    accent600: "#0B8742",
    n500:      "#9AA59E",
    n600:      "#66726A",
    n700:      "#435048",
    n800:      "#1B2520",
    ok:        "#0E9F4E",
    warn:      "#B7791F",
    bad:       "#D93A30",
    fat:       "#E07A1F",
    muscle:    "#1C8FD0",
    glow:      "rgba(14,159,78,0.22)",
    shadow:    "0 1px 2px rgba(11,18,14,0.05), 0 6px 20px rgba(11,18,14,0.04)",
    radius:    "20px",
    radiusSm:  "12px",
  },
};

// CSS variables for the bits inline styles can't do (focus rings, placeholders).
export const cssVars = (T) => ({
  "--accent": T.accent,
  "--accent-soft": T.accent200,
  "--muted": T.n500,
  "--text": T.text,
});
