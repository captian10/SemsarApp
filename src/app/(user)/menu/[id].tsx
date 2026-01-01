import { useProductWithSizes } from "@api/products";
import Button from "@components/Button";
import RemoteImage from "@components/RemoteImage";
import { useCart } from "@providers/CartProvider";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";
import { defaultPizzaImage } from "../../../components/ProductListItem";
import type { PizzaSize } from "../../../types/types";

const SIZES: PizzaSize[] = ["S", "M", "L", "XL"];
const CATEGORY_WITH_SIZES = new Set(["بيتزا"]);

const normSize = (s: unknown): PizzaSize => {
  const v = String(s ?? "")
    .trim()
    .toUpperCase();
  if (v === "S" || v === "M" || v === "L" || v === "XL") return v as PizzaSize;
  return "M";
};

function formatPrice(n: any) {
  const p = Number(n ?? 0);
  return Number.isFinite(p) ? p.toFixed(2) : "0.00";
}

export default function ProductDetailsScreen() {
  const { id: idString } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const id = useMemo(() => {
    const raw = Array.isArray(idString) ? idString[0] : idString;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }, [idString]);

  // ✅ single source of truth: product + product_sizes
  const { data: product, error, isLoading } = useProductWithSizes(id);
  const { addItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<PizzaSize>("M");
  const [adding, setAdding] = useState(false);

  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) setAdding(false);
  }, [isFocused]);

  // ✅ هل المنتج محتاج sizes؟
  const hasSizes = useMemo(() => {
    const cat = String((product as any)?.category ?? "").trim();
    return cat ? CATEGORY_WITH_SIZES.has(cat) : false;
  }, [product]);

  useEffect(() => {
    if (!hasSizes) setSelectedSize("M");
  }, [hasSizes]);

  // ✅ build price map from product.product_sizes
  const priceBySize = useMemo(() => {
    const map: Record<PizzaSize, number> = { S: 0, M: 0, L: 0, XL: 0 };
    const rows = (product as any)?.product_sizes ?? [];

    if (Array.isArray(rows)) {
      rows.forEach((r: any) => {
        const k = normSize(r.size);
        map[k] = Number(r.price ?? 0);
      });
    }

    return map;
  }, [product]);

  const basePrice = Number((product as any)?.price ?? 0);

  // ✅ selected price updates immediately when selectedSize changes
  const selectedUnitPrice = useMemo(() => {
    if (!hasSizes) return basePrice;
    const v = Number(priceBySize[selectedSize]);
    return v > 0 ? v : basePrice;
  }, [hasSizes, basePrice, priceBySize, selectedSize]);

  const priceText = useMemo(() => formatPrice(selectedUnitPrice), [selectedUnitPrice]);

  const addToCart = () => {
    if (!product || adding) return;

    setAdding(true);
    try {
      addItem(product as any, {
        size: hasSizes ? selectedSize : "M",
        unitPrice: selectedUnitPrice, // ✅ crucial
      });

      router.push("/cart");
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.stateText}>جاري تحميل المنتج...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>حصل خطأ</Text>
        <Text style={styles.stateText}>فشل تحميل بيانات المنتج.</Text>
      </View>
    );
  }

  const categoryText = String((product as any)?.category ?? "").trim() || "";

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: THEME.white.DEFAULT },
          headerTitleStyle: { fontFamily: FONT.bold },
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 220 + insets.bottom },
        ]}
      >
        <View style={styles.imageCard}>
          <RemoteImage
            path={product.image}
            fallback={defaultPizzaImage}
            style={styles.image}
            resizeMode="contain"
          />

          <View style={styles.badge}>
            <Text style={styles.badgePrice}>{priceText}</Text>
            <Text style={styles.badgeCurrency}>جنيه</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {product.name}
          </Text>

          {!!categoryText && (
            <Text style={styles.category} numberOfLines={1}>
              {categoryText}
            </Text>
          )}

          <Text style={styles.sub}>
            {hasSizes ? "اختر الحجم المناسب ثم أضف للسلة." : "أضف المنتج للسلة."}
          </Text>
        </View>

        {hasSizes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>اختر الحجم</Text>

            <View style={styles.sizesRow}>
              {SIZES.map((size) => {
                const active = selectedSize === size;
                const sizePrice = Number(priceBySize[size] || 0);
                const shownPrice = sizePrice > 0 ? sizePrice : basePrice;

                return (
                  <Pressable
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    disabled={adding}
                    style={({ pressed }) => [
                      styles.sizePill,
                      active && styles.sizePillActive,
                      pressed && styles.pressed,
                      adding && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[styles.sizeText, active && styles.sizeTextActive]}>
                      {size}
                    </Text>

                    <Text style={[styles.sizePrice, active && styles.sizePriceActive]}>
                      {formatPrice(shownPrice)} جنيه
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.bottomCard} pointerEvents="auto">
          <View style={styles.bottomRow}>
            <Text style={styles.bottomLabel}>السعر</Text>

            <View style={styles.totalPill}>
              <Text style={styles.totalValue}>{priceText}</Text>
              <Text style={styles.currency}>جنيه</Text>
            </View>
          </View>

          <Button
            onPress={addToCart}
            disabled={adding}
            text={adding ? "جاري الإضافة..." : "إضافة إلى السلة"}
          />
        </View>
      </View>
    </View>
  );
}

type Styles = {
  screen: ViewStyle;
  content: ViewStyle;

  stateWrap: ViewStyle;
  stateText: TextStyle;
  errorTitle: TextStyle;

  imageCard: ViewStyle;
  image: ImageStyle;

  badge: ViewStyle;
  badgePrice: TextStyle;
  badgeCurrency: TextStyle;

  info: ViewStyle;
  title: TextStyle;
  category: TextStyle;
  sub: TextStyle;

  section: ViewStyle;
  sectionTitle: TextStyle;

  sizesRow: ViewStyle;
  sizePill: ViewStyle;
  sizePillActive: ViewStyle;
  sizeText: TextStyle;
  sizeTextActive: TextStyle;

  sizePrice: TextStyle;
  sizePriceActive: TextStyle;

  bottom: ViewStyle;
  bottomCard: ViewStyle;
  bottomRow: ViewStyle;
  bottomLabel: TextStyle;

  totalPill: ViewStyle;
  totalValue: TextStyle;
  currency: TextStyle;

  pressed: ViewStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: { flex: 1, backgroundColor: THEME.white[100] },
  content: { padding: 12, gap: 12 },

  stateWrap: {
    flex: 1,
    backgroundColor: THEME.white[100],
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  stateText: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 16,
    color: THEME.error,
    fontFamily: FONT.bold,
    textAlign: "center",
  },

  imageCard: {
    position: "relative",
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
  image: { width: "100%", aspectRatio: 1 },

  badge: {
    position: "absolute",
    top: 12,
    left: 12,
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
  badgePrice: { fontSize: 12, color: THEME.primary, fontFamily: FONT.bold },
  badgeCurrency: { fontSize: 10, color: THEME.gray[100], fontFamily: FONT.medium },

  info: { paddingHorizontal: 2, gap: 6 },
  title: {
    fontSize: 18,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },
  category: {
    fontSize: 12,
    color: THEME.primary,
    fontFamily: FONT.bold,
    textAlign: "right",
  },
  sub: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "right",
  },

  section: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 13,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },

  sizesRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },

  sizePill: {
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.white[100],
    borderWidth: 1,
    borderColor: "#EDEDED",
    gap: 4,
  },
  sizePillActive: { backgroundColor: "#FFF4E6", borderColor: "#FFE0B8" },

  sizeText: { fontSize: 12, color: THEME.gray[100], fontFamily: FONT.bold },
  sizeTextActive: { color: THEME.primary },

  sizePrice: { fontSize: 11, color: THEME.gray[100], fontFamily: FONT.medium },
  sizePriceActive: { color: THEME.primary },

  bottom: { position: "absolute", left: 12, right: 12, bottom: 12 },
  bottomCard: {
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
  bottomRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomLabel: { fontSize: 13, color: THEME.gray[100], fontFamily: FONT.medium },

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
  totalValue: { fontSize: 14, color: THEME.primary, fontFamily: FONT.bold },
  currency: { fontSize: 11, color: THEME.gray[100], fontFamily: FONT.medium },

  pressed: { opacity: 0.85 },
});
