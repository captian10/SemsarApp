import { useDeleteProperty, useProperty } from "@api/properties";
import { usePropertyContact } from "@api/property-contacts";
import { usePropertyImages } from "@api/property-images";

import { defaultPropertyImage } from "@components/PropertyCard";
import RemoteImage from "@components/RemoteImage";
import { FontAwesome } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { FONT } from "@/constants/Typography";
import { useAppTheme } from "@providers/AppThemeProvider";

const statusLabels: Record<string, string> = {
  available: "متاح",
  sold: "للبيع",
  rented: "للإيجار",
  pending: "قيد المراجعة",
  hidden: "مخفي",
};

const safeText = (v: unknown, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
};

type Styles = {
  screen: ViewStyle;
  content: ViewStyle;
  stateWrap: ViewStyle;
  stateText: TextStyle;
  errorTitle: TextStyle;
  retryBtn: ViewStyle;
  retryText: TextStyle;
  iconBtn: ViewStyle;

  imageCard: ViewStyle;
  image: ImageStyle;
  badge: ViewStyle;
  badgePrice: TextStyle;
  badgeCurrency: TextStyle;

  counterPill: ViewStyle;
  counterText: TextStyle;
  dots: ViewStyle;
  dot: ViewStyle;
  dotActive: ViewStyle;

  info: ViewStyle;
  title: TextStyle;
  sectionTitle: TextStyle;
  description: TextStyle;
  sub: TextStyle;
  subHint: TextStyle;
  metaRow: ViewStyle;
  metaPill: ViewStyle;
  metaLabel: TextStyle;
  metaValue: TextStyle;

  ownerCard: ViewStyle;
  ownerRow: ViewStyle;
  ownerLabel: TextStyle;
  ownerValue: TextStyle;
  ownerValuePress: ViewStyle;
  ownerValueRow: ViewStyle;

  actions: ViewStyle;
  actionBtn: ViewStyle;
  actionBtnText: TextStyle;
  deleteBtn: ViewStyle;
  deleteBtnText: TextStyle;

  pressed: ViewStyle;
};

export default function AdminPropertyDetailsScreen() {
  const t = useAppTheme();
  const styles = useMemo(
    () => createStyles(t),
    [
      t.scheme,
      t.colors.bg,
      t.colors.surface,
      t.colors.text,
      t.colors.muted,
      t.colors.border,
      t.colors.primary,
      t.colors.error,
    ]
  );

  const router = useRouter();
  const { id: idParam } = useLocalSearchParams();
  const { width: W } = useWindowDimensions();

  const id = useMemo(() => {
    const raw = Array.isArray(idParam) ? idParam[0] : idParam;
    return typeof raw === "string" ? raw.trim() : "";
  }, [idParam]);

  const { data: property, error, isLoading, refetch } = useProperty(id);
  const { mutate: deleteProperty, isPending: isDeleting } = useDeleteProperty();

  const { data: contact } = usePropertyContact(id);

  const {
    data: imagesRows,
    refetch: refetchImages,
    isFetching: isFetchingImages,
  } = usePropertyImages(id);

  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.allSettled([refetch(), refetchImages()]);
    } finally {
      setRefreshing(false);
    }
  };

  const copyText = async (text: string, title = "تم النسخ") => {
    const v = String(text ?? "").trim();
    if (!v) return;
    await Clipboard.setStringAsync(v);
    Alert.alert(title, `تم نسخ: ${v}`);
  };

  const images = useMemo(() => {
    const rows = Array.isArray(imagesRows) ? imagesRows : [];
    const fromTable = rows
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((x) => String(x?.url ?? "").trim())
      .filter(Boolean);

    const cover = String(property?.cover_image ?? "").trim();

    const list =
      fromTable.length > 0
        ? fromTable
        : cover
        ? [cover]
        : [defaultPropertyImage];

    return list.map((url) => ({ url }));
  }, [imagesRows, property?.cover_image]);

  const cardW = useMemo(() => Math.max(W - 32, 1), [W]);

  // ✅ English numerals (0-9)
  const priceText = useMemo(() => {
    const p = Number(property?.price);
    if (!Number.isFinite(p)) return "0";
    return p.toLocaleString("en-EG");
  }, [property?.price]);

  const currencyText = useMemo(() => {
    const c = String(property?.currency ?? "EGP")
      .trim()
      .toUpperCase();
    if (c === "EGP") return "جنيه";
    return c;
  }, [property?.currency]);

  const typeText = useMemo(
    () => property?.property_type ?? "—",
    [property?.property_type]
  );

  const statusText = useMemo(() => {
    const s = String(property?.status ?? "").trim();
    return s ? statusLabels[s] ?? s : "—";
  }, [property?.status]);

  const descriptionText = useMemo(() => {
    const d = property?.description?.trim();
    return d && d.length ? d : "—";
  }, [property?.description]);

  const locationText = useMemo(() => {
    const city = property?.city?.trim() ?? "";
    const address = property?.address?.trim() ?? "";
    if (!city && !address) return "—";
    return [city, address].filter(Boolean).join("، ");
  }, [property?.city, property?.address]);

  const specsText = useMemo(() => {
    const b = Number(property?.bedrooms ?? 0);
    const ba = Number(property?.bathrooms ?? 0);
    const a = Number(property?.area_sqm ?? 0);

    const bedrooms = Number.isFinite(b) && b > 0 ? `${b} غرف` : "";
    const bathrooms = Number.isFinite(ba) && ba > 0 ? `${ba} حمامات` : "";
    const area = Number.isFinite(a) && a > 0 ? `${a} م²` : "";

    return [bedrooms, bathrooms, area].filter(Boolean).join(" • ") || "—";
  }, [property?.bedrooms, property?.bathrooms, property?.area_sqm]);

  const ownerName = useMemo(() => safeText(contact?.owner_name, ""), [contact]);
  const ownerPhone = useMemo(
    () => safeText(contact?.owner_phone, ""),
    [contact]
  );

  const hasOwner = useMemo(
    () => Boolean(ownerName.trim() || ownerPhone.trim()),
    [ownerName, ownerPhone]
  );

  const onDelete = () => {
    if (!id || isDeleting) return;

    deleteProperty(id, {
      onSuccess: () => router.replace("/(admin)"),
      onError: (err: any) => {
        Alert.alert("خطأ", err?.message || "فشل حذف العقار");
      },
    });
  };

  const confirmDelete = () => {
    if (!id || isDeleting) return;

    Alert.alert("تأكيد الحذف", "هل أنت متأكد أنك تريد حذف هذا العقار؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: onDelete },
    ]);
  };

  if (!id) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>معرّف العقار غير صحيح</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          accessibilityLabel="رجوع"
        >
          <Text style={styles.retryText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color={t.colors.primary} />
        <Text style={styles.stateText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.errorTitle}>حصل خطأ</Text>
        <Text style={styles.stateText}>
          {(error as any)?.message || "فشل تحميل البيانات."}
        </Text>

        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          accessibilityLabel="إعادة المحاولة"
        >
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "تفاصيل العقار",
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: t.colors.bg },
          headerTintColor: t.colors.text,
          headerTitleStyle: {
            fontFamily: FONT.bold,
            fontSize: 16,
            color: t.colors.text,
          },
          headerRight: () => (
            <Link
              href={{
                pathname: "/(admin)/home/create",
                params: { id: property.id },
              }}
              asChild
            >
              <Pressable
                hitSlop={10}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityLabel="تعديل العقار"
              >
                <FontAwesome name="pencil" size={18} color={t.colors.primary} />
              </Pressable>
            </Link>
          ),
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isFetchingImages}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
          />
        }
      >
        <View style={[styles.imageCard, { width: cardW }]}>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(it, idx) => `${it.url}-${idx}`}
            onMomentumScrollEnd={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / Math.max(cardW, 1));
              setActiveIndex(idx);
            }}
            renderItem={({ item }) => (
              <View style={{ width: cardW }}>
                <RemoteImage
                  path={item.url}
                  fallback={defaultPropertyImage}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              length: cardW,
              offset: cardW * index,
              index,
            })}
          />

          <View style={styles.badge}>
            <Text style={styles.badgePrice}>{priceText}</Text>
            <Text style={styles.badgeCurrency}>{currencyText}</Text>
          </View>

          {images.length > 1 && (
            <View style={styles.counterPill} pointerEvents="none">
              <Text style={styles.counterText}>
                {activeIndex + 1}/{images.length}
              </Text>
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.dots} pointerEvents="none">
              {images.map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {property.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>ID</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {String(property.id).slice(0, 8)}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>النوع</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {typeText}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>الحالة</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {statusText}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>الوصف</Text>
          <Text style={styles.description}>{descriptionText}</Text>

          <Text style={styles.sectionTitle}>الموقع</Text>
          <Text style={styles.sub}>{locationText}</Text>

          <Text style={styles.sectionTitle}>المواصفات</Text>
          <Text style={styles.sub}>{specsText}</Text>

          {hasOwner && (
            <>
              <Text style={styles.sectionTitle}>صاحب العقار</Text>

              <View style={styles.ownerCard}>
                {!!ownerName.trim() && (
                  <View style={styles.ownerRow}>
                    <Text style={styles.ownerLabel}>الاسم</Text>

                    <Pressable
                      onPress={() => copyText(ownerName, "تم نسخ الاسم")}
                      onLongPress={() => copyText(ownerName, "تم نسخ الاسم")}
                      style={({ pressed }) => [
                        styles.ownerValuePress,
                        pressed && styles.pressed,
                      ]}
                      accessibilityLabel="نسخ اسم صاحب العقار"
                    >
                      <View style={styles.ownerValueRow}>
                        <Text style={styles.ownerValue}>{ownerName}</Text>
                        <FontAwesome
                          name="copy"
                          size={14}
                          color={t.colors.primary}
                        />
                      </View>
                    </Pressable>
                  </View>
                )}

                {!!ownerPhone.trim() && (
                  <View style={styles.ownerRow}>
                    <Text style={styles.ownerLabel}>الرقم</Text>

                    <Pressable
                      onPress={() =>
                        copyText(ownerPhone, "تم نسخ رقم الموبايل")
                      }
                      onLongPress={() =>
                        copyText(ownerPhone, "تم نسخ رقم الموبايل")
                      }
                      style={({ pressed }) => [
                        styles.ownerValuePress,
                        pressed && styles.pressed,
                      ]}
                      accessibilityLabel="نسخ رقم صاحب العقار"
                    >
                      <View style={styles.ownerValueRow}>
                        <Text style={styles.ownerValue}>{ownerPhone}</Text>
                        <FontAwesome
                          name="copy"
                          size={14}
                          color={t.colors.primary}
                        />
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          <Text style={styles.subHint}>
            يمكنك تعديل العقار من زر القلم بالأعلى.
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(admin)/home/create",
                  params: { id: property.id },
                })
              }
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="تعديل العقار"
            >
              <Text style={styles.actionBtnText}>تعديل</Text>
            </Pressable>

            <Pressable
              onPress={isDeleting ? undefined : confirmDelete}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && !isDeleting ? styles.pressed : null,
                isDeleting ? { opacity: 0.6 } : null,
              ]}
              disabled={isDeleting}
              accessibilityLabel="حذف العقار"
            >
              <Text style={styles.deleteBtnText}>
                {isDeleting ? "جاري الحذف..." : "حذف"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(t: any) {
  const isDark = t.scheme === "dark";

  const subtleBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  const subtleBorder = isDark
    ? "rgba(255,255,255,0.10)"
    : "rgba(15,23,42,0.08)";

  const primarySoftBg = "rgba(59,130,246,0.10)";
  const primarySoftBorder = "rgba(59,130,246,0.18)";

  return StyleSheet.create<Styles>({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    content: { padding: 16, paddingBottom: 32, gap: 16 },

    stateWrap: {
      flex: 1,
      backgroundColor: t.colors.bg,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
    },
    stateText: {
      fontSize: 14,
      color: t.colors.muted,
      fontFamily: FONT.regular,
      textAlign: "center",
    },
    errorTitle: {
      fontSize: 18,
      color: t.colors.error,
      fontFamily: FONT.bold,
      textAlign: "center",
    },

    retryBtn: {
      marginTop: 12,
      backgroundColor: t.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 16,
    },
    retryText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

    iconBtn: {
      marginRight: 12,
      width: 38,
      height: 38,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: primarySoftBg,
      borderWidth: 1,
      borderColor: primarySoftBorder,
    },

    imageCard: {
      position: "relative",
      alignSelf: "center",
      backgroundColor: t.colors.surface,
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.colors.border,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 0 : 3,
    },
    image: { width: "100%", aspectRatio: 1 } as ImageStyle,

    badge: {
      position: "absolute",
      bottom: 14,
      right: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isDark ? "rgba(0,0,0,0.70)" : t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    badgePrice: {
      fontSize: 14,
      color: t.colors.primary,
      fontFamily: FONT.bold,
    },
    badgeCurrency: {
      fontSize: 12,
      color: t.colors.primary,
      fontFamily: FONT.medium,
    },

    counterPill: {
      position: "absolute",
      top: 12,
      left: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    counterText: { color: "#fff", fontFamily: FONT.bold, fontSize: 12 },

    dots: {
      position: "absolute",
      bottom: 14,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.55)",
    },
    dotActive: { backgroundColor: "#fff" },

    info: {
      backgroundColor: t.colors.surface,
      borderRadius: 22,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: t.colors.border,
    },

    title: {
      fontSize: 20,
      color: t.colors.text,
      fontFamily: FONT.bold,
      textAlign: "right",
      writingDirection: "rtl",
    },

    sectionTitle: {
      fontSize: 16,
      color: t.colors.text,
      fontFamily: FONT.bold,
      textAlign: "right",
      marginTop: 8,
      writingDirection: "rtl",
    },

    description: {
      fontSize: 14,
      color: t.colors.muted,
      fontFamily: FONT.regular,
      textAlign: "right",
      lineHeight: 20,
      writingDirection: "rtl",
    },

    sub: {
      fontSize: 14,
      color: t.colors.text,
      fontFamily: FONT.regular,
      textAlign: "right",
      writingDirection: "rtl",
    },

    subHint: {
      fontSize: 13,
      color: t.colors.muted,
      fontFamily: FONT.regular,
      textAlign: "right",
      marginTop: 8,
      writingDirection: "rtl",
    },

    metaRow: { flexDirection: "row-reverse", gap: 10, flexWrap: "wrap" },
    metaPill: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      backgroundColor: subtleBg,
      borderWidth: 1,
      borderColor: subtleBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      maxWidth: "100%",
    },
    metaLabel: { fontSize: 12, color: t.colors.muted, fontFamily: FONT.medium },
    metaValue: { fontSize: 13, color: t.colors.text, fontFamily: FONT.bold },

    ownerCard: {
      backgroundColor: subtleBg,
      borderWidth: 1,
      borderColor: subtleBorder,
      borderRadius: 16,
      padding: 12,
      gap: 10,
    },
    ownerRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    ownerLabel: {
      fontSize: 12,
      fontFamily: FONT.medium,
      color: t.colors.muted,
    },
    ownerValue: {
      fontSize: 14,
      fontFamily: FONT.bold,
      color: t.colors.text,
      textAlign: "right",
    },
    ownerValuePress: { flex: 1 },
    ownerValueRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 8,
    },

    actions: { flexDirection: "row-reverse", gap: 12, marginTop: 24 },

    actionBtn: {
      flex: 1,
      backgroundColor: t.colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
    },
    actionBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

    deleteBtn: {
      flex: 1,
      backgroundColor: t.colors.error,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
    },
    deleteBtnText: { color: "#fff", fontFamily: FONT.bold, fontSize: 14 },

    pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  });
}
