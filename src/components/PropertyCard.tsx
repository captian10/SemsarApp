import type { Tables } from "@database.types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useRouter } from "expo-router";
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
};

function SpecPill({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  text: string;
}) {
  return (
    <View style={styles.specPill}>
      <FontAwesome name={icon} size={12} color={THEME.dark[100]} />
      <Text style={styles.specText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export default function PropertyCard({
  property,
  hrefBase = "/(user)/home",
  onToggleFavorite,
  isFavorite = false,
}: Props) {
  const router = useRouter();

  const price = Number(property.price ?? 0);
  const priceText = Number.isFinite(price) ? price.toLocaleString("en-EG") : "0";

  const currency = property.currency ?? "EGP";
  const city = property.city ?? "—";
  const image = (property.cover_image || null) as string | null;

  const specs = useMemo(() => {
    const out: Array<{ icon: any; text: string }> = [];
    if (property.bedrooms != null)
      out.push({ icon: "bed", text: `${property.bedrooms} غرف` });
    if (property.bathrooms != null)
      out.push({ icon: "bath", text: `${property.bathrooms} حمام` });
    if (property.area_sqm != null)
      out.push({ icon: "arrows-alt", text: `${property.area_sqm} م²` });
    return out;
  }, [property.bedrooms, property.bathrooms, property.area_sqm]);


  return (
    <View style={styles.card}>
      {/* ✅ Whole card navigates */}
      <Link href={`/home/${property.id}`} asChild>
      <Pressable
        style={({ pressed }) => [styles.pressWrap, pressed && styles.pressed]}
      >
        {/* IMAGE */}
        <View style={styles.imageBox}>
          <RemoteImage
            path={image}
            fallback={defaultPropertyImage}
            style={styles.image}
            resizeMode="cover"
          />

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.60)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.gradient}
            pointerEvents="none"
          />

          {/* Price pill */}
          <View style={styles.pricePill} pointerEvents="none">
            <Text style={styles.price}>{priceText}</Text>
            <Text style={styles.currency}>{currency}</Text>
          </View>

          {/* ✅ Favorite (no navigation) */}
          <Pressable
            hitSlop={12}
            style={({ pressed }) => [
              styles.favBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => onToggleFavorite?.(String(property.id))}
          >
            <FontAwesome
              name={isFavorite ? "heart" : "heart-o"}
              size={18}
              color={isFavorite ? "#E11D48" : "#0B1220"}
            />
          </Pressable>

          {/* Bottom overlay content */}
          <View style={styles.overlayContent} pointerEvents="none">
            <Text numberOfLines={2} style={styles.title}>
              {property.title}
            </Text>

            <View style={styles.locationRow}>
              <FontAwesome name="map-marker" size={12} color="#FFFFFF" />
              <Text numberOfLines={1} style={styles.locationText}>
                {city}
              </Text>
            </View>
          </View>
        </View>

        {/* BODY (اختياري) */}
        {/* <View style={styles.body}>
          <View style={styles.specsRow}>
            {specs.map((s, idx) => (
              <SpecPill key={idx} icon={s.icon} text={s.text} />
            ))}
          </View>
        </View> */}
      </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  pressWrap: { width: "100%" },
  pressed: { opacity: 0.96, transform: [{ scale: 0.996 }] },

  imageBox: {
    position: "relative",
    backgroundColor: THEME.white[100],
  },
  image: {
    width: "100%",
    height: 190,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },

  pricePill: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  price: {
    fontSize: 12,
    color: "#0B1220",
    fontFamily: FONT.bold,
  },
  currency: {
    fontSize: 10,
    color: "rgba(11,18,32,0.60)",
    fontFamily: FONT.medium,
  },

  favBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    zIndex: 10,
  },

  overlayContent: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFFFF",
    fontFamily: FONT.bold,
    textAlign: "right",
  },
  locationRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.92)",
    fontFamily: FONT.medium,
    textAlign: "right",
    flex: 1,
  },

  body: {
    padding: 12,
    paddingTop: 10,
  },

  specsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  specPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  specText: {
    fontSize: 11,
    color: THEME.dark[100],
    fontFamily: FONT.bold,
  },
});
