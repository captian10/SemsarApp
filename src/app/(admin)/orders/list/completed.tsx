import { ActivityIndicator, FlatList, Text, View } from "react-native";
import OrderListItem from "@components/OrderListItem";
import { useAdminOrderList } from "@api/orders";

export default function OrdersScreen() {
  const { data, isLoading, error, refetch } = useAdminOrderList({ archived: true });

  const list = data ?? []; // ✅ always array

  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>Failed to fetch</Text>;

  return (
    <FlatList
      data={list}
      keyExtractor={(item: any, index) => String(item?.id ?? index)}
      renderItem={({ item }) => <OrderListItem order={item as any} />}
      contentContainerStyle={{ gap: 10, padding: 10 }}
    />
  );
}
