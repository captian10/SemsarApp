import { useProduct } from "@api/products";
import RemoteImage from "@components/RemoteImage";
import { FontAwesome } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
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

import { THEME } from "@constants/Colors";
import { FONT } from "@/constants/Typography";
import { defaultPizzaImage } from "../../../components/ProductListItem";

export default function AdminProductDetailsScreen() {
  const { id: idString } = useLocalSearchParams();

  const id = useMemo(() => {
    const raw = Array.isArray(idString) ? idString[0] : idString;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }, [idString]);

  const { data: product, error, isLoading } = useProduct(id);

  const priceText = useMemo(() => {
    const p = Number(product?.price ?? 0);
    return Number.isFinite(p) ? p.toFixed(2) : "0.00";
  }, [product?.price]);

  // ✅ NEW: category display
  const categoryText = useMemo(() => {
    const c = (product as any)?.category;
    return typeof c === "string" && c.trim().length > 0 ? c : "وجبات أخرى";
  }, [product]);

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

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "تفاصيل المنتج",
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: THEME.white.DEFAULT },
          headerTitleStyle: {
            fontFamily: FONT.bold,
            fontSize: 16,
            color: THEME.dark[100],
          },

          headerRight: () => (
            <Link href={`/(admin)/menu/create?id=${product.id}`} asChild>
              <Pressable
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <FontAwesome name="pencil" size={18} color={THEME.primary} />
              </Pressable>
            </Link>
          ),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Image Card */}
        <View style={styles.imageCard}>
          <RemoteImage
            path={product.image}
            fallback={defaultPizzaImage}
            style={styles.image}
            resizeMode="contain"
          />

          {/* Price badge */}
          <View style={styles.badge}>
            <Text style={styles.badgePrice}>{priceText}</Text>
            <Text style={styles.badgeCurrency}>جنيه</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>ID</Text>
              <Text style={styles.metaValue}>{String(product.id)}</Text>
            </View>

            {/* ✅ NEW: Category pill */}
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>القسم</Text>
              <Text style={styles.metaValue}>{categoryText}</Text>
            </View>
          </View>

          <Text style={styles.sub}>يمكنك تعديل المنتج من زر القلم بالأعلى.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = {
  screen: ViewStyle;
  content: ViewStyle;

  stateWrap: ViewStyle;
  stateText: TextStyle;
  errorTitle: TextStyle;

  iconBtn: ViewStyle;

  imageCard: ViewStyle;
  image: ImageStyle;

  badge: ViewStyle;
  badgePrice: TextStyle;
  badgeCurrency: TextStyle;

  info: ViewStyle;
  title: TextStyle;
  sub: TextStyle;

  metaRow: ViewStyle;
  metaPill: ViewStyle;
  metaLabel: TextStyle;
  metaValue: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  screen: {
    flex: 1,
    backgroundColor: THEME.white[100],
  },

  content: {
    padding: 12,
    paddingBottom: 24,
    gap: 12,
  },

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

  iconBtn: {
    marginRight: 12,
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FFE0B8",
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
  image: {
    width: "100%",
    aspectRatio: 1,
  },

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
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },

  title: {
    fontSize: 18,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    textAlign: "right",
  },

  metaRow: {
    flexDirection: "row-reverse",
    gap: 10,
    flexWrap: "wrap",
  },
  metaPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.white[100],
    borderWidth: 1,
    borderColor: "#EDEDED",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  metaLabel: {
    fontSize: 11,
    color: THEME.gray[100],
    fontFamily: FONT.medium,
  },
  metaValue: {
    fontSize: 12,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
  },

  sub: {
    fontSize: 13,
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    textAlign: "right",
  },
});
