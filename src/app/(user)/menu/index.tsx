import { useProductList } from "@api/products";
import ProductListItem from "@components/ProductListItem";
import { ActivityIndicator, FlatList, Text } from "react-native";

export default function MenuScreen() {
  const { data: products, error, isLoading } = useProductList();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return <Text>Failed to fetch products</Text>;
  }

  return (
    <FlatList
      data={products}
      renderItem={({ item }) => <ProductListItem product={item} />}
      showsVerticalScrollIndicator={false}
      numColumns={2}
      contentContainerStyle={{ gap: 10, padding: 5 }}
      columnWrapperStyle={{ gap: 10 }}
    />
  );
}
