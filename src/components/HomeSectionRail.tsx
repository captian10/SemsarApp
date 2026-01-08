// src/components/HomeSectionRail.tsx
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Tables } from "database.types";
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import PropertyCard from "@/components/PropertyCard";
import { THEME } from "@/constants/Colors";
import { FONT } from "@/constants/Typography";

type Property = Tables<"properties">;

type Props = {
  title: string;
  data: Property[];
  hrefBase?: "/(user)/home" | "/(admin)/home";

  onPressSeeAll?: () => void;
  seeAllLabel?: string;

  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (propertyId: string) => void;

  // ✅ NEW
  variant?: "micro" | "compact" | "default";
  invertedRtl?: boolean;
};

export default function HomeSectionRail({
  title,
  data,
  hrefBase = "/(user)/home",
  onPressSeeAll,
  seeAllLabel = "عرض الكل",
  isFavorite,
  onToggleFavorite,
  variant = "default",
  invertedRtl = true,
}: Props) {
  const items = useMemo(
    () => (Array.isArray(data) ? data.filter(Boolean) : []),
    [data]
  );

  if (!items.length) return null;

  const isMicro = variant === "micro";
  const isCompact = variant === "compact";

  const cardWidth = isMicro ? 170 : isCompact ? 220 : 240;
  const gap = isMicro ? 8 : isCompact ? 10 : 12;

  const titleSize = isMicro ? 12.5 : isCompact ? 13.5 : 16;

  // ✅ Card sizes (must be supported by PropertyCard)
  const cardSize: "micro" | "small" | "default" =
    variant === "micro" ? "micro" : variant === "compact" ? "small" : "default";

  return (
    <View style={[styles.wrap, isMicro && styles.wrapMicro]}>
      {/* header */}
      <View style={[styles.headerRow, isMicro && styles.headerRowMicro]}>
        {!!onPressSeeAll && (
          <Pressable
            onPress={onPressSeeAll}
            hitSlop={10}
            style={({ pressed }) => [
              styles.seeAllBtn,
              isMicro && styles.seeAllBtnMicro,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.seeAllText, isMicro && styles.seeAllTextMicro]}>
              {seeAllLabel}
            </Text>
            <FontAwesome
              name="chevron-left"
              size={isMicro ? 10 : 11}
              color={THEME.primary}
            />
          </Pressable>
        )}

        <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* horizontal list */}
      <FlatList
        data={items}
        horizontal
        inverted={invertedRtl}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, idx) => String((item as any)?.id ?? idx)}
        contentContainerStyle={[
          styles.listContent,
          isMicro && styles.listContentMicro,
          { gap },
        ]}
        snapToInterval={cardWidth + gap}
        decelerationRate="fast"
        disableIntervalMomentum
        renderItem={({ item }) => {
          const id = String((item as any).id);

          return (
            <View style={{ width: cardWidth }}>
              <PropertyCard
                hrefBase={hrefBase}
                property={item as any}
                size={cardSize} // ✅ micro -> micro, compact -> small, default -> default
                isFavorite={isFavorite ? isFavorite(id) : false}
                onToggleFavorite={onToggleFavorite}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  wrapMicro: { gap: 6 },

  headerRow: {
    paddingHorizontal: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerRowMicro: {
    paddingHorizontal: 12,
  },

  title: {
    flex: 1,
    fontFamily: FONT.bold,
    color: "rgba(15,23,42,0.90)",
    textAlign: "right",
  },

  seeAllBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
  },
  seeAllBtnMicro: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  seeAllText: {
    fontFamily: FONT.bold,
    fontSize: 11.5,
    color: THEME.primary,
  },
  seeAllTextMicro: {
    fontSize: 10.5,
  },

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 2,
    paddingTop: 2,
  },
  listContentMicro: {
    paddingBottom: 0,
  },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
