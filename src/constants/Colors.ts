// constants/Colors.ts

const tintColorLight = "#FE8C00";
const tintColorDark = "#ffffff";

export const THEME = {
  primary: "#FE8C00",
  white: {
    DEFAULT: "#ffffff",
    100: "#fafafa",
    200: "#FE8C00",
  },
  gray: {
    100: "#878787",
    200: "#878787",
  },
  dark: {
    100: "#181C2E",
  },
  error: "#F14141",
  success: "#2F9B65",
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
    background: "#000000",
    tint: tintColorDark,
    tabIconDefault: THEME.gray[100],
    tabIconSelected: tintColorDark,
  },

  // keep these for convenience
  error: THEME.error,
  success: THEME.success,
} as const;

export default Colors;
