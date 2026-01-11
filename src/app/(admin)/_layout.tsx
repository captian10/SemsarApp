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
  return <FontAwesome size={20} style={{ marginBottom: -1 }} {...props} />;
}

export default function TabLayout() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const t = useAppTheme();

  if (!isAdmin) return <Redirect href="/(user)" />;

  // ✅ على أندرويد (edge-to-edge) insets.bottom ساعات بيطلع 0
  // فنعمل حد أدنى عملي عشان اللابل مايتقصّش تحت
  const SAFE_ANDROID_MIN = 26; // جرّب 24..30 حسب جهازك
  const bottomInset =
    Platform.OS === "android"
      ? Math.max(insets.bottom, SAFE_ANDROID_MIN)
      : Math.max(insets.bottom, 10);

  // ✅ مساحة إضافية صغيرة جوة التاب بار
  const extraInner = 6;

  // ✅ ارتفاع مريح للآيكون + اللابل
  const BASE_HEIGHT = 58;
  const tabHeight = BASE_HEIGHT + bottomInset + extraInner;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.muted,

        // ✅ خلي مساحة تحت للـ label بدل ما يتقص
        tabBarItemStyle: {
          paddingTop: 1,
          paddingBottom: 10, // مهم جدًا للّابل
        },

        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 11,
          marginTop: 0,
          marginBottom: 1, // ما تنزّلوش لتحت
        },

        tabBarStyle: [
          styles.tabBarBase,
          t.scheme === "dark" ? styles.tabBarDark : styles.tabBarLight,
          {
            backgroundColor: t.colors.tabBarBg,
            borderTopColor: t.colors.tabBarBorder,
            borderTopWidth: 1,

            height: tabHeight,
            paddingTop: 8,
            paddingBottom: bottomInset + extraInner, // ✅ ده اللي بيمنع القص تحت
            paddingHorizontal: 8,
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
