import { useOrderDetails } from "@api/favorites";
import { useUpdateOrderSubscription } from "@api/requests/subscription";
import OrderItemListItem from "@components/RequestItemListItem";
import OrderListItem from "@components/RequestListItem";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams();

  // ✅ safer parsing for id
  const id = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, [params?.id]);

  const { data: order, isLoading, error } = useOrderDetails(id);

  // ✅ keep hook call stable (make sure your hook handles id=0 safely)
  useUpdateOrderSubscription(id);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerTitle}>رقم طلب غير صالح</Text>
        <Text style={styles.centerSub}>ارجع وحاول تفتح الطلب مرة تانية</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.primary} />
        <Text style={styles.centerTitle}>جاري تحميل الطلب…</Text>
        <Text style={styles.centerSub}>لحظة واحدة</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerTitle}>فشل في جلب بيانات الطلب</Text>
        <Text style={styles.centerSub}>تأكد من الاتصال وحاول مرة أخرى</Text>
      </View>
    );
  }

  const items = Array.isArray((order as any)?.order_items)
    ? ((order as any).order_items as any[])
    : [];

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: `طلب #${id}`,
          headerTitleStyle: {
            fontFamily: FONT.bold,
            fontSize: 16,
          },
        }}
      />

      <FlatList
        data={items}
        keyExtractor={(item: any, idx) => String(item?.id ?? idx)}
        renderItem={({ item }) => <OrderItemListItem item={item} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => <OrderListItem order={order as any} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>لا توجد عناصر في هذا الطلب</Text>
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
    padding: 12,
    backgroundColor: THEME.white[100],
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 16,
    backgroundColor: THEME.white[100],
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
  emptyBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: FONT.medium,
    color: THEME.gray[100],
    textAlign: "center",
  },
});
