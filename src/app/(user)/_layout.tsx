import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { useClientOnlyValue } from "@components/useClientOnlyValue";
import { useAppTheme } from "@providers/AppThemeProvider";
import { useAuth } from "@providers/AuthProvider";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -1 }} {...props} />;
}

export default function TabLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const didRedirect = useRef(false);
  const insets = useSafeAreaInsets();

  const t = useAppTheme();
  const c = t.colors;

  useEffect(() => {
    if (loading) return;

    if (!session && !didRedirect.current) {
      didRedirect.current = true;
      router.replace("/(auth)/sign-in");
      return;
    }

    if (session) didRedirect.current = false;
  }, [loading, session?.user?.id, router]);

  if (loading || !session) return null;

  const bottomPad = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 14 : 10
  );
  const BASE_HEIGHT = 70;
  const tabHeight = BASE_HEIGHT + bottomPad;

  const fabLift = Platform.OS === "android" ? 8 : 6;

  return (
    <Tabs
      screenOptions={{
        headerShown: useClientOnlyValue(false, true),

        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,

        tabBarItemStyle: { flex: 1, paddingTop: 1, paddingBottom: 10 },

        tabBarStyle: {
          backgroundColor: c.tabBarBg,
          borderTopColor: c.tabBarBorder,
          borderTopWidth: 1,

          height: tabHeight,
          paddingBottom: bottomPad,
          paddingTop: 4,
          paddingHorizontal: 6,

          shadowColor: "#000",
          shadowOpacity: t.scheme === "dark" ? 0.25 : 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -6 },
          elevation: 10,
        },

        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 11,
          marginTop: 0,
          marginBottom: 1,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="home"
        options={{
          title: "الرئيسية",
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
        name="add"
        options={{
          title: "",
          headerShown: false,
          tabBarLabel: () => null,

          tabBarButton: ({
            accessibilityLabel,
            accessibilityState,
            testID,
          }) => (
            <Pressable
              onPress={() => router.push("/(user)/add")}
              accessibilityLabel={accessibilityLabel}
              accessibilityState={accessibilityState}
              testID={testID}
              hitSlop={12}
              style={({ pressed }) => ({
                alignSelf: "center",
                marginTop: -(fabLift - 4),

                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,

                shadowColor: "#000",
                shadowOpacity: t.scheme === "dark" ? 0.35 : 0.15,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 6 },
                elevation: 10,
              })}
            >
              <FontAwesome name="plus" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          title: "وظائف",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="briefcase" color={color} />
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
