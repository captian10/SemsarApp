import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

import { supabase } from "@lib/supabase";
import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";

const RESTAURANT_PHONE = "01009401881";
const DEV_PHONE = "01012433451";

const safeString = (v: any, fallback = "") =>
  typeof v === "string" ? v.trim() : fallback;

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

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

        const metaPhone = safeString((user.user_metadata as any)?.phone, "");
        if (metaPhone) setPhone(metaPhone);

        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (!pErr && profile) {
          const dbPhone = safeString((profile as any)?.phone, "");
          if (dbPhone) setPhone(dbPhone);
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
      setPhone(metaPhone);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
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
  };

  const dial = async (phoneNumber: string) => {
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
    } catch {
      Alert.alert("خطأ", "لم نستطع فتح الاتصال على هذا الجهاز.");
    }
  };

  const copy = async (phoneNumber: string, title = "تم النسخ") => {
    await Clipboard.setStringAsync(phoneNumber);
    Alert.alert(title, `تم نسخ الرقم: ${phoneNumber}`);
  };

  // ✅ WhatsApp to developer (Egypt numbers start with 0, WhatsApp needs country code)
  const openWhatsAppDev = async () => {
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
  };

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
              <ActivityIndicator color={THEME.primary} />
              <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
            </View>
          ) : (
            <>
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

              {/* ✅ Contact restaurant (dial + copy) */}
              <View style={styles.divider} />

              <View style={styles.contactBox}>
                <Text style={styles.contactLabel}>للتواصل مع المطعم:</Text>

                <Pressable
                  onPress={() => dial(RESTAURANT_PHONE)}
                  style={({ pressed }) => [
                    styles.phonePill,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.phoneText}>{RESTAURANT_PHONE}</Text>
                  <Text style={styles.phoneIcon}>📞</Text>
                </Pressable>

                <Pressable
                  onPress={() => copy(RESTAURANT_PHONE, "تم النسخ")}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.copyText}>نسخ رقم المطعم</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ✅ Bottom developer bar (above navigation bar) */}
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

          {/* ✅ WhatsApp (clean brand icon) */}
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

type Styles = {
  screen: ViewStyle;
  content: ViewStyle;

  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;

  card: ViewStyle;

  field: ViewStyle;
  label: TextStyle;
  value: TextStyle;

  divider: ViewStyle;

  logoutBtn: ViewStyle;
  logoutText: TextStyle;

  loadingRow: ViewStyle;
  loadingText: TextStyle;

  contactBox: ViewStyle;
  contactLabel: TextStyle;
  phonePill: ViewStyle;
  phoneText: TextStyle;
  phoneIcon: TextStyle;
  copyBtn: ViewStyle;
  copyText: TextStyle;

  devBar: ViewStyle;
  devText: TextStyle;
  devActions: ViewStyle;
  devBtn: ViewStyle;
  devBtnText: TextStyle;
  devPhoneChip: ViewStyle;
  devPhoneText: TextStyle;

  waInner: ViewStyle;
  waText: TextStyle;

  pressed: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: "stretch",
  },

  content: {
    flex: 1,
    alignItems: "flex-end",
  },

  header: {
    width: "100%",
    gap: 4,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 20,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
  },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    padding: 14,
    alignItems: "flex-end",
    gap: 8,
  },

  field: {
    width: "100%",
    alignItems: "flex-end",
  },
  label: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
    marginBottom: 4,
  },
  value: {
    width: "100%",
    fontSize: 14,
    fontFamily: FONT.medium,
    color: THEME.dark[100],
    textAlign: "right",
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },

  logoutBtn: {
    width: "100%",
    paddingVertical: 12,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: FONT.medium,
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
    color: THEME.gray[100],
    textAlign: "right",
  },

  contactBox: {
    width: "100%",
    gap: 8,
    alignItems: "flex-end",
  },

  contactLabel: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
  },

  phonePill: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },

  phoneText: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },

  phoneIcon: {
    fontSize: 16,
  },

  copyBtn: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  copyText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: THEME.primary,
  },

  devBar: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.06)",
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: THEME.white[100],
  },

  devText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
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
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "#fff",
  },

  devBtnText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.primary,
    textAlign: "center",
  },

  devPhoneChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "rgba(15, 23, 42, 0.03)",
  },

  devPhoneText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },

  waInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },

  waText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.dark[100],
  },

  pressed: {
    opacity: 0.7,
  },
});
