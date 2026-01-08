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
import { useDeleteJob, useJob, useToggleJobActive } from "@api/jobs";
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

export default function AdminJobDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: job, isLoading, error, refetch } = useJob(id);
  const toggleMutation = useToggleJobActive();
  const deleteMutation = useDeleteJob();

  const meta = useMemo(() => {
    if (!job) return "";
    const parts = [job.company, job.location].filter(Boolean) as string[];
    return parts.join(" • ");
  }, [job]);

  const onEdit = () => {
    router.push(`/(admin)/jobs/create?id=${id}`);
  };

  const onToggle = () => {
    if (!job) return;
    toggleMutation.mutate({ id: job.id, is_active: !job.is_active });
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
          <Text style={styles.muted}>ممكن تكون اتحذفت أو في مشكلة بالتحميل.</Text>

          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryBtnText}>تحديث</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "تفاصيل الوظيفة", headerTitleAlign: "center" }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={[styles.dot, job.is_active ? styles.dotOn : styles.dotOff]} />
          </View>

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
                <Text style={styles.badgeText}>{formatDate(job.created_at)}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>الوصف</Text>
          {job.description ? (
            <Text style={styles.desc}>{job.description}</Text>
          ) : (
            <Text style={styles.mutedRight}>لا يوجد وصف.</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          {/* ✅ Edit = Primary */}
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.primaryActionBtn, pressed && { opacity: 0.9 }]}
          >
            <FontAwesome name="edit" size={14} color="#fff" />
            <Text style={styles.primaryActionText}>تعديل</Text>
          </Pressable>

          {/* ✅ Toggle = Outline */}
          <Pressable
            onPress={onToggle}
            disabled={toggleMutation.isPending}
            style={({ pressed }) => [
              styles.outlineBtn,
              pressed && { opacity: 0.9 },
              toggleMutation.isPending && { opacity: 0.6 },
            ]}
          >
            <FontAwesome
              name={job.is_active ? "eye-slash" : "eye"}
              size={14}
              color={THEME.dark[100]}
            />
            <Text style={styles.outlineText}>{job.is_active ? "إخفاء" : "إظهار"}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onDelete}
          disabled={deleteMutation.isPending}
          style={({ pressed }) => [
            styles.dangerBtn,
            pressed && { opacity: 0.9 },
            deleteMutation.isPending && { opacity: 0.6 },
          ]}
        >
          <FontAwesome name="trash" size={14} color="#fff" />
          <Text style={styles.dangerText}>حذف</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },
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

  mutedRight: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.gray[100],
    textAlign: "right",
    lineHeight: 18,
  },

  card: {
    backgroundColor: THEME.white.DEFAULT,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
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
    color: THEME.dark[100],
    textAlign: "right",
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

  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 6 },
  dotOn: { backgroundColor: "#16A34A" },
  dotOff: { backgroundColor: "#9CA3AF" },

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
    backgroundColor: THEME.primary,
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryActionText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: "#fff",
  },

  outlineBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.12)",
    borderRadius: 14,
    paddingVertical: 12,
  },
  outlineText: {
    fontFamily: FONT.bold,
    fontSize: 13,
    color: THEME.dark[100],
  },

  dangerBtn: {
    marginTop: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.error,
    borderRadius: 14,
    paddingVertical: 12,
  },
  dangerText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 13,
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
