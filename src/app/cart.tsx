import Button from "@components/Button";
import CartListItem from "@components/CartListItem";
import { useCart } from "@providers/CartProvider";
import { StatusBar } from "expo-status-bar";
import { FlatList, Platform, Text, View } from "react-native";

const CartScreen = () => {
  const { items, total, checkout } = useCart();
  return (
    <View style={{ padding: 10 }}>
      <FlatList
        data={items}
        renderItem={({ item }) => <CartListItem cartItem={item} />}
        contentContainerStyle={{ padding: 2, gap: 10 }}
      />
      <Text
        style={{
          marginTop: 20,
          fontSize: 20,
          fontWeight: "500",
          marginLeft: 10,
        }}
      >
        Total: ${total}
      </Text>
      <Button onPress={checkout} text="Checkout" />

      <StatusBar style={Platform.OS === "android" ? "light" : "auto"} />
    </View>
  );
};

export default CartScreen;
