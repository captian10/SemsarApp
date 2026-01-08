// src/components/HomeSectionRail.tsx
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Tables } from "database.types";

import { FONT } from "@/constants/Typography";
import { THEME } from "@/constants/Colors";
import PropertyCard from "@/components/PropertyCard";

type Property = Tables<"properties">;

type Props = {
  title: string;
  data: Property[];
  hrefBase?: "/(user)/home" | "/(admin)/home";

  // see all
  onPressSeeAll?: () => void;
  seeAllLabel?: string;

  // favorites
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (propertyId: string) => void;

  // UI
  cardWidth?: number; // default 240
  gap?: number; // default 12
  invertedRtl?: boolean; // default true
};

export default function HomeSectionRail({
  title,
  data,
  hrefBase = "/(user)/home",
  onPressSeeAll,
  seeAllLabel = "عرض الكل",
  isFavorite,
  onToggleFavorite,
  cardWidth = 240,
  gap = 12,
  invertedRtl = true,
}: Props) {
  const items = useMemo(() => (Array.isArray(data) ? data.filter(Boolean) : []), [data]);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      {/* header */}
      <View style={styles.headerRow}>
        {!!onPressSeeAll && (
          <Pressable
            onPress={onPressSeeAll}
            hitSlop={10}
            style={({ pressed }) => [styles.seeAllBtn, pressed && styles.pressed]}
          >
            <Text style={styles.seeAllText}>{seeAllLabel}</Text>
            <FontAwesome name="chevron-left" size={12} color={THEME.primary} />
          </Pressable>
        )}

        <Text style={styles.title} numberOfLines={1}>
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
        contentContainerStyle={[styles.listContent, { gap }]}
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
  wrap: {
    gap: 10,
  },
  headerRow: {
    paddingHorizontal: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: FONT.bold,
    fontSize: 16,
    color: THEME.dark[100],
    textAlign: "right",
  },
  seeAllBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.18)",
  },
  seeAllText: {
    fontFamily: FONT.bold,
    fontSize: 12,
    color: THEME.primary,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
