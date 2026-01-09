import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";
import { Stack } from "expo-router";
import React, { useMemo } from "react";

export default function HomeStack() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";

  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.surface },
      headerShadowVisible: false,
      headerTitleStyle: {
        fontFamily: FONT.bold,
        color: colors.text,
        fontSize: 18,
      },
      headerTitleAlign: "center" as const,
      contentStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerLargeTitleShadowVisible: false,
    }),
    [colors]
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "المفضلة",
        }}
      />
    </Stack>
  );
}
