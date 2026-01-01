import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Link, useSegments } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

dayjs.extend(relativeTime);

type StatusKey = "new" | "cooking" | "delivering" | "delivered" | "canceled";

const normalize = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

const toStatusKey = (s: unknown): StatusKey => {
  const v = normalize(s);
  if (v === "cancelled") return "canceled";
  if (v === "preparing") return "cooking";
  if (v === "new") return "new";
  if (v === "cooking") return "cooking";
  if (v === "delivering") return "delivering";
  if (v === "delivered") return "delivered";
  if (v === "canceled") return "canceled";
  return "new";
};

const STATUS_AR: Record<StatusKey, { label: string; icon?: string }> = {
  new: { label: "جديد" },
  cooking: { label: "قيد التحضير" },
  delivering: { label: "في الطريق", icon: "🚚" },
  delivered: { label: "تم التوصيل", icon: "✅" },
  canceled: { label: "ملغي", icon: "⛔" },
};

// ✅ order ممكن ييجي فيه profile من join
type OrderWithProfile = {
  id: number | string;
  created_at?: string | null;
  status?: string | null;
  total?: number | null;
  profile?: { email?: string | null; phone?: string | null } | null;
};

type OrderListItemProps = {
  order: OrderWithProfile | null | undefined;
};

export default function OrderListItem({ order }: OrderListItemProps) {
  // ✅ MUST be before any hook
  if (!order) {
    console.log("OrderListItem received undefined order");
    return null;
  }

  const segments = useSegments();

  const createdAt = order.created_at ?? null;

  const timeText = useMemo(() => {
    if (!createdAt) return "";
    try {
      return dayjs(createdAt).fromNow();
    } catch {
      return "";
    }
  }, [createdAt]);

  const statusKey = useMemo(() => toStatusKey(order.status), [order.status]);
  const status = STATUS_AR[statusKey];

  const total =
    typeof order.total !== "undefined" && order.total !== null
      ? Number(order.total ?? 0)
      : null;

  const href = useMemo(() => {
    const isAdmin = (segments as string[]).includes("(admin)");
    const id = String(order.id);
    return isAdmin
      ? ({ pathname: "/(admin)/orders/[id]", params: { id } } as const)
      : ({ pathname: "/(user)/orders/[id]", params: { id } } as const);
  }, [segments, order.id]);

  // ✅ Email بدل الاسم
  const customerEmail = order.profile?.email?.trim() || "—";
  const customerPhone = order.profile?.phone?.trim() || "—";

  return (
    <View style={styles.wrap}>
      <Link href={href} asChild>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.accent} />

          <View style={styles.content}>
            {/* Row 1: Order + Status */}
            <View style={styles.topRow}>
              <Text numberOfLines={1} style={styles.title}>
                طلب #{String(order.id).slice(0, 8)}
              </Text>

              <View style={styles.statusPill}>
                <Text style={styles.statusText}>
                  {status.icon} {status.label}
                </Text>
              </View>
            </View>

            {/* ✅ Row 2: Email + phone */}
            <View style={styles.customerRow}>
              <View style={styles.customerPill}>
                <Text style={styles.customerLabel}>📧</Text>
                <Text style={styles.customerValue} numberOfLines={1}>
                  {customerEmail}
                </Text>
              </View>

              <View style={styles.customerPill}>
                <Text style={styles.customerLabel}>📞</Text>
                <Text style={styles.customerValue} numberOfLines={1}>
                  {customerPhone}
                </Text>
              </View>
            </View>

            {/* Row 3: time + total */}
            <View style={styles.bottomRow}>
              <Text style={styles.metaText}>{timeText}</Text>

              {total !== null && (
                <View style={styles.totalPill}>
                  <Text style={styles.totalValue}>{total.toFixed(2)}</Text>
                  <Text style={styles.currency}>جنيه</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.chevron}>‹</Text>
        </Pressable>
      </Link>
    </View>
  );
}

type Styles = {
  wrap: ViewStyle;

  card: ViewStyle;
  pressed: ViewStyle;

  accent: ViewStyle;
  content: ViewStyle;

  topRow: ViewStyle;
  bottomRow: ViewStyle;

  title: TextStyle;

  statusPill: ViewStyle;
  statusText: TextStyle;

  customerRow: ViewStyle;
  customerPill: ViewStyle;
  customerLabel: TextStyle;
  customerValue: TextStyle;

  metaText: TextStyle;

  totalPill: ViewStyle;
  totalValue: TextStyle;
  currency: TextStyle;

  chevron: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  wrap: {
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    borderRadius: 18,
    padding: 10,
    marginVertical: 6,
  },

  card: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
  },

  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },

  accent: {
    width: 4,
    backgroundColor: THEME.primary,
  },

  content: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    alignItems: "flex-end",
  },

  topRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "rgba(15, 23, 42, 0.03)",
  },

  statusText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  customerRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  customerPill: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  customerLabel: {
    fontSize: 11,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  customerValue: {
    flex: 1,
    fontSize: 12,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },

  bottomRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  metaText: {
    fontSize: 12,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "right",
  },

  totalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  totalValue: {
    fontSize: 12,
    color: THEME.primary,
    fontFamily: FONT.bold,
  },

  currency: {
    fontSize: 10,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  chevron: {
    alignSelf: "center",
    paddingHorizontal: 12,
    color: "rgba(15, 23, 42, 0.28)",
    fontSize: 18,
    transform: [{ rotate: "180deg" }],
  },
});
