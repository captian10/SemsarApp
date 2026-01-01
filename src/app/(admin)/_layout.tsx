import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@providers/AuthProvider";
import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";
import { useAdminOpenOrderFromPush } from "@/lib/useAdminOpenOrderFromPush";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();

  // ✅ open order details when admin taps the push notification
  useAdminOpenOrderFromPush();

  if (!isAdmin) return <Redirect href={"/"} />;

  const tabBarPaddingBottom =
    Platform.OS === "android" ? Math.max(insets.bottom, 10) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // ✅ ألوان ثابتة (مش بتتغير مع Dark mode)
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.gray[100],

        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 11,
          paddingTop: 2,
        },

        // ✅ مهم عشان مايتغطّاش بأزرار الأندرويد
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: tabBarPaddingBottom,
            height: 58 + tabBarPaddingBottom,
          } as ViewStyle,
        ],
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="cutlery" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: THEME.white.DEFAULT,
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    paddingTop: 8,

    // Shadow iOS
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },

    // Shadow Android
    elevation: 10,
  },
});
