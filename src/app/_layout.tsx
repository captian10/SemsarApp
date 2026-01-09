import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
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

export { ErrorBoundary } from "expo-router";
export const unstable_settings = { initialRouteName: "/" };

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootLayoutNav />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const navTheme = useNavigationTheme();
  const t = useAppTheme();

  return (
    <>
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
    </>
  );
}
