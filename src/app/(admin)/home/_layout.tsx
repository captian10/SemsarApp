import { FONT } from "@/constants/Typography";
import { FontAwesome } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

import { useAppTheme } from "@providers/AppThemeProvider";

export default function HomeStack() {
  const t = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.colors.bg },
        headerShadowVisible: false,
        headerTitleAlign: "center",
        headerTintColor: t.colors.text, // back button + icons default
        headerTitleStyle: {
          fontFamily: FONT.bold,
          fontSize: 18,
          color: t.colors.text,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "الصفحة الرئيسية",
          headerRight: () => (
            <Link href="/(admin)/home/create" asChild>
              <Pressable
                hitSlop={10}
                style={({ pressed }) => ({
                  marginRight: 15,
                  opacity: pressed ? 0.55 : 1,
                })}
              >
                <FontAwesome
                  name="plus-square-o"
                  size={24}
                  color={t.colors.primary}
                />
              </Pressable>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}
