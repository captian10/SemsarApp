import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { useAdminJobs, useDeleteJob, type Job } from "@api/jobs";
import { useAppTheme } from "@providers/AppThemeProvider";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function JobAdminCard({
  job,
  onOpen,
  onEdit,
  onDelete,
}: {
  job: Job;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useAppTheme();
  const isDark = t.scheme === "dark";

  const metaParts = [job.company, job.location].filter(Boolean) as string[];

  const ui = useMemo(
    () => createStyles(t),
    [
      t.scheme,
      t.colors.bg,
      t.colors.surface,
      t.colors.text,
      t.colors.muted,
      t.colors.border,
      t.colors.primary,
      t.colors.error,
    ]
  );

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [ui.card, pressed && ui.cardPressed]}
    >
      <View style={ui.cardTopRow}>
        <View style={ui.titleRow}>
          <Text style={ui.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
        </View>

        <Text style={ui.date}>{formatDate(job.created_at)}</Text>
      </View>

      {metaParts.length > 0 ? (
        <Text style={ui.meta} numberOfLines={1}>
          {metaParts.join(" • ")}
        </Text>
      ) : null}

      <View style={ui.actionsRow}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={({ pressed }) => [ui.primarySmallBtn, pressed && ui.pressed]}
        >
          <FontAwesome name="edit" size={13} color="#fff" />
          <Text style={ui.primarySmallText}>تعديل</Text>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={({ pressed }) => [ui.dangerSmallBtn, pressed && ui.pressed]}
        >
          <FontAwesome name="trash" size={13} color="#fff" />
          <Text style={ui.dangerSmallText}>حذف</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AdminJobsIndex() {
  const t = useAppTheme();
  const isDark = t.scheme === "dark";

  const ui = useMemo(
    () => createStyles(t),
    [
      t.scheme,
      t.colors.bg,
      t.colors.surface,
      t.colors.text,
      t.colors.muted,
      t.colors.border,
      t.colors.primary,
      t.colors.error,
    ]
  );

  const placeholderColor = isDark
    ? "rgba(255,255,255,0.35)"
    : "rgba(15,23,42,0.35)";

  const iconMuted = isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)";

  const router = useRouter();

  const { data, isLoading, isFetching, error, refetch } = useAdminJobs();
  const deleteMutation = useDeleteJob();

  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const all = data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return all;

    return all.filter((j) => {
      const hay = [j.title, j.company ?? "", j.location ?? "", j.salary ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [data, q]);

  const onDelete = (job: Job) => {
    Alert.alert("تأكيد الحذف", "هل أنت متأكد أنك تريد حذف هذه الوظيفة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ id: job.id }),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={ui.screen}>
        <View style={ui.center}>
          <ActivityIndicator size="large" color={t.colors.primary} />
          <Text style={ui.muted}>جاري تحميل وظائف الأدمن…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={ui.screen}>
        <View style={ui.center}>
          <Text style={ui.title}>إدارة الوظائف</Text>
          <Text style={ui.error}>حصل خطأ في تحميل الوظائف</Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [ui.primaryBtn, pressed && ui.pressed]}
          >
            <Text style={ui.primaryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <View style={ui.topRow}>
        <Pressable
          onPress={() => router.push("/(admin)/jobs/create")}
          style={({ pressed }) => [ui.addBtn, pressed && ui.pressed]}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={ui.addBtnText}>إضافة وظيفة</Text>
        </Pressable>

        <View style={{ flex: 1 }} />
      </View>

      <View style={ui.searchWrap}>
        <FontAwesome name="search" size={14} color={iconMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث بالعنوان أو الشركة أو المكان…"
          placeholderTextColor={placeholderColor}
          style={ui.searchInput}
          textAlign="right"
        />
        {!!q && (
          <Pressable
            onPress={() => setQ("")}
            hitSlop={10}
            style={({ pressed }) => [ui.clearBtn, pressed && ui.pressed]}
            accessibilityLabel="مسح البحث"
          >
            <FontAwesome name="times" size={12} color={iconMuted} />
          </Pressable>
        )}
      </View>

      <View style={ui.statsRow}>
        <Text style={ui.statText}>العدد: {list.length}</Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobAdminCard
            job={item}
            onOpen={() => router.push(`/(admin)/jobs/${item.id}`)}
            onEdit={() => router.push(`/(admin)/jobs/create?id=${item.id}`)}
            onDelete={() => onDelete(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={[
          ui.listContent,
          list.length === 0 && ui.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={refetch}
            tintColor={t.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={ui.center}>
            <Text style={ui.emptyTitle}>مفيش وظائف</Text>
            <Text style={ui.muted}>اضغط “إضافة وظيفة” لبدء النشر.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function createStyles(t: any) {
  const isDark = t.scheme === "dark";
  const subtleBorder = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(15,23,42,0.10)";
  const subtleBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";

  const pressed: any = { opacity: 0.92, transform: [{ scale: 0.995 }] };

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.bg,
      paddingHorizontal: 12,
      paddingTop: 12,
    },

    topRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      marginBottom: 10,
    },

    addBtn: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: t.colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 14,
    },
    addBtnText: {
      color: "#fff",
      fontFamily: FONT.bold,
      fontSize: 13,
    },

    searchWrap: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border ?? subtleBorder,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontFamily: FONT.regular,
      fontSize: 13,
      color: t.colors.text,
      paddingVertical: 0,
      writingDirection: "rtl",
    },
    clearBtn: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: subtleBg,
      borderWidth: 1,
      borderColor: subtleBorder,
    },

    statsRow: {
      flexDirection: "row-reverse",
      marginBottom: 12,
    },
    statText: {
      fontFamily: FONT.medium,
      fontSize: 12,
      color: t.colors.muted,
    },

    listContent: { paddingBottom: 12 },
    listEmpty: { flexGrow: 1, justifyContent: "center" },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 16,
    },

    title: { fontFamily: FONT.bold, fontSize: 18, color: t.colors.text },

    emptyTitle: {
      fontFamily: FONT.bold,
      fontSize: 16,
      color: t.colors.text,
      textAlign: "center",
    },

    muted: {
      fontFamily: FONT.regular,
      fontSize: 12,
      color: t.colors.muted,
      textAlign: "center",
    },

    error: {
      fontFamily: FONT.medium,
      fontSize: 12,
      color: t.colors.error,
      textAlign: "center",
    },

    primaryBtn: {
      marginTop: 6,
      alignSelf: "stretch",
      backgroundColor: t.colors.primary,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

    // Card
    card: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border ?? subtleBorder,
      borderRadius: 16,
      padding: 14,
    },
    cardPressed: pressed,

    cardTopRow: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 6,
    },

    titleRow: {
      flex: 1,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },

    jobTitle: {
      flex: 1,
      fontFamily: FONT.bold,
      fontSize: 15,
      color: t.colors.text,
      textAlign: "right",
      writingDirection: "rtl",
    },

    meta: {
      fontFamily: FONT.regular,
      fontSize: 12,
      color: t.colors.muted,
      textAlign: "right",
      marginBottom: 12,
      writingDirection: "rtl",
    },

    date: {
      fontFamily: FONT.regular,
      fontSize: 11,
      color: t.colors.muted,
      marginTop: 2,
      textAlign: "left",
    },

    actionsRow: { flexDirection: "row-reverse", gap: 8 },

    primarySmallBtn: {
      flex: 1,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: t.colors.primary,
      paddingVertical: 10,
      borderRadius: 14,
    },
    primarySmallText: { color: "#fff", fontFamily: FONT.bold, fontSize: 12 },

    dangerSmallBtn: {
      flex: 1,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: t.colors.error,
      paddingVertical: 10,
      borderRadius: 14,
    },
    dangerSmallText: { color: "#fff", fontFamily: FONT.bold, fontSize: 12 },

    pressed,
  });
}
