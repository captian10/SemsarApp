import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { SafeAreaProvider } from "react-native-safe-area-context";

import CartProvider from "@providers/CartProvider";
import NotificationProvider from "@providers/NotificationProvider";
import QueryProvider from "@providers/QueryProvider";
import AuthProvider from "../providers/AuthProvider";

import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from "@expo-google-fonts/tajawal";

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
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  // ✅ ثابت Light (مش هنعتمد على DarkTheme)
  const theme = DefaultTheme;

  return (
    <>
      {/* ✅ StatusBar شفاف + ستايل مناسب للـ Light UI */}
      <StatusBar translucent backgroundColor="transparent" style="dark" />

      <ThemeProvider value={theme}>
        <AuthProvider>
          <QueryProvider>
            <NotificationProvider>
              <CartProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                >
                  <Stack.Screen name="(admin)" />
                  <Stack.Screen name="(user)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="cart" options={{ presentation: "modal" }} />
                </Stack>
              </CartProvider>
            </NotificationProvider>
          </QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
