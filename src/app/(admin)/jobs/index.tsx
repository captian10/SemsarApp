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
import { THEME } from "@constants/Colors";

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
  const metaParts = [job.company, job.location].filter(Boolean) as string[];

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
        </View>

        <Text style={styles.date}>{formatDate(job.created_at)}</Text>
      </View>

      {metaParts.length > 0 ? (
        <Text style={styles.meta} numberOfLines={1}>
          {metaParts.join(" • ")}
        </Text>
      ) : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={({ pressed }) => [
            styles.primarySmallBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <FontAwesome name="edit" size={13} color="#fff" />
          <Text style={styles.primarySmallText}>تعديل</Text>
        </Pressable>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={({ pressed }) => [
            styles.dangerSmallBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <FontAwesome name="trash" size={13} color="#fff" />
          <Text style={styles.dangerSmallText}>حذف</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AdminJobsIndex() {
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
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.muted}>جاري تحميل وظائف الأدمن…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.title}>إدارة الوظائف</Text>
          <Text style={styles.error}>حصل خطأ في تحميل الوظائف</Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.push("/(admin)/jobs/create")}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>إضافة وظيفة</Text>
        </Pressable>

        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.searchWrap}>
        <FontAwesome name="search" size={14} color={THEME.gray[100]} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث بالعنوان أو الشركة أو المكان…"
          placeholderTextColor={THEME.gray[100]}
          style={styles.searchInput}
          textAlign="right"
        />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statText}>العدد: {list.length}</Text>
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
          styles.listContent,
          list.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={refetch}
            tintColor={THEME.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>مفيش وظائف</Text>
            <Text style={styles.muted}>اضغط “إضافة وظيفة” لبدء النشر.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
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
    backgroundColor: THEME.primary,
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
    backgroundColor: THEME.white.DEFAULT,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 13,
    color: THEME.dark[100],
    paddingVertical: 0,
  },

  statsRow: {
    flexDirection: "row-reverse",
    marginBottom: 12,
  },
  statText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: THEME.gray[100],
  },

  listContent: {
    paddingBottom: 12,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
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
  },

  emptyTitle: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: THEME.dark[100],
    textAlign: "center",
  },

  muted: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "center",
  },

  error: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: THEME.error,
    textAlign: "center",
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

  card: {
    backgroundColor: THEME.white.DEFAULT,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderRadius: 16,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },

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
    color: THEME.dark[100],
    textAlign: "right",
  },

  meta: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "right",
    marginBottom: 12,
  },

  date: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: THEME.gray[100],
    marginTop: 2,
    textAlign: "left",
  },

  actionsRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },

  primarySmallBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    borderRadius: 14,
  },
  primarySmallText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 12,
  },

  dangerSmallBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.error,
    paddingVertical: 10,
    borderRadius: 14,
  },
  dangerSmallText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 12,
  },
});
