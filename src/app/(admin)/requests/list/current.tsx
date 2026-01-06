import React, { useCallback, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";

// ✅ hooks الصحيحة من requests
import { useAdminRequests } from "@api/requests";
import { useInsertRequestSubscription } from "@api/requests/subscription";

import RequestListItem from "@components/RequestListItem";

export default function OrdersScreen() {
  // ✅ الطلبات الحالية = new + answered (أي حاجة مش closed)
  const { data, isLoading, error, refetch, isFetching } = useAdminRequests("all");

  // ✅ live updates
  useInsertRequestSubscription();

  const orders = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    return arr.filter((r: any) => String(r?.status ?? "") !== "closed");
  }, [data]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={THEME.primary} />
          <Text style={styles.centerTitle}>جاري تحميل الطلبات…</Text>
          <Text style={styles.centerSub}>لحظة واحدة</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>فشل تحميل الطلبات</Text>
          <Text style={styles.centerSub}>جرّب مرة تانية</Text>

          <Pressable style={styles.primaryBtn} onPress={onRefresh}>
            <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={orders}
        keyExtractor={(item: any, index) => String(item?.id ?? `row-${index}`)}
        // ✅ prop الصحيح بدل order
        renderItem={({ item }) => <RequestListItem request={item as any} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          orders.length === 0 && styles.contentEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={() => <View style={{ height: 16 }} />}
        refreshControl={
          <RefreshControl
            refreshing={!!isFetching}
            onRefresh={onRefresh}
            tintColor={THEME.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>لا توجد طلبات حالية</Text>
            <Text style={styles.emptySub}>
              عندما تصل طلبات جديدة ستظهر هنا تلقائيًا
            </Text>

            <Pressable style={styles.ghostBtn} onPress={onRefresh}>
              <Text style={styles.ghostBtnText}>تحديث</Text>
            </Pressable>
          </View>
        }
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },

  content: {
    padding: 12,
    paddingBottom: 24,
  },
  contentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  centerTitle: {
    fontFamily: FONT.bold,
    fontSize: 14,
    color: THEME.dark[100],
    textAlign: "center",
  },
  centerSub: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "center",
  },

  errorIcon: { fontSize: 22 },
  errorTitle: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: THEME.error,
    textAlign: "center",
  },

  primaryBtn: {
    marginTop: 10,
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 180,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: FONT.bold,
    fontSize: 13,
  },

  empty: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: FONT.bold,
    fontSize: 15,
    color: THEME.dark[100],
    textAlign: "center",
  },
  emptySub: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.gray[100],
    textAlign: "center",
    lineHeight: 18,
  },

  ghostBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    backgroundColor: "rgba(59,130,246,0.08)",
    minWidth: 160,
    alignItems: "center",
  },
  ghostBtnText: {
    color: THEME.primary,
    fontFamily: FONT.bold,
    fontSize: 13,
  },
});
