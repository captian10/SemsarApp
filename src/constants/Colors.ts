// constants/Colors.ts

const tintColorLight = "#2563EB"; // modern booking blue
const tintColorDark = "#F9FAFB";

export const THEME = {
  // Main brand color (buttons, highlights, links)
  primary: "#2563EB", // royal blue

  white: {
    DEFAULT: "#F9FAFB", // app background in light mode
    100: "#FFFFFF",     // cards / surfaces
    200: "#E5E7EB",     // subtle borders / dividers
  },

  gray: {
    100: "#9CA3AF", // muted text, placeholders
    200: "#6B7280", // main body text on white
  },

  dark: {
    100: "#09133C", // deep navy (used for dark screens like auth background)
  },

  error: "#EF4444",
  success: "#22C55E",
} as const;

const Colors = {
  light: {
    text: THEME.dark[100],
    background: THEME.white.DEFAULT,
    tint: THEME.primary,
    tabIconDefault: THEME.gray[100],
    tabIconSelected: THEME.primary,
  },
  dark: {
    text: THEME.white.DEFAULT,
    background: "#020617",
    tint: tintColorDark,
    tabIconDefault: THEME.gray[100],
    tabIconSelected: tintColorDark,
  },

  // keep these for convenience
  error: THEME.error,
  success: THEME.success,
} as const;

export default Colors;
