import { FontAwesome } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FONT } from "@/constants/Typography";
import { useCart } from "@/providers/CartProvider"; // ✅ عدّل المسار لو مختلف
import { THEME } from "@constants/Colors";

export default function MenuStack() {
  const { items } = useCart();

  // ✅ إجمالي القطع في السلة (quantity sum)
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: THEME.white.DEFAULT },
        headerTitleAlign: "center",
        headerTitleStyle: {
          fontFamily: FONT.bold,
          fontSize: 18,
          color: THEME.dark[100],
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "قائمة الطعام",
          headerRight: () => (
            <Link href="/cart" asChild>
              <Pressable
                hitSlop={12}
                style={({ pressed }) => [
                  styles.cartBtn,
                  pressed && styles.pressed,
                ]}
              >
                <FontAwesome
                  name="shopping-basket"
                  size={22}
                  color={THEME.primary}
                />

                {cartCount > 0 && (
                  <View pointerEvents="none" style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {cartCount > 99 ? "99+" : String(cartCount)}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRightWrap: {
    paddingRight: 14, // مساحة آمنة بعيد عن الحافة
  },
  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FFE0B8",
    position: "relative",
    overflow: "visible", // ✅ مهم عشان الـ badge مايتقصّش
  },
  pressed: { opacity: 0.85 },

  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.error,
    borderWidth: 2,
    borderColor: THEME.white.DEFAULT,
  },
  badgeText: {
    color: THEME.white.DEFAULT,
    fontFamily: FONT.bold,
    fontSize: 10,
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
