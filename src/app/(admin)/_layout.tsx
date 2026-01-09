import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";
import { useAuth } from "@providers/AuthProvider";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const t = useAppTheme();

  if (!isAdmin) return <Redirect href="/(user)" />;

  const tabBarPaddingBottom =
    Platform.OS === "android" ? Math.max(insets.bottom, 10) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.muted,

        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 11,
          paddingTop: 2,
        },

        tabBarStyle: [
          styles.tabBarBase,
          t.scheme === "dark" ? styles.tabBarDark : styles.tabBarLight,
          {
            backgroundColor: t.colors.tabBarBg,
            borderTopColor: t.colors.tabBarBorder,
            paddingBottom: tabBarPaddingBottom,
            height: 58 + tabBarPaddingBottom,
          } as ViewStyle,
        ],
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="home"
        options={{
          title: "العقارات",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          title: "الوظائف",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="briefcase" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBase: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },

  tabBarDark: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },

  tabBarLight: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
});
