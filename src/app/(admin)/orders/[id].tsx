import { useOrderDetails, useUpdateOrder } from "@api/orders";
import OrderItemListItem from "@components/OrderItemListItem";
import OrderListItem from "@components/OrderListItem";
import Colors from "@constants/Colors";
import { notifyUserAboutOrderUpdate } from "@lib/notifications";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { OrderStatusList } from "../../../types/types";

export default function OrderDetailsScreen() {
  const { id: idString } = useLocalSearchParams();
  const id = parseFloat(typeof idString === "string" ? idString : idString[0]);

  const { data: order, isLoading, error } = useOrderDetails(id);

  // React Query style mutate with callbacks
  const { mutate: updateOrder, isPending: isUpdating } = useUpdateOrder() as any;

  const updateStatus = (newStatus: string) => {
    // Guard: prevent sending update if we don't have the order yet
    if (!order) return;

    updateOrder(
      { id, updatedFields: { status: newStatus } },
      {
        onSuccess: async () => {
          // IMPORTANT: use the status the user clicked, not order.status (stale)
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

  if (isLoading) return <ActivityIndicator />;
  if (error || !order) return <Text>Failed to fetch</Text>;

  return (
    <View style={{ padding: 10, gap: 20, flex: 1 }}>
      <Stack.Screen options={{ title: `Order #${id}` }} />

      <FlatList
        data={order.order_items}
        renderItem={({ item }) => <OrderItemListItem item={item} />}
        contentContainerStyle={{ gap: 10 }}
        ListHeaderComponent={() => <OrderListItem order={order} />}
        ListFooterComponent={() => (
          <>
            <Text style={{ fontWeight: "bold" }}>Status</Text>

            <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
              {OrderStatusList.map((status) => {
                const isActive = order.status === status;
                const disabled = isUpdating && !isActive;

                return (
                  <Pressable
                    key={status}
                    disabled={disabled}
                    onPress={() => updateStatus(status)}
                    style={{
                      borderColor: Colors.light.tint,
                      borderWidth: 1,
                      padding: 10,
                      borderRadius: 5,
                      marginVertical: 10,
                      backgroundColor: isActive ? Colors.light.tint : "transparent",
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? "white" : Colors.light.tint,
                        fontWeight: "600",
                      }}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      />
    </View>
  );
}
