import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";
import { useAuth } from "@providers/AuthProvider";
import { useAdminOpenRequestFromPush } from "@/lib/useAdminOpenRequestFromPush";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();

  // ✅ فتح صفحة الطلب (Request) عند الضغط على إشعار
  useAdminOpenRequestFromPush();

  // ✅ لو مش Admin رجّعه لليوزر
  if (!isAdmin) return <Redirect href="/(user)" />;

  const tabBarPaddingBottom =
    Platform.OS === "android" ? Math.max(insets.bottom, 10) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.gray[100],

        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 11,
          paddingTop: 2,
        },

        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: tabBarPaddingBottom,
            height: 58 + tabBarPaddingBottom,
          } as ViewStyle,
        ],
      }}
    >
      {/* hide / (admin)/index */}
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="home"
        options={{
          title: "العقارات",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: "التقديمات",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="file-text" color={color} />
          ),
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

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },

    elevation: 10,
  },
});
