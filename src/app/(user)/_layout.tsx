import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { useClientOnlyValue } from "@components/useClientOnlyValue";
import { THEME } from "@constants/Colors";
import { useAuth } from "@providers/AuthProvider";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  // ✅ أكبر شوية + مسافة لطيفة تحت
  return <FontAwesome size={22} style={{ marginBottom: 2 }} {...props} />;
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

    if (session) didRedirect.current = false;
  }, [loading, session?.user?.id, router]);

  if (loading || !session) return null;

  const bottomPad = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 0);

  // ✅ أعلى شوية عشان يبقى مريح
  const tabHeight = 66 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: useClientOnlyValue(false, true),
        tabBarActiveTintColor: THEME.primary,
        tabBarInactiveTintColor: THEME.gray[100],

        // ✅ توزيع متساوي + hit area أحسن
        tabBarItemStyle: {
          flex: 1,
          paddingVertical: 6,
        },

        tabBarStyle: {
          backgroundColor: THEME.white.DEFAULT,
          borderTopColor: "#EDEDED",
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },

        // ✅ ليبل أوضح
        tabBarLabelStyle: {
          fontFamily: FONT.medium,
          fontSize: 12,
          marginTop: 2,
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

      {/* ✅ Middle Add */}
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          headerShown: false,
          tabBarLabel: () => null, // بدل "" عشان نتجنب أي text
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
                // top: -18,
                alignSelf: "center",
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: THEME.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,

                shadowColor: "#000",
                shadowOpacity: 0.15,
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
