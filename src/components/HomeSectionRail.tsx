// src/components/HomeSectionRail.tsx
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Tables } from "database.types";
import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import PropertyCard from "@/components/PropertyCard";
import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";

type Property = Tables<"properties">;

type Props = {
  title: string;
  data: Property[];
  hrefBase?: "/(user)/home" | "/(admin)/home";

  onPressSeeAll?: () => void;
  seeAllLabel?: string;

  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (propertyId: string) => void;

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
  const theme = useAppTheme();
  const c = theme.colors;
  const isDark = theme.scheme === "dark";

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

  const cardSize: "micro" | "small" | "default" =
    variant === "micro" ? "micro" : variant === "compact" ? "small" : "default";

  const styles = useMemo(
    () => createStyles(c, isDark, { isMicro, titleSize }),
    [c, isDark, isMicro, titleSize]
  );

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
              color={c.primary}
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
                size={cardSize}
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

function createStyles(
  c: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    primary: string;
    error: string;
    tabBarBg: string;
    tabBarBorder: string;
  },
  isDark: boolean,
  args: { isMicro: boolean; titleSize: number }
) {
  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink06 = `rgba(${ink},0.06)`;
  const ink08 = `rgba(${ink},0.08)`;

  const primarySoft = `rgba(59,130,246,${isDark ? "0.18" : "0.08"})`;
  const primaryBorder = `rgba(59,130,246,${isDark ? "0.35" : "0.18"})`;

  return StyleSheet.create({
    wrap: { gap: 8 },
    wrapMicro: { gap: 6 },

    headerRow: {
      paddingHorizontal: 12,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    headerRowMicro: { paddingHorizontal: 12 },

    // ✅ كان هنا لون ثابت غامق — بقى من الثيم
    title: {
      flex: 1,
      fontFamily: FONT.bold,
      color: c.text,
      textAlign: "right",
    },

    // ✅ زر "عرض الكل" بقى كمان من الثيم عشان يبان في الدارك
    seeAllBtn: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: primarySoft,
      borderWidth: 1,
      borderColor: primaryBorder,
    },
    seeAllBtnMicro: { paddingHorizontal: 8, paddingVertical: 5 },

    seeAllText: {
      fontFamily: FONT.bold,
      fontSize: 11.5,
      color: c.primary,
    },
    seeAllTextMicro: { fontSize: 10.5 },

    listContent: {
      paddingHorizontal: 12,
      paddingBottom: 2,
      paddingTop: 2,
    },
    listContentMicro: { paddingBottom: 0 },

    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
}
