import type { Tables } from "@database.types";
import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";
import { useCart } from "@providers/CartProvider";
import RemoteImage from "./RemoteImage";

export const defaultPizzaImage =
  "https://aksjfglbezxgjxoywdjc.supabase.co/storage/v1/object/sign/product-images/UploadImage2%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lMWFlYjY1NS1mNGI2LTRhZGQtYTM2ZS1jZWNhYzFlOWI1OGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9kdWN0LWltYWdlcy9VcGxvYWRJbWFnZTIgKDEpLnBuZyIsImlhdCI6MTc2NzAzMDQ5MywiZXhwIjoxNzk4NTY2NDkzfQ.HKJMB0r-WUe8c_5ZGTeTOTH--62zt5lvmrV-3jGgt2c";

type Product = Tables<"products">;

type Props = {
  product: Product;
};

export default function ProductListItem({ product }: Props) {
  const { addItem } = useCart();

  const price = Number(product.price ?? 0);
  const priceText = Number.isFinite(price) ? price.toFixed(2) : "0.00";

  return (
    <View style={styles.card}>
      {/* ✅ هذا الجزء فقط يفتح التفاصيل */}
      <Link href={`/menu/${product.id}`} asChild>
        <Pressable
          style={({ pressed }) => [styles.topPress, pressed && styles.pressed]}
        >
          <View style={styles.imageBox}>
            <RemoteImage
              path={product.image}
              fallback={defaultPizzaImage}
              style={styles.image}
              resizeMode="contain"
            />

            {/* Price badge فوق الصورة */}
            <View style={styles.badge}>
              <Text style={styles.badgePrice}>{priceText}</Text>
              <Text style={styles.badgeCurrency}>جنيه</Text>
            </View>
          </View>

          <View style={styles.info}>
            <Text numberOfLines={2} style={styles.name}>
              {product.name}
            </Text>
          </View>
        </Pressable>
      </Link>

      {/* Divider */}
      <View style={styles.divider} />

      {/* ✅ زر إضافة للسلة: لا يفتح التفاصيل */}
      <Pressable
        onPress={() => addItem(product)} // ✅ يضيف للسلة
        style={({ pressed }) => [styles.addBtn, pressed && styles.addPressed]}
        hitSlop={8}
      >
        <Text style={styles.addText}>إضافة إلى السلة</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  topPress: {
    gap: 10,
  },

  pressed: {
    opacity: 0.92,
  },

  imageBox: {
    backgroundColor: THEME.white[100],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDEDED",
    overflow: "hidden",
    padding: 1,
    position: "relative",
  },

  image: {
    width: "100%",
    aspectRatio: 1.05,
  },

  badge: {
    position: "absolute",
    top: 10,
    left: 10,
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

  badgePrice: {
    fontSize: 12,
    color: THEME.primary,
    fontFamily: FONT.bold,
  },

  badgeCurrency: {
    fontSize: 10,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  info: {
    gap: 4,
    paddingHorizontal: 2,
  },

  name: {
    fontSize: 13,
    lineHeight: 18,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "center",
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#EDEDED",
    marginTop: 10,
    marginBottom: 10,
  },

  // ✅ زر صغير + داخل الكارد
  addBtn: {
    alignSelf: "center",
    backgroundColor: THEME.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  addPressed: { opacity: 0.9 },

  addText: {
    color: THEME.white.DEFAULT,
    fontFamily: FONT.bold,
    fontSize: 12,
    textAlign: "center",
  },
});
