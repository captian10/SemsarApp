import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Tables } from "database.types";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";
import RemoteImage from "./RemoteImage";

export const defaultPropertyImage =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=60";

type Property = Tables<"properties">;

type Props = {
  property: Property;
  hrefBase?: "/(user)/home" | "/(admin)/home";
  onToggleFavorite?: (propertyId: string) => void;
  isFavorite?: boolean;
  size?: "default" | "small" | "micro";
};

const safeText = (v: unknown, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
};

const formatMoney = (n: unknown) => {
  const p = Number(n ?? 0);
  if (!Number.isFinite(p)) return "0";
  try {
    return new Intl.NumberFormat("en-US").format(p);

    // return new Intl.NumberFormat("ar-EG").format(p);
  } catch {
    return String(p);
  }
};

export default function PropertyCard({
  property,
  hrefBase = "/(user)/home",
  onToggleFavorite,
  isFavorite = false,
  size = "default",
}: Props) {
  const t = useAppTheme();
  const isDark = t.scheme === "dark";

  const preset = size;
  const isSmall = preset === "small";
  const isMicro = preset === "micro";

  const imageH = isMicro ? 118 : isSmall ? 155 : 195;

  const title = safeText((property as any)?.title, "بدون عنوان");
  const city = safeText((property as any)?.city, "—");
  const image = (property as any)?.cover_image as string | null;

  const currency = useMemo(() => {
    const c = String((property as any)?.currency ?? "EGP")
      .trim()
      .toUpperCase();
    return c === "EGP" ? "جنيه" : c;
  }, [(property as any)?.currency]);

  const priceText = useMemo(
    () => formatMoney((property as any)?.price ?? 0),
    [property]
  );

  // ✅ show favorite only when handler exists
  const showFavorite = typeof onToggleFavorite === "function";

  const styles = useMemo(() => createStyles(t, isDark), [t, isDark]);

  return (
    <View
      style={[
        styles.card,
        isSmall && styles.cardSmall,
        isMicro && styles.cardMicro,
      ]}
    >
      <Link href={`${hrefBase}/${String((property as any)?.id)}`} asChild>
        <Pressable
          style={({ pressed }) => [styles.pressWrap, pressed && styles.pressed]}
        >
          <View style={styles.imageBox}>
            <RemoteImage
              // RemoteImage usually accepts null/undefined too, but we keep it safe
              path={image ?? ""}
              fallback={defaultPropertyImage}
              style={[styles.image, { height: imageH }]}
              resizeMode="cover"
            />

            {/* ✅ clean vertical gradient (no triangle look) */}
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.00)",
                "rgba(0,0,0,0.10)",
                "rgba(0,0,0,0.55)",
              ]}
              locations={[0, 0.62, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[
                styles.gradient,
                isSmall && styles.gradientSmall,
                isMicro && styles.gradientMicro,
              ]}
              pointerEvents="none"
            />

            {/* ✅ price chip */}
            <View
              style={[
                styles.priceChip,
                isSmall && styles.priceChipSmall,
                isMicro && styles.priceChipMicro,
              ]}
              pointerEvents="none"
            >
              <Text
                style={[
                  styles.priceText,
                  isSmall && styles.priceTextSmall,
                  isMicro && styles.priceTextMicro,
                ]}
                numberOfLines={1}
              >
                {priceText}
              </Text>

              <Text
                style={[
                  styles.currencyText,
                  isSmall && styles.currencyTextSmall,
                  isMicro && styles.currencyTextMicro,
                ]}
                numberOfLines={1}
              >
                {currency}
              </Text>
            </View>

            {/* ✅ favorite button */}
            {showFavorite && (
              <Pressable
                hitSlop={12}
                style={({ pressed }) => [
                  styles.favBtn,
                  isSmall && styles.favBtnSmall,
                  isMicro && styles.favBtnMicro,
                  pressed && styles.favPressed,
                ]}
                onPress={(e) => {
                  // prevent navigation when pressing the heart
                  // @ts-ignore
                  e?.stopPropagation?.();
                  // @ts-ignore
                  e?.preventDefault?.();
                  onToggleFavorite?.(String((property as any)?.id));
                }}
              >
                <FontAwesome
                  name={isFavorite ? "heart" : "heart-o"}
                  size={isMicro ? 14 : isSmall ? 16 : 18}
                  color={isFavorite ? "#E11D48" : styles._favIcon.color}
                />
              </Pressable>
            )}

            {/* bottom overlay */}
            <View
              style={[
                styles.bottomOverlay,
                isSmall && styles.bottomOverlaySmall,
                isMicro && styles.bottomOverlayMicro,
              ]}
              pointerEvents="none"
            >
              <Text
                numberOfLines={2}
                style={[
                  styles.title,
                  isSmall && styles.titleSmall,
                  isMicro && styles.titleMicro,
                ]}
              >
                {title}
              </Text>

              <View style={styles.locationRow}>
                <FontAwesome
                  name="map-marker"
                  size={isMicro ? 10 : isSmall ? 11 : 12}
                  color="rgba(255,255,255,0.92)"
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.locationText,
                    isSmall && styles.locationTextSmall,
                    isMicro && styles.locationTextMicro,
                  ]}
                >
                  {city}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

function createStyles(
  t: {
    scheme: "light" | "dark";
    colors: {
      bg: string;
      surface: string;
      text: string;
      muted: string;
      border: string;
      primary: string;
      error: string;
      tabBarBg: string;
      tabBarBorder: string;
    };
  },
  isDark: boolean
) {
  const ink = isDark ? "255,255,255" : "15,23,42";
  const ink10 = `rgba(${ink},0.10)`;
  const ink12 = `rgba(${ink},0.12)`;

  const chipBg = isDark ? "rgba(11,18,32,0.92)" : "rgba(255,255,255,0.96)";
  const chipBorder = isDark ? `rgba(148,163,184,0.18)` : ink10;

  const favIcon = isDark ? "rgba(248,250,252,0.92)" : "rgba(11,18,32,0.92)";

  return StyleSheet.create({
    _favIcon: { color: favIcon },

    card: {
      width: "100%",
      backgroundColor: t.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.colors.border,
      overflow: "hidden",

      shadowColor: "#000",
      shadowOpacity: isDark ? 0.18 : 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 2 : 4,
    },
    cardSmall: {
      borderRadius: 14,
      shadowOpacity: isDark ? 0.16 : 0.055,
      shadowRadius: 12,
      elevation: isDark ? 2 : 3,
    },
    cardMicro: {
      borderRadius: 12,
      shadowOpacity: isDark ? 0.14 : 0.05,
      shadowRadius: 10,
      elevation: isDark ? 2 : 3,
    },

    pressWrap: { width: "100%" },
    pressed: { opacity: 0.97, transform: [{ scale: 0.997 }] },

    imageBox: { position: "relative", backgroundColor: t.colors.surface },
    image: { width: "100%" },

    gradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 82,
    },
    gradientSmall: { height: 72 },
    gradientMicro: { height: 62 },

    priceChip: {
      position: "absolute",
      top: 10,
      left: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: chipBg,
      borderWidth: 1,
      borderColor: chipBorder,
    },
    priceChipSmall: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 11,
    },
    priceChipMicro: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
    },

    priceText: {
      fontFamily: FONT.bold,
      fontSize: 12.5,
      color: isDark ? "rgba(248,250,252,0.98)" : "rgba(11,18,32,0.95)",
    },
    priceTextSmall: { fontSize: 11.5 },
    priceTextMicro: { fontSize: 10.8 },

    currencyText: {
      fontFamily: FONT.medium,
      fontSize: 10.3,
      color: isDark ? "rgba(148,163,184,0.90)" : "rgba(11,18,32,0.60)",
    },
    currencyTextSmall: { fontSize: 9.7 },
    currencyTextMicro: { fontSize: 9.2 },

    favBtn: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: chipBg,
      borderWidth: 1,
      borderColor: chipBorder,
    },
    favBtnSmall: { width: 36, height: 36, borderRadius: 11 },
    favBtnMicro: { width: 32, height: 32, borderRadius: 10 },
    favPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },

    bottomOverlay: {
      position: "absolute",
      left: 10,
      right: 10,
      bottom: 10,
      gap: 6,
    },
    bottomOverlaySmall: { left: 10, right: 10, bottom: 9, gap: 5 },
    bottomOverlayMicro: { left: 9, right: 9, bottom: 9, gap: 4 },

    title: {
      fontFamily: FONT.bold,
      fontSize: 13.8,
      lineHeight: 19,
      color: "rgba(255,255,255,0.98)",
      textAlign: "right",
    },
    titleSmall: { fontSize: 12.6, lineHeight: 18 },
    titleMicro: { fontSize: 12.0, lineHeight: 17.2 },

    locationRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
    locationText: {
      flex: 1,
      fontFamily: FONT.medium,
      fontSize: 11.2,
      color: "rgba(255,255,255,0.88)",
      textAlign: "right",
    },
    locationTextSmall: { fontSize: 10.6 },
    locationTextMicro: { fontSize: 10.2 },
  });
}
