import type { Tables } from "database.types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { FONT } from "@/constants/Typography";
import { THEME } from "@constants/Colors";
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

export default function PropertyCard({
  property,
  hrefBase = "/(user)/home",
  onToggleFavorite,
  isFavorite = false,
  size = "default",
}: Props) {
  const price = Number(property.price ?? 0);
  const priceText = Number.isFinite(price) ? price.toLocaleString("en-EG") : "0";

  const currency = useMemo(() => {
    const c = String(property.currency ?? "EGP").trim().toUpperCase();
    return c === "EGP" ? "جنيه" : c;
  }, [property.currency]);

  const city = property.city ?? "—";
  const image = (property.cover_image || null) as string | null;

  const preset = size;
  const isSmall = preset === "small";
  const isMicro = preset === "micro";

  const imageH = isMicro ? 118 : isSmall ? 155 : 195;

  return (
    <View
      style={[
        styles.card,
        isSmall && styles.cardSmall,
        isMicro && styles.cardMicro,
      ]}
    >
      <Link href={`${hrefBase}/${property.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.pressWrap, pressed && styles.pressed]}>
          <View style={styles.imageBox}>
            <RemoteImage
              path={image}
              fallback={defaultPropertyImage}
              style={[styles.image, { height: imageH }]}
              resizeMode="cover"
            />

            {/* ✅ Clean gradient (NO triangle look) */}
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.00)",
                "rgba(0,0,0,0.08)",
                "rgba(0,0,0,0.42)",
              ]}
              locations={[0, 0.65, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[
                styles.gradient,
                isSmall && styles.gradientSmall,
                isMicro && styles.gradientMicro,
              ]}
              pointerEvents="none"
            />

            {/* ✅ Price chip (modern) */}
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
              >
                {priceText}
              </Text>
              <Text
                style={[
                  styles.currencyText,
                  isSmall && styles.currencyTextSmall,
                  isMicro && styles.currencyTextMicro,
                ]}
              >
                {currency}
              </Text>
            </View>

            {/* ✅ Favorite glass button */}
            <Pressable
              hitSlop={12}
              style={({ pressed }) => [
                styles.favBtn,
                isSmall && styles.favBtnSmall,
                isMicro && styles.favBtnMicro,
                pressed && styles.favPressed,
              ]}
              onPress={(e) => {
                // @ts-ignore
                e?.stopPropagation?.();
                onToggleFavorite?.(String(property.id));
              }}
            >
              <FontAwesome
                name={isFavorite ? "heart" : "heart-o"}
                size={isMicro ? 14 : isSmall ? 16 : 18}
                color={isFavorite ? "#E11D48" : "rgba(11,18,32,0.92)"}
              />
            </Pressable>

            {/* ✅ Bottom overlay: clean + readable */}
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
                {property.title}
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

const styles = StyleSheet.create({
  /* ✅ Pro card shell */
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    overflow: "hidden",

    shadowColor: "#0B1220",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardSmall: { borderRadius: 14, shadowOpacity: 0.055, shadowRadius: 12, elevation: 3 },
  cardMicro: { borderRadius: 12, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },

  pressWrap: { width: "100%" },
  pressed: { opacity: 0.97, transform: [{ scale: 0.997 }] },

  imageBox: { position: "relative", backgroundColor: THEME.white[100] },
  image: { width: "100%" },

  /* ✅ gradient smaller + softer */
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 82,
  },
  gradientSmall: { height: 72 },
  gradientMicro: { height: 62 },

  /* ✅ Price chip */
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

    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },
  priceChipSmall: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 11 },
  priceChipMicro: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },

  priceText: {
    fontFamily: FONT.bold,
    fontSize: 12.5,
    color: "rgba(11,18,32,0.95)",
  },
  priceTextSmall: { fontSize: 11.5 },
  priceTextMicro: { fontSize: 10.8 },

  currencyText: {
    fontFamily: FONT.medium,
    fontSize: 10.3,
    color: "rgba(11,18,32,0.60)",
  },
  currencyTextSmall: { fontSize: 9.7 },
  currencyTextMicro: { fontSize: 9.2 },

  /* ✅ Favorite glass */
  favBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },
  favBtnSmall: { width: 36, height: 36, borderRadius: 11 },
  favBtnMicro: { width: 32, height: 32, borderRadius: 10 },
  favPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },

  /* ✅ Bottom overlay text area */
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
