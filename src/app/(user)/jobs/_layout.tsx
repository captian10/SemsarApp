import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";
import { Stack } from "expo-router";
import React from "react";

export default function JobsStack() {
  const t = useAppTheme();

  return (
    <Stack
      screenOptions={{
        // ✅ keep header hidden
        headerShown: false,

        // (حتى لو مخفي) نخلي الألوان مظبوطة لو ظهرت في أي transition/gesture
        headerStyle: { backgroundColor: t.colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: FONT.bold,
          color: t.colors.text,
          fontSize: 18,
        },
        headerTitleAlign: "center",

        // ✅ this is the important part for dark mode
        contentStyle: { backgroundColor: t.colors.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "وظائف",
        }}
      />
    </Stack>
  );
}
