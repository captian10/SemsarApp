import type { Tables } from "@database.types";
import { Link, useSegments } from "expo-router";
import { Image, Pressable, StyleSheet, Text } from "react-native";
import RemoteImage from "./RemoteImage";

export const defaultPizzaImage =
  "https://www.cicis.com/content/images/cicis/Jalapeno%20pizza.png";

type ProductListItemProps = {
  product: Tables<"products">;
};

const ProductListItem = ({ product }: ProductListItemProps) => {
  const segments = useSegments();

  return (
    <Link href={`/menu/${product.id}`} asChild>
      <Pressable style={styles.container}>
        <RemoteImage
        path={product.image}
        fallback={defaultPizzaImage}
          style={{ width: "80%", aspectRatio: 1 }}
          resizeMode="contain"
        />
        <Text>{product.name}</Text>
        <Text>{product.price}</Text>
      </Pressable>
    </Link>
  );
};

export default ProductListItem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: "50%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 5,
  },
});
