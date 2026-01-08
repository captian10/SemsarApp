import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

export default function HomeStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: THEME.white.DEFAULT },
        headerTitleAlign: "center",
        headerTitleStyle: {
          fontFamily: FONT.bold,
          fontSize: 18,
          color: THEME.dark[100],
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "الصفحة الرئيسية",
        }}
      />
            <Stack.Screen name="see-all" options={{ title: "عرض الكل" }} />

    </Stack>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FF",
    borderWidth: 1,
    borderColor: "#E6EAFF",
  },
  pressed: { opacity: 0.85 },
});
