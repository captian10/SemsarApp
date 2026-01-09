export const THEME = {
  primary: "#2563EB",

  white: {
    DEFAULT: "#F9FAFB",
    100: "#FFFFFF",
    200: "#E5E7EB",
  },

  gray: {
    100: "#9CA3AF",
    200: "#6B7280",
  },

  dark: {
    100: "#09133C",
    200: "#020617",
    300: "#0B1220",
  },

  error: "#EF4444",
  success: "#22C55E",

  lightMode: {
    background: "#F9FAFB",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F4F6",
    text: "#0F172A",
    textMuted: "#64748B",
    placeholder: "#94A3B8",
    border: "rgba(15, 23, 42, 0.10)",
    borderStrong: "rgba(15, 23, 42, 0.14)",
    tabBarBg: "#FFFFFF",
    tabBarBorder: "#EDEDED",
  },

  darkMode: {
    background: "#020617",
    surface: "#0B1220",
    surfaceAlt: "#0F172A",
    text: "#F8FAFC",
    textMuted: "rgba(248, 250, 252, 0.72)",
    placeholder: "rgba(248, 250, 252, 0.55)",
    border: "rgba(148, 163, 184, 0.18)",
    borderStrong: "rgba(148, 163, 184, 0.24)",
    tabBarBg: "#0B1220",
    tabBarBorder: "rgba(255, 255, 255, 0.10)",
    tabIconDefault: "rgba(248, 250, 252, 0.65)",
  },
} as const;

const Colors = {
  light: {
    text: THEME.lightMode.text,
    background: THEME.lightMode.background,
    tint: THEME.primary,
    tabIconDefault: THEME.gray[100],
    tabIconSelected: THEME.primary,
    card: THEME.lightMode.surface,
    border: THEME.lightMode.border,
    tabBarBg: THEME.lightMode.tabBarBg,
    tabBarBorder: THEME.lightMode.tabBarBorder,
    placeholder: THEME.lightMode.placeholder,
    muted: THEME.lightMode.textMuted,
  },

  dark: {
    text: THEME.darkMode.text,
    background: THEME.darkMode.background,
    tint: THEME.primary,
    tabIconDefault: THEME.darkMode.tabIconDefault,
    tabIconSelected: THEME.primary,
    card: THEME.darkMode.surface,
    border: THEME.darkMode.border,
    tabBarBg: THEME.darkMode.tabBarBg,
    tabBarBorder: THEME.darkMode.tabBarBorder,
    placeholder: THEME.darkMode.placeholder,
    muted: THEME.darkMode.textMuted,
  },

  error: THEME.error,
  success: THEME.success,
} as const;

export default Colors;
