import { Stack } from "expo-router";
import React from "react";

import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";

export default function HomeStack() {
  const t = useAppTheme();
  const c = t.colors;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,

        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleAlign: "center",
        headerTitleStyle: {
          fontFamily: FONT.bold,
          fontSize: 18,
          color: c.text,
        },

        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "الصفحة الرئيسية" }} />
      <Stack.Screen name="see-all" options={{ title: "عرض الكل" }} />
    </Stack>
  );
}
