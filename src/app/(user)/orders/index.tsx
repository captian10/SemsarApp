import { useMyOrderList } from "@api/orders";
import OrderListItem from "@components/OrderListItem";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [btn.solid, pressed && btn.pressed]}>
      <Text style={btn.solidText}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [btn.ghost, pressed && btn.pressed]}>
      <Text style={btn.ghostText}>{label}</Text>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const { data: orders, isLoading, isFetching, error, refetch } = useMyOrderList();

  const list = useMemo(() => orders ?? [], [orders]);
  const hasOrders = list.length > 0;

  // Initial loading (first time)
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerWrap}>
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.stateTitle}>جاري تحميل الطلبات</Text>
            <Text style={styles.stateText}>لحظة واحدة بس…</Text>
          </View>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.centerWrap}>
          <View style={styles.stateCard}>
            <Text style={styles.stateIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>حصل خطأ</Text>
            <Text style={styles.stateText}>فشل تحميل الطلبات. جرّب مرة تانية.</Text>

            <View style={styles.actionsRow}>
              <PrimaryButton label="إعادة المحاولة" onPress={() => refetch()} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.headerIcon}>🧾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>طلباتي</Text>
            <Text style={styles.subtitle}>تابع حالة طلباتك بسهولة</Text>
          </View>
        </View>

        <View style={styles.headerBottom}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>عدد الطلبات</Text>
            <Text style={styles.statValue}>{list.length}</Text>
          </View>

          <View style={styles.hintPill}>
            <Text style={styles.hintText}>اسحب لتحديث القائمة</Text>
            <Text style={styles.hintIcon}>⬇️</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }) => <OrderListItem order={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, !hasOrders && styles.contentEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={() => refetch()}
            tintColor={THEME.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>🛒</Text>
            </View>
            <Text style={styles.emptyTitle}>مفيش طلبات لحد دلوقتي</Text>
            <Text style={styles.emptySub}>اطلب من المنيو وهتلاقي طلباتك هنا 👇</Text>

            <View style={styles.actionsRow}>
              {/* لو عندك Route للمنيو عدّل اللينك هنا */}
              <GhostButton label="تحديث" onPress={() => refetch()} />
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={<View style={{ height: 16 }} />}
      />
    </View>
  );
}

type Styles = {
  screen: ViewStyle;

  headerCard: ViewStyle;
  headerTop: ViewStyle;
  headerBottom: ViewStyle;

  headerIcon: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;

  statPill: ViewStyle;
  statLabel: TextStyle;
  statValue: TextStyle;

  hintPill: ViewStyle;
  hintText: TextStyle;
  hintIcon: TextStyle;

  content: ViewStyle;
  contentEmpty: ViewStyle;

  centerWrap: ViewStyle;
  stateCard: ViewStyle;
  stateIcon: TextStyle;
  stateTitle: TextStyle;
  stateText: TextStyle;
  errorTitle: TextStyle;

  actionsRow: ViewStyle;

  emptyWrap: ViewStyle;
  emptyIconWrap: ViewStyle;
  emptyIcon: TextStyle;
  emptyTitle: TextStyle;
  emptySub: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    padding: 14,
    marginBottom: 12,

    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  headerTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },

  headerIcon: {
    fontSize: 22,
  },

  title: {
    fontSize: 22,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "right",
  },

  headerBottom: {
    marginTop: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  statPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.18)",
  },

  statLabel: {
    fontSize: 12,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  statValue: {
    fontSize: 14,
    color: THEME.primary,
    fontFamily: FONT.bold,
  },

  hintPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(250, 204, 21, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.22)",
  },

  hintText: {
    fontSize: 12,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  hintIcon: {
    fontSize: 12,
  },

  content: {
    paddingBottom: 8,
  },

  contentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },

  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  stateCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    padding: 16,
    alignItems: "center",
    gap: 8,

    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  stateIcon: {
    fontSize: 22,
  },

  stateTitle: {
    fontSize: 15,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "center",
  },

  stateText: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "center",
  },

  errorTitle: {
    fontSize: 16,
    color: THEME.error,
    fontFamily: FONT.bold,
    textAlign: "center",
  },

  actionsRow: {
    marginTop: 8,
    width: "100%",
    flexDirection: "row-reverse",
    gap: 10,
    justifyContent: "center",
  },

  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },

  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.18)",
    marginBottom: 4,
  },

  emptyIcon: {
    fontSize: 26,
  },

  emptyTitle: {
    fontSize: 16,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "center",
  },

  emptySub: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "center",
    lineHeight: 18,
  },
});

const btn = StyleSheet.create({
  solid: {
    flex: 1,
    maxWidth: 220,
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  solidText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 14,
  },
  ghost: {
    flex: 1,
    maxWidth: 220,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.18)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    color: THEME.primary,
    fontFamily: FONT.bold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
});
