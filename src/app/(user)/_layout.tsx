import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { useClientOnlyValue } from "@components/useClientOnlyValue";
import { THEME } from "@constants/Colors";
import { useAuth } from "@providers/AuthProvider";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const didRedirect = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (loading) return;

    if (!session && !didRedirect.current) {
      didRedirect.current = true;
      router.replace("/(auth)/sign-in");
      return;
    }

    if (session) {
      didRedirect.current = false;
    }
  }, [loading, session?.user?.id, router]);

  if (loading || !session) return null;

  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 0);
  const tabHeight = 56 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: useClientOnlyValue(false, true),
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.gray[100],
        tabBarStyle: {
          backgroundColor: THEME.white.DEFAULT,
          borderTopColor: "#EDEDED",
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 11,
        },
      }}
    >
      {/* hide group index route */}
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="home"
        options={{
          title: "الصفحة الرئيسية",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "المفضلة",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="heart" color={color} />,
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: "التقديمات",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="file-text" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "البروفايل",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
