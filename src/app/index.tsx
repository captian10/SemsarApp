import FontAwesome from "@expo/vector-icons/FontAwesome";
import { supabase } from "@lib/supabase";
import { useAuth } from "@providers/AuthProvider";
import { Link, Redirect, Stack } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

export default function Index() {
  const { session, loading, isAdmin } = useAuth();

  const email = useMemo(() => {
    const e = session?.user?.email ?? "";
    return String(e);
  }, [session?.user?.email]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>جاري التحميل…</Text>
      </View>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;
  if (!isAdmin) return <Redirect href="/(user)" />;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageWrap}>
          <Image
            source={require("../../assets/images/S.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>سمسار</Text>
          <Text style={styles.subtitle}>لوحة تحكم الأدمن</Text>

          {!!email && (
            <View style={styles.emailPill}>
              <FontAwesome
                name="user"
                size={14}
                color="rgba(255,255,255,0.92)"
              />
              <Text style={styles.emailText} numberOfLines={1}>
                {email}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Link href="/(admin)" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.primaryOutlineBtn,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.btnRow}>
                <FontAwesome name="shield" size={16} color={THEME.primary} />
                <Text style={styles.primaryOutlineText}>الدخول كأدمن</Text>
              </View>
            </Pressable>
          </Link>

          <Link href="/(user)" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.primaryOutlineBtn,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.btnRow}>
                <FontAwesome name="home" size={16} color={THEME.primary} />
                <Text style={styles.primaryOutlineText}>
                  فتح واجهة المستخدم
                </Text>
              </View>
            </Pressable>
          </Link>

          <Pressable
            onPress={() => supabase.auth.signOut()}
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.btnRow}>
              <FontAwesome name="sign-out" size={16} color="#fff" />
              <Text style={styles.dangerBtnText}>تسجيل الخروج</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = {
  screen: ViewStyle;
  container: ViewStyle;

  loadingScreen: ViewStyle;
  loadingText: TextStyle;

  imageWrap: ViewStyle;
  heroImage: ImageStyle;

  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;

  emailPill: ViewStyle;
  emailText: TextStyle;

  card: ViewStyle;

  btnRow: ViewStyle;

  primaryOutlineBtn: ViewStyle;
  primaryOutlineText: TextStyle;

  dangerBtn: ViewStyle;
  dangerBtnText: TextStyle;

  pressed: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: { flex: 1, backgroundColor: THEME.dark[100] },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: THEME.dark[100],
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  loadingText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },

  imageWrap: { alignItems: "center" },
  heroImage: { width: 180, height: 180 },

  header: { gap: 6, paddingHorizontal: 2, marginBottom: 4 },
  title: {
    fontSize: 26,
    color: THEME.white.DEFAULT,
    textAlign: "center",
    fontFamily: FONT.bold,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    fontFamily: FONT.regular,
  },

  emailPill: {
    marginTop: 8,
    alignSelf: "center",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    maxWidth: "100%",
  },
  emailText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
    textAlign: "right",
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    padding: 16,
    gap: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  btnRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  primaryOutlineBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
  },
  primaryOutlineText: {
    color: THEME.primary,
    fontFamily: FONT.bold,
    fontSize: 14,
    textAlign: "center",
  },

  dangerBtn: {
    backgroundColor: THEME.error,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 14,
  },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
