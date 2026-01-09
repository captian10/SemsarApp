import Colors, { THEME } from "@constants/Colors";
import { useColorScheme } from "react-native";

export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  return { isDark, colors, THEME };
}
