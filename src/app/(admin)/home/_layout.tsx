import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";
import { FontAwesome } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

export default function HomeStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: THEME.white.DEFAULT },
        headerShadowVisible: false,
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
                  color={THEME.primary}
                />
              </Pressable>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}
