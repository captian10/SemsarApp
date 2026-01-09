import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { supabase } from "@lib/supabase";
import { useAppTheme } from "@providers/AppThemeProvider";

const DEV_PHONE = "01012433451";

const safeString = (v: any, fallback = "") =>
  typeof v === "string" ? v.trim() : fallback;

export default function Profile() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () => createStyles(colors, isDark, insets.bottom),
    [colors, isDark, insets.bottom]
  );

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setFetching(true);

        const { data, error } = await supabase.auth.getSession();
        if (error) console.log("getSession error:", error);

        const user = data.session?.user;
        if (!user) return;

        if (cancelled) return;

        setEmail(user.email ?? "");

        // metadata (optional)
        const metaPhone = safeString((user.user_metadata as any)?.phone, "");
        const metaName =
          safeString((user.user_metadata as any)?.full_name, "") ||
          safeString((user.user_metadata as any)?.fullName, "") ||
          safeString((user.user_metadata as any)?.name, "");

        if (metaPhone) setPhone(metaPhone);
        if (metaName) setFullName(metaName);

        // DB profile (source of truth)
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("phone, full_name")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (!pErr && profile) {
          const dbPhone = safeString((profile as any)?.phone, "");
          const dbName = safeString((profile as any)?.full_name, "");

          if (dbPhone) setPhone(dbPhone);
          if (dbName) setFullName(dbName);
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setEmail(u?.email ?? "");

      const metaPhone = safeString((u?.user_metadata as any)?.phone, "");
      const metaName =
        safeString((u?.user_metadata as any)?.full_name, "") ||
        safeString((u?.user_metadata as any)?.fullName, "") ||
        safeString((u?.user_metadata as any)?.name, "");

      if (metaPhone) setPhone(metaPhone);
      if (metaName) setFullName(metaName);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج الآن؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "تسجيل الخروج",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await supabase.auth.signOut();
          } catch (e: any) {
            Alert.alert("خطأ", e?.message ?? "حدث خطأ أثناء تسجيل الخروج");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }, []);

  const dial = useCallback(async (phoneNumber: string) => {
    const p = String(phoneNumber ?? "").replace(/\s+/g, "");
    if (!p) return;

    try {
      await Linking.openURL(`tel:${p}`);
    } catch {
      Alert.alert("خطأ", "لم نستطع فتح الاتصال على هذا الجهاز.");
    }
  }, []);

  const copy = useCallback(async (text: string, title = "تم النسخ") => {
    const t = String(text ?? "").trim();
    if (!t) return;
    await Clipboard.setStringAsync(t);
    Alert.alert(title, `تم نسخ: ${t}`);
  }, []);

  // ✅ WhatsApp to developer (Egypt numbers start with 0, WhatsApp needs country code)
  const openWhatsAppDev = useCallback(async () => {
    const raw = DEV_PHONE.replace(/\D/g, ""); // 01012433451
    const international = `20${raw.replace(/^0/, "")}`; // 201012433451

    const text = encodeURIComponent(
      "السلام عليكم، أود الاستفسار بخصوص برمجة تطبيق موبايل."
    );

    const waApp = `whatsapp://send?phone=${international}&text=${text}`;
    const waWeb = `https://wa.me/${international}?text=${text}`;

    try {
      const canOpenApp = await Linking.canOpenURL(waApp);
      if (canOpenApp) {
        await Linking.openURL(waApp);
        return;
      }
      await Linking.openURL(waWeb);
    } catch {
      Alert.alert("واتساب غير متاح", "لم نستطع فتح واتساب على هذا الجهاز.");
    }
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      {/* ✅ Main content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>الملف الشخصي</Text>
          <Text style={styles.subtitle}>معلومات الحساب</Text>
        </View>

        <View style={styles.card}>
          {fetching ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {fullName || "—"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.field}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {email || "—"}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.field}>
                <Text style={styles.label}>رقم الهاتف</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {phone || "—"}
                </Text>
              </View>

              <View style={styles.divider} />

              <Pressable
                onPress={handleSignOut}
                disabled={loading}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  pressed && !loading && styles.pressed,
                  loading && { opacity: 0.8 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.logoutText}>تسجيل الخروج</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* ✅ Bottom developer bar (safe with bottom inset) */}
      <View style={styles.devBar}>
        <Text style={styles.devText} numberOfLines={2}>
          تم برمجة التطبيق بواسطة Drax للتواصل مع المبرمج
        </Text>

        <View style={styles.devActions}>
          <Pressable
            onPress={() => dial(DEV_PHONE)}
            style={({ pressed }) => [styles.devBtn, pressed && styles.pressed]}
          >
            <Text style={styles.devBtnText}>اتصال</Text>
          </Pressable>

          <Pressable
            onPress={() => copy(DEV_PHONE, "تم النسخ")}
            style={({ pressed }) => [styles.devBtn, pressed && styles.pressed]}
          >
            <Text style={styles.devBtnText}>نسخ</Text>
          </Pressable>

          <Pressable
            onPress={openWhatsAppDev}
            style={({ pressed }) => [styles.devBtn, pressed && styles.pressed]}
          >
            <View style={styles.waInner}>
              <FontAwesome5 name="whatsapp" size={16} color="#25D366" />
              <Text style={styles.waText}>واتساب</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => copy(DEV_PHONE, "تم النسخ")}
            style={({ pressed }) => [
              styles.devPhoneChip,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.devPhoneText}>{DEV_PHONE}</Text>
          </Pressable>
        </View>
      </View>
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
  isDark: boolean,
  bottomInset: number
) {
  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink06 = `rgba(${ink},0.06)`;
  const ink10 = `rgba(${ink},0.10)`;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingTop: 12,
      alignItems: "stretch",
    },

    content: { flex: 1, alignItems: "flex-end" },

    header: {
      width: "100%",
      gap: 4,
      marginBottom: 12,
      alignItems: "flex-end",
    },
    title: {
      fontSize: 20,
      fontFamily: FONT.bold,
      color: colors.text,
      textAlign: "right",
    },
    subtitle: {
      fontSize: 12,
      fontFamily: FONT.regular,
      color: colors.muted,
      textAlign: "right",
    },

    card: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      alignItems: "flex-end",
      gap: 8,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: isDark ? 3 : 2,
    },

    field: { width: "100%", alignItems: "flex-end" },
    label: {
      fontSize: 12,
      fontFamily: FONT.regular,
      color: colors.muted,
      textAlign: "right",
      marginBottom: 4,
    },
    value: {
      width: "100%",
      fontSize: 14,
      fontFamily: FONT.medium,
      color: colors.text,
      textAlign: "right",
    },

    divider: { width: "100%", height: 1, backgroundColor: ink06 },

    logoutBtn: {
      width: "100%",
      paddingVertical: 12,
      backgroundColor: colors.primary,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    logoutText: {
      fontSize: 14,
      fontFamily: FONT.bold,
      color: "#fff",
      textAlign: "center",
    },

    loadingRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      width: "100%",
    },
    loadingText: {
      fontSize: 14,
      fontFamily: FONT.regular,
      color: colors.muted,
      textAlign: "right",
    },

    devBar: {
      width: "100%",
      borderTopWidth: 1,
      borderTopColor: ink06,
      paddingTop: 10,
      paddingBottom: 10,
      gap: 8,
      backgroundColor: colors.bg,
    },

    devText: {
      fontSize: 12,
      fontFamily: FONT.regular,
      color: colors.muted,
      textAlign: "center",
    },

    devActions: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      flexWrap: "wrap",
    },

    devBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    devBtnText: {
      fontSize: 12,
      fontFamily: FONT.bold,
      color: colors.primary,
      textAlign: "center",
    },

    devPhoneChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: ink10,
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(15,23,42,0.03)",
    },

    devPhoneText: {
      fontSize: 12,
      fontFamily: FONT.bold,
      color: colors.text,
    },

    waInner: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
    waText: { fontSize: 12, fontFamily: FONT.bold, color: colors.text },

    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
}
