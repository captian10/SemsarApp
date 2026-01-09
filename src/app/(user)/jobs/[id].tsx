import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { useJob } from "@api/jobs";
import { useAppTheme } from "@providers/AppThemeProvider";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function JobDetailsScreen() {
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return typeof raw === "string" ? raw.trim() : "";
  }, [params?.id]);

  const { data: job, isLoading, error, refetch, isFetching } = useJob(id);

  const meta = useMemo(() => {
    const parts = [job?.company, job?.location].filter(Boolean) as string[];
    return parts.join(" • ");
  }, [job?.company, job?.location]);

  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink06 = `rgba(${ink},0.06)`;
  const ink08 = `rgba(${ink},0.08)`;

  const badgeBg = isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.10)";
  const badgeBorder = isDark ? "rgba(59,130,246,0.32)" : "rgba(59,130,246,0.22)";

  const openWhatsApp = async () => {
    const phone = "201012433451";
    const msg = `السلام عليكم، اريد التقديم على وظيفة: ${job?.title ?? ""} (رقم: ${id})`;
    const encoded = encodeURIComponent(msg);

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

  if (!id) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "تفاصيل الوظيفة", headerTitleAlign: "center" }} />
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.text }]}>معرّف غير صحيح</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>
            الرابط ناقص أو رقم الوظيفة غير موجود.
          </Text>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text style={styles.primaryBtnText}>تحديث</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "تفاصيل الوظيفة", headerTitleAlign: "center" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.muted, { color: colors.muted }]}>جاري التحميل…</Text>
        </View>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "تفاصيل الوظيفة", headerTitleAlign: "center" }} />
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.text }]}>مش لاقيين الوظيفة</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>
            ممكن تكون اتحذفت أو مش متاحة حالياً.
          </Text>

          <Pressable
            onPress={() => refetch()}
            disabled={isFetching}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: isFetching ? 0.7 : 1 },
              pressed && !isFetching && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isFetching ? "جاري التحديث…" : "تحديث"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ title: "تفاصيل الوظيفة", headerTitleAlign: "center" }} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowOpacity: isDark ? 0.28 : 0.06,
            },
          ]}
        >
          <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>

          {meta ? (
            <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={2}>
              {meta}
            </Text>
          ) : null}

          <View style={styles.badgesRow}>
            {job.salary ? (
              <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                <FontAwesome name="money" size={14} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.text }]}>{job.salary}</Text>
              </View>
            ) : null}

            {job.created_at ? (
              <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                <FontAwesome name="calendar" size={14} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {formatDate(job.created_at)}
                </Text>
              </View>
            ) : null}
          </View>

          {job.description ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>الوصف</Text>
              <Text style={[styles.desc, { color: colors.text }]}>{job.description}</Text>
            </>
          ) : (
            <Text style={[styles.muted, { color: colors.muted, textAlign: "right" }]}>
              لا يوجد وصف.
            </Text>
          )}
        </View>

        <Pressable
          onPress={openWhatsApp}
          style={({ pressed }) => [
            styles.whatsappBtn,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          <FontAwesome name="whatsapp" size={20} color="#fff" />
          <Text style={styles.whatsappText}>تواصل واتساب للتقديم</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  content: {
    padding: 12,
    paddingBottom: 18,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },

  title: {
    fontFamily: FONT.bold,
    fontSize: 18,
    textAlign: "center",
  },

  muted: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  jobTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    textAlign: "right",
    marginBottom: 6,
  },

  meta: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: "right",
    marginBottom: 10,
  },

  badgesRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  badge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },

  badgeText: {
    fontFamily: FONT.medium,
    fontSize: 12,
  },

  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    textAlign: "right",
    marginBottom: 6,
  },

  desc: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
  },

  whatsappBtn: {
    marginTop: 12,
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

  primaryBtn: {
    marginTop: 6,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtnText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 14,
  },
});
