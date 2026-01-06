import { useRequest, useUpdateRequestStatus, type RequestStatus } from "@api/requests";
import { getUserExpoPushToken, sendPushNotification } from "@lib/notifications";
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

// ✅ حالات requests في مشروعك
const REQUEST_STATUS_LIST = ["new", "answered", "closed"] as const;
type StatusKey = (typeof REQUEST_STATUS_LIST)[number];

const normalize = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

const toStatusKey = (s: unknown): StatusKey => {
  const v = normalize(s);
  if (v === "new") return "new";
  if (v === "answered") return "answered";
  if (v === "closed") return "closed";
  return "new";
};

const STATUS_AR: Record<StatusKey, string> = {
  new: "جديد",
  answered: "تم الرد",
  closed: "مغلق",
};

const safeText = (v: unknown, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

export default function RequestDetailsScreen() {
  const params = useLocalSearchParams();
  const id = String(params?.id ?? "");

  const { data: request, isLoading, isFetching, error, refetch } = useRequest(id);
  const { mutate: updateStatusMut, isPending: isUpdating } = useUpdateRequestStatus();

  const statusKey = useMemo(() => toStatusKey(request?.status), [request?.status]);

  const createdText = useMemo(() => {
    if (!request?.created_at) return "";
    try {
      return dayjs(request.created_at).fromNow();
    } catch {
      return "";
    }
  }, [request?.created_at]);

  // ✅ بيانات العميل (في requests عندك phone + user_id)
  // لو عندك join profile في API لاحقاً، تقدر تضيف email هنا
  const customerPhone = safeText(request?.phone, "—");
  const customerEmail = "—"; // ← لو عايز email اعمله join من profiles في API

  const notifyUser = async (userId: string, newStatus: RequestStatus) => {
    // ⚠️ الأفضل إرسال push من Edge Function (مش من التطبيق)
    const token = await getUserExpoPushToken(userId);
    if (!token) return;

    const title = "تحديث الطلب";
    const body =
      newStatus === "answered"
        ? "تم الرد على طلبك ✅"
        : newStatus === "closed"
        ? "تم إغلاق طلبك ✅"
        : "تم استلام طلبك ✅";

    await sendPushNotification(token, {
      title,
      body,
      channelId: "default",
      data: {
        type: "request_status_updated",
        requestId: id,
        status: String(newStatus),
      },
    });
  };

  const updateStatus = (next: StatusKey) => {
    if (!request?.id) return;

    updateStatusMut(
      { id: request.id, status: next },
      {
        onSuccess: async () => {
          try {
            // لو عندك user_id في request ابعتله push
            if (request.user_id) await notifyUser(request.user_id, next);
          } catch (e: any) {
            console.log("[push] notify error:", e?.message ?? String(e));
          }
        },
        onError: (e: any) => {
          console.log("[request] update status failed:", e?.message ?? String(e));
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

  if (error || !request) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>حصل خطأ</Text>
        <Text style={styles.stateText}>فشل تحميل تفاصيل الطلب.</Text>

        <Pressable
          onPress={() => refetch?.()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressedBtn]}
        >
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: `Request #${String(request.id).slice(0, 8)}`,
          headerTitleStyle: { fontFamily: FONT.bold, fontSize: 18 },
        }}
      />

      {/* FlatList فاضية لكن بنستخدم Header عشان نفس الستايل */}
      <FlatList
        data={[]}
        keyExtractor={(_, i) => String(i)}
        renderItem={null as any}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <View style={{ gap: 12 }}>
            {/* Header card */}
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>
                  طلب #{String(request.id).slice(0, 8)}
                </Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{STATUS_AR[statusKey]}</Text>
                </View>
              </View>

              <Text style={styles.headerSub}>
                {createdText ? `تم الإنشاء: ${createdText}` : " "}
              </Text>

              {/* Customer */}
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

              {/* Message */}
              <View style={styles.messageCard}>
                <Text style={styles.messageLabel}>الرسالة</Text>
                <Text style={styles.messageText}>
                  {safeText(request.message, "لا توجد رسالة")}
                </Text>
              </View>

              {isUpdating || isFetching ? (
                <View style={styles.updatingRow}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                  <Text style={styles.updatingText}>جاري التحديث…</Text>
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
                {REQUEST_STATUS_LIST.map((st) => {
                  const isActive = toStatusKey(request.status) === st;
                  const disabled = isUpdating && !isActive;

                  return (
                    <Pressable
                      key={st}
                      disabled={disabled}
                      onPress={() => updateStatus(st)}
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
                        {STATUS_AR[st]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.note}>
                اختار حالة علشان تحدّث حالة الطلب.
              </Text>
            </View>
          </View>
        )}
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

  messageCard: ViewStyle;
  messageLabel: TextStyle;
  messageText: TextStyle;

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

  stateWrap: ViewStyle;
  stateTitle: TextStyle;
  stateText: TextStyle;
  errorIcon: TextStyle;
  errorTitle: TextStyle;
  retryBtn: ViewStyle;
  retryText: TextStyle;
  pressedBtn: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  listContent: { paddingBottom: 12 },

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

  badgeText: { fontSize: 12, fontFamily: FONT.bold, color: "#fff" },

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

  messageCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },

  messageLabel: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.gray[100],
    textAlign: "right",
  },

  messageText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: THEME.dark[100],
    textAlign: "right",
    lineHeight: 18,
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

  chipsWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },

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

  chipActive: { backgroundColor: THEME.primary, borderColor: "transparent" },
  chipDisabled: { opacity: 0.45 },
  chipPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  chipText: { fontSize: 12, fontFamily: FONT.bold, color: THEME.dark[100] },
  chipTextActive: { color: "#fff" },

  note: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
    lineHeight: 16,
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

  retryText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

  pressedBtn: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
