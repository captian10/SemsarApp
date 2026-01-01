import React, { useMemo } from "react";
import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, Text, View, Pressable, type TextStyle, type ViewStyle, type ImageStyle } from "react-native";

import RemoteImage from "./RemoteImage";
import { defaultPizzaImage } from "./ProductListItem";
import { useCart } from "../providers/CartProvider";
import type { CartItem } from "../types/types";

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";

type Props = {
  cartItem: CartItem;
};

export default function CartListItem({ cartItem }: Props) {
  const { updateQuantity } = useCart();

  const priceText = useMemo(() => {
    const p = Number(cartItem.product?.price ?? 0);
    return Number.isFinite(p) ? p.toFixed(2) : "0.00";
  }, [cartItem.product?.price]);

  const onMinus = () => updateQuantity(cartItem.id, -1);
  const onPlus = () => updateQuantity(cartItem.id, 1);

  return (
    <View style={styles.card}>
      {/* Image */}
      <View style={styles.imageBox}>
        <RemoteImage
          path={cartItem.product.image}
          fallback={defaultPizzaImage}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.title}>
          {cartItem.product.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.pricePill}>
            <Text style={styles.price}>{priceText}</Text>
            <Text style={styles.currency}>جنيه</Text>
          </View>

          <View style={styles.sizePill}>
            <Text style={styles.sizeLabel}>الحجم</Text>
            <Text style={styles.sizeValue}>{cartItem.size}</Text>
          </View>
        </View>
      </View>

      {/* Quantity */}
      <View style={styles.qtyBox}>
        <Pressable onPress={onPlus} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
          <FontAwesome name="plus" size={12} color={THEME.primary} />
        </Pressable>

        <Text style={styles.qtyText}>{cartItem.quantity}</Text>

        <Pressable onPress={onMinus} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
          <FontAwesome name="minus" size={12} color={THEME.primary} />
        </Pressable>
      </View>
    </View>
  );
}

type Styles = {
  card: ViewStyle;

  imageBox: ViewStyle;
  image: ImageStyle;

  info: ViewStyle;
  title: TextStyle;
  metaRow: ViewStyle;

  pricePill: ViewStyle;
  price: TextStyle;
  currency: TextStyle;

  sizePill: ViewStyle;
  sizeLabel: TextStyle;
  sizeValue: TextStyle;

  qtyBox: ViewStyle;
  iconBtn: ViewStyle;
  qtyText: TextStyle;

  pressed: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  imageBox: {
    width: 74,
    height: 74,
    borderRadius: 16,
    backgroundColor: THEME.white[100],
    borderWidth: 1,
    borderColor: "#EDEDED",
    overflow: "hidden",
    padding: 8,
  },
  image: {
    width: 58,
    height: 58,
  },

  info: {
    flex: 1,
    gap: 6,
  },

  title: {
    fontSize: 14,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },

  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  pricePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FFE0B8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  price: {
    fontSize: 12,
    color: THEME.primary,
    fontFamily: FONT.bold,
  },
  currency: {
    fontSize: 10,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  sizePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.white[100],
    borderWidth: 1,
    borderColor: "#EDEDED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sizeLabel: {
    fontSize: 10,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },
  sizeValue: {
    fontSize: 11,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
  },

  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.white[100],
    borderWidth: 1,
    borderColor: "#EDEDED",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FFE0B8",
  },

  qtyText: {
    minWidth: 18,
    textAlign: "center",
    fontSize: 13,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
  },

  pressed: { opacity: 0.85 },
});
