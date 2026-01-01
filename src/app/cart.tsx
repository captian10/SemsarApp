import Button from "@components/Button";
import CartListItem from "@components/CartListItem";
import { useCart } from "@providers/CartProvider";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  Pressable,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const CartScreen = () => {
  const { items, total, checkout, clearCart } = useCart();
  const insets = useSafeAreaInsets();

  const totalText = useMemo(() => {
    const t = Number(total ?? 0);
    return Number.isFinite(t) ? t.toFixed(2) : "0.00";
  }, [total]);

  const confirmClear = () => {
    if (!items.length) return;
    // لو عايز Alert تأكيد:
    // Alert.alert("تأكيد", "تحب تمسح كل المنتجات من السلة؟", [
    //   { text: "إلغاء", style: "cancel" },
    //   { text: "مسح الكل", style: "destructive", onPress: clearCart },
    // ]);
    clearCart();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>السلة</Text>
            <Text style={styles.subtitle}>
              {items.length ? "راجع طلباتك قبل الدفع" : "السلة فاضية حالياً"}
            </Text>
          </View>

          {/* Delete all */}
          <Pressable
            onPress={confirmClear}
            disabled={!items.length}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && styles.pressed,
              !items.length && styles.disabled,
            ]}
          >
            <Text style={styles.clearText}>مسح الكل</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CartListItem cartItem={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            // ✅ نخلي فيه مساحة محترمة تحت بمقدار ارتفاع البوتوم كارد + safe area
            paddingBottom: 140 + insets.bottom,
          },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>مفيش منتجات في السلة</Text>
            <Text style={styles.emptySub}>
              ارجع للمنيو واضف اللي نفسك فيه 👇
            </Text>
          </View>
        }
      />

      {/* Bottom Summary */}
      <View
        style={[
          styles.bottom,
          {
            // ✅ يخلي البوتوم كارد فوق الـ nav/bottom bar على طول
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>الإجمالي</Text>

            <View style={styles.totalPill}>
              <Text style={styles.totalValue}>{totalText}</Text>
              <Text style={styles.currency}>جنيه</Text>
            </View>
          </View>

          <Button
            onPress={checkout}
            text={items.length ? "إتمام الطلب" : "السلة فاضية"}
            disabled={!items.length}
          />
        </View>
      </View>

      <StatusBar style={Platform.OS === "android" ? "light" : "auto"} />
    </SafeAreaView>
  );
};

type Styles = {
  screen: ViewStyle;

  header: ViewStyle;
  headerRow: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;

  clearBtn: ViewStyle;
  clearText: TextStyle;

  listContent: ViewStyle;

  emptyWrap: ViewStyle;
  emptyTitle: TextStyle;
  emptySub: TextStyle;

  bottom: ViewStyle;
  totalCard: ViewStyle;
  totalRow: ViewStyle;
  totalLabel: TextStyle;

  totalPill: ViewStyle;
  totalValue: TextStyle;
  currency: TextStyle;

  pressed: ViewStyle;
  disabled: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  header: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 22,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },
  subtitle: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "right",
    marginTop: 2,
  },

  clearBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FDECEC",
    borderWidth: 1,
    borderColor: "#F6B5B5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  clearText: {
    color: THEME.error,
    fontFamily: FONT.bold,
    fontSize: 12,
  },

  listContent: {
    gap: 10,
  },

  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "center",
  },

  bottom: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0, // ✅ هنستخدم paddingBottom بالـ insets بدل bottom ثابت
  },

  totalCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  totalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  totalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FFE0B8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  totalValue: {
    fontSize: 14,
    color: THEME.primary,
    fontFamily: FONT.bold,
  },
  currency: {
    fontSize: 11,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },

  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
});

export default CartScreen;
