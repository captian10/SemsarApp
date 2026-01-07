import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FlatList as RNFlatList } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FONT } from "@/constants/Typography";
import RemoteImage from "@components/RemoteImage";
import { THEME } from "@constants/Colors";

import { usePropertyWithImages } from "@api/properties";
import { usePropertyImages } from "@api/property-images";
import { defaultPropertyImage } from "@components/PropertyCard";

const AUTOSLIDE_MS = 2800;

const formatMoney = (n: unknown) => {
  const p = Number(n ?? 0);
  if (!Number.isFinite(p)) return "0";
  try {
    return new Intl.NumberFormat("ar-EG").format(p);
  } catch {
    return String(p);
  }
};

const safeText = (v: unknown, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
};

const isHttpUrl = (v: unknown) => {
  const s = String(v ?? "").trim();
  return /^https?:\/\//i.test(s);
};

function SmartImage({
  pathOrUrl,
  fallback,
  style,
  resizeMode = "cover",
}: {
  pathOrUrl: string;
  fallback: string;
  style: any;
  resizeMode?: any;
}) {
  const src = (pathOrUrl || "").trim();

  if (!src)
    return (
      <Image source={{ uri: fallback }} style={style} resizeMode={resizeMode} />
    );

  if (isHttpUrl(src)) {
    return (
      <Image source={{ uri: src }} style={style} resizeMode={resizeMode} />
    );
  }

  return (
    <RemoteImage
      path={src}
      fallback={fallback}
      style={style}
      resizeMode={resizeMode}
    />
  );
}

const hasPositiveNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
};

const statusLabelAr = (s: unknown) => {
  const v = String(s ?? "")
    .trim()
    .toLowerCase();
  if (v === "available") return "متاح";
  if (v === "rented") return "للإيجار";
  if (v === "sold") return "للبيع";
  return "—";
};

const statusColor = (s: unknown) => {
  const v = String(s ?? "")
    .trim()
    .toLowerCase();
  if (v === "available") return THEME.primary;
  if (v === "rented") return "#EF4444";
  if (v === "sold") return "#22C55E";
  return THEME.dark?.[100] ?? "#0F172A";
};

export default function PropertyDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();

  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return (Array.isArray(raw) ? raw[0] : raw) as string | undefined;
  }, [params]);

  const {
    data: property,
    error,
    isLoading,
    refetch,
    isFetching,
  } = usePropertyWithImages(id || "");

  const { data: imagesRows } = usePropertyImages(id || "");

  const images = useMemo(() => {
    const rows = Array.isArray(imagesRows) ? imagesRows : [];
    const fromTable = rows
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((x) => ({ url: String(x?.url ?? "").trim() }))
      .filter((x) => x.url.length > 0);

    const cover = String((property as any)?.cover_image ?? "").trim();
    const coverArr = cover ? [{ url: cover }] : [];

    const fallback = [{ url: defaultPropertyImage }];

    return fromTable.length ? fromTable : coverArr.length ? coverArr : fallback;
  }, [imagesRows, property]);

  const [activeIndex, setActiveIndex] = useState(0);
  const mainRef = useRef<RNFlatList<{ url: string }> | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactingRef = useRef(false);

  const stopAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    if (images.length <= 1) return;

    intervalRef.current = setInterval(() => {
      if (interactingRef.current) return;

      setActiveIndex((prev) => {
        const next = (prev + 1) % images.length;
        try {
          mainRef.current?.scrollToIndex({ index: next, animated: true });
        } catch {}
        return next;
      });
    }, AUTOSLIDE_MS);
  }, [images.length, stopAuto]);

  useEffect(() => {
    startAuto();
    return () => stopAuto();
  }, [startAuto, stopAuto]);

  useEffect(() => {
    if (activeIndex >= images.length) setActiveIndex(0);
  }, [images.length, activeIndex]);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, images.length - 1));
      stopAuto();
      interactingRef.current = false;
      setActiveIndex(clamped);
      try {
        mainRef.current?.scrollToIndex({ index: clamped, animated: true });
      } catch {}
      startAuto();
    },
    [images.length, startAuto, stopAuto]
  );

  const priceText = useMemo(() => {
    const p = Number((property as any)?.price ?? 0);
    const c = String((property as any)?.currency ?? "EGP")
      .trim()
      .toUpperCase();
    const currencyLabel = c === "EGP" ? "جنيه" : c;
    return `${formatMoney(p)} ${currencyLabel}`;
  }, [property]);

  const title = useMemo(() => safeText((property as any)?.title), [property]);
  const city = useMemo(() => safeText((property as any)?.city), [property]);
  const address = useMemo(
    () => safeText((property as any)?.address, ""),
    [property]
  );
  const type = useMemo(
    () => safeText((property as any)?.property_type, "—"),
    [property]
  );

  const statusValue = useMemo(() => (property as any)?.status, [property]);
  const status = useMemo(() => statusLabelAr(statusValue), [statusValue]);
  const statusClr = useMemo(() => statusColor(statusValue), [statusValue]);

  const description = useMemo(
    () => safeText((property as any)?.description, "لا يوجد وصف."),
    [property]
  );

  const bedrooms = (property as any)?.bedrooms;
  const bathrooms = (property as any)?.bathrooms;
  const area = (property as any)?.area_sqm;

  const AGENT_PHONE = "01012433451";

  const dial = useCallback(async (phoneNumber: string) => {
    const p = phoneNumber.replace(/\s+/g, "");
    if (!p) return;
    try {
      await Linking.openURL(`tel:${p}`);
    } catch {
      Alert.alert("خطأ", "لم نستطع فتح الاتصال على هذا الجهاز.");
    }
  }, []);

  const copy = useCallback(async (text: string, titleMsg = "تم النسخ") => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert(titleMsg, `تم نسخ: ${text}`);
  }, []);

  const openWhatsApp = useCallback(
    async (phone: string) => {
      const raw = phone.replace(/\D/g, "");
      if (!raw) return;

      const international = raw.startsWith("0")
        ? `20${raw.replace(/^0/, "")}`
        : raw;

      const msg = encodeURIComponent(`السلام عليكم، مهتم بالعقار: ${title}`);
      const waApp = `whatsapp://send?phone=${international}&text=${msg}`;
      const waWeb = `https://wa.me/${international}?text=${msg}`;

      try {
        const can = await Linking.canOpenURL(waApp);
        if (can) return Linking.openURL(waApp);
        return Linking.openURL(waWeb);
      } catch {
        Alert.alert("واتساب غير متاح", "لم نستطع فتح واتساب على هذا الجهاز.");
      }
    },
    [title]
  );

  if (!id) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>معرّف غير صحيح</Text>
        <Text style={styles.stateText}>الرابط ناقص أو id غير موجود.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.stateText}>جاري تحميل بيانات العقار...</Text>
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>حصل خطأ</Text>
        <Text style={styles.stateText}>فشل تحميل بيانات العقار.</Text>

        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && styles.pressed,
            isFetching && { opacity: 0.8 },
          ]}
          disabled={isFetching}
        >
          <Text style={styles.retryText}>
            {isFetching ? "جاري المحاولة..." : "إعادة المحاولة"}
          </Text>
        </Pressable>
      </View>
    );
  }
  const HERO_H = Math.min(560, Math.max(420, W * 0.72));

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: "", headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 170 + insets.bottom }}
      >
        {/* ✅ HERO GALLERY */}

        <View style={[styles.heroWrap, { height: HERO_H }]}>
          <FlatList
            ref={mainRef as any}
            data={images}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, idx) => `${item.url}-${idx}`}
            snapToInterval={W}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onTouchStart={() => {
              interactingRef.current = true;
              stopAuto();
            }}
            onScrollBeginDrag={() => {
              interactingRef.current = true;
              stopAuto();
            }}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / Math.max(W, 1));
              setActiveIndex(idx);
              interactingRef.current = false;
              startAuto();
            }}
            renderItem={({ item }) => (
              <View style={{ width: W, height: "100%" }}>
                <SmartImage
                  pathOrUrl={item.url}
                  fallback={defaultPropertyImage}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              length: W,
              offset: W * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                mainRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                });
              }, 80);
            }}
          />

          {/* ✅ top overlay buttons */}
          <View style={[styles.heroTopRow, { paddingTop: insets.top + 10 }]}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.heroIconBtn,
                pressed && styles.pressed,
              ]}
            >
              <FontAwesome name="chevron-left" size={16} color="#fff" />
            </Pressable>

            <View style={{ flex: 1 }} />

            {images.length > 1 && (
              <View style={styles.heroCounterPill}>
                <Text style={styles.heroCounterText}>
                  {activeIndex + 1} / {images.length}
                </Text>
              </View>
            )}
          </View>

          {/* ✅ floating thumbnails */}
          {images.length > 1 && (
            <View style={styles.heroThumbsFloat}>
              <FlatList
                data={images}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(it, idx) => `hero-th-${it.url}-${idx}`}
                contentContainerStyle={styles.heroThumbsContent}
                renderItem={({ item, index }) => {
                  const active = index === activeIndex;
                  return (
                    <Pressable
                      onPress={() => goTo(index)}
                      style={({ pressed }) => [
                        styles.heroThumbItem,
                        active && styles.heroThumbItemActive,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <SmartImage
                        pathOrUrl={item.url}
                        fallback={defaultPropertyImage}
                        style={styles.heroThumbImg}
                        resizeMode="cover"
                      />
                    </Pressable>
                  );
                }}
              />
            </View>
          )}
        </View>

        {/* ✅ BODY */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={14} color={THEME.primary} />
            <Text style={styles.locationText} numberOfLines={2}>
              {city}
              {address ? ` • ${address}` : ""}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MetaPill icon="tag" text={type} />
            <MetaPill icon="info-circle" text={status} color={statusClr} />

            {hasPositiveNumber(area) && (
              <MetaPill icon="arrows-alt" text={`${Number(area)} م²`} />
            )}
            {hasPositiveNumber(bedrooms) && (
              <MetaPill icon="bed" text={`${Number(bedrooms)} غرف`} />
            )}
            {hasPositiveNumber(bathrooms) && (
              <MetaPill icon="bath" text={`${Number(bathrooms)} حمام`} />
            )}
          </View>

          <View style={styles.descCard}>
            <Text style={styles.sectionTitle}>الوصف</Text>
            <Text style={styles.descText}>{description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.bottomCard} pointerEvents="auto">
          <View style={styles.bottomRow}>
            <Text style={styles.bottomLabel}>السعر</Text>
            <Text style={styles.bottomValue}>{priceText}</Text>
          </View>

          <View style={styles.bottomBtns}>
            <Pressable
              onPress={() => dial(AGENT_PHONE)}
              style={({ pressed }) => [
                styles.bottomBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.bottomBtnText}>اتصال الآن</Text>
            </Pressable>

            <Pressable
              onPress={() => openWhatsApp(AGENT_PHONE)}
              style={({ pressed }) => [
                styles.bottomBtnGhost,
                pressed && styles.pressed,
              ]}
              onLongPress={() => copy(AGENT_PHONE, "تم نسخ الرقم")}
            >
              <View style={styles.waRow}>
                <FontAwesome name="whatsapp" size={16} color="#25D366" />
                <Text style={styles.bottomBtnGhostText}>واتساب</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function MetaPill({
  icon,
  text,
  color,
}: {
  icon: any;
  text: string;
  color?: string;
}) {
  return (
    <View style={styles.metaPill}>
      <FontAwesome name={icon} size={12} color={color ?? THEME.dark[100]} />
      <Text
        style={[styles.metaText, color ? { color } : null]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white[100] },

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
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    minWidth: 180,
    alignItems: "center",
  },
  retryText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },
  pressed: { opacity: 0.9 },

  /* HERO */
  heroWrap: { width: "100%", backgroundColor: "#000" },
  heroImage: { width: "100%", height: "100%" } as ImageStyle,

  heroTopRow: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCounterPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroCounterText: { color: "#fff", fontFamily: FONT.bold, fontSize: 12 },

  heroThumbsFloat: { position: "absolute", left: 0, right: 0, bottom: -22 },
  heroThumbsContent: { paddingHorizontal: 12, gap: 10 },
  heroThumbItem: {
    width: 64,
    height: 44,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroThumbItemActive: { borderWidth: 2, borderColor: "#fff" },
  heroThumbImg: { width: "100%", height: "100%" } as ImageStyle,

  /* BODY */
  body: {
    paddingHorizontal: 12,
    paddingTop: 34,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },
  locationRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
    textAlign: "right",
    lineHeight: 18,
  },

  metaRow: {
    width: "100%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  metaPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    maxWidth: "100%",
  },
  metaText: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },

  descCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    padding: 12,
    gap: 8,
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: THEME.dark[100],
    textAlign: "right",
  },
  descText: {
    width: "100%",
    fontSize: 13,
    fontFamily: FONT.regular,
    color: THEME.gray[100],
    textAlign: "right",
    lineHeight: 20,
  },

  /* Bottom bar */
  bottom: { position: "absolute", left: 12, right: 12, bottom: 12 },
  bottomCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
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
  bottomLabel: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: THEME.gray[100],
  },
  bottomValue: { fontSize: 14, fontFamily: FONT.bold, color: THEME.primary },

  bottomBtns: { flexDirection: "row-reverse", gap: 10 },
  bottomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: THEME.primary,
    alignItems: "center",
  },
  bottomBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 13 },

  bottomBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    backgroundColor: "rgba(15,23,42,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnGhostText: {
    color: THEME.dark[100],
    fontFamily: FONT.bold,
    fontSize: 13,
  },
  waRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  copyHint: {
    textAlign: "right",
    color: THEME.gray[100],
    fontFamily: FONT.regular,
    fontSize: 11,
  },
});
