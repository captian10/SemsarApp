import { useAppTheme } from "@providers/AppThemeProvider";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function SystemBars() {
  const t = useAppTheme();
  const isDark = t.scheme === "dark";

  useEffect(() => {
    if (Platform.OS !== "android") return;

    (async () => {
      try {
        await NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
      } catch {}
    })();
  }, [isDark]);

  return null;
}
