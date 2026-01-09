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
import { SafeAreaView } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import { useJobs, type Job } from "@api/jobs";
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

function PrimaryButton({
  label,
  onPress,
  colors,
}: {
  label: string;
  onPress: () => void;
  colors: {
    primary: string;
  };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        stylesStatic.primaryBtn,
        { backgroundColor: colors.primary },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <Text style={stylesStatic.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function MetaBadge({
  icon,
  text,
  colors,
  isDark,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  text: string;
  colors: {
    primary: string;
    text: string;
  };
  isDark: boolean;
}) {
  const bg = isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.10)";
  const border = isDark ? "rgba(59,130,246,0.32)" : "rgba(59,130,246,0.22)";

  return (
    <View
      style={[stylesStatic.badge, { backgroundColor: bg, borderColor: border }]}
    >
      <FontAwesome name={icon} size={12} color={colors.primary} />
      <Text
        style={[stylesStatic.badgeText, { color: colors.text }]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

function JobCard({
  job,
  onPress,
  colors,
  isDark,
}: {
  job: Job;
  onPress: () => void;
  colors: {
    surface: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
  };
  isDark: boolean;
}) {
  const hasMeta = !!(job.company || job.location);
  const metaLine = [job.company, job.location].filter(Boolean).join(" • ");

  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink08 = `rgba(${ink},0.08)`;
  const iconBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(59,130,246,0.10)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        stylesStatic.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowOpacity: isDark ? 0.28 : 0.05,
        },
        pressed && stylesStatic.cardPressed,
      ]}
    >
      {/* Title row */}
      <View style={stylesStatic.cardTopRow}>
        <View style={stylesStatic.titleRow}>
          <View
            style={[
              stylesStatic.iconWrap,
              { backgroundColor: iconBg, borderColor: ink08 },
            ]}
          >
            <FontAwesome name="briefcase" size={14} color={colors.primary} />
          </View>

          <Text
            style={[stylesStatic.jobTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {job.title}
          </Text>
        </View>

        <FontAwesome name="chevron-left" size={12} color={colors.muted} />
      </View>

      {/* meta line */}
      {hasMeta ? (
        <Text
          style={[stylesStatic.metaLine, { color: colors.muted }]}
          numberOfLines={1}
        >
          {metaLine}
        </Text>
      ) : null}

      {/* badges */}
      <View style={stylesStatic.badgesRow}>
        {!!job.created_at && (
          <MetaBadge
            icon="calendar"
            text={formatDate(job.created_at)}
            colors={colors}
            isDark={isDark}
          />
        )}
        {job.salary ? (
          <MetaBadge
            icon="money"
            text={job.salary}
            colors={colors}
            isDark={isDark}
          />
        ) : null}
      </View>

      {/* description */}
      {job.description ? (
        <Text
          style={[stylesStatic.desc, { color: colors.muted }]}
          numberOfLines={3}
        >
          {job.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function JobsScreen() {
  const router = useRouter();
  const { colors, scheme } = useAppTheme();
  const isDark = scheme === "dark";

  const { data, isLoading, isFetching, error, refetch } = useJobs();
  const list = useMemo(() => data ?? [], [data]);

  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink06 = `rgba(${ink},0.06)`;
  const pillBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(59,130,246,0.10)";

  if (isLoading) {
    return (
      <View style={[stylesStatic.screen, { backgroundColor: colors.bg }]}>
        <View style={stylesStatic.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[stylesStatic.mutedText, { color: colors.muted }]}>
            جاري تحميل الوظائف…
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[stylesStatic.screen, { backgroundColor: colors.bg }]}>
        <View style={stylesStatic.center}>
          <View
            style={[
              stylesStatic.stateIcon,
              { backgroundColor: pillBg, borderColor: ink06 },
            ]}
          >
            <FontAwesome name="warning" size={18} color={colors.error} />
          </View>
          <Text style={[stylesStatic.stateTitle, { color: colors.text }]}>
            حصل خطأ
          </Text>
          <Text style={[stylesStatic.mutedText, { color: colors.muted }]}>
            مش قادرين نحمل الوظائف دلوقتي.
          </Text>
          <PrimaryButton
            label="إعادة المحاولة"
            onPress={refetch}
            colors={colors}
          />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[stylesStatic.screen, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={stylesStatic.header}>
        <View style={{ flex: 1 }}>
          <Text style={[stylesStatic.headerTitle, { color: colors.text }]}>
            الوظائف
          </Text>
          <Text style={[stylesStatic.headerSub, { color: colors.muted }]}>
            تابع أحدث الوظائف المتاحة
          </Text>
        </View>

        <View
          style={[
            stylesStatic.countPill,
            { backgroundColor: pillBg, borderColor: ink06 },
          ]}
        >
          <Text style={[stylesStatic.countText, { color: colors.primary }]}>
            {list.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => router.push(`/(user)/jobs/${item.id}`)}
            colors={colors}
            isDark={isDark}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={[
          stylesStatic.listContent,
          list.length === 0 && stylesStatic.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={stylesStatic.center}>
            <View
              style={[
                stylesStatic.stateIcon,
                { backgroundColor: pillBg, borderColor: ink06 },
              ]}
            >
              <FontAwesome name="briefcase" size={18} color={colors.primary} />
            </View>
            <Text style={[stylesStatic.stateTitle, { color: colors.text }]}>
              مفيش وظائف حالياً
            </Text>
            <Text style={[stylesStatic.mutedText, { color: colors.muted }]}>
              أول ما الوظائف تنزل هتظهر هنا.
            </Text>
            <PrimaryButton label="تحديث" onPress={refetch} colors={colors} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const stylesStatic = StyleSheet.create({
  screen: {
    flex: 1,
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
    textAlign: "right",
  },
  headerSub: {
    marginTop: 2,
    fontFamily: FONT.regular,
    fontSize: 12,
    textAlign: "right",
  },

  countPill: {
    minWidth: 42,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countText: {
    fontFamily: FONT.bold,
    fontSize: 14,
  },

  listContent: { paddingBottom: 12 },
  listContentEmpty: { flexGrow: 1, justifyContent: "center" },

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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stateTitle: {
    fontFamily: FONT.bold,
    fontSize: 16,
    textAlign: "center",
  },

  mutedText: {
    fontFamily: FONT.regular,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  primaryBtn: {
    marginTop: 4,
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

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },

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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  jobTitle: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 15,
    textAlign: "right",
  },

  metaLine: {
    marginTop: 6,
    fontFamily: FONT.regular,
    fontSize: 12,
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
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    maxWidth: 220,
    textAlign: "right",
  },

  desc: {
    marginTop: 10,
    fontFamily: FONT.regular,
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18,
  },
});
