import type { Tables } from "@database.types";
import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { defaultPizzaImage } from "./ProductListItem";
import RemoteImage from "./RemoteImage";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";

type OrderItemRow = Tables<"order_items"> & {
  // ✅ optional (if you added them to DB)
  unit_price?: number | null;
  line_total?: number | null;
};

type ProductRow = Tables<"products"> & {
  category?: string | null; // in case types not updated yet
};

type OrderItemListItemProps = {
  item: { products: ProductRow } & OrderItemRow;
};

const formatMoney = (n: number) => {
  try {
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
};

const mapSize = (size: unknown) => {
  const s = String(size ?? "").trim().toLowerCase();
  if (!s) return "";

  const map: Record<string, string> = {
    s: "S",
    small: "S",
    m: "M",
    medium: "M",
    l: "L",
    large: "L",
    xl: "XL",
    extra_large: "XL",
  };

  return map[s] ?? String(size);
};

// ✅ show sizes only for pizza
const CATEGORY_WITH_SIZES = new Set(["بيتزا"]);

export default function OrderItemListItem({ item }: OrderItemListItemProps) {
  const qty = Number(item.quantity ?? 0);

  // ✅ Priority:
  // 1) order_items.unit_price
  // 2) products.price (fallback)
  const unitPrice = useMemo(() => {
    const p1 = Number(item.unit_price ?? NaN);
    if (Number.isFinite(p1)) return p1;

    const p2 = Number(item.products.price ?? 0);
    return Number.isFinite(p2) ? p2 : 0;
  }, [item.unit_price, item.products.price]);

  // ✅ Priority:
  // 1) order_items.line_total
  // 2) unitPrice * qty
  const lineTotal = useMemo(() => {
    const lt = Number(item.line_total ?? NaN);
    if (Number.isFinite(lt)) return lt;

    return unitPrice * qty;
  }, [item.line_total, unitPrice, qty]);

  const showSize = useMemo(() => {
    const cat = String(item.products.category ?? "").trim();
    return CATEGORY_WITH_SIZES.has(cat);
  }, [item.products.category]);

  const sizeLabel = useMemo(() => {
    const s = mapSize(item.size);
    return s ? `الحجم: ${s}` : "";
  }, [item.size]);

  return (
    <View style={styles.card}>
      {/* Image */}
      <View style={styles.imageWrap}>
        <RemoteImage
          path={item.products.image}
          fallback={defaultPizzaImage}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.title}>
            {item.products.name}
          </Text>

          <View style={styles.qtyChip}>
            <Text style={styles.qtyText}>الكمية: {qty}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          {showSize && !!sizeLabel && (
            <>
              <Text style={styles.metaText}>{sizeLabel}</Text>
              <Text style={styles.metaDot}>•</Text>
            </>
          )}

          <Text style={styles.metaText}>
            سعر الوحدة:{" "}
            <Text style={styles.strong}>
              {formatMoney(unitPrice)} <Text style={styles.currency}>ج.م</Text>
            </Text>
          </Text>
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>الإجمالي</Text>
          <Text style={styles.totalValue}>
            {formatMoney(lineTotal)} <Text style={styles.currency}>ج.م</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

type Styles = {
  card: ViewStyle;

  imageWrap: ViewStyle;
  image: ImageStyle;

  info: ViewStyle;

  topRow: ViewStyle;
  title: TextStyle;
  qtyChip: ViewStyle;
  qtyText: TextStyle;

  metaRow: ViewStyle;
  metaText: TextStyle;
  metaDot: TextStyle;

  strong: TextStyle;
  currency: TextStyle;

  totalRow: ViewStyle;
  totalLabel: TextStyle;
  totalValue: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
  },

  imageWrap: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  image: { width: 52, height: 52 },

  info: { flex: 1, gap: 8, alignItems: "flex-end" },

  topRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  qtyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },

  qtyText: {
    fontSize: 12,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  metaRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",
  },

  metaText: {
    fontSize: 12,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
  },

  metaDot: {
    color: "rgba(15, 23, 42, 0.25)",
    fontSize: 12,
  },

  strong: {
    fontFamily: FONT.bold,
    color: THEME.dark[100],
  },

  currency: {
    fontSize: 11,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
  },

  totalRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    paddingTop: 2,
  },

  totalLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
    textAlign: "right",
  },

  totalValue: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: THEME.primary,
    textAlign: "right",
  },
});
