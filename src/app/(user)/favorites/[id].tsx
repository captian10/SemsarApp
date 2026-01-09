import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";

export default function FavoriteDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const id = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return typeof raw === "string" ? raw.trim() : "";
  }, [params?.id]);

  if (!id) {
    return (
      <View style={styles.screen}>
        <Stack.Screen
          options={{
            title: "المفضلة",
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: { color: colors.text, fontFamily: FONT.bold },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        />

        <View style={styles.center}>
          <Text style={styles.title}>معرّف غير صالح</Text>
          <Text style={styles.sub}>ارجع وافتح الإعلان من المفضلة مرة تانية.</Text>

          <Pressable onPress={() => router.back()} style={styles.btn}>
            <Text style={styles.btnText}>رجوع</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <Redirect href={{ pathname: "/(user)/home/[id]", params: { id } }} />;
}

function createStyles(
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
    error: string;
    tabBarBg: string;
    tabBarBorder: string;
  },
  isDark: boolean
) {
  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink60 = `rgba(${ink},0.60)`;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
    },

    title: {
      fontFamily: FONT.bold,
      fontSize: 16,
      color: colors.text,
      textAlign: "center",
    },

    sub: {
      fontFamily: FONT.regular,
      fontSize: 12,
      color: ink60,
      textAlign: "center",
      lineHeight: 18,
    },

    btn: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },

    btnText: {
      color: "#fff",
      fontFamily: FONT.bold,
      fontSize: 13,
    },
  });
}
