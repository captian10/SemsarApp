import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { useJobs, type Job } from "@api/jobs";
import { THEME } from "@constants/Colors";
import { SafeAreaView } from "react-native-safe-area-context";

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

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function MetaBadge({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  text: string;
}) {
  return (
    <View style={styles.badge}>
      <FontAwesome name={icon} size={12} color={THEME.primary} />
      <Text style={styles.badgeText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const hasMeta = !!(job.company || job.location);
  const metaLine = [job.company, job.location].filter(Boolean).join(" • ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Title row */}
      <View style={styles.cardTopRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <FontAwesome name="briefcase" size={14} color={THEME.primary} />
          </View>

          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
        </View>

        <FontAwesome name="chevron-left" size={12} color={THEME.gray[100]} />
      </View>

      {/* meta line */}
      {hasMeta ? (
        <Text style={styles.metaLine} numberOfLines={1}>
          {metaLine}
        </Text>
      ) : null}

      {/* badges */}
      <View style={styles.badgesRow}>
        {!!job.created_at && (
          <MetaBadge icon="calendar" text={formatDate(job.created_at)} />
        )}
        {job.salary ? <MetaBadge icon="money" text={job.salary} /> : null}
      </View>

      {/* description */}
      {job.description ? (
        <Text style={styles.desc} numberOfLines={3}>
          {job.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function JobsScreen() {
  const router = useRouter();
  const { data, isLoading, isFetching, error, refetch } = useJobs();
  const list = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.mutedText}>جاري تحميل الوظائف…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <View style={styles.stateIcon}>
            <FontAwesome name="warning" size={18} color={THEME.error} />
          </View>
          <Text style={styles.stateTitle}>حصل خطأ</Text>
          <Text style={styles.mutedText}>مش قادرين نحمل الوظائف دلوقتي.</Text>
          <PrimaryButton label="إعادة المحاولة" onPress={refetch} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>الوظائف</Text>
          <Text style={styles.headerSub}>تابع أحدث الوظائف المتاحة</Text>
        </View>

        <View style={styles.countPill}>
          <Text style={styles.countText}>{list.length}</Text>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => router.push(`/(user)/jobs/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={[
          styles.listContent,
          list.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={refetch}
            tintColor={THEME.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <View style={styles.stateIcon}>
              <FontAwesome name="briefcase" size={18} color={THEME.primary} />
            </View>
            <Text style={styles.stateTitle}>مفيش وظائف حالياً</Text>
            <Text style={styles.mutedText}>أول ما الوظائف تنزل هتظهر هنا.</Text>
            <PrimaryButton label="تحديث" onPress={refetch} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: FONT.bold,
    fontSize: 18,
    color: THEME.dark[100],
    textAlign: "right",
  },
  headerSub: {
    marginTop: 2,
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "right",
  },

  countPill: {
    minWidth: 42,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countText: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: THEME.primary,
  },

  listContent: {
    paddingBottom: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },

  stateIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F2F7FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },
  stateTitle: {
    fontFamily: FONT.bold,
    fontSize: 16,
    color: THEME.dark[100],
    textAlign: "center",
  },

  mutedText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "center",
    lineHeight: 18,
  },

  primaryBtn: {
    marginTop: 4,
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
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  },

  titleRow: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F2F7FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },

  jobTitle: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 15,
    color: THEME.dark[100],
    textAlign: "right",
  },

  metaLine: {
    marginTop: 6,
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "right",
  },

  badgesRow: {
    marginTop: 10,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },

  badge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F2F7FF",
  },
  badgeText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: THEME.dark[100],
    maxWidth: 220,
    textAlign: "right",
  },

  desc: {
    marginTop: 10,
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "right",
    lineHeight: 18,
  },
});
