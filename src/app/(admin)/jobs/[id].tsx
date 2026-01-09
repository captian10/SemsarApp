import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { useDeleteJob, useJob } from "@api/jobs";
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

export default function AdminJobDetails() {
  const t = useAppTheme();
  const isDark = t.scheme === "dark";

  const subtleBorder = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(15,23,42,0.10)";
  const badgeBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.08)";

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job, isLoading, error, refetch } = useJob(id);
  const deleteMutation = useDeleteJob();

  const meta = useMemo(() => {
    if (!job) return "";
    const parts = [job.company, job.location].filter(Boolean) as string[];
    return parts.join(" • ");
  }, [job]);

  const onEdit = () => {
    router.push(`/(admin)/jobs/create?id=${id}`);
  };

  const onDelete = () => {
    if (!job) return;

    Alert.alert("تأكيد الحذف", "هل تريد حذف الوظيفة نهائياً؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync({ id: job.id });
            router.replace("/(admin)/jobs/index");
          } catch (e: any) {
            Alert.alert("خطأ", e?.message ?? "حصل خطأ أثناء الحذف.");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: t.colors.bg }]}>
        <Stack.Screen
          options={{
            title: "تفاصيل الوظيفة",
            headerTitleAlign: "center",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: t.colors.bg },
            headerTitleStyle: { fontFamily: FONT.bold, color: t.colors.text },
            headerTintColor: t.colors.text,
          }}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
          <Text style={[styles.muted, { color: t.colors.muted }]}>
            جاري التحميل…
          </Text>
        </View>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={[styles.screen, { backgroundColor: t.colors.bg }]}>
        <Stack.Screen
          options={{
            title: "تفاصيل الوظيفة",
            headerTitleAlign: "center",
            headerShadowVisible: false,
            headerStyle: { backgroundColor: t.colors.bg },
            headerTitleStyle: { fontFamily: FONT.bold, color: t.colors.text },
            headerTintColor: t.colors.text,
          }}
        />
        <View style={styles.center}>
          <Text style={[styles.title, { color: t.colors.text }]}>
            مش لاقيين الوظيفة
          </Text>
          <Text style={[styles.muted, { color: t.colors.muted }]}>
            ممكن تكون اتحذفت أو في مشكلة بالتحميل.
          </Text>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: t.colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.primaryBtnText}>تحديث</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.colors.bg }]}>
      <Stack.Screen
        options={{
          title: "تفاصيل الوظيفة",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.colors.bg },
          headerTitleStyle: { fontFamily: FONT.bold, color: t.colors.text },
          headerTintColor: t.colors.text,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: t.colors.surface,
              borderColor: t.colors.border ?? subtleBorder,
            },
          ]}
        >
          <View style={styles.topRow}>
            <Text style={[styles.jobTitle, { color: t.colors.text }]}>
              {job.title}
            </Text>
          </View>

          {meta ? (
            <Text style={[styles.meta, { color: t.colors.muted }]}>{meta}</Text>
          ) : null}

          <View style={styles.badgesRow}>
            {job.salary ? (
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <FontAwesome name="money" size={14} color={t.colors.primary} />
                <Text style={[styles.badgeText, { color: t.colors.text }]}>
                  {job.salary}
                </Text>
              </View>
            ) : null}

            {job.created_at ? (
              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <FontAwesome
                  name="calendar"
                  size={14}
                  color={t.colors.primary}
                />
                <Text style={[styles.badgeText, { color: t.colors.text }]}>
                  {formatDate(job.created_at)}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { color: t.colors.text }]}>
            الوصف
          </Text>
          {job.description ? (
            <Text style={[styles.desc, { color: t.colors.text }]}>
              {job.description}
            </Text>
          ) : (
            <Text style={[styles.mutedRight, { color: t.colors.muted }]}>
              لا يوجد وصف.
            </Text>
          )}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              { backgroundColor: t.colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <FontAwesome name="edit" size={14} color="#fff" />
            <Text style={styles.primaryActionText}>تعديل</Text>
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={deleteMutation.isPending}
            style={({ pressed }) => [
              styles.dangerActionBtn,
              { backgroundColor: t.colors.error },
              pressed && { opacity: 0.9 },
              deleteMutation.isPending && { opacity: 0.6 },
            ]}
          >
            <FontAwesome name="trash" size={14} color="#fff" />
            <Text style={styles.dangerActionText}>حذف</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  content: { padding: 12, paddingBottom: 18 },

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

  mutedRight: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 18,
    writingDirection: "rtl",
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },

  topRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },

  jobTitle: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 18,
    textAlign: "right",
    writingDirection: "rtl",
  },

  meta: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: "right",
    marginBottom: 10,
    writingDirection: "rtl",
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
    writingDirection: "rtl",
  },

  desc: {
    fontFamily: FONT.regular,
    fontSize: 13,
    textAlign: "right",
    lineHeight: 20,
    writingDirection: "rtl",
  },

  actionsRow: {
    marginTop: 12,
    flexDirection: "row-reverse",
    gap: 10,
  },

  primaryActionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryActionText: { fontFamily: FONT.bold, fontSize: 13, color: "#fff" },

  dangerActionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
  },
  dangerActionText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

  primaryBtn: {
    marginTop: 6,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },
});
