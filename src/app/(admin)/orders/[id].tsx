import { useOrderDetails, useUpdateOrder } from "@api/orders";
import OrderItemListItem from "@components/OrderItemListItem";
import { notifyUserAboutOrderUpdate } from "@lib/notifications";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
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

const ORDER_STATUS_LIST = [
  "New",
  "Cooking",
  "Delivering",
  "Delivered",
  "Canceled",
] as const;
type OrderStatus = (typeof ORDER_STATUS_LIST)[number];
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

const STATUS_AR: Record<StatusKey, string> = {
  new: "جديد",
  cooking: "قيد التحضير",
  delivering: "في الطريق",
  delivered: "تم التوصيل",
  canceled: "إلغاء الطلب",
};

const safeText = (v: unknown, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

export default function OrderDetailsScreen() {
  const { id: idString } = useLocalSearchParams();
  const id = Number(typeof idString === "string" ? idString : idString?.[0]);

  const { data: order, isLoading, error, refetch } = useOrderDetails(id);
  const { mutate: updateOrder, isPending: isUpdating } =
    useUpdateOrder() as any;

  const currentKey = useMemo<StatusKey>(
    () => toStatusKey(order?.status),
    [order?.status]
  );

  const createdText = useMemo(() => {
    if (!order?.created_at) return "";
    try {
      return dayjs(order.created_at).fromNow();
    } catch {
      return "";
    }
  }, [order?.created_at]);

  // ✅ Customer info (Email + Phone)
  const customerEmail = useMemo(() => {
    // لو الـ profile عندك فيه email مباشرة
    const p: any = (order as any)?.profile;
    return safeText(p?.email ?? p?.user_email ?? p?.mail, "—");
  }, [order]);

  const customerPhone = useMemo(() => {
    const p: any = (order as any)?.profile;
    return safeText(p?.phone, "—");
  }, [order]);

  const updateStatus = (newStatus: OrderStatus) => {
    if (!order) return;

    updateOrder(
      { id, updatedFields: { status: newStatus } },
      {
        onSuccess: async () => {
          try {
            await notifyUserAboutOrderUpdate(order, newStatus);
          } catch (e: any) {
            console.log("[push] notify error:", e?.message ?? String(e));
          }
        },
        onError: (e: any) => {
          console.log("[order] update status failed:", e?.message ?? String(e));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.stateTitle}>جاري تحميل الطلب…</Text>
        <Text style={styles.stateText}>لحظة واحدة</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>حصل خطأ</Text>
        <Text style={styles.stateText}>فشل تحميل تفاصيل الطلب.</Text>
        <Pressable
          onPress={() => refetch?.()}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && styles.pressedBtn,
          ]}
        >
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  const items = Array.isArray((order as any).order_items)
    ? (order as any).order_items
    : [];

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: `طلب #${id}`,
          headerTitleStyle: {
            fontFamily: FONT.bold,
            fontSize: 18,
          },
        }}
      />

      <FlatList
        data={items}
        keyExtractor={(item: any, idx) => String(item?.id ?? idx)}
        renderItem={({ item }) => <OrderItemListItem item={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={() => (
          <View style={{ gap: 12 }}>
            {/* Header card */}
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>طلب رقم #{id}</Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{STATUS_AR[currentKey]}</Text>
                </View>
              </View>

              <Text style={styles.headerSub}>
                {createdText ? `تم الإنشاء: ${createdText}` : " "}
              </Text>

              {/* ✅ Customer card (Email + Phone) */}
              <View style={styles.customerCard}>
                <View style={styles.customerRow}>
                  <Text style={styles.customerLabel}>البريد:</Text>
                  <Text style={styles.customerValue} numberOfLines={1}>
                    {customerEmail}
                  </Text>
                </View>

                <View style={styles.customerRow}>
                  <Text style={styles.customerLabel}>الهاتف:</Text>
                  <Text style={styles.customerValue} numberOfLines={1}>
                    {customerPhone}
                  </Text>
                </View>
              </View>

              {isUpdating ? (
                <View style={styles.updatingRow}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                  <Text style={styles.updatingText}>جاري تحديث الحالة…</Text>
                </View>
              ) : null}
            </View>

            {/* Status section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>تحديث الحالة</Text>
                <Text style={styles.sectionHint}>اختر حالة واحدة</Text>
              </View>

              <View style={styles.chipsWrap}>
                {ORDER_STATUS_LIST.map((status) => {
                  const key = toStatusKey(status);
                  const isActive = toStatusKey(order.status) === key;
                  const disabled = isUpdating && !isActive;

                  return (
                    <Pressable
                      key={status}
                      disabled={disabled}
                      onPress={() => updateStatus(status)}
                      style={({ pressed }) => [
                        styles.chip,
                        isActive && styles.chipActive,
                        disabled && styles.chipDisabled,
                        pressed && !disabled && styles.chipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isActive && styles.chipTextActive,
                        ]}
                      >
                        {STATUS_AR[key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.note}>
                اختار حالة من دول علشان تحدث حالة الطلب.
              </Text>
            </View>

            <View style={styles.itemsHeader}>
              <Text style={styles.itemsTitle}>عناصر الطلب</Text>
              <Text style={styles.itemsSub}>تفاصيل المنتجات داخل الطلب</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsTitle}>لا يوجد عناصر داخل الطلب</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 18 }} />}
      />
    </View>
  );
}

type Styles = {
  screen: ViewStyle;
  listContent: ViewStyle;

  headerCard: ViewStyle;
  headerRow: ViewStyle;
  headerTitle: TextStyle;
  headerSub: TextStyle;

  badge: ViewStyle;
  badgeText: TextStyle;

  customerCard: ViewStyle;
  customerRow: ViewStyle;
  customerLabel: TextStyle;
  customerValue: TextStyle;

  updatingRow: ViewStyle;
  updatingText: TextStyle;

  sectionCard: ViewStyle;
  sectionHeader: ViewStyle;
  sectionTitle: TextStyle;
  sectionHint: TextStyle;

  chipsWrap: ViewStyle;
  chip: ViewStyle;
  chipActive: ViewStyle;
  chipDisabled: ViewStyle;
  chipPressed: ViewStyle;
  chipText: TextStyle;
  chipTextActive: TextStyle;

  note: TextStyle;

  itemsHeader: ViewStyle;
  itemsTitle: TextStyle;
  itemsSub: TextStyle;

  stateWrap: ViewStyle;
  stateTitle: TextStyle;
  stateText: TextStyle;
  errorIcon: TextStyle;
  errorTitle: TextStyle;
  retryBtn: ViewStyle;
  retryText: TextStyle;
  pressedBtn: ViewStyle;

  emptyItems: ViewStyle;
  emptyItemsTitle: TextStyle;
  emptyItemsSub: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  listContent: {
    paddingBottom: 12,
  },

  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    padding: 14,
  },

  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  headerTitle: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  headerSub: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.primary,
    backgroundColor: THEME.primary,
  },

  badgeText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: "#fff",
  },

  // ✅ Customer info card
  customerCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },

  customerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },

  customerLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
  },

  customerValue: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  updatingRow: {
    marginTop: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },

  updatingText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
    textAlign: "right",
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    padding: 14,
  },

  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  sectionHint: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
    textAlign: "right",
  },

  chipsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },

  chipActive: {
    backgroundColor: THEME.primary,
    borderColor: "rgba(0,0,0,0)",
  },

  chipDisabled: { opacity: 0.45 },

  chipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  chipText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },

  chipTextActive: { color: "#fff" },

  note: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
    lineHeight: 16,
  },

  itemsHeader: {
    paddingHorizontal: 2,
    gap: 4,
  },

  itemsTitle: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  itemsSub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
  },

  stateWrap: {
    flex: 1,
    backgroundColor: THEME.white[100],
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },

  stateTitle: {
    fontSize: 15,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "center",
  },

  stateText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "center",
  },

  errorIcon: { fontSize: 22 },

  errorTitle: {
    fontSize: 16,
    fontFamily: FONT.bold,
    color: THEME.error,
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 8,
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },

  retryText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 13,
  },

  pressedBtn: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  emptyItems: {
    paddingTop: 20,
    alignItems: "center",
    gap: 6,
  },

  emptyItemsTitle: {
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "center",
  },

  emptyItemsSub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "center",
  },
});
