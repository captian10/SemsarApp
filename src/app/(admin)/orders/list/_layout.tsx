import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";

const TopTabs = withLayoutContext(createMaterialTopTabNavigator().Navigator);

export default function OrderListNavigator() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: THEME.white[100] }}>
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
        <TopTabs.Screen name="completed" options={{ title: "الطلبات التي تمت" }} />
      </TopTabs>
    </SafeAreaView>
  );
}
