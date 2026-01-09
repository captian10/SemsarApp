import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";
import { Stack } from "expo-router";
import React from "react";

export default function AdminJobsStack() {
  const t = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.colors.bg },
        headerShadowVisible: false,
        headerTintColor: t.colors.text,
        headerTitleStyle: {
          fontFamily: FONT.bold,
          color: t.colors.text,
          fontSize: 18,
        },
        headerTitleAlign: "center",
        contentStyle: { backgroundColor: t.colors.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "إدارة الوظائف",
        }}
      />

      <Stack.Screen
        name="create"
        options={{
          title: "إضافة وظيفة",
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: "تفاصيل الوظيفة",
        }}
      />
    </Stack>
  );
}
