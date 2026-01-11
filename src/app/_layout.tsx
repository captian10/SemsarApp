import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";

import { SafeAreaProvider } from "react-native-safe-area-context";

import AuthProvider from "@providers/AuthProvider";
import NotificationProvider from "@providers/NotificationProvider";
import QueryProvider from "@providers/QueryProvider";

import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  useFonts,
} from "@expo-google-fonts/tajawal";

import {
  AppThemeProvider,
  useAppTheme,
  useNavigationTheme,
} from "@providers/AppThemeProvider";

import SystemBars from "@/components/SystemBars";
import AnimatedSplash from "../components/AnimatedSplash";

export { ErrorBoundary } from "expo-router";
export const unstable_settings = { initialRouteName: "/" };

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    ...FontAwesome.font,
  });

  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootLayoutNav
          showAnimatedSplash={showAnimatedSplash}
          onSplashDone={() => setShowAnimatedSplash(false)}
        />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav({
  showAnimatedSplash,
  onSplashDone,
}: {
  showAnimatedSplash: boolean;
  onSplashDone: () => void;
}) {
  const navTheme = useNavigationTheme();
  const t = useAppTheme();

  // Hide native splash only after first layout to avoid white flash
  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SystemBars />

      <StatusBar
        translucent
        backgroundColor="transparent"
        style={t.scheme === "dark" ? "light" : "dark"}
      />

      <ThemeProvider value={navTheme}>
        <AuthProvider>
          <QueryProvider>
            <NotificationProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: navTheme.colors.background },
                }}
              >
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="(user)" />
                <Stack.Screen name="(auth)" />
              </Stack>
            </NotificationProvider>
          </QueryProvider>
        </AuthProvider>
      </ThemeProvider>

      {showAnimatedSplash && <AnimatedSplash onDone={onSplashDone} />}
    </View>
  );
}
