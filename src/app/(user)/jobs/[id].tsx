import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

import { FONT } from "@/constants/Typography";
import { useJob } from "@api/jobs";
import { THEME } from "@constants/Colors";

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
  const router = useRouter(); // ✅ still used for refresh route stack etc.
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job, isLoading, error, refetch } = useJob(id);

  const meta = useMemo(() => {
    const parts = [job?.company, job?.location].filter(Boolean) as string[];
    return parts.join(" • ");
  }, [job?.company, job?.location]);

  const openWhatsApp = async () => {
    const phone = "201012433451";
    const msg = `السلام عليكم، اريد التقديم على وظيفة: ${
      job?.title ?? ""
    } (رقم: ${id})`;
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

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "تفاصيل الوظيفة" }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.muted}>جاري التحميل…</Text>
        </View>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "تفاصيل الوظيفة" }} />
        <View style={styles.center}>
          <Text style={styles.title}>مش لاقيين الوظيفة</Text>
          <Text style={styles.muted}>ممكن تكون اتحذفت أو مش متاحة حالياً.</Text>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.primaryBtnText}>تحديث</Text>
          </Pressable>

          {/* ✅ removed رجوع button */}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{ title: "تفاصيل الوظيفة", headerTitleAlign: "center" }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.jobTitle}>{job.title}</Text>

          {meta ? <Text style={styles.meta}>{meta}</Text> : null}

          <View style={styles.badgesRow}>
            {job.salary ? (
              <View style={styles.badge}>
                <FontAwesome name="money" size={14} color={THEME.primary} />
                <Text style={styles.badgeText}>{job.salary}</Text>
              </View>
            ) : null}

            {job.created_at ? (
              <View style={styles.badge}>
                <FontAwesome name="calendar" size={14} color={THEME.primary} />
                <Text style={styles.badgeText}>
                  {formatDate(job.created_at)}
                </Text>
              </View>
            ) : null}
          </View>

          {job.description ? (
            <>
              <Text style={styles.sectionTitle}>الوصف</Text>
              <Text style={styles.desc}>{job.description}</Text>
            </>
          ) : (
            <Text style={styles.muted}>لا يوجد وصف.</Text>
          )}
        </View>

        <Pressable
          onPress={openWhatsApp}
          style={({ pressed }) => [
            styles.whatsappBtn,
            pressed && { opacity: 0.92 },
          ]}
        >
          <FontAwesome name="whatsapp" size={20} color="#fff" />
          <Text style={styles.whatsappText}>تواصل واتساب للتقديم</Text>
        </Pressable>

        {/* ✅ removed رجوع button at bottom */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
  },
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
    color: THEME.dark[100],
    textAlign: "center",
  },
  muted: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.gray[100],
    textAlign: "center",
    lineHeight: 18,
  },

  card: {
    backgroundColor: THEME.white.DEFAULT,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    padding: 14,
  },
  jobTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: THEME.dark[100],
    textAlign: "right",
    marginBottom: 6,
  },
  meta: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.gray[100],
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
    backgroundColor: "#F2F7FF",
  },
  badgeText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: THEME.dark[100],
  },
  sectionTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: THEME.dark[100],
    textAlign: "right",
    marginBottom: 6,
  },
  desc: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.dark[100],
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
    backgroundColor: THEME.primary,
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
