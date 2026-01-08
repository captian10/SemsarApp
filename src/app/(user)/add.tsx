import React from "react";
import { View, Text, Pressable, Linking, Platform } from "react-native";
import { Stack } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Add() {
  const phone = "201012433451"; // ✅ مصر +20 بدون +
  const message = "السلام عليكم اريد اضافة وظيفة او عقار علي التطبيق";

  const openWhatsApp = async () => {
    const encoded = encodeURIComponent(message);

    // ✅ رابط عالمي شغال دائمًا
    const webUrl = `https://wa.me/${phone}?text=${encoded}`;

    // ✅ رابط app (Android غالبًا)
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
            <FontAwesome name="briefcase" size={18} color={THEME.primary} />
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
            <FontAwesome name="home" size={18} color={THEME.primary} />
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
        style={({ pressed }) => [
          styles.whatsappBtn,
          pressed && { opacity: 0.9 },
        ]}
        onPress={openWhatsApp}
      >
        <FontAwesome name="whatsapp" size={20} color="#fff" />
        <Text style={styles.whatsappText}>واتساب</Text>
      </Pressable>

    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: THEME.white.DEFAULT,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontFamily: FONT.bold,
    fontSize: 22,
    color: THEME.dark[100], // ✅ كان غلط
    marginBottom: 6,
    textAlign: "right",
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.gray[200], // ✅ كان 300 ومش موجود
    lineHeight: 20,
    marginBottom: 14,
    textAlign: "right",
  },
  card: {
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
    backgroundColor: "#F2F7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: THEME.dark[100], // ✅ كان غلط
    textAlign: "right",
    marginBottom: 2,
  },
  cardText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[200], // ✅ كان 300 ومش موجود
    lineHeight: 18,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F1F1",
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
  note: {
    marginTop: 10,
    fontFamily: FONT.regular,
    fontSize: 11,
    color: THEME.gray[200],
    textAlign: "center",
  },
} as const;
