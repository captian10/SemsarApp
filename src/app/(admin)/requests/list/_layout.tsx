import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

const { Navigator, Screen } = createMaterialTopTabNavigator();

// ✅ IMPORTANT: pass BOTH Navigator and Screen
const TopTabs = withLayoutContext(Navigator);

export default function RequestListLayout() {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: THEME.white[100] }}
    >
      <TopTabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: THEME.white[100],
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(15, 23, 42, 0.06)",
          },
          tabBarLabelStyle: {
            fontFamily: FONT.bold,
            fontSize: 13,
            textTransform: "none",
          },
          tabBarActiveTintColor: THEME.primary,
          tabBarInactiveTintColor: THEME.gray[100],
          tabBarIndicatorStyle: {
            backgroundColor: THEME.primary,
            height: 3,
            borderRadius: 999,
          },
        }}
      >
        <TopTabs.Screen name="current" options={{ title: "الطلبات الحالية" }} />
        <TopTabs.Screen
          name="completed"
          options={{ title: "الطلبات التي تمت" }}
        />
      </TopTabs>
    </SafeAreaView>
  );
}
