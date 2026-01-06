// src/components/RequestItemListItem.tsx
import type { Tables } from "@database.types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";
import RemoteImage from "./RemoteImage";

dayjs.extend(relativeTime);

const defaultPropertyImage =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=60";

type RequestRow = Tables<"requests">;
type PropertyRow = Tables<"properties">;

// لو بتعمل join في query خليها واحدة من الاتنين:
// 1) property:properties(...)
// 2) properties(...)
type RequestWithProperty = RequestRow & {
  property?: Pick<PropertyRow, "title" | "city" | "price" | "currency" | "cover_image"> | null;
  properties?: Pick<PropertyRow, "title" | "city" | "price" | "currency" | "cover_image"> | null;
};

type Props = {
  request: RequestWithProperty;
  onPress?: () => void;
};

const normalize = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

type StatusKey = "new" | "answered" | "closed" | "unknown";
const toStatusKey = (s: unknown): StatusKey => {
  const v = normalize(s);
  if (v === "new") return "new";
  if (v === "answered" || v === "in_progress" || v === "progress") return "answered";
  if (v === "closed" || v === "done" || v === "completed") return "closed";
  return "unknown";
};

const STATUS_UI: Record<
  StatusKey,
  { label: string; bg: string; border: string; text: string }
> = {
  new: {
    label: "جديد",
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.22)",
    text: THEME.primary,
  },
  answered: {
    label: "قيد المتابعة",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.22)",
    text: "#B45309",
  },
  closed: {
    label: "مغلق",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.22)",
    text: "#15803D",
  },
  unknown: {
    label: "غير معروف",
    bg: "rgba(15,23,42,0.05)",
    border: "rgba(15,23,42,0.10)",
    text: "rgba(15,23,42,0.70)",
  },
};

export default function RequestItemListItem({ request, onPress }: Props) {
  const createdAt = request.created_at ?? null;

  const timeText = useMemo(() => {
    if (!createdAt) return "";
    try {
      return dayjs(createdAt).fromNow();
    } catch {
      return "";
    }
  }, [createdAt]);

  const statusKey = useMemo(() => toStatusKey((request as any).status), [request]);
  const status = STATUS_UI[statusKey];

  const p = request.property ?? request.properties ?? null;

  const title = p?.title?.trim() || "عقار";
  const city = p?.city?.trim() || "—";

  const price = Number(p?.price ?? 0);
  const priceText = Number.isFinite(price) ? price.toLocaleString("en-EG") : "0";
  const currency = p?.currency ?? "EGP";

  const phone = request.phone?.trim() || "—";
  const message = request.message?.trim() || "بدون رسالة";

  const image = (p?.cover_image || null) as string | null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Image */}
      <View style={styles.imageWrap}>
        <RemoteImage
          path={image}
          fallback={defaultPropertyImage}
          style={styles.image}
          resizeMode="cover"
        />

        {/* price pill */}
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{priceText}</Text>
          <Text style={styles.currencyText}>{currency}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            طلب #{String(request.id).slice(0, 8)}
          </Text>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <Text style={[styles.statusText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.propertyLine} numberOfLines={1}>
          {title} • {city}
        </Text>

        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={styles.meta}>{timeText}</Text>
          <Text style={styles.meta}>📞 {phone}</Text>
        </View>
      </View>
    </Pressable>
  );
}

type Styles = {
  card: ViewStyle;
  pressed: ViewStyle;

  imageWrap: ViewStyle;
  image: ImageStyle;
  pricePill: ViewStyle;
  priceText: TextStyle;
  currencyText: TextStyle;

  content: ViewStyle;

  topRow: ViewStyle;
  title: TextStyle;

  statusPill: ViewStyle;
  statusText: TextStyle;

  propertyLine: TextStyle;
  message: TextStyle;

  bottomRow: ViewStyle;
  meta: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  card: {
    flexDirection: "row-reverse",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },

  imageWrap: {
    width: 92,
    height: 92,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(15,23,42,0.03)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },

  pricePill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  priceText: { fontFamily: FONT.bold, fontSize: 12, color: THEME.dark[100] },
  currencyText: {
    fontFamily: FONT.medium,
    fontSize: 10,
    color: "rgba(15,23,42,0.55)",
  },

  content: { flex: 1, alignItems: "flex-end", gap: 8 },

  topRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 14,
    color: THEME.dark[100],
    textAlign: "right",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: FONT.bold,
    fontSize: 12,
    textAlign: "right",
  },

  propertyLine: {
    width: "100%",
    fontFamily: FONT.medium,
    fontSize: 12,
    color: "rgba(15,23,42,0.65)",
    textAlign: "right",
  },

  message: {
    width: "100%",
    fontFamily: FONT.regular,
    fontSize: 12,
    color: THEME.dark[100],
    textAlign: "right",
    lineHeight: 18,
  },

  bottomRow: {
    width: "100%",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    fontFamily: FONT.regular,
    fontSize: 11,
    color: "rgba(15,23,42,0.55)",
    textAlign: "right",
  },
});
