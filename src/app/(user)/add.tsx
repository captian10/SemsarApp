import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack } from "expo-router";
import React, { useMemo } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";

export default function Add() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const phone = "201012433451"; // ✅ مصر +20 بدون +
  const message = "السلام عليكم اريد اضافة وظيفة او عقار علي التطبيق";

  const openWhatsApp = async () => {
    const encoded = encodeURIComponent(message);

    const webUrl = `https://wa.me/${phone}?text=${encoded}`;
    const appUrl =
      Platform.OS === "ios"
        ? webUrl
        : `whatsapp://send?phone=${phone}&text=${encoded}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpen ? appUrl : webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "إضافة", headerShown: false }} />

      <Text style={styles.title}>تواصل معنا</Text>
      <Text style={styles.subtitle}>
        لرفع وظيفة أو لعرض عقارك، تواصل معنا على واتساب وسنرد عليك بسرعة.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <FontAwesome name="briefcase" size={18} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>رفع وظيفة</Text>
            <Text style={styles.cardText}>
              ابعت تفاصيل الوظيفة (المسمى، المكان، الراتب).
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <FontAwesome name="home" size={18} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>عرض عقارك</Text>
            <Text style={styles.cardText}>
              ابعت صور + السعر + الموقع + رقم التواصل.
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.whatsappBtn, pressed && styles.pressed]}
        onPress={openWhatsApp}
      >
        <FontAwesome name="whatsapp" size={20} color="#fff" />
        <Text style={styles.whatsappText}>واتساب</Text>
      </Pressable>
    </SafeAreaView>
  );
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
  const ink06 = `rgba(${ink},0.06)`;
  const ink08 = `rgba(${ink},0.08)`;
  const ink10 = `rgba(${ink},0.10)`;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingTop: 16,
    },

    title: {
      fontFamily: FONT.bold,
      fontSize: 22,
      color: colors.text,
      marginBottom: 6,
      textAlign: "right",
    },

    subtitle: {
      fontFamily: FONT.regular,
      fontSize: 13,
      color: colors.muted,
      lineHeight: 20,
      marginBottom: 14,
      textAlign: "right",
    },

    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: isDark ? 3 : 2,
    },

    row: {
      flexDirection: "row-reverse",
      gap: 12,
      alignItems: "flex-start",
    },

    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(59,130,246,0.10)",
      borderWidth: 1,
      borderColor: isDark ? ink10 : "rgba(59,130,246,0.18)",
      alignItems: "center",
      justifyContent: "center",
    },

    cardTitle: {
      fontFamily: FONT.bold,
      fontSize: 14,
      color: colors.text,
      textAlign: "right",
      marginBottom: 2,
    },

    cardText: {
      fontFamily: FONT.regular,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
      textAlign: "right",
    },

    divider: {
      height: 1,
      backgroundColor: isDark ? ink08 : "#F1F1F1",
      marginVertical: 12,
    },

    whatsappBtn: {
      marginTop: 16,
      backgroundColor: "#25D366",
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },

    whatsappText: {
      fontFamily: FONT.bold,
      fontSize: 14,
      color: "#fff",
    },

    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
}
