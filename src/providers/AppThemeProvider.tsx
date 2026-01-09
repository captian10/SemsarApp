import { darkTheme, lightTheme, type AppTheme } from "@constants/AppTheme";
import { DarkTheme, DefaultTheme, type Theme as NavTheme } from "@react-navigation/native";
import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

const ThemeCtx = createContext<AppTheme>(lightTheme);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => (scheme === "dark" ? darkTheme : lightTheme), [scheme]);
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeCtx);
}

export function useNavigationTheme(): NavTheme {
  const t = useAppTheme();

  return useMemo(() => {
    const base = t.scheme === "dark" ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.primary,
        background: t.colors.bg,
        card: t.colors.surface,
        text: t.colors.text,
        border: t.colors.border,
        notification: t.colors.primary,
      },
    };
  }, [t]);
}
